import Link from 'next/link';
import type {candidateBrief} from '@/lib/profile-grounding';
import {JobFitDisplay} from './JobFitDisplay';

type Brief=ReturnType<typeof candidateBrief>;
const statusNames:Record<string,string>={received:'Received',processing:'Analyzing',ready:'Ready for review',manual_review:'Needs details',failed:'Processing issue'};

export function ApplicationCard({id,name,email,job,date,processStatus,reviewStatus,brief}:{id:string;name:string;email:string;job:string;date:string;processStatus:string;reviewStatus:string;brief:Brief}){
  const fit=brief.fit;
  const shortAction=fit.percent===null?'Review processing status':!email?'Confirm applicant email':fit.criticalGaps.length?`Clarify ${fit.criticalGaps[0]}`:'Verify cited evidence';
  return <article className="card pipeline-card"><div className="pipeline-card-main"><div className="pipeline-card-content"><div className="pipeline-card-head"><div><span className="eyebrow">{job}</span><h3><Link href={`/applications/${id}`}>{name||'Name needs review'}</Link></h3><p>{email||'Email needs review'} · {new Date(date).toLocaleDateString('en-NG',{dateStyle:'medium'})}</p></div><div className="pipeline-status"><span className={`badge ${processStatus==='ready'?'badge-success':processStatus==='failed'?'badge-warning':'badge-muted'}`}>{statusNames[processStatus]||processStatus}</span><span className="badge badge-muted">{reviewStatus==='reviewed'?'Reviewed':reviewStatus==='in_review'?'In review':'Awaiting review'}</span></div></div><p className="pipeline-summary">{brief.experience[0]||'Experience details need review in the CV.'}</p><div className="pipeline-highlights"><span><strong>Strengths:</strong> {brief.strengths.length?brief.strengths.slice(0,2).join(', '):'No complete criterion evidence yet'}</span><span><strong>Critical gaps:</strong> {!fit.available?'Pending analysis':fit.criticalGaps.length?fit.criticalGaps.slice(0,2).join(', '):'None flagged'}</span></div><p className="pipeline-next"><strong>Next review action:</strong> {shortAction}</p></div><JobFitDisplay fit={fit} compact/></div>
    <div className="pipeline-card-actions"><span className="field-help">{fit.available?`Required ${fit.required.met}/${fit.required.total} · Preferred ${fit.preferred.met}/${fit.preferred.total} · ${fit.gapCount} evidence gaps.`:'Criteria evidence pending.'} Score reflects documented CV evidence only.{brief.reviewerCorrected?' Recruiter corrections included.':''}</span><Link className="button-secondary inline-button" href={`/applications/${id}`}>Review application</Link></div>
  </article>;
}
