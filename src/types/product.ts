export type PublicAvailability =
  | 'in_stock'
  | 'limited'
  | 'made_to_order'
  | 'on_request'
  | 'out_of_stock';

export type OrderMode = 'direct_purchase' | 'configurable_purchase' | 'request_only';

export type ProductImage = { src: string; alt: string };

export type ProductMedia =
  | { type: 'image'; src: string; alt: string }
  | { type: 'video'; src: string; poster?: string; label: string }
  | { type: 'model'; src: string; poster?: string; label: string };

export type ProductOptionValue = {
  id: string;
  label: string;
  description?: string;
  priceModifier?: number;
  colorHex?: string;
  unavailable?: boolean;
};

type ProductOptionBase = { id: string; label: string; required?: boolean; helpText?: string };

export type ProductOption =
  | (ProductOptionBase & { type: 'text'; minLength?: number; maxLength: number; priceModifier?: number; placeholder?: string })
  | (ProductOptionBase & { type: 'select' | 'color' | 'material' | 'size'; values: ProductOptionValue[] })
  | (ProductOptionBase & { type: 'boolean'; priceModifier?: number; description?: string })
  | (ProductOptionBase & { type: 'file'; acceptedTypes: string[]; maxSizeMB: number; backendEnabled: boolean });

export type ProductSpecification = { label: string; value: string };
export type ThreeDPreview = { modelSrc: string; poster?: string; alt: string };

export type Product = {
  id: string;
  slug: string;
  sku: string;
  name: string;
  shortDescription: string;
  description: string;
  longDescription?: string[];
  highlights?: string[];
  category: string;
  subcategory?: string;
  productType?: string;
  tags: string[];
  images: ProductImage[];
  media?: ProductMedia[];
  thumbnail: string;
  price: number;
  compareAtPrice?: number;
  currency: 'INR';
  customisable: boolean;
  madeToOrder: boolean;
  orderMode: OrderMode;
  stockStatus: PublicAvailability;
  publicAvailability: PublicAvailability;
  materialOptions: string[];
  colorOptions: string[];
  sizeOptions?: string[];
  productOptions?: ProductOption[];
  specifications?: ProductSpecification[];
  importantNotice?: string;
  careInstructions?: string[];
  verificationEligible?: boolean;
  threeDPreview?: ThreeDPreview;
  relatedProductIds?: string[];
  minimumQuantity?: number;
  maximumQuantity?: number;
  bulkThreshold?: number;
  featured: boolean;
  active: boolean;
  archived?: boolean;
  newProduct: boolean;
  estimatedDispatchText?: string;
  seoTitle?: string;
  seoDescription?: string;
  createdAt: string;
  updatedAt: string;
  isSample: boolean;
};

export type SelectedProductOption = {
  optionId: string;
  label: string;
  valueId?: string;
  valueLabel: string;
  priceModifier: number;
};
