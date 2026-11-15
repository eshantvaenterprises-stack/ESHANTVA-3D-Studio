import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { resolve, relative, sep, extname } from 'node:path';
const root=resolve('out');
// Controlled adapter for this generator's narrow static-rule subset. Official
// Netlify parser evidence is separate; this does not simulate the provider.
const rules=readFileSync(resolve(root,'_redirects'),'utf8').trim().split('\n').map(s=>s.split(/\s+/));
const headers=[];let block;
for(const line of readFileSync(resolve(root,'_headers'),'utf8').split('\n')){if(!line)continue;if(!/^\s/.test(line)){block={path:line,values:{}};headers.push(block);}else{const i=line.indexOf(':');assert.ok(i>0);block.values[line.slice(0,i).trim()]=line.slice(i+1).trim();}}
const matches=(pattern,path)=>pattern.endsWith('*')?path.startsWith(pattern.slice(0,-1)):path===pattern;
const mime={'.html':'text/html; charset=utf-8','.txt':'text/plain; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
const server=createServer((req,res)=>{
 const pathname=new URL(req.url,'http://loopback').pathname;let path;
 try{path=decodeURIComponent(pathname);}catch{res.writeHead(400).end();return;}
 if(path.includes('\\')||path.includes('\0')){res.writeHead(400).end();return;}
 let file=resolve(root,'.'+path);if(file!==root&&!file.startsWith(root+sep)){res.writeHead(403).end();return;}
 if(existsSync(file)&&statSync(file).isDirectory())file=resolve(file,'index.html');
 if(!existsSync(file))for(const[from,to,status]of rules){const names=[];const pattern=from.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/:([A-Za-z]+)/g,(_,n)=>{names.push(n);return '([^/]+)';});if(new RegExp('^'+pattern+'$').test(path)){assert.equal(status,'200');file=resolve(root,'.'+to,to.endsWith('/')?'index.html':'');break;}}
 const found=existsSync(file)&&statSync(file).isFile();const responseHeaders=Object.assign({},...headers.filter(h=>matches(h.path,path)).map(h=>h.values));
 res.writeHead(found?200:404,{...responseHeaders,'Content-Type':mime[extname(file)]||'application/octet-stream'});res.end(found?readFileSync(file):'Not found');
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;let checks=0;
const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(resolve(dir,e.name)):[resolve(dir,e.name)]);
try{
 for(const file of walk(root).filter(p=>p.endsWith('.html')&&!p.endsWith('404.html')&&!p.includes('/404/'))){const path='/'+relative(root,file).split(sep).join('/').replace(/index\.html$/,'');const r=await fetch(base+path);assert.equal(r.status,200,path);assert.equal(await r.text(),readFileSync(file,'utf8'),path);checks++;}
 for(const[from,to]of rules){const path=from.replace(/:[A-Za-z]+/g,'ESHA-2026-ABC12345');const r=await fetch(base+path);assert.equal(r.status,200,path);assert.equal(await r.text(),readFileSync(resolve(root,'.'+to,to.endsWith('/')?'index.html':''),'utf8'));if(/^\/(account|admin)\//.test(path))assert.equal(r.headers.get('cache-control'),'no-store');checks++;}
 for(const s of ['services','custom-order','bulk-order']){const r=await fetch(`${base}/${s}/__next.${s}.__PAGE__.txt`);assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/^text\/plain/);assert.doesNotMatch(await r.text(),/^\s*<!doctype html/i);checks++;}
 for(const path of ['/careers/','/candidate/','/admin/recruitment/','/shop/sample-desk-nameplate/','/missing-route/','/services/__next.missing.__PAGE__.txt']){assert.equal((await fetch(base+path)).status,404,path);checks++;}
 assert.equal((await fetch(base+'/%5coutside')).status,400);checks++;
 // Exact local asset existence, including all RSC chunk references. External
 // embeds and fragment-only references are intentionally outside this scope.
 const assets=new Set();
 for(const f of walk(root).filter(p=>/\.(html|txt)$/.test(p))){const text=readFileSync(f,'utf8');for(const m of text.matchAll(/(?:src|href)="(\/(?:_next|images)\/[^"?#]+)(?:[?#][^"]*)?"/g))assets.add(m[1].replaceAll('&amp;','&'));for(const m of text.matchAll(/"(\/_next\/static\/[^"\\]+)"/g))assets.add(m[1]);}
 for(const asset of assets){assert.ok(existsSync(resolve(root,'.'+asset)),asset);const r=await fetch(base+asset);assert.equal(r.status,200,asset);checks++;}
 console.log(`NETLIFY_EXPORT_HTTP_PASS=${checks}; ${assets.size} assets; generated-rule loopback adapter only; no hosted acceptance claim`);
}finally{await new Promise(r=>server.close(r));}
