import { z } from './zodCsp';
import type { Product, ProductOption, SelectedProductOption } from '@/types/product';
import { createConfigurationSignature, calculateConfiguredProductPrice } from '@/lib/productPricing';
import { getProductBySlug } from '@/repositories/productRepository';
import { siteConfig } from '@/config/site';

export const CART_STORAGE_KEY = 'eshantva-cart-v3';
export const CART_STORAGE_VERSION = 3 as const;

const selectedOptionSchema = z.object({
  optionId: z.string().min(1).max(120),
  label: z.string().min(1).max(160),
  valueId: z.string().max(160).optional(),
  valueLabel: z.string().min(1).max(500),
  priceModifier: z.number().finite().min(0),
});

const cartLineSchema = z.object({
  id: z.string().min(1).max(800),
  configurationSignature: z.string().min(1).max(4000),
  productId: z.string().min(1).max(160),
  slug: z.string().min(1).max(180),
  name: z.string().min(1).max(240),
  image: z.string().min(1).max(1200),
  quantity: z.number().int().min(1).max(100000),
  unitPricePaise: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  selectedOptions: z.array(selectedOptionSchema).max(30),
  addedAt: z.string().datetime(),
});

const cartStorageSchema = z.object({
  version: z.literal(CART_STORAGE_VERSION),
  lines: z.array(cartLineSchema).max(200),
});

const legacyCartLineSchema = z.object({
  id: z.string().min(1),
  configurationSignature: z.string().min(1),
  productId: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  image: z.string().min(1),
  quantity: z.number().int().min(1),
  unitPrice: z.number().finite().min(0),
  selectedOptions: z.array(selectedOptionSchema),
});

export type CartLine = z.infer<typeof cartLineSchema>;
export type AddCartInput = {
  product: Product;
  quantity: number;
  unitPrice: number;
  selectedOptions: SelectedProductOption[];
};

export type CartLineReview = {
  line: CartLine;
  product: Product | null;
  needsReview: boolean;
  reasons: string[];
  currentUnitPricePaise: number | null;
};

let cachedRaw: string | null = null;
let cachedLines: CartLine[] = [];

function safeNow() {
  return new Date().toISOString();
}

