import {sourceContains,type ReviewCriterion,type ReviewEvidence} from './review-summary';

export type FitTone='strong'|'moderate'|'weak'|'pending';
export type FitRow={criterion:ReviewCriterion;status:string;excerpt:string|null;weight:number;fraction:number;points:number;reason:string};

export function jobFitMatch(criteria:ReviewCriterion[],evidence:ReviewEvidence[],processStatus:string,source:string){
  const assessed=criteria.filter(item=>item.kind==='required'||item.kind==='preferred');
  const available=(processStatus==='ready'||processStatus==='manual_review')&&Boolean(source.trim())&&evidence.length>0&&assessed.length>0;
  const byId=new Map(evidence.map(item=>[item.criterion_id,item]));
  const rows:FitRow[]=assessed.map(criterion=>{
    const item=byId.get(criterion.id);
    const weight=criterion.kind==='required'?4:1;
    const verified=Boolean(item?.excerpt&&sourceContains(source,item.excerpt));
    let fraction=0;
    if(verified&&item?.review_mark!=='needs_followup'){
      if(item?.status==='EVIDENCE_FOUND')fraction=1;
      else if(item?.status==='PARTIAL_EVIDENCE')fraction=0.5;
      else if(item?.status==='AMBIGUOUS')fraction=0.25;
    }
    const reason=!item?'Analysis pending':item.review_mark==='needs_followup'?'Reviewer marked for follow-up':!verified&&item.excerpt?'Quote not found in CV':fraction===1?'Documented with a verified excerpt':fraction===0.5?'Partial evidence with a verified excerpt':fraction===0.25?'Ambiguous evidence with a verified excerpt':'Not documented in the available CV';
    return {criterion,status:item?.status||'PENDING',excerpt:verified?item?.excerpt||null:null,weight,fraction,points:weight*fraction,reason};
  });
  const maxPoints=rows.reduce((sum,row)=>sum+row.weight,0);
  const earnedPoints=rows.reduce((sum,row)=>sum+row.points,0);
  const percent=available?Math.round(earnedPoints/maxPoints*100):null;
  const tone:FitTone=percent===null?'pending':percent>=75?'strong':percent>=45?'moderate':'weak';
  const required=rows.filter(row=>row.criterion.kind==='required');
  const preferred=rows.filter(row=>row.criterion.kind==='preferred');
  return {available,percent,tone,rows,earnedPoints,maxPoints,required:{met:required.filter(row=>row.fraction===1).length,total:required.length},preferred:{met:preferred.filter(row=>row.fraction===1).length,total:preferred.length},gapCount:available?rows.filter(row=>row.fraction<1).length:null,criticalGaps:available?required.filter(row=>row.fraction<1).map(row=>row.criterion.label):[]};
}
