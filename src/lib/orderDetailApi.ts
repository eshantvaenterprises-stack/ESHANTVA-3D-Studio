'use client';

import { supabaseFunctionUrl, supabasePublicConfig } from '@/config/supabase';
import { getSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import type { CustomerOrderDetail, OrderDetailLoadResult } from '@/types/orderDetail';

const functionUrl = supabaseFunctionUrl('customer-dashboard-api', process.env.NEXT_PUBLIC_SUPABASE_DASHBOARD_FUNCTION_URL);
const { publishableKey } = supabasePublicConfig;
const publicOrderReferencePattern = /^ESHA-[0-9]{4}-[A-Z0-9]{8}$/;

export function isPublicOrderReference(value: string) {
  return publicOrderReferencePattern.test(value);
}

export function extractOrderReferenceFromPath(pathname: string, basePath = '') {
  const normalizedBase = basePath && basePath !== '/' ? basePath.replace(/\/$/, '') : '';
  const withoutBase = normalizedBase && pathname.startsWith(normalizedBase)
    ? pathname.slice(normalizedBase.length)
    : pathname;
  const match = withoutBase.match(/^\/account\/orders\/([^/?#]+)\/?$/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export function isOrderDetailPath(pathname: string, basePath = '') {
  return extractOrderReferenceFromPath(pathname, basePath) !== null;
}

export function isOrderRequestCurrent(
  current: { epoch: number; userId: string | null; reference: string | null },
  expected: { epoch: number; userId: string; reference: string },
) {
  return current.epoch === expected.epoch
    && current.userId === expected.userId
    && current.reference === expected.reference;
}

export async function loadCustomerOrderDetail(reference: string, expectedUserId?: string): Promise<OrderDetailLoadResult> {
  if (!isPublicOrderReference(reference)) return { kind: 'unavailable' };

  const client = getSupabaseBrowserClient();
  const { data: { session } } = await client.auth.getSession();
  if (!session?.user) throw new Error('ACCOUNT_REQUIRED');
  if (session.user.is_anonymous) throw new Error('PERMANENT_ACCOUNT_REQUIRED');
  if (expectedUserId && session.user.id !== expectedUserId) throw new Error('SESSION_CHANGED');

  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: publishableKey,
    },
    body: JSON.stringify({ action: 'order-detail', reference }),
  });

  const payload = await response.json().catch(() => ({ ok: false, error: 'Unable to load order details.' })) as
    | { ok: true; data: CustomerOrderDetail }
    | { ok: false; error: string; code?: string };

  if (response.status === 404) return { kind: 'unavailable' };
  if (!response.ok || !payload.ok) throw new Error('ORDER_DETAIL_UNAVAILABLE');
  return { kind: 'success', data: payload.data };
}
