import {requireRecruiter} from '@/lib/auth';
import {adminDb} from '@/lib/supabase';
import {createJob,updateJob} from '../actions';
import CriteriaEditor from './CriteriaEditor';
import {SubmitButton} from '../components/SubmitButton';
import type {z} from 'zod';
import {criteriaSchema} from '@/lib/contracts';

type Criterion=z.infer<typeof criteriaSchema>[number];
type Job={id:string;title:string;description:string;criteria:Criterion[];criteria_version:number;approved_at:string|null};

export default async function Jobs(){
  await requireRecruiter();
  const {data,error}=await adminDb().from('jobs').select('id,title,description,criteria,criteria_version,approved_at').order('created_at',{ascending:false});
  if(error)throw new Error('Could not load jobs');
  const jobs=(data||[]) as Job[];
  return <div className="page-stack"><div className="page-heading"><div><span className="eyebrow">Workspace / Roles</span><h1>Jobs and review criteria</h1><p>Describe the role and choose what evidence a recruiter should review.</p></div><span className="count-pill">{jobs.length} {jobs.length===1?'role':'roles'}</span></div>
    <section className="card section-card"><div className="section-heading"><div><h2>Create a role</h2><p>These criteria guide evidence extraction. They never make the hiring decision.</p></div></div><form action={createJob} className="form-stack"><label>Job title<input name="title" required minLength={3} maxLength={160} placeholder="For example, Software Engineer"/></label><label>Job description<textarea name="description" required minLength={10} rows={5} placeholder="Describe the work, responsibilities, and relevant experience."/></label><CriteriaEditor/><div className="form-actions"><SubmitButton pendingText="Saving role...">Create and approve role</SubmitButton></div></form></section>
    <section><div className="section-heading"><div><h2>Existing roles</h2><p>Update criteria when the role changes. New applications retain the version used at intake.</p></div></div>{jobs.length===0?<div className="card empty-state"><div className="empty-icon">◇</div><h3>No roles yet</h3><p>Create your first role above, then link it to a Google Form.</p></div>:<div className="job-grid">{jobs.map(job=><article className="card job-card" key={job.id}><div className="job-card-top"><div><h3>{job.title}</h3><p>{job.criteria?.length||0} review criteria</p></div><span className="badge badge-success">Approved</span></div><details><summary>Edit role and criteria</summary><form action={updateJob} className="form-stack"><input type="hidden" name="id" value={job.id}/><label>Job description<textarea name="description" defaultValue={job.description} required minLength={10} rows={5}/></label><CriteriaEditor initial={job.criteria}/><div className="form-actions"><span className="field-help">Current version {job.criteria_version}</span><SubmitButton pendingText="Saving changes...">Approve new version</SubmitButton></div></form></details></article>)}</div>}</section>
  </div>;
}
