import Link from 'next/link';
import {notFound} from 'next/navigation';
import {applicationInWorkspace,requireWorkspace} from '@/lib/auth';
import {adminDb} from '@/lib/supabase';
import {retry,saveAction,saveProfile} from '@/app/actions';
import {SubmitButton} from '@/app/components/SubmitButton';
import {candidateBrief,type Profile} from '@/lib/profile-grounding';
import type {ReviewCriterion} from '@/lib/review-summary';
import {suggestedApplicantEmail} from '@/lib/outbound';
import {CandidateCorrection} from './CandidateCorrection';
import {EvidenceHistory} from './EvidenceHistory';
import {EvidenceMatrix} from './EvidenceMatrix';
import {OutboundPanel} from './OutboundPanel';
import {MailToast} from './MailToast';
import {ExecutiveBrief} from './ExecutiveBrief';

const processNames:Record<string,string>={received:'Received',processing:'Analyzing',ready:'Ready for review',manual_review:'Needs details',failed:'Processing issue'};
const actionNames:Record<string,string>={request_clarification:'Clarification planned',schedule_review:'Internal review planned',hold_for_review:'Held for review',mark_review_complete:'Review completed'};
function readableDate(value:string){return new Date(value).toLocaleString('en-NG',{dateStyle:'medium',timeStyle:'short'});}

