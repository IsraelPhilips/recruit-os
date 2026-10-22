import Link from 'next/link';
import {requireRecruiter} from '@/lib/auth';
import {adminDb} from '@/lib/supabase';

const cards=[{key:'received',label:'Received',hint:'Waiting for analysis'},{key:'processing',label:'Analyzing',hint:'CV extraction in progress'},{key:'ready',label:'Ready to review',hint:'Evidence available'},{key:'manual_review',label:'Needs details',hint:'A person should check this'},{key:'failed',label:'Processing issues',hint:'Retry or inspect the error'}];
const names:Record<string,string>={received:'Received',processing:'Analyzing',ready:'Ready for review',manual_review:'Needs details',failed:'Processing issue'};
export default async function Home(){
  await requireRecruiter();const db=adminDb();
  const [appsResult,issuesResult,jobsResult,formsResult]=await Promise.all([
    db.from('applications').select('id,process_status,review_status,created_at,candidate,jobs(title)').order('created_at',{ascending:false}).limit(100),
    db.from('google_sync_failures').select('id',{count:'exact',head:true}).is('resolved_at',null),
    db.from('jobs').select('id',{count:'exact',head:true}),
    db.from('google_forms').select('id',{count:'exact',head:true}),
  ]);
  const applications=appsResult.data||[];const issues=issuesResult.count||0;
  return <div className="page-stack"><div className="page-heading"><div><span className="eyebrow">Recruiter workspace</span><h1>Good to see you.</h1><p>Track each application from Form submission to a source-grounded human review.</p></div><Link className="inline-button" href="/applications">View applications</Link></div>
    {issues>0&&<div className="notice notice-warning"><strong>{issues} {issues===1?'Form response needs':'Form responses need'} attention</strong><p>These responses have not become applications yet. Review the issue and retry import.</p><Link href="/applications">See what needs attention →</Link></div>}
    <section className="grid" aria-label="Application status counts">{cards.map(item=><Link href={`/applications?status=${item.key}`} className="card metric-card" key={item.key}><span className="metric">{applications.filter(app=>app.process_status===item.key).length}</span><strong>{item.label}</strong><small>{item.hint}</small></Link>)}</section>
    <div className="detail-grid"><section className="card section-card"><div className="section-heading"><div><h2>Recent applications</h2><p>Open a record to review its evidence and next action.</p></div><Link href="/applications">See all</Link></div>{applications.length===0?<div className="empty-state"><div className="empty-icon">◯</div><h3>Nothing in the pipeline yet</h3><p>{issues?'Resolve the Form response issue above to import the first application.':'Connect a Form and submit a synthetic test application.'}</p></div>:<div className="recent-list">{applications.slice(0,6).map(app=><Link href={`/applications/${app.id}`} className="recent-row" key={app.id}><div><strong>{app.candidate?.full_name||'Applicant details needed'}</strong><small>{(app.jobs as unknown as {title:string})?.title||'Role'}</small></div><span className={`badge ${app.process_status==='ready'?'badge-success':'badge-muted'}`}>{names[app.process_status]||app.process_status}</span></Link>)}</div>}</section><section className="card section-card"><h2>Workspace setup</h2><p>Complete these steps to run the full review flow.</p><div className="setup-checklist"><Link href="/jobs"><span className={jobsResult.count?'check-done':'check-open'}>{jobsResult.count?'✓':'1'}</span><span><strong>Create a job</strong><small>Define the evidence to look for.</small></span></Link><Link href="/google"><span className={formsResult.count?'check-done':'check-open'}>{formsResult.count?'✓':'2'}</span><span><strong>Connect a Google Form</strong><small>Map questions and monitor responses.</small></span></Link><Link href="/applications"><span className={applications.length?'check-done':'check-open'}>{applications.length?'✓':'3'}</span><span><strong>Review an application</strong><small>Check quotes and record a next action.</small></span></Link></div></section></div>
  </div>;
}
