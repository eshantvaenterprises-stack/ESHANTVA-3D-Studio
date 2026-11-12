import { createClient } from 'npm:@supabase/supabase-js@2.116.0';

const activeOrderStatuses = new Set(['pending_payment','payment_processing','paid','under_review','confirmed','in_production','ready_for_pickup','shipped']);
const safeOrderEventTypes = new Set(['order_created','payment_confirmed','status_changed']);
const safeOrderDetailEventTypes = new Set(['order_created','payment_confirmed','status_changed','dispatched','delivered']);
const publicOrderReferencePattern = /^ESHA-[0-9]{4}-[A-Z0-9]{8}$/;

function response(origin: string | null, status: number, body: unknown) {
  const headers: Record<string,string> = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Vary': 'Origin' };
  if (origin) headers['Access-Control-Allow-Origin'] = origin;
  return new Response(JSON.stringify(body), { status, headers });
}

function orderStatusLabel(status: string) {
  const labels: Record<string,string> = {
    pending_payment:'Pending payment', payment_processing:'Payment processing', paid:'Paid', under_review:'Under review', confirmed:'Confirmed',
    in_production:'In production', ready_for_pickup:'Ready for pickup', shipped:'Shipped', delivered:'Delivered', cancelled:'Cancelled', refunded:'Refunded',
  };
  return labels[status] || 'Order update';
}

function paymentStatusLabel(status: string) {
  const labels: Record<string,string> = { not_started:'Not started', pending:'Pending', processing:'Processing', paid:'Paid', failed:'Failed', cancelled:'Cancelled', refunded:'Refunded' };
  return labels[status] || 'Payment update';
}

function customStatusLabel(status: string) {
  const labels: Record<string,string> = { SUBMITTED:'Submitted', UNDER_REVIEW:'Under review', NEEDS_INFORMATION:'More information needed', QUOTED:'Quoted', ACCEPTED:'Accepted', DECLINED:'Declined', CANCELLED:'Cancelled', CONVERTED_TO_ORDER:'Converted to order' };
  return labels[status] || 'In review';
}

function bulkStatusLabel(status: string) {
  const labels: Record<string,string> = { SUBMITTED:'Submitted', UNDER_REVIEW:'Under review', MORE_INFORMATION_REQUIRED:'More information needed', QUOTATION_PREPARATION:'Quotation preparation', QUOTATION_SENT:'Quotation sent', AWAITING_CUSTOMER_APPROVAL:'Awaiting your approval', ACCEPTED:'Accepted', REJECTED:'Rejected', CANCELLED:'Cancelled', CONVERTED_TO_ORDER:'Converted to order' };
  return labels[status] || 'In review';
}

function deliveryLabel(method: string) {
  return method === 'pickup' ? 'Pickup' : method === 'local_delivery' ? 'Local delivery' : method === 'shipping' ? 'Shipping' : 'Delivery';
}

function timelineLabel(eventType: string, toStatus: string | null) {
  if (eventType === 'order_created') return 'Order received';
  if (eventType === 'payment_confirmed') return 'Payment confirmed';
  if (eventType === 'dispatched') return 'Dispatched';
  if (eventType === 'delivered') return 'Delivered';
  if (eventType === 'status_changed') return orderStatusLabel(toStatus || '');
  return 'Order update';
}

function safeOptions(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const option = entry as Record<string,unknown>;
    const label = typeof option.label === 'string' ? option.label.trim() : '';
    const valueLabel = typeof option.valueLabel === 'string' ? option.valueLabel.trim() : '';
    if (!label || !valueLabel) return [];
    return [{ label, value:valueLabel }];
  }).slice(0,30);
}

