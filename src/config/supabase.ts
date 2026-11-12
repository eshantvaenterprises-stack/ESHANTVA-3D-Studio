/**
 * Public Supabase adapter configuration for ESHANTVA 3D Studio.
 * The publishable key is designed for browser use; authorization remains
 * enforced by Auth, RLS, Storage policies and Edge Functions.
 */

export const supabasePublicConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') || '',
  publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
} as const;

export function supabaseFunctionUrl(slug: string, explicit?: string) {
  return explicit || `${supabasePublicConfig.url}/functions/v1/${slug}`;
}
