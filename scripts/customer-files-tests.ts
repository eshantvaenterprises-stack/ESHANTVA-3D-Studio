import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { extractOrderFilesReferenceFromPath, isFilesRequestCurrent, isOrderFilesPath } from '../src/lib/customerFilesRoute';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');
const hash=(file:string)=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
const page=read('app/account/order-files/page.tsx');
const client=read('src/components/customer-files/CustomerOrderFilesClient.tsx');
const api=read('src/lib/customerFilesApi.ts');
const route=read('src/lib/customerFilesRoute.ts');
const edge=read('supabase/functions/customer-dashboard-api/index.ts');
const migration=read('supabase/migrations/20260925195756_customer_order_artifacts.sql');
const hardening=read('supabase/migrations/20260925195954_customer_order_approval_binding_hardening.sql');
const boundary=read('src/components/order-detail/StaticOrderRouteBoundary.tsx');
const order=read('src/components/order-detail/CustomerOrderDetailClient.tsx');
const vercel=read('vercel.json');
const packageJson=JSON.parse(read('package.json')) as {scripts:Record<string,string>};

const ref='ESHA-2026-AB12CD34';
assert.equal(extractOrderFilesReferenceFromPath(`/account/orders/${ref}/files/`),ref);
assert.equal(extractOrderFilesReferenceFromPath(`/studio/account/orders/${ref}/files/`,'/studio'),ref);
assert.equal(extractOrderFilesReferenceFromPath(`/account/orders/${ref}/`),null);
assert.equal(isOrderFilesPath(`/account/orders/${ref}/files/`),true);
assert.equal(isOrderFilesPath('/account/order-files/'),false);
const expected={epoch:4,userId:'customer-a',reference:ref,artifactReference:'ART-2026-AB12CD34'};
assert.equal(isFilesRequestCurrent({...expected},expected),true);
assert.equal(isFilesRequestCurrent({...expected,epoch:5},expected),false);
assert.equal(isFilesRequestCurrent({...expected,userId:'customer-b'},expected),false);
assert.equal(isFilesRequestCurrent({...expected,reference:'ESHA-2026-ZZ99YY88'},expected),false);
assert.equal(isFilesRequestCurrent({...expected,artifactReference:'ART-2026-ZZ99YY88'},expected),false);

assert(page.includes("title: 'Files & Approvals | ESHANTVA 3D Studio'"));
assert(page.includes('robots: { index:false, follow:false }'));
assert(vercel.includes('/account/orders/:reference/files') && vercel.includes('/account/order-files/'));
assert(boundary.includes("route === 'files'") && boundary.includes('<CustomerOrderFilesClient />'));
assert(order.includes('/files/`)') && order.includes('Files & approvals'));

assert(api.includes("action:'order-files-overview'"));
assert(api.includes("action:'artifact-access'"));
assert(api.includes("action:'submit-artifact-approval'"));
assert(api.includes('session.user.id !== expectedUserId'));
assert(!api.match(/service_role|SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY/i));
assert(route.includes('/account\\/orders\\/([^/?#]+)\\/files'));

assert(edge.includes("body.action === 'order-files-overview'"));
assert(edge.includes("body.action === 'artifact-access'"));
assert(edge.includes("body.action === 'submit-artifact-approval'"));
assert(edge.includes(".eq('customer_id', customerId)") || edge.includes(".eq('customer_id',customerId)"));
assert(edge.includes(".eq('public_order_id', reference)") || edge.includes(".eq('public_order_id',reference)"));
assert(edge.includes(".eq('public_artifact_ref', artifactReference)") || edge.includes(".eq('public_artifact_ref',artifactReference)"));
assert(edge.includes(".eq('customer_visible', true)") || edge.includes(".eq('customer_visible',true)"));
assert(edge.includes('createSignedUrl') && edge.includes('artifactSignedUrlSeconds = 120'));
assert(!edge.includes("body.storagePath") && !edge.includes("body.storage_path"), 'Raw browser-provided storage paths must never be signed.');
assert(edge.includes("customerArtifactBucket = 'customer-order-artifacts'"));
assert(edge.includes("p_expected_revision:expectedRevision") || edge.includes("p_expected_revision: expectedRevision"));
assert(edge.includes("p_artifact_reference:artifactReference") || edge.includes("p_artifact_reference: artifactReference"));
assert(edge.includes("APPROVAL_STALE") && edge.includes("APPROVAL_ALREADY_RESOLVED"));

assert(migration.includes("public.order_customer_artifacts"));
assert(migration.includes("public.order_approval_requests"));
assert(migration.includes("public.order_approval_actions"));
assert(migration.includes("'customer-order-artifacts'"));
assert(migration.includes('public = false'));
assert(migration.includes("revoke all on table") && migration.includes('from anon, authenticated'));
assert(!migration.includes('create policy'), 'Page 18 customer metadata/storage access must remain server-mediated, not broad browser RLS.');
assert(hardening.includes('p_artifact_reference text') && hardening.includes('p_expected_revision integer'));
assert(hardening.includes('newer.revision > v_request.artifact_revision'));
assert(hardening.includes('on conflict (approval_request_id) do nothing'));
assert(hardening.includes('grant execute on function') && hardening.includes('to service_role'));

assert(client.includes('No customer files are available for this order yet.'));
assert(client.includes('No verification media is available for this order yet.'));
assert(client.includes('Approve this version') && client.includes('Request revision'));
assert(client.includes('This approval applies only to the exact version shown above.'));
assert(client.includes('signedEpoch') && client.includes('approvalEpoch') && client.includes('requestEpoch'));
assert(client.includes('activeArtifact.current=null') || client.includes('activeArtifact.current = null'));
assert(client.includes('activeApprovalArtifact') && client.includes('artifactReference:activeApprovalArtifact.current'));
assert(client.includes('approvalEpoch.current+=1') || client.includes('approvalEpoch.current += 1'));
assert(!client.includes('localStorage'));
assert(client.includes('<video') && client.includes('controls') && client.includes('preload="metadata"'));

assert(hash('src/components/account/AccountAccessClient.tsx')==='039f7ead2b199ed28d8707026df7d92b66f618e9548b424747bc1e42e36e82f8');
assert(hash('src/components/account/AccountVisual.tsx')==='3bbaf2a124be3816c93c9119c569c27c7b827b6cbc46fe19b640f3aae39144e0');
assert(hash('src/components/account/account-access.css')==='58fc41f0ddd2dc83518f8f59f03d21c6fbe222db9688e37ce5cb27cac249d1c4');

assert(packageJson.scripts['test:customer-files']==='node --import tsx scripts/customer-files-tests.ts');
assert(packageJson.scripts.test.includes('test:customer-files'));
console.log('Page 18 customer files tests passed.');
