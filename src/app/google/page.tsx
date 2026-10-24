import Link from 'next/link';
import {requireWorkspace} from '@/lib/auth';
import {adminDb} from '@/lib/supabase';
import {accessToken,listForms,getForm,formQuestions} from '@/lib/google';
import {mappingSchema} from '@/lib/google-sync';
import {connectForm,syncSelected} from './actions';
import {SubmitButton} from '../components/SubmitButton';

type Question=ReturnType<typeof formQuestions>[number];
type LinkedForm={id:string;form_id:string;form_title:string;job_id:string;field_mapping:Record<string,string>;watch_expires_at:string|null;last_sync_at:string|null;sync_error:string|null};
const fields=[
  {key:'name',label:'Full name',required:true,help:'The applicant’s name.'},
  {key:'email',label:'Email address',required:false,help:'If absent, the application waits for a recruiter to add an email.'},
  {key:'cv',label:'CV or résumé',required:true,help:'Choose the file upload question.'},
  {key:'portfolio',label:'Portfolio link',required:false,help:'Optional website or work samples.'},
  {key:'phone',label:'Phone number',required:false,help:'Optional contact number.'},
  {key:'cover_letter',label:'Cover letter',required:false,help:'Optional written answer.'},
  {key:'consent',label:'Consent answer',required:false,help:'Only map this if your Form has a Yes/No consent question.'},
] as const;
function displayDate(value:string|null){return value?new Date(value).toLocaleString('en-NG',{dateStyle:'medium',timeStyle:'short'}):'Not yet';}
function questionOptions(questions:Question[],field:string){return questions.filter(q=>field==='cv'?q.isFile:field==='consent'?q.isConsent:!q.isFile&&!q.isConsent);}

