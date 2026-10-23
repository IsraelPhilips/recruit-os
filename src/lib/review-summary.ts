export type ReviewCriterion={id:string;label:string;kind:'required'|'preferred'|'informational';category?:'skill'|'experience'|'achievement'|'other'};
export type ReviewEvidence={criterion_id:string;status:string;excerpt:string|null;question?:string|null;review_mark?:string|null};
export type Coverage={documented:number;total:number;percent:number|null};

export function sourceContains(source:string,excerpt:string){
  const compact=(value:string)=>value.replace(/\s+/g,' ').trim().toLocaleLowerCase();
  return Boolean(excerpt.trim())&&compact(source).includes(compact(excerpt));
}

export function reviewSummary(criteria:ReviewCriterion[],evidence:ReviewEvidence[],processStatus:string,source=''){
  const assessed=criteria.filter(item=>item.kind!=='informational');
  const byId=new Map(evidence.map(item=>[item.criterion_id,item]));
  const documented=assessed.filter(item=>{const match=byId.get(item.id);return match?.status==='EVIDENCE_FOUND'&&match.review_mark!=='needs_followup'&&sourceContains(source,match.excerpt||'');});
  const partial=assessed.filter(item=>!documented.includes(item)&&byId.get(item.id)?.status==='PARTIAL_EVIDENCE'&&sourceContains(source,byId.get(item.id)?.excerpt||''));
  const followUp=assessed.filter(item=>!documented.includes(item)&&!partial.includes(item));
  const available=(processStatus==='ready'||processStatus==='manual_review')&&evidence.length>0&&Boolean(source.trim());
  const coverage=(kind:'required'|'preferred'):Coverage=>{const subset=assessed.filter(item=>item.kind===kind);const count=subset.filter(item=>documented.includes(item)).length;return {documented:count,total:subset.length,percent:available&&subset.length?Math.round(count/subset.length*100):null};};
  const percent=available&&assessed.length?Math.round(documented.length/assessed.length*100):null;
  return {total:assessed.length,documented,partial,followUp,percent,available,required:coverage('required'),preferred:coverage('preferred')};
}

export function reviewGuidance(summary:ReturnType<typeof reviewSummary>,hasEmail:boolean){
  if(!summary.available)return 'Wait for CV analysis or resolve the processing issue before reviewing criteria.';
  if(!hasEmail)return 'Confirm the applicant email before sending any message.';
  if(summary.total===0)return 'Add job criteria before assessing the CV evidence.';
  const unresolved=[...summary.partial,...summary.followUp];
  if(unresolved.length){
    if(summary.documented.length===0)return 'No job criterion has a complete cited excerpt yet. Verify the CV against the role, then choose the next human review step. Missing evidence does not establish missing ability.';
    return `${summary.documented.length} of ${summary.total} job criteria have cited evidence. Confirm those excerpts and review the remaining gaps before choosing the next human step. Missing evidence does not establish missing ability.`;
  }
  return `All ${summary.total} required or preferred job criteria have cited CV evidence. Verify the excerpts and context, then decide whether to move to an internal review or interview.`;
}
