import {it,expect} from 'vitest';
import fs from 'node:fs';
import {analyzeWithNvidia} from './nvidia';

type Case={case_id:string;scenario:string;source:string;criterion_id:string;expected_status:string;expected_excerpt:string|null;expected_location?:string;applicability:{semantic:boolean}};

it.skipIf(process.env.RUN_NVIDIA_EVAL!=='1')('records an independent synthetic Nemotron evaluation',async()=>{
  for(const line of fs.readFileSync('.env.local','utf8').split(/\r?\n/)){const i=line.indexOf('=');if(i>0&&line.slice(i+1))process.env[line.slice(0,i)]=line.slice(i+1);}
  const cases:Case[]=JSON.parse(fs.readFileSync('evaluation/cases/cases.json','utf8'));
  const results=[];
  for(const item of cases.filter(c=>c.applicability.semantic&&c.source)){
    const start=performance.now();
    try{
      const result=await analyzeWithNvidia(item.source,[{id:item.criterion_id,label:'TypeScript',kind:'required'}]);
      const evidence=result.output.evidence[0];
      results.push({case_id:item.case_id,scenario:item.scenario,expected_status:item.expected_status,actual_status:evidence.status,status_match:evidence.status===item.expected_status,expected_excerpt:item.expected_excerpt,actual_excerpt:evidence.excerpt,location:evidence.location,quote_grounded:!evidence.excerpt||item.source.replace(/\s+/g,' ').includes(evidence.excerpt.replace(/\s+/g,' ')),profile:result.output.profile,usage:result.usage,model:result.model,latency_ms:Math.round(performance.now()-start),error:null});
    }catch(error){results.push({case_id:item.case_id,scenario:item.scenario,expected_status:item.expected_status,actual_status:null,status_match:false,expected_excerpt:item.expected_excerpt,actual_excerpt:null,location:null,quote_grounded:null,profile:null,usage:null,model:process.env.NVIDIA_MODEL||'nvidia/nemotron-3.5-lightning-30b-a3b',latency_ms:Math.round(performance.now()-start),error:error instanceof Error?error.message:'Unknown error'});}
  }
  const complete=results.filter(r=>!r.error);const cited=complete.filter(r=>r.actual_excerpt);const summary={run_at:new Date().toISOString(),provider:'nvidia',model:process.env.NVIDIA_MODEL||'nvidia/nemotron-3.5-lightning-30b-a3b',synthetic_cases:results.length,completed:complete.length,errors:results.length-complete.length,status_matches:results.filter(r=>r.status_match).length,grounded_citations:cited.filter(r=>r.quote_grounded).length,citations:cited.length,baseline:'pending',human_correction:'pending',cost_usd:null,cost_note:'NVIDIA free development endpoint; no observed billing amount'};
  fs.writeFileSync('evaluation/nvidia-results.json',JSON.stringify({summary,results},null,2));
  fs.writeFileSync('evaluation/nvidia-report.md',`# NVIDIA Nemotron synthetic evaluation\n\nRun: ${summary.run_at}. Model: ${summary.model}. These results do not verify Gemini, Google Forms, or human time savings.\n\n${summary.completed}/${summary.synthetic_cases} calls completed; ${summary.status_matches}/${summary.synthetic_cases} status labels matched; ${summary.grounded_citations}/${summary.citations} returned citations were exact source excerpts. Baseline, human correction, and observed billing are pending.\n\n| Case | Expected | Actual | Match | Error |\n|---|---|---|---|---|\n${results.map(r=>`| ${r.case_id} | ${r.expected_status} | ${r.actual_status||'error'} | ${r.status_match?'yes':'no'} | ${r.error||''} |`).join('\n')}\n`);
  expect(results).toHaveLength(cases.filter(c=>c.applicability.semantic&&c.source).length);
},600000);
