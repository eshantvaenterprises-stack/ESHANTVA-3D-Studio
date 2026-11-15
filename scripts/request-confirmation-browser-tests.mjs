import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {build} from 'esbuild';
import {chromium} from 'playwright';
const out=path.resolve('execution-evidence/V7_REPAIRED_EXECUTION_01NOV2026');
const entry=`import React from'react';import{createRoot}from'react-dom/client';
import{CustomOrderSuccess}from'./src/components/custom-order/CustomOrderSuccess.tsx';
import{BulkOrderSuccess}from'./src/components/bulk-order/BulkOrderSuccess.tsx';
import{writeSessionConfirmation}from'./src/lib/requestConfirmation.ts';
const q=new URLSearchParams(location.search),kind=q.get('kind');
if(q.has('blocked'))Object.defineProperty(window,'sessionStorage',{get(){throw new DOMException('Storage disabled','SecurityError')}});
else if(q.has('raw'))sessionStorage.setItem('eshantva-'+(kind==='bulk'?'bulk':'custom')+'-order-confirmation',q.get('raw'));
if(q.has('memory'))writeSessionConfirmation('eshantva-'+(kind==='bulk'?'bulk':'custom')+'-order-confirmation',JSON.parse(q.get('raw')));
createRoot(document.getElementById('root')).render(kind==='bulk'?<BulkOrderSuccess/>:<CustomOrderSuccess/>);`;
const bundle=await build({stdin:{contents:entry,resolveDir:process.cwd(),loader:'jsx'},bundle:true,write:false,jsx:'automatic',plugins:[{name:'ui-stubs',setup(b){b.onResolve({filter:/^next\/link$/},()=>({path:'link',namespace:'stub'}));b.onResolve({filter:/^@\/config\/retailVisibility$/},()=>({path:'retail',namespace:'stub'}));b.onLoad({filter:/.*/,namespace:'stub'},a=>({contents:a.path==='retail'?'export const retailVisibility={isInternal:false}':"import React from'react';export default function Link({children,...p}){return React.createElement('a',p,children)}",loader:'jsx',resolveDir:process.cwd()}));}}]});
const server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/app.js'?'text/javascript':'text/html');res.end(req.url==='/app.js'?bundle.outputFiles[0].text:'<!doctype html><div id="root"></div><script src="/app.js"></script>')});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{browser=await chromium.launch({headless:true,...(process.env.ESHANTVA_CHROMIUM_EXECUTABLE ? {executablePath:process.env.ESHANTVA_CHROMIUM_EXECUTABLE} : {channel:'msedge'})});}catch(e){server.close();throw e;}
const origin=`http://127.0.0.1:${server.address().port}`,context=await browser.newContext(),results=[];let external=0;
await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():(external++,r.abort()));
try{for(const kind of ['custom','bulk'])for(const mode of ['invalid-date','invalid-shape','blocked-storage','missing','valid','accepted-memory-receipt']){
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.name));
 const good={publicRequestId:(kind==='custom'?'CR':'BR')+'-2026-ABC123',submittedAt:'2026-11-01T00:00:00Z',summary:'1 item'};
 const q=new URLSearchParams({kind});if(mode==='blocked-storage')q.set('blocked','1');else if(mode!=='missing')q.set('raw',JSON.stringify(['valid','accepted-memory-receipt'].includes(mode)?good:mode==='invalid-date'?{...good,submittedAt:'not-a-date'}:{publicRequestId:{bad:true}}));
 if(mode==='accepted-memory-receipt'){q.set('blocked','1');q.set('memory','1');}
 try{await page.goto(origin+'/?'+q);await page.getByText(['valid','accepted-memory-receipt'].includes(mode)?good.publicRequestId:'No verified submission was found in this browser session.',{exact:false}).waitFor({timeout:2000});if(errors.length)throw Error('Unhandled render error');results.push({kind,mode,status:'PASS',errors:0});}catch{results.push({kind,mode,status:'FAIL',errors:errors.length});}finally{await page.close();}
}}finally{await browser.close();await new Promise(r=>server.close(r));}
const report={scope:'ISOLATED_REACT_RENDERING_STORAGE_FAULT_TEST',external_requests:external,results};
fs.writeFileSync(path.join(out,process.argv.includes('--baseline')?'CONFIRMATION_BROWSER_BEFORE.json':'CONFIRMATION_BROWSER_AFTER.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
if(external||results.some(r=>r.status!=='PASS'))process.exitCode=1;
