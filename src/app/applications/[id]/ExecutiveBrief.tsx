import type {candidateBrief} from '@/lib/profile-grounding';
import {JobFitBreakdown,JobFitDisplay} from '../JobFitDisplay';

type Brief=ReturnType<typeof candidateBrief>;

export function ExecutiveBrief({brief,model}:{brief:Brief;model:string|null}){
  const fit=brief.fit;
  return <section className="card section-card executive-brief"><div className="section-heading"><div><span className="eyebrow">Executive summary</span><h2>Candidate review</h2><p>Source-checked CV evidence and recruiter corrections for this role.</p></div></div>
    <div className="job-fit-detail"><JobFitDisplay fit={fit}/><div className="job-fit-secondary"><div><strong>{fit.available?`${fit.required.met}/${fit.required.total}`:'Pending'}</strong><span>Required criteria documented</span></div><div><strong>{fit.available?`${fit.preferred.met}/${fit.preferred.total}`:'Pending'}</strong><span>Preferred criteria documented</span></div><div><strong>{fit.gapCount===null?'Pending':fit.gapCount}</strong><span>Evidence gaps or partials</span></div></div></div>
    <p className="coverage-explainer">Job Fit Match is a weighted match to approved requirements in the available CV. It supports screening and does not decide interview or rejection outcomes.</p>
    <div className="executive-grid"><div><h3>Relevant experience</h3>{brief.experience.length?<ul>{brief.experience.map((item,index)=><li key={index}>{item}</li>)}</ul>:<p>No source-backed experience line was extracted yet.</p>}<h3>Strongest documented qualifications</h3>{brief.strengths.length?<p>{brief.strengths.join(', ')}</p>:<p>No criterion has a complete source excerpt yet.</p>}</div><div><h3>Critical gaps and uncertainty</h3>{!fit.available?<p>Criteria evidence is pending.</p>:fit.criticalGaps.length?<p>{fit.criticalGaps.slice(0,3).join(', ')}</p>:<p>No required criterion gap is flagged.</p>}{brief.uncertainties.length?<ul>{brief.uncertainties.map((item,index)=><li key={index}>{item}</li>)}</ul>:<p>No form-to-CV discrepancy flagged.</p>}</div></div>
    <div className="review-advice"><strong>Suggested human next step</strong><p>{brief.nextStep}</p></div><JobFitBreakdown fit={fit}/>
    <p className="field-help">{model?`Analysis provider: ${model}. `:''}{brief.reviewerCorrected?'Profile has recruiter corrections. ':brief.derivedFields.length?`Source-derived fields filled: ${brief.derivedFields.join(', ')}. `:''}Missing evidence does not establish missing ability.</p>
  </section>;
}
