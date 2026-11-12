type CatalogEvent =
  | 'view_shop' | 'search_catalog' | 'filter_catalog' | 'view_product'
  | 'view_item' | 'select_item_option' | 'add_to_cart' | 'view_3d_preview'
  | 'share_product' | 'bulk_enquiry_click' | 'custom_order_click';

type ServiceEvent =
  | 'service_starting_point_click' | 'service_capability_view'
  | 'service_custom_order_click' | 'service_bulk_order_click'
  | 'service_shop_click' | 'service_materials_click';

export function trackCatalogEvent(name: CatalogEvent, details: Record<string, string | number | boolean> = {}) {
  if (process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== 'true' || typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('eshantva:analytics', { detail: { name, ...details } }));
}

export function trackServiceEvent(name: ServiceEvent, details: Record<string, string | number | boolean> = {}) {
  if (process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== 'true' || typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('eshantva:analytics', { detail: { name, ...details } }));
}
