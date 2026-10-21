import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { publicDb } from './supabase';

export async function recruiter() {
  const token = (await cookies()).get('recruitos_token')?.value;
  if (!token) return null;
  const {data:{user},error} = await publicDb().auth.getUser(token);
  return !error && user?.email?.toLowerCase() === process.env.RECRUITER_EMAIL?.toLowerCase() ? user : null;
}
export async function requireRecruiter() { const user = await recruiter(); if (!user) redirect('/login'); return user; }
