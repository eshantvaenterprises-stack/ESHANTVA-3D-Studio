export type FaqCategory =
  | 'shop-products'
  | 'custom-orders'
  | 'bulk-orders'
  | 'materials-options'
  | 'pricing-payment'
  | 'delivery-pickup'
  | 'process-changes'
  | 'business-support';

export type FaqItem = {
  id: string;
  category: FaqCategory;
  question: string;
  answer: string;
  keywords?: string[];
  featured?: boolean;
  enabled?: boolean;
};

export type FaqCategoryDefinition = {
  id: FaqCategory;
  label: string;
  shortLabel: string;
  description: string;
};
