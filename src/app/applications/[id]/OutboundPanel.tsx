'use client';
import {useState} from 'react';
import {approveAndSendEmail,saveOutboundDraft} from '@/app/actions';
import {SubmitButton} from '@/app/components/SubmitButton';
import {currentMessageTypes,emailTemplate,hasTemplatePlaceholder,messageTypes} from '@/lib/outbound';

type MessageType=(typeof messageTypes)[number];
type Message={id:string;message_type:MessageType;human_outcome:string|null;recipient:string;subject:string;body:string;status:string;created_at:string;send_started_at:string|null;sent_at:string|null;gmail_message_id:string|null;error_category:string|null};
type CurrentType=(typeof currentMessageTypes)[number];
const labels:Record<MessageType,string>={acknowledgment:'Acknowledgment',clarification:'Question',update:'Update',rejection:'Rejection'};
const statusLabels:Record<string,string>={draft:'Draft',sending:'Sending',sent:'Sent',failed:'Failed',uncertain:'Delivery uncertain'};

export function OutboundPanel({applicationId,name,job,email,sender,messages,notice,suggestion}:{applicationId:string;name:string;job:string;email:string;sender:string|null;messages:Message[];notice?:string;suggestion:{type:CurrentType;subject:string;body:string;reason:string}|null}){
  const saved=messages.find(message=>(message.status==='draft'||message.status==='failed')&&currentMessageTypes.includes(message.message_type as CurrentType));
  const initialType=(saved?.message_type as CurrentType|undefined)||suggestion?.type||null;
  const [type,setType]=useState<CurrentType|null>(initialType);
  const [subject,setSubject]=useState(saved?.subject||suggestion?.subject||'');
  const [body,setBody]=useState(saved?.body||suggestion?.body||'');
  const [recipient,setRecipient]=useState(saved?.recipient||email);
  const [edited,setEdited]=useState(false);
  const [newId]=useState(()=>crypto.randomUUID());
  const id=saved?.id||newId;
  function choose(next:CurrentType){const template=emailTemplate(next,name,job);setType(next);setSubject(template.subject);setBody(template.body);setEdited(true);}
  const validRecipient=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient);
  return <section className="card section-card action-panel" id="email"><div className="section-heading"><div><h2>Email applicant</h2><p>Review the prepared message, save it, then explicitly approve sending.</p></div></div>
    {suggestion?<div className="suggested-mail"><strong>{suggestion.type==='rejection'?'Rejection draft prepared':'Next-stage draft prepared'}</strong><p className="field-help">{suggestion.reason}. This is a draft only. The recruiter decides the outcome, checks the recipient and wording, and approves any send.</p><p><strong>Subject:</strong> {suggestion.subject}</p><div className="mail-body-preview">{suggestion.body}</div></div>:<div className="notice notice-warning"><strong>No automatic email draft</strong><p>Analysis is pending or the Job Fit Match is 50% to 59%. Review the CV and choose rejection or next stage yourself.</p></div>}
    {notice&&<div className={`notice ${['sent','connected','draft_saved'].includes(notice)?'notice-success':'notice-warning'}`} role="status">{({sent:'Gmail confirmed sending.',connected:'Gmail connected. You can approve a saved draft.',draft_saved:'Draft saved. Check the preview before sending.',failed:'Gmail did not send the message. Review the draft before trying again.',uncertain:'Delivery is uncertain. Check Gmail Sent before creating another message.',connect_gmail:'Reconnect Gmail before sending.',token_unavailable:'Google is temporarily unavailable. The draft was not sent. Try again later.',approval_required:'Confirm your approval before sending.',already_handled:'This draft was already handled. Refresh the page.'} as Record<string,string>)[notice]||'Email setup needs attention.'}</div>}
    <div className="mail-connection"><span className={`badge ${sender?'badge-success':'badge-warning'}`}>{sender?`Sending as ${sender}`:'Gmail not connected'}</span><a href={`/api/google/mail/connect?application_id=${applicationId}`}>{sender?'Reconnect Gmail':'Connect Gmail to send'}</a></div>
    <details className="compose-details" open={Boolean(suggestion&&!saved)}><summary>{saved?'Edit saved draft':suggestion?'Review prepared draft':'Choose an email'}</summary><form action={saveOutboundDraft} className="form-stack mail-compose" onChange={()=>setEdited(true)}><input type="hidden" name="application_id" value={applicationId}/><input type="hidden" name="message_id" value={id}/><input type="hidden" name="message_type" value={type||''}/>
      <div className="mail-type-picker" role="group" aria-label="Message type">{currentMessageTypes.map(item=><button type="button" className={type===item?'mail-type-active':'button-secondary'} key={item} onClick={()=>choose(item)}>{item==='update'?'Next stage':'Rejection'}</button>)}</div>
      <label>To<input type="email" name="recipient" required maxLength={254} value={recipient} onChange={event=>setRecipient(event.target.value)} placeholder="applicant@example.com"/></label>
      <label>Subject<input name="subject" required minLength={3} maxLength={200} value={subject} onChange={event=>setSubject(event.target.value)}/></label>
      <label>Message<textarea name="body" required minLength={10} maxLength={10000} rows={7} value={body} onChange={event=>setBody(event.target.value)}/></label>
      {!validRecipient&&<p className="field-help notice-inline">Add the applicant email before saving a sendable draft.</p>}
      <p className="field-help">Job Fit Match only suggests a draft. Your approval is the hiring communication decision.</p>
      <SubmitButton pendingText="Saving draft..." disabled={!type}>{saved?'Save changes to draft':'Save draft for approval'}</SubmitButton>
    </form></details>
    {saved&&<div className="mail-preview"><div className="section-heading"><div><h3>Saved draft for approval</h3><p>Edits above must be saved before they appear here.</p></div><span className="badge badge-warning">{statusLabels[saved.status]}</span></div><p><strong>To:</strong> {saved.recipient}</p><p><strong>Subject:</strong> {saved.subject}</p><div className="mail-body-preview">{saved.body}</div>{edited&&<p className="field-help notice-inline">You changed the editor. Save those changes before approving.</p>}
      {hasTemplatePlaceholder(saved.body)&&<p className="field-help notice-inline">Replace the bracketed placeholder before sending.</p>}
      {sender&&saved.status==='draft'&&!edited&&!hasTemplatePlaceholder(saved.body)&&<form action={approveAndSendEmail} className="mail-approval"><input type="hidden" name="application_id" value={applicationId}/><input type="hidden" name="message_id" value={saved.id}/><label className="approval-check"><input type="checkbox" name="approval" value="yes" required/> I reviewed this message and approve sending it to {saved.recipient}.</label><SubmitButton pendingText="Sending email...">Approve and send email</SubmitButton></form>}
      {saved.status==='failed'&&<p className="field-help">{saved.error_category==='gmail_http_403'?'Google denied sending. Check Gmail API enablement and your account permission. ':''}Save the draft again to make a deliberate new send attempt.</p>}
    </div>}
    {messages.some(message=>message.id!==saved?.id)&&<details className="mail-history"><summary>Email history</summary><div className="timeline">{messages.filter(message=>message.id!==saved?.id).map(message=>{const stalled=message.status==='sending'&&Boolean(message.send_started_at)&&Date.now()-new Date(message.send_started_at!).getTime()>60000;const label=message.message_type==='update'&&message.human_outcome==='continue'?'Next stage':labels[message.message_type];return <div className="timeline-item" key={message.id}><strong>{label} · {stalled?'Delivery uncertain':statusLabels[message.status]||message.status}</strong><small>{new Date(message.sent_at||message.created_at).toLocaleString('en-NG')} · To {message.recipient}</small>{message.status==='draft'&&<p>Older draft. Choose one of the two current email types above to send a new message.</p>}{(message.status==='uncertain'||stalled)&&<p>Check Gmail Sent before trying again.</p>}{message.gmail_message_id&&<small>Gmail message ID: {message.gmail_message_id}</small>}</div>})}</div></details>}
  </section>;
}