async function dashboardOverview(admin: ReturnType<typeof createClient>, user: { id:string; email?:string; user_metadata?:Record<string,unknown> }, origin: string | null) {
  const [ordersResult, customResult, bulkResult, ordersCount, activeOrdersCount, customCount, bulkCount] = await Promise.all([
    admin.from('orders').select('id,public_order_id,status,payment_status,currency,total_paise,delivery_method,created_at').eq('customer_id', user.id).order('created_at', { ascending:false }).limit(20),
    admin.from('custom_requests').select('public_request_id,status,submitted_at,created_at').eq('customer_id', user.id).neq('status','DRAFT').not('public_request_id','is',null).order('created_at', { ascending:false }).limit(8),
    admin.from('bulk_requests').select('public_request_id,status,submitted_at,created_at').eq('customer_id', user.id).neq('status','DRAFT').not('public_request_id','is',null).order('created_at', { ascending:false }).limit(8),
    admin.from('orders').select('id', { count:'exact', head:true }).eq('customer_id', user.id),
    admin.from('orders').select('id', { count:'exact', head:true }).eq('customer_id', user.id).in('status', Array.from(activeOrderStatuses)),
    admin.from('custom_requests').select('id', { count:'exact', head:true }).eq('customer_id', user.id).neq('status','DRAFT').not('public_request_id','is',null),
    admin.from('bulk_requests').select('id', { count:'exact', head:true }).eq('customer_id', user.id).neq('status','DRAFT').not('public_request_id','is',null),
  ]);
  const firstError = [ordersResult, customResult, bulkResult, ordersCount, activeOrdersCount, customCount, bulkCount].find((result) => result.error)?.error;
  if (firstError) throw firstError;

  const orders = ordersResult.data || [];
  const custom = customResult.data || [];
  const bulk = bulkResult.data || [];
  const orderIds = orders.map((order) => order.id);
  const orderRefById = new Map(orders.map((order) => [order.id, order.public_order_id]));

  let orderEvents: Array<{ order_id:string; event_type:string; to_status:string|null; created_at:string }> = [];
  if (orderIds.length > 0) {
    const { data, error } = await admin.from('order_events').select('order_id,event_type,to_status,created_at').in('order_id', orderIds).in('event_type', Array.from(safeOrderEventTypes)).order('created_at', { ascending:false }).limit(20);
    if (error) throw error;
    orderEvents = data || [];
  }

  const safeOrders = orders.map((order) => ({
    reference:order.public_order_id,
    createdAt:order.created_at,
    status:order.status,
    statusLabel:orderStatusLabel(order.status),
    paymentStatus:order.payment_status,
    paymentLabel:paymentStatusLabel(order.payment_status),
    totalPaise:Number(order.total_paise),
    currency:order.currency,
    deliveryMethod:order.delivery_method,
    deliveryLabel:deliveryLabel(order.delivery_method),
  }));

  const safeCustom = custom.map((item) => ({ reference:item.public_request_id!, submittedAt:item.submitted_at || item.created_at, status:item.status, statusLabel:customStatusLabel(item.status) }));
  const safeBulk = bulk.map((item) => ({ reference:item.public_request_id!, submittedAt:item.submitted_at || item.created_at, status:item.status, statusLabel:bulkStatusLabel(item.status) }));

  const activities = [
    ...orderEvents.map((event, index) => ({
      id:`order-activity-${index}-${event.created_at}`,
      kind:event.event_type === 'payment_confirmed' ? 'payment' : event.event_type === 'status_changed' ? 'order_status' : 'order',
      label:event.event_type === 'payment_confirmed' ? 'Payment confirmed' : event.event_type === 'status_changed' ? orderStatusLabel(event.to_status || '') : 'Order created',
      reference:orderRefById.get(event.order_id) || 'Order',
      occurredAt:event.created_at,
    })),
    ...safeCustom.map((item) => ({ id:`cr-${item.reference}`, kind:'custom_request', label:'Custom request submitted', reference:item.reference, occurredAt:item.submittedAt })),
    ...safeBulk.map((item) => ({ id:`br-${item.reference}`, kind:'bulk_request', label:'Bulk request submitted', reference:item.reference, occurredAt:item.submittedAt })),
  ].sort((a,b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt)).slice(0,8);

  let profileDisplayName=typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : null;
  if(Deno.env.get('WEBSITE_FEATURES_ENABLED')==='true'){
    const{data:profile,error:profileError}=await admin.from('website_customer_profiles').select('display_name').eq('customer_id',user.id).maybeSingle();
    if(profileError)throw profileError;
    if(profile)profileDisplayName=profile.display_name;
  }
  return response(origin, 200, { ok:true, data:{
    account:{ displayName:profileDisplayName, email:user.email || '', statusLabel:'Active account' },
    orders:{ total:ordersCount.count || 0, active:activeOrdersCount.count || 0, latest:safeOrders[0] || null, recent:safeOrders.slice(0,5) },
    customRequests:{ total:customCount.count || 0, recent:safeCustom.slice(0,5) },
    bulkRequests:{ total:bulkCount.count || 0, recent:safeBulk.slice(0,5) },
    activity:activities,
  } });
}

