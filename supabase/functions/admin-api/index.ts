import { isCanonicalWebsiteOrigin } from '../_shared/canonicalOrigin.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.116.0';

// Preserve the SDK's existing ungenerated database generic. Inferring the
// overloaded createClient return type without it makes query rows `never`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- no generated database schema exists here
type EdgeDatabaseSchema = any;

const activeOrderStatuses = [
  'pending_payment',
  'payment_processing',
  'paid',
  'under_review',
  'confirmed',
  'in_production',
  'ready_for_pickup',
  'shipped',
];
const orderStatuses = [
  'pending_payment',
  'payment_processing',
  'paid',
  'under_review',
  'confirmed',
  'in_production',
  'ready_for_pickup',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
] as const;
const paymentStatuses = [
  'not_started',
  'pending',
  'processing',
  'paid',
  'failed',
  'cancelled',
  'refunded',
] as const;
const deliveryMethods = ['pickup', 'local_delivery', 'shipping'] as const;
const publicOrderPattern = /^ESHA-[0-9]{4}-[A-Z0-9]{8}$/;
const searchPattern = /^[A-Z0-9-]{0,40}$/;
const pageSize = 20;
type AdminRecord = { role: 'ADMIN' | 'STAFF'; display_name: string | null };
type OrderStatus = (typeof orderStatuses)[number];

function response(origin: string | null, status: number, body: unknown) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    Vary: 'Origin',
  };
  if (origin) headers['Access-Control-Allow-Origin'] = origin;
  return new Response(JSON.stringify(body), { status, headers });
}
function label(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
function deliveryLabel(value: string) {
  return value === 'pickup'
    ? 'Pickup'
    : value === 'local_delivery'
      ? 'Local delivery'
      : value === 'shipping'
        ? 'Shipping'
        : 'Delivery';
}
function statusLabel(value: string) {
  return label(value);
}
function paymentLabel(value: string) {
  return label(value);
}
function safeOptions(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const row = item as Record<string, unknown>,
        l = typeof row.label === 'string' ? row.label.trim() : '',
        v = typeof row.valueLabel === 'string' ? row.valueLabel.trim() : '';
      return l && v ? [{ label: l, value: v }] : [];
    })
    .slice(0, 30);
}
function allowedTransitions(
  status: OrderStatus,
  deliveryMethod: string,
  role: AdminRecord['role'],
): OrderStatus[] {
  if (role !== 'ADMIN') return [];
  if (status === 'paid') return ['under_review'];
  if (status === 'under_review') return ['confirmed'];
  if (status === 'confirmed') return ['in_production'];
  if (status === 'in_production')
    return deliveryMethod === 'pickup'
      ? ['ready_for_pickup']
      : deliveryMethod === 'shipping' || deliveryMethod === 'local_delivery'
        ? ['shipped']
        : [];
  if (status === 'ready_for_pickup' && deliveryMethod === 'pickup')
    return ['delivered'];
  if (
    status === 'shipped' &&
    (deliveryMethod === 'shipping' || deliveryMethod === 'local_delivery')
  )
    return ['delivered'];
  return [];
}

