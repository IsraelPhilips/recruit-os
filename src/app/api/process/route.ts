import { NextRequest,NextResponse } from 'next/server';
import { applicationInWorkspace,recruiter,workspaceForUser } from '@/lib/auth';
import { adminDb } from '@/lib/supabase';
import { processApplication } from '@/lib/process';
export const runtime='nodejs';
export async function POST(req:NextRequest){
  const user=await recruiter();if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});const workspaceId=await workspaceForUser(user);
  const body=await req.json().catch(()=>null);
  if(!body || typeof body.application_id!=='string' || !/^[0-9a-f-]{36}$/i.test(body.application_id)) return NextResponse.json({error:'Invalid application ID'},{status:400});
  if(!await applicationInWorkspace(adminDb(),body.application_id,workspaceId))return NextResponse.json({error:'Not found'},{status:404});
  return NextResponse.json(await processApplication(body.application_id));
}
