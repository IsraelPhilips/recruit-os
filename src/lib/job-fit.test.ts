import {describe,expect,it} from 'vitest';
import {jobFitMatch} from './job-fit';

const criteria=[{id:'skill',label:'TypeScript services',kind:'required' as const,category:'skill' as const},{id:'experience',label:'Support experience',kind:'required' as const,category:'experience' as const},{id:'achievement',label:'Delivered measurable result',kind:'preferred' as const,category:'achievement' as const}];
const source='Built TypeScript services. Managed support tickets. Delivered a 20% response-time improvement.';

describe('Job Fit Match',()=>{
  it('weights each required criterion four times a preferred one and credits verified partial evidence',()=>{
    const fit=jobFitMatch(criteria,[{criterion_id:'skill',status:'EVIDENCE_FOUND',excerpt:'Built TypeScript services'},{criterion_id:'experience',status:'PARTIAL_EVIDENCE',excerpt:'Managed support tickets'},{criterion_id:'achievement',status:'EVIDENCE_FOUND',excerpt:'Delivered a 20% response-time improvement'}],'ready',source);
    expect(fit.percent).toBe(78);
    expect(fit.tone).toBe('strong');
    expect(fit.required).toEqual({met:1,total:2});
    expect(fit.preferred).toEqual({met:1,total:1});
    expect(fit.criticalGaps).toEqual(['Support experience']);
  });
  it('does not credit a keyword, fabricated excerpt, or reviewer follow-up',()=>{
    const fit=jobFitMatch(criteria,[{criterion_id:'skill',status:'EVIDENCE_FOUND',excerpt:'Led TypeScript migration'},{criterion_id:'experience',status:'EVIDENCE_FOUND',excerpt:'Managed support tickets',review_mark:'needs_followup'},{criterion_id:'achievement',status:'NOT_EVIDENCED',excerpt:null}],'ready',source);
    expect(fit.percent).toBe(0);
    expect(fit.tone).toBe('weak');
    expect(fit.rows[0].reason).toBe('Quote not found in CV');
  });
  it('uses limited credit for ambiguity and waits for analysis before showing a percentage',()=>{
    const evidence=[{criterion_id:'skill',status:'AMBIGUOUS',excerpt:'Built TypeScript services'}];
    expect(jobFitMatch(criteria,evidence,'ready',source).percent).toBe(11);
    expect(jobFitMatch(criteria,evidence,'processing',source).percent).toBeNull();
    expect(jobFitMatch(criteria,evidence,'processing',source).gapCount).toBeNull();
    expect(jobFitMatch(criteria,evidence,'ready','').tone).toBe('pending');
    expect(jobFitMatch([{id:'context',label:'Location',kind:'informational'}],evidence,'ready',source).percent).toBeNull();
  });
  it('moves from weak to strong after a source-backed reviewer correction',()=>{
    const before=jobFitMatch(criteria,[{criterion_id:'skill',status:'NOT_EVIDENCED',excerpt:null}],'ready',source);
    const after=jobFitMatch(criteria,[{criterion_id:'skill',status:'EVIDENCE_FOUND',excerpt:'Built TypeScript services',review_mark:'corrected'},{criterion_id:'experience',status:'EVIDENCE_FOUND',excerpt:'Managed support tickets',review_mark:'confirmed'}],'ready',source);
    expect(before.percent).toBe(0);
    expect(after.percent).toBe(89);
  });
});
