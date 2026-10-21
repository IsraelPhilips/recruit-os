import {it,expect} from 'vitest';
import fs from 'node:fs';
import {analyzeWithNvidia} from './nvidia';

it.skipIf(process.env.RUN_NVIDIA_INTEGRATION!=='1')('analyzes a synthetic CV with a real hosted model',async()=>{
  for(const line of fs.readFileSync('.env.local','utf8').split(/\r?\n/)){const i=line.indexOf('=');if(i>0&&line.slice(i+1))process.env[line.slice(0,i)]=line.slice(i+1);}
  const source='Synthetic CV. Alex Sample built TypeScript web applications at Example Studio in 2025. Contact: alex@example.test.';
  const result=await analyzeWithNvidia(source,[{id:'typescript',label:'TypeScript experience',kind:'required'}]);
  expect(result.output.evidence).toHaveLength(1);
  expect(result.output.evidence[0].criterion_id).toBe('typescript');
  expect(result.output.evidence[0].status).not.toBe('REQUIRES_REVIEW');
  expect(result.output.evidence[0].excerpt).toBeTruthy();
},60000);
