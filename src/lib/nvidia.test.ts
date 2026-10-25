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

it('retries malformed provider statuses and normalizes object-shaped profile values safely',async()=>{
  process.env.NVIDIA_API_KEY='synthetic-test-key';
  const modelOutput={profile:{full_name:'A Candidate',email:null,phone:null,skills:[{name:'TypeScript'}],history:[],warnings:[{message:'Conflicting dates: 2020 to 2022 and 2021 to 2023'}]},evidence:[{criterion_id:'c1',status:'UNSURE',excerpt:'Built a TypeScript API',location:null,reasoning:'Claim',question:null}]};
  const corrected={...modelOutput,evidence:[{criterion_id:'c1',status:'EVIDENCE_FOUND',excerpt:'Built a TypeScript API',location:null,reasoning:'Direct work evidence.',question:null}]};
  vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(modelOutput)}}]})}).mockResolvedValueOnce({ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(corrected)}}]})}));
  const result=await analyzeWithNvidia('A Candidate. Built a TypeScript API. Conflicting dates: 2020 to 2022 and 2021 to 2023.',[{id:'c1',label:'TypeScript API experience',kind:'required'}]);
  expect(result.output.profile.skills).toEqual(['name: TypeScript']);
  expect(result.output.profile.warnings[0]).toContain('2020 to 2022');
  expect(result.output.evidence[0]).toMatchObject({status:'EVIDENCE_FOUND',excerpt:'Built a TypeScript API'});
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

it('keeps explicit completed coursework partial when Nemotron calls it ambiguous',async()=>{
  process.env.NVIDIA_API_KEY='synthetic-test-key';
  const excerpt='Completed a TypeScript fundamentals course.';
  const output={profile:{full_name:null,email:null,phone:null,skills:['Familiar with TypeScript'],history:[],warnings:[]},evidence:[{criterion_id:'skill',status:'AMBIGUOUS',excerpt,location:null,reasoning:'Vague familiarity.',question:null}]};
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(output)}}]})}));
  const result=await analyzeWithNvidia(excerpt,[{id:'skill',label:'Build TypeScript services',kind:'required',category:'skill'}]);
  expect(result.output.evidence[0]).toMatchObject({status:'PARTIAL_EVIDENCE',excerpt});
});

it('limits production API operation to partial reliability evidence without reliability practices',async()=>{
  process.env.NVIDIA_API_KEY='synthetic-test-key';
  const excerpt='Built TypeScript services and operated production APIs.';
  const output={profile:{full_name:null,email:null,phone:null,skills:[],history:[],warnings:[]},evidence:[{criterion_id:'production_reliability',status:'EVIDENCE_FOUND',excerpt,location:null,reasoning:'Production API operation.',question:null}]};
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(output)}}]})}));
  const result=await analyzeWithNvidia(excerpt,[{id:'production_reliability',label:'Operate reliable production services',kind:'required',category:'experience'}]);
  expect(result.output.evidence[0]).toMatchObject({status:'PARTIAL_EVIDENCE',excerpt});
});

it('preserves explicit review states and does not treat reading as practical experience',async()=>{
  process.env.NVIDIA_API_KEY='synthetic-test-key';
  const modelOutput={profile:{full_name:null,email:null,phone:null,skills:[],history:[],warnings:[]},evidence:[{criterion_id:'reliability',status:'REQUIRES_REVIEW',excerpt:null,location:null,reasoning:'Unclear.',question:null},{criterion_id:'experience',status:'AMBIGUOUS',excerpt:'Read a blog about reliability.',location:null,reasoning:'Some exposure.',question:null}]};
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(modelOutput)}}]})}));
  const result=await analyzeWithNvidia('Handled customer billing questions. Read a blog about reliability.',[{id:'reliability',label:'Operate reliable production services',kind:'required',category:'experience'},{id:'experience',label:'Relevant backend/API experience',kind:'required',category:'experience'}]);
  expect(result.output.evidence.map(row=>row.status)).toEqual(['REQUIRES_REVIEW','NOT_EVIDENCED']);
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

it('retries omitted criteria with only the missing criterion and grounded relevant CV text',async()=>{
  process.env.NVIDIA_API_KEY='synthetic-test-key';
  const criteria=[{id:'typescript',label:'Build TypeScript services',kind:'required' as const,category:'skill' as const},{id:'reliability',label:'Operate reliable production services',kind:'required' as const,category:'experience' as const}];
  const profile={full_name:null,email:null,phone:null,skills:[],history:[],warnings:[]};
  const first={profile,evidence:[{criterion_id:'typescript',status:'EVIDENCE_FOUND',excerpt:'Built a TypeScript API.',location:null,reasoning:'Built it.',question:null}]};
  const retry={profile,evidence:[{criterion_id:'reliability',status:'PARTIAL_EVIDENCE',excerpt:'Joined an on-call rotation.',location:null,reasoning:'Relevant exposure.',question:null}]};
  const fetchMock=vi.fn()
    .mockResolvedValueOnce({ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(first)}}],usage:{prompt_tokens:20,completion_tokens:10}})})
    .mockResolvedValueOnce({ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(retry)}}],usage:{prompt_tokens:10,completion_tokens:5}})});
  vi.stubGlobal('fetch',fetchMock);
  const result=await analyzeWithNvidia('Built a TypeScript API. Joined an on-call rotation.',criteria);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  const retryBody=JSON.parse(fetchMock.mock.calls[1][1].body);
  const retryInput=JSON.parse(retryBody.messages[1].content);
  expect(retryInput.criteria.map((item:{id:string})=>item.id)).toEqual(['reliability']);
  expect(retryInput.document).toContain('Joined an on-call rotation.');
  expect(result.output.evidence.map(item=>item.status)).toEqual(['EVIDENCE_FOUND','PARTIAL_EVIDENCE']);
  expect(result.output.evidence.every(item=>!item.excerpt||result.output.evidence.length===2)).toBe(true);
  expect(result.usage).toMatchObject({prompt_tokens:30,completion_tokens:15,retry_model_calls:1,retried_criteria:1});
});

