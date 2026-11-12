'use client';

import { supabaseFunctionUrl, supabasePublicConfig } from '@/config/supabase';
import { getSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import type { CheckoutOrderStatus, CheckoutPrepareResponse, CheckoutReviewResponse, CheckoutSubmission } from '@/types/checkout';

const functionUrl = supabaseFunctionUrl('checkout-order-api', process.env.NEXT_PUBLIC_SUPABASE_CHECKOUT_FUNCTION_URL);
const { url: supabaseUrl, publishableKey } = supabasePublicConfig;
export const checkoutBackendConfigured = Boolean(supabaseUrl && publishableKey && functionUrl);
function getSupabase() {
  if (!checkoutBackendConfigured) throw new Error('Checkout could not be started. Please try again later.');
  return getSupabaseBrowserClient();
}
async function getAccessToken() {
  const client = getSupabase();
  let { data: { session } } = await client.auth.getSession();
  if (!session) {
    const result = await client.auth.signInAnonymously();
    if (result.error) throw new Error('A secure checkout session could not start. Please try again.');
    session = result.data.session;
  }
  if (!session) throw new Error('A secure checkout session could not be verified. Please try again.');
  return session.access_token;
}
type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: string; code?: string; fieldErrors?: Record<string, string> };
async function callCheckoutApi<T>(action: string, body: Record<string, unknown>) {
  const accessToken = await getAccessToken();
  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}`, apikey: publishableKey },
    body: JSON.stringify({ action, ...body }),
  });
  const payload = await response.json().catch(() => ({ ok: false, error: 'Checkout returned an unreadable response.' })) as ApiResponse<T>;
  if (!response.ok || !payload.ok) {
    const error = new Error(payload.ok ? 'Checkout could not be completed.' : payload.error) as Error & { code?: string };
    if (!payload.ok) error.code = payload.code;
    throw error;
  }
  return payload.data;
}
export function reviewCheckout(submission: Omit<CheckoutSubmission, 'idempotencyKey'>) { return callCheckoutApi<CheckoutReviewResponse>('review-checkout', { submission }); }
export function prepareCheckout(submission: CheckoutSubmission) { return callCheckoutApi<CheckoutPrepareResponse>('prepare-checkout', { submission }); }
export function getCheckoutOrderStatus(orderReference: string) { return callCheckoutApi<CheckoutOrderStatus>('get-order-status', { orderReference }); }
