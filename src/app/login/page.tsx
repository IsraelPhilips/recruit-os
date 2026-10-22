import Link from 'next/link';
import {login} from '../actions';
import {SubmitButton} from '../components/SubmitButton';

export default async function Login({searchParams}:{searchParams:Promise<{error?:string}>}){
  const params=await searchParams;
  return <div className="auth-shell"><div className="auth-copy"><span className="eyebrow">RecruitOS workspace</span><h1>Make every application easier to review.</h1><p>Bring Google Form submissions, source-grounded CV evidence, and human next actions into one place.</p><div className="auth-feature">Private CV storage · Clear evidence · Human decisions</div></div><div className="card auth-card"><span className="eyebrow">Welcome back</span><h2>Sign in to RecruitOS</h2><p>Use the recruiter account authorized for this workspace.</p>{params.error&&<div className="notice notice-error" role="alert">Sign in failed. Check your email and password, then try again.</div>}<form action={login} className="form-stack"><label>Email address<input name="email" type="email" autoComplete="email" required placeholder="you@example.com"/></label><label>Password<input name="password" type="password" autoComplete="current-password" required placeholder="Enter your password"/></label><SubmitButton pendingText="Signing in...">Sign in</SubmitButton></form><p className="auth-footer">Need to create your account? <Link href="/signup">Sign up</Link></p></div></div>;
}
