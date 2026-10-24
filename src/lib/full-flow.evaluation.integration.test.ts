import {it,expect} from 'vitest';
import fs from 'node:fs';
import {adminDb} from './supabase';
import {persistIntake} from './intake';
import {processApplication} from './process';
import {candidateBrief} from './profile-grounding';
import {sourceContains,type ReviewCriterion,type ReviewEvidence} from './review-summary';

type EvalCase={case_id:string;scenario:string;source:string;process_status:string;evidence:{criterion_id:string;status:string;excerpt:string|null}[];expected_percent:number|null;expected_tone:string;expected_case_status?:string;metadata_issue?:string;repeat_score?:boolean;expected_profile_warning?:string[];expected_profile_fact?:string};
type EvalSet={rubric:{criteria:ReviewCriterion[]};cases:EvalCase[]};
const apiUnavailable=(error:string)=>/fetch failed|network|timeout|aborted|NVIDIA HTTP (401|403|404|408|429|5\d\d)/i.test(error);

function makePdf(source:string){
  const escaped=(value:string)=>value.replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
  const lines=source.split(/\r?\n/).flatMap(line=>line.match(/.{1,88}(?:\s|$)|.{1,88}/g)||['']);
  const stream=`BT /F1 10 Tf 48 744 Td\n${lines.map((line,index)=>`(${escaped(line.trimEnd())}) Tj${index<lines.length-1?' 0 -14 Td':''}`).join('\n')}\nET`;
  const objects=[
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`
  ];
  let pdf='%PDF-1.4\n';const offsets=[0];
  for(let index=0;index<objects.length;index++){offsets.push(Buffer.byteLength(pdf));pdf+=`${index+1} 0 obj\n${objects[index]}\nendobj\n`;}
  const xref=Buffer.byteLength(pdf);pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;
  for(const offset of offsets.slice(1))pdf+=`${String(offset).padStart(10,'0')} 00000 n \n`;
  pdf+=`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
}

function readEnv(){for(const line of fs.readFileSync('.env.local','utf8').split(/\r?\n/)){const index=line.indexOf('=');if(index>0&&line.slice(index+1))process.env[line.slice(0,index)]=line.slice(index+1);}}

it.skipIf(process.env.RUN_FULL_EVALUATION_FLOW!=='1')('runs all 12 synthetic evaluation cases through the production CV pipeline where applicable',async()=>{
  readEnv();process.env.AI_PROVIDER='nvidia';
  const db=adminDb();const set:EvalSet=JSON.parse(fs.readFileSync('evaluation/job-fit-cases.json','utf8'));
  const requestedIds=process.env.FULL_FLOW_CASE_IDS?.split(',').map(value=>value.trim()).filter(Boolean)||[];
  const cases=requestedIds.length?set.cases.filter(item=>requestedIds.includes(item.case_id)):set.cases;
  if(requestedIds.length!==new Set(requestedIds).size||requestedIds.some(id=>!set.cases.some(item=>item.case_id===id)))throw new Error('FULL_FLOW_CASE_IDS must contain valid, unique case IDs');
  const reference=`SYNTH-FULL-EVAL-${crypto.randomUUID().slice(0,8)}`;let jobId='';
  const results:Record<string,unknown>[]=[];
  const {data:workspace,error:workspaceError}=await db.from('workspaces').select('id').limit(1).single();
  if(workspaceError||!workspace)throw workspaceError||new Error('No test workspace available');
  const job=await db.from('jobs').insert({workspace_id:workspace.id,title:'Synthetic evaluation role',reference,description:'Synthetic evaluation role for end-to-end testing.',criteria:set.rubric.criteria,approved_at:new Date().toISOString()}).select('id').single();
  if(job.error)throw job.error;jobId=job.data.id;

  try{
    for(const item of cases){
      let appId='';let storageKey='';let source='';let initialError:string|null=null;let retryError:string|null=null;let initialStatus:string|null=null;let initialPendingScore=false;let extractionStatus:string|null=null;
      const responseId=`${reference}-${item.case_id}`;const missingEmail=item.metadata_issue?.toLowerCase().includes('email missing')||false;
      const name=`Synthetic Applicant ${item.case_id}`;const email=missingEmail?'':`synthetic-${item.case_id.toLowerCase()}@example.test`;
      source=`Name: ${name}\n${email?`Email: ${email}\n`:''}${item.source}`;
      const isUnreadable=item.case_id==='T08';
      const file=isUnreadable?Buffer.from('%PDF-1.4\nThis is intentionally not a valid PDF document body.'):makePdf(source);
      const payload={form_id:'synthetic-full-evaluation',response_id:responseId,job_reference:reference,submitted_at:new Date().toISOString(),candidate:{full_name:name,email,phone:null,portfolio_url:null,cover_letter:null,consent:true},cv:{name:`${item.case_id.toLowerCase()}-synthetic.pdf`,mime_type:'application/pdf' as const,content_base64:file.toString('base64')}};
      const checks:Record<string,boolean>={};let duplicate=false;let outcomeStatus:string|null=null;let retryStatus:string|null=null;let extracted='';let actualEvidence:ReviewEvidence[]=[];let actualBrief:ReturnType<typeof candidateBrief>|null=null;let actualProfile:unknown=null;let modelUsage:unknown=null;let processAttempts:unknown[]=[];let errorText:string|null=null;
      try{
        const intake=await persistIntake(payload);appId=intake.application_id||'';duplicate=Boolean(intake.duplicate);
        checks.intake_saved=Boolean(appId);
        if(item.repeat_score){
          const replay=await persistIntake(payload);checks.duplicate_delivery=Boolean(replay.duplicate&&replay.application_id===appId);duplicate=Boolean(replay.duplicate&&replay.application_id===appId);
          const count=await db.from('applications').select('id',{count:'exact',head:true}).eq('form_id',payload.form_id).eq('response_id',payload.response_id);checks.single_persisted_application=count.count===1;
        }
        const doc=await db.from('documents').select('storage_key').eq('application_id',appId).single();if(doc.error)throw doc.error;storageKey=doc.data.storage_key;
        if(item.case_id==='T12'){
          await db.storage.from('private-cvs').remove([storageKey]);
          const failed=await processApplication(appId);initialError=failed.error||null;initialStatus=failed.status;outcomeStatus=failed.status;
          const preserved=await db.from('applications').select('id,process_status,error_message,attempt_count').eq('id',appId).single();
          checks.failure_visible=failed.status==='failed'&&preserved.data?.process_status==='failed'&&Boolean(preserved.data.error_message)&&preserved.data.attempt_count===1;
          checks.application_preserved=Boolean(preserved.data?.id===appId);
          const failureBrief=candidateBrief(set.rubric.criteria,[],'failed','',null,payload.candidate);
          initialPendingScore=failureBrief.fit.percent===null&&failureBrief.fit.tone==='pending';checks.no_score_during_failure=initialPendingScore;
          const restored=await db.storage.from('private-cvs').upload(storageKey,file,{contentType:'application/pdf',upsert:true});
          checks.document_restored=restored.error===null;
          if(!restored.error){const retried=await processApplication(appId);retryStatus=retried.status;retryError=retried.error||null;}
          if(retryStatus==='ready'||retryStatus==='manual_review')outcomeStatus=retryStatus;
          errorText=retryError;
          checks.retry_recovered=retryStatus==='ready'||retryStatus==='manual_review';
        }else if(isUnreadable){
          const failed=await processApplication(appId);initialError=failed.error||null;initialStatus=failed.status;outcomeStatus=failed.status;
          const preserved=await db.from('applications').select('id,process_status,error_message,attempt_count').eq('id',appId).single();
          checks.unreadable_cv_visible=failed.status==='manual_review'&&preserved.data?.process_status==='manual_review'&&Boolean(preserved.data.error_message)&&preserved.data.attempt_count===1;
          checks.application_preserved=Boolean(preserved.data?.id===appId);
          const failureBrief=candidateBrief(set.rubric.criteria,[],'manual_review','',null,payload.candidate);
          initialPendingScore=failureBrief.fit.percent===null&&failureBrief.fit.tone==='pending';checks.pending_score=initialPendingScore;
          const restored=await db.storage.from('private-cvs').upload(storageKey,makePdf(source),{contentType:'application/pdf',upsert:true});
          checks.document_restored=restored.error===null;
          if(restored.error)errorText=restored.error.message;
          else{const retried=await processApplication(appId);retryStatus=retried.status;retryError=retried.error||null;if(retryStatus==='ready'||retryStatus==='manual_review')outcomeStatus=retryStatus;errorText=retryError;}
          checks.retry_recovered=retryStatus==='ready'||retryStatus==='manual_review';
        }else{outcomeStatus=(await processApplication(appId)).status;initialStatus=outcomeStatus;}

        const app=await db.from('applications').select('id,candidate,process_status,error_message,criteria_snapshot').eq('id',appId).single();
        const document=await db.from('documents').select('extracted_text,extraction_status').eq('application_id',appId).single();
        const evidence=await db.from('evidence_items').select('criterion_id,status,excerpt,question,review_mark').eq('application_id',appId).eq('criterion_version',1);
        const profile=await db.from('candidate_profiles').select('normalized,model,usage').eq('application_id',appId).maybeSingle();
        const attempts=await db.from('processing_attempts').select('outcome,duration_ms,error_category').eq('application_id',appId).eq('stage','full');
        if(app.error)throw app.error;if(document.error)throw document.error;if(evidence.error)throw evidence.error;if(profile.error)throw profile.error;
        extracted=document.data.extracted_text||'';extractionStatus=document.data.extraction_status;actualEvidence=(evidence.data||[]) as ReviewEvidence[];actualProfile=profile.data?.normalized||null;modelUsage=profile.data?.usage||null;processAttempts=(attempts.data||[]) as unknown[];
        const sourceReady=source.trim()&&extracted.trim();checks.cv_extracted=Boolean(isUnreadable?retryStatus?sourceContains(extracted,name):!sourceReady:sourceReady&&sourceContains(extracted,item.source));
        const normalizedProfile=profile.data?.normalized as {full_name?:string|null;email?:string|null;skills?:string[];history?:string[]}|undefined;
        checks.profile_name_grounded=isUnreadable&&!retryStatus?true:Boolean(normalizedProfile?.full_name&&sourceContains(extracted,normalizedProfile.full_name));
        const profileFacts=[...(normalizedProfile?.skills||[]),...(normalizedProfile?.history||[])];
        const profileFactsGrounded=profileFacts.every(value=>sourceContains(extracted,value));
        const expectedProfileFactPresent=!item.expected_profile_fact||profileFacts.some(value=>value.toLowerCase().includes(item.expected_profile_fact!.toLowerCase()));
        checks.profile_facts_grounded=isUnreadable&&!retryStatus?true:profileFactsGrounded&&expectedProfileFactPresent;
        if(item.expected_profile_warning)checks.expected_profile_warning=Boolean(normalizedProfile?.warnings?.some(value=>item.expected_profile_warning!.every(token=>value.toLowerCase().includes(token.toLowerCase()))));
        if(outcomeStatus==='ready'||outcomeStatus==='manual_review')checks.profile_persisted=Boolean(profile.data?.normalized);
        checks.form_email_state=missingEmail?app.data?.process_status==='manual_review'&&!app.data?.candidate?.email:app.data?.candidate?.email===email;
        if(outcomeStatus==='ready'||outcomeStatus==='manual_review'){
          const evidenceChecks=item.evidence.map(expected=>{const actual=actualEvidence.find(value=>value.criterion_id===expected.criterion_id);const citationGrounded=actual?.excerpt?sourceContains(extracted,actual.excerpt):!['EVIDENCE_FOUND','PARTIAL_EVIDENCE'].includes(actual?.status||'');return {criterion_id:expected.criterion_id,expected_status:expected.status,actual_status:actual?.status||'MISSING',status_match:actual?.status===expected.status,expected_excerpt:expected.excerpt,actual_excerpt:actual?.excerpt||null,actual_citation_grounded:citationGrounded,reference_excerpt_extracted:!expected.excerpt||sourceContains(extracted,expected.excerpt)};});
          checks.expected_evidence_statuses=evidenceChecks.every(result=>result.status_match);
          checks.actual_citations_grounded=actualEvidence.every(actual=>actual.excerpt?sourceContains(extracted,actual.excerpt):!['EVIDENCE_FOUND','PARTIAL_EVIDENCE'].includes(actual.status));
          checks.reference_excerpts_extracted=evidenceChecks.every(result=>result.reference_excerpt_extracted);
          checks.one_evidence_per_criterion=actualEvidence.length===set.rubric.criteria.length&&set.rubric.criteria.every(criterion=>actualEvidence.filter(actual=>actual.criterion_id===criterion.id).length===1);
          const brief=candidateBrief(set.rubric.criteria,actualEvidence,outcomeStatus,extracted,actualProfile as never,app.data?.candidate||{});
          actualBrief=brief;
          if(item.expected_percent!==null){checks.expected_job_fit=brief.fit.percent===item.expected_percent;checks.expected_tone=brief.fit.tone===item.expected_tone;}
          if(item.case_id==='T12')checks.retry_recovered=retryStatus==='ready'||retryStatus==='manual_review';
        }else{
          errorText=errorText||app.data?.error_message||`Pipeline ended with ${outcomeStatus}`;
          if(item.case_id==='T12')checks.retry_recovered=false;
        }
        if(item.case_id!=='T08'&&item.case_id!=='T12')checks.application_processed=outcomeStatus==='ready'||outcomeStatus==='manual_review';
      }catch(error){errorText=error instanceof Error?error.message:'Unknown integration error';checks.pipeline_completed=false;}
      const checkValues=Object.values(checks);const blocked=Boolean(errorText&&apiUnavailable(errorText));
      const status=blocked?'blocked':checkValues.length&&checkValues.every(Boolean)?'passed':'failed';
      results.push({case_id:item.case_id,scenario:item.scenario,expected_percent:item.expected_percent,expected_tone:item.expected_tone,expected_profile_warning:item.expected_profile_warning||null,expected_profile_fact:item.expected_profile_fact||null,expected_case_status:item.expected_case_status||'scored',status,checks,initial_status:initialStatus,initial_score_pending:initialPendingScore,application_status:outcomeStatus,retry_status:retryStatus,duplicate_delivery:duplicate,extracted_characters:extracted.length,extraction_status:extractionStatus,pipeline_attempts:processAttempts,model_usage:modelUsage,profile:actualProfile,evidence:actualEvidence.map(actual=>({criterion_id:actual.criterion_id,status:actual.status,excerpt:actual.excerpt,citation_grounded:actual.excerpt?sourceContains(extracted,actual.excerpt):null})),actual_brief:actualBrief?{fit:actualBrief.fit,strengths:actualBrief.strengths,gaps:actualBrief.gaps,uncertainties:actualBrief.uncertainties,next_step:actualBrief.nextStep}:null,error:errorText,initial_failure_error:initialError,expected_evidence:item.evidence});
      if(storageKey)await db.storage.from('private-cvs').remove([storageKey]);if(appId)await db.from('applications').delete().eq('id',appId);
    }
  }finally{if(jobId)await db.from('jobs').delete().eq('id',jobId);}
  const passed=results.filter(result=>result.status==='passed').length,failed=results.filter(result=>result.status==='failed').length,blocked=results.filter(result=>result.status==='blocked').length;
  const latencies=results.flatMap(result=>(result.pipeline_attempts as {duration_ms:number|null}[]).map(attempt=>attempt.duration_ms).filter((value):value is number=>typeof value==='number')).sort((a,b)=>a-b);
  const medianLatency=latencies.length?latencies[Math.floor(latencies.length/2)]:null;
  const evidenceRows=results.flatMap(result=>result.evidence as {excerpt:string|null;citation_grounded:boolean|null}[]);
  const citations=evidenceRows.filter(item=>item.excerpt);
  const tokenUsages=results.map(result=>result.model_usage as {total_tokens?:number;prompt_tokens?:number;completion_tokens?:number}|null).filter((usage):usage is {total_tokens?:number;prompt_tokens?:number;completion_tokens?:number}=>Boolean(usage));
  const scoredCases=results.filter(result=>result.expected_percent!==null);
  const semanticChecks=scoredCases.filter(result=>Object.hasOwn(result.checks as object,'expected_evidence_statuses'));
  const scoreChecks=scoredCases.filter(result=>Object.hasOwn(result.checks as object,'expected_job_fit'));
  const suffix=requestedIds.length?`-${requestedIds.join('-').toLowerCase()}`:'';
  const reportPath=`evaluation/full-flow-report${suffix}.md`;
  const resultsPath=`evaluation/full-flow-results${suffix}.json`;
  const recoveryChecks=results.filter(result=>result.case_id==='T08'||result.case_id==='T12');
  const report={run_at:new Date().toISOString(),provider:'NVIDIA Nemotron',model:process.env.NVIDIA_MODEL||'nvidia/nemotron-3.5-lightning-30b-a3b',run_status:blocked===results.length?'blocked':blocked?'partial':'completed',total_cases:results.length,passed,failed,blocked,metrics:{scoring_cases:scoredCases.length,semantic_status_matches:semanticChecks.filter(result=>(result.checks as Record<string,boolean>).expected_evidence_statuses).length,semantic_cases_completed:semanticChecks.length,job_fit_score_matches:scoreChecks.filter(result=>(result.checks as Record<string,boolean>).expected_job_fit).length,job_fit_cases_completed:scoreChecks.length,persisted_citations_grounded:citations.filter(item=>item.citation_grounded===true).length,persisted_citation_count:citations.length,processing_recovery_cases:recoveryChecks.length,processing_recoveries_succeeded:recoveryChecks.filter(result=>(result.checks as Record<string,boolean>).retry_recovered).length,median_processing_attempt_ms:medianLatency,token_usage_captured:tokenUsages.length,model_total_tokens:tokenUsages.reduce((sum,usage)=>sum+(usage.total_tokens||0),0)||null,observed_billing_usd:null,human_review_time:'pending: automated synthetic evaluation only'},notes:'Synthetic inputs only. T08 checks unreadable-document handling without AI. T09 checks duplicate intake before one AI processing pass. T12 checks failure persistence and retry after restoring the CV. Job Fit expectations are the frozen independent values from evaluation/job-fit-cases.json.',results};
  fs.writeFileSync(resultsPath,JSON.stringify(report,null,2));
  const rows=results.map(result=>{
    const brief=result.actual_brief as {fit:{percent:number|null}}|null;
    const expected=result.expected_percent===null?'No score until recovery':`${result.expected_percent}%`;
    const actual=brief?.fit.percent===null||brief?.fit.percent===undefined?'Pending':`${brief.fit.percent}%`;
    const failedChecks=Object.entries(result.checks as Record<string,boolean>).filter(([,value])=>!value).map(([key])=>key).join(', ')||'all passed';
    return `| ${result.case_id} | ${expected} | ${actual} | ${result.initial_status||'not run'}${result.initial_score_pending?' (score pending)':''} | ${result.retry_status||'not needed'} | ${result.status} | ${failedChecks} |`;
  }).join('\n');
  fs.writeFileSync(reportPath,`# Full CV processing pipeline evaluation\n\nRun: ${report.run_at}. Provider: ${report.provider} (${report.model}). Status: ${report.run_status}.\n\n${passed} passed, ${failed} failed, ${blocked} blocked of ${results.length}. This live suite runs synthetic CV PDFs through intake, private storage, extraction, Nemotron analysis where applicable, citation validation, persistence, the production scorer, and recruiter-facing candidate briefing. T08 exercises unreadable-document handling without AI. T09 checks duplicate intake. T12 checks recoverable processing failure.\n\n## Quality and operational measures\n\nExpected evidence-status agreement: ${report.metrics.semantic_status_matches}/${report.metrics.semantic_cases_completed} completed scoring cases. Expected Job Fit score agreement: ${report.metrics.job_fit_score_matches}/${report.metrics.job_fit_cases_completed} completed cases. Persisted citations grounded in extracted CV text: ${report.metrics.persisted_citations_grounded}/${report.metrics.persisted_citation_count}. Processing failures recovered after document restoration: ${report.metrics.processing_recoveries_succeeded}/${report.metrics.processing_recovery_cases}. Median recorded processing-attempt duration: ${medianLatency===null?'pending':`${medianLatency} ms`}. Model token usage: ${report.metrics.model_total_tokens??'pending'} across ${report.metrics.token_usage_captured}/${results.length} cases where usage metadata was returned. Observed billing cost: pending. Human review/correction time: pending; this was an automated synthetic run. Processing latency is not recruiter handling time.\n\n| Case | Expected score | Actual score | Initial status | Retry status | Result | Failed checks |\n|---|---:|---:|---|---|---|---|\n${rows}\n`);
  expect(results).toHaveLength(cases.length);
  expect(failed,`${failed} full-flow cases failed; see ${reportPath}`).toBe(0);
},900000);
