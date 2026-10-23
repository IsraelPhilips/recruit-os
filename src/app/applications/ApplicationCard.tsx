import Link from 'next/link';
import type {candidateBrief} from '@/lib/profile-grounding';

type Brief=ReturnType<typeof candidateBrief>;
const statusNames:Record<string,string>={received:'Received',processing:'Analyzing',ready:'Ready for review',manual_review:'Needs details',failed:'Processing issue'};

function Coverage({label,documented,total,percent}:{label:string;documented:number;total:number;percent:number|null}){
  return <div className="coverage-stat"><span>{label}</span><strong>{percent===null?'Pending':`${percent}%`}</strong><small>{total?`${documented} of ${total} documented`:'No criteria set'}</small></div>;
}

export function ApplicationCard({id,name,email,job,date,processStatus,reviewStatus,brief,model}:{id:string;name:string;email:string;job:string;date:string;processStatus:string;reviewStatus:string;brief:Brief;model:string|null}){
  const summary=brief.summary;
  return <article className="card pipeline-card"><div className="pipeline-card-head"><div><span className="eyebrow">{job}</span><h3><Link href={`/applications/${id}`}>{name||'Name needs review'}</Link></h3><p>{email||'Email needs review'} · Submitted {new Date(date).toLocaleDateString('en-NG',{dateStyle:'medium'})}</p></div><div className="pipeline-status"><span className={`badge ${processStatus==='ready'?'badge-success':processStatus==='failed'?'badge-warning':'badge-muted'}`}>{statusNames[processStatus]||processStatus}</span><span className="badge badge-muted">{reviewStatus==='reviewed'?'Reviewed':reviewStatus==='in_review'?'In review':'Awaiting review'}</span></div></div>
    <div className="coverage-strip" aria-label="Requirements Evidence Match"><Coverage label="Requirements Evidence Match" documented={summary.documented.length} total={summary.total} percent={summary.percent}/><Coverage label="Required" {...summary.required}/><Coverage label="Preferred" {...summary.preferred}/></div><p className="coverage-explainer">Evidence coverage from verified CV excerpts, not candidate suitability.</p>
    <div className="pipeline-brief"><div><span className="eyebrow">AI-assisted candidate brief</span><p>{brief.experience.length?brief.experience[0]:'No source-backed experience line was extracted yet.'}</p><small>{model?`Extraction: ${model}`:'Analysis pending'}{brief.reviewerCorrected?' · Profile corrected by recruiter':''}</small></div><div className="pipeline-brief-facts"><p><strong>Documented:</strong> {brief.strengths.length?brief.strengths.join(', '):'No complete criterion excerpt yet'}</p><p><strong>Clarify:</strong> {brief.gaps.length?brief.gaps.join(', '):'No criterion gap flagged'}</p>{brief.uncertainties.length>0&&<p className="brief-uncertainty"><strong>Check:</strong> {brief.uncertainties[0]}</p>}</div></div>
    <div className="pipeline-card-actions"><span className="field-help">Next step: {brief.nextStep}</span><Link className="button-secondary inline-button" href={`/applications/${id}`}>Review application</Link><Link href={`/applications/${id}#email`}>Draft email</Link></div>
  </article>;
}
