import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';

const errors = [];
const results = [];
const check = (name, ok, detail='') => {results.push({name,status:ok?'PASS':'FAIL',detail});if(!ok)errors.push(name+': '+detail)};
const root = process.cwd();
const files=[];
function walk(dir){for(const de of readdirSync(dir,{withFileTypes:true})){if(de.name==='.git'||de.name==='node_modules'||de.name==='.next'||de.name==='out'||de.name==='.vercel')continue;const p=join(dir,de.name);if(de.isDirectory())walk(p);else if(de.isFile())files.push(p)}}
walk(root);
const rels=files.map(x=>relative(root,x).replaceAll('\\','/'));
const disallowed=rels.filter(x=>/(^|\/)(\.env(?:\.|$)|private|secrets|execution-evidence|phase-c-results|governance|deferred-recruitment)(\/|$)/i.test(x)&&x!=='.env.example');
check('no_private_or_runtime_paths',disallowed.length===0,disallowed.slice(0,12).join(','));
const secretHits=[];
for(const file of files){if(!/\.(?:tsx?|jsx?|mjs|cjs|json|yml|yaml|toml|md|sql|txt|css|html)$/.test(file))continue;const content=readFileSync(file,'utf8');if(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(content))secretHits.push(relative(root,file)+':private_key');if(/(?:SUPABASE_SERVICE_ROLE_KEY|RECRUITMENT_BANK_AES_KEY_B64)\s*[=:]\s*["']?[^"'\s#;]{20,}/.test(content))secretHits.push(relative(root,file)+':server_secret_candidate')}
check('no_obvious_private_key_or_service_token',secretHits.length===0,secretHits.join(','));
const next=readFileSync(join(root,'next.config.ts'),'utf8');
check('static_export_preserved',next.includes("output: 'export'"));
check('base_path_supported',next.includes('NEXT_PUBLIC_BASE_PATH'));
check('customer_recruitment_hidden_source',!rels.some(x=>x.startsWith('app/candidate/')||x.startsWith('app/careers/')||x.startsWith('app/verify-interview/')));
check('no_applicant_records',!rels.some(x=>/(applicants?.*\.(?:csv|json|xlsx)|candidate.*(?:seed|records?)\.(?:json|csv|xlsx))/i.test(x)));
check('backend_secret_settings_not_public',!rels.some(x=>/\.env\.production|supabase\/\.env|secrets\.json/i.test(x)));
const out={status:errors.length?'FAIL':'PASS',checks:results,source_count:rels.length,generated_at:new Date().toISOString()};
console.log(JSON.stringify(out,null,2));
if(errors.length)process.exit(1);
