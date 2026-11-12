'use client';

import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import { supabasePublicConfig } from '@/config/supabase';
import { siteConfig } from '@/config/site';

function redirectUrl(path: string) {
  if (typeof window === 'undefined') return undefined;
  return `${window.location.origin}${siteConfig.basePath}${path}`;
}

export function isAnonymousUser(user: User | null | undefined) {
  return Boolean(user?.is_anonymous);
}

export async function getAccountSession() {
  if (!supabasePublicConfig.url || !supabasePublicConfig.publishableKey) {
    return { data: { session: null }, error: null };
  }
  return getSupabaseBrowserClient().auth.getSession();
}

export function onAccountAuthChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
  if (!supabasePublicConfig.url || !supabasePublicConfig.publishableKey) {
    return { data: { subscription: { unsubscribe() {} } } };
  }
  return getSupabaseBrowserClient().auth.onAuthStateChange(callback);
}

export async function signInAccount(email: string, password: string) {
  return getSupabaseBrowserClient().auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
}

export async function createAccount(input: { fullName: string; email: string; password: string }) {
  const client = getSupabaseBrowserClient();
  const { data: { session } } = await client.auth.getSession();
  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim();

  if (session?.user?.is_anonymous) {
    const result = await client.auth.updateUser(
      { email, data: { full_name: fullName } },
      { emailRedirectTo: redirectUrl('/account/reset/?mode=finish-account') },
    );
    return {
      data: result.data,
      error: result.error,
      session: null,
      conversionStarted: !result.error,
      passwordAccepted: false,
    };
  }

  const result = await client.auth.signUp({
    email,
    password: input.password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: redirectUrl('/account/?confirmed=1'),
    },
  });
  return {
    data: result.data,
    error: result.error,
    session: result.data.session,
    conversionStarted: false,
    passwordAccepted: !result.error,
  };
}

export async function requestPasswordReset(email: string) {
  return getSupabaseBrowserClient().auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: redirectUrl('/account/reset/'),
  });
}

export async function updateAccountPassword(password: string) {
  return getSupabaseBrowserClient().auth.updateUser({ password });
}

export async function signOutAccount() {
  return getSupabaseBrowserClient().auth.signOut({ scope: 'local' });
}
