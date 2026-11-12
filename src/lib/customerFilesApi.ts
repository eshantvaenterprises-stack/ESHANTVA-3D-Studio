'use client';

import { supabaseFunctionUrl, supabasePublicConfig } from '@/config/supabase';
import { getSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import type { ArtifactAccess, CustomerOrderFilesData } from '@/types/customerFiles';

const functionUrl = supabaseFunctionUrl('customer-dashboard-api', process.env.NEXT_PUBLIC_SUPABASE_DASHBOARD_FUNCTION_URL);
const { publishableKey } = supabasePublicConfig;
const orderRefPattern = /^ESHA-[0-9]{4}-[A-Z0-9]{8}$/;
const artifactRefPattern = /^ART-[0-9]{4}-[A-Z0-9]{8}$/;

export { extractOrderFilesReferenceFromPath, isOrderFilesPath, isFilesRequestCurrent } from '@/lib/customerFilesRoute';

async function sessionFor(expectedUserId?: string) {
  const client = getSupabaseBrowserClient();
  const { data:{ session } } = await client.auth.getSession();
  if (!session?.user) throw new Error('ACCOUNT_REQUIRED');
  if (session.user.is_anonymous) throw new Error('PERMANENT_ACCOUNT_REQUIRED');
  if (expectedUserId && session.user.id !== expectedUserId) throw new Error('SESSION_CHANGED');
  return session;
}

async function callCustomerApi<T>(body: Record<string,unknown>, expectedUserId?: string) {
  const session = await sessionFor(expectedUserId);
  const response = await fetch(functionUrl, {
    method:'POST',
    headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${session.access_token}`, apikey:publishableKey },
    body:JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({ ok:false, error:'Unable to load customer files.' })) as
    | { ok:true; data:T }
    | { ok:false; error:string; code?:string };
  return { response, payload };
}

export async function loadCustomerOrderFiles(reference:string, expectedUserId?:string) {
  if (!orderRefPattern.test(reference)) return { kind:'unavailable' as const };
  const { response, payload } = await callCustomerApi<CustomerOrderFilesData>({ action:'order-files-overview', reference }, expectedUserId);
  if (response.status === 404) return { kind:'unavailable' as const };
  if (!response.ok || !payload.ok) throw new Error('CUSTOMER_FILES_UNAVAILABLE');
  return { kind:'success' as const, data:payload.data };
}

export async function loadArtifactAccess(
  reference:string,
  artifactReference:string,
  disposition:'preview'|'download',
  expectedUserId?:string,
): Promise<ArtifactAccess> {
  if (!orderRefPattern.test(reference) || !artifactRefPattern.test(artifactReference)) throw new Error('FILE_UNAVAILABLE');
  const { response, payload } = await callCustomerApi<ArtifactAccess>({ action:'artifact-access', reference, artifactReference, disposition }, expectedUserId);
  if (!response.ok || !payload.ok) throw new Error('FILE_UNAVAILABLE');
  return payload.data;
}

export async function submitCustomerArtifactApproval(input:{
  reference:string;
  artifactReference:string;
  approvalReference:string;
  expectedRevision:number;
  decision:'approve'|'request_revision';
  message?:string;
}, expectedUserId?:string) {
  const { response, payload } = await callCustomerApi<{ status:string; replayed:boolean }>({ action:'submit-artifact-approval', ...input }, expectedUserId);
  if (!response.ok || !payload.ok) {
    const error = new Error(payload.ok ? 'APPROVAL_UNAVAILABLE' : payload.error) as Error & { code?:string };
    if (!payload.ok) error.code = payload.code;
    throw error;
  }
  return payload.data;
}
