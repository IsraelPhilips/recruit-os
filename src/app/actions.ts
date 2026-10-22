'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireRecruiter } from '@/lib/auth';
import { adminDb,publicDb } from '@/lib/supabase';
import { criteriaSchema,validatedEvidenceCorrection } from '@/lib/contracts';
import { z } from 'zod';
import { processApplication } from '@/lib/process';
import {deliverViaGmail,draftSchema,gmailRawMessage,hasTemplatePlaceholder} from '@/lib/outbound';
import {gmailAccessToken} from '@/lib/google';

export async function login(form:FormData){
  const email=String(form.get('email')||''); const password=String(form.get('password')||'');
  if(email.toLowerCase()!==process.env.RECRUITER_EMAIL?.toLowerCase()) redirect('/login?error=1');
  const {data,error}=await publicDb().auth.signInWithPassword({email,password});
  if(error || !data.session) redirect('/login?error=1');
  (await cookies()).set('recruitos_token',data.session.access_token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:data.session.expires_in});
  redirect('/');
}
export async function signup(form:FormData){
  const email=String(form.get('email')||'').trim().toLowerCase();
  const password=String(form.get('password')||'');
  const confirmation=String(form.get('confirm_password')||'');
  if(!z.email().safeParse(email).success||email!==process.env.RECRUITER_EMAIL?.toLowerCase())redirect('/signup?error=invite');
  if(password.length<8||password!==confirmation)redirect('/signup?error=password');
  const origin=process.env.APP_ORIGIN||'http://localhost:3000';
  const {data,error}=await publicDb().auth.signUp({email,password,options:{emailRedirectTo:`${origin}/auth/confirmed`}});
  if(error)redirect('/signup?error=service');
  if(data.session){(await cookies()).set('recruitos_token',data.session.access_token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:data.session.expires_in});redirect('/jobs');}
  redirect('/signup?sent=1');
}
export async function logout(){(await cookies()).delete('recruitos_token');redirect('/login');}
export async function createJob(form:FormData){
  await requireRecruiter(); const title=String(form.get('title')||'').trim(), reference=String(form.get('reference')||`JOB-${crypto.randomUUID().slice(0,8).toUpperCase()}`).trim(), description=String(form.get('description')||'').trim();
  const criteria=criteriaSchema.parse(JSON.parse(String(form.get('criteria')||'[]')));
  if(title.length<3 || reference.length<3 || description.length<10) throw new Error('Complete job fields');
  const {error}=await adminDb().from('jobs').insert({title,reference,description,criteria,approved_at:new Date().toISOString()});
  if(error) throw error; revalidatePath('/jobs');revalidatePath('/google');redirect('/jobs');
}
export async function updateJob(form:FormData){
  await requireRecruiter(); const id=String(form.get('id'));const description=String(form.get('description')||'').trim();
  const criteria=criteriaSchema.parse(JSON.parse(String(form.get('criteria')||'[]')));
  if(description.length<10) throw new Error('Description too short');
  const db=adminDb();const {data:job,error:lookup}=await db.from('jobs').select('criteria_version').eq('id',id).single();if(lookup||!job) throw new Error('Job not found');
  const {error}=await db.from('jobs').update({description,criteria,criteria_version:job.criteria_version+1,approved_at:new Date().toISOString()}).eq('id',id);
  if(error) throw error;revalidatePath('/jobs');revalidatePath('/google');
}
export async function retry(form:FormData){await requireRecruiter();const id=String(form.get('id'));await processApplication(id);revalidatePath(`/applications/${id}`);}
export async function correctContact(form:FormData){
  const user=await requireRecruiter();const id=String(form.get('application_id'));
  const full_name=z.string().trim().min(1).max(200).parse(form.get('full_name'));
  const email=z.union([z.email(),z.literal('')]).parse(String(form.get('email')||'').trim().toLowerCase());
  const phone=z.string().trim().max(50).parse(String(form.get('phone')||''));
  const db=adminDb();const {data:app,error:lookup}=await db.from('applications').select('candidate,process_status,attempt_count,error_message').eq('id',id).single();if(lookup||!app) throw new Error('Application not found');
  const changed=['full_name','email','phone'].filter(key=>String(app.candidate?.[key]||'')!==String(({full_name,email,phone})[key as 'full_name'|'email'|'phone']||''));
  if(changed.length===0)return;
  const shouldAnalyze=Boolean(email&&!app.candidate?.email&&app.process_status==='manual_review'&&app.attempt_count===0);
  let nextStatus=app.process_status;
  if(shouldAnalyze)nextStatus='received';
  else if(!email&&app.process_status==='ready')nextStatus='manual_review';
  else if(email&&app.process_status==='manual_review'&&app.attempt_count>0&&!app.error_message){
    const [profile,evidence]=await Promise.all([
      db.from('candidate_profiles').select('application_id').eq('application_id',id).maybeSingle(),
      db.from('evidence_items').select('status').eq('application_id',id),
    ]);
    if(profile.data&&evidence.data?.length&&!evidence.data.some(item=>['REQUIRES_REVIEW','AMBIGUOUS'].includes(item.status)))nextStatus='ready';
  }
  const {error}=await db.from('applications').update({candidate:{...app.candidate,full_name,email,phone:phone||null},process_status:nextStatus,...(shouldAnalyze?{error_message:null}:{})}).eq('id',id);if(error) throw error;
  await db.from('workflow_events').insert({application_id:id,event_type:'candidate_contact_corrected',metadata:{author_id:user.id,fields:changed}});
  if(shouldAnalyze)await processApplication(id);
  revalidatePath(`/applications/${id}`);revalidatePath('/applications');revalidatePath('/');
}
export async function saveProfile(form:FormData){
  const user=await requireRecruiter();const id=String(form.get('application_id'));
  const full_name=z.string().trim().max(200).parse(String(form.get('full_name')||''));
  const email=z.union([z.email(),z.literal('')]).parse(String(form.get('email')||'').trim().toLowerCase());
  const phone=z.string().trim().max(50).parse(String(form.get('phone')||''));
  const skills=String(form.get('skills')||'').split(',').map(value=>value.trim()).filter(Boolean).slice(0,30);
  const history=String(form.get('history')||'').split('\n').map(value=>value.trim()).filter(Boolean).slice(0,30);
  const warnings=String(form.get('warnings')||'').split('\n').map(value=>value.trim()).filter(Boolean).slice(0,30);
  const db=adminDb();const {data:current,error:lookup}=await db.from('candidate_profiles').select('normalized').eq('application_id',id).single();if(lookup||!current)throw new Error('Analysis is not ready');
  const normalized={...current.normalized,full_name:full_name||null,email:email||null,phone:phone||null,skills,history,warnings};
  const {error}=await db.from('candidate_profiles').update({normalized,warnings}).eq('application_id',id);if(error)throw error;
  await db.from('workflow_events').insert({application_id:id,event_type:'profile_corrected',metadata:{author_id:user.id,fields:['full_name','email','phone','skills','history','warnings']}});
  revalidatePath(`/applications/${id}`);
}
export async function saveEvidence(form:FormData){
  const user=await requireRecruiter(); const id=String(form.get('id')), app=String(form.get('application_id'));
  const mark=String(form.get('mark'));if(!['confirmed','corrected','needs_followup'].includes(mark)) throw new Error('Invalid review mark');
  const note=String(form.get('note')||'').slice(0,2000);
  const db=adminDb();const [current,document]=await Promise.all([db.from('evidence_items').select('status,excerpt').eq('id',id).eq('application_id',app).single(),db.from('documents').select('extracted_text').eq('application_id',app).single()]);
  if(current.error||!current.data||document.error||!document.data?.extracted_text)throw new Error('Evidence source unavailable');
  const correction=validatedEvidenceCorrection(form.get('status'),String(form.get('excerpt')||''),document.data.extracted_text);
  const changed=correction.status!==current.data.status||correction.excerpt!==current.data.excerpt;
  if(changed&&mark!=='corrected')throw new Error('Mark changed evidence as corrected');
  const {error}=await db.rpc('apply_evidence_correction',{p_evidence_id:id,p_application_id:app,p_author_id:user.id,p_status:correction.status,p_excerpt:correction.excerpt,p_location:correction.location,p_mark:mark,p_note:note});
  if(error) throw error;
  await db.from('workflow_events').insert({application_id:app,event_type:'evidence_reviewed',metadata:{evidence_id:id,mark,changed,author_id:user.id}});
  revalidatePath(`/applications/${app}`);
}
export async function saveAction(form:FormData){
  const user=await requireRecruiter();const app=String(form.get('application_id')), type=String(form.get('action_type'));
  if(!['request_clarification','schedule_review','hold_for_review','mark_review_complete'].includes(type)) throw new Error('Invalid action');
  const notes=String(form.get('notes')||'').slice(0,2000);const db=adminDb();
  const {error}=await db.from('review_actions').insert({application_id:app,action_type:type,author_id:user.id,notes});if(error) throw error;
  await db.from('applications').update({review_status:type==='mark_review_complete'?'reviewed':'in_review'}).eq('id',app);
  await db.from('workflow_events').insert({application_id:app,event_type:'review_action',metadata:{type,author_id:user.id}});
  revalidatePath(`/applications/${app}`);
}

