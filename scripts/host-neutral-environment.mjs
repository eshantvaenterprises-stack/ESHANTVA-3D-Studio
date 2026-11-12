import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export const mainRef='lckcibqosxgwxycvqzxp';
export const overrides={CONTACT_REQUEST:'contact-request-api',CUSTOM_REQUEST:'custom-request-api',BULK_REQUEST:'bulk-request-api',CHECKOUT:'checkout-order-api',DASHBOARD:'customer-dashboard-api',ADMIN:'admin-api',ADMIN_ARTIFACT:'admin-artifact-api'};
export function parseEnv(text){
 const env={};for(const line of text.split(/\r?\n/)){const m=line.match(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);if(!m)continue;let v=m[2];if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))v=v.slice(1,-1);else v=v.replace(/\s+#.*$/,'');env[m[1]]=v;}return env;
}
function publicKeyClass(v){
 if(v.startsWith('sb_publishable_')&&/^sb_publishable_[A-Za-z0-9_-]+$/.test(v))return {kind:'publishable',safe:true};
 try{const p=JSON.parse(Buffer.from(v.split('.')[1],'base64url').toString());return {kind:'legacy-jwt',safe:v.split('.').length===3&&p.role==='anon'&&(p.ref===undefined||p.ref===mainRef)&&(p.exp===undefined||(typeof p.exp==='number'&&Number.isFinite(p.exp)&&p.exp>Date.now()/1000))};}catch{return {kind:'unknown',safe:false};}
}
export function validateEnvironment(env,{profile='local',approvedOrigin=null,auth=null,edgeOrigins=null}={}){
 const findings=[];const issue=(name,code)=>findings.push({name,code});
 if(!['local','approved-host'].includes(profile))issue('PROFILE','UNKNOWN_PROFILE');
 for(const [k,v] of Object.entries(env))if(k.startsWith('NEXT_PUBLIC_')&&v){
  if(/SECRET|SERVICE_ROLE|PASSWORD|PRIVATE_KEY|SMTP|RATE_LIMIT_SALT/.test(k)||/sb_secret_|-----BEGIN .*PRIVATE KEY-----/.test(v))issue(k,'PRIVATE_VALUE_IN_PUBLIC_ENV');
  try{if(v.split('.').length===3&&JSON.parse(Buffer.from(v.split('.')[1],'base64url')).role==='service_role')issue(k,'SERVICE_ROLE_IN_PUBLIC_ENV');}catch{/* A non-JWT public value is normal. */}
 }
 let url;try{url=new URL(env.NEXT_PUBLIC_SUPABASE_URL);if(url.href!==`https://${mainRef}.supabase.co/`)issue('NEXT_PUBLIC_SUPABASE_URL','WRONG_MAIN_TARGET');}catch{issue('NEXT_PUBLIC_SUPABASE_URL','MISSING_OR_INVALID');}
 const key=publicKeyClass(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'');if(!key.safe)issue('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','MISSING_OR_NOT_BROWSER_KEY');
 if((env.NEXT_PUBLIC_RETAIL_SURFACE||'public').toLowerCase()!=='public')issue('NEXT_PUBLIC_RETAIL_SURFACE','RETAIL_MUST_REMAIN_PUBLIC_HIDDEN');
 if(env.NEXT_PUBLIC_RECRUITMENT_PORTAL_ENABLED&&!['false',''].includes(env.NEXT_PUBLIC_RECRUITMENT_PORTAL_ENABLED))issue('NEXT_PUBLIC_RECRUITMENT_PORTAL_ENABLED','CANDIDATE_PORTAL_MUST_STAY_CLOSED');
 for(const [k,v] of Object.entries(env))if(k.startsWith('NEXT_PUBLIC_')&&/RECRUITMENT.*FUNCTION_URL/.test(k)&&v)issue(k,'CLOSED_CANDIDATE_ENDPOINT_CONFIGURED');
 for(const [suffix,slug] of Object.entries(overrides)){
  const k=`NEXT_PUBLIC_SUPABASE_${suffix}_FUNCTION_URL`,v=env[k];if(!v)continue;
  try{const u=new URL(v);if(!url||u.origin!==url.origin||u.pathname!==`/functions/v1/${slug}`||u.search||u.hash||u.username||u.password)issue(k,'NONCANONICAL_OR_FOREIGN_ENDPOINT');}catch{issue(k,'INVALID_ENDPOINT');}
 }
 const base=env.NEXT_PUBLIC_BASE_PATH||'';if(base&&base!=='/'&&(!/^\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*\/?$/.test(base)))issue('NEXT_PUBLIC_BASE_PATH','INVALID_BASE_PATH');
 if(env.NEXT_PUBLIC_SITE_URL){try{const s=new URL(env.NEXT_PUBLIC_SITE_URL);if(s.username||s.password||s.search||s.hash||s.pathname!=='/'||!['https:','http:'].includes(s.protocol))issue('NEXT_PUBLIC_SITE_URL','INVALID_SITE_ORIGIN');}catch{issue('NEXT_PUBLIC_SITE_URL','INVALID_SITE_ORIGIN');}}
 const remaining=[];
 if(profile==='approved-host'){
  let origin;try{origin=new URL(approvedOrigin);if(origin.protocol!=='https:'||origin.origin!==approvedOrigin||origin.username||origin.password)throw Error();}catch{issue('APPROVED_ORIGIN','EXPLICIT_HTTPS_ORIGIN_REQUIRED');}
  if(origin&&env.NEXT_PUBLIC_SITE_URL!==origin.origin)issue('NEXT_PUBLIC_SITE_URL','DOES_NOT_MATCH_APPROVED_ORIGIN');
  if(!auth)remaining.push('NONSECRET_EFFECTIVE_AUTH_REDIRECT_INVENTORY');
  else if(origin){
   const callbacks=[`${origin.origin}${base.replace(/\/$/,'')}/account/?confirmed=1`,`${origin.origin}${base.replace(/\/$/,'')}/account/reset/`,`${origin.origin}${base.replace(/\/$/,'')}/account/reset/?mode=finish-account`];
   if(auth.siteUrl!==origin.origin||!Array.isArray(auth.redirects)||!callbacks.every(u=>auth.redirects.includes(u)))issue('AUTH_URL_CONFIGURATION','EXACT_CALLBACK_COVERAGE_MISSING');
  }
  if(!edgeOrigins)remaining.push('NONSECRET_EFFECTIVE_EDGE_ORIGIN_INVENTORY');
  else if(origin)for(const k of ['CONTACT_ALLOWED_ORIGINS','CUSTOM_ORDER_ALLOWED_ORIGINS','BULK_ORDER_ALLOWED_ORIGINS','DASHBOARD_ALLOWED_ORIGINS','ADMIN_ALLOWED_ORIGINS'])if(!Array.isArray(edgeOrigins[k])||!edgeOrigins[k].includes(origin.origin))issue(k,'APPROVED_ORIGIN_NOT_ALLOWED');
  remaining.push('APPROVED_HOST_EFFECTIVE_BUILD_RUNTIME_AND_SCOPED_HTTP_SMOKE');
 }
 return {scope:profile==='local'?'LOCAL_PUBLIC_CONFIG_STRUCTURAL_CHECK_ONLY':'HOST_NEUTRAL_READINESS_CHECK_NOT_DEPLOYMENT',status:findings.length||remaining.length?'BLOCKED_EXACT':'PASS',findings,remaining,key_class:key.kind,values_exported:false,signature_or_live_key_verification:false,hosting_provider_selected:false};
}
export function inventory(){
 const rows=[];for(const base of ['app','src','supabase/functions'])for(const f of walk(base))if(/\.(?:ts|tsx)$/.test(f)){
  const text=fs.readFileSync(f,'utf8');for(const [i,line] of text.split('\n').entries())for(const match of line.matchAll(/(?:process\.env\.([A-Z0-9_]+)|Deno\.env\.get\(['"]([A-Z0-9_]+)['"]\))/g)){
   const name=match[1]||match[2];rows.push({name,location:`${f.replaceAll('\\','/')}:${i+1}`,boundary:name.startsWith('NEXT_PUBLIC_')?'BROWSER_BUILD_TIME_PUBLIC':'EDGE_SERVER_ONLY',candidate_domain:/RECRUITMENT|PUBLIC_SITE_ORIGINS|ADMIN_SITE_ORIGINS/.test(name),effective_value:'NOT_EXPORTED_OR_INFERRED'});
  }
 }return rows;
}
function* walk(dir){for(const d of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,d.name);if(d.isDirectory())yield* walk(f);else yield f;}}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{const env=parseEnv(fs.readFileSync(process.argv[2]||'.env.production.local','utf8'));const out=process.argv[3]||'execution-evidence/V7_POST_CHAT_01NOV2026/g5';fs.mkdirSync(out,{recursive:true});const r=validateEnvironment(env);fs.writeFileSync(path.join(out,'LOCAL_ENV_STRUCTURAL_CHECK.json'),JSON.stringify(r,null,2));fs.writeFileSync(path.join(out,'HOST_NEUTRAL_ENV_INVENTORY.json'),JSON.stringify(inventory(),null,2));console.log(JSON.stringify(r));if(r.status!=='PASS')process.exitCode=2;}catch{console.error('BLOCKED_EXACT: ENV_FILE_OR_TOOL_UNAVAILABLE; no values printed');process.exitCode=2;}
}