async function orderDetail(admin: ReturnType<typeof createClient>, userId: string, body: Record<string,unknown>, origin: string | null) {
  const reference = typeof body.reference === 'string' ? body.reference.trim().toUpperCase() : '';
  if (!publicOrderReferencePattern.test(reference)) return response(origin, 404, { ok:false, error:'Order unavailable.', code:'ORDER_UNAVAILABLE' });

  const { data:order, error:orderError } = await admin.from('orders')
    .select('id,public_order_id,status,payment_status,currency,item_subtotal_paise,shipping_paise,tax_amount_paise,tax_added_paise,total_paise,delivery_method,delivery_label,tax_label,created_at,paid_at')
    .eq('public_order_id', reference)
    .eq('customer_id', userId)
    .maybeSingle();
  if (orderError) throw orderError;
  if (!order) return response(origin, 404, { ok:false, error:'Order unavailable.', code:'ORDER_UNAVAILABLE' });

  const [itemsResult, addressResult, eventsResult] = await Promise.all([
    admin.from('order_items').select('title_snapshot,options_snapshot,quantity,unit_price_paise,line_subtotal_paise').eq('order_id', order.id).order('created_at', { ascending:true }),
    admin.from('order_addresses').select('recipient_name,address_line_1,address_line_2,locality,city,district,state,pin_code,country').eq('order_id', order.id).maybeSingle(),
    admin.from('order_events').select('event_type,to_status,created_at').eq('order_id', order.id).in('event_type', Array.from(safeOrderDetailEventTypes)).order('created_at', { ascending:true }).limit(50),
  ]);
  const firstError = [itemsResult, addressResult, eventsResult].find((result) => result.error)?.error;
  if (firstError) throw firstError;

  const items = (itemsResult.data || []).map((item) => ({
    title:item.title_snapshot,
    quantity:item.quantity,
    unitPricePaise:Number(item.unit_price_paise),
    lineSubtotalPaise:Number(item.line_subtotal_paise),
    selectedOptions:safeOptions(item.options_snapshot),
  }));

  const address = addressResult.data ? {
    recipientName:addressResult.data.recipient_name,
    addressLine1:addressResult.data.address_line_1,
    addressLine2:addressResult.data.address_line_2,
    locality:addressResult.data.locality,
    city:addressResult.data.city,
    district:addressResult.data.district,
    state:addressResult.data.state,
    pinCode:addressResult.data.pin_code,
    country:addressResult.data.country,
  } : null;

  const timeline = (eventsResult.data || []).map((event, index) => ({
    key:`timeline-${index}-${event.created_at}`,
    label:timelineLabel(event.event_type, event.to_status),
    occurredAt:event.created_at,
  }));
  if (!timeline.some((event) => event.label === 'Order received')) timeline.unshift({ key:'order-created', label:'Order received', occurredAt:order.created_at });
  if (order.paid_at && !timeline.some((event) => event.label === 'Payment confirmed')) timeline.push({ key:'payment-confirmed', label:'Payment confirmed', occurredAt:order.paid_at });
  timeline.sort((a,b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt));

  return response(origin, 200, { ok:true, data:{
    reference:order.public_order_id,
    createdAt:order.created_at,
    status:order.status,
    statusLabel:orderStatusLabel(order.status),
    paymentStatus:order.payment_status,
    paymentLabel:paymentStatusLabel(order.payment_status),
    paidAt:order.paid_at,
    currency:order.currency,
    itemSubtotalPaise:Number(order.item_subtotal_paise),
    shippingPaise:Number(order.shipping_paise),
    taxAmountPaise:Number(order.tax_amount_paise),
    taxAddedPaise:Number(order.tax_added_paise),
    totalPaise:Number(order.total_paise),
    taxLabel:order.tax_label,
    deliveryMethod:order.delivery_method,
    deliveryLabel:order.delivery_label || deliveryLabel(order.delivery_method),
    items,
    delivery:address,
    timeline,
  } });
}


