import http from 'node:http';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {build} from 'esbuild';
import {chromium} from 'playwright';
const fixture=JSON.parse(process.env.ESHANTVA_LOCAL_BROWSER_FIXTURE);delete process.env.ESHANTVA_LOCAL_BROWSER_FIXTURE;
let js;const results=[];let external=0;
const server=http.createServer(async(req,res)=>{
 if(req.url.startsWith('/auth/v1/')){
  let body='';for await(const chunk of req)body+=chunk;
  const args=['exec','-i',fixture.db,'curl','-sS','--max-time','15','-D','-','-X',req.method,'-H','Content-Type: application/json'];
  if(req.headers.authorization)args.push('-H','Authorization: '+req.headers.authorization);
  if(body)args.push('--data-binary','@-');args.push('http://auth:9999/'+req.url.slice('/auth/v1/'.length));
  const child=spawn('docker',args,{windowsHide:true});let data='';child.stdout.on('data',b=>data+=b);child.stderr.resume();child.stdin.end(body);child.on('close',()=>{const split=data.indexOf('\r\n\r\n'),head=data.slice(0,split),status=Number(head.match(/HTTP\/[^ ]+ (\d+)/)?.[1]||502);res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(data.slice(split+4));});return;
 }
 res.setHeader('Content-Type',req.url==='/app.js'?'text/javascript':'text/html');res.end(req.url==='/app.js'?js:'<!doctype html><div id="root"></div><script src="/app.js"></script>');
});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
const entry=`import React from 'react';import{createRoot}from'react-dom/client';import{AccountAccessClient}from'./src/components/account/AccountAccessClient.tsx';import{getSupabaseBrowserClient}from'./src/lib/supabaseBrowser.ts';window.realAuth=getSupabaseBrowserClient;createRoot(document.getElementById('root')).render(<AccountAccessClient/>);`;
const b=await build({stdin:{contents:entry,loader:'jsx',resolveDir:process.cwd()},bundle:true,write:false,jsx:'automatic',plugins:[{name:'local-config-only',setup(b){
 b.onResolve({filter:/^@\/config\/supabase$/},()=>({path:'public',namespace:'test'}));b.onResolve({filter:/^@\/config\/(site|retailVisibility)$/},a=>({path:a.path.includes('retail')?'retail':'site',namespace:'test'}));b.onResolve({filter:/AccountVisual$/},()=>({path:'visual',namespace:'test'}));b.onResolve({filter:/^next\/link$/},()=>({path:'link',namespace:'test'}));
 b.onLoad({filter:/.*/,namespace:'test'},a=>({contents:a.path==='public'?`export const supabasePublicConfig={url:${JSON.stringify(origin)},publishableKey:'isolated-public-key'};`:a.path==='site'?`export const siteConfig={basePath:''};`:a.path==='retail'?`export const retailVisibility={isInternal:false};`:a.path==='visual'?`export const AccountVisual=()=>null;`:`import React from'react';export default function Link({children,...p}){return React.createElement('a',p,children)}`,loader:'jsx',resolveDir:process.cwd()}));
}}]});js=b.outputFiles[0].text;
let browser;
try{browser=await chromium.launch({channel:'msedge',headless:true});const context=await browser.newContext();await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():(external++,r.abort()));const page=await context.newPage();page.on('pageerror',()=>results.push({case:'unhandled-browser-error',pass:false}));
 await page.goto(origin);await page.getByRole('button',{name:'Sign in',exact:true}).last().waitFor();
 for(let i=0;i<2;i++){
  await page.getByLabel('Email',{exact:true}).fill(fixture.users[i].email);await page.getByLabel('Password',{exact:true}).fill(fixture.users[i].password);await page.getByRole('button',{name:'Sign in',exact:true}).last().click();await page.getByText(fixture.users[i].email,{exact:true}).waitFor({timeout:10000});
  const ok=await page.evaluate(async id=>{const{data,error}=await window.realAuth().auth.getUser();return !error&&data.user?.id===id},fixture.users[i].id);results.push({case:'browser-real-sdk-server-getUser-'+i,pass:ok});
  await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.getByLabel('Email',{exact:true}).waitFor();const cleared=await page.evaluate(async()=>!(await window.realAuth().auth.getSession()).data.session);results.push({case:'browser-real-logout-session-cleared-'+i,pass:cleared});
 }
 results.push({case:'two-distinct-real-identities',pass:fixture.users[0].id!==fixture.users[1].id});
}catch(e){results.push({case:'runtime',pass:false,error_class:e.name});}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
const report={scope:'ACTUAL_ACCOUNT_COMPONENT_BROWSER_SDK_GOTRUE_LOOPBACK_NOT_MAIN',external_requests:external,auth_helpers_mocked:false,config_and_visual_stubs_only:true,results};fs.writeFileSync('execution-evidence/V7_POST_CHAT_01NOV2026/g3/BROWSER_REAL_AUTH_EXECUTION.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(external||results.some(x=>!x.pass))process.exitCode=1;
