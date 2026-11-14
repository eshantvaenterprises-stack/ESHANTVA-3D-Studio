import { createClient } from 'npm:@supabase/supabase-js@2.116.0';
import { z } from 'npm:zod@4.6.7';
import { sendBulkRequestConfirmation } from '../_shared/notification.ts';
import { configuredNotificationDelivery } from '../_shared/configuredNotification.ts';
import { validateUpload, readPrefix } from '../_shared/uploadValidation.ts';

const bucket = 'bulk-request-files';
const maxFiles = 5;
const maxFileBytes = 50 * 1024 * 1024;
const maxCsvBytes = 5 * 1024 * 1024;
const maxTotalBytes = 150 * 1024 * 1024;
const maxBodyBytes = 256 * 1024;
const allowedExtensions = new Set(['.stl','.3mf','.obj','.step','.stp','.glb','.gltf','.pdf','.jpg','.jpeg','.png','.csv']);
const allowedMimes = new Set(['model/stl','application/sla','application/vnd.ms-pki.stl','model/3mf','application/vnd.ms-package.3dmanufacturing-3dmodel+xml','model/obj','text/plain','application/step','model/step','model/gltf-binary','model/gltf+json','application/json','application/pdf','image/jpeg','image/png','application/octet-stream','text/csv','application/csv']);

const itemSchema = z.object({
  localId: z.string().min(1).max(80),
  productId: z.string().trim().max(120).nullable(),
  productSlug: z.string().trim().regex(/^[a-z0-9-]+$/).max(120).nullable(),
  itemType: z.enum(['catalog','custom']),
  description: z.string().trim().max(3000),
  quantity: z.number().int().min(1).max(1_000_000),
  configuration: z.record(z.string().max(120), z.union([z.string().trim().max(500), z.boolean()])),
  sameCustomizationForAll: z.boolean().nullable(),
  customizationMode: z.enum(['same','different']),
  customizationNotes: z.string().trim().max(3000),
  notes: z.string().trim().max(3000),
});

const submissionSchema = z.object({
  bulkType: z.enum(['existing_product','customized_product','custom_requirement']),
  items: z.array(itemSchema).min(1).max(25),
  requirementTitle: z.string().trim().max(120),
  requirementDescription: z.string().trim().max(3000),
  intendedUse: z.string().trim().max(1000),
  dimensions: z.string().trim().max(1000),
  materialPreference: z.string().trim().max(300),
  colorPreference: z.string().trim().max(300),
  repeatType: z.enum(['one_time','repeat','not_sure']),
  repeatFrequency: z.enum(['','weekly','monthly','quarterly','as_needed','custom']),
  quantityPerCycle: z.number().int().min(1).max(1_000_000).nullable(),
  repeatNotes: z.string().trim().max(1500),
  targetDate: z.string().regex(/^$|^\d{4}-\d{2}-\d{2}$/),
  deliveryMethod: z.enum(['shipping','local_pickup','local_delivery']),
  postalCode: z.string().trim().regex(/^$|^[1-9][0-9]{5}$/),
  city: z.string().trim().max(100),
  state: z.string().trim().max(100),
  organizationType: z.enum(['individual','business','organization','institution','event_group','other']),
  organizationName: z.string().trim().max(200),
  contactPerson: z.string().trim().min(2).max(120),
  role: z.string().trim().max(120),
  email: z.email().max(254),
  phone: z.string().trim().regex(/^$|^[+0-9 ()-]{7,20}$/),
  preferredLanguage: z.enum(['english','hindi','assamese']),
  poReference: z.string().trim().max(120),
  hasTargetBudget: z.boolean(),
  targetBudget: z.number().positive().max(1_000_000_000).nullable(),
  targetUnitPrice: z.number().positive().max(100_000_000).nullable(),
  verificationRequested: z.boolean(),
  customerNotes: z.string().trim().max(3000),
  accuracyConsent: z.literal(true),
  fileConsent: z.boolean(),
  website: z.literal(''),
  fileIds: z.array(z.uuid()).max(maxFiles),
  catalogMode: z.literal('live'),
}).superRefine((value, context) => {
  if (value.bulkType === 'custom_requirement') {
    if (value.requirementTitle.length < 3 || value.requirementDescription.length < 20 || value.intendedUse.length < 3) {
      context.addIssue({ code: 'custom', path: ['requirementDescription'], message: 'Add a title, detailed requirement and intended use.' });
    }
    if (value.items.some((item) => item.itemType !== 'custom' || item.productId || item.productSlug)) {
      context.addIssue({ code: 'custom', path: ['items'], message: 'Custom requirement items cannot claim a catalog product identity.' });
    }
  } else if (value.items.some((item) => item.itemType !== 'catalog' || !item.productSlug)) {
    context.addIssue({ code: 'custom', path: ['items'], message: 'Every catalog line item must reference an active Shop product.' });
  }
  if (value.bulkType === 'customized_product' && value.items.some((item) => item.customizationNotes.length < 3)) {
    context.addIssue({ code: 'custom', path: ['items'], message: 'Describe the customization for every selected product.' });
  }
  if (value.repeatType === 'repeat' && !value.repeatFrequency) {
    context.addIssue({ code: 'custom', path: ['repeatFrequency'], message: 'Choose the expected repeat frequency.' });
  }
  if (value.deliveryMethod !== 'local_pickup' && (!value.postalCode || !value.city || !value.state)) {
    context.addIssue({ code: 'custom', path: ['deliveryMethod'], message: 'PIN code, city and state are required for this delivery method.' });
  }
  if (value.organizationType !== 'individual' && !value.organizationName) {
    context.addIssue({ code: 'custom', path: ['organizationName'], message: 'Add the organization or group name.' });
  }
  if (value.hasTargetBudget && value.targetBudget === null) {
    context.addIssue({ code: 'custom', path: ['targetBudget'], message: 'Add the target budget or remove the budget selection.' });
  }
  if (value.fileIds.length > 0 && !value.fileConsent) {
    context.addIssue({ code: 'custom', path: ['fileConsent'], message: 'Confirm that you are authorized to submit the attached files.' });
  }
});

