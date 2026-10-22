'use client';
import {useState} from 'react';
import {approveAndSendEmail,saveOutboundDraft} from '@/app/actions';
import {SubmitButton} from '@/app/components/SubmitButton';
import {emailTemplate,hasTemplatePlaceholder,messageTypes} from '@/lib/outbound';

type MessageType=(typeof messageTypes)[number];
type Message={id:string;message_type:MessageType;recipient:string;subject:string;body:string;status:string;created_at:string;send_started_at:string|null;sent_at:string|null;gmail_message_id:string|null;error_category:string|null};
const labels:Record<MessageType,string>={acknowledgment:'Acknowledge',clarification:'Ask a question',update:'Update',rejection:'Rejection'};
const statusLabels:Record<string,string>={draft:'Draft',sending:'Sending',sent:'Sent',failed:'Failed',uncertain:'Delivery uncertain'};

export function OutboundPanel({applicationId,name,job,email,sender,messages,notice}:{applicationId:string;name:string;job:string;email:string;sender:string|null;messages:Message[];notice?:string}){
  const saved=messages.find(message=>message.status==='draft'||message.status==='failed');
  const [type,setType]=useState<MessageType>(saved?.message_type||'acknowledgment');
  const [subject,setSubject]=useState(saved?.subject||emailTemplate('acknowledgment',name,job).subject);
  const [body,setBody]=useState(saved?.body||emailTemplate('acknowledgment',name,job).body);
  const [recipient,setRecipient]=useState(saved?.recipient||email);
  const [edited,setEdited]=useState(false);
  const [newId]=useState(()=>crypto.randomUUID());
  const id=saved?.id||newId;
  function choose(next:MessageType){const template=emailTemplate(next,name,job);setType(next);setSubject(template.subject);setBody(template.body);setEdited(true);}
  const validRecipient=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient);
  return <section className="card section-card action-panel" id="email"><div className="section-heading"><div><h2>Email applicant</h2><p>Choose a message, edit it, then approve the saved draft.</p></div></div>
    {notice&&<div className={`notice ${['sent','connected','draft_saved'].includes(notice)?'notice-success':'notice-warning'}`} role="status">{({sent:'Gmail confirmed sending.',connected:'Gmail connected. You can approve a saved draft.',draft_saved:'Draft saved. Check the preview before sending.',failed:'Gmail did not send the message. Review the draft before trying again.',uncertain:'Delivery is uncertain. Check Gmail Sent before creating another message.',connect_gmail:'Reconnect Gmail before sending.',token_unavailable:'Google is temporarily unavailable. The draft was not sent. Try again later.',approval_required:'Confirm your approval before sending.',already_handled:'This draft was already handled. Refresh the page.'} as Record<string,string>)[notice]||'Email setup needs attention.'}</div>}
    <div className="mail-connection"><span className={`badge ${sender?'badge-success':'badge-warning'}`}>{sender?`Sending as ${sender}`:'Gmail not connected'}</span><a href={`/api/google/mail/connect?application_id=${applicationId}`}>{sender?'Reconnect Gmail':'Connect Gmail to send'}</a></div>
    <details className="compose-details"><summary>{saved?'Edit saved draft':'+ Draft a response'}</summary><form action={saveOutboundDraft} className="form-stack mail-compose" onChange={()=>setEdited(true)}><input type="hidden" name="application_id" value={applicationId}/><input type="hidden" name="message_id" value={id}/><input type="hidden" name="message_type" value={type}/>
      <div className="mail-type-picker" role="group" aria-label="Message type">{messageTypes.map(item=><button type="button" className={type===item?'mail-type-active':'button-secondary'} key={item} onClick={()=>choose(item)}>{labels[item]}</button>)}</div>
      <label>To<input type="email" name="recipient" required maxLength={254} value={recipient} onChange={event=>setRecipient(event.target.value)} placeholder="applicant@example.com"/></label>
      <label>Subject<input name="subject" required minLength={3} maxLength={200} value={subject} onChange={event=>setSubject(event.target.value)}/></label>
      <label>Message<textarea name="body" required minLength={10} maxLength={10000} rows={7} value={body} onChange={event=>setBody(event.target.value)}/></label>
      {!validRecipient&&<p className="field-help notice-inline">Add the applicant email before saving a sendable draft.</p>}
      {type==='rejection'&&<p className="field-help">This is a reviewer-selected rejection message. RecruitOS does not choose the hiring outcome.</p>}
      <SubmitButton pendingText="Saving draft...">{saved?'Save changes to draft':'Save draft'}</SubmitButton>
    </form></details>
    {saved&&<div className="mail-preview"><div className="section-heading"><div><h3>Saved draft for approval</h3><p>Edits above must be saved before they appear here.</p></div><span className="badge badge-warning">{statusLabels[saved.status]}</span></div><p><strong>To:</strong> {saved.recipient}</p><p><strong>Subject:</strong> {saved.subject}</p><div className="mail-body-preview">{saved.body}</div>{edited&&<p className="field-help notice-inline">You changed the editor. Save those changes before approving.</p>}
      {hasTemplatePlaceholder(saved.body)&&<p className="field-help notice-inline">Replace the bracketed placeholder before sending.</p>}
      {sender&&saved.status==='draft'&&!edited&&!hasTemplatePlaceholder(saved.body)&&<form action={approveAndSendEmail} className="mail-approval"><input type="hidden" name="application_id" value={applicationId}/><input type="hidden" name="message_id" value={saved.id}/><label className="approval-check"><input type="checkbox" name="approval" value="yes" required/> I reviewed this message and approve sending it to {saved.recipient}.</label><SubmitButton pendingText="Sending email...">Approve and send email</SubmitButton></form>}
      {saved.status==='failed'&&<p className="field-help">{saved.error_category==='gmail_http_403'?'Google denied sending. Check Gmail API enablement and your account permission. ':''}Save the draft again to make a deliberate new send attempt.</p>}
    </div>}
    {messages.some(message=>message.status!=='draft'&&message.id!==saved?.id)&&<details className="mail-history"><summary>Email history</summary><div className="timeline">{messages.filter(message=>message.status!=='draft'&&message.id!==saved?.id).map(message=>{const stalled=message.status==='sending'&&Boolean(message.send_started_at)&&Date.now()-new Date(message.send_started_at!).getTime()>60000;return <div className="timeline-item" key={message.id}><strong>{labels[message.message_type]} · {stalled?'Delivery uncertain':statusLabels[message.status]||message.status}</strong><small>{new Date(message.sent_at||message.created_at).toLocaleString('en-NG')} · To {message.recipient}</small>{(message.status==='uncertain'||stalled)&&<p>Check Gmail Sent before trying again.</p>}{message.gmail_message_id&&<small>Gmail message ID: {message.gmail_message_id}</small>}</div>})}</div></details>}
  </section>;
}
