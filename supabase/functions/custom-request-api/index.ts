import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { z } from 'npm:zod@4.6.7';
import { sendCustomRequestConfirmation } from '../_shared/notification.ts';
import { configuredNotificationDelivery } from '../_shared/configuredNotification.ts';
import { validateUpload } from '../_shared/uploadValidation.ts';

const bucket = 'custom-request-files';
const allowedExtensions = new Set(['.stl','.3mf','.obj','.step','.stp','.glb','.gltf','.pdf','.jpg','.jpeg','.png']);
const allowedMimes = new Set(['model/stl','application/sla','application/vnd.ms-pki.stl','model/3mf','application/vnd.ms-package.3dmanufacturing-3dmodel+xml','model/obj','text/plain','application/step','model/step','model/gltf-binary','model/gltf+json','application/json','application/pdf','image/jpeg','image/png','application/octet-stream']);
const maxFileBytes = 50 * 1024 * 1024;
const maxTotalBytes = 150 * 1024 * 1024;
const maxFiles = 5;

class PublicError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

const submissionSchema = z.object({
  requestType: z.enum(['3d_file','drawing_dimensions','image_reference','modify_design','custom_product','replacement_part','other']),
  title: z.string().trim().min(3).max(120), description: z.string().trim().min(20).max(3000), intendedUse: z.string().trim().min(3).max(1000),
  functionalPurpose: z.string().trim().max(1000), usedWhere: z.string().trim().max(1000), loadConditions: z.string().trim().max(1000),
  heatExposure: z.boolean(), outdoorUse: z.boolean(), waterChemicalExposure: z.boolean(), exactDimensions: z.string().trim().max(1000), originalPartAvailable: z.boolean(), safetyNotes: z.string().trim().max(1500),
  length: z.number().positive().max(1_000_000).nullable(), width: z.number().positive().max(1_000_000).nullable(), height: z.number().positive().max(1_000_000).nullable(), dimensionUnit: z.enum(['mm','cm','in']),
  material: z.enum(['not_sure','pla','petg','tpu','abs','resin']), colorPreference: z.enum(['no_preference','specific']), colorDetails: z.string().trim().max(200),
  personalizationType: z.string().trim().max(120), personalizationText: z.string().trim().max(500), quantity: z.number().int().min(1).max(100000), targetDate: z.string().max(10),
  deliveryMethod: z.enum(['shipping','local_pickup','local_delivery']), pinCode: z.string().regex(/^$|^[1-9][0-9]{5}$/), city: z.string().trim().max(100), state: z.string().trim().max(100),
  verificationRequested: z.boolean(), notes: z.string().trim().max(3000), customerName: z.string().trim().min(2).max(120), customerEmail: z.email().max(254), customerPhone: z.string().regex(/^$|^[+0-9 ()-]{7,20}$/),
  communicationMethod: z.enum(['email','phone']), language: z.enum(['english','hindi','assamese']), policyConsent: z.literal(true), accuracyConsent: z.literal(true), website: z.literal(''), sourceProductSlug: z.string().regex(/^$|^[a-z0-9-]{1,120}$/), fileIds: z.array(z.uuid()).max(maxFiles),
}).superRefine((value, context) => {
  if (value.requestType === 'replacement_part') {
    if (!value.functionalPurpose) context.addIssue({ code: 'custom', path: ['functionalPurpose'], message: 'Functional purpose is required.' });
    if (!value.usedWhere) context.addIssue({ code: 'custom', path: ['usedWhere'], message: 'Use location is required.' });
    if (!value.exactDimensions) context.addIssue({ code: 'custom', path: ['exactDimensions'], message: 'Known dimensions or an explanation is required.' });
  }
  if (value.colorPreference === 'specific' && !value.colorDetails) context.addIssue({ code: 'custom', path: ['colorDetails'], message: 'Colour detail is required.' });
  if (value.deliveryMethod !== 'local_pickup' && (!value.pinCode || !value.city || !value.state)) context.addIssue({ code: 'custom', path: ['deliveryMethod'], message: 'Delivery location is required.' });
  if (value.communicationMethod === 'phone' && !value.customerPhone) context.addIssue({ code: 'custom', path: ['customerPhone'], message: 'Phone is required for phone contact.' });
  if (['3d_file','drawing_dimensions','image_reference'].includes(value.requestType) && value.fileIds.length === 0) context.addIssue({ code: 'custom', path: ['fileIds'], message: 'A supporting file is required for this request type.' });
});

function response(origin: string | null, status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin || '', 'Vary': 'Origin' } });
}

function extensionOf(name: string) {
  const clean = name.normalize('NFKC').replace(/[\u0000-\u001f\u007f]/g, '');
  const dot = clean.lastIndexOf('.');
  return dot >= 0 ? clean.slice(dot).toLowerCase() : '';
}

function safeOriginalName(name: string) {
  return name.normalize('NFKC').replace(/[\u0000-\u001f\u007f]/g, '').replace(/[\\/]/g, '_').slice(0, 180);
}

