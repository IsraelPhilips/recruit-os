import Link from 'next/link';
import {requireRecruiter} from '@/lib/auth';
import {adminDb} from '@/lib/supabase';

const statusNames:Record<string,string>={received:'Received',processing:'Analyzing',ready:'Ready for review',manual_review:'Needs details',failed:'Processing issue'};
function issueMessage(raw:string){if(raw.startsWith('[')||raw.includes('invalid_format'))return 'A Form answer did not match its mapped field. Review the Form field mapping.';if(raw.includes('Consent'))return 'The Form answer needs a review before importing.';if(raw.includes('CV'))return 'The CV upload needs attention. Check the file and Form question.';return raw;}

export default async function Applications({searchParams}:{searchParams:Promise<{q?:string;status?:string}>}){
  await requireRecruiter();const params=await searchParams;const db=adminDb();
  const [appsResult,issuesResult,formsResult]=await Promise.all([
    db.from('applications').select('id,candidate,process_status,review_status,submitted_at,jobs(title)').order('created_at',{ascending:false}).limit(100),
    db.from('google_sync_failures').select('id,form_id,error_message,retry_count,last_attempt_at').is('resolved_at',null).order('last_attempt_at',{ascending:false}).limit(50),
    db.from('google_forms').select('form_id,form_title'),
  ]);
  if(appsResult.error||issuesResult.error)throw new Error('Could not load applications');
  const issueForms=new Map((formsResult.data||[]).map(item=>[item.form_id,item.form_title]));
  const q=(params.q||'').trim().toLowerCase();const status=params.status||'all';
  const applications=(appsResult.data||[]).filter(app=>(status==='all'||app.process_status===status)&&(!q||String(app.candidate?.full_name||'').toLowerCase().includes(q)||String(app.candidate?.email||'').toLowerCase().includes(q)||String((app.jobs as unknown as {title:string})?.title||'').toLowerCase().includes(q)));
  const issues=issuesResult.data||[];
  return <div className="page-stack"><div className="page-heading"><div><span className="eyebrow">Workspace / Pipeline</span><h1>Applications</h1><p>Review submitted candidates and resolve any responses that could not be imported.</p></div><span className="count-pill">{appsResult.data?.length||0} received</span></div>
    {issues.length>0&&<section className="card attention-card"><div className="section-heading"><div><span className="eyebrow">Needs attention</span><h2>{issues.length} {issues.length===1?'Form response is':'Form responses are'} waiting to import</h2><p>These are Google Form responses, not yet applications. Once the issue is fixed, sync the Form again.</p></div><span className="badge badge-warning">Action needed</span></div><div className="issue-list">{issues.map(issue=><div className="issue-row" key={issue.id}><div><strong>{issueForms.get(issue.form_id)||'Google Form submission'}</strong><p>{issueMessage(issue.error_message)}</p><small>Last checked {new Date(issue.last_attempt_at).toLocaleString('en-NG',{dateStyle:'medium',timeStyle:'short'})}</small></div><Link className="button-secondary inline-button" href={`/google?form=${encodeURIComponent(issue.form_id)}#mapping`}>Review fields</Link></div>)}</div></section>}
    <section className="card section-card"><div className="section-heading"><div><h2>Candidate pipeline</h2><p>Hiring decisions and next actions remain with your team.</p></div></div><form method="get" className="filter-bar"><label className="search-field">Search applicants<input name="q" defaultValue={params.q||''} placeholder="Name, email, or job"/></label><label>Status<select name="status" defaultValue={status}><option value="all">All statuses</option>{Object.entries(statusNames).map(([key,value])=><option key={key} value={key}>{value}</option>)}</select></label><button type="submit" className="button-secondary">Apply filters</button></form>
      {applications.length===0?<div className="empty-state"><div className="empty-icon">◯</div><h3>{q||status!=='all'?'No matching applications':'No applications imported yet'}</h3><p>{issues.length?'A Form response is waiting above. Review its issue, then sync the Form.':'Connect a Google Form or wait for a new submission to arrive.'}</p><Link className="button-secondary inline-button" href="/google">Open Google Forms</Link></div>:<div className="table-wrap"><table><thead><tr><th>Applicant</th><th>Role</th><th>Submitted</th><th>Status</th><th>Human review</th></tr></thead><tbody>{applications.map(app=><tr key={app.id}><td><Link className="table-primary" href={`/applications/${app.id}`}>{app.candidate?.full_name||'Name needs review'}</Link><span className="table-secondary">{app.candidate?.email||'Email needs review'}</span></td><td>{(app.jobs as unknown as {title:string})?.title||'Role'}</td><td>{new Date(app.submitted_at).toLocaleDateString('en-NG',{dateStyle:'medium'})}</td><td><span className={`badge ${app.process_status==='ready'?'badge-success':app.process_status==='failed'?'badge-warning':'badge-muted'}`}>{statusNames[app.process_status]||app.process_status}</span></td><td>{app.review_status==='reviewed'?'Reviewed':'Awaiting review'}</td></tr>)}</tbody></table></div>}
    </section>
  </div>;
}
