'use client';

import { supabaseFunctionUrl, supabasePublicConfig } from '@/config/supabase';
import { getSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import type { AppointmentSubmission, ContactRequestResponse, ContactSubmission } from '@/types/contact';

const supabaseUrl = supabasePublicConfig.url;
const publishableKey = supabasePublicConfig.publishableKey;
const functionUrl = supabaseFunctionUrl('contact-request-api', process.env.NEXT_PUBLIC_SUPABASE_CONTACT_REQUEST_FUNCTION_URL);

export const contactBackendConfigured = Boolean(supabaseUrl && publishableKey && functionUrl);

function getSupabase() {
  if (!contactBackendConfigured) throw new Error('The secure contact backend is not configured yet.');
  return getSupabaseBrowserClient();
}

async function getAccessToken() {
  const client = getSupabase();
  let { data: { session } } = await client.auth.getSession();
  if (!session) {
    const result = await client.auth.signInAnonymously();
    if (result.error) throw new Error('A secure contact session could not start. Please use the email fallback.');
    session = result.data.session;
  }
  if (!session) throw new Error('A secure guest session could not be verified.');
  return session.access_token;
}

type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: string };

async function submit(kind: 'contact' | 'appointment', submission: ContactSubmission | AppointmentSubmission) {
  const token = await getAccessToken();
  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: publishableKey,
    },
    body: JSON.stringify({ kind, submission }),
  });
  const payload = await response.json().catch(() => ({ ok: false, error: 'The backend returned an unreadable response.' })) as ApiResponse<ContactRequestResponse>;
  if (!response.ok || !payload.ok) throw new Error(payload.ok ? 'Request failed.' : payload.error);
  return payload.data;
}

export function submitContactRequest(submission: ContactSubmission) {
  return submit('contact', submission);
}

export function submitAppointmentRequest(submission: AppointmentSubmission) {
  return submit('appointment', submission);
}
