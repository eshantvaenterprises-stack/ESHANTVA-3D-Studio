import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { products } from '../src/data/products';
import { siteConfig } from '../src/config/site';
import {
  CART_STORAGE_KEY,
  addConfiguredProductToCart,
  clearCart,
  getCart,
  getCartCount,
  getCartSubtotalPaise,
  removeCartLine,
  updateCartLineQuantity,
} from '../src/lib/cart';
import { calculateConfiguredProductPrice } from '../src/lib/productPricing';

type Store = Map<string, string>;
const store: Store = new Map();
const listeners = new Map<string, Set<EventListenerOrEventListenerObject>>();
const windowMock = globalThis as unknown as {
  localStorage: Storage;
  addEventListener: (type: string, listener: EventListenerOrEventListenerObject) => void;
  removeEventListener: (type: string, listener: EventListenerOrEventListenerObject) => void;
  dispatchEvent: (event: Event) => boolean;
};
Object.defineProperty(globalThis, 'window', { value: windowMock, configurable: true });
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => store.clear(),
    key: (index: number) => [...store.keys()][index] ?? null,
    get length() { return store.size; },
  } satisfies Storage,
  configurable: true,
});
windowMock.addEventListener = (type, listener) => {
  const set = listeners.get(type) ?? new Set();
  set.add(listener);
  listeners.set(type, set);
};
windowMock.removeEventListener = (type, listener) => {
  listeners.get(type)?.delete(listener);
};
windowMock.dispatchEvent = (event) => {
  listeners.get(event.type)?.forEach((listener) => {
    if (typeof listener === 'function') listener(event);
    else listener.handleEvent(event);
  });
  return true;
};

const originalMode = siteConfig.catalogMode;
clearCart();
const sampleProduct = products.find((candidate) => candidate.isSample) ?? products[0];
assert(sampleProduct, 'A sample product fixture is required.');
addConfiguredProductToCart({ product: sampleProduct, quantity: 1, unitPrice: sampleProduct.price, selectedOptions: [] });
assert.equal(getCart().length, 0, 'Sample catalogue content must never become a cart order line.');

(siteConfig as { catalogMode: 'sample' | 'live' }).catalogMode = 'live';

const source = products.find((product) => product.productOptions?.some((option) => option.type === 'text')) ?? products[0];
assert(source, 'A catalog product fixture is required.');
const product = { ...source, isSample: false, active: true, archived: false, publicAvailability: 'in_stock' as const, orderMode: 'configurable_purchase' as const };
const textOption = product.productOptions?.find((option) => option.type === 'text');
const textSelection = textOption && textOption.type === 'text'
  ? [{ optionId: textOption.id, label: textOption.label, valueLabel: 'Rahul', priceModifier: textOption.priceModifier || 0 }]
  : [];
const alternateSelection = textOption && textOption.type === 'text'
  ? [{ optionId: textOption.id, label: textOption.label, valueLabel: 'Amit', priceModifier: textOption.priceModifier || 0 }]
  : [];

clearCart();
const pricing = calculateConfiguredProductPrice(product, textSelection, 1);
addConfiguredProductToCart({ product, quantity: 1, unitPrice: pricing.unitPrice, selectedOptions: textSelection });
addConfiguredProductToCart({ product, quantity: 1, unitPrice: pricing.unitPrice, selectedOptions: textSelection });
assert.equal(getCart().length, 1, 'Same product/configuration/personalisation must merge.');
assert.equal(getCart()[0].quantity, 2, 'Merged cart line must increase quantity.');

addConfiguredProductToCart({ product, quantity: 1, unitPrice: product.price, selectedOptions: alternateSelection });
assert.equal(getCart().length, textOption ? 2 : 1, 'Different personalisation should stay separate.');
assert.equal(getCartCount(), textOption ? 3 : 3, 'Cart count must include quantities.');

const first = getCart()[0];
updateCartLineQuantity(first.id, 4);
assert.equal(getCart().find((line) => line.id === first.id)?.quantity, Math.min(product.maximumQuantity || 4, 4), 'Quantity updates must persist.');
assert(Number.isInteger(getCart()[0].unitPricePaise), 'Stored money must use integer paise.');
assert(getCartSubtotalPaise() >= getCart()[0].unitPricePaise, 'Subtotal must be computed from integer paise.');

removeCartLine(first.id);
assert(!getCart().some((line) => line.id === first.id), 'Remove must delete one line.');
clearCart();
assert.equal(getCart().length, 0, 'Clear cart must remove all lines.');

store.set(CART_STORAGE_KEY, '{not valid json');
assert.deepEqual(getCart(), [], 'Malformed persistence must recover to an empty cart.');

store.set(CART_STORAGE_KEY, JSON.stringify({ version: 999, lines: [{ dangerous: true }] }));
assert.deepEqual(getCart(), [], 'Unknown cart storage versions must not be trusted.');

const repoRoot = path.resolve(process.cwd());
const cartPage = fs.readFileSync(path.join(repoRoot, 'app/cart/page.tsx'), 'utf8');
const cartClient = fs.readFileSync(path.join(repoRoot, 'src/components/cart/CartPageClient.tsx'), 'utf8');
const productConfigurator = fs.readFileSync(path.join(repoRoot, 'src/components/product/ProductConfigurator.tsx'), 'utf8');
const sitemap = fs.readFileSync(path.join(repoRoot, 'app/sitemap.ts'), 'utf8');
assert(cartPage.includes("robots: { index: false, follow: true }"), 'Cart must be noindex, follow.');
assert(!sitemap.includes("'/cart'"), 'Cart must not be included in sitemap routes.');
assert(cartClient.includes('Proceed to Checkout'), 'Cart must include a checkout action.');
assert(!cartClient.match(/checkout not connected|demo cart|test this cart|frontend pricing is for presentation/i), 'Cart must not leak development-state copy.');
assert(productConfigurator.includes('isProductPurchasable(product)'), 'Product Details must use the shared purchasability guard.');
assert(cartClient.includes('Subtotal') && !cartClient.includes('Grand Total'), 'Cart must use Subtotal without fabricating a grand total.');
assert(!cartClient.match(/GST\s*[:=]|shipping\s*₹|delivery\s*₹/i), 'Cart must not invent GST or shipping charges.');

(siteConfig as { catalogMode: 'sample' | 'live' }).catalogMode = originalMode;
console.log('Page 13 cart tests passed.');
