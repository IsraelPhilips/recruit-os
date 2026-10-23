import mammoth from 'mammoth';
import {createRequire} from 'node:module';
const nodeRequire=createRequire(import.meta.url);

export async function extractText(bytes: Buffer, mime: string): Promise<string> {
  let value: string;
  try {
    if (mime === 'application/pdf') {
      const pdf = nodeRequire('pdf-parse/lib/pdf-parse.js') as (data:Uint8Array,options:unknown)=>Promise<{text:string}>;
      value = (await pdf(Uint8Array.from(bytes), {pagerender: async (page: {getTextContent: () => Promise<{items: Array<{str?:string;hasEOL?:boolean;transform?:number[]}>}>}) => {
        const content = await page.getTextContent();
        let output='';let previousY:number|null=null;let breakLine=false;
        for(const item of content.items){
          const part=item.str?.trim();if(!part)continue;
          const y=item.transform?.[5];
          if(output){output+=breakLine||typeof y==='number'&&previousY!==null&&Math.abs(y-previousY)>2?'\n':' ';}
          output+=part;
          if(typeof y==='number')previousY=y;
          breakLine=Boolean(item.hasEOL);
        }
        return output;
      }})).text.replace(/\n\n/g,'\f');
    } else value = (await mammoth.extractRawText({buffer:bytes})).value;
  } catch (error) { throw new Error('Document is corrupted, protected, or unsupported',{cause:error}); }
  if (value.trim().length < 30) throw new Error('No readable text found. Scanned documents need manual review.');
  return value.slice(0,100_000);
}
