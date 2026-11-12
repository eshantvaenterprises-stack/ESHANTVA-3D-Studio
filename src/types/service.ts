export type CapabilityStatus =
  | 'available'
  | 'selected_requests'
  | 'review_required'
  | 'case_by_case';

export type ServiceIconName =
  | 'box'
  | 'sparkles'
  | 'pencil'
  | 'prototype'
  | 'wrench'
  | 'batch'
  | 'file'
  | 'ruler'
  | 'image'
  | 'idea'
  | 'product';

export type ServiceCapability = {
  id: string;
  feature: 'customPrinting' | 'personalisation' | 'designSupport' | 'prototyping' | 'functionalParts' | 'smallBatch';
  anchor: string;
  index: string;
  title: string;
  headline: string;
  eyebrow?: string;
  shortDescription: string;
  description: string;
  status: CapabilityStatus;
  icon: ServiceIconName;
  suitableRequests?: string[];
  helpfulInputs?: string[];
  notes?: string[];
  primaryCta: { label: string; href: string; event: ServiceAnalyticsEvent };
  secondaryCta?: { label: string; href: string; event: ServiceAnalyticsEvent };
  image?: string;
  featured?: boolean;
  tags: string[];
};

export type StartingPoint = {
  id: string;
  index: string;
  title: string;
  description: string;
  icon: ServiceIconName;
  actionLabel: string;
  href: string;
  event: ServiceAnalyticsEvent;
};

export type PathToProductStep = {
  step: string;
  title: string;
  description: string;
};

export type ServiceAnalyticsEvent =
  | 'service_starting_point_click'
  | 'service_capability_view'
  | 'service_custom_order_click'
  | 'service_bulk_order_click'
  | 'service_shop_click'
  | 'service_materials_click';
