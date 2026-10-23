import type {jobFitMatch} from '@/lib/job-fit';

type Fit=ReturnType<typeof jobFitMatch>;

export function JobFitDisplay({fit,compact=false}:{fit:Fit;compact?:boolean}){
  return <div className={`job-fit-display job-fit-${fit.tone} ${compact?'job-fit-compact':''}`}>
    <span className="job-fit-label">Job Fit Match</span>
    <strong className="job-fit-number">{fit.percent===null?'Pending':`${fit.percent}%`}</strong>
    <div className="job-fit-track" role="progressbar" aria-label="Job Fit Match from documented CV evidence" aria-valuemin={0} aria-valuemax={100} aria-valuenow={fit.percent===null?undefined:fit.percent} aria-valuetext={fit.percent===null?'Pending analysis':`${fit.percent}% documented job match`}><span style={{width:`${fit.percent||0}%`}}/></div>
    <small>{fit.percent===null?'Waiting for source-backed analysis':fit.tone==='strong'?'Strong documented match':fit.tone==='moderate'?'Moderate documented match':'Limited documented match'}</small>
  </div>;
}

export function JobFitBreakdown({fit}:{fit:Fit}){
  return <details className="job-fit-breakdown"><summary>How Job Fit Match is calculated</summary><p>Each required criterion has 4 points and each preferred criterion has 1. A verified complete excerpt earns 100% of its points, partial evidence 50%, ambiguous evidence 25%, and missing or unverified evidence 0%. A reviewer follow-up mark earns 0 until resolved. Experience and achievements count when they are explicit job criteria. This score describes the available CV evidence and is not a hiring decision.</p>{fit.available?<div className="job-fit-breakdown-list">{fit.rows.map(row=><div className="job-fit-breakdown-row" key={row.criterion.id}><div><strong>{row.criterion.label}</strong><small>{row.criterion.kind} · {row.criterion.category||'general'} · {row.reason}</small>{row.excerpt&&<blockquote>“{row.excerpt}”</blockquote>}</div><span>{row.points} / {row.weight} pts</span></div>)}</div>:<p>Criterion scoring is pending the extracted CV and evidence analysis.</p>}</details>;
}