const catalogProductSchema = z.object({
  id: z.string().trim().min(1).max(120),
  slug: z.string().trim().regex(/^[a-z0-9-]+$/).max(120),
  customisable: z.boolean(),
});

class PublicError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

function reply(origin: string | null, status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin || '',
      'Vary': 'Origin',
    },
  });
}

function extensionOf(name: string) {
  const clean = name.normalize('NFKC').replace(/[\u0000-\u001f\u007f]/g, '');
  const dot = clean.lastIndexOf('.');
  return dot >= 0 ? clean.slice(dot).toLowerCase() : '';
}

function safeOriginalName(name: string) {
  return name.normalize('NFKC').replace(/[\u0000-\u001f\u007f]/g, '').replace(/[\\/]/g, '_').slice(0, 180);
}

function inferredFileRole(extension: string) {
  if (extension === '.csv') return 'PERSONALIZATION_LIST';
  if (['.jpg','.jpeg','.png'].includes(extension)) return 'REFERENCE';
  if (extension === '.pdf') return 'SPECIFICATION';
  return '3D_MODEL';
}

// File-structure validation lives in ../_shared/uploadValidation.ts (shared with custom-request-api).

function validateCsv(bytes: Uint8Array) {
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new PublicError('CSV must use UTF-8 text encoding.');
  }
  if (!text.trim() || text.includes('\u0000')) throw new PublicError('CSV is empty or contains invalid binary data.');

  let row = 1;
  let column = 1;
  let inQuotes = false;
  let cell = '';
  const finishCell = () => {
    if (cell.length > 2000) throw new PublicError('CSV cells must contain 2,000 characters or fewer.');
    if (/^[\s\t]*[=+\-@]/.test(cell)) throw new PublicError('CSV formula-like cells are not accepted. Submit plain text values only.');
    cell = '';
  };
  const finishRow = () => {
    finishCell();
    if (column > 40) throw new PublicError('CSV files may contain at most 40 columns.');
    row += 1;
    column = 1;
    if (row > 10_000) throw new PublicError('CSV files may contain at most 10,000 rows.');
  };

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (inQuotes && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (character === ',' && !inQuotes) {
      finishCell();
      column += 1;
      if (column > 40) throw new PublicError('CSV files may contain at most 40 columns.');
    } else if ((character === '\n' || character === '\r') && !inQuotes) {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      finishRow();
    } else {
      cell += character;
    }
  }
  if (inQuotes) throw new PublicError('CSV contains an unfinished quoted value.');
  if (cell.length || column > 1) finishRow();
}

