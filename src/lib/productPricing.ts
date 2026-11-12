import type { Product, SelectedProductOption } from '@/types/product';

export type PricingBreakdown = {
  baseUnitPrice: number;
  modifiers: Array<{ label: string; amount: number }>;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export function calculateConfiguredProductPrice(product: Product, selectedOptions: SelectedProductOption[], quantity: number): PricingBreakdown {
  const safeQuantity = Number.isInteger(quantity) && quantity > 0 ? quantity : 1;
  const modifiers = selectedOptions.filter((option) => option.priceModifier !== 0).map((option) => ({ label: option.label, amount: option.priceModifier }));
  const unitPrice = product.price + modifiers.reduce((total, modifier) => total + modifier.amount, 0);
  return { baseUnitPrice: product.price, modifiers, unitPrice, quantity: safeQuantity, lineTotal: unitPrice * safeQuantity };
}

export function createConfigurationSignature(productId: string, selectedOptions: SelectedProductOption[]) {
  const normalized = selectedOptions
    .map((option) => ({ optionId: option.optionId, valueId: option.valueId || '', valueLabel: option.valueLabel.trim() }))
    .sort((a, b) => a.optionId.localeCompare(b.optionId));
  return `${productId}:${JSON.stringify(normalized)}`;
}