function toMm(value: number | null, unit: 'mm' | 'cm' | 'in') {
  if (value === null) return null;
  return value * (unit === 'cm' ? 10 : unit === 'in' ? 25.4 : 1);
}

// File-structure validation lives in ../_shared/uploadValidation.ts (shared with bulk-request-api).

function publicId() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return `CR-${new Date().getUTCFullYear()}-${Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('')}`;
}

async function hash(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (request) => {
  const origin = request.headers.get('origin');
  const allowedOrigins = (Deno.env.get('CUSTOM_ORDER_ALLOWED_ORIGINS') || '').split(',').map((item) => item.trim()).filter(Boolean);
  if (origin && !allowedOrigins.includes(origin)) return response(null, 403, { ok: false, error: 'Origin is not allowed.' });
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': origin || '', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin' } });
  if (request.method !== 'POST') return response(origin, 405, { ok: false, error: 'Method not allowed.' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const publicKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';
  const secretKey = Deno.env.get('SUPABASE_SECRET_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!supabaseUrl || !publicKey || !secretKey || !Deno.env.get('RATE_LIMIT_SALT')) return response(origin, 503, { ok: false, error: 'The secure custom-order backend is not fully configured.' });

  const authorization = request.headers.get('authorization') || '';
  const token = authorization.replace(/^Bearer\s+/i, '');
  const authClient = createClient(supabaseUrl, publicKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
  const { data: { user }, error: userError } = await authClient.auth.getUser(token);
  if (userError || !user) return response(origin, 401, { ok: false, error: 'A valid guest or customer session is required.' });
  const admin = createClient(supabaseUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return response(origin, 400, { ok: false, error: 'Invalid JSON body.' }); }
  const action = String(body.action || '');

  try {
    if (action === 'prepare-request') {
      const sourceProductSlug = String(body.sourceProductSlug || '');
      if (sourceProductSlug && !/^[a-z0-9-]{1,120}$/.test(sourceProductSlug)) throw new PublicError('Invalid source product reference.');
      const { data, error } = await admin.from('custom_requests').insert({ customer_id: user.id, source_product_slug: sourceProductSlug || null }).select('id').single();
      if (error) throw error;
      return response(origin, 200, { ok: true, data: { requestId: data.id } });
    }

    const requestId = z.uuid().parse(body.requestId);
    const { data: draft, error: draftError } = await admin.from('custom_requests').select('id,status').eq('id', requestId).eq('customer_id', user.id).single();
    if (draftError || !draft || draft.status !== 'DRAFT') return response(origin, 404, { ok: false, error: 'Owned draft request was not found.' });

    if (action === 'prepare-upload') {
      const file = z.object({ name: z.string().min(1).max(255), size: z.number().int().positive().max(maxFileBytes), type: z.string().max(150) }).parse(body.file);
      const extension = extensionOf(file.name);
      if (!allowedExtensions.has(extension)) throw new PublicError('This file extension is not accepted.');
      const mime = file.type || 'application/octet-stream';
      if (!allowedMimes.has(mime)) throw new PublicError('This file MIME type is not accepted.');
      const { data: existing, error: existingError } = await admin.from('custom_request_files').select('size_bytes').eq('request_id', requestId).neq('upload_status', 'REJECTED');
      if (existingError) throw existingError;
      if (existing.length >= maxFiles) throw new PublicError('Maximum file count reached.');
      if (existing.reduce((sum, item) => sum + Number(item.size_bytes), 0) + file.size > maxTotalBytes) throw new PublicError('Combined file size exceeds 150 MB.');
      const fileId = crypto.randomUUID();
      const storagePath = `${user.id}/${requestId}/${fileId}${extension}`;
      const { error } = await admin.from('custom_request_files').insert({ id: fileId, request_id: requestId, customer_id: user.id, storage_path: storagePath, original_filename: safeOriginalName(file.name), file_extension: extension, mime_type: mime, size_bytes: file.size });
      if (error) throw error;
      return response(origin, 200, { ok: true, data: { fileId, storagePath, bucket } });
    }

    if (action === 'finalize-upload') {
      const fileId = z.uuid().parse(body.fileId);
      const { data: fileRow, error: fileError } = await admin.from('custom_request_files').select('*').eq('id', fileId).eq('request_id', requestId).eq('customer_id', user.id).single();
      if (fileError || !fileRow) throw new PublicError('Prepared file record was not found.');
      const objectUrl = `${supabaseUrl}/storage/v1/object/authenticated/${bucket}/${fileRow.storage_path}`;
      const read = (range: { start: number; end: number } | null) => fetch(objectUrl, { headers: range ? { apikey: publicKey, Authorization: `Bearer ${token}`, Range: `bytes=${range.start}-${range.end}` } : { apikey: publicKey, Authorization: `Bearer ${token}` } });
      const metadataSize = async () => {
        const info = await fetch(`${supabaseUrl}/storage/v1/object/info/authenticated/${bucket}/${fileRow.storage_path}`, { headers: { apikey: publicKey, Authorization: `Bearer ${token}` } });
        if (!info.ok) return null;
        const size = Number((await info.json())?.size);
        return Number.isSafeInteger(size) ? size : null;
      };
      const check = await validateUpload({ extension: fileRow.file_extension, read, metadataSize });
      if (!check.ok && ['OBJECT_UNREADABLE', 'SIZE_UNVERIFIABLE'].includes(check.code)) throw new PublicError(check.message);
      const valid = check.ok && check.totalSize === Number(fileRow.size_bytes);
      if (!valid) {
        await admin.storage.from(bucket).remove([fileRow.storage_path]);
        await admin.from('custom_request_files').update({ upload_status: 'REJECTED', signature_status: 'REJECTED' }).eq('id', fileId);
        throw new PublicError('File signature does not match its extension.');
      }
      const signatureStatus = ['.stl','.obj','.3mf'].includes(fileRow.file_extension) || (fileRow.file_extension === '.gltf' && check.ok && check.verification !== 'FULL') ? 'UNVERIFIED_ALLOWED' : 'VALIDATED';
      const { error } = await admin.from('custom_request_files').update({ upload_status: 'READY', signature_status: signatureStatus }).eq('id', fileId);
      if (error) throw error;
      return response(origin, 200, { ok: true, data: { fileId, state: 'READY' } });
    }

    if (action === 'remove-upload') {
      const fileId = z.uuid().parse(body.fileId);
      const { data: fileRow } = await admin.from('custom_request_files').select('storage_path').eq('id', fileId).eq('request_id', requestId).eq('customer_id', user.id).single();
      if (fileRow) await admin.storage.from(bucket).remove([fileRow.storage_path]);
      await admin.from('custom_request_files').delete().eq('id', fileId).eq('request_id', requestId).eq('customer_id', user.id);
      return response(origin, 200, { ok: true, data: { removed: true } });
    }

    if (action === 'submit-request') {
      const parsed = submissionSchema.safeParse(body.submission);
      if (!parsed.success) return response(origin, 422, { ok: false, error: parsed.error.issues[0]?.message || 'Submission validation failed.' });
      const submission = parsed.data;
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
      const ipHash = await hash(`${Deno.env.get('RATE_LIMIT_SALT')}:${ip}`);
      const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { count } = await admin.from('custom_request_events').select('id', { count: 'exact', head: true }).eq('event_type', 'SUBMISSION_ATTEMPT').eq('actor_hash', ipHash).gte('created_at', since);
      if ((count || 0) >= 5) return response(origin, 429, { ok: false, error: 'Too many submission attempts. Please wait and try again.' });
      await admin.from('custom_request_events').insert({ request_id: requestId, event_type: 'SUBMISSION_ATTEMPT', actor_hash: ipHash });

      const rpcPayload = {
        ...submission,
        lengthMm: toMm(submission.length, submission.dimensionUnit), widthMm: toMm(submission.width, submission.dimensionUnit), heightMm: toMm(submission.height, submission.dimensionUnit),
        functionalDetails: { purpose: submission.functionalPurpose, usedWhere: submission.usedWhere, loadConditions: submission.loadConditions, heatExposure: submission.heatExposure, outdoorUse: submission.outdoorUse, waterChemicalExposure: submission.waterChemicalExposure, exactDimensions: submission.exactDimensions, originalPartAvailable: submission.originalPartAvailable, safetyNotes: submission.safetyNotes },
      };
      let reference = '';
      let submittedAt = '';
      for (let attempt = 0; attempt < 4; attempt += 1) {
        reference = publicId();
        const { data, error } = await admin.rpc('submit_custom_request_server', { p_request_id: requestId, p_customer_id: user.id, p_public_request_id: reference, p_submission: rpcPayload, p_file_ids: submission.fileIds });
        if (!error) { submittedAt = data; break; }
        if (error.code !== '23505') throw error;
      }
      if (!submittedAt) throw new PublicError('A unique request reference could not be created.');
      await sendCustomRequestConfirmation({ publicRequestId: reference, customerEmail: submission.customerEmail.toLowerCase(), submittedAt }, configuredNotificationDelivery(admin));
      return response(origin, 200, { ok: true, data: { publicRequestId: reference, submittedAt } });
    }

    return response(origin, 400, { ok: false, error: 'Unknown action.' });
  } catch (error) {
    console.error('custom-request-api', action, error instanceof Error ? error.message : error);
    if (error instanceof PublicError) return response(origin, error.status, { ok: false, error: error.message });
    if (error instanceof z.ZodError) return response(origin, 422, { ok: false, error: error.issues[0]?.message || 'Validation failed.' });
    return response(origin, 500, { ok: false, error: 'The custom request could not be processed. Please try again.' });
  }
});