function createLineId(signature: string) {
  const nonce = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${signature}:${nonce}`;
}

export function rupeesToPaise(value: number) {
  return Math.round(value * 100);
}

export function paiseToRupees(value: number) {
  return value / 100;
}

function migrateLegacy(value: unknown): CartLine[] | null {
  const parsed = z.array(legacyCartLineSchema).safeParse(value);
  if (!parsed.success) return null;
  return parsed.data.slice(0, 200).map((line) => ({
    id: line.id,
    configurationSignature: line.configurationSignature,
    productId: line.productId,
    slug: line.slug,
    name: line.name,
    image: line.image,
    quantity: line.quantity,
    unitPricePaise: rupeesToPaise(line.unitPrice),
    selectedOptions: line.selectedOptions,
    addedAt: safeNow(),
  }));
}

function decodeCart(raw: string): CartLine[] {
  try {
    const decoded: unknown = JSON.parse(raw);
    const current = cartStorageSchema.safeParse(decoded);
    if (current.success) return current.data.lines;
    const legacy = migrateLegacy(decoded);
    if (legacy) return legacy;
  } catch {
    // Corrupt browser storage is treated as an empty cart, never as fatal state.
  }
  return [];
}

export function getCart(): CartLine[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(CART_STORAGE_KEY) || localStorage.getItem('eshantva-cart-v2') || '';
  if (raw === cachedRaw) return cachedLines;
  const lines = raw ? decodeCart(raw) : [];
  cachedRaw = raw;
  cachedLines = lines;
  return cachedLines;
}

function saveCart(lines: CartLine[]) {
  if (typeof window === 'undefined') return lines;
  const safeLines = z.array(cartLineSchema).max(200).parse(lines);
  const payload = JSON.stringify({ version: CART_STORAGE_VERSION, lines: safeLines });
  localStorage.setItem(CART_STORAGE_KEY, payload);
  localStorage.removeItem('eshantva-cart-v2');
  cachedRaw = payload;
  cachedLines = safeLines;
  window.dispatchEvent(new CustomEvent('eshantva:cart-changed'));
  return safeLines;
}

export function isProductPurchasable(product: Product) {
  return siteConfig.catalogMode === 'live' && !product.isSample && product.active && !product.archived &&
    product.orderMode !== 'request_only' && product.publicAvailability !== 'out_of_stock';
}

export function addConfiguredProductToCart({ product, quantity, unitPrice, selectedOptions }: AddCartInput) {
  if (!isProductPurchasable(product)) return getCart();
  const minimum = product.minimumQuantity || 1;
  const maximum = product.maximumQuantity;
  const safeQuantity = Math.max(minimum, Math.floor(quantity));
  const boundedQuantity = maximum ? Math.min(maximum, safeQuantity) : safeQuantity;
  const configurationSignature = createConfigurationSignature(product.id, selectedOptions);
  const lines = [...getCart()];
  const currentIndex = lines.findIndex((line) => line.configurationSignature === configurationSignature);

  if (currentIndex >= 0) {
    const current = lines[currentIndex];
    const nextQuantity = current.quantity + boundedQuantity;
    lines[currentIndex] = {
      ...current,
      quantity: maximum ? Math.min(maximum, nextQuantity) : nextQuantity,
    };
  } else {
    lines.push({
      id: createLineId(configurationSignature),
      configurationSignature,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.thumbnail,
      quantity: boundedQuantity,
      unitPricePaise: rupeesToPaise(unitPrice),
      selectedOptions: selectedOptions.map((option) => ({ ...option })),
      addedAt: safeNow(),
    });
  }
  return saveCart(lines);
}

export function addProductToCart(product: Product) {
  return addConfiguredProductToCart({ product, quantity: 1, unitPrice: product.price, selectedOptions: [] });
}

export function updateCartLineQuantity(id: string, quantity: number) {
  const lines = [...getCart()];
  const index = lines.findIndex((line) => line.id === id);
  if (index < 0) return lines;
  const product = getProductBySlug(lines[index].slug);
  const minimum = product?.minimumQuantity || 1;
  const maximum = product?.maximumQuantity;
  const normalized = Math.max(minimum, Math.floor(Number.isFinite(quantity) ? quantity : minimum));
  lines[index] = { ...lines[index], quantity: maximum ? Math.min(maximum, normalized) : normalized };
  return saveCart(lines);
}

export function removeCartLine(id: string) {
  return saveCart(getCart().filter((line) => line.id !== id));
}

export function clearCart() {
  return saveCart([]);
}

export function getCartCount() {
  return getCart().reduce((total, line) => total + line.quantity, 0);
}

export function getCartSubtotalPaise(lines = getCart()) {
  return lines.reduce((total, line) => total + line.unitPricePaise * line.quantity, 0);
}

function findOption(product: Product, id: string): ProductOption | undefined {
  return (product.productOptions || []).find((option) => option.id === id);
}

function validateSelectedOptions(product: Product, selectedOptions: SelectedProductOption[]) {
  const reasons: string[] = [];
  const currentSelections: SelectedProductOption[] = [];
  const selectedMap = new Map(selectedOptions.map((option) => [option.optionId, option]));

  for (const selected of selectedOptions) {
    const option = findOption(product, selected.optionId);
    if (!option) {
      reasons.push(`The option “${selected.label}” is no longer available.`);
      continue;
    }
    if (option.type === 'file') {
      reasons.push(`The option “${option.label}” must be reviewed on the product page.`);
      continue;
    }
    if (option.type === 'text') {
      const value = selected.valueLabel.trim();
      if ((option.minLength && value.length < option.minLength) || value.length > option.maxLength) {
        reasons.push(`The personalisation for “${option.label}” needs review.`);
        continue;
      }
      currentSelections.push({ optionId: option.id, label: option.label, valueLabel: value, priceModifier: option.priceModifier || 0 });
      continue;
    }
    if (option.type === 'boolean') {
      if (selected.valueId !== 'yes') {
        reasons.push(`The selection for “${option.label}” needs review.`);
        continue;
      }
      currentSelections.push({ optionId: option.id, label: option.label, valueId: 'yes', valueLabel: 'Yes', priceModifier: option.priceModifier || 0 });
      continue;
    }
    const value = option.values.find((candidate) => candidate.id === selected.valueId && !candidate.unavailable);
    if (!value) {
      reasons.push(`The selected ${option.label.toLowerCase()} is no longer available.`);
      continue;
    }
    currentSelections.push({ optionId: option.id, label: option.label, valueId: value.id, valueLabel: value.label, priceModifier: value.priceModifier || 0 });
  }

  for (const option of product.productOptions || []) {
    if (!option.required || option.type === 'file') continue;
    const selected = selectedMap.get(option.id);
    const validBoolean = option.type === 'boolean' ? selected?.valueId === 'yes' : Boolean(selected?.valueLabel.trim());
    if (!validBoolean) reasons.push(`Required option “${option.label}” needs review.`);
  }

  return { reasons, currentSelections };
}

export function validateCartLine(line: CartLine): CartLineReview {
  const reasons: string[] = [];
  const product = getProductBySlug(line.slug) || null;
  if (!product || product.id !== line.productId) {
    return { line, product, needsReview: true, reasons: ['This product is no longer available in the current catalogue.'], currentUnitPricePaise: null };
  }
  if (!isProductPurchasable(product)) reasons.push('This item is not currently available for checkout.');
  if (line.quantity < (product.minimumQuantity || 1)) reasons.push('The selected quantity is below the current minimum.');
  if (product.maximumQuantity && line.quantity > product.maximumQuantity) reasons.push('The selected quantity is above the current maximum.');

  const optionValidation = validateSelectedOptions(product, line.selectedOptions);
  reasons.push(...optionValidation.reasons);
  const pricing = calculateConfiguredProductPrice(product, optionValidation.currentSelections, 1);
  const currentUnitPricePaise = rupeesToPaise(pricing.unitPrice);
  if (currentUnitPricePaise !== line.unitPricePaise) reasons.push('The current product price has changed since this item was added.');
  const currentSignature = createConfigurationSignature(product.id, optionValidation.currentSelections);
  if (currentSignature !== line.configurationSignature) reasons.push('The saved configuration needs to be reviewed.');

  return { line, product, needsReview: reasons.length > 0, reasons: [...new Set(reasons)], currentUnitPricePaise };
}

export function validateCart(lines = getCart()) {
  return lines.map(validateCartLine);
}

export function subscribeToCart(onChange: () => void) {
  if (typeof window === 'undefined') return () => undefined;
  const local = () => onChange();
  const storage = (event: StorageEvent) => {
    if (!event.key || event.key === CART_STORAGE_KEY || event.key === 'eshantva-cart-v2') {
      cachedRaw = null;
      onChange();
    }
  };
  window.addEventListener('eshantva:cart-changed', local);
  window.addEventListener('storage', storage);
  return () => {
    window.removeEventListener('eshantva:cart-changed', local);
    window.removeEventListener('storage', storage);
  };
}
