import {adminDb} from '@/lib/supabase';

export async function EvidenceHistory({applicationId}:{applicationId:string}){
  const {data}=await adminDb().from('evidence_revisions').select('id,previous_status,previous_excerpt,revised_status,revised_excerpt,note,created_at').eq('application_id',applicationId).order('created_at',{ascending:false});
  if(!data?.length)return null;
  return <div className="card"><h2>Evidence corrections</h2>{data.map(row=><div key={row.id}><p>{new Date(row.created_at).toLocaleString()} · {row.previous_status} to {row.revised_status}</p><p>Previous excerpt: {row.previous_excerpt||'None'}</p><p>Revised excerpt: {row.revised_excerpt||'None'}</p>{row.note&&<p>Reviewer note: {row.note}</p>}</div>)}</div>;
}