export default async function Detail({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{mail?:string}>}){
  const {user,workspaceId}=await requireWorkspace();const {id}=await params;const {mail}=await searchParams;const db=adminDb();
  if(!await applicationInWorkspace(db,id,workspaceId))notFound();
  const {data:application}=await db.from('applications').select('*,jobs(title)').eq('id',id).single();if(!application)notFound();
  const [profileResult,evidenceResult,actionsResult,eventsResult,documentResult,messagesResult,gmailResult,profileCorrectionResult]=await Promise.all([
    db.from('candidate_profiles').select('normalized,warnings,model').eq('application_id',id).maybeSingle(),
    db.from('evidence_items').select('*').eq('application_id',id).eq('criterion_version',application.criteria_version),
    db.from('review_actions').select('*').eq('application_id',id).order('created_at',{ascending:false}),
    db.from('workflow_events').select('id,event_type,created_at').eq('application_id',id).order('created_at',{ascending:false}).limit(25),
    db.from('documents').select('id,mime_type,extraction_status,extracted_text').eq('application_id',id).maybeSingle(),
    db.from('outbound_messages').select('id,message_type,human_outcome,recipient,subject,body,status,created_at,send_started_at,sent_at,gmail_message_id,error_category').eq('application_id',id).order('created_at',{ascending:false}).limit(15),
    db.from('gmail_connections').select('email,token_error').eq('recruiter_id',user.id).maybeSingle(),
    db.from('workflow_events').select('id').eq('application_id',id).eq('event_type','profile_corrected').limit(1).maybeSingle(),
  ]);
  if(evidenceResult.error||profileResult.error||documentResult.error||messagesResult.error)throw new Error('Could not load candidate review');
  const criteria=(application.criteria_snapshot as ReviewCriterion[])||[];
  const evidence=evidenceResult.data||[],actions=actionsResult.data||[],events=eventsResult.data||[],document=documentResult.data;
  const source=document?.extracted_text||'';
  const brief=candidateBrief(criteria,evidence,application.process_status,source,profileResult.data?.normalized as Profile||null,application.candidate||{},Boolean(profileCorrectionResult.data));
  const profile=brief.profile;
  const job=(application.jobs as {title:string})?.title||'the role';
  const suggestion=suggestedApplicantEmail(brief.fit,application.candidate?.full_name||'Applicant',job);
  return <div className="page-stack"><MailToast status={mail}/><div><Link href="/applications" className="eyebrow">← Back to applications</Link><div className="page-heading"><div><h1>{application.candidate?.full_name||'Applicant details needed'}</h1><p>{job} · Submitted {readableDate(application.submitted_at)}</p></div><div className="review-status-group"><span className={`badge ${application.process_status==='ready'?'badge-success':application.process_status==='failed'?'badge-warning':'badge-muted'}`}>{processNames[application.process_status]||application.process_status}</span><span className="badge badge-muted">Human review: {application.review_status.replaceAll('_',' ')}</span>{messagesResult.data?.some(message=>message.status==='sent'&&message.message_type==='rejection')&&<span className="badge badge-warning">Reviewer declined</span>}</div></div></div>
    {application.error_message&&<div className="notice notice-warning" role="alert"><strong>Analysis needs attention</strong><p>{application.error_message}</p></div>}
    {(['received','failed'].includes(application.process_status)||(application.process_status==='manual_review'&&!profile))&&application.attempt_count<3&&<form action={retry} className="inline-actions"><input type="hidden" name="id" value={id}/><SubmitButton pendingText="Analyzing CV...">{application.attempt_count?'Retry CV analysis':'Analyze CV now'}</SubmitButton><span className="field-help">The result will show source excerpts for human review.</span></form>}
    <ExecutiveBrief brief={brief} model={profileResult.data?.model||null}/>
    <section id="human-actions"><div className="section-heading"><div><span className="eyebrow">Human control</span><h2>Review and next actions</h2><p>Record an internal step or edit an applicant email. Sending requires separate approval.</p></div></div><div className="quick-review-grid"><section className="card section-card quick-action-card"><h3>Internal next action</h3><form action={saveAction} className="form-stack"><input type="hidden" name="application_id" value={id}/><label>Choose action<select name="action_type"><option value="request_clarification">Request clarification</option><option value="schedule_review">Schedule internal review</option><option value="hold_for_review">Hold for review</option><option value="mark_review_complete">Mark review complete</option></select></label><details><summary>Add a note</summary><label>Notes<textarea name="notes" rows={2} placeholder="Optional team note"/></label></details><SubmitButton pendingText="Recording...">Record action</SubmitButton></form>{actions[0]&&<p className="field-help">Latest: {actionNames[actions[0].action_type]||actions[0].action_type} · {readableDate(actions[0].created_at)}</p>}</section><OutboundPanel applicationId={id} name={application.candidate?.full_name||'Applicant'} job={job} email={application.candidate?.email||''} sender={gmailResult.data?.token_error?null:gmailResult.data?.email||null} messages={(messagesResult.data||[]) as Parameters<typeof OutboundPanel>[0]['messages']} notice={mail} suggestion={suggestion}/></div></section>
    <EvidenceMatrix applicationId={id} criteria={criteria} evidence={evidence} source={source}/>
    <div className="detail-grid"><CandidateCorrection id={id} candidate={application.candidate||{}}/><section className="card section-card"><div className="section-heading"><div><h2>Profile from CV</h2><p>{brief.reviewerCorrected?'Recruiter-corrected profile.':'Source-backed fields from the extracted CV.'}</p></div></div>{profile?<><dl className="profile-list"><div><dt>Name in CV</dt><dd>{profile.full_name||'Not found'}</dd></div><div><dt>Email in CV</dt><dd>{profile.email||'Not found'}</dd></div><div><dt>Phone in CV</dt><dd>{profile.phone||'Not found'}</dd></div><div><dt>Skills mentioned</dt><dd>{profile.skills.length?profile.skills.join(', '):'None extracted'}</dd></div><div><dt>Experience and education</dt><dd>{profile.history.length?<ul>{profile.history.map((item,index)=><li key={index}>{item}</li>)}</ul>:'None extracted'}</dd></div></dl>{brief.discrepancies.length>0&&<div className="notice notice-warning"><strong>Form and CV differ</strong><ul>{brief.discrepancies.map((item,index)=><li key={index}>{item}</li>)}</ul></div>}{profile.warnings.length>0&&<div className="notice notice-warning"><strong>Items to check</strong><ul>{profile.warnings.map((item,index)=><li key={index}>{item}</li>)}</ul></div>}<details><summary>Edit extracted profile</summary><form action={saveProfile} className="form-stack"><input type="hidden" name="application_id" value={id}/><label>Name<input name="full_name" defaultValue={profile.full_name||''}/></label><div className="form-grid"><label>Email<input name="email" type="email" defaultValue={profile.email||''}/></label><label>Phone<input name="phone" defaultValue={profile.phone||''}/></label></div><label>Skills<small>Separate skills with commas.</small><textarea name="skills" defaultValue={profile.skills.join(', ')} rows={3}/></label><label>Experience and education<small>One item per line.</small><textarea name="history" defaultValue={profile.history.join('\n')} rows={5}/></label><label>Items to check<small>One item per line.</small><textarea name="warnings" defaultValue={profile.warnings.join('\n')} rows={3}/></label><SubmitButton pendingText="Saving profile...">Save profile correction</SubmitButton></form></details></>:<div className="empty-compact">Analysis has not produced a profile yet.</div>}</section></div>
    <details className="card section-card"><summary>Review history and activity</summary><div className="detail-grid"><section><h3>Review decisions</h3>{actions.length?<div className="timeline">{actions.map(action=><div className="timeline-item" key={action.id}><strong>{actionNames[action.action_type]||action.action_type}</strong>{action.notes&&<p>{action.notes}</p>}<small>{readableDate(action.created_at)}</small></div>)}</div>:<p>No internal action recorded yet.</p>}</section><section><h3>Activity</h3>{events.length?<div className="timeline">{events.map(event=><div className="timeline-item" key={event.id}><strong>{event.event_type.replaceAll('_',' ')}</strong><small>{readableDate(event.created_at)}</small></div>)}</div>:<p>No activity yet.</p>}</section></div></details>
    <EvidenceHistory applicationId={id}/>
    {document&&<details className="card section-card"><summary>Read extracted CV text</summary><p className="field-help">Use this source to verify evidence excerpts. Uploaded files remain private.</p><div className="source-text">{source||'Text extraction has not finished.'}</div></details>}
  </div>;
}
