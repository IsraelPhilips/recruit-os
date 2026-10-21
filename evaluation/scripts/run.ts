import fs from 'node:fs';import path from 'node:path';
import {grounded,intakeSchema,validateDocument} from '../../src/lib/contracts.ts';
type Case={case_id:string;scenario:string;source:string;criterion_id:string;expected_status:string;expected_excerpt:string|null;expected_location?:string;check:string};
const cases:Case[]=JSON.parse(fs.readFileSync(path.join('evaluation','cases','cases.json'),'utf8'));
const results=cases.map(c=>{
  const start=performance.now(); let status:'pass'|'fail'|'pending'='pending';let detail='Live Gemini and persistence not configured';
  try {
    if(['grounding','location','no_quote','injection_quote'].includes(c.check)) {
      const proposed={profile:{full_name:null,email:null,phone:null,skills:[],history:[],warnings:[]},evidence:[{criterion_id:c.criterion_id,status:c.expected_status as 'EVIDENCE_FOUND',excerpt:c.expected_excerpt,location:'fabricated page',reasoning:'Synthetic test',question:null}]};
      const output=grounded(proposed,c.source,[{id:c.criterion_id,label:'TypeScript',kind:'required'}]);
      const item=output.evidence[0];
      status=item.status===c.expected_status && (c.check!=='location'||item.location===c.expected_location) && (c.expected_excerpt===null||c.source.replace(/\s+/g,' ').includes(c.expected_excerpt))?'pass':'fail';
      detail='Deterministic citation validation only; semantic classification supplied by fixture and not scored';
    } else if(c.check==='missing_email'){
      const candidate={form_id:'f',response_id:'r',job_reference:'j',submitted_at:'2026-10-21T12:00:00Z',candidate:{full_name:'Synthetic',email:'',phone:null,portfolio_url:null,cover_letter:null,consent:true},cv:{name:'x.pdf',mime_type:'application/pdf',content_base64:'YWJj'}};
      status=intakeSchema.safeParse(candidate).success?'pass':'fail';detail='Intake contract preserves missing email; database manual-review state remains unverified';
    } else if(c.check==='bad_pdf'){
      try{validateDocument({name:'x.pdf',mime_type:'application/pdf',content_base64:Buffer.from('not a pdf'.repeat(4)).toString('base64')});status='fail';}catch{status='pass';}detail='Document signature validation';
    } else {detail='Requires connected database or controlled model fault';}
  } catch(e){status='fail';detail=String(e);}
  return {case_id:c.case_id,scenario:c.scenario,check:c.check,status,detail,semantic_status:'pending',expected_status:c.expected_status,latency_ms:Math.round(performance.now()-start),model:null,cost_usd:null};
});
const summary={run_at:new Date().toISOString(),adapter:'deterministic-local',model:null,baseline:'pending',passed:results.filter(r=>r.status==='pass').length,failed:results.filter(r=>r.status==='fail').length,pending:results.filter(r=>r.status==='pending').length,semantic_accuracy:null,grounding_rate:null,cost_usd:null};
fs.writeFileSync('evaluation/results.json',JSON.stringify({summary,results},null,2));
fs.writeFileSync('evaluation/results.csv','case_id,check,status,semantic_status,latency_ms\n'+results.map(r=>`${r.case_id},${r.check},${r.status},${r.semantic_status},${r.latency_ms}`).join('\n')+'\n');
fs.writeFileSync('evaluation/report.md',`# Evaluation report\n\nRun at: ${summary.run_at}. Adapter: ${summary.adapter}.\n\nDeterministic local checks: ${summary.passed} pass, ${summary.failed} fail, ${summary.pending} pending out of 12. These are check outcomes, not full scenario success. This adapter does not measure model accuracy, human time, or cost. A separate NVIDIA model run is in evaluation/nvidia-report.md; the Supabase synthetic intake test and observed failures are documented in docs/day-4-evaluation.md. Gemini and live Google integration remain unverified.\n\n| Case | Check | Outcome |\n|---|---|---|\n${results.map(r=>`| ${r.case_id} | ${r.check} | ${r.status} |`).join('\n')}\n\nObserved failures and before/after results are documented in docs/day-4-evaluation.md.\n`);
console.log(summary);