const publicArtifactReferencePattern = /^ART-[0-9]{4}-[A-Z0-9]{8}$/;
const publicApprovalReferencePattern = /^APR-[0-9]{4}-[A-Z0-9]{8}$/;
const artifactSignedUrlSeconds = 120;
const customerArtifactBucket = 'customer-order-artifacts';
const customerArtifactCategories = new Set([
  'design_preview',
  'revised_design',
  'approval_document',
  'verification_image',
  'verification_video',
  'final_document',
]);

function artifactCategoryLabel(category: string) {
  const labels: Record<string,string> = {
    design_preview:'Design preview',
    revised_design:'Revised design',
    approval_document:'Approval document',
    verification_image:'Verification image',
    verification_video:'Verification video',
    final_document:'Final document',
  };
  return labels[category] || 'Customer file';
}

function approvalStatusLabel(status: string) {
  const labels: Record<string,string> = {
    PENDING:'Approval required',
    APPROVED:'Approved',
    REVISION_REQUESTED:'Revision requested',
  };
  return labels[status] || 'Review status';
}

async function ownedOrderId(
  admin: ReturnType<typeof createClient>,
  customerId: string,
  reference: string,
) {
  if (!publicOrderReferencePattern.test(reference)) return null;
  const { data, error } = await admin.from('orders')
    .select('id')
    .eq('public_order_id', reference)
    .eq('customer_id', customerId)
    .maybeSingle();
  if (error) throw error;
  return data?.id || null;
}

