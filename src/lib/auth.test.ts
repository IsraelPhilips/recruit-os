import {describe,expect,it,vi} from 'vitest';
import {applicationInWorkspace} from './auth';
import type {adminDb} from './supabase';

function dbFor({jobWorkspace}:{jobWorkspace:string|null}){
  return {from:(table:string)=>({select:()=>({eq:(_column:string,value:string)=>table==='applications'?{maybeSingle:async()=>({data:value==='app-1'?{id:'app-1',job_id:'job-1'}:null})}:{eq:(_workspaceColumn:string,workspaceId:string)=>({maybeSingle:async()=>({data:jobWorkspace===workspaceId?{id:'job-1'}:null})})}})})} as unknown as ReturnType<typeof adminDb>;
}

describe('workspace ownership checks',()=>{
  it('allows an application only when its job belongs to the signed-in workspace',async()=>{
    expect(await applicationInWorkspace(dbFor({jobWorkspace:'workspace-a'}),'app-1','workspace-a')).toMatchObject({id:'app-1'});
    expect(await applicationInWorkspace(dbFor({jobWorkspace:'workspace-b'}),'app-1','workspace-a')).toBeNull();
  });
  it('denies missing application records',async()=>{
    const db={from:()=>({select:()=>({eq:()=>({maybeSingle:vi.fn().mockResolvedValue({data:null})})})})} as unknown as ReturnType<typeof adminDb>;
    expect(await applicationInWorkspace(db,'missing','workspace-a')).toBeNull();
  });
});
