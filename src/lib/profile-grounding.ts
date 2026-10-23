import {sourceContains,reviewGuidance,type ReviewCriterion,type ReviewEvidence,reviewSummary} from './review-summary';
import {jobFitMatch} from './job-fit';

export type Profile={full_name:string|null;email:string|null;phone:string|null;skills:string[];history:string[];warnings:string[]};
export type FormCandidate={full_name?:string|null;email?:string|null;phone?:string|null};

function clean(value:unknown){return typeof value==='string'?value.trim():'';}
function unique(values:string[]){return [...new Set(values.map(value=>value.trim()).filter(Boolean))];}
function section(source:string,title:string,ends:string[]){
  const heading=new RegExp(`\\b${title}\\s+(?=[A-Z])`,'g');
  const match=heading.exec(source);
  if(!match)return '';
  const tail=source.slice(match.index+match[0].length);
  const end=ends.map(item=>tail.search(new RegExp(`\\b${item}\\b`))).filter(index=>index>=0);
  return tail.slice(0,end.length?Math.min(...end):undefined).trim();
}

export function resolveProfile(stored:Profile|null,source:string,form:FormCandidate,reviewerCorrected=false){
  if(!stored)return {profile:null,derivedFields:[] as string[],discrepancies:[] as string[]};
  const original:Profile={full_name:clean(stored.full_name)||null,email:clean(stored.email)||null,phone:clean(stored.phone)||null,skills:Array.isArray(stored.skills)?stored.skills.filter(item=>typeof item==='string'):[],history:Array.isArray(stored.history)?stored.history.filter(item=>typeof item==='string'):[],warnings:Array.isArray(stored.warnings)?stored.warnings.filter(item=>typeof item==='string'):[]};
  const derivedFields:string[]=[];
  const profile:Profile={...original};
  if(!reviewerCorrected&&source.trim()){
    if(!profile.full_name||!sourceContains(source,profile.full_name)){
      const formName=clean(form.full_name);
      profile.full_name=formName&&sourceContains(source,formName)?formName:null;
      if(profile.full_name)derivedFields.push('name');
    }
    const sourceEmails=unique(source.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)||[]);
    if(!profile.email||!sourceContains(source,profile.email)){
      profile.email=sourceEmails.length===1?sourceEmails[0]:null;
      if(profile.email)derivedFields.push('email');
    }
    if(profile.phone&&!sourceContains(source,profile.phone))profile.phone=null;
    const groundedSkills=unique(profile.skills.filter(value=>sourceContains(source,value)));
    if(!groundedSkills.length){
      const skillsSection=section(source,'SKILLS',['EDUCATION','CERTIFICATIONS','ADDITIONAL INFORMATION','EXPERIENCE','PROJECTS']);
      profile.skills=unique(skillsSection.split(/[,;•\n]/).map(value=>value.trim()).filter(value=>value.length>=2&&value.length<=70&&sourceContains(source,value))).slice(0,20);
      if(profile.skills.length)derivedFields.push('skills');
    }else profile.skills=groundedSkills;
    const groundedHistory=unique(profile.history.filter(value=>sourceContains(source,value)));
    if(!groundedHistory.length){
      const experience=section(source,'EXPERIENCE',['SKILLS','EDUCATION','CERTIFICATIONS','ADDITIONAL INFORMATION']);
      profile.history=unique(experience.split('•').map(value=>value.trim()).filter(value=>value.length>=12).slice(0,3).map(value=>value.slice(0,220))).filter(value=>sourceContains(source,value));
      if(profile.history.length)derivedFields.push('experience');
    }else profile.history=groundedHistory;
  }
  const discrepancies:string[]=[];
  const formName=clean(form.full_name),formEmail=clean(form.email),formPhone=clean(form.phone);
  if(formName&&profile.full_name&&formName.toLocaleLowerCase()!==profile.full_name.toLocaleLowerCase())discrepancies.push(`Form name differs from CV name (${formName} / ${profile.full_name}).`);
  if(formEmail&&profile.email&&formEmail.toLocaleLowerCase()!==profile.email.toLocaleLowerCase())discrepancies.push(`Form email differs from CV email (${formEmail} / ${profile.email}).`);
  if(!formEmail&&profile.email)discrepancies.push(`Form email is missing; CV contains ${profile.email}. Confirm before contacting the applicant.`);
  if(formPhone&&profile.phone&&formPhone.replace(/\D/g,'')!==profile.phone.replace(/\D/g,''))discrepancies.push('Form phone differs from CV phone.');
  return {profile,derivedFields,discrepancies};
}

export function candidateBrief(criteria:ReviewCriterion[],evidence:ReviewEvidence[],status:string,source:string,stored:Profile|null,form:FormCandidate,reviewerCorrected=false){
  const summary=reviewSummary(criteria,evidence,status,source);
  const fit=jobFitMatch(criteria,evidence,status,source);
  const resolved=resolveProfile(stored,source,form,reviewerCorrected);
  const experience=resolved.profile?.history.slice(0,2)||[];
  const strengths=summary.documented.map(item=>item.label).slice(0,3);
  const gaps=[...summary.partial,...summary.followUp].map(item=>item.label).slice(0,3);
  const uncertainties=[...resolved.discrepancies,...(summary.available&&summary.followUp.length?['Some criteria lack a verified CV excerpt. This does not establish missing ability.']:[])];
  const nextStep=reviewGuidance(summary,Boolean(form.email));
  return {summary,fit,profile:resolved.profile,derivedFields:resolved.derivedFields,discrepancies:resolved.discrepancies,experience,strengths,gaps,uncertainties,nextStep,reviewerCorrected};
}
