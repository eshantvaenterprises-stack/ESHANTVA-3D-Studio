'use client';

import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '@/lib/supabaseBrowser';

export async function getAdminAuthSession() {
  return getSupabaseBrowserClient().auth.getSession();
}

export function onAdminAuthChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
  return getSupabaseBrowserClient().auth.onAuthStateChange(callback);
}

export async function signInAdmin(email: string, password: string) {
  return getSupabaseBrowserClient().auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
}

export async function signOutAdmin() {
  return getSupabaseBrowserClient().auth.signOut({ scope: 'local' });
}
