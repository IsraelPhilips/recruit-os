import {z} from 'zod';
import type {jobFitMatch} from './job-fit';

export const messageTypes=['acknowledgment','clarification','update','rejection'] as const;
export const currentMessageTypes=['rejection','update'] as const;
export const draftSchema=z.object({
  applicationId:z.uuid(),id:z.uuid(),
  messageType:z.enum(currentMessageTypes),
  recipient:z.email().max(254),
  subject:z.string().trim().min(3).max(200).refine(value=>!/[\r\n]/.test(value)),
  body:z.string().trim().min(10).max(10000),
});

export function emailTemplate(type:(typeof currentMessageTypes)[number],name:string,job:string){
  const person=name.replace(/\s+/g,' ').trim().slice(0,100)||'Applicant';
  const role=job.replace(/\s+/g,' ').trim().slice(0,140)||'the role';
  const greeting=`Hello ${person},`;
  const footer='Best regards,\nRecruiting team';
  switch(type){
    case 'update':return {subject:`Next stage for your ${role} application`,body:`${greeting}\n\nThank you for applying for ${role}. We would like to move your application to the next stage of our review process. We will reach out with details about the next steps.\n\nWe appreciate the time you spent on your application.\n\n${footer}`};
    case 'rejection':return {subject:`Your application for ${role}`,body:`${greeting}\n\nThank you for your interest in ${role} and the time you put into your application. After review, we will not be moving forward with your application for this role.\n\nWe appreciate your interest and wish you well in your search.\n\n${footer}`};
  }
}

export function suggestedEmailType(percent:number|null){
  if(percent===null)return null;
  if(percent<50)return 'rejection' as const;
  if(percent>=60)return 'update' as const;
  return null;
}

export function suggestedApplicantEmail(fit:ReturnType<typeof jobFitMatch>,name:string,job:string){
  const type=suggestedEmailType(fit.percent);
  if(!type)return null;
  return {type,...emailTemplate(type,name,job),reason:type==='rejection'?'Below 50% documented job match':'At least 60% documented job match'};
}

export function hasTemplatePlaceholder(body:string){return /\[(?:Write your question here|Write the update here)\]/i.test(body);}

export function gmailRawMessage(sender:string,recipient:string,subject:string,body:string){
  const safe=z.object({sender:z.email(),recipient:z.email(),subject:z.string().min(1).max(200).refine(v=>!/[\r\n]/.test(v)),body:z.string().min(1).max(10000)}).parse({sender,recipient,subject,body});
  const encodedSubject=`=?UTF-8?B?${Buffer.from(safe.subject,'utf8').toString('base64')}?=`;
  const encodedBody=Buffer.from(safe.body.replace(/\r?\n/g,'\r\n'),'utf8').toString('base64').replace(/.{1,76}/g,'$&\r\n').trimEnd();
  const mime=`From: ${safe.sender}\r\nTo: ${safe.recipient}\r\nSubject: ${encodedSubject}\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${encodedBody}`;
  return Buffer.from(mime,'utf8').toString('base64url');
}

export async function deliverViaGmail(token:string,raw:string,sendFetch:typeof fetch=fetch):Promise<{status:'sent'|'failed'|'uncertain';messageId:string|null;errorCategory:string|null}>{
  try{
    const response=await sendFetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({raw}),cache:'no-store',signal:AbortSignal.timeout(15000)});
    if(response.ok){const result=await response.json() as {id?:string};return result.id?{status:'sent',messageId:result.id,errorCategory:null}:{status:'uncertain',messageId:null,errorCategory:'missing_message_id'};}
    if(response.status>=500)return {status:'uncertain',messageId:null,errorCategory:`gmail_http_${response.status}`};
    return {status:'failed',messageId:null,errorCategory:`gmail_http_${response.status}`};
  }catch{return {status:'uncertain',messageId:null,errorCategory:'delivery_unknown'};}
}
