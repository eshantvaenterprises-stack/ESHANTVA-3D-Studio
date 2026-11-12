import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=fs.readFileSync('supabase/functions/admin-api/index.ts','utf8').replace(/^import[^\n]+\r?\n/gm,'')+'\nglobalThis.testApi={readAdminPage,ordersList};';
const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const sandbox={Deno:{serve(){}},Response,TextEncoder,console};vm.runInNewContext(code,sandbox);
const rangeError={code:'PGRST103',message:'Requested range not satisfiable'};
let checks=0;
for(const total of [0,1,23]){
 const calls=[];
 const query={range:async(from,to)=>{calls.push([from,to]);return from?{data:null,error:rangeError,count:null}:{data:total?[{private:'must-not-escape'}]:[],error:null,count:total};}};
 const result=await sandbox.testApi.readAdminPage(query,99980,99999);
 assert.deepEqual(JSON.parse(JSON.stringify(result)),{data:[],error:null,count:total});assert.deepEqual(calls,[[99980,99999],[0,0]]);checks++;
}
for(const error of [{code:'42501'},{code:'PGRST301'},rangeError]){
 let calls=0;
 const query={range:async()=>{calls++;return{data:null,error,count:null};}};
 const result=await sandbox.testApi.readAdminPage(query,error===rangeError?0:20,39);
 assert.equal(result.error,error);assert.equal(calls,1);checks++;
}
{
 let calls=0;const denied={code:'42501'};
 const result=await sandbox.testApi.readAdminPage({range:async()=>++calls===1?{data:null,error:rangeError,count:null}:{data:null,error:denied,count:null}},20,39);
 assert.equal(result.error,denied);checks++;
}
{
 const filters=[];
 const chain={select(){return chain;},eq(k,v){filters.push([k,v]);return chain;},ilike(){return chain;},order(){return chain;},range:async(from)=>from?{data:null,error:rangeError,count:null}:{data:[{private:'recount-only'}],error:null,count:23}};
 const response=await sandbox.testApi.ordersList({from:()=>chain},{role:'ADMIN',display_name:'Fixture'},{page:5001,status:'under_review'},null);
 const body=await response.json();assert.equal(response.status,200);assert.deepEqual(body.data.items,[]);assert.equal(body.data.pagination.total,23);assert.equal(body.data.pagination.page,5000);assert.deepEqual(filters,[['status','under_review']]);assert.ok(!JSON.stringify(body).includes('recount-only'));checks++;
}
console.log(`ADMIN_PAGINATION_TESTS_PASS=${checks}; actual local helper/list function with PostgREST doubles`);
