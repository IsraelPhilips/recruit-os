import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { adminDb,publicDb } from './supabase';

export async function recruiter() {
  const token = (await cookies()).get('recruitos_token')?.value;
  if (!token) return null;
  const {data:{user},error} = await publicDb().auth.getUser(token);
  return !error ? user : null;
}
export async function workspaceForUser(user:{id:string;email?:string|null}){
  const name=`${user.email?.split('@')[0]||'My'}'s RecruitOS workspace`;
  const {data,error}=await adminDb().rpc('ensure_recruitos_workspace',{p_user_id:user.id,p_claim_legacy:Boolean(user.email&&user.email.toLowerCase()===process.env.RECRUITER_EMAIL?.toLowerCase()),p_name:name});
  if(error||typeof data!=='string')throw new Error('Could not prepare your private workspace');
  return data;
}
export async function requireWorkspace(){const user=await recruiter();if(!user)redirect('/login');return {user,workspaceId:await workspaceForUser(user)};}
export async function requireRecruiter() { return (await requireWorkspace()).user; }

export async function applicationInWorkspace(db:ReturnType<typeof adminDb>,applicationId:string,workspaceId:string){
  const {data:application}=await db.from('applications').select('id,job_id').eq('id',applicationId).maybeSingle();
  if(!application)return null;
  const {data:job}=await db.from('jobs').select('id').eq('id',application.job_id).eq('workspace_id',workspaceId).maybeSingle();
  return job?application:null;
}
export async function workspaceJobIds(db:ReturnType<typeof adminDb>,workspaceId:string){
  const {data,error}=await db.from('jobs').select('id').eq('workspace_id',workspaceId);
  if(error)throw new Error('Could not load workspace roles');
  return (data||[]).map(job=>job.id as string);
}
