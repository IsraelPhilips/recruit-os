import {it,expect} from 'vitest';
import fs from 'node:fs';
import {adminDb} from './supabase';
import {persistIntake} from './intake';

it.skipIf(process.env.RUN_SUPABASE_INTEGRATION!=='1')('persists one synthetic application for duplicate deliveries',async()=>{
  const env=fs.readFileSync('.env.local','utf8');for(const line of env.split(/\r?\n/)){const i=line.indexOf('=');if(i>0&&line.slice(i+1))process.env[line.slice(0,i)]=line.slice(i+1);}
  const db=adminDb();const reference=`SYNTH-${crypto.randomUUID().slice(0,8)}`;let jobId='';let appId='';let storageKey='';
  try{
    const {data:workspace,error:workspaceError}=await db.from('workspaces').select('id').limit(1).single();if(workspaceError||!workspace)throw workspaceError||new Error('No test workspace');
    const job=await db.from('jobs').insert({workspace_id:workspace.id,title:'Synthetic test role',reference,description:'Synthetic role for intake verification.',criteria:[{id:'c1',label:'TypeScript',kind:'required'}],approved_at:new Date().toISOString()}).select('id').single();if(job.error)throw job.error;jobId=job.data.id;
    const payload={form_id:'synthetic-integration-form',response_id:crypto.randomUUID(),job_reference:reference,submitted_at:new Date().toISOString(),candidate:{full_name:'Synthetic Applicant',email:'applicant@example.test',phone:null,portfolio_url:null,cover_letter:null,consent:true},cv:{name:'synthetic.pdf',mime_type:'application/pdf' as const,content_base64:Buffer.from('%PDF-1.4\nSynthetic fixture only.').toString('base64')}};
    const first=await persistIntake(payload);expect(first.duplicate).toBe(false);expect(first.application_id).toBeTruthy();appId=first.application_id!;
    const duplicate=await persistIntake(payload);expect(duplicate.duplicate).toBe(true);expect(duplicate.application_id).toBe(appId);
    const doc=await db.from('documents').select('storage_key').eq('application_id',appId).single();expect(doc.data?.storage_key).toBeTruthy();storageKey=doc.data!.storage_key;
    const stored=await db.storage.from('private-cvs').download(storageKey);expect(stored.error).toBeNull();
    const inserted=await db.from('evidence_items').insert({application_id:appId,criterion_id:'c1',criterion_version:1,status:'NOT_EVIDENCED',excerpt:null,location:null,reasoning:'Synthetic initial result',question:null}).select('id').single();if(inserted.error)throw inserted.error;
    const correction=await db.rpc('apply_evidence_correction',{p_evidence_id:inserted.data.id,p_application_id:appId,p_author_id:crypto.randomUUID(),p_status:'EVIDENCE_FOUND',p_excerpt:'TypeScript API',p_location:'Page 1',p_mark:'corrected',p_note:'Synthetic correction'});expect(correction.error).toBeNull();
    const revisions=await db.from('evidence_revisions').select('previous_status,revised_status').eq('application_id',appId);expect(revisions.data).toMatchObject([{previous_status:'NOT_EVIDENCED',revised_status:'EVIDENCE_FOUND'}]);
  }finally{if(storageKey)await db.storage.from('private-cvs').remove([storageKey]);if(appId)await db.from('applications').delete().eq('id',appId);if(jobId)await db.from('jobs').delete().eq('id',jobId);}
},60000);
