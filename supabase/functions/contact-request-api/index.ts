import { isCanonicalWebsiteOrigin } from '../_shared/canonicalOrigin.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { z } from 'npm:zod@4.6.7';

const maxBodyBytes = 16 * 1024;
const rateWindowMinutes = 15;
const maxAttemptsPerWindow = 8;

class PublicError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const reasonSchema = z.enum([
  'general_business',
  'product_question',
  'custom_order_question',
  'bulk_order_question',
  'appointment_request',
  'existing_order_request',
  'collaboration_business',
  'other',
]);

const contactSchema = z.object({
  reason: reasonSchema,
  name: z.string().trim().min(2).max(120),
  email: z.email().max(254),
  orderReference: z.string().trim().max(80),
  message: z.string().trim().min(10).max(3000),
  website: z.literal(''),
});

const appointmentSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email().max(254),
  purpose: z.string().trim().min(3).max(240),
  preferredDate: z.iso.date(),
  preferredPeriod: z.enum(['morning', 'afternoon', 'evening', 'specific_time']),
  specificTime: z.string().regex(/^$|^(?:[01]\d|2[0-3]):[0-5]\d$/),
  orderReference: z.string().trim().max(80),
  notes: z.string().trim().max(1500),
  website: z.literal(''),
}).superRefine((value, context) => {
  if (value.preferredPeriod === 'specific_time' && !value.specificTime) {
    context.addIssue({ code: 'custom', path: ['specificTime'], message: 'A specific preferred time is required.' });
  }
  const today = currentDateInBusinessTimeZone();
  if (value.preferredDate < today) {
    context.addIssue({ code: 'custom', path: ['preferredDate'], message: 'Preferred date cannot be in the past.' });
  }
});

function reply(origin: string | null, status: number, body: unknown) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Vary': 'Origin',
  };
  if (origin) headers['Access-Control-Allow-Origin'] = origin;
  return new Response(JSON.stringify(body), {
    status,
    headers,
  });
}

async function readBodyText(request: Request) {
  const contentLength = Number(request.headers.get('content-length') || '0');
  if (Number.isFinite(contentLength) && contentLength > maxBodyBytes) {
    throw new PublicError('Request data is too large.', 413);
  }

  if (!request.body) return '';
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let bodyText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytesRead += value.byteLength;
    if (bytesRead > maxBodyBytes) {
      await reader.cancel();
      throw new PublicError('Request data is too large.', 413);
    }
    bodyText += decoder.decode(value, { stream: true });
  }

  return bodyText + decoder.decode();
}

function currentDateInBusinessTimeZone() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

