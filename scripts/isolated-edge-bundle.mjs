import {build} from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
// Build trusted local handlers for disposable Deno runtime. No secrets or env values.
const out=path.resolve('execution-evidence/V7_REPAIRED_EXECUTION_01NOV2026/runtime/edge-bundle');
fs.mkdirSync(out,{recursive:true});
const slugs=['contact-request-api','custom-request-api','bulk-request-api','customer-dashboard-api','admin-api','admin-artifact-api','checkout-order-api'];
const entry=slugs.map((s,i)=>`import{handler as h${i}}from'./supabase/functions/${s}/index.ts';`).join('\n')+`\nconst handlers={${slugs.map((s,i)=>JSON.stringify(s)+':h'+i).join(',')}};Deno.serve(req=>{const slug=new URL(req.url).pathname.split('/').find(x=>handlers[x]);return slug?handlers[slug](req):new Response('Not found',{status:404})});`;
await build({stdin:{contents:entry,resolveDir:process.cwd(),loader:'ts'},outfile:path.join(out,'index.js'),bundle:true,format:'esm',platform:'browser',target:'es2022',minify:false,define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'local-deno-test',setup(b){
 b.onResolve({filter:/^npm:/},async args=>{const name=args.path.match(/^npm:(@[^/]+\/[^@]+|[^@]+)/)?.[1];if(!name)throw Error('Unsupported npm import');return b.resolve(name,{resolveDir:process.cwd(),kind:args.kind});});
 b.onLoad({filter:/supabase[\\/]functions[\\/][^\\/]+[\\/]index\.ts$/},args=>({contents:fs.readFileSync(args.path,'utf8').replace(/Deno\.serve\(/,'export const handler = ('),loader:'ts',resolveDir:path.dirname(args.path)}));
}}]});
fs.writeFileSync(path.join(out,'BUNDLE_SCOPE.json'),JSON.stringify({scope:'trusted local TS compiled for isolated Deno runtime only',slugs,production_changes:0,dependency_resolution:'installed npm packages; contact source npm pins differ from installed version; not exact deployed bundle parity'},null,2));
console.log('Isolated Edge bundle created; no network/runtime call');
