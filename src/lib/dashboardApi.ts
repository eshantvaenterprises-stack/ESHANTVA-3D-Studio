'use client';

import { supabaseFunctionUrl, supabasePublicConfig } from '@/config/supabase';
import { getSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import type { CustomerDashboardData } from '@/types/dashboard';

const functionUrl = supabaseFunctionUrl('customer-dashboard-api', process.env.NEXT_PUBLIC_SUPABASE_DASHBOARD_FUNCTION_URL);
const { publishableKey } = supabasePublicConfig;

export type DashboardSessionState = 'unauthenticated' | 'anonymous' | 'permanent';

export async function getDashboardSessionState(): Promise<DashboardSessionState> {
  const { data: { session } } = await getSupabaseBrowserClient().auth.getSession();
  if (!session?.user) return 'unauthenticated';
  return session.user.is_anonymous ? 'anonymous' : 'permanent';
}

export async function loadCustomerDashboard(): Promise<CustomerDashboardData> {
  const client = getSupabaseBrowserClient();
  const { data: { session } } = await client.auth.getSession();
  if (!session?.user) throw new Error('Sign in to access your account dashboard.');
  if (session.user.is_anonymous) throw new Error('Complete account access before opening the customer dashboard.');

  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: publishableKey,
    },
    body: JSON.stringify({ action: 'dashboard-overview' }),
  });

  const payload = await response.json().catch(() => ({ ok: false, error: 'Unable to load your account activity.' })) as
    | { ok: true; data: CustomerDashboardData }
    | { ok: false; error: string };

  if (!response.ok || !payload.ok) throw new Error('Unable to load your account activity.');
  return payload.data;
}
