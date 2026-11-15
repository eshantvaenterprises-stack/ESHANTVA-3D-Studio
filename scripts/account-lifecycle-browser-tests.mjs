import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { build } from 'esbuild';
import { chromium } from 'playwright';

// Component/SDK-boundary fault injection only. No real Auth, JWT or mail claims.
const out = path.resolve(process.env.ESHANTVA_TEST_EVIDENCE_DIR || 'execution-evidence/V7_REPAIRED_EXECUTION_01NOV2026');
fs.mkdirSync(out, { recursive: true });
const authStub = `
const user = (id='a') => ({id,email:id+'@example.invalid',is_anonymous:false,user_metadata:{}});
window.testUser=user;
window.testListeners=[];
window.testEmit=(event,session)=>window.testListeners.forEach(fn=>fn(event,session));
window.testUpdateReject=false;window.testUpdatePending=false;window.testUpdateResolve=null;
window.testUpdateError=false;
window.testInitialResolve=null;
export const isAnonymousUser=u=>Boolean(u?.is_anonymous);
export function getAccountSession(){
 if(new URLSearchParams(location.search).has('reject'))return Promise.reject(new Error('injected session failure'));
 if(new URLSearchParams(location.search).has('sessionerror'))return Promise.resolve({data:{session:null},error:new Error('injected SDK session error')});
 if(new URLSearchParams(location.search).has('race'))return new Promise(resolve=>window.testInitialResolve=()=>resolve({data:{session:{user:user('a')}}}));
 return Promise.resolve({data:{session:new URLSearchParams(location.search).has('signedout')?null:{user:user('a')}}});
}
export function onAccountAuthChange(fn){window.testListeners.push(fn);return {data:{subscription:{unsubscribe(){window.testListeners=window.testListeners.filter(x=>x!==fn)}}}};}
export function updateAccountPassword(){
 if(window.testUpdateReject)return Promise.reject(new Error('injected password failure'));
 if(window.testUpdateError)return Promise.resolve({error:new Error('injected SDK password error')});
 if(window.testUpdatePending)return new Promise(resolve=>window.testUpdateResolve=()=>resolve({error:null}));
 return Promise.resolve({error:null});
}
export const signOutAccount=async()=>{window.testEmit('SIGNED_OUT',null);return {error:null}};
export const signInAccount=async()=>({error:null});
export const createAccount=async()=>({error:null,session:null,conversionStarted:false});
export const requestPasswordReset=async()=>({error:null});`;
const entry = `import React from 'react';import{createRoot}from'react-dom/client';
import{AccountResetClient}from'./src/components/account/AccountResetClient.tsx';
import{AccountAccessClient}from'./src/components/account/AccountAccessClient.tsx';
const root=createRoot(document.getElementById('root'));window.testUnmount=()=>root.unmount();
root.render(new URLSearchParams(location.search).has('access')?<AccountAccessClient/>:<AccountResetClient/>);`;
const bundle = await build({ stdin:{contents:entry,resolveDir:process.cwd(),loader:'jsx'},bundle:true,write:false,format:'iife',jsx:'automatic',plugins:[{name:'isolated-auth',setup(b){
 b.onResolve({filter:/^@\/lib\/accountAuth$/},()=>({path:'auth',namespace:'test'}));
 b.onResolve({filter:/AccountVisual$/},()=>({path:'visual',namespace:'test'}));
 b.onResolve({filter:/^next\/link$/},()=>({path:'link',namespace:'test'}));
 b.onResolve({filter:/^@\/config\/retailVisibility$/},()=>({path:'retail',namespace:'test'}));
 b.onLoad({filter:/.*/,namespace:'test'},({path:p})=>({contents:p==='auth'?authStub:p==='visual'?'export const AccountVisual=()=>null;':p==='retail'?'export const retailVisibility={isInternal:false};':`import React from'react';export default function Link({children,...props}){return React.createElement('a',props,children)}`,loader:'jsx',resolveDir:process.cwd()}));
}}]});
const server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/app.js'?'text/javascript':'text/html');res.end(req.url==='/app.js'?bundle.outputFiles[0].text:'<!doctype html><div id="root"></div><script src="/app.js"></script>')});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
let browser;
try{browser=await chromium.launch({headless:true,...(process.env.ESHANTVA_CHROMIUM_EXECUTABLE ? {executablePath:process.env.ESHANTVA_CHROMIUM_EXECUTABLE} : {channel:'msedge'})});}catch(e){server.close();throw e;}
const context=await browser.newContext();
let externalRequests=0;
await context.route('**/*',route=>{if(new URL(route.request().url()).origin!==origin){externalRequests++;return route.abort();}return route.continue();});
const results=[];
async function run(name,fn){const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));try{await fn(page);if(errors.length)throw Error('Unhandled browser error');results.push({name,status:'PASS',unhandled_errors:errors.length});}catch(e){results.push({name,status:'FAIL',error:e.message,unhandled_errors:errors.length});}finally{await page.close();}}
async function open(page,query=''){await page.goto(origin+'/?mode=finish-account'+query);await page.waitForFunction(()=>window.testListeners?.length>0);}
async function submit(page){await page.getByLabel('New password',{exact:true}).fill('SyntheticPass123');await page.getByLabel('Confirm password',{exact:true}).fill('SyntheticPass123');await page.getByRole('button',{name:'Save new password'}).click();}
try{
 await run('reset-session-rejection-exits-loading',async page=>{await open(page,'&reject=1');await page.waitForFunction(()=>!document.body.textContent.includes('Verifying reset session'),{},{timeout:2000});if(!await page.getByRole('alert').isVisible())throw Error('No safe session error shown');});
 await run('reset-signout-hides-password-form',async page=>{await open(page);await page.getByRole('button',{name:'Save new password'}).waitFor();await page.evaluate(()=>window.testEmit('SIGNED_OUT',null));await page.waitForFunction(()=>!document.querySelector('form'),{},{timeout:2000});});
 await run('reset-anonymous-refresh-hides-password-form',async page=>{await open(page);await page.getByRole('button',{name:'Save new password'}).waitFor();await page.evaluate(()=>window.testEmit('TOKEN_REFRESHED',{user:{id:'g',is_anonymous:true}}));await page.waitForFunction(()=>!document.querySelector('form'),{},{timeout:2000});});
 await run('reset-submit-rejection-reenables-form',async page=>{await open(page);await page.evaluate(()=>window.testUpdateReject=true);await submit(page);await page.waitForFunction(()=>document.querySelector('button[type=submit],form button.button-primary')?.disabled===false,{},{timeout:2000});if(!await page.getByRole('alert').isVisible())throw Error('No safe mutation error');});
 await run('reset-stale-initial-session-cannot-restore-old-user',async page=>{await open(page,'&race=1');await page.evaluate(()=>{window.testEmit('SIGNED_OUT',null);window.testInitialResolve();});await page.waitForTimeout(100);if(await page.locator('form').count())throw Error('Stale initial session restored password form');});
 await run('access-session-rejection-exits-loading',async page=>{await open(page,'&access=1&reject=1');await page.waitForFunction(()=>!document.body.textContent.includes('Checking account session'),{},{timeout:2000});if(!await page.getByRole('alert').isVisible())throw Error('No safe initial-session error');});
 await run('access-latest-auth-event-wins-initial-session-race',async page=>{await open(page,'&access=1&race=1');await page.evaluate(()=>{window.testEmit('SIGNED_IN',{user:window.testUser('b')});window.testInitialResolve();});await page.waitForTimeout(100);if(!await page.getByText('b@example.invalid',{exact:true}).isVisible())throw Error('Old initial user overwrote latest auth identity');});
 await run('reset-permanent-session-success-positive-control',async page=>{await open(page);await submit(page);await page.getByText('Password updated.',{exact:false}).waitFor({timeout:2000});});
 await run('reset-anonymous-session-negative-control',async page=>{await open(page,'&signedout=1');await page.waitForTimeout(50);if(await page.locator('form').count())throw Error('Signed-out user received form');});
 await run('reset-old-mutation-cannot-complete-after-account-switch',async page=>{await open(page);await page.evaluate(()=>window.testUpdatePending=true);await submit(page);await page.evaluate(()=>{window.testEmit('SIGNED_IN',{user:window.testUser('b')});window.testUpdateResolve();});await page.waitForTimeout(100);if(await page.getByText('Password updated.',{exact:false}).count())throw Error('Old mutation success leaked into new account');if(await page.getByLabel('New password',{exact:true}).inputValue())throw Error('Old password survived account switch');if(!await page.getByRole('button',{name:'Save new password'}).isEnabled())throw Error('Stale busy state');});
 await run('reset-returned-sdk-error-reenables-form',async page=>{await open(page);await page.evaluate(()=>window.testUpdateError=true);await submit(page);await page.getByRole('alert').waitFor();if(!await page.getByRole('button',{name:'Save new password'}).isEnabled())throw Error('SDK error left form busy');});
 await run('access-returned-sdk-session-error',async page=>{await open(page,'&access=1&sessionerror=1');await page.getByRole('alert').waitFor();if(await page.getByText('Checking account session…').count())throw Error('SDK error left loading');});
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
const report={scope:'ISOLATED_REACT_BROWSER_CONTRACT_TEST; injected Auth helpers, not live A/B',external_requests:externalRequests,results};
const name=process.argv.includes('--baseline')?'ACCOUNT_BROWSER_BEFORE.json':'ACCOUNT_BROWSER_AFTER.json';
fs.writeFileSync(path.join(out,name),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
if(results.some(r=>r.status==='FAIL')||externalRequests)process.exitCode=1;
