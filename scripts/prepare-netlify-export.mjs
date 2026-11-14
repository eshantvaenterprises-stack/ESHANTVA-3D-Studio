// Protected acceptance export. Run after the default Next.js static build.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const out = join(process.cwd(), 'out');
const hashes = new Set();
function visit(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) visit(path);
    else if (entry.name.endsWith('.html')) {
      const html = readFileSync(path, 'utf8');
      for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
        if (!/\bsrc\s*=/i.test(match[1]) && match[2]) {
          hashes.add(`'sha256-${createHash('sha256').update(match[2]).digest('base64')}'`);
        }
      }
    }
  }
}
visit(out);
if (!hashes.size) throw new Error('Missing static inline script hashes; do not deploy.');
const backend = 'https://lckcibqosxgwxycvqzxp.supabase.co';
const csp = ["default-src 'self'", "base-uri 'self'", "object-src 'none'", "frame-ancestors 'none'", "form-action 'self'",
  `script-src 'self' ${[...hashes].sort().join(' ')}`, "style-src 'self' 'unsafe-inline'", "font-src 'self' data:",
  `img-src 'self' data: blob: ${backend}`, `connect-src 'self' ${backend} wss://lckcibqosxgwxycvqzxp.supabase.co`,
  `frame-src 'self' blob: ${backend} https://www.google.com`, "worker-src 'self' blob:", 'upgrade-insecure-requests'].join('; ');
const common = { 'Content-Security-Policy': csp, 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'X-Robots-Tag': 'noindex, nofollow, noarchive', 'Strict-Transport-Security': 'max-age=31536000' };
const sensitive = ['/account', '/account/', '/account/*', '/admin', '/admin/', '/admin/*'];
writeFileSync(join(out, '_headers'), '/*\n' + Object.entries(common).map(([k,v]) => `  ${k}: ${v}\n`).join('') +
  sensitive.map(path => `${path}\n  Cache-Control: no-store\n`).join(''));
// Derived from the current pathname parsers and exported App Router shells.
const routes = [
  ['/admin/customers/:customerRef', '/admin/customer/'],
  ['/admin/requests/custom/:reference', '/admin/custom-request/'],
  ['/admin/requests/bulk/:reference', '/admin/bulk-request/'],
  ['/admin/orders/:reference', '/admin/order/'],
  ['/account/orders/:reference/files', '/account/order-files/'],
  ['/account/orders/:reference', '/account/orders/'],
];
for (const [, dest] of routes) {
  if (!existsSync(join(out, dest, 'index.html'))) throw new Error(`Missing exported shell: ${dest}`);
}
writeFileSync(join(out, '_redirects'), routes.flatMap(([from,to]) => ['', '/'].map(s => `${from}${s} ${to} 200`)).join('\n') + '\n');
writeFileSync(join(out, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
console.log(`NETLIFY_PROTECTED_EXPORT_PREPARED: 12 direct-path rules; ${hashes.size} inline hashes; no upload performed.`);
