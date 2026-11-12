/** Explicit environment gating for the closed-registration recruitment system.
 * Never infer authorization from the committed fallback production URL/key.
 * Enabling the UI does not bypass Auth, RLS, Edge authorization or server flags.
 */
const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, '') ?? '';
const configuredKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '';
const approvedProjectUrls = new Set([
  'https://rjamqgbdzytujqxkecga.supabase.co', // Stage 2B Staging
  'https://lckcibqosxgwxycvqzxp.supabase.co', // Main ESHANTVA production
]);

export const recruitmentRuntimeConfigured =
  process.env.NEXT_PUBLIC_RECRUITMENT_PORTAL_ENABLED === 'true' &&
  approvedProjectUrls.has(configuredUrl) &&
  configuredKey.length > 0;
