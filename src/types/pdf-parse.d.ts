declare module 'pdf-parse' {
  type Page = { getTextContent(): Promise<{items: Array<{str?: string}>}> };
  type Result = {text:string;numpages:number};
  export default function parse(data: Buffer, options?: {pagerender?: (page:Page)=>Promise<string>}): Promise<Result>;
}
declare module 'pdf-parse/lib/pdf-parse.js' {
  const parse: (data:Buffer,options?:unknown)=>Promise<{text:string;numpages:number}>;
  export default parse;
}
