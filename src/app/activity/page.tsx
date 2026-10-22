import Link from 'next/link';
import {requireRecruiter} from '@/lib/auth';
import {adminDb} from '@/lib/supabase';

const eventLabels:Record<string,string>={application_received:'Application received',application_processing:'CV analysis started',application_processed:'CV analysis completed',application_failed:'CV analysis needs attention',candidate_contact_corrected:'Applicant details corrected',profile_corrected:'Extracted profile corrected',evidence_reviewed:'Evidence reviewed',review_action:'Next action recorded',google_response_received:'Google Form response received',google_response_synced:'Google Form response imported'};
const stageLabels:Record<string,string>={extract:'Read CV',extract_text:'Read CV',normalize:'Prepare applicant profile',evidence:'Find criterion evidence',ai:'Analyze CV',process:'Analyze application'};
function when(value:string){return new Date(value).toLocaleString('en-NG',{dateStyle:'medium',timeStyle:'short'});}

export default async function Activity(){
  await requireRecruiter();const db=adminDb();
  const [attemptResult,eventResult]=await Promise.all([
    db.from('processing_attempts').select('id,application_id,stage,outcome,error_category,created_at').order('created_at',{ascending:false}).limit(30),
    db.from('workflow_events').select('id,application_id,event_type,created_at').order('created_at',{ascending:false}).limit(50),
  ]);
  if(attemptResult.error||eventResult.error)throw new Error('Could not load activity');
  const attempts=attemptResult.data||[];const events=eventResult.data||[];
  return <div className="page-stack"><div className="page-heading"><div><span className="eyebrow">Workspace / History</span><h1>Activity</h1><p>See what happened to applications and where your team may need to step in.</p></div><Link className="button-secondary inline-button" href="/applications">View applications</Link></div>
    <div className="detail-grid"><section className="card section-card"><div className="section-heading"><div><h2>Recent changes</h2><p>Imports, analysis, and reviewer actions.</p></div></div>{events.length?<div className="timeline">{events.map(event=><div className="timeline-item" key={event.id}><strong>{eventLabels[event.event_type]||event.event_type.replaceAll('_',' ')}</strong><small>{when(event.created_at)}</small>{event.application_id&&<Link href={`/applications/${event.application_id}`}>Open application</Link>}</div>)}</div>:<p className="empty-compact">No activity has been recorded yet.</p>}</section>
      <section className="card section-card"><div className="section-heading"><div><h2>CV processing</h2><p>Completed steps and issues that need review.</p></div></div>{attempts.length?<div className="timeline">{attempts.map(attempt=><div className="timeline-item" key={attempt.id}><strong>{stageLabels[attempt.stage]||'CV analysis'}</strong><span className={`badge ${attempt.outcome==='success'?'badge-success':'badge-warning'}`}>{attempt.outcome==='success'?'Completed':'Needs attention'}</span>{attempt.error_category&&<p className="field-help">Issue: {attempt.error_category.replaceAll('_',' ')}</p>}<small>{when(attempt.created_at)}</small><Link href={`/applications/${attempt.application_id}`}>Review application</Link></div>)}</div>:<p className="empty-compact">No CV processing attempts yet.</p>}</section></div>
  </div>;
}
