import { z } from 'zod';

export const intakeSchema = z.object({
  form_id: z.string().min(1).max(200), response_id: z.string().min(1).max(200),
  job_reference: z.string().min(1).max(100), submitted_at: z.iso.datetime(),
  candidate: z.object({ full_name: z.string().min(1).max(200), email: z.union([z.email(),z.literal('')]), phone: z.string().max(50).nullable(), portfolio_url: z.url().nullable(), cover_letter: z.string().max(10000).nullable(), consent: z.literal(true) }),
  cv: z.object({ name: z.string().min(1).max(255), mime_type: z.enum(['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document']), content_base64: z.string().min(1).max(4_300_000) })
});
export const criterionSchema = z.object({ id: z.string().min(1).max(50), label: z.string().min(1).max(200), kind: z.enum(['required','preferred','informational']) });
export const criteriaSchema = z.array(criterionSchema).min(1).max(10);
export const analysisSchema = z.object({
  profile: z.object({ full_name: z.string().nullable(), email: z.string().nullable(), phone: z.string().nullable(), skills: z.array(z.string()), history: z.array(z.string()), warnings: z.array(z.string()) }),
  evidence: z.array(z.object({ criterion_id: z.string(), status: z.enum(['EVIDENCE_FOUND','PARTIAL_EVIDENCE','NOT_EVIDENCED','AMBIGUOUS','REQUIRES_REVIEW']), excerpt: z.string().nullable(), location: z.string().nullable(), reasoning: z.string(), question: z.string().nullable() }))
});
export type Intake = z.infer<typeof intakeSchema>;
export type Analysis = z.infer<typeof analysisSchema>;

export const evidenceStatusSchema=z.enum(['EVIDENCE_FOUND','PARTIAL_EVIDENCE','NOT_EVIDENCED','AMBIGUOUS','REQUIRES_REVIEW']);
export function validatedEvidenceCorrection(status:unknown,excerpt:unknown,source:string){
  const approved=evidenceStatusSchema.parse(status);const quote=z.string().max(1500).parse(excerpt).trim();
  if(['EVIDENCE_FOUND','PARTIAL_EVIDENCE'].includes(approved)&&!quote)throw new Error('A supporting source excerpt is required');
  if(quote&&!source.replace(/\s+/g,' ').includes(quote.replace(/\s+/g,' ')))throw new Error('Excerpt must appear in the source document');
  const page=quote?source.split('\f').findIndex(p=>p.replace(/\s+/g,' ').includes(quote.replace(/\s+/g,' '))):-1;
  return {status:approved,excerpt:quote||null,location:page>=0?`Page ${page+1}`:null};
}

export function validateDocument(input: Intake['cv']) {
  const bytes = Buffer.from(input.content_base64, 'base64');
  if (bytes.length > 3_000_000 || bytes.length < 20 || bytes.toString('base64') !== input.content_base64.replace(/\s/g,'')) throw new Error('Invalid or oversized file');
  if (input.mime_type === 'application/pdf' && !bytes.subarray(0,5).equals(Buffer.from('%PDF-'))) throw new Error('PDF signature mismatch');
  if (input.mime_type.includes('wordprocessingml') && !bytes.subarray(0,2).equals(Buffer.from('PK'))) throw new Error('DOCX signature mismatch');
  return bytes;
}

export function grounded(analysis: Analysis, source: string, criteria: z.infer<typeof criteriaSchema>): Analysis {
  const compact = (v:string) => v.replace(/\s+/g,' ').trim();
  const corpus = compact(source);
  return { ...analysis, evidence: criteria.map(c => {
    const item = analysis.evidence.find(e => e.criterion_id === c.id);
    if (!item) return {criterion_id:c.id,status:'REQUIRES_REVIEW' as const,excerpt:null,location:null,reasoning:'Model omitted criterion.',question:null};
    if (!item.excerpt) return {...item, status: item.status === 'EVIDENCE_FOUND' || item.status === 'PARTIAL_EVIDENCE' ? 'REQUIRES_REVIEW' as const : item.status, location:null};
    if (!corpus.includes(compact(item.excerpt))) return {...item,status:'REQUIRES_REVIEW' as const,excerpt:null,location:null,reasoning:'Model excerpt could not be verified.',question:item.question};
    const page = source.split('\f').findIndex(p => compact(p).includes(compact(item.excerpt!)));
    return {...item,location:page >= 0 ? `Page ${page+1}` : null};
  })};
}
