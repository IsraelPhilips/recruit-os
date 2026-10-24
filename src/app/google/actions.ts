'use server';
import {requireWorkspace} from '@/lib/auth';
import {adminDb} from '@/lib/supabase';
import {accessToken,createWatch,renewWatch,getForm,formQuestions} from '@/lib/google';
import {mappingSchema,syncForm} from '@/lib/google-sync';
import {revalidatePath} from 'next/cache';
import {processPendingApplications} from '@/lib/process';

export async function connectForm(form:FormData){
  const {user,workspaceId}=await requireWorkspace();const db=adminDb();const {data:connection}=await db.from('google_connections').select('id').eq('recruiter_id',user.id).single();if(!connection)throw new Error('Connect Google first');
  const formId=String(form.get('form_id')||''),jobId=String(form.get('job_id')||'');
  const mapping=mappingSchema.parse(Object.fromEntries(['name','email','cv','consent','phone','portfolio','cover_letter'].map(k=>[k,String(form.get(k)||'')||undefined])));
  const token=await accessToken(connection.id);const info=await getForm(token,formId);const questions=formQuestions(info);
  const ids=new Set(questions.map(q=>q.id));for(const id of Object.values(mapping))if(id&&!ids.has(id))throw new Error('Field mapping does not match Form');
  if(!questions.find(q=>q.id===mapping.cv)?.isFile)throw new Error('CV field must be a File upload question');
  if(mapping.consent&&!questions.find(q=>q.id===mapping.consent)?.isConsent)throw new Error('Consent must use a Yes/No or agreement question');
  for(const field of ['name','email','consent','phone','portfolio','cover_letter'] as const)if(mapping[field]&&questions.find(q=>q.id===mapping[field])?.isFile)throw new Error('Only the CV field can use a File upload question');
  const {data:job}=await db.from('jobs').select('id,approved_at').eq('id',jobId).eq('workspace_id',workspaceId).single();if(!job?.approved_at)throw new Error('Choose an approved role');
  const {data:existing}=await db.from('google_forms').select('id,connection_id,watch_id,watch_expires_at').eq('form_id',formId).maybeSingle();
  if(existing&&existing.connection_id!==connection.id)throw new Error('This Form is connected to another account');
  let watch:{id:string;expireTime:string};
  if(existing?.watch_id&&existing.watch_expires_at&&new Date(existing.watch_expires_at).getTime()>Date.now()+60*60*1000){watch={id:existing.watch_id,expireTime:existing.watch_expires_at};}
  else if(existing?.watch_id){try{watch=await renewWatch(token,formId,existing.watch_id);}catch{watch=await createWatch(token,formId);}}
  else watch=await createWatch(token,formId);
  const {error}=await db.from('google_forms').upsert({connection_id:connection.id,form_id:formId,form_title:info.info?.title||formId,job_id:jobId,field_mapping:mapping,watch_id:watch.id,watch_expires_at:watch.expireTime,sync_error:null},{onConflict:'form_id'});if(error)throw error;
  await db.from('google_sync_failures').update({retry_count:0,resolved_at:null}).eq('form_id',formId).is('resolved_at',null);
  revalidatePath('/google');
}
export async function syncSelected(form:FormData){const {user,workspaceId}=await requireWorkspace();const db=adminDb();const {data:connection}=await db.from('google_connections').select('id').eq('recruiter_id',user.id).single();const id=String(form.get('form_id')||'');const {data:owned}=connection?await db.from('google_forms').select('id').eq('form_id',id).eq('connection_id',connection.id).maybeSingle():{data:null};if(!owned)throw new Error('Form not found');await syncForm(id);await processPendingApplications(1,workspaceId);revalidatePath('/google');revalidatePath('/applications');}