it('keeps a criterion in review when a focused retry remains missing or malformed',async()=>{
  process.env.NVIDIA_API_KEY='synthetic-test-key';
  const criteria=[{id:'typescript',label:'Build TypeScript services',kind:'required' as const,category:'skill' as const}];
  const profile={full_name:null,email:null,phone:null,skills:[],history:[],warnings:[]};
  const reply=(evidence:unknown)=>({ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({profile,evidence})}}]})});
  vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(reply([])).mockResolvedValueOnce(reply([{criterion_id:'typescript',status:'UNSURE',excerpt:null}])));
  const result=await analyzeWithNvidia('Built a TypeScript API.',criteria);
  expect(result.output.evidence).toHaveLength(1);
  expect(result.output.evidence[0]).toMatchObject({criterion_id:'typescript',status:'REQUIRES_REVIEW',excerpt:null});
});

it('retries duplicate criterion rows and returns exactly one item per requested ID',async()=>{
  process.env.NVIDIA_API_KEY='synthetic-test-key';
  const criteria=[{id:'typescript',label:'Build TypeScript services',kind:'required' as const,category:'skill' as const},{id:'api',label:'Maintain backend APIs',kind:'required' as const,category:'experience' as const}];
  const profile={full_name:null,email:null,phone:null,skills:[],history:[],warnings:[]};
  const initial={profile,evidence:[{criterion_id:'typescript',status:'EVIDENCE_FOUND',excerpt:'Built a TypeScript service.',reasoning:'Applied work.'},{criterion_id:'typescript',status:'NOT_EVIDENCED',excerpt:null,reasoning:'Duplicate.'},{criterion_id:'api',status:'EVIDENCE_FOUND',excerpt:'Maintained a REST endpoint.',reasoning:'Relevant work.'}]};
  const retry={profile,evidence:[{criterion_id:'typescript',status:'EVIDENCE_FOUND',excerpt:'Built a TypeScript service.',reasoning:'Applied work.'}]};
  const fetchMock=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(initial)}}]})}).mockResolvedValueOnce({ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(retry)}}]})});
  vi.stubGlobal('fetch',fetchMock);
  const result=await analyzeWithNvidia('Built a TypeScript service. Maintained a REST endpoint.',criteria);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(result.output.evidence.map(item=>item.criterion_id)).toEqual(['typescript','api']);
  expect(result.output.evidence.map(item=>item.status)).toEqual(['EVIDENCE_FOUND','EVIDENCE_FOUND']);
});

it('rechecks the full requested set when the model returns an unsupported criterion ID',async()=>{
  process.env.NVIDIA_API_KEY='synthetic-test-key';
  const criterion={id:'typescript',label:'Build TypeScript services',kind:'required' as const,category:'skill' as const};
  const profile={full_name:null,email:null,phone:null,skills:[],history:[],warnings:[]};
  const row={criterion_id:'typescript',status:'EVIDENCE_FOUND',excerpt:'Built a TypeScript API.',location:null,reasoning:'Applied work.',question:null};
  const first={profile,evidence:[row,{...row,criterion_id:'unknown'}]};
  const fetchMock=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(first)}}]})}).mockResolvedValueOnce({ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({profile,evidence:[row]})}}]})});
  vi.stubGlobal('fetch',fetchMock);
  const result=await analyzeWithNvidia('Built a TypeScript API.',[criterion]);
  const retryInput=JSON.parse(JSON.parse(fetchMock.mock.calls[1][1].body).messages[1].content);
  expect(retryInput.criteria.map((item:{id:string})=>item.id)).toEqual(['typescript']);
  expect(result.output.evidence).toHaveLength(1);
  expect(result.output.evidence[0].status).toBe('EVIDENCE_FOUND');
});

it('does not treat a source-grounded familiarity line as absent skill evidence',async()=>{
  process.env.NVIDIA_API_KEY='synthetic-test-key';
  const source='Familiar with TypeScript.';
  const criteria=[{id:'typescript',label:'Build TypeScript services',kind:'required' as const,category:'skill' as const}];
  const profile={full_name:null,email:null,phone:null,skills:['Familiar with TypeScript'],history:[],warnings:[]};
  const reply={ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({profile,evidence:[{criterion_id:'typescript',status:'NOT_EVIDENCED',excerpt:null,location:null,reasoning:'No evidence.',question:null}]})}}]})};
  vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(reply).mockResolvedValueOnce(reply));
  const result=await analyzeWithNvidia(source,criteria);
  expect(result.output.evidence[0]).toMatchObject({status:'AMBIGUOUS',excerpt:'Familiar with TypeScript'});
});
