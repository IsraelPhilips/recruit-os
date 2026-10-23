import Link from 'next/link';
import {requireRecruiter} from '@/lib/auth';
import {adminDb} from '@/lib/supabase';
import {candidateBrief,type Profile} from '@/lib/profile-grounding';
import type {ReviewCriterion,ReviewEvidence} from '@/lib/review-summary';
import {ApplicationCard} from './ApplicationCard';

const statusNames:Record<string,string>={received:'Received',processing:'Analyzing',ready:'Ready for review',manual_review:'Needs details',failed:'Processing issue'};
function issueMessage(raw:string){if(raw.startsWith('[')||raw.includes('invalid_format'))return 'A Form answer did not match its mapped field. Review the Form field mapping.';if(raw.includes('Consent'))return 'The Form answer needs a review before importing.';if(raw.includes('CV'))return 'The CV upload needs attention. Check the file and Form question.';return raw;}

export default async function Applications({searchParams}:{searchParams:Promise<{q?:string;status?:string}>}){
  await requireRecruiter();const params=await searchParams;const db=adminDb();
  const [appsResult,issuesResult,formsResult]=await Promise.all([
    db.from('applications').select('id,candidate,criteria_snapshot,criteria_version,process_status,review_status,submitted_at,jobs(title)').order('created_at',{ascending:false}).limit(100),
    db.from('google_sync_failures').select('id,form_id,error_message,last_attempt_at').is('resolved_at',null).order('last_attempt_at',{ascending:false}).limit(50),
    db.from('google_forms').select('form_id,form_title'),
  ]);
  if(appsResult.error||issuesResult.error)throw new Error('Could not load applications');
  const ids=(appsResult.data||[]).map(item=>item.id);
  const [evidenceResult,profilesResult,documentsResult,correctionsResult]=ids.length?await Promise.all([
    db.from('evidence_items').select('application_id,criterion_id,criterion_version,status,excerpt,review_mark').in('application_id',ids),
    db.from('candidate_profiles').select('application_id,normalized,model').in('application_id',ids),
    db.from('documents').select('application_id,extracted_text').in('application_id',ids),
    db.from('workflow_events').select('application_id').in('application_id',ids).eq('event_type','profile_corrected'),
  ]):[{data:[],error:null},{data:[],error:null},{data:[],error:null},{data:[],error:null}];
  if(evidenceResult.error||profilesResult.error||documentsResult.error||correctionsResult.error)throw new Error('Could not load candidate briefs');
  const versionById=new Map((appsResult.data||[]).map(item=>[item.id,item.criteria_version]));
  const evidenceById=new Map<string,ReviewEvidence[]>();
  for(const item of evidenceResult.data||[]){if(item.criterion_version!==versionById.get(item.application_id))continue;const list=evidenceById.get(item.application_id)||[];list.push(item);evidenceById.set(item.application_id,list);}
  const profileById=new Map((profilesResult.data||[]).map(item=>[item.application_id,item]));
  const sourceById=new Map((documentsResult.data||[]).map(item=>[item.application_id,item.extracted_text||'']));
  const correctedIds=new Set((correctionsResult.data||[]).map(item=>item.application_id));
  const issueForms=new Map((formsResult.data||[]).map(item=>[item.form_id,item.form_title]));
  const q=(params.q||'').trim().toLowerCase(),status=params.status||'all';
  const applications=(appsResult.data||[]).filter(app=>(status==='all'||app.process_status===status)&&(!q||String(app.candidate?.full_name||'').toLowerCase().includes(q)||String(app.candidate?.email||'').toLowerCase().includes(q)||String((app.jobs as unknown as {title:string})?.title||'').toLowerCase().includes(q)));
  const issues=issuesResult.data||[];
  return <div className="page-stack"><div className="page-heading"><div><span className="eyebrow">Workspace / Pipeline</span><h1>Applications</h1><p>Scan grounded candidate briefs, then open a record to verify evidence and choose the next action.</p></div><span className="count-pill">{appsResult.data?.length||0} received</span></div>
    {issues.length>0&&<section className="card attention-card"><div className="section-heading"><div><span className="eyebrow">Needs attention</span><h2>{issues.length} {issues.length===1?'Form response is':'Form responses are'} waiting to import</h2><p>These Google Form responses have not reached Applications. Resolve the issue, then sync the Form again.</p></div><span className="badge badge-warning">Action needed</span></div><div className="issue-list">{issues.map(issue=><div className="issue-row" key={issue.id}><div><strong>{issueForms.get(issue.form_id)||'Google Form submission'}</strong><p>{issueMessage(issue.error_message)}</p><small>Last checked {new Date(issue.last_attempt_at).toLocaleString('en-NG',{dateStyle:'medium',timeStyle:'short'})}</small></div><Link className="button-secondary inline-button" href={`/google?form=${encodeURIComponent(issue.form_id)}#mapping`}>Review fields</Link></div>)}</div></section>}
    <section className="card section-card"><div className="section-heading"><div><h2>Candidate pipeline</h2><p>Evidence coverage describes the CV, not a person&apos;s suitability. Hiring decisions remain with your team.</p></div></div><form method="get" className="filter-bar"><label className="search-field">Search applicants<input name="q" defaultValue={params.q||''} placeholder="Name, email, or job"/></label><label>Status<select name="status" defaultValue={status}><option value="all">All statuses</option>{Object.entries(statusNames).map(([key,value])=><option key={key} value={key}>{value}</option>)}</select></label><button type="submit" className="button-secondary">Apply filters</button></form>
      {applications.length===0?<div className="empty-state"><div className="empty-icon">◯</div><h3>{q||status!=='all'?'No matching applications':'No applications imported yet'}</h3><p>{issues.length?'A Form response is waiting above. Review its issue, then sync the Form.':'Connect a Google Form or wait for a new submission to arrive.'}</p><Link className="button-secondary inline-button" href="/google">Open Google Forms</Link></div>:<div className="pipeline-list">{applications.map(app=>{const profile=profileById.get(app.id);const brief=candidateBrief((app.criteria_snapshot||[]) as ReviewCriterion[],evidenceById.get(app.id)||[],app.process_status,sourceById.get(app.id)||'',profile?.normalized as Profile||null,app.candidate||{},correctedIds.has(app.id));return <ApplicationCard key={app.id} id={app.id} name={app.candidate?.full_name||''} email={app.candidate?.email||''} job={(app.jobs as unknown as {title:string})?.title||'Role'} date={app.submitted_at} processStatus={app.process_status} reviewStatus={app.review_status} brief={brief} model={profile?.model||null}/>})}</div>}
    </section>
  </div>;
}