async function orderFilesOverview(
  admin: ReturnType<typeof createClient>,
  customerId: string,
  body: Record<string,unknown>,
  origin: string | null,
) {
  const reference = typeof body.reference === 'string' ? body.reference.trim().toUpperCase() : '';
  const orderId = await ownedOrderId(admin, customerId, reference);
  if (!orderId) return response(origin, 404, { ok:false, error:'File area unavailable.', code:'FILES_UNAVAILABLE' });

  const [artifactResult, approvalResult] = await Promise.all([
    admin.from('order_customer_artifacts')
      .select('id,public_artifact_ref,category,display_name,description,version_label,revision,mime_type,size_bytes,created_at')
      .eq('order_id', orderId)
      .eq('customer_visible', true)
      .order('created_at', { ascending:false }),
    admin.from('order_approval_requests')
      .select('id,public_approval_ref,artifact_id,target_revision,status,requested_at,resolved_at')
      .eq('order_id', orderId)
      .order('requested_at', { ascending:false }),
  ]);
  if (artifactResult.error || approvalResult.error) throw artifactResult.error || approvalResult.error;

  const artifacts = (artifactResult.data || []).filter((artifact) => customerArtifactCategories.has(artifact.category));
  const artifactById = new Map(artifacts.map((artifact) => [artifact.id, artifact]));
  const latestRevisionByCategory = new Map<string,number>();
  for (const artifact of artifacts) {
    latestRevisionByCategory.set(
      artifact.category,
      Math.max(latestRevisionByCategory.get(artifact.category) || 0, artifact.revision),
    );
  }

  const approvals = (approvalResult.data || []).filter((approval) => artifactById.has(approval.artifact_id));
  const approvalIds = approvals.map((approval) => approval.id);
  let actions: Array<{
    approval_request_id:string;
    artifact_id:string;
    artifact_revision:number;
    action:string;
    created_at:string;
  }> = [];
  if (approvalIds.length > 0) {
    const { data, error } = await admin.from('order_approval_actions')
      .select('approval_request_id,artifact_id,artifact_revision,action,created_at')
      .in('approval_request_id', approvalIds)
      .eq('customer_id', customerId)
      .order('created_at', { ascending:false })
      .limit(50);
    if (error) throw error;
    actions = data || [];
  }

  const approvalByArtifact = new Map(approvals.map((approval) => [approval.artifact_id, approval]));
  const safeArtifacts = artifacts.map((artifact) => {
    const approval = approvalByArtifact.get(artifact.id);
    const isLatest = artifact.revision === latestRevisionByCategory.get(artifact.category);
    const approvalCurrent = approval ? approval.target_revision === artifact.revision : true;
    return {
      reference:artifact.public_artifact_ref,
      category:artifact.category,
      categoryLabel:artifactCategoryLabel(artifact.category),
      displayName:artifact.display_name,
      description:artifact.description,
      versionLabel:artifact.version_label,
      revision:artifact.revision,
      mimeType:artifact.mime_type,
      sizeBytes:Number(artifact.size_bytes),
      createdAt:artifact.created_at,
      isLatest,
      approval:approval ? {
        reference:approval.public_approval_ref,
        status:approval.status,
        statusLabel:approvalCurrent ? approvalStatusLabel(approval.status) : 'This version is no longer current',
        requestedAt:approval.requested_at,
        resolvedAt:approval.resolved_at,
        actionable:approval.status === 'PENDING' && isLatest && approvalCurrent,
        targetRevision:approval.target_revision,
      } : null,
    };
  });

  const safeHistory = actions.flatMap((action) => {
    const artifact = artifactById.get(action.artifact_id);
    const approval = approvals.find((item) => item.id === action.approval_request_id);
    if (!artifact || !approval) return [];
    return [{
      approvalReference:approval.public_approval_ref,
      artifactReference:artifact.public_artifact_ref,
      displayName:artifact.display_name,
      versionLabel:artifact.version_label,
      revision:action.artifact_revision,
      action:action.action,
      actionLabel:approvalStatusLabel(action.action),
      occurredAt:action.created_at,
    }];
  });

  const attention = safeArtifacts.filter((artifact) => artifact.approval?.actionable);
  const media = safeArtifacts.filter((artifact) => artifact.category === 'verification_image' || artifact.category === 'verification_video');
  const reviewStatus = attention.length > 0
    ? 'action_required'
    : safeArtifacts.length > 0
      ? 'up_to_date'
      : 'no_files';

  return response(origin, 200, { ok:true, data:{
    orderReference:reference,
    reviewStatus,
    reviewStatusLabel:reviewStatus === 'action_required' ? 'Approval required' : reviewStatus === 'up_to_date' ? 'No approval waiting' : 'No customer files',
    attention,
    latest:safeArtifacts.find((artifact) => artifact.isLatest) || null,
    files:safeArtifacts,
    verificationMedia:media,
    history:safeHistory,
  } });
}

