import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const ts=require('typescript');
const source=fs.readFileSync('supabase/functions/admin-api/index.ts','utf8');
const canonicalOrigin=fs.readFileSync('supabase/functions/_shared/canonicalOrigin.ts','utf8').replace(/^export /gm,'');
const script=ts.transpileModule(canonicalOrigin+'\n'+source.replace(/^import[^\n]+\r?\n/gm,''),{compilerOptions:{module:ts.ModuleKind.None,target:ts.ScriptTarget.ES2022}}).outputText;
let tests=0;
const ok=(label,condition)=>{assert.ok(condition,label);tests++;process.stdout.write(`PASS ${label}\n`)};
const UUID_A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const UUID_B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const FILE_A='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const FILE_B='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const REF_CUSTOM='CR-2026-ABC123';
const REF_BULK='BR-2026-ABC123';
const BLOB=new Uint8Array([80,75,3,4,17,49,255,0,102,202,17]);
const decoder=new TextDecoder();
function env(opts={}){
 const hits={queries:[],signed:[],audits:[],network:[],transitions:0,reports:[]};
 let handler;
 const mode=opts.mode||'custom', isBulk=mode==='bulk', name=isBulk?'bulk':'custom';
 const requestRow={id:UUID_B,customer_id:UUID_A,submitted_at:new Date().toISOString(),status:opts.draft?'DRAFT':'UNDER_REVIEW'};
 const file={id:FILE_A,customer_id:opts.crossOwner?UUID_B:UUID_A,request_id:UUID_B,bulk_request_id:UUID_B,storage_bucket:opts.wrongBucket?'public-files':`${name}-request-files`,storage_path:`${UUID_A}/${UUID_B}/${FILE_A}${isBulk?'.3mf':'.pdf'}`,original_filename:isBulk?'model.3mf':'plan.pdf',file_extension:isBulk?'.3mf':'.pdf',mime_type:isBulk?'application/octet-stream':'application/pdf',size_bytes:BLOB.length,upload_status:opts.notReady?'PREPARED':'READY',signature_status:opts.unverified?'UNVERIFIED_ALLOWED':'VALIDATED',scan_status:opts.quarantined?'QUARANTINED':opts.unscanned?'NOT_CONFIGURED':'CLEAN'};
 const isAdmin=opts.notAdmin?null:{role:opts.role||'ADMIN',display_name:'Test operator'};
 const resultFor=(table,filters)=>{
   if(table==='admin_users')return isAdmin;
   if(table==='custom_requests'||table==='bulk_requests')return filters['public_request_id']===(isBulk?REF_BULK:REF_CUSTOM)?requestRow:null;
   if(table==='custom_request_files'||table==='bulk_request_files')return filters.id===FILE_A&&filters[isBulk?'bulk_request_id':'request_id']===UUID_B&&filters.customer_id===file.customer_id?file:null;
   return null;
 };
 function createClient(url,key){
  return {
   auth:{getUser:async(token)=>({data:{user:opts.noAuth?null:{id:UUID_A,is_anonymous:false}},error:opts.noAuth?{}:null})},
   from(table){
    const filters={};const chain={select(_cols,options){if(options?.count==='exact')filters._count=true;return chain},gte(k,v){filters._gte={key:k,value:v};return chain},lt(k,v){filters._lt={key:k,value:v};return chain},eq(k,v){filters[k]=v;return chain},maybeSingle:async()=>{hits.queries.push({table,filters});return{data:resultFor(table,filters),error:null}},insert:async(row)=>{hits.audits.push({table,row});return{error:opts.auditError?new Error('audit failed'):null}},then(resolve,reject){hits.reports.push({table,filters});return Promise.resolve({count:opts.monthlyCountError?null:3,error:opts.monthlyCountError?new Error('count error'):null}).then(resolve,reject)}};
    return chain;
   },
   storage:{from(bucket){return{createSignedUrl:async(path,seconds)=>{hits.signed.push({bucket,path,seconds});return{data:{signedUrl:opts.externalSigned?'https://evil.test/storage/v1/object/sign/test':'https://internal.test/storage/v1/object/sign/test?token=opaque'},error:null}}}}},
  };
 }
 const sandbox={createClient,Deno:{env:{get:(k)=>({SUPABASE_URL:'https://internal.test',SUPABASE_PUBLISHABLE_KEY:'test-publishable',SUPABASE_SECRET_KEY:'test-secret',ADMIN_ALLOWED_ORIGINS:'https://admin.test'})[k]||''},serve(fn){handler=fn}},console:{error:()=>{}},fetch:async(u)=>{hits.network.push(String(u));return new Response(opts.storageFailure?null:BLOB,{status:opts.storageFailure?404:200,headers:opts.badLength?{'content-length':'10'}:{'content-length':String(BLOB.length)}})},Response,Request,URL,Date,Number,Set,Math,Uint8Array,TextEncoder,TextDecoder};
 vm.runInNewContext(script,sandbox,{timeout:1000});
 return{hits,call:async(action='request-attachment-read',disposition=isBulk?'download':'preview',extras={})=>handler(new Request('https://functions.test',{method:'POST',headers:{'origin':'https://admin.test','Content-Type':'application/json','Authorization':'Bearer test-user','apikey':'test-publishable'},body:JSON.stringify({action,mode,reference:isBulk?REF_BULK:REF_CUSTOM,fileReference:FILE_A,disposition,...extras})}))};
}
{
 const x=env();const r=await x.call();ok('ADMIN valid preview HTTP200',r.status===200);
 ok('Private byte equality',Buffer.from(await r.arrayBuffer()).equals(Buffer.from(BLOB)));
 ok('Preview PDF only for clean validated file',r.headers.get('content-type')==='application/pdf');
 ok('Signed URL is short-lived and server-side',x.hits.signed.length===1&&x.hits.signed[0].seconds===60);
 ok('No raw storage path in response headers',!JSON.stringify([...r.headers]).includes(UUID_B));
 ok('Private event audit precedes byte access',x.hits.audits.length===1&&x.hits.audits[0].row.event_type==='ADMIN_REQUEST_ATTACHMENT_ACCESS_ISSUED');
}
{
 const x=env({mode:'bulk',role:'STAFF',unverified:true,unscanned:true});const r=await x.call();
 ok('STAFF allowed read-only bulk download',r.status===200);
 ok('Bulk 3MF preserved binary exactly',Buffer.from(await r.arrayBuffer()).equals(Buffer.from(BLOB)));
 ok('Download forced attachment and non-sniffing',r.headers.get('content-disposition')?.startsWith('attachment;')&&r.headers.get('x-content-type-options')==='nosniff');
}
for(const [title,options,expected] of [
 ['Draft unavailable',{draft:true},404],['Quarantined denied',{quarantined:true},404],
 ['Not ready denied',{notReady:true},404],['Wrong bucket denied',{wrongBucket:true},404],
 ['Cross-owner denied',{crossOwner:true},404],['Ordinary user denied',{notAdmin:true},403],
 ['Missing JWT denied',{noAuth:true},403],['Preview unscanned denied',{unscanned:true},422],
 ['External signed link denied',{externalSigned:true},404],['Broken private file denied',{storageFailure:true},404],
 ['Wrong byte length denied',{badLength:true},404],['Audit failure fail closed',{auditError:true},500]
]){const x=env(options);const r=await x.call();ok(title,r.status===expected);ok(`${title}: no file bytes escaped`,(await r.text()).length!==BLOB.length||r.headers.get('content-type')!=='application/pdf');}
{
 const x=env({role:'STAFF'});const r=await x.call('custom-request-transition');
 ok('STAFF status mutation explicitly denied',r.status===403);
}

