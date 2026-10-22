import {adminDb} from '@/lib/supabase';

const names:Record<string,string>={EVIDENCE_FOUND:'Evidence found',PARTIAL_EVIDENCE:'Partial evidence',NOT_EVIDENCED:'Not evidenced',AMBIGUOUS:'Ambiguous',REQUIRES_REVIEW:'Review needed'};
export async function EvidenceHistory({applicationId}:{applicationId:string}){
  const {data}=await adminDb().from('evidence_revisions').select('id,previous_status,previous_excerpt,revised_status,revised_excerpt,note,created_at').eq('application_id',applicationId).order('created_at',{ascending:false});
  if(!data?.length)return null;
  return <section className="card section-card"><h2>Evidence correction history</h2><p className="field-help">Previous and revised claims stay available for review.</p><div className="timeline">{data.map(row=><div className="timeline-item" key={row.id}><strong>{names[row.previous_status]||row.previous_status} → {names[row.revised_status]||row.revised_status}</strong><small>{new Date(row.created_at).toLocaleString('en-NG',{dateStyle:'medium',timeStyle:'short'})}</small><p><b>Before:</b> {row.previous_excerpt||'No excerpt'}</p><p><b>After:</b> {row.revised_excerpt||'No excerpt'}</p>{row.note&&<p><b>Reviewer note:</b> {row.note}</p>}</div>)}</div></section>;
}