async function requireAdmin(
  admin: ReturnType<typeof createClient<EdgeDatabaseSchema, 'public'>>,
  userId: string,
): Promise<AdminRecord | null> {
  const { data, error } = await admin
    .from('admin_users')
    .select('role,display_name')
    .eq('user_id', userId)
    .eq('active', true)
    .maybeSingle();
  if (error) throw error;
  if (!data || (data.role !== 'ADMIN' && data.role !== 'STAFF')) return null;
  return { role: data.role, display_name: data.display_name };
}
async function summary(admin: ReturnType<typeof createClient<EdgeDatabaseSchema, 'public'>>) {
  const [orders, activeOrders, customRequests, bulkRequests, pendingApprovals] =
    await Promise.all([
      admin.from('orders').select('id', { count: 'exact', head: true }),
      admin
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .in('status', activeOrderStatuses),
      admin
        .from('custom_requests')
        .select('id', { count: 'exact', head: true })
        .neq('status', 'DRAFT')
        .not('public_request_id', 'is', null),
      admin
        .from('bulk_requests')
        .select('id', { count: 'exact', head: true })
        .neq('status', 'DRAFT')
        .not('public_request_id', 'is', null),
      admin
        .from('order_approval_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'PENDING'),
    ]);
  const failure = [
    orders,
    activeOrders,
    customRequests,
    bulkRequests,
    pendingApprovals,
  ].find((x) => x.error)?.error;
  if (failure) throw failure;
  return {
    totalOrders: orders.count || 0,
    activeOrders: activeOrders.count || 0,
    customRequests: customRequests.count || 0,
    bulkRequests: bulkRequests.count || 0,
    pendingApprovals: pendingApprovals.count || 0,
  };
}

function readOrdersInput(body: Record<string, unknown>) {
  const page =
    typeof body.page === 'number' && Number.isInteger(body.page)
      ? Math.min(Math.max(body.page, 1), 5000)
      : 1;
  const rawSearch =
    typeof body.search === 'string' ? body.search.trim().toUpperCase() : '';
  if (!searchPattern.test(rawSearch)) throw new Error('ORDERS_FILTER_INVALID');
  if (
    typeof body.status === 'string' &&
    body.status &&
    !orderStatuses.includes(body.status as OrderStatus)
  )
    throw new Error('ORDERS_FILTER_INVALID');
  if (
    typeof body.paymentStatus === 'string' &&
    body.paymentStatus &&
    !paymentStatuses.includes(body.paymentStatus as never)
  )
    throw new Error('ORDERS_FILTER_INVALID');
  if (
    typeof body.deliveryMethod === 'string' &&
    body.deliveryMethod &&
    !deliveryMethods.includes(body.deliveryMethod as never)
  )
    throw new Error('ORDERS_FILTER_INVALID');
  if (
    typeof body.sort === 'string' &&
    !['newest', 'oldest'].includes(body.sort)
  )
    throw new Error('ORDERS_FILTER_INVALID');
  const status =
    typeof body.status === 'string' && body.status ? body.status : null;
  const paymentStatus =
    typeof body.paymentStatus === 'string' && body.paymentStatus
      ? body.paymentStatus
      : null;
  const deliveryMethod =
    typeof body.deliveryMethod === 'string' && body.deliveryMethod
      ? body.deliveryMethod
      : null;
  const sort = body.sort === 'oldest' ? 'oldest' : 'newest';
  return {
    page,
    search: rawSearch,
    status,
    paymentStatus,
    deliveryMethod,
    sort,
  };
}

async function readAdminPage<Row>(
  query: { range(from: number, to: number): PromiseLike<{ data: Row[] | null; error: { code: string } | null; count: number | null }> },
  from: number,
  to: number,
) {
  const result = await query.range(from, to);
  if (from > 0 && result.error?.code === 'PGRST103') {
    // PostgREST returns 416 for a stale/out-of-range offset. Reuse the same
    // filtered query at offset zero to obtain its current authoritative count,
    // but never return that recount row as the requested page.
    const recount = await query.range(0, 0);
    return { ...recount, data: [] as Row[] };
  }
  return result;
}

async function ordersList(
  admin: ReturnType<typeof createClient<EdgeDatabaseSchema, 'public'>>,
  authorized: AdminRecord,
  body: Record<string, unknown>,
  origin: string | null,
) {
  const input = readOrdersInput(body);
  let query = admin
    .from('orders')
    .select(
      'public_order_id,created_at,status,payment_status,delivery_method,total_paise,currency',
      { count: 'exact' },
    );
  if (input.search) query = query.ilike('public_order_id', `${input.search}%`);
  if (input.status) query = query.eq('status', input.status);
  if (input.paymentStatus)
    query = query.eq('payment_status', input.paymentStatus);
  if (input.deliveryMethod)
    query = query.eq('delivery_method', input.deliveryMethod);
  query = query.order('created_at', { ascending: input.sort === 'oldest' });
  const from = (input.page - 1) * pageSize,
    { data, error, count } = await readAdminPage(query, from, from + pageSize - 1);
  if (error) throw error;
  const total = count || 0,
    totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  return response(origin, 200, {
    ok: true,
    data: {
      admin: { role: authorized.role, displayName: authorized.display_name },
      items: (data || []).map((o) => ({
        reference: o.public_order_id,
        createdAt: o.created_at,
        status: o.status,
        statusLabel: statusLabel(o.status),
        paymentStatus: o.payment_status,
        paymentLabel: paymentLabel(o.payment_status),
        deliveryMethod: o.delivery_method,
        deliveryLabel: deliveryLabel(o.delivery_method),
        totalPaise: Number(o.total_paise),
        currency: o.currency,
      })),
      pagination: { page: input.page, pageSize, total, totalPages },
      filters: input,
    },
  });
}

async function orderDetail(
  admin: ReturnType<typeof createClient<EdgeDatabaseSchema, 'public'>>,
  authorized: AdminRecord,
  body: Record<string, unknown>,
  origin: string | null,
) {
  const reference =
    typeof body.reference === 'string'
      ? body.reference.trim().toUpperCase()
      : '';
  if (!publicOrderPattern.test(reference))
    return response(origin, 404, {
      ok: false,
      error: 'Order unavailable.',
      code: 'ORDER_UNAVAILABLE',
    });
  const { data: order, error } = await admin
    .from('orders')
    .select(
      'id,public_order_id,status,payment_status,currency,item_subtotal_paise,shipping_paise,tax_amount_paise,tax_added_paise,total_paise,delivery_method,delivery_label,tax_label,contact_name,contact_mobile,created_at,updated_at,paid_at',
    )
    .eq('public_order_id', reference)
    .maybeSingle();
  if (error) throw error;
  if (!order)
    return response(origin, 404, {
      ok: false,
      error: 'Order unavailable.',
      code: 'ORDER_UNAVAILABLE',
    });
  const [items, address, events] = await Promise.all([
    admin
      .from('order_items')
      .select(
        'title_snapshot,options_snapshot,quantity,unit_price_paise,line_subtotal_paise',
      )
      .eq('order_id', order.id)
      .order('created_at', { ascending: true }),
    admin
      .from('order_addresses')
      .select(
        'recipient_name,mobile,address_line_1,address_line_2,locality,city,district,state,pin_code,country',
      )
      .eq('order_id', order.id)
      .maybeSingle(),
    admin
      .from('order_events')
      .select('event_type,from_status,to_status,created_at')
      .eq('order_id', order.id)
      .in('event_type', [
        'order_created',
        'payment_confirmed',
        'status_changed',
        'dispatched',
        'delivered',
      ])
      .order('created_at', { ascending: true })
      .limit(100),
  ]);
  const failure = [items, address, events].find((x) => x.error)?.error;
  if (failure) throw failure;
  const detail = {
    reference: order.public_order_id,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    status: order.status,
    statusLabel: statusLabel(order.status),
    paymentStatus: order.payment_status,
    paymentLabel: paymentLabel(order.payment_status),
    currency: order.currency,
    itemSubtotalPaise: Number(order.item_subtotal_paise),
    shippingPaise: Number(order.shipping_paise),
    taxAmountPaise: Number(order.tax_amount_paise),
    taxAddedPaise: Number(order.tax_added_paise),
    totalPaise: Number(order.total_paise),
    taxLabel: order.tax_label,
    deliveryMethod: order.delivery_method,
    deliveryLabel: order.delivery_label || deliveryLabel(order.delivery_method),
    contactName: order.contact_name,
    contactMobile: order.contact_mobile,
    items: (items.data || []).map((item) => ({
      title: item.title_snapshot,
      quantity: item.quantity,
      unitPricePaise: Number(item.unit_price_paise),
      lineSubtotalPaise: Number(item.line_subtotal_paise),
      selectedOptions: safeOptions(item.options_snapshot),
    })),
    delivery: address.data
      ? {
          recipientName: address.data.recipient_name,
          mobile: address.data.mobile,
          addressLine1: address.data.address_line_1,
          addressLine2: address.data.address_line_2,
          locality: address.data.locality,
          city: address.data.city,
          district: address.data.district,
          state: address.data.state,
          pinCode: address.data.pin_code,
          country: address.data.country,
        }
      : null,
    timeline: (events.data || []).map((event) => ({
      label:
        event.event_type === 'order_created'
          ? 'Order created'
          : event.event_type === 'payment_confirmed'
            ? 'Payment confirmed'
            : event.event_type === 'dispatched'
              ? 'Dispatched'
              : event.event_type === 'delivered'
                ? 'Delivered'
                : event.to_status
                  ? statusLabel(event.to_status)
                  : 'Order updated',
      fromStatus: event.from_status,
      toStatus: event.to_status,
      occurredAt: event.created_at,
    })),
    allowedTransitions: allowedTransitions(
      order.status as OrderStatus,
      order.delivery_method,
      authorized.role,
    ),
  };
  return response(origin, 200, {
    ok: true,
    data: {
      admin: { role: authorized.role, displayName: authorized.display_name },
      order: detail,
    },
  });
}

async function transitionOrder(
  admin: ReturnType<typeof createClient<EdgeDatabaseSchema, 'public'>>,
  authorized: AdminRecord,
  userId: string,
  body: Record<string, unknown>,
  origin: string | null,
) {
  if (authorized.role !== 'ADMIN')
    return response(origin, 403, {
      ok: false,
      error: 'This admin role is read-only.',
      code: 'ADMIN_MUTATION_FORBIDDEN',
    });
  const reference =
      typeof body.reference === 'string'
        ? body.reference.trim().toUpperCase()
        : '',
    expected =
      typeof body.expectedStatus === 'string' ? body.expectedStatus : '',
    target = typeof body.targetStatus === 'string' ? body.targetStatus : '',
    requestId = typeof body.requestId === 'string' ? body.requestId : '';
  if (
    !publicOrderPattern.test(reference) ||
    !orderStatuses.includes(expected as OrderStatus) ||
    !orderStatuses.includes(target as OrderStatus) ||
    !requestId.match(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
  )
    return response(origin, 422, {
      ok: false,
      error: 'Unable to update this order.',
      code: 'INVALID_TRANSITION_REQUEST',
    });
  const { data, error } = await admin.rpc(
    'admin_transition_order_status_server',
    {
      p_actor_user_id: userId,
      p_order_reference: reference,
      p_expected_status: expected,
      p_target_status: target,
      p_request_id: requestId,
    },
  );
  if (error) {
    const m = error.message || '';
    if (m.includes('ADMIN_MUTATION_FORBIDDEN'))
      return response(origin, 403, {
        ok: false,
        error: 'This admin role is read-only.',
        code: 'ADMIN_MUTATION_FORBIDDEN',
      });
    if (m.includes('ORDER_STATUS_STALE'))
      return response(origin, 409, {
        ok: false,
        error: 'Order state changed. Refresh and try again.',
        code: 'ORDER_STATUS_STALE',
      });
    if (m.includes('ORDER_TRANSITION_UNAVAILABLE'))
      return response(origin, 409, {
        ok: false,
        error: 'This status change is not available.',
        code: 'ORDER_TRANSITION_UNAVAILABLE',
      });
    if (m.includes('ORDER_UNAVAILABLE'))
      return response(origin, 404, {
        ok: false,
        error: 'Order unavailable.',
        code: 'ORDER_UNAVAILABLE',
      });
    if (m.includes('IDEMPOTENCY_CONFLICT'))
      return response(origin, 409, {
        ok: false,
        error: 'This transition request conflicts with an earlier action.',
        code: 'IDEMPOTENCY_CONFLICT',
      });
    throw error;
  }
  return response(origin, 200, { ok: true, data });
}

const customRequestStatuses = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'NEEDS_INFORMATION',
  'QUOTED',
  'ACCEPTED',
  'DECLINED',
  'CANCELLED',
  'CONVERTED_TO_ORDER',
] as const;
const bulkRequestStatuses = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'MORE_INFORMATION_REQUIRED',
  'QUOTATION_PREPARATION',
  'QUOTATION_SENT',
  'AWAITING_CUSTOMER_APPROVAL',
  'ACCEPTED',
  'REJECTED',
  'CANCELLED',
  'CONVERTED_TO_ORDER',
] as const;
const customRequestTypes = [
  '3d_file',
  'drawing_dimensions',
  'image_reference',
  'modify_design',
  'custom_product',
  'replacement_part',
  'other',
] as const;
const bulkTypes = [
  'existing_product',
  'customized_product',
  'custom_requirement',
] as const;
const customerRefPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const customRequestRefPattern = /^CR-[0-9]{4}-[A-Z0-9]{6}$/;
const bulkRequestRefPattern = /^BR-[0-9]{4}-[A-Z0-9]{6}$/;
const phase3SearchPattern = /^[A-Z0-9-]{0,40}$/;
const phase3PageSize = 20;
type CustomRequestStatus = (typeof customRequestStatuses)[number];
type BulkRequestStatus = (typeof bulkRequestStatuses)[number];
type CustomerActivityRow = {
  customer_id: string;
  order_count: number | null;
  custom_request_count: number | null;
  bulk_request_count: number | null;
  last_activity: string;
  total_count: number | null;
};
type RecentOrderRow = {
  public_order_id: string;
  created_at: string;
  status: string;
  total_paise: number;
  currency: string;
};
type RecentCustomRequestRow = {
  public_request_id: string;
  created_at: string;
  submitted_at: string | null;
  status: string;
  title: string | null;
  request_type: string | null;
};
type RecentBulkRequestRow = {
  public_request_id: string;
  created_at: string;
  submitted_at: string | null;
  status: string;
  requirement_title: string | null;
  bulk_type: string | null;
};
type CustomRequestListRow = {
  public_request_id: string;
  created_at: string;
  updated_at: string;
  status: string;
  request_type: string | null;
  title: string | null;
  customer_name: string | null;
  customer_email: string | null;
};
type CustomRequestFileRow = {
  original_filename: string;
  file_extension: string;
  mime_type: string;
  size_bytes: number;
  upload_status: string;
  signature_status: string;
  scan_status: string;
  created_at: string;
  id: string;
};
type RequestEventRow = {
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  public_message: string | null;
  created_at: string;
};
type BulkRequestListRow = {
  id: string;
  public_request_id: string;
  created_at: string;
  updated_at: string;
  status: string;
  bulk_type: string | null;
  requirement_title: string | null;
  contact_person: string | null;
  organization_name: string | null;
  email: string | null;
};
type BulkItemCountRow = { bulk_request_id: string };
type BulkQuoteStateRow = {
  bulk_request_id: string;
  version: number;
  status: string;
};
type BulkItemRow = {
  item_type: string;
  description: string | null;
  quantity: number;
  configuration: unknown;
  same_customization_for_all: boolean | null;
  customization_notes: string | null;
  notes: string | null;
};
type BulkRequestFileRow = CustomRequestFileRow & { file_role: string };
type BulkQuoteRow = {
  version: number;
  status: string;
  sent_at: string | null;
  accepted_at: string | null;
  created_at: string;
};
type QueryResultWithError = { error: unknown | null };
function customStatusLabel(value: string) {
  const labels: Record<string, string> = {
    DRAFT: 'Draft',
    SUBMITTED: 'Submitted',
    UNDER_REVIEW: 'Under review',
    NEEDS_INFORMATION: 'More information needed',
    QUOTED: 'Quotation shared',
    ACCEPTED: 'Accepted',
    DECLINED: 'Declined',
    CANCELLED: 'Cancelled',
    CONVERTED_TO_ORDER: 'Converted to order',
  };
  return labels[value] || label(value);
}
function bulkStatusLabel(value: string) {
  const labels: Record<string, string> = {
    DRAFT: 'Draft',
    SUBMITTED: 'Submitted',
    UNDER_REVIEW: 'Under review',
    MORE_INFORMATION_REQUIRED: 'More information required',
    QUOTATION_PREPARATION: 'Quotation being prepared',
    QUOTATION_SENT: 'Quotation sent',
    AWAITING_CUSTOMER_APPROVAL: 'Awaiting customer approval',
    ACCEPTED: 'Accepted',
    REJECTED: 'Unable to proceed',
    CANCELLED: 'Cancelled',
    CONVERTED_TO_ORDER: 'Converted to order',
  };
  return labels[value] || label(value);
}
function customTypeLabel(value: string | null) {
  return value ? label(value) : 'Unspecified';
}
function bulkTypeLabel(value: string | null) {
  return value ? label(value) : 'Unspecified';
}
function maskEmail(value: string | null | undefined) {
  if (!value) return null;
  const [local, domain] = value.split('@');
  if (!domain) return null;
  return `${local.slice(0, 1) || '*'}***@${domain}`;
}
function safeCustomerIdentifier(
  name: string | null | undefined,
  email: string | null | undefined,
) {
  const clean = name?.trim();
  return clean || maskEmail(email) || 'Customer';
}
function safeObjectEntries(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.entries(value as Record<string, unknown>)
    .flatMap(([key, v]) =>
      typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
        ? [{ label: label(key), value: String(v) }]
        : [],
    )
    .slice(0, 30);
}
function safePersonalization(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return { type: null, text: null };
  const r = value as Record<string, unknown>;
  return {
    type: typeof r.type === 'string' ? r.type : null,
    text: typeof r.text === 'string' ? r.text : null,
  };
}
function safeFunctionalDetails(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return {
      purpose: null,
      usedWhere: null,
      loadConditions: null,
      heatExposure: null,
      outdoorUse: null,
      waterChemicalExposure: null,
      exactDimensions: null,
      originalPartAvailable: null,
      safetyNotes: null,
    };
  const r = value as Record<string, unknown>;
  const str = (k: string) =>
      typeof r[k] === 'string' ? (r[k] as string) : null,
    bool = (k: string) =>
      typeof r[k] === 'boolean' ? (r[k] as boolean) : null;
  return {
    purpose: str('purpose'),
    usedWhere: str('usedWhere'),
    loadConditions: str('loadConditions'),
    heatExposure: bool('heatExposure'),
    outdoorUse: bool('outdoorUse'),
    waterChemicalExposure: bool('waterChemicalExposure'),
    exactDimensions: str('exactDimensions'),
    originalPartAvailable: bool('originalPartAvailable'),
    safetyNotes: str('safetyNotes'),
  };
}
function customAllowedTransitions(
  status: CustomRequestStatus,
  role: AdminRecord['role'],
): CustomRequestStatus[] {
  if (role !== 'ADMIN') return [];
  if (status === 'SUBMITTED') return ['UNDER_REVIEW'];
  if (status === 'UNDER_REVIEW')
    return ['NEEDS_INFORMATION', 'QUOTED', 'DECLINED'];
  if (status === 'NEEDS_INFORMATION') return ['UNDER_REVIEW'];
  if (status === 'QUOTED') return ['ACCEPTED', 'DECLINED'];
  return [];
}
function bulkAllowedTransitions(
  status: BulkRequestStatus,
  role: AdminRecord['role'],
): BulkRequestStatus[] {
  if (role !== 'ADMIN') return [];
  if (status === 'SUBMITTED') return ['UNDER_REVIEW'];
  if (status === 'UNDER_REVIEW')
    return ['MORE_INFORMATION_REQUIRED', 'QUOTATION_PREPARATION', 'REJECTED'];
  if (status === 'MORE_INFORMATION_REQUIRED') return ['UNDER_REVIEW'];
  if (status === 'QUOTATION_PREPARATION') return ['QUOTATION_SENT'];
  if (status === 'QUOTATION_SENT') return ['AWAITING_CUSTOMER_APPROVAL'];
  if (status === 'AWAITING_CUSTOMER_APPROVAL') return ['ACCEPTED', 'REJECTED'];
  return [];
}
function readPhase3Page(body: Record<string, unknown>) {
  return typeof body.page === 'number' && Number.isInteger(body.page)
    ? Math.min(Math.max(body.page, 1), 5000)
    : 1;
}
function readPhase3Sort(body: Record<string, unknown>) {
  if (
    typeof body.sort === 'string' &&
    !['newest', 'oldest'].includes(body.sort)
  )
    throw new Error('PHASE3_FILTER_INVALID');
  return body.sort === 'oldest' ? 'oldest' : 'newest';
}

