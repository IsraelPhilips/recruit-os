import {NextRequest,NextResponse} from 'next/server';
import {recruiter} from '@/lib/auth';
import {encryptToken,exchangeCode,GMAIL_SEND_SCOPE,googleJson} from '@/lib/google';
import {adminDb} from '@/lib/supabase';
export async function GET(req:NextRequest){
  const origin=process.env.APP_ORIGIN||'http://localhost:3000';const user=await recruiter();if(!user)return NextResponse.redirect(new URL('/login',origin));
  const mail=req.cookies.get('google_oauth_purpose')?.value==='mail';
  const returnApp=req.cookies.get('google_oauth_return_app')?.value;
  const mailPath=(status:string)=>returnApp&&/^[0-9a-f-]{36}$/i.test(returnApp)?`/applications/${returnApp}?mail=${status}`:`/applications?mail=${status}`;
  const expected=req.cookies.get('google_oauth_state')?.value;const state=req.nextUrl.searchParams.get('state'),code=req.nextUrl.searchParams.get('code');
  const done=(path:string)=>{const res=NextResponse.redirect(new URL(path,origin));res.cookies.delete('google_oauth_state');res.cookies.delete('google_oauth_purpose');res.cookies.delete('google_oauth_return_app');return res;};
  if(!expected||state!==expected||!code)return done(mail?mailPath('oauth_state'):'/google?error=oauth_state');
  try{
    const token=await exchangeCode(code);if(!token.refresh_token)return done(mail?mailPath('no_refresh_token'):'/google?error=no_refresh_token');
    if(mail){
      if(!token.scope?.split(' ').includes(GMAIL_SEND_SCOPE))return done(mailPath('scope_denied'));
      const identity=await googleJson<{email?:string;email_verified?:boolean}>(token.access_token,'https://openidconnect.googleapis.com/v1/userinfo');
      if(!identity.email||!identity.email_verified)return done(mailPath('identity'));
      const {error}=await adminDb().from('gmail_connections').upsert({recruiter_id:user.id,email:identity.email,refresh_token_ciphertext:encryptToken(token.refresh_token),token_error:null,connected_at:new Date().toISOString()},{onConflict:'recruiter_id'});
      if(error)throw error;return done(mailPath('connected'));
    }
    const {error}=await adminDb().from('google_connections').upsert({recruiter_id:user.id,refresh_token_ciphertext:encryptToken(token.refresh_token),token_error:null},{onConflict:'recruiter_id'});
    if(error)throw error;return done('/google');
  }catch{return done(mail?mailPath('oauth_exchange'):'/google?error=oauth_exchange');}
}
