import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const results=[];
for(const kind of ['custom','bulk'])for(const scenario of ['storage-denied','backend-rejected','backend-disabled']){
 const file=`src/components/${kind}-order/${kind==='custom'?'Custom':'Bulk'}OrderWizard.tsx`;
 const ast=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let submit;function find(n){if(ts.isFunctionDeclaration(n)&&n.name?.text==='submit')submit=n;ts.forEachChild(n,find)}find(ast);
 if(!submit)throw Error('Actual submit handler missing');
 const accepted={publicRequestId:(kind==='custom'?'CR':'BR')+'-2026-ABC123',submittedAt:'2026-11-01T00:00:00Z'};
 const trace={api:0,push:[],errors:[],busy:false};
 const ctx={exports:{},sessionStorage:{setItem(){throw new DOMException('Storage denied','SecurityError')},getItem(){throw new DOMException('Storage denied','SecurityError')}},DOMException,JSON,Date,Map,
  setSubmitError:s=>trace.errors.push(s),setMessage:s=>trace.errors.push(s),setSubmitting:b=>trace.busy=b,
  customOrderBackendConfigured:scenario!=='backend-disabled',productionReady:scenario!=='backend-disabled',siteConfig:{catalogMode:'live'},
  files:[],getValues:()=>({}),values:{accuracyConsent:true,items:[{quantity:1}]},
  customOrderSubmissionSchema:{safeParse:()=>({success:true,data:{}})},bulkOrderSubmissionSchema:{safeParse:()=>({success:true,data:{}})},
  submitCustomRequest:async()=>{trace.api++;if(scenario==='backend-rejected')throw Error('Server rejected');return accepted},
  submitBulkRequest:async()=>{trace.api++;if(scenario==='backend-rejected')throw Error('Server rejected');return accepted},
  requestIdRef:{current:null},ensureDraft:async()=> 'synthetic-draft',clearSafeDraft(){},clearSafeBulkDraft(){},router:{push:p=>trace.push.push(p)},errorText:e=>e.message,goToStep(){},
 };
 vm.createContext(ctx);
 const helper=fs.readFileSync('src/lib/requestConfirmation.ts','utf8');vm.runInContext(ts.transpileModule(helper,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,ctx);
 Object.assign(ctx,ctx.exports);ctx.exports={};
 vm.runInContext(ts.transpileModule('export '+submit.getText(ast),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,ctx);
 await ctx.exports.submit();
 const receipt=ctx.parseRequestConfirmation(ctx.readSessionConfirmation(`eshantva-${kind}-order-confirmation`),kind);
 const pass=scenario==='storage-denied'?trace.push.length===1&&trace.errors.every(x=>!x)&&!trace.busy&&receipt?.publicRequestId===accepted.publicRequestId:trace.push.length===0&&Boolean(trace.errors.filter(Boolean).length)&&!trace.busy&&!receipt;
 results.push({kind,scenario,pass,api_calls:trace.api,navigated:trace.push.length===1,busy:trace.busy});
}
const report={scope:'ACTUAL_SUBMIT_HANDLER_CONTROL_FLOW_WITH_FAULT_INJECTED_API_AND_STORAGE; not live forms',results};
fs.writeFileSync(`execution-evidence/V7_REPAIRED_EXECUTION_01NOV2026/SUBMISSION_STORAGE_${process.argv.includes('--baseline')?'BEFORE':'AFTER'}.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(results.some(x=>!x.pass))process.exitCode=1;
