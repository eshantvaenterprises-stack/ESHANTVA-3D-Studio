// Server-only additive canonical website policy. Existing allowlists stay authoritative.
export function isCanonicalWebsiteOrigin(origin: string | null): boolean {
  const canonical = 'https://eshantva3d.co.in';
  const configured = Deno.env.get('CANONICAL_WEBSITE_ALLOWED_ORIGIN');
  if (origin !== canonical || configured !== canonical) return false;
  try {
    const parsed = new URL(origin);
    return parsed.protocol === 'https:' && parsed.hostname === 'eshantva3d.co.in' &&
      parsed.origin === origin && parsed.port === '' && parsed.username === '' &&
      parsed.password === '' && parsed.pathname === '/' && !parsed.search && !parsed.hash;
  } catch { return false; }
}
