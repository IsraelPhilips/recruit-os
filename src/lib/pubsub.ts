import {createSign} from 'node:crypto';

function base64url(value:string){return Buffer.from(value).toString('base64url');}
async function serviceToken(){
  const raw=process.env.GOOGLE_PUBSUB_SERVICE_ACCOUNT_JSON_BASE64;if(!raw)throw new Error('Pub/Sub service account missing');
  const account=JSON.parse(Buffer.from(raw,'base64').toString('utf8')) as {client_email:string;private_key:string};const now=Math.floor(Date.now()/1000);
  const header=base64url(JSON.stringify({alg:'RS256',typ:'JWT'}));const payload=base64url(JSON.stringify({iss:account.client_email,scope:'https://www.googleapis.com/auth/pubsub',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600}));const unsigned=`${header}.${payload}`;
  const signer=createSign('RSA-SHA256');signer.update(unsigned);const assertion=`${unsigned}.${signer.sign(account.private_key).toString('base64url')}`;
  const res=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion}),cache:'no-store'});
  if(!res.ok)throw new Error(`Service account token HTTP ${res.status}`);return (await res.json()).access_token as string;
}
type Message={ackId:string;message:{attributes?:{formId?:string;eventType?:string};messageId?:string}};
export async function pullNotifications(){
  const subscription=process.env.GOOGLE_PUBSUB_SUBSCRIPTION;if(!subscription)throw new Error('Pub/Sub subscription missing');const token=await serviceToken();
  const endpoint=`https://pubsub.googleapis.com/v1/${subscription}`;
  const res=await fetch(`${endpoint}:pull`,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({maxMessages:20}),cache:'no-store'});
  if(!res.ok)throw new Error(`Pub/Sub pull HTTP ${res.status}`);
  const messages=((await res.json()).receivedMessages||[]) as Message[];
  return {messages,ack:async(ids:string[])=>{if(!ids.length)return;const result=await fetch(`${endpoint}:acknowledge`,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({ackIds:ids}),cache:'no-store'});if(!result.ok)throw new Error(`Pub/Sub ack HTTP ${result.status}`);}};
}
