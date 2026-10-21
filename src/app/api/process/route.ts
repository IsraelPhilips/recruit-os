import { NextRequest,NextResponse } from 'next/server';
import { recruiter } from '@/lib/auth';
import { processApplication } from '@/lib/process';
export const runtime='nodejs';
export async function POST(req:NextRequest){
  const authorized=Boolean(await recruiter());
  if(!authorized) return NextResponse.json({error:'Unauthorized'},{status:401});
  const body=await req.json().catch(()=>null);
  if(!body || typeof body.application_id!=='string' || !/^[0-9a-f-]{36}$/i.test(body.application_id)) return NextResponse.json({error:'Invalid application ID'},{status:400});
  return NextResponse.json(await processApplication(body.application_id));
}
