import {it,expect} from 'vitest';
import fs from 'node:fs';
import {adminDb} from './supabase';
import {accessToken,formQuestions,getForm,googleJson} from './google';
import {syncForm} from './google-sync';
import {processPendingApplications} from './process';

it.skipIf(process.env.RUN_GOOGLE_LIVE!=='1')('can inspect the connected synthetic Form and its response metadata',async()=>{
  const env=fs.readFileSync('.env.local','utf8');
  for(const line of env.split(/\r?\n/)){const i=line.indexOf('=');if(i>0&&line.slice(i+1))process.env[line.slice(0,i)]=line.slice(i+1);}
  const formId=process.env.GOOGLE_TEST_FORM_ID;
  if(!formId)throw new Error('GOOGLE_TEST_FORM_ID is required for the live test');
  const db=adminDb();
  const {data:linked,error}=await db.from('google_forms').select('connection_id,field_mapping').eq('form_id',formId).single();
  if(error)throw new Error(`Connected Form lookup failed: ${error.message}`);
  if(!linked)throw new Error('Test Form is not connected');
  const token=await accessToken(linked.connection_id);
  const questions=formQuestions(await getForm(token,formId));
  const page=await googleJson<{responses?:Array<{responseId:string;respondentEmail?:string;answers?:Record<string,{textAnswers?:unknown;fileUploadAnswers?:unknown}>}>}>(token,`https://forms.googleapis.com/v1/forms/${encodeURIComponent(formId)}/responses?pageSize=10`);
  expect(questions.length).toBeGreaterThan(0);
  expect(page.responses?.length).toBeGreaterThan(0);
  console.log(JSON.stringify({questions:questions.map(q=>({id:q.id,title:q.title,isFile:q.isFile})),responseCount:page.responses?.length,respondentEmailAvailable:Boolean(page.responses?.[0]?.respondentEmail),answerTypes:Object.entries(page.responses?.[0]?.answers||{}).map(([id,a])=>({id,type:a.fileUploadAnswers?'file':a.textAnswers?'text':'other'}))}));
},60000);

it.skipIf(process.env.RUN_GOOGLE_PROCESS!=='1')('analyzes a persisted synthetic Form application',async()=>{
  const env=fs.readFileSync('.env.local','utf8');
  for(const line of env.split(/\r?\n/)){const i=line.indexOf('=');if(i>0&&line.slice(i+1))process.env[line.slice(0,i)]=line.slice(i+1);}
  const formId=process.env.GOOGLE_TEST_FORM_ID;
  if(!formId)throw new Error('GOOGLE_TEST_FORM_ID is required for the live test');
  const {data:before,error}=await adminDb().from('applications').select('id,process_status,attempt_count').eq('form_id',formId).order('created_at',{ascending:false}).limit(1).single();
  if(error||!before)throw new Error('Synthetic Form application not found');
  if(before.attempt_count===0)await processPendingApplications(1);
  const [app,profile,evidence]=await Promise.all([
    adminDb().from('applications').select('process_status,attempt_count,error_message').eq('id',before.id).single(),
    adminDb().from('candidate_profiles').select('model').eq('application_id',before.id).maybeSingle(),
    adminDb().from('evidence_items').select('criterion_id,status,excerpt').eq('application_id',before.id),
  ]);
  console.log(JSON.stringify({status:app.data?.process_status,attemptCount:app.data?.attempt_count,error:app.data?.error_message?String(app.data.error_message).slice(0,120):null,model:profile.data?.model||null,evidenceCount:evidence.data?.length||0}));
  expect(profile.data).not.toBeNull();
  expect(evidence.data?.length).toBeGreaterThan(0);
},120000);

it.skipIf(process.env.RUN_GOOGLE_SYNC!=='1')('imports synthetic Form responses into persisted applications',async()=>{
  const env=fs.readFileSync('.env.local','utf8');
  for(const line of env.split(/\r?\n/)){const i=line.indexOf('=');if(i>0&&line.slice(i+1))process.env[line.slice(0,i)]=line.slice(i+1);}
  const formId=process.env.GOOGLE_TEST_FORM_ID;
  if(!formId)throw new Error('GOOGLE_TEST_FORM_ID is required for the live test');
  const result=await syncForm(formId);
  const {data,error}=await adminDb().from('applications').select('id,process_status').eq('form_id',formId);
  if(error)throw error;
  console.log(JSON.stringify({sync:result,applicationStatuses:(data||[]).map(item=>item.process_status)}));
  expect(data?.length).toBeGreaterThan(0);
},60000);