async function customersList(
  admin: ReturnType<typeof createClient<EdgeDatabaseSchema, 'public'>>,
  authorized: AdminRecord,
  body: Record<string, unknown>,
  origin: string | null,
) {
  const page = readPhase3Page(body),
    search =
      typeof body.search === 'string' ? body.search.trim().toLowerCase() : '';
  if (search && !customerRefPattern.test(search))
    throw new Error('CUSTOMER_FILTER_INVALID');
  const { data, error } = await admin.rpc(
    'admin_customer_activity_page_server',
    {
      p_offset: (page - 1) * phase3PageSize,
      p_limit: phase3PageSize,
      p_customer_id: search || null,
    },
  );
  if (error) throw error;
  const rows = (data || []) as CustomerActivityRow[];
  const items = await Promise.all(
    rows.map(async (row) => {
      const result = await admin.auth.admin.getUserById(row.customer_id);
      const user = result.data?.user;
      const displayName =
        typeof user?.user_metadata?.full_name === 'string' &&
        user.user_metadata.full_name.trim()
          ? user.user_metadata.full_name.trim()
          : null;
      return {
        customerRef: row.customer_id,
        displayIdentifier:
          displayName || maskEmail(user?.email) || 'Guest customer',
        accountType: user?.is_anonymous ? 'guest' : 'permanent',
        orderCount: Number(row.order_count || 0),
        customRequestCount: Number(row.custom_request_count || 0),
        bulkRequestCount: Number(row.bulk_request_count || 0),
        lastActivity: row.last_activity,
      };
    }),
  );
  const total = rows.length ? Number(rows[0].total_count || 0) : 0;
  return response(origin, 200, {
    ok: true,
    data: {
      admin: { role: authorized.role, displayName: authorized.display_name },
      items,
      pagination: {
        page,
        pageSize: phase3PageSize,
        total,
        totalPages: total ? Math.ceil(total / phase3PageSize) : 0,
      },
      search,
    },
  });
}
async function customerDetail(
  admin: ReturnType<typeof createClient<EdgeDatabaseSchema, 'public'>>,
  authorized: AdminRecord,
  body: Record<string, unknown>,
  origin: string | null,
) {
  const customerRef =
    typeof body.customerRef === 'string'
      ? body.customerRef.trim().toLowerCase()
      : '';
  if (!customerRefPattern.test(customerRef))
    return response(origin, 404, {
      ok: false,
      error: 'Customer unavailable.',
      code: 'CUSTOMER_UNAVAILABLE',
    });
  const userResult = await admin.auth.admin.getUserById(customerRef);
  const user = userResult.data?.user;
  if (userResult.error || !user)
    return response(origin, 404, {
      ok: false,
      error: 'Customer unavailable.',
      code: 'CUSTOMER_UNAVAILABLE',
    });
  const [counts, orders, custom, bulk] = await Promise.all([
    admin.rpc('admin_customer_activity_page_server', {
      p_offset: 0,
      p_limit: 1,
      p_customer_id: customerRef,
    }),
    admin
      .from('orders')
      .select('public_order_id,created_at,status,total_paise,currency')
      .eq('customer_id', customerRef)
      .order('created_at', { ascending: false })
      .limit(5),
    admin
      .from('custom_requests')
      .select(
        'public_request_id,created_at,submitted_at,status,title,request_type',
      )
      .eq('customer_id', customerRef)
      .neq('status', 'DRAFT')
      .not('public_request_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5),
    admin
      .from('bulk_requests')
      .select(
        'public_request_id,created_at,submitted_at,status,requirement_title,bulk_type',
      )
      .eq('customer_id', customerRef)
      .neq('status', 'DRAFT')
      .not('public_request_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);
  const failure = (
    [counts, orders, custom, bulk] as QueryResultWithError[]
  ).find((x) => x.error)?.error;
  if (failure) throw failure;
  const c = ((counts.data || []) as CustomerActivityRow[])[0];
  return response(origin, 200, {
    ok: true,
    data: {
      admin: { role: authorized.role, displayName: authorized.display_name },
      customer: {
        displayName:
          typeof user.user_metadata?.full_name === 'string'
            ? user.user_metadata.full_name
            : null,
        email: user.email || null,
        accountType: user.is_anonymous ? 'guest' : 'permanent',
        createdAt: user.created_at,
        counts: {
          orders: Number(c?.order_count || 0),
          customRequests: Number(c?.custom_request_count || 0),
          bulkRequests: Number(c?.bulk_request_count || 0),
        },
        recentOrders: ((orders.data || []) as RecentOrderRow[]).map((o) => ({
          reference: o.public_order_id,
          createdAt: o.created_at,
          status: o.status,
          statusLabel: statusLabel(o.status),
          totalPaise: Number(o.total_paise),
          currency: o.currency,
        })),
        recentCustomRequests: (
          (custom.data || []) as RecentCustomRequestRow[]
        ).map((r) => ({
          reference: r.public_request_id,
          createdAt: r.submitted_at || r.created_at,
          status: r.status,
          statusLabel: customStatusLabel(r.status),
          title: r.title,
          requestType: r.request_type,
        })),
        recentBulkRequests: ((bulk.data || []) as RecentBulkRequestRow[]).map(
          (r) => ({
            reference: r.public_request_id,
            createdAt: r.submitted_at || r.created_at,
            status: r.status,
            statusLabel: bulkStatusLabel(r.status),
            title: r.requirement_title,
            bulkType: r.bulk_type,
          }),
        ),
      },
    },
  });
}

function readCustomRequestInput(body: Record<string, unknown>) {
  const page = readPhase3Page(body),
    search =
      typeof body.search === 'string' ? body.search.trim().toUpperCase() : '';
  if (!phase3SearchPattern.test(search))
    throw new Error('PHASE3_FILTER_INVALID');
  if (
    typeof body.status === 'string' &&
    body.status &&
    !customRequestStatuses.includes(body.status as CustomRequestStatus)
  )
    throw new Error('PHASE3_FILTER_INVALID');
  if (
    typeof body.requestType === 'string' &&
    body.requestType &&
    !customRequestTypes.includes(body.requestType as never)
  )
    throw new Error('PHASE3_FILTER_INVALID');
  return {
    page,
    search,
    status: typeof body.status === 'string' && body.status ? body.status : null,
    requestType:
      typeof body.requestType === 'string' && body.requestType
        ? body.requestType
        : null,
    sort: readPhase3Sort(body),
  };
}
async function customRequestsList(
  admin: ReturnType<typeof createClient<EdgeDatabaseSchema, 'public'>>,
  authorized: AdminRecord,
  body: Record<string, unknown>,
  origin: string | null,
) {
  const input = readCustomRequestInput(body);
  let q = admin
    .from('custom_requests')
    .select(
      'public_request_id,created_at,updated_at,status,request_type,title,customer_name,customer_email',
      { count: 'exact' },
    )
    .neq('status', 'DRAFT')
    .not('public_request_id', 'is', null);
  if (input.search) q = q.ilike('public_request_id', `${input.search}%`);
  if (input.status) q = q.eq('status', input.status);
  if (input.requestType) q = q.eq('request_type', input.requestType);
  q = q.order('created_at', { ascending: input.sort === 'oldest' });
  const from = (input.page - 1) * phase3PageSize,
    { data, error, count } = await readAdminPage(q, from, from + phase3PageSize - 1);
  if (error) throw error;
  const total = count || 0;
  return response(origin, 200, {
    ok: true,
    data: {
      admin: { role: authorized.role, displayName: authorized.display_name },
      items: ((data || []) as CustomRequestListRow[]).map((r) => ({
        reference: r.public_request_id,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        status: r.status,
        statusLabel: customStatusLabel(r.status),
        requestType: r.request_type,
        requestTypeLabel: customTypeLabel(r.request_type),
        title: r.title,
        customerIdentifier: safeCustomerIdentifier(
          r.customer_name,
          r.customer_email,
        ),
      })),
      pagination: {
        page: input.page,
        pageSize: phase3PageSize,
        total,
        totalPages: total ? Math.ceil(total / phase3PageSize) : 0,
      },
      filters: input,
    },
  });
}
async function customRequestDetail(
  admin: ReturnType<typeof createClient<EdgeDatabaseSchema, 'public'>>,
  authorized: AdminRecord,
  body: Record<string, unknown>,
  origin: string | null,
) {
  const reference =
    typeof body.reference === 'string'
      ? body.reference.trim().toUpperCase()
      : '';
  if (!customRequestRefPattern.test(reference))
    return response(origin, 404, {
      ok: false,
      error: 'Request unavailable.',
      code: 'REQUEST_UNAVAILABLE',
    });
  const { data: r, error } = await admin
    .from('custom_requests')
    .select(
      'id,public_request_id,created_at,updated_at,submitted_at,status,request_type,title,description,intended_use,quantity,target_date,delivery_method,delivery_pin_code,delivery_city,delivery_state,verification_requested,customer_notes,customer_name,customer_email,customer_phone,communication_method,preferred_language,source_product_slug',
    )
    .eq('public_request_id', reference)
    .maybeSingle();
  if (error) throw error;
  if (!r)
    return response(origin, 404, {
      ok: false,
      error: 'Request unavailable.',
      code: 'REQUEST_UNAVAILABLE',
    });
  const [spec, files, events] = await Promise.all([
    admin
      .from('custom_request_specifications')
      .select(
        'length_mm,width_mm,height_mm,provided_unit,material_preference,color_preference,color_details,personalization,functional_details',
      )
      .eq('request_id', r.id)
      .maybeSingle(),
    admin
      .from('custom_request_files')
      .select(
        'id,original_filename,file_extension,mime_type,size_bytes,upload_status,signature_status,scan_status,created_at',
      )
      .eq('request_id', r.id)
      .order('created_at', { ascending: true }),
    admin
      .from('custom_request_events')
      .select('event_type,from_status,to_status,public_message,created_at')
      .eq('request_id', r.id)
      .eq('event_type', 'STATUS_CHANGED')
      .order('created_at', { ascending: true })
      .limit(100),
  ]);
  const failure = ([spec, files, events] as QueryResultWithError[]).find(
    (x) => x.error,
  )?.error;
  if (failure) throw failure;
  const s = spec.data;
  return response(origin, 200, {
    ok: true,
    data: {
      admin: { role: authorized.role, displayName: authorized.display_name },
      request: {
        reference: r.public_request_id,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        submittedAt: r.submitted_at,
        status: r.status,
        statusLabel: customStatusLabel(r.status),
        requestType: r.request_type,
        requestTypeLabel: customTypeLabel(r.request_type),
        title: r.title,
        description: r.description,
        intendedUse: r.intended_use,
        quantity: r.quantity,
        targetDate: r.target_date,
        deliveryMethod: r.delivery_method,
        deliveryPinCode: r.delivery_pin_code,
        deliveryCity: r.delivery_city,
        deliveryState: r.delivery_state,
        verificationRequested: r.verification_requested,
        customerNotes: r.customer_notes,
        sourceProductSlug: r.source_product_slug,
        customer: {
          name: r.customer_name,
          email: r.customer_email,
          phone: r.customer_phone,
          communicationMethod: r.communication_method,
          preferredLanguage: r.preferred_language,
        },
        specification: s
          ? {
              lengthMm: s.length_mm === null ? null : Number(s.length_mm),
              widthMm: s.width_mm === null ? null : Number(s.width_mm),
              heightMm: s.height_mm === null ? null : Number(s.height_mm),
              providedUnit: s.provided_unit,
              materialPreference: s.material_preference,
              colorPreference: s.color_preference,
              colorDetails: s.color_details,
              personalization: safePersonalization(s.personalization),
              functionalDetails: safeFunctionalDetails(s.functional_details),
            }
          : null,
        files: ((files.data || []) as CustomRequestFileRow[]).map((f) => ({
          fileReference: f.id,
          name: f.original_filename,
          extension: f.file_extension,
          mimeType: f.mime_type,
          sizeBytes: Number(f.size_bytes),
          uploadStatus: f.upload_status,
          signatureStatus: f.signature_status,
          scanStatus: f.scan_status,
          createdAt: f.created_at,
        })),
        timeline: ((events.data || []) as RequestEventRow[]).map((e) => ({
          label: e.to_status
            ? customStatusLabel(e.to_status)
            : 'Request updated',
          fromStatus: e.from_status,
          toStatus: e.to_status,
          occurredAt: e.created_at,
          message: e.public_message,
        })),
        allowedTransitions: customAllowedTransitions(
          r.status as CustomRequestStatus,
          authorized.role,
        ),
      },
    },
  });
}

function readBulkRequestInput(body: Record<string, unknown>) {
  const page = readPhase3Page(body),
    search =
      typeof body.search === 'string' ? body.search.trim().toUpperCase() : '';
  if (!phase3SearchPattern.test(search))
    throw new Error('PHASE3_FILTER_INVALID');
  if (
    typeof body.status === 'string' &&
    body.status &&
    !bulkRequestStatuses.includes(body.status as BulkRequestStatus)
  )
    throw new Error('PHASE3_FILTER_INVALID');
  if (
    typeof body.bulkType === 'string' &&
    body.bulkType &&
    !bulkTypes.includes(body.bulkType as never)
  )
    throw new Error('PHASE3_FILTER_INVALID');
  return {
    page,
    search,
    status: typeof body.status === 'string' && body.status ? body.status : null,
    bulkType:
      typeof body.bulkType === 'string' && body.bulkType ? body.bulkType : null,
    sort: readPhase3Sort(body),
  };
}
async function bulkRequestsList(
  admin: ReturnType<typeof createClient<EdgeDatabaseSchema, 'public'>>,
  authorized: AdminRecord,
  body: Record<string, unknown>,
  origin: string | null,
) {
  const input = readBulkRequestInput(body);
  let q = admin
    .from('bulk_requests')
    .select(
      'id,public_request_id,created_at,updated_at,status,bulk_type,requirement_title,contact_person,organization_name,email',
      { count: 'exact' },
    )
    .neq('status', 'DRAFT')
    .not('public_request_id', 'is', null);
  if (input.search) q = q.ilike('public_request_id', `${input.search}%`);
  if (input.status) q = q.eq('status', input.status);
  if (input.bulkType) q = q.eq('bulk_type', input.bulkType);
  q = q.order('created_at', { ascending: input.sort === 'oldest' });
  const from = (input.page - 1) * phase3PageSize,
    { data, error, count } = await readAdminPage(q, from, from + phase3PageSize - 1);
  if (error) throw error;
  const rows = (data || []) as BulkRequestListRow[],
    ids = rows.map((r) => r.id);
  let itemRows: BulkItemCountRow[] = [],
    quotationRows: BulkQuoteStateRow[] = [];
  if (ids.length) {
    const [itemResult, quoteResult] = await Promise.all([
      admin
        .from('bulk_request_items')
        .select('bulk_request_id')
        .in('bulk_request_id', ids),
      admin
        .from('bulk_quotations')
        .select('bulk_request_id,version,status')
        .in('bulk_request_id', ids)
        .order('version', { ascending: false }),
    ]);
    if (itemResult.error || quoteResult.error)
      throw itemResult.error || quoteResult.error;
    itemRows = (itemResult.data || []) as BulkItemCountRow[];
    quotationRows = (quoteResult.data || []) as BulkQuoteStateRow[];
  }
  const itemCounts = new Map<string, number>();
  for (const x of itemRows)
    itemCounts.set(
      x.bulk_request_id,
      (itemCounts.get(x.bulk_request_id) || 0) + 1,
    );
  const quoteState = new Map<string, string>();
  for (const x of quotationRows)
    if (!quoteState.has(x.bulk_request_id))
      quoteState.set(x.bulk_request_id, x.status);
  const total = count || 0;
  return response(origin, 200, {
    ok: true,
    data: {
      admin: { role: authorized.role, displayName: authorized.display_name },
      items: rows.map((r) => ({
        reference: r.public_request_id,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        status: r.status,
        statusLabel: bulkStatusLabel(r.status),
        bulkType: r.bulk_type,
        bulkTypeLabel: bulkTypeLabel(r.bulk_type),
        title: r.requirement_title,
        customerIdentifier: safeCustomerIdentifier(
          r.contact_person || r.organization_name,
          r.email,
        ),
        itemCount: itemCounts.get(r.id) || 0,
        quotationStatus: quoteState.get(r.id) || null,
      })),
      pagination: {
        page: input.page,
        pageSize: phase3PageSize,
        total,
        totalPages: total ? Math.ceil(total / phase3PageSize) : 0,
      },
      filters: input,
    },
  });
}
async function bulkRequestDetail(
  admin: ReturnType<typeof createClient<EdgeDatabaseSchema, 'public'>>,
  authorized: AdminRecord,
  body: Record<string, unknown>,
  origin: string | null,
) {
  const reference =
    typeof body.reference === 'string'
      ? body.reference.trim().toUpperCase()
      : '';
  if (!bulkRequestRefPattern.test(reference))
    return response(origin, 404, {
      ok: false,
      error: 'Request unavailable.',
      code: 'REQUEST_UNAVAILABLE',
    });
  const { data: r, error } = await admin
    .from('bulk_requests')
    .select(
      'id,public_request_id,created_at,updated_at,submitted_at,status,bulk_type,organization_type,organization_name,contact_person,role_designation,email,phone,preferred_language,po_reference,repeat_type,repeat_frequency,quantity_per_cycle,repeat_notes,requirement_title,requirement_description,intended_use,dimensions,material_preference,color_preference,target_date,delivery_method,postal_code,city,state,target_budget,target_unit_price,verification_requested,customer_notes',
    )
    .eq('public_request_id', reference)
    .maybeSingle();
  if (error) throw error;
  if (!r)
    return response(origin, 404, {
      ok: false,
      error: 'Request unavailable.',
      code: 'REQUEST_UNAVAILABLE',
    });
  const [items, files, events, quotes] = await Promise.all([
    admin
      .from('bulk_request_items')
      .select(
        'item_type,description,quantity,configuration,same_customization_for_all,customization_notes,notes',
      )
      .eq('bulk_request_id', r.id)
      .order('created_at', { ascending: true }),
    admin
      .from('bulk_request_files')
      .select(
        'id,original_filename,file_extension,mime_type,file_role,size_bytes,upload_status,signature_status,scan_status,created_at',
      )
      .eq('bulk_request_id', r.id)
      .order('created_at', { ascending: true }),
    admin
      .from('bulk_request_events')
      .select('event_type,from_status,to_status,public_message,created_at')
      .eq('bulk_request_id', r.id)
      .in('event_type', ['BULK_ENQUIRY_SUBMITTED', 'STATUS_CHANGED'])
      .order('created_at', { ascending: true })
      .limit(100),
    admin
      .from('bulk_quotations')
      .select('version,status,sent_at,accepted_at,created_at')
      .eq('bulk_request_id', r.id)
      .order('version', { ascending: false }),
  ]);
  const failure = (
    [items, files, events, quotes] as QueryResultWithError[]
  ).find((x) => x.error)?.error;
  if (failure) throw failure;
  return response(origin, 200, {
    ok: true,
    data: {
      admin: { role: authorized.role, displayName: authorized.display_name },
      request: {
        reference: r.public_request_id,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        submittedAt: r.submitted_at,
        status: r.status,
        statusLabel: bulkStatusLabel(r.status),
        bulkType: r.bulk_type,
        bulkTypeLabel: bulkTypeLabel(r.bulk_type),
        organizationType: r.organization_type,
        organizationName: r.organization_name,
        contactPerson: r.contact_person,
        roleDesignation: r.role_designation,
        email: r.email,
        phone: r.phone,
        preferredLanguage: r.preferred_language,
        poReference: r.po_reference,
        repeatType: r.repeat_type,
        repeatFrequency: r.repeat_frequency,
        quantityPerCycle: r.quantity_per_cycle,
        repeatNotes: r.repeat_notes,
        requirementTitle: r.requirement_title,
        requirementDescription: r.requirement_description,
        intendedUse: r.intended_use,
        dimensions: r.dimensions,
        materialPreference: r.material_preference,
        colorPreference: r.color_preference,
        targetDate: r.target_date,
        deliveryMethod: r.delivery_method,
        postalCode: r.postal_code,
        city: r.city,
        state: r.state,
        targetBudget: r.target_budget === null ? null : Number(r.target_budget),
        targetUnitPrice:
          r.target_unit_price === null ? null : Number(r.target_unit_price),
        verificationRequested: r.verification_requested,
        customerNotes: r.customer_notes,
        items: ((items.data || []) as BulkItemRow[]).map((x) => ({
          itemType: x.item_type,
          description: x.description,
          quantity: x.quantity,
          configuration: safeObjectEntries(x.configuration),
          sameCustomizationForAll: x.same_customization_for_all,
          customizationNotes: x.customization_notes,
          notes: x.notes,
        })),
        files: ((files.data || []) as BulkRequestFileRow[]).map((f) => ({
          fileReference: f.id,
          name: f.original_filename,
          extension: f.file_extension,
          mimeType: f.mime_type,
          fileRole: f.file_role,
          sizeBytes: Number(f.size_bytes),
          uploadStatus: f.upload_status,
          signatureStatus: f.signature_status,
          scanStatus: f.scan_status,
          createdAt: f.created_at,
        })),
        quotations: ((quotes.data || []) as BulkQuoteRow[]).map((q) => ({
          version: q.version,
          status: q.status,
          sentAt: q.sent_at,
          acceptedAt: q.accepted_at,
          createdAt: q.created_at,
        })),
        timeline: ((events.data || []) as RequestEventRow[]).map((e) => ({
          label: e.to_status
            ? bulkStatusLabel(e.to_status)
            : e.event_type === 'BULK_ENQUIRY_SUBMITTED'
              ? 'Bulk enquiry submitted'
              : 'Request updated',
          fromStatus: e.from_status,
          toStatus: e.to_status,
          occurredAt: e.created_at,
          message: e.public_message,
        })),
        allowedTransitions: bulkAllowedTransitions(
          r.status as BulkRequestStatus,
          authorized.role,
        ),
      },
    },
  });
}

async function transitionCustomRequest(
  admin: ReturnType<typeof createClient<EdgeDatabaseSchema, 'public'>>,
  authorized: AdminRecord,
  userId: string,
  body: Record<string, unknown>,
  origin: string | null,
) {
  if (authorized.role !== 'ADMIN')
    return response(origin, 403, {
      ok: false,
      error: 'This admin role is read-only.',
      code: 'ADMIN_MUTATION_FORBIDDEN',
    });
  const reference =
      typeof body.reference === 'string'
        ? body.reference.trim().toUpperCase()
        : '',
    expected =
      typeof body.expectedStatus === 'string' ? body.expectedStatus : '',
    target = typeof body.targetStatus === 'string' ? body.targetStatus : '',
    requestId = typeof body.requestId === 'string' ? body.requestId : '';
  if (
    !customRequestRefPattern.test(reference) ||
    !customRequestStatuses.includes(expected as CustomRequestStatus) ||
    !customRequestStatuses.includes(target as CustomRequestStatus) ||
    !requestId.match(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
  )
    return response(origin, 422, {
      ok: false,
      error: 'Unable to update this request.',
      code: 'INVALID_TRANSITION_REQUEST',
    });
  const { data, error } = await admin.rpc(
    'admin_transition_custom_request_status_server',
    {
      p_actor_user_id: userId,
      p_request_reference: reference,
      p_expected_status: expected,
      p_target_status: target,
      p_request_id: requestId,
    },
  );
  if (error) return requestTransitionError(origin, error);
  return response(origin, 200, { ok: true, data });
}
async function transitionBulkRequest(
  admin: ReturnType<typeof createClient<EdgeDatabaseSchema, 'public'>>,
  authorized: AdminRecord,
  userId: string,
  body: Record<string, unknown>,
  origin: string | null,
) {
  if (authorized.role !== 'ADMIN')
    return response(origin, 403, {
      ok: false,
      error: 'This admin role is read-only.',
      code: 'ADMIN_MUTATION_FORBIDDEN',
    });
  const reference =
      typeof body.reference === 'string'
        ? body.reference.trim().toUpperCase()
        : '',
    expected =
      typeof body.expectedStatus === 'string' ? body.expectedStatus : '',
    target = typeof body.targetStatus === 'string' ? body.targetStatus : '',
    requestId = typeof body.requestId === 'string' ? body.requestId : '';
  if (
    !bulkRequestRefPattern.test(reference) ||
    !bulkRequestStatuses.includes(expected as BulkRequestStatus) ||
    !bulkRequestStatuses.includes(target as BulkRequestStatus) ||
    !requestId.match(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
  )
    return response(origin, 422, {
      ok: false,
      error: 'Unable to update this request.',
      code: 'INVALID_TRANSITION_REQUEST',
    });
  const { data, error } = await admin.rpc(
    'admin_transition_bulk_request_status_server',
    {
      p_actor_user_id: userId,
      p_request_reference: reference,
      p_expected_status: expected,
      p_target_status: target,
      p_request_id: requestId,
    },
  );
  if (error) return requestTransitionError(origin, error);
  return response(origin, 200, { ok: true, data });
}
function requestTransitionError(origin: string | null, error: unknown) {
  const m =
    error instanceof Error
      ? error.message
      : typeof error === 'object' &&
          error !== null &&
          'message' in error &&
          typeof error.message === 'string'
        ? error.message
        : '';
  if (m.includes('ADMIN_MUTATION_FORBIDDEN'))
    return response(origin, 403, {
      ok: false,
      error: 'This admin role is read-only.',
      code: 'ADMIN_MUTATION_FORBIDDEN',
    });
  if (m.includes('REQUEST_STATUS_STALE'))
    return response(origin, 409, {
      ok: false,
      error: 'Request state changed. Refresh and try again.',
      code: 'REQUEST_STATUS_STALE',
    });
  if (m.includes('REQUEST_TRANSITION_UNAVAILABLE'))
    return response(origin, 409, {
      ok: false,
      error: 'This request status change is not available.',
      code: 'REQUEST_TRANSITION_UNAVAILABLE',
    });
  if (m.includes('REQUEST_UNAVAILABLE'))
    return response(origin, 404, {
      ok: false,
      error: 'Request unavailable.',
      code: 'REQUEST_UNAVAILABLE',
    });
  if (m.includes('IDEMPOTENCY_CONFLICT'))
    return response(origin, 409, {
      ok: false,
      error: 'This transition request conflicts with an earlier action.',
      code: 'IDEMPOTENCY_CONFLICT',
    });
  throw error;
}

// Read-only, privacy-preserving monthly operational counts. Not a payment,
// GST, invoice or revenue ledger. Month boundaries are 00:00 IST to 00:00 IST.
async function adminMonthlyOperationalSummary(
  admin: ReturnType<typeof createClient<EdgeDatabaseSchema, 'public'>>,
  authorized: AdminRecord,
  body: Record<string, unknown>,
  origin: string | null,
) {
  if (authorized.role !== 'ADMIN') return response(origin,403,{
    ok:false,error:'This admin role cannot export reports.',code:'ADMIN_MUTATION_FORBIDDEN',
  });
  const month = typeof body.month === 'string' ? body.month : '';
  if (!/^20[2-9][0-9]-(0[1-9]|1[0-2])$/.test(month))
    return response(origin,422,{ok:false,error:'Choose a valid report month.',code:'MONTH_INVALID'});
  const [yearValue,monthValue] = month.split('-').map(Number);
  const offset = 5.5 * 60 * 60 * 1000;
  const start = new Date(Date.UTC(yearValue,monthValue-1,1)-offset).toISOString();
  const end = new Date(Date.UTC(yearValue,monthValue,1)-offset).toISOString();
  const definitions = [
    ['ordersCreated','orders','created_at',null],
    ['customRequestsSubmitted','custom_requests','submitted_at',null],
    ['bulkRequestsSubmitted','bulk_requests','submitted_at',null],
    ['customStatusEvents','custom_request_events','created_at','STATUS_CHANGED'],
    ['bulkStatusEvents','bulk_request_events','created_at','STATUS_CHANGED'],
    ['customAttachmentAccessIssued','custom_request_events','created_at','ADMIN_REQUEST_ATTACHMENT_ACCESS_ISSUED'],
    ['bulkAttachmentAccessIssued','bulk_request_events','created_at','ADMIN_REQUEST_ATTACHMENT_ACCESS_ISSUED'],
  ] as const;
  const results = await Promise.all(definitions.map(async ([key,table,dateColumn,eventType])=>{
    let query=admin.from(table).select('id',{count:'exact',head:true}).gte(dateColumn,start).lt(dateColumn,end);
    if (eventType) query=query.eq('event_type',eventType);
    const {count,error}=await query;
    if (error || count === null || !Number.isSafeInteger(count)) throw error || new Error('MONTHLY_REPORT_COUNT_UNAVAILABLE');
    return [key,count] as const;
  }));
  return response(origin,200,{ok:true,data:{month,timeZone:'Asia/Kolkata',windowUtc:{start,end},
    counts:Object.fromEntries(results),definition:'Operational event and submission counts; not revenue, GST, financial reconciliation or proof of payment.'}});
}

// Customer-uploaded request bytes are NOT order_customer_artifacts. They remain
// in independent private buckets and must never be published by this endpoint.
// The 60-second signed storage URL is used ONLY inside this function. The caller
// receives a same-origin blob stream, never the private bucket/path or signed URL.
const requestAttachmentFileIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const requestAttachmentPreviewTypes = new Set(['application/pdf','image/jpeg','image/png','image/webp']);
const requestAttachmentSignedSeconds = 60;
async function readAdminRequestAttachment(
  admin: ReturnType<typeof createClient<EdgeDatabaseSchema, 'public'>>,
  role: AdminRecord['role'],
  actorId: string,
  body: Record<string, unknown>,
  origin: string | null,
) {
  const mode = body.mode === 'custom' ? 'custom' : body.mode === 'bulk' ? 'bulk' : null;
  const reference = typeof body.reference === 'string' ? body.reference.trim().toUpperCase() : '';
  const fileReference = typeof body.fileReference === 'string' ? body.fileReference : '';
  const disposition = body.disposition === 'preview' ? 'preview' : body.disposition === 'download' ? 'download' : null;
  const unavailable = () => response(origin, 404, {ok:false,error:'Attachment unavailable.',code:'REQUEST_ATTACHMENT_UNAVAILABLE'});
  if (!mode || !disposition || !requestAttachmentFileIdPattern.test(fileReference) ||
      !(mode === 'custom' ? customRequestRefPattern : bulkRequestRefPattern).test(reference)) return unavailable();
  const table = mode === 'custom' ? 'custom_requests' : 'bulk_requests';
  const filesTable = mode === 'custom' ? 'custom_request_files' : 'bulk_request_files';
  const foreignKey = mode === 'custom' ? 'request_id' : 'bulk_request_id';
  const eventTable = mode === 'custom' ? 'custom_request_events' : 'bulk_request_events';
  const expectedBucket = mode === 'custom' ? 'custom-request-files' : 'bulk-request-files';
  const {data: requestRow,error: requestError} = await admin.from(table)
    .select('id,customer_id,status,submitted_at').eq('public_request_id',reference).maybeSingle();
  if (requestError) throw requestError;
  // Never show DRAFT attachments in the admin submitted-request plane.
  if (!requestRow || requestRow.status === 'DRAFT' || !requestRow.submitted_at) return unavailable();
  const {data:file,error:fileError} = await admin.from(filesTable)
    .select('id,customer_id,storage_bucket,storage_path,original_filename,file_extension,mime_type,size_bytes,upload_status,signature_status,scan_status')
    .eq('id',fileReference).eq(foreignKey,requestRow.id).eq('customer_id',requestRow.customer_id).maybeSingle();
  if (fileError) throw fileError;
  if (!file || file.storage_bucket !== expectedBucket || file.upload_status !== 'READY' ||
      !['VALIDATED','UNVERIFIED_ALLOWED'].includes(file.signature_status) ||
      file.scan_status === 'QUARANTINED' || !Number.isSafeInteger(Number(file.size_bytes)) ||
      Number(file.size_bytes) < 1 || Number(file.size_bytes) > 52428800) return unavailable();
  // Existing upload endpoints generate exactly this owner/request/file-id path.
  if (file.storage_path !== `${requestRow.customer_id}/${requestRow.id}/${file.id}${file.file_extension}`) return unavailable();
  if (disposition === 'preview' &&
      (file.scan_status !== 'CLEAN' || file.signature_status !== 'VALIDATED' ||
       !requestAttachmentPreviewTypes.has(file.mime_type)))
    return response(origin,422,{ok:false,error:'Inline preview is unavailable; use Download.',code:'REQUEST_ATTACHMENT_PREVIEW_UNAVAILABLE'});
  const {data:signed,error:signedError} = await admin.storage.from(expectedBucket)
    .createSignedUrl(file.storage_path,requestAttachmentSignedSeconds);
  if (signedError || !signed?.signedUrl) return unavailable();
  const base = Deno.env.get('SUPABASE_URL') || '';
  const signedUrl = new URL(signed.signedUrl,base);
  if (signedUrl.origin !== new URL(base).origin || !signedUrl.pathname.includes('/storage/v1/object/sign/'))
    return unavailable();
  const upstream = await fetch(signedUrl,{redirect:'error'});
  if (!upstream.ok || !upstream.body) return unavailable();
  const sizeHeader = upstream.headers.get('content-length');
  const reportedSize = sizeHeader === null ? null : Number(sizeHeader);
  if (reportedSize !== null && (!Number.isSafeInteger(reportedSize) || reportedSize !== Number(file.size_bytes))) {
    await upstream.body.cancel();
    return unavailable();
  }
  // Authenticated read issuance is recorded in existing private request events.
  // STAFF can read, but it has no access to mutation endpoints.
  const {error:auditError} = await admin.from(eventTable).insert({
    [foreignKey]:requestRow.id,
    event_type:'ADMIN_REQUEST_ATTACHMENT_ACCESS_ISSUED',
    internal_metadata:{admin_user_id:actorId,admin_role:role,file_id:file.id,disposition},
  });
  if (auditError) {
    await upstream.body.cancel();
    throw auditError; // fail closed: no unaudited binary handout
  }
  const name = String(file.original_filename || 'attachment').replace(/[\r\n\\"\/\x00-\x1f]/g,'_').slice(0,180);
  const encodedName = encodeURIComponent(name);
  const headers:Record<string,string> = {
    'Content-Type': disposition === 'preview' ? file.mime_type : 'application/octet-stream',
    'Content-Disposition':`${disposition === 'preview' ? 'inline' : 'attachment'}; filename="attachment"; filename*=UTF-8''${encodedName}`,
    'Cache-Control':'no-store, private',
    'X-Content-Type-Options':'nosniff',
    'Referrer-Policy':'no-referrer',
    'Vary':'Origin',
    'Access-Control-Expose-Headers':'Content-Type,Content-Disposition',
  };
  if (origin) headers['Access-Control-Allow-Origin'] = origin;
  return new Response(upstream.body,{status:200,headers});
}

Deno.serve(async (request) => {
  const origin = request.headers.get('origin'),
    allowedOrigins = (Deno.env.get('ADMIN_ALLOWED_ORIGINS') || '')
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean),
    allowedOrigin = origin && (allowedOrigins.includes(origin) || isCanonicalWebsiteOrigin(origin)) ? origin : null;
  if (origin && !allowedOrigin)
    return response(null, 403, {
      ok: false,
      error: 'Admin access unavailable.',
      code: 'ADMIN_ACCESS_UNAVAILABLE',
    });
  if (request.method === 'OPTIONS') {
    const headers: Record<string, string> = {
      'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      Vary: 'Origin',
    };
    if (allowedOrigin) headers['Access-Control-Allow-Origin'] = allowedOrigin;
    return new Response(null, { status: 204, headers });
  }
  if (request.method !== 'POST')
    return response(allowedOrigin, 405, {
      ok: false,
      error: 'Method not allowed.',
      code: 'METHOD_NOT_ALLOWED',
    });
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '',
    publicKey =
      Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ||
      Deno.env.get('SUPABASE_ANON_KEY') ||
      '',
    secretKey =
      Deno.env.get('SUPABASE_SECRET_KEY') ||
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ||
      '';
  if (!supabaseUrl || !publicKey || !secretKey)
    return response(allowedOrigin, 503, {
      ok: false,
      error: 'Unable to verify admin access.',
      code: 'ADMIN_UNAVAILABLE',
    });
  const authorization = request.headers.get('authorization') || '',
    accessToken = authorization.replace(/^Bearer\s+/i, ''),
    authClient = createClient(supabaseUrl, publicKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    }),
    {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser(accessToken);
  if (userError || !user || user.is_anonymous)
    return response(allowedOrigin, 403, {
      ok: false,
      error: 'Admin access unavailable.',
      code: 'ADMIN_ACCESS_UNAVAILABLE',
    });
  let body: Record<string, unknown>;
  try {
    const decoded: unknown = await request.json();
    if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded))
      throw new Error('invalid');
    body = decoded as Record<string, unknown>;
  } catch {
    return response(allowedOrigin, 400, {
      ok: false,
      error: 'Invalid request.',
      code: 'INVALID_REQUEST',
    });
  }
  const admin = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  try {
    const authorized = await requireAdmin(admin, user.id);
    if (!authorized)
      return response(allowedOrigin, 403, {
        ok: false,
        error: 'Admin access unavailable.',
        code: 'ADMIN_ACCESS_UNAVAILABLE',
      });
    if (body.action === 'authorize') {
      if (body.auditLogin === true) {
        const { error } = await admin.from('admin_access_events').insert({
          admin_user_id: user.id,
          role_snapshot: authorized.role,
          event_type: 'AUTHORIZED_LOGIN',
        });
        if (error) throw error;
      }
      return response(allowedOrigin, 200, {
        ok: true,
        data: { role: authorized.role, displayName: authorized.display_name },
      });
    }
    if (body.action === 'admin-monthly-operational-summary')
      return await adminMonthlyOperationalSummary(admin,authorized,body,allowedOrigin);
    if (body.action === 'dashboard-summary')
      return response(allowedOrigin, 200, {
        ok: true,
        data: {
          admin: {
            role: authorized.role,
            displayName: authorized.display_name,
          },
          summary: await summary(admin),
        },
      });
    if (body.action === 'record-signout') {
      const { error } = await admin.from('admin_access_events').insert({
        admin_user_id: user.id,
        role_snapshot: authorized.role,
        event_type: 'SIGN_OUT',
      });
      if (error) throw error;
      return response(allowedOrigin, 200, {
        ok: true,
        data: { recorded: true },
      });
    }
    if (body.action === 'orders-list')
      return await ordersList(admin, authorized, body, allowedOrigin);
    if (body.action === 'order-detail')
      return await orderDetail(admin, authorized, body, allowedOrigin);
    if (body.action === 'order-transition')
      return await transitionOrder(
        admin,
        authorized,
        user.id,
        body,
        allowedOrigin,
      );
    if (body.action === 'customers-list')
      return await customersList(admin, authorized, body, allowedOrigin);
    if (body.action === 'customer-detail')
      return await customerDetail(admin, authorized, body, allowedOrigin);
    if (body.action === 'custom-requests-list')
      return await customRequestsList(admin, authorized, body, allowedOrigin);
    if (body.action === 'request-attachment-read')
      return await readAdminRequestAttachment(admin, authorized.role, user.id, body, allowedOrigin);
    if (body.action === 'custom-request-detail')
      return await customRequestDetail(admin, authorized, body, allowedOrigin);
    if (body.action === 'custom-request-transition')
      return await transitionCustomRequest(
        admin,
        authorized,
        user.id,
        body,
        allowedOrigin,
      );
    if (body.action === 'bulk-requests-list')
      return await bulkRequestsList(admin, authorized, body, allowedOrigin);
    if (body.action === 'bulk-request-detail')
      return await bulkRequestDetail(admin, authorized, body, allowedOrigin);
    if (body.action === 'bulk-request-transition')
      return await transitionBulkRequest(
        admin,
        authorized,
        user.id,
        body,
        allowedOrigin,
      );
    return response(allowedOrigin, 400, {
      ok: false,
      error: 'Unknown admin action.',
      code: 'UNKNOWN_ACTION',
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'ORDERS_FILTER_INVALID')
      return response(allowedOrigin, 422, {
        ok: false,
        error: 'Order filters are invalid.',
        code: 'INVALID_FILTERS',
      });
    if (error instanceof Error && error.message === 'PHASE3_FILTER_INVALID')
      return response(allowedOrigin, 422, {
        ok: false,
        error: 'Request filters are invalid.',
        code: 'INVALID_FILTERS',
      });
    if (error instanceof Error && error.message === 'CUSTOMER_FILTER_INVALID')
      return response(allowedOrigin, 422, {
        ok: false,
        error: 'Customer reference is invalid.',
        code: 'INVALID_FILTERS',
      });
    console.error(
      'admin-api failure',
      error instanceof Error ? error.message : 'unknown_error',
    );
    return response(allowedOrigin, 500, {
      ok: false,
      error: 'Unable to load admin operations.',
      code: 'ADMIN_ERROR',
    });
  }
});
