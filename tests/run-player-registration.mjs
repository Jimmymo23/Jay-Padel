import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const scratch=await mkdtemp(join(tmpdir(),'jay-padel-registration-tests-'));
try{const output=join(scratch,'registration.mjs');await build({entryPoints:['tests/player-registration.test.ts'],outfile:output,bundle:true,platform:'node',format:'esm',define:{'import.meta.env.DEV':'false'},plugins:[{name:'bindings',setup(b){b.onResolve({filter:/^(cloudflare:workers|next\/(headers|navigation))$/},args=>({path:args.path,namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},args=>({contents:args.path==='cloudflare:workers'?'export const env={JAY_PADEL_ADMIN_EMAIL:"admin@test.invalid",get DB(){return globalThis.evidenceTestDB}};':args.path==='next/headers'?'export async function headers(){return globalThis.evidenceTestHeaders;}':'export function redirect(){throw Error("Unexpected redirect")}',loader:'js'}));}}]});await import(pathToFileURL(output).href);}finally{await rm(scratch,{recursive:true,force:true});}
