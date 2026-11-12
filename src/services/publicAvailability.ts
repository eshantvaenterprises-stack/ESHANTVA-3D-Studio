import type { Product, PublicAvailability } from '@/types/product';

export const availabilityLabels: Record<PublicAvailability, string> = {
  in_stock: 'In Stock',
  limited: 'Limited',
  made_to_order: 'Made to Order',
  on_request: 'On Request',
  out_of_stock: 'Out of Stock',
};

export function availabilityLabel(value: PublicAvailability) {
  return availabilityLabels[value];
}

export function getPublicProductAvailability(product: Product) {
  return {
    status: product.publicAvailability,
    label: availabilityLabel(product.publicAvailability),
    availableForOrdering: product.orderMode !== 'request_only' && product.publicAvailability !== 'out_of_stock',
    customerMessage: product.publicAvailability === 'made_to_order' ? 'Prepared after an accepted order.' : undefined,
  } as const;
}
