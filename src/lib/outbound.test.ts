import {describe,expect,it} from 'vitest';
import {deliverViaGmail,draftSchema,emailTemplate,gmailRawMessage,hasTemplatePlaceholder} from './outbound';

describe('outbound mail boundaries',()=>{
  it('creates an editable rejection template without a model verdict',()=>{
    const draft=emailTemplate('rejection','Synthetic Applicant','Support Specialist');
    expect(draft.body).toContain('Hello Synthetic Applicant');
    expect(draft.body).toContain('we will not be moving forward');
    expect(draft.body).not.toMatch(/AI|score|ranking/i);
  });
  it('encodes a UTF-8 MIME message and rejects header injection',()=>{
    const raw=gmailRawMessage('reviewer@example.com','synthetic@example.com','Your application','Hello, synthetic applicant.');
    const mime=Buffer.from(raw,'base64url').toString('utf8');
    expect(mime).toContain('To: synthetic@example.com\r\n');
    expect(mime).toContain('Content-Transfer-Encoding: base64');
    expect(()=>gmailRawMessage('reviewer@example.com','synthetic@example.com','Hello\r\nBcc: other@example.com','Body')).toThrow();
  });
  it('requires complete reviewer-edited draft fields',()=>{
    const base={applicationId:crypto.randomUUID(),id:crypto.randomUUID(),messageType:'rejection',recipient:'',subject:'Application',body:'A proper rejection message.'};
    expect(draftSchema.safeParse(base).success).toBe(false);
    expect(draftSchema.safeParse({...base,recipient:'synthetic@example.com'}).success).toBe(true);
  });
  it('blocks a saved template with its instruction placeholder still present',()=>{
    expect(hasTemplatePlaceholder(emailTemplate('clarification','Synthetic Applicant','Support').body)).toBe(true);
    expect(hasTemplatePlaceholder(emailTemplate('rejection','Synthetic Applicant','Support').body)).toBe(false);
  });
  it('distinguishes confirmed delivery, definite rejection, and unknown delivery',async()=>{
    const success=await deliverViaGmail('token','raw',async()=>new Response(JSON.stringify({id:'gmail-id'}),{status:200}));
    const denied=await deliverViaGmail('token','raw',async()=>new Response('',{status:403}));
    const timeout=await deliverViaGmail('token','raw',async()=>{throw new Error('timeout');});
    expect(success).toEqual({status:'sent',messageId:'gmail-id',errorCategory:null});
    expect(denied.status).toBe('failed');
    expect(timeout.status).toBe('uncertain');
  });
});