export async function saveOutboundDraft(form:FormData){
  const user=await requireRecruiter();
  const draft=draftSchema.parse({applicationId:form.get('application_id'),id:form.get('message_id'),messageType:form.get('message_type'),recipient:form.get('recipient'),subject:form.get('subject'),body:form.get('body')});
  const db=adminDb();
  const {data:application,error:lookup}=await db.from('applications').select('id').eq('id',draft.applicationId).single();
  if(lookup||!application)throw new Error('Application unavailable');
  const values={application_id:draft.applicationId,author_id:user.id,message_type:draft.messageType,human_outcome:draft.messageType==='rejection'?'reject':null,recipient:draft.recipient.toLowerCase(),subject:draft.subject,body:draft.body,draft_source:'reviewer',updated_at:new Date().toISOString(),status:'draft',error_category:null};
  const {data:existing}=await db.from('outbound_messages').select('id,status').eq('id',draft.id).eq('application_id',draft.applicationId).maybeSingle();
  if(existing){
    if(!['draft','failed'].includes(existing.status))throw new Error('This message cannot be edited after approval');
    const {data,error}=await db.from('outbound_messages').update(values).eq('id',draft.id).eq('application_id',draft.applicationId).in('status',['draft','failed']).select('id').maybeSingle();
    if(error||!data)throw new Error('Draft changed; refresh and try again');
  }else{
    const {error}=await db.from('outbound_messages').insert({id:draft.id,...values});
    if(error)throw error;
  }
  await db.from('workflow_events').insert({application_id:draft.applicationId,event_type:'outbound_draft_saved',metadata:{message_id:draft.id,message_type:draft.messageType,author_id:user.id}});
  revalidatePath(`/applications/${draft.applicationId}`);
  redirect(`/applications/${draft.applicationId}?mail=draft_saved`);
}

