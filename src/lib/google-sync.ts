import {adminDb} from './supabase';
import {accessToken,createWatch,googleJson,renewWatch} from './google';
import {persistIntake} from './intake';
import {z} from 'zod';

const mappingSchema=z.object({name:z.string().min(1),email:z.string().optional(),cv:z.string().min(1),consent:z.string().optional(),phone:z.string().optional(),portfolio:z.string().optional(),cover_letter:z.string().optional()}).refine(mapping=>{
  const selected=Object.values(mapping).filter(Boolean);
  return new Set(selected).size===selected.length;
},{message:'Choose a different Form question for each application field.'});
export type FieldMapping=z.infer<typeof mappingSchema>;
export {mappingSchema};
async function recordFailure(formId:string,responseId:string,error:unknown){
  const db=adminDb();const message=(error instanceof z.ZodError?'Application fields need review. Edit the Form mapping.':error instanceof Error?error.message:'Sync failure').slice(0,200);
  const permanent=/no single CV|unsupported|exceeds 3 MB|Invalid or oversized file|consent/i.test(message);
  const {data:prior}=await db.from('google_sync_failures').select('retry_count').eq('form_id',formId).eq('response_id',responseId).maybeSingle();
  const retry_count=permanent?3:Math.min((prior?.retry_count||0)+1,3);
  await db.from('google_sync_failures').upsert({form_id:formId,response_id:responseId,error_message:message,retry_count,last_attempt_at:new Date().toISOString(),resolved_at:null},{onConflict:'form_id,response_id'});
}
type Answer={textAnswers?:{answers?:Array<{value:string}>};fileUploadAnswers?:{answers?:Array<{fileId:string;fileName:string;mimeType:string}>}};
type Response={responseId:string;lastSubmittedTime:string;respondentEmail?:string;answers?:Record<string,Answer>};
function textAnswer(answers:Record<string,Answer>,id?:string){return id?answers[id]?.textAnswers?.answers?.[0]?.value||'':'';}
function validEmail(value:string){const normalized=value.trim().toLowerCase();return z.email().safeParse(normalized).success?normalized:'';}
function validUrl(value:string){const normalized=value.trim();return z.url().safeParse(normalized).success?normalized:null;}
async function processResponse(formId:string,reference:string,mapping:FieldMapping,token:string,response:Response){
  const answers=response.answers||{};const uploaded=answers[mapping.cv]?.fileUploadAnswers?.answers||[];
  const consentAnswer=textAnswer(answers,mapping.consent).trim();
  if(mapping.consent&&/^(no|false|i disagree)$/i.test(consentAnswer))throw new Error('The applicant declined the optional consent question.');
  const consent=mapping.consent&&/^(yes|true|i agree)$/i.test(consentAnswer)?true:null;
  if(uploaded.length!==1)throw new Error('Response has no single CV');
  const file=uploaded[0];if(!['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.mimeType))throw new Error('CV type unsupported');
  const meta=await googleJson<{size?:string;mimeType:string;name:string}>(token,`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.fileId)}?fields=size,mimeType,name`);
  if(Number(meta.size||0)>3_000_000)throw new Error('CV exceeds 3 MB');
  const download=await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.fileId)}?alt=media`,{headers:{authorization:`Bearer ${token}`},cache:'no-store'});
  if(!download.ok)throw new Error(`Drive download HTTP ${download.status}`);
  const bytes=Buffer.from(await download.arrayBuffer());if(bytes.length>3_000_000)throw new Error('CV exceeds 3 MB');
  const mappedEmail=validEmail(textAnswer(answers,mapping.email));
  const email=mappedEmail||validEmail(response.respondentEmail||'');
  const payload={form_id:formId,response_id:response.responseId,job_reference:reference,submitted_at:response.lastSubmittedTime,candidate:{full_name:textAnswer(answers,mapping.name).trim(),email,phone:textAnswer(answers,mapping.phone).trim()||null,portfolio_url:validUrl(textAnswer(answers,mapping.portfolio)),cover_letter:textAnswer(answers,mapping.cover_letter).trim()||null,consent},cv:{name:meta.name||file.fileName,mime_type:meta.mimeType,content_base64:bytes.toString('base64')}};
  const receipt=await persistIntake(payload);
  return !receipt.duplicate;
}
export async function syncForm(formId:string){
  const db=adminDb();const {data:form,error}=await db.from('google_forms').select('*,jobs(reference)').eq('form_id',formId).single();if(error||!form)throw new Error('Connected form unavailable');
  const mapping=mappingSchema.parse(form.field_mapping);const token=await accessToken(form.connection_id);let accepted=0;let failures=0;const attempted=new Set<string>();
  const failed=await db.from('google_sync_failures').select('response_id,retry_count').eq('form_id',formId).is('resolved_at',null).lt('retry_count',3).limit(10);
  for(const row of failed.data||[]){attempted.add(row.response_id);try{const response=await googleJson<Response>(token,`https://forms.googleapis.com/v1/forms/${encodeURIComponent(formId)}/responses/${encodeURIComponent(row.response_id)}`);if(await processResponse(formId,form.jobs.reference,mapping,token,response))accepted++;await db.from('google_sync_failures').update({resolved_at:new Date().toISOString()}).eq('form_id',formId).eq('response_id',row.response_id);}catch(e){failures++;await recordFailure(formId,row.response_id,e);}}
  const initial=form.last_response_at;
  // Replay a one-second overlap. The database uniqueness constraint handles duplicate responses.
  const filter=form.sync_filter||(initial?`timestamp >= ${new Date(new Date(initial).getTime()-1000).toISOString()}`:null);
  let pageToken=form.sync_page_token||'';let pages=0;let newest=form.sync_newest_at||initial||null;
  try {
    do {
      const url=new URL(`https://forms.googleapis.com/v1/forms/${encodeURIComponent(formId)}/responses`);url.searchParams.set('pageSize','25');if(filter)url.searchParams.set('filter',filter);if(pageToken)url.searchParams.set('pageToken',pageToken);
      const page=await googleJson<{responses?:Response[];nextPageToken?:string}>(token,url.toString());
      for(const response of page.responses||[]){
        if(!attempted.has(response.responseId)){
          const {data:prior}=await db.from('google_sync_failures').select('retry_count').eq('form_id',formId).eq('response_id',response.responseId).is('resolved_at',null).maybeSingle();
          if(!prior||prior.retry_count<3){try{if(await processResponse(formId,form.jobs.reference,mapping,token,response))accepted++;await db.from('google_sync_failures').update({resolved_at:new Date().toISOString()}).eq('form_id',formId).eq('response_id',response.responseId);}
          catch(e){failures++;await recordFailure(formId,response.responseId,e);}}
        }
        if(!newest||new Date(response.lastSubmittedTime)>new Date(newest))newest=response.lastSubmittedTime;
      }
      pageToken=page.nextPageToken||'';pages++;
      const checkpoint=await db.from('google_forms').update({sync_page_token:pageToken||null,sync_filter:pageToken?filter:null,sync_newest_at:pageToken?newest:null}).eq('id',form.id);if(checkpoint.error)throw checkpoint.error;
    }while(pageToken&&pages<2);
    if(pageToken)return {accepted,pages,failures,continuation:true};
    const unresolved=await db.from('google_sync_failures').select('id',{count:'exact',head:true}).eq('form_id',formId).is('resolved_at',null);
    await db.from('google_forms').update({last_response_at:newest,last_sync_at:new Date().toISOString(),sync_error:unresolved.count?`${unresolved.count} responses need attention`:null}).eq('id',form.id);
    return {accepted,pages,failures,continuation:false};
  }catch(e){const message=e instanceof Error?e.message:'Google synchronization error';await db.from('google_forms').update({sync_error:message.slice(0,200),last_sync_at:new Date().toISOString()}).eq('id',form.id);throw e;}
}
export async function renewDueWatches(){
  const db=adminDb();const due=new Date(Date.now()+24*60*60*1000).toISOString();const {data}=await db.from('google_forms').select('*').lt('watch_expires_at',due).limit(20);let renewed=0;
  for(const form of data||[]){try{const token=await accessToken(form.connection_id);let watch;try{watch=await renewWatch(token,form.form_id,form.watch_id);}catch{watch=await createWatch(token,form.form_id);}await db.from('google_forms').update({watch_id:watch.id,watch_expires_at:watch.expireTime,sync_error:null}).eq('id',form.id);renewed++;}catch(e){await db.from('google_forms').update({sync_error:`Watch renewal failed: ${e instanceof Error?e.message:'unknown'}`.slice(0,200)}).eq('id',form.id);}}
  return renewed;
}
