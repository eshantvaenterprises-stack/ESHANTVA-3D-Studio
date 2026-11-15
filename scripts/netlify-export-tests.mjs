import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const script = resolve('scripts/prepare-netlify-export.mjs');
const segments = ['services', 'custom-order', 'bulk-order'];
const shells = ['/admin/customer/', '/admin/custom-request/', '/admin/bulk-request/', '/admin/order/', '/account/order-files/', '/account/orders/'];
let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks++; };
const native = s => `/${s}/__next.${s}.__PAGE__.txt`;
const nested = s => `/${s}/__next.${s}/__PAGE__.txt`;
function verify(root) {
  const rules = readFileSync(join(root, '_redirects'), 'utf8').trim().split('\n').map(line => line.split(/\s+/));
  check(rules.length >= 12 && rules.length <= 15, 'bounded exact rule count');
  check(new Set(rules.map(r=>r[0])).size === rules.length, 'no duplicate sources');
  for (const [from,to,status,...extra] of rules) {
    check(status === '200' && !extra.length && from.startsWith('/') && to.startsWith('/') && !from.includes('*'), 'internal exact rewrite syntax');
    check(existsSync(join(root, to, to.endsWith('/') ? 'index.html' : '')), 'every rewrite target exists');
  }
  for (const s of segments) {
    const rule = rules.find(r=>r[0]===native(s));
    const file = join(root, rule?.[1] || native(s));
    const payload = readFileSync(file,'utf8');
    check(payload.trim() && !/^\s*(?:<!doctype|<html)/i.test(payload), 'RSC is nonempty and not HTML');
    if(rule) check(rule[1]===nested(s), 'alias is exact verified mapping');
  }
  const headers = readFileSync(join(root,'_headers'),'utf8');
  check(headers.includes("script-src 'self' ") && !/script-src[^;\n]*'unsafe-inline'/.test(headers), 'strict script CSP');
  for(const path of ['/account','/account/','/account/*','/admin','/admin/','/admin/*']) check(headers.includes(`${path}\n  Cache-Control: no-store\n`), 'private no-store '+path);
  for(const name of ['Content-Security-Policy','X-Content-Type-Options','X-Frame-Options','Referrer-Policy','Permissions-Policy','X-Robots-Tag','Strict-Transport-Security']) check(headers.includes(`  ${name}: `),'header '+name);
  function walk(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){const p=join(dir,entry.name);if(entry.isDirectory())walk(p);else if(p.endsWith('.html'))for(const m of readFileSync(p,'utf8').matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi))if(!/\bsrc\s*=/i.test(m[1])&&m[2])check(headers.includes(`'sha256-${createHash('sha256').update(m[2]).digest('base64')}'`),'inline hash coverage');}}
  walk(root);
  check(readFileSync(join(root,'robots.txt'),'utf8')==='User-agent: *\nDisallow: /\n','protected robots');
}
// Real export is mandatory; synthetic fixtures additionally exercise the older
// nested layout and fail-closed branches without modifying the actual build.
verify(resolve('out'));
const temp=mkdtempSync(join(tmpdir(),'eshantva-export-'));
try {
  for(const layout of ['flat','nested','mixed','both','missing','html','empty','malformed','missing-shell']) {
    const cwd=join(temp,layout),root=join(cwd,'out'); mkdirSync(root,{recursive:true});
    for(const shell of shells){mkdirSync(join(root,shell),{recursive:true});writeFileSync(join(root,shell,'index.html'),'<html><script>self.fixture=1</script></html>');}
    for(const s of segments){if(layout==='missing'&&s==='services')continue;const p=join(root,(layout==='flat'||layout==='both'||(layout==='mixed'&&s==='services'))?native(s):nested(s));mkdirSync(resolve(p,'..'),{recursive:true});writeFileSync(p,layout==='html'?'<!doctype html><html>wrong shell</html>':layout==='empty'?' ':layout==='malformed'?'{"not":"flight"}':`1:"${s}-fixture"\n`);}
    if(layout==='both')for(const segment of segments){const p=join(root,nested(segment));mkdirSync(resolve(p,'..'),{recursive:true});writeFileSync(p,`1:"nested-${segment}"\n`);}
    if(layout==='missing-shell')rmSync(join(root,shells[0],'index.html'));
    const result=spawnSync(process.execPath,[script],{cwd,encoding:'utf8'});
    if(['flat','nested','mixed','both'].includes(layout)){check(result.status===0,result.stderr);verify(root);const redirects=readFileSync(join(root,'_redirects'),'utf8');check(redirects.trim().split('\n').length===(layout==='nested'?15:layout==='mixed'?14:12),'layout-aware rule count');}
    else {check(result.status!==0,'reject '+layout);check(!existsSync(join(root,'_redirects')),'no redirect output on invalid '+layout);}
  }
} finally {rmSync(temp,{recursive:true,force:true});}
console.log(`NETLIFY_EXPORT_TESTS_PASS=${checks}; real export plus flat/nested/mixed/both/missing/HTML/empty/malformed/shell regressions; no hosted claim`);
