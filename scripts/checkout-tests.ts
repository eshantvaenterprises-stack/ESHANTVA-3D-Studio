import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { products } from '../src/data/products';
import { siteConfig } from '../src/config/site';
import { checkoutAddressSchema, checkoutContactSchema } from '../src/types/checkout';
import { checkoutConfig, enabledCheckoutDeliveryMethods } from '../src/config/checkout';
import { isProductPurchasable } from '../src/lib/cart';

const root = path.resolve(process.cwd());
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');
const page = read('app/checkout/page.tsx');
const client = read('src/components/checkout/CheckoutPageClient.tsx');
const api = read('src/lib/checkoutApi.ts');
const sitemap = read('app/sitemap.ts');
const migration = read('supabase/migrations/20260924143231_checkout_orders.sql');
const edge = read('supabase/functions/checkout-order-api/index.ts');
const commerce = read('supabase/functions/_shared/checkoutCommerce.ts');
const shipping = read('supabase/functions/_shared/checkoutShipping.ts');
const tax = read('supabase/functions/_shared/checkoutTax.ts');
const payment = read('supabase/functions/_shared/checkoutPayment.ts');

assert(page.includes("retailVisibility.isInternal ? 'Checkout' : 'Checkout unavailable'"), 'Checkout metadata must respect the public/internal retail gate.');
assert(page.includes('robots: { index: false, follow: true }'), 'Checkout must be noindex, follow.');
assert(!sitemap.includes("'/checkout'"), 'Checkout must stay out of the sitemap.');
assert(client.includes('useSyncExternalStore(subscribeToCart, getCart'), 'Checkout must consume the central Cart state.');
assert(client.includes('validateCart(lines)'), 'Checkout must block stale Cart lines.');
assert(client.includes('Your cart is empty.'), 'Checkout needs a safe empty-Cart state.');
assert(client.includes('Review Order') && client.includes('Continue to Secure Payment'), 'Checkout must expose review then payment stages.');
assert(client.includes("status.paid") && client.includes('clearCart()'), 'Cart clearing must be gated by authoritative paid status.');
assert(!client.match(/demo checkout|test checkout|gateway pending|supabase|environment variable|backend unavailable/i), 'Checkout must not leak implementation-state copy.');
assert(api.includes("'review-checkout'") && api.includes("'prepare-checkout'"), 'Checkout API must separate review from order/payment preparation.');

assert.equal(siteConfig.catalogMode, 'sample', 'Page 14 must not switch the catalog to live.');
assert(products.every((product) => product.isSample), 'Current repository products are expected to remain sample records.');
assert(products.every((product) => !isProductPurchasable(product)), 'Sample products must remain non-purchasable.');
assert.deepEqual(enabledCheckoutDeliveryMethods, ['pickup'], 'Only pickup should be enabled by default without configured quote adapters.');
assert.equal(checkoutConfig.deliveryMethods.pickup.enabled, true, 'Pickup must remain enabled.');

assert(checkoutContactSchema.safeParse({ fullName: 'A User', email: 'a@example.com', mobile: '9876543210', companyName: '' }).success, 'Valid contact details should parse.');
assert(!checkoutContactSchema.safeParse({ fullName: '', email: 'invalid', mobile: '1', companyName: '' }).success, 'Invalid contact details must fail.');
assert(checkoutAddressSchema.safeParse({ recipientName: 'A User', mobile: '9876543210', addressLine1: 'Main Road', addressLine2: '', locality: 'Biswanath', city: 'Biswanath', district: 'Biswanath', state: 'Assam', pinCode: '784176', country: 'India' }).success, 'Valid Indian delivery address should parse.');
assert(!checkoutAddressSchema.safeParse({ recipientName: 'A', mobile: '1', addressLine1: '', addressLine2: '', locality: '', city: '', district: '', state: '', pinCode: '000000', country: 'India' }).success, 'Invalid delivery address must fail.');

for (const table of ['commerce_products','orders','order_items','order_addresses','order_events','order_payments','checkout_attempts']) {
  assert(migration.includes(`public.${table}`), `Migration must include ${table}.`);
}
assert(migration.includes('enable row level security') && migration.includes('force row level security'), 'Order tables must use RLS and FORCE RLS.');
assert(migration.includes('revoke all on table') && migration.includes('from anon, authenticated'), 'Direct browser table privileges must be revoked.');
assert(migration.includes('unique (customer_id, idempotency_key)'), 'Order creation must enforce customer idempotency.');
assert(migration.includes('IDEMPOTENCY_KEY_REUSED'), 'RPC must reject idempotency-key reuse with changed payload.');
assert(migration.includes('grant execute on function public.create_checkout_order_server') && migration.includes('to service_role'), 'Trusted order RPC must be service-role only.');
assert(!migration.match(/grant execute[\s\S]{0,180}to (anon|authenticated)/i), 'Order creation RPC must never be executable by browser roles.');

assert(commerce.includes("from('commerce_products')") && commerce.includes('product.is_sample') && commerce.includes('product.purchasable'), 'Server commerce layer must re-resolve products and reject sample/non-purchasable items.');
assert(commerce.includes('configurationSignature') || commerce.includes('configurationSignature'), 'Server commerce layer must validate configuration identity.');
assert(shipping.includes('ShippingQuoteAdapter') && shipping.includes("CHECKOUT_DELIVERY_RATES_JSON"), 'Shipping must be provider-neutral/configured rather than invented.');
assert(!shipping.match(/amountPaise:\s*[1-9][0-9]{2,}/), 'Shipping source must not hardcode a nonzero customer charge.');
assert(tax.includes("product_tax_unresolved") && tax.includes("delivery_tax_unresolved"), 'Tax must fail unresolved rather than invent a rate.');
assert(payment.includes('interface PaymentAdapter') && payment.includes('createPaymentSession') && payment.includes('verifyPayment') && payment.includes('handleWebhook'), 'Payment provider contract must exist.');
assert(payment.includes('return null'), 'No unverified payment provider may be activated.');

assert(edge.includes("from('commerce_products')") || edge.includes("from('commerce_products')"), 'Deployed checkout source contract must use the server catalog.');
assert(edge.includes("CHECKOUT_ALLOWED_ORIGINS") && edge.includes('RATE_LIMIT_SALT'), 'Checkout Edge Function must fail closed on origin/rate-limit configuration.');
assert(edge.includes('CART_REVIEW_REQUIRED') && edge.includes('TAX_UNRESOLVED') && edge.includes('DELIVERY_QUOTE_UNRESOLVED'), 'Edge Function must expose controlled unresolved-state codes.');
assert(edge.includes('CHECKOUT_TEMPORARILY_UNAVAILABLE'), 'Payment start must fail safely while no verified adapter is active.');
assert(!edge.match(/payment_status\s*[:=]\s*['\"]paid['\"]/i), 'Client request path must not forge paid status.');
assert(!edge.match(/is_sample\s*=\s*false.*insert/i), 'Checkout must not seed fake live products.');

console.log('Page 14 checkout tests passed.');
