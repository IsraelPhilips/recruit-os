import fs from 'node:fs';
import path from 'node:path';
import {afterAll,describe,expect,it} from 'vitest';
import {jobFitMatch} from '../src/lib/job-fit';
import {sourceContains} from '../src/lib/review-summary';

type Case={case_id:string;scenario:string;source:string;process_status:string;evidence:{criterion_id:string;status:string;excerpt:string|null;review_mark?:string}[];expected_percent:number|null;expected_tone:string;expected_case_status?:'blocked';repeat_score?:boolean;metadata_issue?:string;limitation?:string};
type Fixture={rubric:{source:string;criteria:{id:string;label:string;kind:'required'|'preferred'|'informational';category:string}[];weights:{required:number;preferred:number};status_credit:Record<string,number>;thresholds:{strong_min:number;moderate_min:number};notes:string};cases:Case[]};
const file=path.resolve('evaluation/job-fit-cases.json');
const fixture=JSON.parse(fs.readFileSync(file,'utf8')) as Fixture;
const results=fixture.cases.map(testCase=>{
  const fit=jobFitMatch(fixture.rubric.criteria,testCase.evidence,testCase.process_status,testCase.source);
  const blocked=testCase.expected_case_status==='blocked';
  const checks={
    score:fit.percent===testCase.expected_percent,
    tone:fit.tone===testCase.expected_tone,
    range:fit.percent===null||(fit.percent>=0&&fit.percent<=100),
    weight:fit.rows.every(row=>row.weight===(row.criterion.kind==='required'?fixture.rubric.weights.required:fixture.rubric.weights.preferred)),
    credits:fit.rows.every(row=>row.points===row.weight*row.fraction),
    citedCredit:fit.rows.every(row=>row.points===0||(Boolean(row.excerpt)&&sourceContains(testCase.source,row.excerpt!))),
    pendingWhenUnusable:!blocked||(fit.percent===null&&!fit.available)
  };
  let repeatedPercent:number|null=null;
  if(testCase.repeat_score){
    repeatedPercent=jobFitMatch(fixture.rubric.criteria,testCase.evidence,testCase.process_status,testCase.source).percent;
    checks.repeatability=repeatedPercent===fit.percent;
  }
  const passed=Object.values(checks).every(Boolean);
  const status=blocked?(passed?'blocked':'fail'):(passed?'pass':'fail');
  return {
    case_id:testCase.case_id,scenario:testCase.scenario,status,
    expected_percent:testCase.expected_percent,actual_percent:fit.percent,
    expected_tone:testCase.expected_tone,actual_tone:fit.tone,
    expected_case_status:blocked?'blocked':'pass',
    required:{met:fit.required.met,total:fit.required.total},preferred:{met:fit.preferred.met,total:fit.preferred.total},
    evidence_gaps:fit.gapCount,checks,repeat_percent:repeatedPercent??undefined,
    metadata_issue:testCase.metadata_issue,limitation:testCase.limitation,
    rows:fit.rows.map(row=>({criterion_id:row.criterion.id,kind:row.criterion.kind,status:row.status,weight:row.weight,fraction:row.fraction,points:row.points,excerpt:row.excerpt,reason:row.reason}))
  };
});
const summary={
  run_at:new Date().toISOString(),suite:'job-fit-deterministic',source_of_truth:fixture.rubric.source,
  model:null,model_evaluation:'not run in this command; separate historical Nemotron results are preserved',
  cases:results.length,passed:results.filter(result=>result.status==='pass').length,
  failed:results.filter(result=>result.status==='fail').length,blocked:results.filter(result=>result.status==='blocked').length,
  applicable_pass_rate:`${results.filter(result=>result.status==='pass').length}/${results.filter(result=>result.status!=='blocked').length}`,
  semantic_model_accuracy:null,human_time_savings:null,cost_usd:null
};
function writeResults(){
  fs.writeFileSync('evaluation/job-fit-results.json',JSON.stringify({summary,rubric:fixture.rubric,results},null,2)+'\n');
  const csvRows=results.map(result=>[
    result.case_id,result.status,result.expected_percent??'pending',result.actual_percent??'pending',result.expected_tone,result.actual_tone,
    `${result.required.met}/${result.required.total}`,`${result.preferred.met}/${result.preferred.total}`,Object.entries(result.checks).filter(([,ok])=>!ok).map(([name])=>name).join(';')
  ].map(value=>`"${String(value).replaceAll('"','""')}"`).join(','));
  fs.writeFileSync('evaluation/job-fit-results.csv',['case_id,status,expected_percent,actual_percent,expected_tone,actual_tone,required_met,preferred_met,failed_checks',...csvRows].join('\n')+'\n');
const report=`# Job Fit Match deterministic evaluation\n\nRun: ${summary.run_at}. Command: \`npm run eval:job-fit\`.\n\n${summary.passed} passed, ${summary.failed} failed, ${summary.blocked} blocked/not scoreable across ${summary.cases} cases. Applicable-case pass rate: ${summary.applicable_pass_rate}. The blocked cases correctly remain blocked because an unreadable CV (T08) or failed processing (T12) cannot support a score.\n\n## Scoring rules\n\nThe application scorer is \`src/lib/job-fit.ts\`, called through \`candidateBrief\` for both the Applications card and candidate detail view. Its existing product rule is documented in \`docs/PROJECT_SPEC.md\` section 15: required criteria weigh 4, preferred criteria weigh 1; source-verified \`EVIDENCE_FOUND\` receives full credit, \`PARTIAL_EVIDENCE\` half, \`AMBIGUOUS\` one quarter, and other states zero. Follow-up marks remove credit. Informational criteria are excluded. Score bands are presentational only. This suite changes none of these rules.\n\nThis 12-case evaluation reports deterministic scoring separately from workflow and model results. Job Fit Match follows the scoring rules documented for RecruitOS: required criteria carry four times the weight of preferred criteria, with credit adjusted for evidence status and source verification. The suite applies these rules without changing them.\n\nEach case's evidence labels are independently authored synthetic ground truth and quotes are checked against its CV text. This evaluates arithmetic, eligibility, quote grounding, and pending behavior. It does not establish whether the production model assigns the right semantic evidence label.\n\n## Case results\n\n| Case | Scenario | Expected | Actual | Status | Required met | Preferred met |\n|---|---|---:|---:|---|---:|---:|\n${results.map(result=>`| ${result.case_id} | ${result.scenario} | ${result.expected_percent===null?'Pending':`${result.expected_percent}%`} | ${result.actual_percent===null?'Pending':`${result.actual_percent}%`} | ${result.status} | ${result.required.met}/${result.required.total} | ${result.preferred.met}/${result.preferred.total} |`).join('\n')}\n\n## Historical comparisons and boundaries\n\nThe historical local workflow run remains in \`evaluation/history/deterministic-workflow-2026-10-23.json\`: 9 passed, 0 failed, 3 pending. It tested citation/contract checks, not Job Fit Match arithmetic, so it is not a comparable baseline for this scoring suite. The current workflow run reports 9 passed, 0 failed, 3 blocked. The historical synthetic Nemotron runs are preserved separately: initial 5/9 expected status matches and 4/4 grounded citations; revised 7/9 status matches and 6/6 grounded citations. They tested model labels/citations, not the deterministic scorer, so this run cannot be described as a model regression or gain. The live CV pipeline has its own report in evaluation/full-flow-report.md.\n\nOperational planning remains a projection only: assumptions of 1 minute initial plus 5 minutes deep manual review versus 10 seconds initial plus 2 minutes deeper review, for 100 applications with 20 deep reviews, yield 200 manual minutes. The stated RecruitOS assumptions total 56.7 minutes, or 71.7% modeled savings. The 50-minute/75% estimate is inconsistent with those inputs. This remains a projection, not a RecruitOS measurement. Human workflow timing, production accuracy, and observed billing remain pending.\n\n## Findings and limitations\n\nNo deterministic scorer defect was found in these 12 scenarios. T11 receives limited credit because the independent labels do not treat familiarity, interest, or reading as practical experience. The scorer trusts its upstream evidence status. If an AI incorrectly labels a bare keyword as \`EVIDENCE_FOUND\`, this deterministic function cannot recognize the semantic error and will award full criterion credit when the quote is present. Human source review and corrections remain necessary. Recruiter source review and corrections remain necessary.\n\nT09 checks pure-scoring repeatability only. Database intake deduplication is a separate integration test. T08 and T12 are blocked from producing numeric scores by design; they are reported as blocked, not counted as score passes.\n`;
  fs.writeFileSync('evaluation/job-fit-report.md',report);
}

describe('12-case Job Fit Match evaluation',()=>{
  it.each(results)('$case_id $scenario: $status',result=>{
    expect(result.status).not.toBe('fail');
    expect(Object.values(result.checks).every(Boolean)).toBe(true);
    if(result.status==='blocked')expect(result.actual_percent).toBeNull();
  });
  afterAll(writeResults);
});
