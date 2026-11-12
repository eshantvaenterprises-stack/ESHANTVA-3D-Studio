'use client';

import { supabaseFunctionUrl, supabasePublicConfig } from '@/config/supabase';
import { getSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import * as tus from 'tus-js-client';
import type { CustomRequestSubmission } from '@/types/customOrder';

const supabaseUrl = supabasePublicConfig.url;
const publishableKey = supabasePublicConfig.publishableKey;
const functionUrl = supabaseFunctionUrl('custom-request-api', process.env.NEXT_PUBLIC_SUPABASE_CUSTOM_REQUEST_FUNCTION_URL);

export const customOrderBackendConfigured = Boolean(supabaseUrl && publishableKey && functionUrl);

function getSupabase() {
  if (!customOrderBackendConfigured) throw new Error('The secure request backend is not configured yet.');
  return getSupabaseBrowserClient();
}

async function getAccessToken() {
  const client = getSupabase();
  let { data: { session } } = await client.auth.getSession();
  if (!session) {
    const result = await client.auth.signInAnonymously();
    if (result.error) throw new Error(`Secure guest session could not start: ${result.error.message}`);
    session = result.data.session;
  }
  if (!session) throw new Error('Secure guest session could not be verified.');
  return { token: session.access_token, userId: session.user.id };
}

type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string> };

async function callCustomRequestApi<T>(action: string, body: Record<string, unknown>) {
  const { token } = await getAccessToken();
  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: publishableKey,
    },
    body: JSON.stringify({ action, ...body }),
  });
  const payload = await response.json().catch(() => ({ ok: false, error: 'The backend returned an unreadable response.' })) as ApiResponse<T>;
  if (!response.ok || !payload.ok) throw new Error(payload.ok ? 'Request failed.' : payload.error);
  return payload.data;
}

export async function createServerDraft(sourceProductSlug: string) {
  return callCustomRequestApi<{ requestId: string }>('prepare-request', { sourceProductSlug });
}

export async function uploadCustomOrderFile(
  requestId: string,
  file: File,
  onProgress: (percentage: number) => void,
) {
  const prepared = await callCustomRequestApi<{ fileId: string; storagePath: string; bucket: string }>('prepare-upload', {
    requestId,
    file: { name: file.name, size: file.size, type: file.type },
  });
  const { token } = await getAccessToken();

  await new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
      retryDelays: [0, 1000, 3000, 5000, 10000],
      headers: { authorization: `Bearer ${token}`, 'x-upsert': 'false' },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: 6 * 1024 * 1024,
      metadata: {
        bucketName: prepared.bucket,
        objectName: prepared.storagePath,
        contentType: file.type || 'application/octet-stream',
        cacheControl: '3600',
      },
      onError: (error) => reject(error),
      onProgress: (uploaded, total) => onProgress(Math.min(100, Math.round((uploaded / total) * 100))),
      onSuccess: () => resolve(),
    });
    upload.findPreviousUploads().then((previous) => {
      if (previous[0]) upload.resumeFromPreviousUpload(previous[0]);
      upload.start();
    }).catch(reject);
  });

  await callCustomRequestApi('finalize-upload', { requestId, fileId: prepared.fileId });
  return prepared.fileId;
}

export async function removeCustomOrderFile(requestId: string, fileId: string) {
  await callCustomRequestApi('remove-upload', { requestId, fileId });
}

export async function submitCustomRequest(requestId: string | null, submission: CustomRequestSubmission) {
  return callCustomRequestApi<{ publicRequestId: string; submittedAt: string }>('submit-request', {
    requestId,
    submission,
  });
}
