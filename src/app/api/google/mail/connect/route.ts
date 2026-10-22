import {NextRequest,NextResponse} from 'next/server';
import {randomBytes} from 'node:crypto';
import {recruiter} from '@/lib/auth';
import {authorizationUrl,GMAIL_SEND_SCOPE} from '@/lib/google';

export async function GET(req:NextRequest){
  const origin=process.env.APP_ORIGIN||'http://localhost:3000';
  if(!await recruiter())return NextResponse.redirect(new URL('/login',origin));
  const state=randomBytes(32).toString('hex');
  const res=NextResponse.redirect(authorizationUrl(state,['openid','email',GMAIL_SEND_SCOPE],false));
  res.cookies.set('google_oauth_state',state,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:600});
  res.cookies.set('google_oauth_purpose','mail',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:600});
  const applicationId=req.nextUrl.searchParams.get('application_id');
  if(applicationId&&/^[0-9a-f-]{36}$/i.test(applicationId))res.cookies.set('google_oauth_return_app',applicationId,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:600});
  return res;
}
