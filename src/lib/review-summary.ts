export type ReviewCriterion={id:string;label:string;kind:'required'|'preferred'|'informational'};
export type ReviewEvidence={criterion_id:string;status:string;excerpt:string|null;question?:string|null};

export function reviewSummary(criteria:ReviewCriterion[],evidence:ReviewEvidence[],processStatus:string){
  const assessed=criteria.filter(item=>item.kind!=='informational');
  const byId=new Map(evidence.map(item=>[item.criterion_id,item]));
  const documented=assessed.filter(item=>{const match=byId.get(item.id);return match?.status==='EVIDENCE_FOUND'&&Boolean(match.excerpt?.trim());});
  const partial=assessed.filter(item=>byId.get(item.id)?.status==='PARTIAL_EVIDENCE');
  const followUp=assessed.filter(item=>!documented.includes(item)&&!partial.includes(item));
  const available=(processStatus==='ready'||processStatus==='manual_review')&&evidence.length>0;
  const percent=available&&assessed.length?Math.round(documented.length/assessed.length*100):null;
  return {total:assessed.length,documented,partial,followUp,percent,available};
}

export function reviewGuidance(summary:ReturnType<typeof reviewSummary>,hasEmail:boolean){
  if(!summary.available)return 'Wait for CV analysis or resolve the processing issue before reviewing criteria.';
  if(!hasEmail)return 'Confirm the applicant email before sending any message.';
  if(summary.total===0)return 'Add job criteria before assessing the CV evidence.';
  if(summary.followUp.length||summary.partial.length)return 'Check the cited excerpts, then ask the applicant for a specific example where the CV is unclear. Missing evidence does not establish missing ability.';
  return 'Review the cited excerpts and confirm them before deciding the next human step.';
}

export function suggestedReviewEmail(summary:ReturnType<typeof reviewSummary>,name:string,job:string){
  const greeting=`Hello ${name||'Applicant'},`;
  const footer='Best regards,\nRecruiting team';
  const uncertain=[...summary.partial,...summary.followUp][0];
  if(summary.available&&uncertain){
    return {type:'clarification' as const,subject:`A question about your ${job} application`,body:`${greeting}\n\nThank you for applying for ${job}. As we review your application, could you share a brief example of your experience with ${uncertain.label}?\n\nPlease reply when convenient.\n\n${footer}`};
  }
  if(summary.available&&summary.total>0){
    return {type:'update' as const,subject:`Update on your ${job} application`,body:`${greeting}\n\nThank you for applying for ${job}. We are reviewing the information you shared and will be in touch about the next step.\n\n${footer}`};
  }
  return {type:'acknowledgment' as const,subject:`Application received: ${job}`,body:`${greeting}\n\nThank you for applying for ${job}. We have received your application and will be in touch when there is an update.\n\n${footer}`};
}
