import {describe,expect,it} from 'vitest';
import {reviewGuidance,reviewSummary,suggestedReviewEmail} from './review-summary';

const criteria=[{id:'a',label:'TypeScript',kind:'required' as const},{id:'b',label:'Customer support',kind:'preferred' as const},{id:'c',label:'Availability',kind:'informational' as const}];
describe('transparent review summary',()=>{
  it('counts only source-cited job criteria and never turns missing evidence into a suitability score',()=>{
    const result=reviewSummary(criteria,[{criterion_id:'a',status:'EVIDENCE_FOUND',excerpt:'Built TypeScript services'},{criterion_id:'b',status:'NOT_EVIDENCED',excerpt:null}], 'ready');
    expect(result.percent).toBe(50);
    expect(result.total).toBe(2);
    expect(result.followUp.map(item=>item.label)).toEqual(['Customer support']);
    expect(reviewGuidance(result,true)).toContain('Missing evidence does not establish missing ability');
  });
  it('withholds a percentage before analysis and suggests an editable question, never rejection',()=>{
    expect(reviewSummary(criteria,[],'processing').percent).toBeNull();
    expect(reviewSummary(criteria,[],'manual_review').percent).toBeNull();
    const result=reviewSummary(criteria,[{criterion_id:'a',status:'PARTIAL_EVIDENCE',excerpt:'TypeScript'},{criterion_id:'b',status:'EVIDENCE_FOUND',excerpt:'Handled support tickets'}],'ready');
    const suggestion=suggestedReviewEmail(result,'Synthetic Applicant','Support');
    expect(suggestion.type).toBe('clarification');
    expect(suggestion.body).toContain('TypeScript');
    expect(suggestion.body).not.toMatch(/reject|match score|percent/i);
  });
});