export default async function GooglePage({searchParams}:{searchParams:Promise<{form?:string;error?:string}>}){
  const {user,workspaceId}=await requireWorkspace();const params=await searchParams;const db=adminDb();
  const {data:connection}=await db.from('google_connections').select('id,token_error').eq('recruiter_id',user.id).maybeSingle();
  const [linkedResult,jobsResult,failuresResult]=await Promise.all([
    connection?db.from('google_forms').select('id,form_id,form_title,job_id,field_mapping,watch_expires_at,last_sync_at,sync_error').eq('connection_id',connection.id).order('created_at',{ascending:false}):Promise.resolve({data:[]}),
    db.from('jobs').select('id,title').eq('workspace_id',workspaceId).not('approved_at','is',null).order('created_at',{ascending:false}),
    connection?db.from('google_forms').select('form_id').eq('connection_id',connection.id):Promise.resolve({data:[]}),
  ]);
  const linked=(linkedResult.data||[]) as LinkedForm[];const jobs=jobsResult.data||[];
  const ownedFormIds=(failuresResult.data||[]).map(item=>item.form_id);
  const {data:failureRows}=ownedFormIds.length?await db.from('google_sync_failures').select('form_id,error_message').in('form_id',ownedFormIds).is('resolved_at',null).limit(100):{data:[]};
  const failures=failureRows||[];let forms:Array<{id:string;name:string}>=[];let questions:Question[]=[];let googleError='';
  if(connection)try{const token=await accessToken(connection.id);forms=await listForms(token);if(params.form)questions=formQuestions(await getForm(token,params.form));}catch{googleError='Google could not load your Forms. Reconnect your account or try again.';}
  const selected=linked.find(item=>item.form_id===params.form);const saved=selected?.field_mapping||{};
  const savedMappingValid=selected?mappingSchema.safeParse(saved).success:false;
  return <div className="page-stack"><div className="page-heading"><div><span className="eyebrow">Workspace / Integrations</span><h1>Google Forms</h1><p>Choose a Form once. New submissions can then flow into your review workspace.</p></div><span className={`badge ${connection?'badge-success':'badge-muted'}`}>{connection?'Connected':'Not connected'}</span></div>
    {params.error&&<div className="notice notice-error" role="alert">Google authorization did not finish. Please try connecting again.</div>}
    {googleError&&<div className="notice notice-error" role="alert">{googleError}</div>}
    <div className="setup-grid"><section className="card section-card"><span className="step-number">01</span><h2>Connect your Google account</h2><p>Give RecruitOS read access to the Forms and CV files you choose to monitor.</p><a className="button-secondary inline-button" href="/api/google/connect">{connection?'Reconnect Google':'Connect Google'}</a>{connection?.token_error&&<p className="field-help notice-inline">Your Google connection needs to be refreshed.</p>}</section>
    <section className="card section-card"><span className="step-number">02</span><h2>Choose a Form</h2><p>Pick an existing application Form from your Google Drive.</p>{connection?forms.length?<form method="get" className="form-stack"><label>Application Form<select name="form" defaultValue={params.form||''} required><option value="">Select a Form</option>{forms.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label><SubmitButton pendingText="Loading questions...">Continue to field mapping</SubmitButton></form>:<div className="empty-compact">No Forms found for this Google account. Make sure you can edit the Form in Google.</div>:<p className="field-help">Connect Google first to see your Forms.</p>}</section></div>
    {connection&&params.form&&<section id="mapping" className="card section-card"><div className="section-heading"><div><span className="eyebrow">Step 03</span><h2>{selected?'Review field mapping':'Match Form questions'}</h2><p>Tell RecruitOS which Form answers contain applicant details. You can change this later.</p></div></div>
      {selected&&!savedMappingValid&&<div className="notice notice-warning" role="alert">This Form’s saved mapping needs correction. Choose a different question for each field below.</div>}
      {questions.length===0?<div className="notice notice-warning">No questions were found in this Form. Check the Google Form and reload this page.</div>:<form action={connectForm} className="form-stack"><input type="hidden" name="form_id" value={params.form}/><label>Which job is this Form for?<select name="job_id" required defaultValue={selected?.job_id||''}><option value="">Select a job</option>{jobs.map(job=><option key={job.id} value={job.id}>{job.title}</option>)}</select></label>{jobs.length===0&&<p className="field-help">You need an approved role first. <Link href="/jobs">Create one in Jobs</Link>.</p>}
      <div className="mapping-grid">{fields.map(field=><label className="mapping-field" key={field.key}><span>{field.label}{field.required?' *':''}</span><small>{field.help}</small><select name={field.key} required={field.required} defaultValue={saved[field.key]&&questionOptions(questions,field.key).some(q=>q.id===saved[field.key])?saved[field.key]:''}><option value="">{field.required?'Choose a question':'Not on this Form'}</option>{questionOptions(questions,field.key).map(q=><option key={q.id} value={q.id}>{q.title}</option>)}</select></label>)}</div><div className="form-actions"><span className="field-help">Each question should be used only once. CV uploads stay private.</span><SubmitButton pendingText="Saving Form...">{selected?'Save field mapping':'Start monitoring Form'}</SubmitButton></div></form>}
    </section>}
    <section><div className="section-heading"><div><h2>Monitored Forms</h2><p>Review connection health and import new responses.</p></div></div>{linked.length===0?<div className="card empty-state"><div className="empty-icon">▤</div><h3>No Forms monitored yet</h3><p>Connect Google and choose a Form to begin.</p></div>:<div className="form-list">{linked.map(item=>{const count=failures.filter(f=>f.form_id===item.form_id).length;const healthy=!item.sync_error&&count===0;return <article className="card monitored-card" key={item.id}><div className="monitored-top"><div><h3>{item.form_title}</h3><p>Last checked: {displayDate(item.last_sync_at)}</p></div><span className={`badge ${healthy?'badge-success':'badge-warning'}`}>{healthy?'Monitoring':'Needs attention'}</span></div>{count>0&&<div className="notice notice-warning"><strong>{count} {count===1?'submission needs':'submissions need'} attention</strong><p>These responses have not reached Applications yet. Review the field mapping or the Form answers, then retry the import.</p><Link href="/applications">View submission issues</Link></div>}{item.sync_error&&count===0&&<p className="field-help notice-inline">{item.sync_error}</p>}<div className="inline-actions"><Link className="button-secondary inline-button" href={`/google?form=${encodeURIComponent(item.form_id)}#mapping`}>Edit field mapping</Link><form action={syncSelected}><input type="hidden" name="form_id" value={item.form_id}/><SubmitButton pendingText="Importing responses...">Sync now</SubmitButton></form></div></article>;})}</div>}</section>
  </div>;
}