async function artifactAccess(
  admin: ReturnType<typeof createClient>,
  customerId: string,
  body: Record<string,unknown>,
  origin: string | null,
) {
  const reference = typeof body.reference === 'string' ? body.reference.trim().toUpperCase() : '';
  const artifactReference = typeof body.artifactReference === 'string' ? body.artifactReference.trim().toUpperCase() : '';
  const disposition = body.disposition === 'download' ? 'download' : 'preview';
  if (!publicOrderReferencePattern.test(reference) || !publicArtifactReferencePattern.test(artifactReference)) {
    return response(origin, 404, { ok:false, error:'File unavailable.', code:'FILE_UNAVAILABLE' });
  }

  const orderId = await ownedOrderId(admin, customerId, reference);
  if (!orderId) return response(origin, 404, { ok:false, error:'File unavailable.', code:'FILE_UNAVAILABLE' });

  const { data:artifact, error } = await admin.from('order_customer_artifacts')
    .select('public_artifact_ref,category,display_name,mime_type,storage_bucket,storage_path')
    .eq('order_id', orderId)
    .eq('public_artifact_ref', artifactReference)
    .eq('customer_visible', true)
    .maybeSingle();
  if (error) throw error;
  if (!artifact || artifact.storage_bucket !== customerArtifactBucket || !customerArtifactCategories.has(artifact.category)) {
    return response(origin, 404, { ok:false, error:'File unavailable.', code:'FILE_UNAVAILABLE' });
  }

  const options = disposition === 'download' ? { download:artifact.display_name } : undefined;
  const { data:signed, error:signError } = await admin.storage.from(customerArtifactBucket)
    .createSignedUrl(artifact.storage_path, artifactSignedUrlSeconds, options);
  if (signError || !signed?.signedUrl) {
    console.error('artifact signing failure', signError?.message || 'missing_signed_url');
    return response(origin, 404, { ok:false, error:'File unavailable.', code:'FILE_UNAVAILABLE' });
  }

  return response(origin, 200, { ok:true, data:{
    artifactReference:artifact.public_artifact_ref,
    displayName:artifact.display_name,
    mimeType:artifact.mime_type,
    category:artifact.category,
    signedUrl:signed.signedUrl,
    expiresAt:new Date(Date.now() + artifactSignedUrlSeconds * 1000).toISOString(),
    disposition,
  } });
}

async function submitArtifactApproval(
  admin: ReturnType<typeof createClient>,
  customerId: string,
  body: Record<string,unknown>,
  origin: string | null,
) {
  const reference = typeof body.reference === 'string' ? body.reference.trim().toUpperCase() : '';
  const approvalReference = typeof body.approvalReference === 'string' ? body.approvalReference.trim().toUpperCase() : '';
  const artifactReference = typeof body.artifactReference === 'string' ? body.artifactReference.trim().toUpperCase() : '';
  const expectedRevision = typeof body.expectedRevision === 'number' && Number.isInteger(body.expectedRevision) ? body.expectedRevision : 0;
  const action = body.decision === 'approve'
    ? 'APPROVED'
    : body.decision === 'request_revision'
      ? 'REVISION_REQUESTED'
      : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';

  if (!publicOrderReferencePattern.test(reference)
      || !publicApprovalReferencePattern.test(approvalReference)
      || !publicArtifactReferencePattern.test(artifactReference)
      || expectedRevision < 1
      || !action) {
    return response(origin, 404, { ok:false, error:'Approval unavailable.', code:'APPROVAL_UNAVAILABLE' });
  }
  if (action === 'REVISION_REQUESTED' && (message.length < 3 || message.length > 1000)) {
    return response(origin, 422, { ok:false, error:'Add a short revision note between 3 and 1,000 characters.', code:'REVISION_MESSAGE_INVALID' });
  }

  const { data, error } = await admin.rpc('submit_customer_artifact_approval_server', {
    p_customer_id:customerId,
    p_order_reference:reference,
    p_approval_reference:approvalReference,
    p_artifact_reference:artifactReference,
    p_expected_revision:expectedRevision,
    p_action:action,
    p_message:message || null,
  });

  if (error) {
    const messageText = error.message || '';
    if (messageText.includes('APPROVAL_STALE')) {
      return response(origin, 409, { ok:false, error:'This version is no longer current. Refresh to review the latest version.', code:'APPROVAL_STALE' });
    }
    if (messageText.includes('APPROVAL_ALREADY_RESOLVED')) {
      return response(origin, 409, { ok:false, error:'This approval has already been completed. Refresh to see the current state.', code:'APPROVAL_ALREADY_RESOLVED' });
    }
    if (messageText.includes('REVISION_MESSAGE_INVALID')) {
      return response(origin, 422, { ok:false, error:'Add a short revision note between 3 and 1,000 characters.', code:'REVISION_MESSAGE_INVALID' });
    }
    if (messageText.includes('APPROVAL_UNAVAILABLE')) {
      return response(origin, 404, { ok:false, error:'Approval unavailable.', code:'APPROVAL_UNAVAILABLE' });
    }
    throw error;
  }

  return response(origin, 200, { ok:true, data:{
    approvalReference:data?.approvalReference || approvalReference,
    artifactReference:data?.artifactReference || artifactReference,
    revision:data?.revision || expectedRevision,
    status:data?.status || action,
    replayed:Boolean(data?.replayed),
  } });
}

