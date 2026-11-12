import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { getOrCreateAdminPhase3TransitionRequest, isAdminPhase3MutationCurrent } from '../src/lib/adminPhase3Routes';
const root=process.cwd(),read=(f:string)=>fs.readFileSync(path.join(root,f),'utf8');
const customList=read('app/admin/requests/custom/page.tsx'),customDetail=read('app/admin/custom-request/page.tsx'),bulkList=read('app/admin/requests/bulk/page.tsx'),bulkDetail=read('app/admin/bulk-request/page.tsx'),listClient=read('src/components/admin/AdminRequestListClient.tsx'),detailClient=read('src/components/admin/AdminRequestDetailClient.tsx'),edge=read('supabase/functions/admin-api/index.ts'),compactEdge=edge.replace(/\s+/g,''),migration=read('supabase/migrations/20260928202233_admin_phase3_customer_request_operations.sql'),repair=read('supabase/migrations/20260928202357_admin_phase3_idempotency_repair.sql'),vercel=read('vercel.json'),header=read('src/components/layout/Header.tsx'),footer=read('src/components/layout/Footer.tsx'),navigation=read('src/data/navigation.ts'),sitemap=read('app/sitemap.ts');
for(const page of [customList,customDetail,bulkList,bulkDetail])assert(page.includes('index:false'));
assert(vercel.includes('/admin/requests/custom/:reference')&&vercel.includes('/admin/custom-request/'));
assert(vercel.includes('/admin/requests/bulk/:reference')&&vercel.includes('/admin/bulk-request/'));
for(const action of ['custom-requests-list','custom-request-detail','custom-request-transition','bulk-requests-list','bulk-request-detail','bulk-request-transition'])assert(edge.includes(action),`Missing ${action}`);
for(const status of ['SUBMITTED','UNDER_REVIEW','NEEDS_INFORMATION','QUOTED','ACCEPTED','DECLINED','CANCELLED','CONVERTED_TO_ORDER'])assert(edge.includes(status),`Missing Custom status ${status}`);
for(const status of ['MORE_INFORMATION_REQUIRED','QUOTATION_PREPARATION','QUOTATION_SENT','AWAITING_CUSTOMER_APPROVAL','REJECTED'])assert(edge.includes(status),`Missing Bulk status ${status}`);
assert(compactEdge.includes("authorized.role!=='ADMIN'"),'STAFF mutation must be blocked.');
assert(edge.includes('phase3SearchPattern')&&edge.includes('customRequestStatuses.includes')&&edge.includes('bulkRequestStatuses.includes'));
assert(compactEdge.includes(".neq('status','DRAFT')")&&compactEdge.includes(".not('public_request_id','is',null)"));
assert(!edge.includes("select('storage_path"),'Admin request API must not select storage paths.');
assert(!edge.includes('commercial_snapshot'),'Bulk detail must not return raw quotation commercial snapshots.');
assert(compactEdge.includes("original_filename,file_extension,mime_type,size_bytes,upload_status,signature_status,scan_status,created_at"));
assert(migration.includes('admin_request_action_events')&&migration.includes('force row level security')&&migration.includes('revoke all on table public.admin_request_action_events from anon, authenticated'));
assert(migration.includes('CUSTOM_REQUEST_STATUS_CHANGED')&&migration.includes('BULK_REQUEST_STATUS_CHANGED'));
assert(migration.includes("'STATUS_CHANGED'")&&migration.includes("jsonb_build_object('source','admin_requests')"));
assert(/p_expected_status='SUBMITTED' and p_target_status='UNDER_REVIEW'/.test(migration));
assert(/p_expected_status='QUOTED' and p_target_status in \('ACCEPTED','DECLINED'\)/.test(migration));
assert(/p_expected_status='QUOTATION_PREPARATION' and p_target_status='QUOTATION_SENT'/.test(migration));
assert(/p_expected_status='AWAITING_CUSTOMER_APPROVAL' and p_target_status in \('ACCEPTED','REJECTED'\)/.test(migration));
assert(!migration.includes("p_target_status='CONVERTED_TO_ORDER'"),'Conversion to order must not be a manual Phase 3 status toggle.');
assert(repair.includes('pg_advisory_xact_lock')&&repair.includes('IDEMPOTENCY_CONFLICT'));
assert(migration.includes('grant execute on function public.admin_transition_custom_request_status_server')&&migration.includes('grant execute on function public.admin_transition_bulk_request_status_server'));
assert(listClient.includes('queryIdentity')&&listClient.includes('isAdminPhase3RequestCurrent'));
assert(detailClient.includes('isAdminPhase3MutationCurrent')&&detailClient.includes('getOrCreateAdminPhase3TransitionRequest'));
assert(detailClient.includes('Confirm status change')&&detailClient.includes('STAFF access is read-only'));
assert(!detailClient.match(/delete request|impersonate|refund|payment successful/i));
assert(!`${header}\n${footer}\n${navigation}`.match(/\/admin(?:\/|['"])/),'Public navigation must still not advertise Admin.');
assert(!sitemap.includes("'/admin"),'Admin routes must not enter public sitemap.');
const visualHashes:{[key:string]:string}={
 'src/components/account/AccountAccessClient.tsx':'039f7ead2b199ed28d8707026df7d92b66f618e9548b424747bc1e42e36e82f8',
 'src/components/account/AccountVisual.tsx':'3bbaf2a124be3816c93c9119c569c27c7b827b6cbc46fe19b640f3aae39144e0',
 'src/components/account/account-access.css':'58fc41f0ddd2dc83518f8f59f03d21c6fbe222db9688e37ce5cb27cac249d1c4',
};
for(const[file,expected]of Object.entries(visualHashes)){const actual=crypto.createHash('sha256').update(read(file)).digest('hex');assert.equal(actual,expected,`${file} visual refresh changed.`)}
let n=0;const first=getOrCreateAdminPhase3TransitionRequest(null,'CUSTOM:CR-2026-ABC123:SUBMITTED:UNDER_REVIEW',()=>`req-${++n}`),replay=getOrCreateAdminPhase3TransitionRequest(first,first.key,()=>`req-${++n}`),changed=getOrCreateAdminPhase3TransitionRequest(first,'CUSTOM:CR-2026-ABC123:UNDER_REVIEW:QUOTED',()=>`req-${++n}`);assert.equal(first.requestId,replay.requestId);assert.notEqual(first.requestId,changed.requestId);assert(isAdminPhase3MutationCurrent({epoch:2,userId:'admin',identity:'custom:CR-2026-ABC123',requestId:first.requestId},{epoch:2,userId:'admin',identity:'custom:CR-2026-ABC123',requestId:first.requestId}));assert(!isAdminPhase3MutationCurrent({epoch:3,userId:'admin',identity:'custom:CR-2026-ABC123',requestId:first.requestId},{epoch:2,userId:'admin',identity:'custom:CR-2026-ABC123',requestId:first.requestId}));
console.log('Admin Phase 3 Requests tests passed.');
