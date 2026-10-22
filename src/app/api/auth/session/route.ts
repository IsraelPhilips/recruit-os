import {NextRequest,NextResponse} from 'next/server';
import {publicDb} from '@/lib/supabase';

export async function POST(request:NextRequest){
  const origin=request.headers.get('origin');
  if(origin&&origin!==request.nextUrl.origin)return NextResponse.json({error:'Origin mismatch'},{status:403});
  const body=await request.json().catch(()=>null);
  if(!body||typeof body.access_token!=='string'||body.access_token.length>5000)return NextResponse.json({error:'Invalid session'},{status:400});
  const {data:{user},error}=await publicDb().auth.getUser(body.access_token);
  if(error||!user||user.email?.toLowerCase()!==process.env.RECRUITER_EMAIL?.toLowerCase())return NextResponse.json({error:'Unauthorized'},{status:401});
  const response=NextResponse.json({ok:true});
  response.cookies.set('recruitos_token',body.access_token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:3600});
  return response;
}
