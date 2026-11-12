import fs from 'node:fs';import path from 'node:path';import ts from 'typescript';
const dir='execution-evidence/V7_CONSOLIDATED_04NOV2026';
let source=fs.readFileSync('supabase/functions/website-features-api/index.ts','utf8').replace("'npm:@supabase/supabase-js@2.116.0'","'@supabase/supabase-js'");
for(const name of ['websiteContracts.ts','websiteSecurity.ts'])source=source.replace("'../_shared/"+name+"'",JSON.stringify(path.resolve('supabase/functions/_shared/'+name).replaceAll('\\','/')));
const file=dir+'/edge-typecheck-source.ts';fs.writeFileSync(file,`declare const Deno:{env:{get(key:string):string|undefined};serve(handler:(req:Request)=>Promise<Response>):void};\n`+source);
const program=ts.createProgram([file],{strict:true,noEmit:true,allowImportingTsExtensions:true,skipLibCheck:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,esModuleInterop:true});
const records=ts.getPreEmitDiagnostics(program).map(d=>({file:d.file?.fileName,line:d.file&&d.start!==undefined?d.file.getLineAndCharacterOfPosition(d.start).line+1:null,message:ts.flattenDiagnosticMessageText(d.messageText,' ')}));
fs.writeFileSync(dir+'/FIVE_FEATURE_EDGE_TYPECHECK.json',JSON.stringify({scope:'Actual new Edge source against installed pinned Supabase SDK with Deno API declaration; not Deno runtime',diagnostics:records},null,2));console.log(JSON.stringify(records));if(records.length)process.exitCode=1;
