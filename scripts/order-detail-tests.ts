import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  extractOrderReferenceFromPath,
  isOrderDetailPath,
  isOrderRequestCurrent,
  isPublicOrderReference,
} from '../src/lib/orderDetailApi';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');
const hash = (file: string) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');

const page = read('app/account/orders/page.tsx');
const client = read('src/components/order-detail/CustomerOrderDetailClient.tsx');
const boundary = read('src/components/order-detail/StaticOrderRouteBoundary.tsx');
const api = read('src/lib/orderDetailApi.ts');
const edge = read('supabase/functions/customer-dashboard-api/index.ts');
const dashboard = read('src/components/dashboard/CustomerDashboardClient.tsx');
const placeholder = read('app/[...path]/page.tsx');
const notFound = read('app/not-found.tsx');
const vercel = read('vercel.json');
const packageJson = JSON.parse(read('package.json')) as { scripts: Record<string,string> };

assert(page.includes("title: 'Order Details | ESHANTVA 3D Studio'"));
assert(page.includes('robots: { index: false, follow: false }'));
assert(page.includes('<CustomerOrderDetailClient />'));
assert(!placeholder.includes("'account/orders'"), 'Page 17 must not remain a catch-all placeholder.');
assert(vercel.includes('/account/orders/:reference') && vercel.includes('/account/orders/'), 'Static preview/deployment must rewrite a public reference URL to the static order shell.');
assert(notFound.includes('StaticOrderRouteBoundary') && boundary.includes('isOrderDetailPath'), 'Static hosts without rewrites must retain the order-detail fallback boundary.');

assert(api.includes("const publicOrderReferencePattern = /^ESHA-[0-9]{4}-[A-Z0-9]{8}$/"));
assert(api.includes("match(/^\\/account\\/orders\\/([^/?#]+)\\/?$/)"), 'Client must parse the public reference from the customer-facing path.');
assert(api.includes("body: JSON.stringify({ action: 'order-detail', reference })"));
assert(api.includes('session.user.id !== expectedUserId'), 'Order request must verify the active browser session still matches the expected customer before fetch.');
assert(api.includes("if (response.status === 404) return { kind: 'unavailable' }"));

const validReference = 'ESHA-2026-AB12CD34';
assert.equal(isPublicOrderReference(validReference), true);
assert.equal(isPublicOrderReference('esha-2026-AB12CD34'), false);
assert.equal(isPublicOrderReference('ESHA-2026-ABC'), false);
assert.equal(extractOrderReferenceFromPath(`/account/orders/${validReference}/`), validReference);
assert.equal(extractOrderReferenceFromPath(`/studio/account/orders/${validReference}/`, '/studio'), validReference);
assert.equal(extractOrderReferenceFromPath('/account/orders/'), null);
assert.equal(extractOrderReferenceFromPath('/account/orders/ESHA-2026-%E0%A4%A/'), 'ESHA-2026-%E0%A4%A');
assert.equal(isOrderDetailPath('/not-an-order/'), false);
assert.equal(isOrderDetailPath('/account/orders/not-a-valid-reference/'), true, 'Malformed references must still reach the privacy-safe unavailable shell.');

const expectedRequest = { epoch: 9, userId: 'customer-a', reference: validReference };
assert.equal(isOrderRequestCurrent({ epoch: 9, userId: 'customer-a', reference: validReference }, expectedRequest), true);
assert.equal(isOrderRequestCurrent({ epoch: 10, userId: 'customer-a', reference: validReference }, expectedRequest), false, 'A newer request must invalidate a delayed response.');
assert.equal(isOrderRequestCurrent({ epoch: 9, userId: 'customer-b', reference: validReference }, expectedRequest), false, 'An auth-user change must invalidate the old response.');
assert.equal(isOrderRequestCurrent({ epoch: 9, userId: 'customer-a', reference: 'ESHA-2026-ZZ99YY88' }, expectedRequest), false, 'A route-reference change must invalidate the old response.');
assert.equal(isOrderRequestCurrent({ epoch: 9, userId: null, reference: null }, expectedRequest), false, 'Sign-out/unmount invalidation must reject the old response.');

