'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabasePublicConfig } from '@/config/supabase';

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient() {
  if (typeof window === 'undefined') throw new Error('Browser authentication is unavailable in this context.');
  if (!supabasePublicConfig.url || !supabasePublicConfig.publishableKey) throw new Error('Account services are unavailable until backend configuration is provided.');
  if (!browserClient) {
    browserClient = createClient(supabasePublicConfig.url, supabasePublicConfig.publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return browserClient;
}