export async function approveAndSendEmail(form:FormData){
  const user=await requireRecruiter();
  const applicationId=z.uuid().parse(form.get('application_id'));
  const messageId=z.uuid().parse(form.get('message_id'));
  if(form.get('approval')!=='yes')redirect(`/applications/${applicationId}?mail=approval_required`);
  const db=adminDb();
  const {data:connection}=await db.from('gmail_connections').select('email,token_error').eq('recruiter_id',user.id).maybeSingle();
  if(!connection||connection.token_error)redirect(`/applications/${applicationId}?mail=connect_gmail`);
  let token:string;
  try{token=await gmailAccessToken(user.id);}catch(e){redirect(`/applications/${applicationId}?mail=${e instanceof Error&&/HTTP (400|401)/.test(e.message)?'connect_gmail':'token_unavailable'}`);}
  const now=new Date().toISOString();
  const {data:message,error:claimError}=await db.from('outbound_messages').update({status:'sending',sender:connection.email,approver_id:user.id,approved_at:now,send_started_at:now,error_category:null,updated_at:now}).eq('id',messageId).eq('application_id',applicationId).eq('status','draft').select('*').maybeSingle();
  if(claimError)throw claimError;
  if(!message)redirect(`/applications/${applicationId}?mail=already_handled`);
  let delivery:{status:'sent'|'failed'|'uncertain';messageId:string|null;errorCategory:string|null};
  try{if(hasTemplatePlaceholder(message.body))throw new Error('Incomplete template');const raw=gmailRawMessage(connection.email,message.recipient,message.subject,message.body);delivery=await deliverViaGmail(token,raw);}
  catch{delivery={status:'failed',messageId:null,errorCategory:'invalid_message'};}
  const outcome=delivery.status,errorCategory=delivery.errorCategory,gmailId=delivery.messageId;
  if(errorCategory==='gmail_http_401')await db.from('gmail_connections').update({token_error:'Reconnect Gmail to send'}).eq('recruiter_id',user.id);
  const completed=new Date().toISOString();
  const {error:statusError}=await db.from('outbound_messages').update({status:outcome,gmail_message_id:gmailId,error_category:errorCategory,sent_at:outcome==='sent'?completed:null,updated_at:completed}).eq('id',messageId).eq('status','sending');
  if(statusError)throw new Error('Delivery status could not be saved. Check Gmail Sent before retrying.');
  await db.from('workflow_events').insert({application_id:applicationId,event_type:outcome==='sent'?'outbound_email_sent':outcome==='failed'?'outbound_email_failed':'outbound_email_uncertain',metadata:{message_id:messageId,message_type:message.message_type,author_id:user.id,error_category:errorCategory,gmail_message_id:gmailId}});
  if(outcome==='sent'&&message.human_outcome==='reject')await db.from('applications').update({review_status:'reviewed'}).eq('id',applicationId);
  revalidatePath(`/applications/${applicationId}`);
  redirect(`/applications/${applicationId}?mail=${outcome}`);
}
