import {describe,expect,it} from 'vitest';
import {candidateBrief,resolveProfile} from './profile-grounding';

const source='\fTomi Akinwale Content Specialist tomi@example.com PROFESSIONAL SUMMARY Content marketer. EXPERIENCE Content Associate | Fieldnote Studio | Feb 2024 - Present • Planned editorial calendars for social platforms. • Managed newsletters. SKILLS Content strategy, Canva, copywriting EDUCATION BA English';
const empty={full_name:null,email:null,phone:null,skills:[],history:[],warnings:[]};
describe('source-backed profile repair',()=>{
  it('recovers omitted name, email, skills, and experience from exact CV text',()=>{
    const result=resolveProfile(empty,source,{full_name:'Tomi Akinwale',email:''});
    expect(result.profile?.full_name).toBe('Tomi Akinwale');
    expect(result.profile?.email).toBe('tomi@example.com');
    expect(result.profile?.skills).toEqual(['Content strategy','Canva','copywriting']);
    expect(result.profile?.history[0]).toContain('Content Associate');
    expect(result.discrepancies[0]).toContain('Form email is missing');
  });
  it('preserves a recruiter correction and flags form versus CV differences',()=>{
    const corrected={...empty,full_name:'Tomi A.',email:'reviewed@example.com',skills:['Verified skill'],history:['Human note']};
    const result=resolveProfile(corrected,source,{full_name:'Tomi Akinwale',email:'form@example.com'},true);
    expect(result.profile).toEqual(corrected);
    expect(result.derivedFields).toEqual([]);
    expect(result.discrepancies).toHaveLength(2);
  });
  it('brief uses cited criteria and calls out uncertainty without a hiring verdict',()=>{
    const brief=candidateBrief([{id:'a',label:'Content strategy',kind:'required'}],[{criterion_id:'a',status:'EVIDENCE_FOUND',excerpt:'Content strategy'}],'ready',source,empty,{full_name:'Tomi Akinwale',email:'form@example.com'});
    expect(brief.summary.required.percent).toBe(100);
    expect(brief.experience[0]).toContain('Content Associate');
    expect(brief.strengths).toEqual(['Content strategy']);
    expect(brief.nextStep).not.toMatch(/hire|reject/i);
  });
});
