import { requireRecruiter } from '@/lib/auth';
import { adminDb } from '@/lib/supabase';
import { createJob,updateJob } from '../actions';

export default async function Jobs(){
  await requireRecruiter();
  const {data}=await adminDb().from('jobs').select('*').order('created_at',{ascending:false});
  return <><h1>Jobs</h1><div className="card"><h2>Create and approve a role</h2><p className="muted">Use stable criterion IDs and job-related requirements. Saving approves this version.</p><form action={createJob}><label>Title<input name="title" required/></label><label>Reference<input name="reference" placeholder="BACKEND-001" required/></label><label>Description<textarea name="description" required rows={4}/></label><label>Criteria JSON<textarea name="criteria" rows={6} defaultValue={'[{"id":"c1","label":"TypeScript experience","kind":"required"}]'}/></label><button>Save approved role</button></form></div>
  {data?.map(j=><div className="card" key={j.id}><h2>{j.title}</h2><p>{j.reference} <span className="badge">Version {j.criteria_version}</span></p><form action={updateJob}><input type="hidden" name="id" value={j.id}/><label>Description<textarea name="description" defaultValue={j.description} rows={3}/></label><label>Criteria JSON<textarea name="criteria" rows={6} defaultValue={JSON.stringify(j.criteria,null,2)}/></label><button>Approve new version</button></form></div>)}</>;
}
