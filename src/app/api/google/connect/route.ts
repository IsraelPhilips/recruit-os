import {NextResponse} from 'next/server';
import {randomBytes} from 'node:crypto';
import {recruiter} from '@/lib/auth';
import {authorizationUrl} from '@/lib/google';
export async function GET(){if(!await recruiter())return NextResponse.redirect(new URL('/login',process.env.APP_ORIGIN||'http://localhost:3000'));const state=randomBytes(32).toString('hex');const res=NextResponse.redirect(authorizationUrl(state));res.cookies.set('google_oauth_state',state,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:600});return res;}