assert(edge.includes("if (body.action === 'order-detail')"));
assert(edge.includes('auth.getUser(token)') && edge.includes('if (user.is_anonymous)'));
assert(edge.includes(".eq('public_order_id', reference)") && edge.includes(".eq('customer_id', userId)"), 'Order detail lookup must bind public reference and verified customer ownership.');
assert((edge.match(/code:'ORDER_UNAVAILABLE'/g)?.length || 0) >= 2, 'Invalid, missing and foreign references must collapse to the same safe unavailable response.');
assert(edge.includes(".from('order_items').select('title_snapshot,options_snapshot,quantity,unit_price_paise,line_subtotal_paise')"));
assert(edge.includes(".from('order_addresses').select('recipient_name,address_line_1,address_line_2,locality,city,district,state,pin_code,country')"));
assert(edge.includes(".from('order_events').select('event_type,to_status,created_at')"));
assert(!edge.includes(".from('order_payments')"), 'Page 17 must not fetch gateway/payment-provider internals.');
for (const banned of ['provider_session_id','provider_payment_id','redirect_url','idempotency_key','request_hash','internal_metadata','sku_snapshot','configuration_signature']) {
  assert(!edge.includes(banned), `Customer order detail backend must not select or expose ${banned}.`);
}
assert(edge.includes("safeOrderDetailEventTypes = new Set(['order_created','payment_confirmed','status_changed','dispatched','delivered'])"));
assert(edge.includes('selectedOptions:safeOptions(item.options_snapshot)'));
assert(edge.includes("label:'Order received'") && edge.includes("label:'Payment confirmed'"));

assert(client.includes("const requestEpoch = useRef(0)"));
assert(client.includes("const activeUserId = useRef<string | null>(null)"));
assert(client.includes("const activeReference = useRef<string | null>(null)"));
assert(client.includes('isOrderRequestCurrent') && client.includes('if (!requestIsCurrent()) return;'), 'Success/error commits must be bound to request epoch, customer and reference.');
assert(client.includes('requestEpoch.current += 1') && client.includes('activeReference.current = null'), 'Sign-out/auth/reference transitions must invalidate outstanding order requests.');
assert(client.includes("window.location.replace(withBase('/account/'))"));
assert(client.includes('Complete account access.') && client.includes('Order unavailable.'));
assert(client.includes('Back to Dashboard') && client.includes('Continue Shopping'));
assert(!client.match(/courier|awb|dispatch eta|service_role|SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY/i));

assert(dashboard.includes('dashboard-order-link') && dashboard.includes('href={withBase(futureHref)}'), 'Dashboard latest order CTA must open Page 17.');
assert(!dashboard.includes('data-future-href'), 'Disabled Page 17 future-link contract must be removed.');

assert(hash('src/components/account/AccountAccessClient.tsx') === '039f7ead2b199ed28d8707026df7d92b66f618e9548b424747bc1e42e36e82f8', 'Accepted AccountAccessClient session-race repair changed unexpectedly.');
assert(hash('src/components/account/AccountVisual.tsx') === '3bbaf2a124be3816c93c9119c569c27c7b827b6cbc46fe19b640f3aae39144e0', 'Claude Page 15 AccountVisual changed unexpectedly.');
assert(hash('src/components/account/account-access.css') === '58fc41f0ddd2dc83518f8f59f03d21c6fbe222db9688e37ce5cb27cac249d1c4', 'Claude Page 15 account-access.css changed unexpectedly.');

assert(packageJson.scripts['test:order-detail'] === 'node --import tsx scripts/order-detail-tests.ts');
assert(packageJson.scripts.test.includes('test:order-detail'));
console.log('Page 17 order detail tests passed.');

