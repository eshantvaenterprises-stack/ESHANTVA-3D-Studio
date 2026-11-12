import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(); const read=(f:string)=>fs.readFileSync(path.join(root,f),'utf8');
const login=read('app/admin/login/page.tsx'), page=read('app/admin/page.tsx'), loginClient=read('src/components/admin/AdminLoginClient.tsx'), dashboard=read('src/components/admin/AdminDashboardClient.tsx'), api=read('src/lib/adminApi.ts'), auth=read('src/lib/adminAuth.ts'), edge=read('supabase/functions/admin-api/index.ts'), migration=read('supabase/migrations/20260925204230_admin_phase1_authorization.sql'), header=read('src/components/layout/Header.tsx'), footer=read('src/components/layout/Footer.tsx'), navigation=read('src/data/navigation.ts'), sitemap=read('app/sitemap.ts'), account=read('src/components/account/AccountAccessClient.tsx'), visual=read('src/components/account/AccountVisual.tsx'), accountCss=read('src/components/account/account-access.css');
assert(login.includes("title: 'Admin Access'") && login.includes('index: false'));
assert(page.includes("title: 'Admin Dashboard'") && page.includes('index: false'));
assert(loginClient.includes('signInAdmin') && loginClient.includes('authorizeAdmin(true)'));
assert(!loginClient.match(/signUp|create account|become admin/i), 'Admin login must not expose signup/promotion.');
assert(auth.includes('signInWithPassword') && auth.includes("signOut({ scope: 'local' })"));
assert(edge.includes('auth.getUser(accessToken)') && edge.includes('user.is_anonymous'));
assert(edge.includes(".from('admin_users')") && /\.eq\('user_id',\s*userId\)/.test(edge) && /\.eq\('active',\s*true\)/.test(edge));
assert(!edge.match(/user\.email\s*===|\.eq\('email'/), 'Email must never authorize admin access.');
assert(migration.includes("role in ('ADMIN','STAFF')") && migration.includes('force row level security') && migration.includes('revoke all on table public.admin_users, public.admin_access_events from anon, authenticated'));
assert(!migration.match(/create policy .*admin_users/i), 'Browser should not receive an admin_users read/write policy.');
assert(/count:\s*'exact'/.test(edge) && /head:\s*true/.test(edge) && edge.includes(".from('orders')") && edge.includes(".from('custom_requests')") && edge.includes(".from('bulk_requests')") && edge.includes(".from('order_approval_requests')"));
for(const banned of ['contact_email','provider_payment_id','storage_path','request_hash','idempotency_key']) assert(!edge.slice(edge.indexOf('async function summary('), edge.indexOf('function readOrdersInput(')).includes(banned), `Admin Phase 1 response/query must not include ${banned}.`);
assert(dashboard.includes('requestEpoch') && dashboard.includes('activeUserId') && dashboard.includes('setData(null)'));
assert(dashboard.includes("window.location.replace(withBase('/admin/login/'))") && dashboard.includes('Admin access unavailable.'));
assert(dashboard.includes('recordAdminSignOut') && dashboard.includes('signOutAdmin'));
assert(!`${header}\n${footer}\n${navigation}`.match(/\/admin(?:\/|['\"])/), 'Public navigation must not advertise Admin.');
assert(!sitemap.includes("'/admin'"), 'Admin routes must stay out of sitemap.');
assert(account.includes('Account access') && visual.includes('ea-visual') && accountCss.includes('.ea-visual'));
for(const src of [loginClient,dashboard,api,auth]) assert(!src.match(/service_role|SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY/), 'Browser Admin source must not contain server credentials.');
const hashes={
  'src/components/account/AccountAccessClient.tsx':'039f7ead2b199ed28d8707026df7d92b66f618e9548b424747bc1e42e36e82f8',
  'src/components/account/AccountVisual.tsx':'3bbaf2a124be3816c93c9119c569c27c7b827b6cbc46fe19b640f3aae39144e0',
  'src/components/account/account-access.css':'58fc41f0ddd2dc83518f8f59f03d21c6fbe222db9688e37ce5cb27cac249d1c4',
};
for(const [file,expected] of Object.entries(hashes)){const actual=crypto.createHash('sha256').update(read(file)).digest('hex');assert.equal(actual,expected,`${file} visual refresh changed.`)}
console.log('Admin Phase 1 tests passed.');
