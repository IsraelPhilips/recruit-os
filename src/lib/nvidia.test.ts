import {afterEach,expect,it,vi} from 'vitest';
import {analyzeWithNvidia} from './nvidia';

afterEach(()=>{vi.unstubAllGlobals();delete process.env.NVIDIA_API_KEY;});

it('validates and grounds hosted Nemotron output before review',async()=>{
  process.env.NVIDIA_API_KEY='synthetic-test-key';
  const modelOutput={profile:{full_name:null,email:null,phone:null,skills:[],history:[],warnings:[]},evidence:[{criterion_id:'c1',status:'EVIDENCE_FOUND',excerpt:'Invented experience',location:'Page 9',reasoning:'Claim',question:null}]};
  const fetchMock=vi.fn().mockResolvedValue({ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(modelOutput)}}],usage:{total_tokens:50}})});
  vi.stubGlobal('fetch',fetchMock);
  const result=await analyzeWithNvidia('Document says TypeScript.',[{id:'c1',label:'TypeScript',kind:'required'}]);
  expect(fetchMock).toHaveBeenCalledOnce();
  expect(result.model).toContain('nemotron');
  expect(result.output.evidence[0]).toMatchObject({status:'REQUIRES_REVIEW',excerpt:null,location:null});
});
