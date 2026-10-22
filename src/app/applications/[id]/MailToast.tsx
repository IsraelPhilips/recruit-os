'use client';
import {useState} from 'react';

const feedback:Record<string,{title:string;message:string;icon:string}>={
  sent:{title:'Email sent',message:'Gmail confirmed the send. The message is recorded in Email history.',icon:'✓'},
  failed:{title:'Email was not sent',message:'Check the draft and Gmail connection before trying again.',icon:'!'},
  uncertain:{title:'Delivery needs checking',message:'Check the sender’s Gmail Sent folder before another attempt.',icon:'!'},
};

export function MailToast({status}:{status?:string}){
  const [open,setOpen]=useState(true);
  const item=status?feedback[status]:undefined;
  if(!item||!open)return null;
  function dismiss(){setOpen(false);const url=new URL(window.location.href);url.searchParams.delete('mail');window.history.replaceState(null,'',url);}
  return <div className={`mail-toast ${status==='sent'?'mail-toast-success':'mail-toast-warning'}`} role={status==='sent'?'status':'alert'} aria-live={status==='sent'?'polite':'assertive'}><span className="mail-toast-icon" aria-hidden="true">{item.icon}</span><div><strong>{item.title}</strong><p>{item.message}</p><a href="#email">View email details</a></div><button type="button" className="button-quiet" onClick={dismiss} aria-label="Dismiss email notification">×</button></div>;
}
