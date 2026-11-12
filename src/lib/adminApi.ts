'use client';

import { supabaseFunctionUrl, supabasePublicConfig } from '@/config/supabase';
import { getSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import type { AdminDashboardData, AdminSessionProfile } from '@/types/admin';
import type { AdminOrderDetailData, AdminOrdersListData, AdminOrderStatus, AdminOrderTransitionResult } from '@/types/adminOrders';
import type { AdminArtifactAccessResult, AdminArtifactApprovalResult, AdminArtifactCategory, AdminArtifactPrepareResult, AdminArtifactPublishResult, AdminArtifactUploadResult, AdminOrderArtifactsData } from '@/types/adminArtifacts';
import type { AdminBulkRequestDetailData, AdminBulkRequestsListData, AdminBulkRequestStatus, AdminBulkType, AdminCustomerDetailData, AdminCustomersListData, AdminCustomRequestDetailData, AdminCustomRequestsListData, AdminCustomRequestStatus, AdminCustomRequestType, AdminPhase3Sort, AdminRequestTransitionResult } from '@/types/adminPhase3';

const functionUrl = supabaseFunctionUrl('admin-api', process.env.NEXT_PUBLIC_SUPABASE_ADMIN_FUNCTION_URL);
const artifactFunctionUrl = supabaseFunctionUrl('admin-artifact-api', process.env.NEXT_PUBLIC_SUPABASE_ADMIN_ARTIFACT_FUNCTION_URL);
const { publishableKey } = supabasePublicConfig;

export class AdminApiError extends Error {
  constructor(message: string, readonly status: number, readonly code: string) { super(message); }
}

async function callAdminApi<T>(body: Record<string, unknown>): Promise<T> {
  const client = getSupabaseBrowserClient();
  const { data: { session } } = await client.auth.getSession();
  if (!session?.user || session.user.is_anonymous) throw new AdminApiError('Admin access unavailable.', 401, 'ADMIN_ACCESS_UNAVAILABLE');
  const response = await fetch(functionUrl, {
    method:'POST',
    headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`,apikey:publishableKey},
    cache:'no-store',
    body:JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({ok:false,error:'Admin access unavailable.',code:'ADMIN_ERROR'})) as {ok:true;data:T}|{ok:false;error?:string;code?:string};
  if (!response.ok || !payload.ok) {
    const code=!payload.ok&&payload.code?payload.code:'ADMIN_ERROR';
    const safeMessage=code==='ORDER_STATUS_STALE'?'Order state changed. Refresh and try again.':code==='ORDER_TRANSITION_UNAVAILABLE'?'This status change is not available.':code==='REQUEST_STATUS_STALE'?'Request state changed. Refresh and try again.':code==='REQUEST_TRANSITION_UNAVAILABLE'?'This request status change is not available.':code==='ADMIN_MUTATION_FORBIDDEN'?'This admin role is read-only.':code==='ORDER_UNAVAILABLE'?'Order unavailable.':code==='REQUEST_UNAVAILABLE'?'Request unavailable.':code==='CUSTOMER_UNAVAILABLE'?'Customer unavailable.':code==='ARTIFACT_STALE'?'A newer revision is already customer-visible.':code==='ARTIFACT_UNAVAILABLE'?'Artifact unavailable.':code==='APPROVAL_ALREADY_EXISTS'?'An approval request already exists for this exact version.':code==='UPLOAD_NOT_READY'?'Upload is not ready to publish.':code==='UPLOAD_UNAVAILABLE'?'Upload unavailable.':'Admin request unavailable.';
    throw new AdminApiError(safeMessage,response.status,code);
  }
  return payload.data;
}


async function callAdminArtifactApi<T>(body: Record<string, unknown>): Promise<T> {
  const client = getSupabaseBrowserClient();
  const { data: { session } } = await client.auth.getSession();
  if (!session?.user || session.user.is_anonymous) throw new AdminApiError('Admin access unavailable.', 401, 'ADMIN_ACCESS_UNAVAILABLE');
  const response = await fetch(artifactFunctionUrl, {
    method:'POST',
    headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`,apikey:publishableKey},
    cache:'no-store',
    body:JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({ok:false,error:'Admin artifact operation unavailable.',code:'ADMIN_ARTIFACT_ERROR'})) as {ok:true;data:T}|{ok:false;error?:string;code?:string};
  if (!response.ok || !payload.ok) {
    const code=!payload.ok&&payload.code?payload.code:'ADMIN_ARTIFACT_ERROR';
    const safeMessage=code==='ADMIN_MUTATION_FORBIDDEN'?'This admin role is read-only.':code==='ORDER_UNAVAILABLE'?'Order unavailable.':code==='ARTIFACT_STALE'?'A newer revision is already customer-visible.':code==='ARTIFACT_UNAVAILABLE'?'Artifact unavailable.':code==='APPROVAL_ALREADY_EXISTS'?'An approval request already exists for this exact version.':code==='UPLOAD_NOT_READY'?'Upload is not ready to publish.':code==='UPLOAD_UNAVAILABLE'?'Upload unavailable.':code==='IDEMPOTENCY_CONFLICT'?'This request conflicts with an earlier operation.':'Admin artifact operation unavailable.';
    throw new AdminApiError(safeMessage,response.status,code);
  }
  return payload.data;
}

export function authorizeAdmin(auditLogin=false){return callAdminApi<AdminSessionProfile>({action:'authorize',auditLogin})}
export function loadAdminDashboard(){return callAdminApi<AdminDashboardData>({action:'dashboard-summary'})}
export function loadAdminOrders(input:{page:number;search:string;status:string|null;paymentStatus:string|null;deliveryMethod:string|null;sort:string}){
  return callAdminApi<AdminOrdersListData>({action:'orders-list',...input});
}
export function loadAdminOrderDetail(reference:string){return callAdminApi<AdminOrderDetailData>({action:'order-detail',reference})}
export function transitionAdminOrder(input:{reference:string;expectedStatus:AdminOrderStatus;targetStatus:AdminOrderStatus;requestId:string}){
  return callAdminApi<AdminOrderTransitionResult>({action:'order-transition',...input});
}
export async function recordAdminSignOut(){try{await callAdminApi<{recorded:boolean}>({action:'record-signout'})}catch{}}

export function loadAdminCustomers(input:{page:number;search:string}){return callAdminApi<AdminCustomersListData>({action:'customers-list',...input})}
export function loadAdminCustomerDetail(customerRef:string){return callAdminApi<AdminCustomerDetailData>({action:'customer-detail',customerRef})}
export function loadAdminCustomRequests(input:{page:number;search:string;status:AdminCustomRequestStatus|null;requestType:AdminCustomRequestType|null;sort:AdminPhase3Sort}){return callAdminApi<AdminCustomRequestsListData>({action:'custom-requests-list',...input})}
export function loadAdminCustomRequestDetail(reference:string){return callAdminApi<AdminCustomRequestDetailData>({action:'custom-request-detail',reference})}
export function transitionAdminCustomRequest(input:{reference:string;expectedStatus:AdminCustomRequestStatus;targetStatus:AdminCustomRequestStatus;requestId:string}){return callAdminApi<AdminRequestTransitionResult>({action:'custom-request-transition',...input})}
export function loadAdminBulkRequests(input:{page:number;search:string;status:AdminBulkRequestStatus|null;bulkType:AdminBulkType|null;sort:AdminPhase3Sort}){return callAdminApi<AdminBulkRequestsListData>({action:'bulk-requests-list',...input})}
export function loadAdminBulkRequestDetail(reference:string){return callAdminApi<AdminBulkRequestDetailData>({action:'bulk-request-detail',reference})}
export function transitionAdminBulkRequest(input:{reference:string;expectedStatus:AdminBulkRequestStatus;targetStatus:AdminBulkRequestStatus;requestId:string}){return callAdminApi<AdminRequestTransitionResult>({action:'bulk-request-transition',...input})}


export function loadAdminOrderArtifacts(reference:string){return callAdminArtifactApi<AdminOrderArtifactsData>({action:'admin-artifacts-overview',reference})}
export function accessAdminArtifact(input:{reference:string;artifactReference:string;disposition:'preview'|'download'}){return callAdminArtifactApi<AdminArtifactAccessResult>({action:'admin-artifact-access',...input})}
export function prepareAdminArtifactUpload(input:{reference:string;category:AdminArtifactCategory;displayName:string;description:string;versionLabel:string;mimeType:string;sizeBytes:number;requestId:string}){return callAdminArtifactApi<AdminArtifactPrepareResult>({action:'admin-artifact-prepare-upload',...input})}
export function publishAdminArtifact(input:{reference:string;uploadReference:string;requestId:string}){return callAdminArtifactApi<AdminArtifactPublishResult>({action:'admin-artifact-publish',...input})}
export function createAdminArtifactApproval(input:{reference:string;artifactReference:string;expectedRevision:number;requestId:string}){return callAdminArtifactApi<AdminArtifactApprovalResult>({action:'admin-approval-create',...input})}
export async function uploadAdminArtifactFile(input:{uploadReference:string;requestId:string;file:File}):Promise<AdminArtifactUploadResult>{
  const client=getSupabaseBrowserClient();
  const{data:{session}}=await client.auth.getSession();
  if(!session?.user||session.user.is_anonymous)throw new AdminApiError('Admin access unavailable.',401,'ADMIN_ACCESS_UNAVAILABLE');
  const response=await fetch(artifactFunctionUrl,{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`,apikey:publishableKey,'Content-Type':input.file.type,'x-upload-reference':input.uploadReference,'x-upload-request-id':input.requestId},body:input.file,cache:'no-store'});
  const payload=await response.json().catch(()=>({ok:false,error:'File upload could not be completed.',code:'UPLOAD_ERROR'})) as {ok:true;data:AdminArtifactUploadResult}|{ok:false;error?:string;code?:string};
  if(!response.ok||!payload.ok){const code=!payload.ok&&payload.code?payload.code:'UPLOAD_ERROR';const msg=code==='ADMIN_MUTATION_FORBIDDEN'?'This admin role is read-only.':code==='UPLOAD_VERIFICATION_FAILED'?'Uploaded file did not pass verification.':code==='UPLOAD_MIME_MISMATCH'?'Selected file type does not match the prepared upload.':code==='UPLOAD_SIZE_MISMATCH'?'Selected file size does not match the prepared upload.':'File upload could not be completed.';throw new AdminApiError(msg,response.status,code)}
  return payload.data;
}

/** Caller receives bytes only. No signed URL, private path or service-role key crosses the wire. */
export async function readAdminRequestAttachment(input:{mode:'custom'|'bulk';reference:string;fileReference:string;disposition:'preview'|'download'},signal?:AbortSignal):Promise<Blob>{
  const client=getSupabaseBrowserClient();
  const{data:{session}}=await client.auth.getSession();
  if(!session?.user||session.user.is_anonymous)throw new AdminApiError('Admin access unavailable.',401,'ADMIN_ACCESS_UNAVAILABLE');
  const res=await fetch(functionUrl,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`,apikey:publishableKey},cache:'no-store',body:JSON.stringify({action:'request-attachment-read',...input}),signal});
  if(!res.ok){const payload=await res.json().catch(()=>null) as {code?:string}|null;const code=payload?.code||'REQUEST_ATTACHMENT_ERROR';throw new AdminApiError(code==='REQUEST_ATTACHMENT_PREVIEW_UNAVAILABLE'?'Safe preview unavailable. Use Download.':res.status===401||res.status===403?'Admin access unavailable.':code==='REQUEST_ATTACHMENT_UNAVAILABLE'?'Attachment unavailable or no longer ready. Refresh the request.':'Unable to read attachment. Retry or refresh.',res.status,code)}
  return res.blob();
}

export type AdminMonthlyOperationalSummary={
  month:string;timeZone:'Asia/Kolkata';windowUtc:{start:string;end:string};definition:string;
  counts:{ordersCreated:number;customRequestsSubmitted:number;bulkRequestsSubmitted:number;customStatusEvents:number;bulkStatusEvents:number;customAttachmentAccessIssued:number;bulkAttachmentAccessIssued:number};
};
export function loadAdminMonthlyOperationalSummary(month:string){return callAdminApi<AdminMonthlyOperationalSummary>({action:'admin-monthly-operational-summary',month})}