async function hash(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function publicReference(kind: 'contact' | 'appointment') {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const suffix = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
  return `${kind === 'appointment' ? 'AP' : 'CW'}-${new Date().getUTCFullYear()}-${suffix}`;
}

function isExactPreviewOrigin(origin: string | null, variable: string): boolean {
  const configured = (Deno.env.get(variable) || '').trim();
  if (!origin || origin !== configured) return false;
  try {
    const parsed = new URL(configured);
    return parsed.protocol === 'https:' && parsed.origin === configured &&
      parsed.hostname.endsWith('.netlify.app') && !parsed.port &&
      !parsed.username && !parsed.password;
  } catch { return false; }
}

Deno.serve(async (request) => {
  const origin = request.headers.get('origin');
  const allowedOrigins = (Deno.env.get('CONTACT_ALLOWED_ORIGINS') || '')
    .split(',').map((value) => value.trim()).filter(Boolean);
  const allowedOrigin = origin && (allowedOrigins.includes(origin) || isCanonicalWebsiteOrigin(origin) || isExactPreviewOrigin(origin, 'CONTACT_PREVIEW_ALLOWED_ORIGIN')) ? origin : null;

  if (origin && !allowedOrigin) return reply(null, 403, { ok: false, error: 'Origin is not allowed.' });
  if (request.method === 'OPTIONS') {
    const headers: Record<string, string> = {
      'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Vary': 'Origin',
    };
    if (allowedOrigin) headers['Access-Control-Allow-Origin'] = allowedOrigin;
    return new Response(null, {
      status: 204,
      headers,
    });
  }
  if (request.method !== 'POST') return reply(allowedOrigin, 405, { ok: false, error: 'Method not allowed.' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const publicKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';
  const secretKey = Deno.env.get('SUPABASE_SECRET_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const rateLimitSalt = Deno.env.get('RATE_LIMIT_SALT') || '';
  if (!supabaseUrl || !publicKey || !secretKey || !rateLimitSalt) {
    return reply(allowedOrigin, 503, { ok: false, error: 'The secure contact backend is not fully configured.' });
  }

  const authorization = request.headers.get('authorization') || '';
  const accessToken = authorization.replace(/^Bearer\s+/i, '');
  const authClient = createClient(supabaseUrl, publicKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: userError } = await authClient.auth.getUser(accessToken);
  if (userError || !user) return reply(allowedOrigin, 401, { ok: false, error: 'A valid guest or customer session is required.' });

  const admin = createClient(supabaseUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
  // Managed Supabase Edge Functions receive the gateway-normalized forwarding chain.
  // Supabase's official Edge Function examples use the first x-forwarded-for value.
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const actorHash = await hash(`${rateLimitSalt}:${ip}`);
  const rateSince = new Date(Date.now() - rateWindowMinutes * 60 * 1000).toISOString();

  try {
    // Record before parsing so malformed JSON, honeypot and oversized attempts count.
    const { data: attempt, error: attemptError } = await admin.from('contact_request_events').insert({
      event_type: 'SUBMISSION_ATTEMPT',
      actor_hash: actorHash,
    }).select('id').single();
    if (attemptError) throw attemptError;

    const { count, error: countError } = await admin.from('contact_request_events')
      .select('id', { count: 'exact', head: true })
      .eq('event_type', 'SUBMISSION_ATTEMPT')
      .eq('actor_hash', actorHash)
      .gte('created_at', rateSince);
    if (countError) throw countError;
    if ((count || 0) > maxAttemptsPerWindow) throw new PublicError('Too many requests were submitted. Please wait and try again.', 429);

    const bodyText = await readBodyText(request);
    let body: Record<string, unknown>;
    try {
      const parsedBody: unknown = JSON.parse(bodyText);
      if (!parsedBody || typeof parsedBody !== 'object' || Array.isArray(parsedBody)) throw new Error('invalid_body');
      body = parsedBody as Record<string, unknown>;
    } catch {
      throw new PublicError('Invalid JSON body.');
    }

    const kind = body.kind === 'appointment' ? 'appointment' : body.kind === 'contact' ? 'contact' : null;
    if (!kind) throw new PublicError('Unknown request type.');

    const rawSubmission = body.submission;
    const reference = publicReference(kind);
    const submittedAt = new Date().toISOString();

    let payload: Record<string, unknown>;
    if (kind === 'contact') {
      const parsed = contactSchema.parse(rawSubmission);
      payload = {
        customer_id: user.id,
        public_reference: reference,
        request_kind: 'CONTACT',
        reason: parsed.reason,
        name: parsed.name,
        email: parsed.email.toLowerCase(),
        order_reference: parsed.orderReference || null,
        message: parsed.message,
        source: 'website-contact',
        page: '/contact',
        status: 'RECEIVED',
        submitted_at: submittedAt,
      };
    } else {
      const parsed = appointmentSchema.parse(rawSubmission);
      payload = {
        customer_id: user.id,
        public_reference: reference,
        request_kind: 'APPOINTMENT',
        reason: 'appointment_request',
        name: parsed.name,
        email: parsed.email.toLowerCase(),
        order_reference: parsed.orderReference || null,
        message: parsed.notes || null,
        appointment_purpose: parsed.purpose,
        preferred_date: parsed.preferredDate,
        preferred_period: parsed.preferredPeriod,
        preferred_time: parsed.preferredPeriod === 'specific_time' ? parsed.specificTime : null,
        source: 'website-contact',
        page: '/contact',
        status: 'REQUESTED',
        submitted_at: submittedAt,
      };
    }

    const { data: inserted, error: insertError } = await admin.from('contact_requests').insert(payload).select('id').single();
    if (insertError) throw insertError;
    const { error: eventError } = await admin.from('contact_request_events').update({ contact_request_id: inserted.id }).eq('id', attempt.id);
    if (eventError) throw eventError;

    return reply(allowedOrigin, 200, { ok: true, data: { publicReference: reference, submittedAt } });
  } catch (error) {
    if (error instanceof z.ZodError) return reply(allowedOrigin, 400, { ok: false, error: 'Please check the submitted information and try again.' });
    if (error instanceof PublicError) return reply(allowedOrigin, error.status, { ok: false, error: error.message });
    console.error('contact-request-api failure', error instanceof Error ? error.message : 'unknown_error');
    return reply(allowedOrigin, 500, { ok: false, error: 'We could not submit this request. Please try again or contact us by email.' });
  }
});
