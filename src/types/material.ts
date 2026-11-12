export type PublicMaterialStatus =
  | 'available'
  | 'limited'
  | 'on_request'
  | 'unavailable';

export type PublicColorOption = {
  id: string;
  name: string;
  swatch: string;
  publicStatus?: PublicMaterialStatus;
  enabled: boolean;
  developmentPlaceholder?: boolean;
};

export type PublicMaterial = {
  id: string;
  name: string;
  shortDescription: string;
  bestFor: string[];
  considerations: string[];
  flexibility: string;
  heatSuitability: string;
  typicalUse: string;
  publicStatus?: PublicMaterialStatus;
  colorOptions?: PublicColorOption[];
  enabled: boolean;
  tags: string[];
};

export type MaterialNeed = {
  id: string;
  index: string;
  title: string;
  description: string;
  nextStep: string;
  href: string;
  icon: 'everyday' | 'heat' | 'flexibility' | 'appearance' | 'outdoor' | 'unsure';
};

export type SanitizedPublicAvailability = {
  status: PublicMaterialStatus | null;
  customerMessage: string;
};
