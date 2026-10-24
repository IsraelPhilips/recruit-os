import {it,expect} from 'vitest';
import fs from 'node:fs';
import {adminDb} from './supabase';
import {persistIntake} from './intake';
import {processApplication} from './process';

it.skipIf(process.env.RUN_FULL_INTEGRATION!=='1')('processes a synthetic PDF from receipt to grounded review evidence',async()=>{
  for(const line of fs.readFileSync('.env.local','utf8').split(/\r?\n/)){const i=line.indexOf('=');if(i>0&&line.slice(i+1))process.env[line.slice(0,i)]=line.slice(i+1);}
  process.env.AI_PROVIDER='nvidia';
  const db=adminDb(),reference=`SYNTH-FLOW-${crypto.randomUUID().slice(0,8)}`;let jobId='',appId='',key='';
  try{
    const {data:workspace,error:workspaceError}=await db.from('workspaces').select('id').limit(1).single();if(workspaceError||!workspace)throw workspaceError||new Error('No test workspace');
    const job=await db.from('jobs').insert({workspace_id:workspace.id,title:'Synthetic developer role',reference,description:'Synthetic role for end-to-end verification.',criteria:[{id:'typescript',label:'TypeScript',kind:'required'}],approved_at:new Date().toISOString()}).select('id').single();if(job.error)throw job.error;jobId=job.data.id;
    const bytes=fs.readFileSync('evaluation/fixtures/synthetic-cv.pdf');
    const intake=await persistIntake({form_id:'synthetic-full-flow',response_id:crypto.randomUUID(),job_reference:reference,submitted_at:new Date().toISOString(),candidate:{full_name:'Synthetic Applicant',email:'synthetic@example.test',phone:null,portfolio_url:null,cover_letter:null,consent:true},cv:{name:'synthetic-cv.pdf',mime_type:'application/pdf',content_base64:bytes.toString('base64')}});
    appId=intake.application_id!;expect(intake.status).toBe('received');
    const outcome=await processApplication(appId);expect(outcome.status,JSON.stringify(outcome)).toBe('ready');
    const [doc,evidence,profile]=await Promise.all([db.from('documents').select('storage_key,extracted_text').eq('application_id',appId).single(),db.from('evidence_items').select('status,excerpt,location').eq('application_id',appId).single(),db.from('candidate_profiles').select('model').eq('application_id',appId).single()]);
    key=doc.data?.storage_key||'';expect(doc.data?.extracted_text).toContain('TypeScript API');expect(evidence.data?.status).toBe('EVIDENCE_FOUND');expect(doc.data?.extracted_text).toContain(evidence.data?.excerpt||'UNSUPPORTED');expect(profile.data?.model).toContain('nemotron');
  }finally{if(key)await db.storage.from('private-cvs').remove([key]);if(appId)await db.from('applications').delete().eq('id',appId);if(jobId)await db.from('jobs').delete().eq('id',jobId);}
},120000);
