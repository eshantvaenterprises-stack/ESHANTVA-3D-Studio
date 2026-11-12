import type { MaterialNeed, PublicColorOption, PublicMaterial, PublicMaterialStatus } from '@/types/material';

export const publicMaterialStatusLabels: Record<PublicMaterialStatus, string> = {
  available: 'Available',
  limited: 'Limited',
  on_request: 'On Request',
  unavailable: 'Unavailable',
};

export const publicMaterialStatusDescriptions: Record<PublicMaterialStatus, string> = {
  available: 'The option can currently be requested for applicable products or requirements.',
  limited: 'Availability may change based on current orders.',
  on_request: 'Confirmation is required before production can be accepted.',
  unavailable: 'The option is not currently offered for ordering.',
};

export const materialNeeds: MaterialNeed[] = [
  { id: 'everyday', index: '01', title: 'Everyday Use', description: 'General-purpose, decorative or personalised items used in ordinary conditions.', nextStep: 'Review PLA-based guidance', href: '#pla-based', icon: 'everyday' },
  { id: 'heat', index: '02', title: 'Better Heat Resistance', description: 'Tell us about expected heat exposure so the complete product requirement can be reviewed.', nextStep: 'Review ABS guidance', href: '#abs', icon: 'heat' },
  { id: 'flexibility', index: '03', title: 'Flexibility', description: 'For selected designs that need a softer, bendable or rubber-like response.', nextStep: 'Review Flexible TPU', href: '#flexible-tpu', icon: 'flexibility' },
  { id: 'appearance', index: '04', title: 'Appearance', description: 'When surface character, colour and presentation matter most to the result.', nextStep: 'Start with PLA-based guidance', href: '#pla-based', icon: 'appearance' },
  { id: 'outdoor', index: '05', title: 'Outdoor / Practical Use', description: 'Environment, exposure and intended function need to be explained before choosing.', nextStep: 'Submit the use conditions', href: '/custom-order', icon: 'outdoor' },
  { id: 'unsure', index: '06', title: 'Not Sure Yet', description: 'Share how the product will be used and which qualities matter most.', nextStep: 'Ask through Custom Order', href: '/custom-order', icon: 'unsure' },
];

export const publicMaterials: PublicMaterial[] = [
  {
    id: 'pla-based', name: 'PLA-Based Material',
    shortDescription: 'A practical starting point for many general-purpose, decorative and personalised products.',
    bestFor: ['Many everyday items', 'Decorative products', 'Personalised objects', 'Display-focused pieces'],
    considerations: ['Not the preferred starting point for higher-temperature environments', 'Suitability still depends on the product design and use'],
    flexibility: 'Low', heatSuitability: 'Standard use', typicalUse: 'Everyday, decorative and personalised products',
    enabled: true, tags: ['everyday', 'decorative', 'personalised', 'appearance'],
  },
  {
    id: 'abs', name: 'ABS',
    shortDescription: 'A possible option for selected practical requirements where the use environment needs closer review.',
    bestFor: ['Selected practical products', 'Requirements involving greater heat exposure', 'Application-specific custom requests'],
    considerations: ['Not offered automatically for every product', 'Geometry, environment and intended use require confirmation'],
    flexibility: 'Low', heatSuitability: 'Selected higher-heat use', typicalUse: 'Selected reviewed requirements',
    enabled: true, tags: ['practical', 'heat', 'review', 'custom'],
  },
  {
    id: 'flexible-tpu', name: 'Flexible TPU',
    shortDescription: 'For selected products that need flexibility or a softer, rubber-like response.',
    bestFor: ['Flexible components', 'Selected protective or grip-oriented forms', 'Designs intended to bend or compress'],
    considerations: ['Suitability depends strongly on geometry', 'The required behaviour and intended use must be explained'],
    flexibility: 'Flexible', heatSuitability: 'Requirement dependent', typicalUse: 'Selected flexible products',
    enabled: true, tags: ['flexible', 'soft', 'rubber-like', 'bendable'],
  },
];

// Development-only appearance examples. Replace with intentionally published colour records before launch.
export const publicColorOptions: PublicColorOption[] = [
  { id: 'example-light', name: 'Light Neutral', swatch: '#dedbd2', enabled: true, developmentPlaceholder: true },
  { id: 'example-dark', name: 'Dark Neutral', swatch: '#292c2a', enabled: true, developmentPlaceholder: true },
  { id: 'example-accent', name: 'Accent Colour', swatch: '#e85823', enabled: true, developmentPlaceholder: true },
];

export const enabledPublicMaterials = publicMaterials.filter((material) => material.enabled);
export const enabledPublicColors = publicColorOptions.filter((color) => color.enabled);