Deno.serve(async (request) => {
  const origin = request.headers.get('origin');
  const allowedOrigins = [
    Deno.env.get('DASHBOARD_ALLOWED_ORIGINS'),
    Deno.env.get('CHECKOUT_ALLOWED_ORIGINS'),
    Deno.env.get('CONTACT_ALLOWED_ORIGINS'),
  ].filter(Boolean).flatMap((value) => value!.split(',')).map((value) => value.trim()).filter(Boolean);
  const allowedOrigin = origin && allowedOrigins.includes(origin) ? origin : null;

  if (origin && !allowedOrigin) return response(null, 403, { ok:false, error:'Account request origin is not allowed.' });
  if (request.method === 'OPTIONS') {
    const headers: Record<string,string> = {
      'Access-Control-Allow-Headers':'authorization, apikey, content-type',
      'Access-Control-Allow-Methods':'POST, OPTIONS',
      'Vary':'Origin',
    };
    if (allowedOrigin) headers['Access-Control-Allow-Origin'] = allowedOrigin;
    return new Response(null, { status:204, headers });
  }
  if (request.method !== 'POST') return response(allowedOrigin, 405, { ok:false, error:'Method not allowed.' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const publicKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';
  const secretKey = Deno.env.get('SUPABASE_SECRET_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!supabaseUrl || !publicKey || !secretKey) return response(allowedOrigin, 503, { ok:false, error:'Account activity is temporarily unavailable.' });

  const authorization = request.headers.get('authorization') || '';
  const token = authorization.replace(/^Bearer\s+/i, '');
  const authClient = createClient(supabaseUrl, publicKey, { global:{ headers:{ Authorization:authorization } }, auth:{ persistSession:false, autoRefreshToken:false } });
  const { data:{ user }, error:userError } = await authClient.auth.getUser(token);
  if (userError || !user) return response(allowedOrigin, 401, { ok:false, error:'Account access is required.' });
  if (user.is_anonymous) return response(allowedOrigin, 403, { ok:false, error:'Complete account access before opening customer account data.' });

  let body: Record<string,unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('invalid_body');
    body = parsed as Record<string,unknown>;
  } catch {
    return response(allowedOrigin, 400, { ok:false, error:'Invalid request.' });
  }

  const admin = createClient(supabaseUrl, secretKey, { auth:{ persistSession:false, autoRefreshToken:false } });
  try {
    if (body.action === 'dashboard-overview') return await dashboardOverview(admin, user, allowedOrigin);
    if (body.action === 'order-detail') return await orderDetail(admin, user.id, body, allowedOrigin);
    if (body.action === 'order-files-overview') return await orderFilesOverview(admin, user.id, body, allowedOrigin);
    if (body.action === 'artifact-access') return await artifactAccess(admin, user.id, body, allowedOrigin);
    if (body.action === 'submit-artifact-approval') return await submitArtifactApproval(admin, user.id, body, allowedOrigin);
    return response(allowedOrigin, 400, { ok:false, error:'Unknown account action.' });
  } catch (error) {
    console.error('customer-dashboard-api failure', error instanceof Error ? error.message : 'unknown_error');
    return response(allowedOrigin, 500, { ok:false, error:'Unable to load your account activity.' });
  }
});
