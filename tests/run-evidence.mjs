import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const scratch=await mkdtemp(join(tmpdir(),'jay-padel-evidence-tests-'));
try{
 for(const name of ['evidence','evidence-routes']){
  const output=join(scratch,name+'.mjs');
  await build({entryPoints:['tests/'+name+'.test.ts'],outfile:output,bundle:true,platform:'node',format:'esm',define:{'import.meta.env.DEV':'true'},plugins:[{name:'test-bindings',setup(b){
   b.onResolve({filter:/^(cloudflare:workers|next\/(headers|navigation))$/},args=>({path:args.path,namespace:'test'}));
   b.onLoad({filter:/.*/,namespace:'test'},args=>({contents:args.path==='next/navigation'?'export function redirect(){throw Error("Unexpected redirect")};':args.path==='cloudflare:workers'?'export const env={get DB(){return globalThis.evidenceTestDB}};':'export async function headers(){return globalThis.evidenceTestHeaders;}',loader:'js'}));
  }}]});
  await import(pathToFileURL(output).href);
 }
}finally{await rm(scratch,{recursive:true,force:true});}
