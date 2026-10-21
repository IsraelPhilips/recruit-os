import { intakeSchema, validateDocument } from './contracts';
import type { Intake } from './contracts';
import { adminDb } from './supabase';

export async function persistIntake(raw: unknown) {
  const payload: Intake = intakeSchema.parse(raw);
  const bytes=validateDocument(payload.cv); const db=adminDb();
  const {data:job,error:jobError}=await db.from('jobs').select('id,approved_at,criteria,criteria_version').eq('reference',payload.job_reference).single();
  if(jobError || !job?.approved_at) throw new Error('Unknown or unapproved job');
  const {data:existing}=await db.from('applications').select('id,process_status').eq('form_id',payload.form_id).eq('response_id',payload.response_id).maybeSingle();
  if(existing) return {application_id:existing.id,status:existing.process_status,duplicate:true};
  const key=`${crypto.randomUUID()}/${payload.cv.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
  const upload=await db.storage.from('private-cvs').upload(key,bytes,{contentType:payload.cv.mime_type,upsert:false});
  if(upload.error) throw new Error('Private document upload failed');
  const status=payload.candidate.email?'received':'manual_review';
  const {data:app,error}=await db.from('applications').insert({job_id:job.id,form_id:payload.form_id,response_id:payload.response_id,submitted_at:payload.submitted_at,candidate:payload.candidate,criteria_snapshot:job.criteria,criteria_version:job.criteria_version,process_status:status,error_message:status==='manual_review'?'Candidate email missing; request correction':null}).select('id').single();
  if(error){await db.storage.from('private-cvs').remove([key]);if(error.code==='23505') return {duplicate:true,status:'received'};throw error;}
  const doc=await db.from('documents').insert({application_id:app.id,storage_key:key,mime_type:payload.cv.mime_type,byte_size:bytes.length});
  if(doc.error){await db.from('applications').update({process_status:'failed',error_message:'Document record failed'}).eq('id',app.id);throw new Error('Document record failed');}
  await db.from('workflow_events').insert({application_id:app.id,event_type:'intake_accepted',metadata:{source:'google_forms_oauth',bytes:bytes.length}});
  return {application_id:app.id,status,duplicate:false};
}
