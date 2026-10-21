import {NextRequest,NextResponse} from 'next/server';
import {pullNotifications} from '@/lib/pubsub';
import {syncForm,renewDueWatches} from '@/lib/google-sync';
import {adminDb} from '@/lib/supabase';
import {processPendingApplications} from '@/lib/process';
export const runtime='nodejs';
export async function GET(req:NextRequest){
  const secret=process.env.CRON_SECRET;if(!secret||req.headers.get('authorization')!==`Bearer ${secret}`)return NextResponse.json({error:'Unauthorized'},{status:401});
  const results:Array<{form_id:string;status:string}>=[];let renewed=0;
  try {
    renewed=await renewDueWatches();const {messages,ack}=await pullNotifications();const ackIds:string[]=[];const forms=new Set<string>();
    for(const item of messages){const id=item.message.attributes?.formId;if(item.message.attributes?.eventType==='RESPONSES'&&id)forms.add(id);else ackIds.push(item.ackId);}
    for(const formId of forms){try{await syncForm(formId);results.push({form_id:formId,status:'synced'});for(const item of messages)if(item.message.attributes?.formId===formId)ackIds.push(item.ackId);}catch{results.push({form_id:formId,status:'failed'});}}
    await ack(ackIds);
    // Reconciliation covers throttled or missed notifications, within a bounded per-run batch.
    const {data:stale}=await adminDb().from('google_forms').select('form_id').order('last_sync_at',{ascending:true,nullsFirst:true}).limit(3);
    for(const form of stale||[])if(!forms.has(form.form_id)){try{await syncForm(form.form_id);results.push({form_id:form.form_id,status:'reconciled'});}catch{results.push({form_id:form.form_id,status:'failed'});}}
    const processing=await processPendingApplications(1);
    return NextResponse.json({renewed,notifications:messages.length,results,processing});
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Sync error',renewed,results},{status:503});}
}
