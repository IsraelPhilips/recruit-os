'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';

export default function Confirmed(){
  const [state,setState]=useState<'working'|'failed'>('working');
  useEffect(()=>{const token=new URLSearchParams(window.location.hash.slice(1)).get('access_token');if(!token){setState('failed');return;}window.history.replaceState(null,'',window.location.pathname);fetch('/api/auth/session',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({access_token:token})}).then(response=>{if(!response.ok)throw new Error('Confirmation failed');window.location.replace('/jobs');}).catch(()=>setState('failed'));},[]);
  return <div className="card auth-card centered-card"><span className="eyebrow">Account confirmation</span><h1>{state==='working'?'Signing you in...':'Could not confirm this link'}</h1><p>{state==='working'?'Please wait while RecruitOS completes your account setup.':'The link may have expired. Sign in or request a fresh confirmation email.'}</p>{state==='working'?<div className="loading-line"/>:<Link href="/login" className="button-secondary inline-button">Go to sign in</Link>}</div>;
}
