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

it('sends malformed provider statuses and object-shaped warnings to recruiter review safely',async()=>{
  process.env.NVIDIA_API_KEY='synthetic-test-key';
  const modelOutput={profile:{full_name:'A Candidate',email:null,phone:null,skills:[{name:'TypeScript'}],history:[],warnings:[{message:'Conflicting dates: 2020 to 2022 and 2021 to 2023'}]},evidence:[{criterion_id:'c1',status:'UNSURE',excerpt:'Built a TypeScript API',location:null,reasoning:'Claim',question:null}]};
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(modelOutput)}}]})}));
  const result=await analyzeWithNvidia('A Candidate. Built a TypeScript API. Conflicting dates: 2020 to 2022 and 2021 to 2023.',[{id:'c1',label:'TypeScript API experience',kind:'required'}]);
  expect(result.output.profile.skills).toEqual(['name: TypeScript']);
  expect(result.output.profile.warnings[0]).toContain('2020 to 2022');
  expect(result.output.evidence[0]).toMatchObject({status:'REQUIRES_REVIEW',excerpt:'Built a TypeScript API'});
});

it('does not give a self-reported familiarity statement full evidence credit',async()=>{
  process.env.NVIDIA_API_KEY='synthetic-test-key';
  const modelOutput={profile:{full_name:null,email:null,phone:null,skills:['TypeScript'],history:[],warnings:[]},evidence:[{criterion_id:'c1',status:'EVIDENCE_FOUND',excerpt:'Familiar with TypeScript.',location:null,reasoning:'Claim',question:null}]};
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(modelOutput)}}]})}));
  const result=await analyzeWithNvidia('Familiar with TypeScript.',[{id:'c1',label:'Build TypeScript services',kind:'required'}]);
  expect(result.output.evidence[0]).toMatchObject({status:'AMBIGUOUS',excerpt:'Familiar with TypeScript.'});
});

it('keeps completed coursework at partial skill evidence even when the model overstates it',async()=>{
  process.env.NVIDIA_API_KEY='synthetic-test-key';
  const excerpt='Completed a TypeScript fundamentals course.';
  const modelOutput={profile:{full_name:null,email:null,phone:null,skills:[],history:[],warnings:[]},evidence:[{criterion_id:'skill',status:'EVIDENCE_FOUND',excerpt,location:null,reasoning:'Course completed.',question:null}]};
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(modelOutput)}}]})}));
  const result=await analyzeWithNvidia(excerpt,[{id:'skill',label:'Build TypeScript services',kind:'required',category:'skill'}]);
  expect(result.output.evidence[0]).toMatchObject({status:'PARTIAL_EVIDENCE',excerpt});
});

it('does not turn absent evidence into review or reading into practical experience',async()=>{
  process.env.NVIDIA_API_KEY='synthetic-test-key';
  const modelOutput={profile:{full_name:null,email:null,phone:null,skills:[],history:[],warnings:[]},evidence:[{criterion_id:'reliability',status:'REQUIRES_REVIEW',excerpt:null,location:null,reasoning:'Unclear.',question:null},{criterion_id:'experience',status:'AMBIGUOUS',excerpt:'Read a blog about reliability.',location:null,reasoning:'Some exposure.',question:null}]};
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(modelOutput)}}]})}));
  const result=await analyzeWithNvidia('Handled customer billing questions. Read a blog about reliability.',[{id:'reliability',label:'Operate reliable production services',kind:'required',category:'experience'},{id:'experience',label:'Relevant backend/API experience',kind:'required',category:'experience'}]);
  expect(result.output.evidence.map(row=>row.status)).toEqual(['NOT_EVIDENCED','NOT_EVIDENCED']);
});

it('fills profile omissions from verified criterion excerpts and flags explicit duplicate-role date conflicts',async()=>{
  process.env.NVIDIA_API_KEY='synthetic-test-key';
  const source='Built TypeScript service APIs. Backend Engineer at Northstar, 2020 to 2022. The same role is listed elsewhere as 2021 to 2023.';
  const modelOutput={profile:{full_name:null,email:null,phone:null,skills:[],history:[],warnings:[]},evidence:[{criterion_id:'skill',status:'EVIDENCE_FOUND',excerpt:'Built TypeScript service APIs.',location:null,reasoning:'Applied skill.',question:null}]};
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(modelOutput)}}]})}));
  const result=await analyzeWithNvidia(source,[{id:'skill',label:'Build TypeScript services',kind:'required',category:'skill'}]);
  expect(result.output.profile.skills).toContain('Built TypeScript service APIs.');
  expect(result.output.profile.warnings).toEqual([expect.stringContaining('Possible conflicting dates for the same role: 2020 to 2022; 2021 to 2023')]);
});
