export type ProjectCategory =
  | 'Personalised'
  | 'Home & Utility'
  | 'Functional'
  | 'Prototype'
  | 'Display / Model'
  | 'Small Batch'
  | 'Other';

export type StartingPointType =
  | 'Existing Product'
  | '3D File'
  | 'Drawing'
  | 'Dimensions'
  | 'Reference Image'
  | 'Idea'
  | 'Repeat Requirement';

export type PublicMaterialLabel = 'PLA-Based Material' | 'Flexible Material' | 'ABS' | 'Other';
export type PublicQuantityLabel = 'Single Item' | 'Small Batch' | 'Bulk';

export type ProjectMedia =
  | {
      type: 'image';
      src: string;
      alt: string;
    }
  | {
      type: 'video';
      src: string;
      poster?: string;
      posterAlt?: string;
    };

export type PublicProject = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  category: ProjectCategory;
  serviceType?: string;
  startingPoint?: StartingPointType;
  requirementSummary?: string;
  resultSummary?: string;
  materialLabel?: PublicMaterialLabel;
  quantityLabel?: PublicQuantityLabel;
  media: ProjectMedia[];
  tags?: string[];
  featured?: boolean;
  published: boolean;
  publishDate?: string;
  customerApprovedForPublication: boolean;
  requestRoute?: 'custom-order' | 'bulk-order';
  relatedProductSlug?: string;
  isDevelopmentPlaceholder?: boolean;
};