function publicId() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return `BR-${new Date().getUTCFullYear()}-${Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('')}`;
}

async function hash(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function getCatalog() {
  const raw = Deno.env.get('BULK_ACTIVE_PRODUCTS_JSON') || '';
  if (!raw) return new Map<string, z.infer<typeof catalogProductSchema>>();
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    throw new Error('BULK_ACTIVE_PRODUCTS_JSON is not valid JSON.');
  }
  const products = z.array(catalogProductSchema).max(1000).parse(decoded);
  return new Map(products.map((product) => [product.slug, product]));
}

Deno.serve(async (request) => {
  const origin = request.headers.get('origin');
  const allowedOrigins = (Deno.env.get('BULK_ORDER_ALLOWED_ORIGINS') || '').split(',').map((value) => value.trim()).filter(Boolean);
  if (origin && !allowedOrigins.includes(origin)) return reply(null, 403, { ok: false, error: 'Origin is not allowed.' });
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin || '',
        'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Vary': 'Origin',
      },
    });
  }
  if (request.method !== 'POST') return reply(origin, 405, { ok: false, error: 'Method not allowed.' });
  if (Deno.env.get('BULK_CATALOG_MODE') !== 'live') {
    return reply(origin, 503, { ok: false, error: 'Bulk submission is disabled until the approved live catalog is configured.' });
  }
  const contentLength = Number(request.headers.get('content-length') || '0');
  if (Number.isFinite(contentLength) && contentLength > maxBodyBytes) {
    return reply(origin, 413, { ok: false, error: 'Request data is too large.' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const publicKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';
  const secretKey = Deno.env.get('SUPABASE_SECRET_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!supabaseUrl || !publicKey || !secretKey || !Deno.env.get('RATE_LIMIT_SALT')) {
    return reply(origin, 503, { ok: false, error: 'The secure bulk enquiry backend is not fully configured.' });
  }

  const authorization = request.headers.get('authorization') || '';
  const accessToken = authorization.replace(/^Bearer\s+/i, '');
  const authClient = createClient(supabaseUrl, publicKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: userError } = await authClient.auth.getUser(accessToken);
  if (userError || !user) return reply(origin, 401, { ok: false, error: 'A valid guest or customer session is required.' });
  const admin = createClient(supabaseUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return reply(origin, 400, { ok: false, error: 'Invalid JSON body.' });
  }
  const action = String(body.action || '');
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const actorHash = await hash(`${Deno.env.get('RATE_LIMIT_SALT')}:${ip}`);
  const rateLimitSince = new Date(Date.now() - 15 * 60 * 1000).toISOString();

  try {
    if (action === 'prepare-request') {
      const { count, error: countError } = await admin.from('bulk_request_events').select('id', { count: 'exact', head: true }).eq('event_type', 'DRAFT_PREPARED').eq('actor_hash', actorHash).gte('created_at', rateLimitSince);
      if (countError) throw countError;
      if ((count || 0) >= 10) throw new PublicError('Too many enquiry drafts were started. Please wait and try again.', 429);
      const { data, error } = await admin.from('bulk_requests').insert({ customer_id: user.id }).select('id').single();
      if (error) throw error;
      const { error: eventError } = await admin.from('bulk_request_events').insert({ bulk_request_id: data.id, event_type: 'DRAFT_PREPARED', actor_hash: actorHash });
      if (eventError) throw eventError;
      return reply(origin, 200, { ok: true, data: { requestId: data.id } });
    }

    const requestId = z.uuid().parse(body.requestId);
    const { data: draft, error: draftError } = await admin.from('bulk_requests').select('id,status').eq('id', requestId).eq('customer_id', user.id).single();
    if (draftError || !draft || draft.status !== 'DRAFT') throw new PublicError('Owned draft enquiry was not found.', 404);

    if (action === 'prepare-upload') {
      const file = z.object({
        name: z.string().min(1).max(255),
        size: z.number().int().positive().max(maxFileBytes),
        type: z.string().max(150),
      }).parse(body.file);
      const extension = extensionOf(file.name);
      if (!allowedExtensions.has(extension)) throw new PublicError('This file extension is not accepted.');
      if (extension === '.csv' && file.size > maxCsvBytes) throw new PublicError('CSV files must be 5 MB or smaller.');
      const mime = file.type || 'application/octet-stream';
      if (!allowedMimes.has(mime)) throw new PublicError('This file MIME type is not accepted.');
      const { data: existing, error: existingError } = await admin.from('bulk_request_files').select('size_bytes').eq('bulk_request_id', requestId).neq('upload_status', 'REJECTED');
      if (existingError) throw existingError;
      if (existing.length >= maxFiles) throw new PublicError('Maximum file count reached.');
      if (existing.reduce((sum, item) => sum + Number(item.size_bytes), 0) + file.size > maxTotalBytes) {
        throw new PublicError('Combined file size exceeds 150 MB.');
      }
      const fileId = crypto.randomUUID();
      const storagePath = `${user.id}/${requestId}/${fileId}${extension}`;
      const { error } = await admin.from('bulk_request_files').insert({
        id: fileId,
        bulk_request_id: requestId,
        customer_id: user.id,
        storage_path: storagePath,
        original_filename: safeOriginalName(file.name),
        file_extension: extension,
        mime_type: mime,
        size_bytes: file.size,
        file_role: inferredFileRole(extension),
      });
      if (error) throw error;
      return reply(origin, 200, { ok: true, data: { fileId, storagePath, bucket } });
    }

    if (action === 'finalize-upload') {
      const fileId = z.uuid().parse(body.fileId);
      const { data: fileRow, error: fileError } = await admin.from('bulk_request_files').select('*').eq('id', fileId).eq('bulk_request_id', requestId).eq('customer_id', user.id).single();
      if (fileError || !fileRow) throw new PublicError('Prepared file record was not found.', 404);
      const isCsv = fileRow.file_extension === '.csv';
      const objectUrl = `${supabaseUrl}/storage/v1/object/authenticated/${bucket}/${fileRow.storage_path}`;
      const authHeaders = { apikey: publicKey, Authorization: `Bearer ${accessToken}` };
      const read = (range: { start: number; end: number } | null) => fetch(objectUrl, { headers: range ? { ...authHeaders, Range: `bytes=${range.start}-${range.end}` } : authHeaders });
      const metadataSize = async () => {
        const info = await fetch(`${supabaseUrl}/storage/v1/object/info/authenticated/${bucket}/${fileRow.storage_path}`, { headers: authHeaders });
        if (!info.ok) return null;
        const size = Number((await info.json())?.size);
        return Number.isSafeInteger(size) ? size : null;
      };
      let bytes = new Uint8Array(0);
      let signatureValid: boolean;
      if (isCsv) {
        // CSV is validated as a whole document (<= 5 MB). The authoritative size is the body length of a full 200 response.
        const storageResponse = await read(null);
        if (storageResponse.status !== 200) { await storageResponse.body?.cancel(); throw new PublicError('Uploaded object could not be verified.'); }
        bytes = await readPrefix(storageResponse, maxCsvBytes + 1);
        signatureValid = bytes.length === Number(fileRow.size_bytes) && bytes.length <= maxCsvBytes;
      } else {
        const check = await validateUpload({ extension: fileRow.file_extension, read, metadataSize });
        if (!check.ok && ['OBJECT_UNREADABLE', 'SIZE_UNVERIFIABLE'].includes(check.code)) throw new PublicError(check.message);
        signatureValid = check.ok && check.totalSize === Number(fileRow.size_bytes);
      }
      try {
        if (!signatureValid) throw new PublicError('File signature does not match its extension.');
        if (isCsv) validateCsv(bytes);
      } catch (error) {
        await admin.storage.from(bucket).remove([fileRow.storage_path]);
        await admin.from('bulk_request_files').update({ upload_status: 'REJECTED', signature_status: 'REJECTED' }).eq('id', fileId);
        throw error;
      }
      const signatureStatus = ['.stl','.obj','.3mf','.gltf'].includes(fileRow.file_extension) ? 'UNVERIFIED_ALLOWED' : 'VALIDATED';
      const { error: updateError } = await admin.from('bulk_request_files').update({ upload_status: 'READY', signature_status: signatureStatus }).eq('id', fileId);
      if (updateError) throw updateError;
      await admin.from('bulk_request_events').insert({ bulk_request_id: requestId, event_type: 'FILE_UPLOADED', public_message: 'A file was attached to the enquiry.' });
      return reply(origin, 200, { ok: true, data: { fileId, state: 'READY' } });
    }

    if (action === 'remove-upload') {
      const fileId = z.uuid().parse(body.fileId);
      const { data: fileRow } = await admin.from('bulk_request_files').select('storage_path').eq('id', fileId).eq('bulk_request_id', requestId).eq('customer_id', user.id).single();
      if (fileRow) await admin.storage.from(bucket).remove([fileRow.storage_path]);
      const { error } = await admin.from('bulk_request_files').delete().eq('id', fileId).eq('bulk_request_id', requestId).eq('customer_id', user.id);
      if (error) throw error;
      return reply(origin, 200, { ok: true, data: { removed: true } });
    }

    if (action === 'submit-request') {
      const parsed = submissionSchema.safeParse(body.submission);
      if (!parsed.success) throw new PublicError(parsed.error.issues[0]?.message || 'Submission validation failed.', 422);
      const submission = parsed.data;
      const catalog = getCatalog();
      const normalizedItems = submission.items.map((item) => {
        if (submission.bulkType === 'custom_requirement') {
          return { ...item, productId: null, productSlug: null, itemType: 'custom' as const };
        }
        const product = item.productSlug ? catalog.get(item.productSlug) : null;
        if (!product) throw new PublicError('One or more selected products are not active in the production catalog.');
        if (submission.bulkType === 'customized_product' && !product.customisable) {
          throw new PublicError(`${product.slug} is not configured for personalized bulk enquiries.`);
        }
        return { ...item, productId: product.id, productSlug: product.slug, itemType: 'catalog' as const };
      });
      const { count, error: countError } = await admin.from('bulk_request_events').select('id', { count: 'exact', head: true }).eq('event_type', 'SUBMISSION_ATTEMPT').eq('actor_hash', actorHash).gte('created_at', rateLimitSince);
      if (countError) throw countError;
      if ((count || 0) >= 5) throw new PublicError('Too many submission attempts. Please wait and try again.', 429);
      const { error: attemptError } = await admin.from('bulk_request_events').insert({ bulk_request_id: requestId, event_type: 'SUBMISSION_ATTEMPT', actor_hash: actorHash });
      if (attemptError) throw attemptError;

      const rpcSubmission = { ...submission, items: normalizedItems };
      let reference = '';
      let submittedAt = '';
      for (let attempt = 0; attempt < 4; attempt += 1) {
        reference = publicId();
        const { data, error } = await admin.rpc('submit_bulk_request_server', {
          p_request_id: requestId,
          p_customer_id: user.id,
          p_public_request_id: reference,
          p_submission: rpcSubmission,
          p_file_ids: submission.fileIds,
        });
        if (!error) {
          submittedAt = data;
          break;
        }
        if (error.code !== '23505') throw error;
      }
      if (!submittedAt) throw new Error('A unique bulk enquiry reference could not be created.');
      await sendBulkRequestConfirmation({ publicRequestId: reference, customerEmail: submission.email.toLowerCase(), submittedAt }, configuredNotificationDelivery(admin));
      return reply(origin, 200, { ok: true, data: { publicRequestId: reference, submittedAt } });
    }

    throw new PublicError('Unknown action.');
  } catch (error) {
    console.error('bulk-request-api', action, error instanceof Error ? error.message : error);
    if (error instanceof PublicError) return reply(origin, error.status, { ok: false, error: error.message });
    if (error instanceof z.ZodError) return reply(origin, 422, { ok: false, error: error.issues[0]?.message || 'Validation failed.' });
    return reply(origin, 500, { ok: false, error: 'The bulk enquiry could not be processed. Please try again.' });
  }
});
