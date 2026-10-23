import {it,expect} from 'vitest';
import fs from 'node:fs';
import {extractText} from './extract';

it('extracts the synthetic text PDF',async()=>{
  const value=await extractText(fs.readFileSync('evaluation/fixtures/synthetic-cv.pdf'),'application/pdf');
  expect(value).toContain('TypeScript API');
  expect(value).toContain('Synthetic Applicant');
});
