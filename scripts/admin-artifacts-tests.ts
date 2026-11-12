import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(p:string)=>fs.readFileSync(path.join(root,p),'utf8');
const phase3Api=read('supabase/functions/admin-api/index.ts');
const api=read('supabase/functions/admin-artifact-api/index.ts');
const panel=read('src/components/admin/AdminOrderArtifactsPanel.tsx');
const clientApi=read('src/lib/adminApi.ts');
const orderDetail=read('src/components/admin/AdminOrderDetailClient.tsx');
const customerFiles=read('src/components/customer-files/CustomerOrderFilesClient.tsx');
const migration=read('supabase/migrations/20260930143018_admin_phase4_artifact_publishing.sql');
const repair=read('supabase/migrations/20260930174400_admin_phase4_canonical_upload_repair.sql');
const serializationRepair=read('supabase/migrations/20260930190000_admin_phase4_approval_publish_serialization.sql');
const checks:Array<[string,boolean]>=[
  ['order detail includes Phase 4 panel',orderDetail.includes('AdminOrderArtifactsPanel')],
  ['artifact api overview action',api.includes("body.action==='admin-artifacts-overview'")],
  ['artifact api prepare action',api.includes("body.action==='admin-artifact-prepare-upload'")],
  ['artifact api publish action',api.includes("body.action==='admin-artifact-publish'")],
  ['artifact api approval action',api.includes("body.action==='admin-approval-create'")],
  ['artifact api secure read action',api.includes("body.action==='admin-artifact-access'")],
  ['STAFF mutation blocked',api.includes("authorized.role!=='ADMIN'")],
  ['Phase 3 admin-api remains free of Phase 4 actions',!phase3Api.includes('admin-artifacts-overview')&&!phase3Api.includes('admin-artifact-prepare-upload')],
  ['browser upload uses opaque upload ref',clientApi.includes("'x-upload-reference':input.uploadReference")],
  ['browser does not submit storage path',!clientApi.includes('storage_path')&&!panel.includes('storage_path')],
  ['binary upload verifies ADMIN role',api.includes("authorized.role!=='ADMIN'")],
  ['binary upload server resolves private storage path',api.includes("select('admin_user_id,storage_bucket,storage_path,expected_mime_type,expected_size_bytes,status')")],
  ['binary upload validates file signature',api.includes('signatureMatches')],
  ['binary upload validates exact size',api.includes('actualSize!==Number(upload.expected_size_bytes)')],
  ['binary upload marks server status only after verification',api.includes("admin_mark_order_artifact_uploaded_server")],
  ['publish requires UPLOADED',migration.includes("v_upload.status<>'UPLOADED'")],
  ['publish creates a new revision',migration.includes('coalesce(max(revision),0)+1')],
  ['publish makes only new artifact customer visible',migration.includes('customer_visible')&&migration.includes('true) returning * into v_artifact')],
  ['approval exact artifact revision binding',repair.includes('revision=p_expected_revision')],
  ['approval rejects stale newer revision',repair.includes('newer.revision>v_artifact.revision')],
  ['approval and publish serialize on the order row',serializationRepair.includes('where public_order_id=p_order_reference')&&serializationRepair.includes('for update;')],
  ['completed upload retry still validates request UUID ownership',api.indexOf("upload.status==='PUBLISHED'||upload.status==='UPLOADED'")<api.indexOf("admin_mark_order_artifact_uploaded_server")],
  ['approval does not transfer automatically',panel.includes('Older approval decisions never transfer automatically')],
  ['mutation request ids use crypto UUID',panel.includes('crypto.randomUUID()')],
  ['audit upload prepared',migration.includes('ARTIFACT_UPLOAD_PREPARED')],
  ['audit upload completed',migration.includes('ARTIFACT_UPLOAD_COMPLETED')],
  ['audit publish',migration.includes('ARTIFACT_PUBLISHED')],
  ['audit approval request',migration.includes('APPROVAL_REQUEST_CREATED')],
  ['private artifact bucket remains customer-order-artifacts',migration.includes("customer-order-artifacts")],
  ['Page 18 signed customer access preserved',customerFiles.includes('requestCustomerArtifactAccess')||customerFiles.includes('requestArtifact')],
  ['no Admin file delete control',!panel.includes('Delete artifact')&&!panel.includes('deleteArtifact')],
];
const failed=checks.filter(([,ok])=>!ok);
for(const[name,ok]of checks)console.log(`${ok?'PASS':'FAIL'} ${name}`);
if(failed.length){console.error(`${failed.length} Admin artifact checks failed.`);process.exit(1)}
console.log(`PASS ${checks.length} Admin Phase 4 artifact checks.`);
