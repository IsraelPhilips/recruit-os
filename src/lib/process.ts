import { adminDb } from './supabase';
import { extractText } from './extract';
import { analyze } from './gemini';
import { analyzeWithNvidia } from './nvidia';
import { criteriaSchema } from './contracts';
import {resolveProfile} from './profile-grounding';

export async function processApplication(id:string) {
  const db=adminDb();
  const {data:claimed,error:claimError}=await db.from('applications').update({process_status:'processing',error_message:null,updated_at:new Date().toISOString()}).eq('id',id).in('process_status',['received','failed','manual_review']).lt('attempt_count',3).select('*').maybeSingle();
  if(claimError || !claimed) return {status:'not_claimed'};
  const start=Date.now();
  await db.from('applications').update({attempt_count:claimed.attempt_count+1}).eq('id',id);
  try {
    const criteria=criteriaSchema.parse(claimed.criteria_snapshot);
    const {data:doc,error:docError}=await db.from('documents').select('*').eq('application_id',id).single();
    if(docError || !doc) throw new Error('Document record missing');
    const download=await db.storage.from('private-cvs').download(doc.storage_key);
    if(download.error || !download.data) throw new Error('Private document unavailable');
    const source=await extractText(Buffer.from(await download.data.arrayBuffer()),doc.mime_type);
    await db.from('documents').update({extracted_text:source,extraction_status:'ready'}).eq('id',doc.id);
    const result=process.env.AI_PROVIDER==='nvidia'?await analyzeWithNvidia(source,criteria):await analyze(source,criteria);
    const {data:profileCorrection}=await db.from('workflow_events').select('id').eq('application_id',id).eq('event_type','profile_corrected').limit(1).maybeSingle();
    if(!profileCorrection){const normalized=resolveProfile(result.output.profile,source,claimed.candidate,false).profile;const profile=await db.from('candidate_profiles').upsert({application_id:id,normalized,warnings:normalized?.warnings||[],model:result.model,usage:result.usage});if(profile.error)throw profile.error;}
    const {data:reviewed}=await db.from('evidence_items').select('criterion_id,review_mark').eq('application_id',id).eq('criterion_version',claimed.criteria_version).in('review_mark',['confirmed','corrected','needs_followup']);
    const locked=new Set((reviewed||[]).map(e=>e.criterion_id));
    const fresh=result.output.evidence.filter(e=>!locked.has(e.criterion_id)).map(e=>({...e,application_id:id,criterion_version:claimed.criteria_version}));
    if(fresh.length){const evidence=await db.from('evidence_items').upsert(fresh,{onConflict:'application_id,criterion_id,criterion_version'});if(evidence.error)throw evidence.error;}
    const manual=!claimed.candidate?.email || result.output.evidence.some(e=>e.status==='REQUIRES_REVIEW' || e.status==='AMBIGUOUS');
    const status=manual?'manual_review':'ready';
    await db.from('applications').update({process_status:status,updated_at:new Date().toISOString()}).eq('id',id);
    await db.from('workflow_events').insert({application_id:id,event_type:'processing_completed',metadata:{status,model:result.model}});
    await db.from('processing_attempts').insert({application_id:id,stage:'full',outcome:status,duration_ms:Date.now()-start});
    return {status};
  } catch(error){
    const message=error instanceof Error?error.message:'Unknown processing error';
    const unsupported=/corrupted|protected|scanned|No readable|unsupported/.test(message);
    const status=unsupported?'manual_review':'failed';
    await db.from('applications').update({process_status:status,error_message:message.slice(0,200),updated_at:new Date().toISOString()}).eq('id',id);
    await db.from('processing_attempts').insert({application_id:id,stage:'full',outcome:status,duration_ms:Date.now()-start,error_category:unsupported?'document':'processing'});
    await db.from('workflow_events').insert({application_id:id,event_type:'processing_failed',metadata:{category:unsupported?'document':'processing'}});
    return {status,error:message};
  }
}

export async function processPendingApplications(limit=1,workspaceId?:string){
  const db=adminDb();
  let jobIds:string[]|null=null;
  if(workspaceId){const {data:jobs,error}=await db.from('jobs').select('id').eq('workspace_id',workspaceId);if(error)throw error;jobIds=(jobs||[]).map(job=>job.id);if(!jobIds.length)return {recovered:0,results:[]};}
  const cutoff=new Date(Date.now()-10*60_000).toISOString();
  let staleQuery=db.from('applications').update({process_status:'failed',error_message:'Processing interrupted; retry available',updated_at:new Date().toISOString()}).eq('process_status','processing').lt('updated_at',cutoff);if(jobIds)staleQuery=staleQuery.in('job_id',jobIds);const {data:stale}=await staleQuery.select('id');
  for(const row of stale||[])await db.from('workflow_events').insert({application_id:row.id,event_type:'processing_interrupted',metadata:{reason:'stale_timeout'}});
  let pendingQuery=db.from('applications').select('id').or('process_status.eq.received,and(process_status.eq.manual_review,attempt_count.eq.0)').lt('attempt_count',3);if(jobIds)pendingQuery=pendingQuery.in('job_id',jobIds);const {data:pending,error}=await pendingQuery.order('created_at',{ascending:true}).limit(limit);
  if(error)throw error;
  const results=[];
  for(const row of pending||[])results.push({id:row.id,...await processApplication(row.id)});
  return {recovered:stale?.length||0,results};
}