{
 const x=env();const r=await x.call('admin-monthly-operational-summary','download',{month:'2026-11'});
 const out=await r.json();ok('ADMIN monthly summary API succeeds',r.status===200&&out.ok===true);
 ok('Seven authoritative aggregate count queries',x.hits.reports.length===7&&Object.keys(out.data.counts).length===7);
 ok('All seven counts are server results, not defaults',Object.values(out.data.counts).every(x=>x===3));
 ok('IST month boundary converts to UTC exactly',out.data.windowUtc.start==='2026-10-31T18:30:00.000Z'&&out.data.windowUtc.end==='2026-11-30T18:30:00.000Z');
 ok('No customer PII returned in monthly report',!JSON.stringify(out).includes(UUID_A)&&!JSON.stringify(out).includes('storage_path'));
}
{
 const x=env({role:'STAFF'});const r=await x.call('admin-monthly-operational-summary','download',{month:'2026-11'});
 ok('STAFF denied monthly export',r.status===403&&x.hits.reports.length===0);
}
{
 const x=env();const r=await x.call('admin-monthly-operational-summary','download',{month:'2026-13'});
 ok('Invalid report month denied before queries',r.status===422&&x.hits.reports.length===0);
}
{
 const x=env({monthlyCountError:true});const r=await x.call('admin-monthly-operational-summary','download',{month:'2026-11'});
 ok('Report database error fails closed, never shows zero',r.status===500);
}
console.log(`LOCAL MOCKED EDGE HANDLER TESTS ${tests}/${tests} PASSED; NO LIVE SUPABASE OR BROWSER EXECUTION`);
