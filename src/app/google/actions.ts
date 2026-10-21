'use server';
import {requireRecruiter} from '@/lib/auth';
import {adminDb} from '@/lib/supabase';
import {accessToken,createWatch,getForm,formQuestions} from '@/lib/google';
import {mappingSchema,syncForm} from '@/lib/google-sync';
import {revalidatePath} from 'next/cache';
import {processPendingApplications} from '@/lib/process';

export async function connectForm(form:FormData){
  const user=await requireRecruiter();const db=adminDb();const {data:connection}=await db.from('google_connections').select('id').eq('recruiter_id',user.id).single();if(!connection)throw new Error('Connect Google first');
  const formId=String(form.get('form_id')||''),jobId=String(form.get('job_id')||'');
  const mapping=mappingSchema.parse(Object.fromEntries(['name','email','cv','consent','phone','portfolio','cover_letter'].map(k=>[k,String(form.get(k)||'')||undefined])));
  const token=await accessToken(connection.id);const info=await getForm(token,formId);const questions=formQuestions(info);
  const ids=new Set(questions.map(q=>q.id));for(const id of Object.values(mapping))if(id&&!ids.has(id))throw new Error('Field mapping does not match Form');
  if(!questions.find(q=>q.id===mapping.cv)?.isFile)throw new Error('CV field must be a File upload question');
  const {data:job}=await db.from('jobs').select('id,approved_at').eq('id',jobId).single();if(!job?.approved_at)throw new Error('Choose an approved role');
  const watch=await createWatch(token,formId);
  const {error}=await db.from('google_forms').upsert({connection_id:connection.id,form_id:formId,form_title:info.info?.title||formId,job_id:jobId,field_mapping:mapping,watch_id:watch.id,watch_expires_at:watch.expireTime,sync_error:null},{onConflict:'form_id'});if(error)throw error;
  revalidatePath('/google');
}
export async function syncSelected(form:FormData){await requireRecruiter();const id=String(form.get('form_id')||'');await syncForm(id);await processPendingApplications(1);revalidatePath('/google');revalidatePath('/applications');}
