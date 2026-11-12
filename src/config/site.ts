import { contactConfig } from '@/config/contact';
import { retailVisibility } from '@/config/retailVisibility';

export const siteConfig = {
  brand: 'ESHANTVA 3D Studio',
  shortBrand: 'ESHANTVA',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || null,
  basePath: process.env.NEXT_PUBLIC_BASE_PATH?.replace(/^\/+|\/+$/g, '')
    ? `/${process.env.NEXT_PUBLIC_BASE_PATH!.replace(/^\/+|\/+$/g, '')}`
    : '',
  catalogMode: 'sample' as 'sample' | 'live',
  retailSurface: retailVisibility.surface,
  location: 'Biswanath, Assam, India',
  mapEmbedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d353.2165202166246!2d93.1584330441482!3d26.728898284570498!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x37445fefa0de0e25%3A0x478d7150d4601462!2sESHANTVA%20STRATEGIC%20HUB%20FOR%20ADVANCEMENT(ESHA%20Hub)!5e1!3m2!1sen!2sin!4v1789934332783!5m2!1sen!2sin',
  directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=26.728898284570498%2C93.1584330441482',
  email: contactConfig.publicEmail,
  whatsapp: null,
  domain: null,
  panIndiaDelivery: true,
  localPickup: true,
  features: {
    websiteFeatures: process.env.NEXT_PUBLIC_WEBSITE_FEATURES_ENABLED === 'true',
    whatsApp: false,
    liveInventory: false,
    realPortfolio: process.env.NEXT_PUBLIC_REAL_PORTFOLIO_ENABLED === 'true',
    accountPortal: true,
    onlinePayments: false,
    reviewsEnabled: false,
    productFileUploads: false,
    product3DPreview: false,
    bulkOrder: true,
    services: {
      customPrinting: true,
      personalisation: true,
      designSupport: true,
      prototyping: true,
      functionalParts: true,
      smallBatch: true,
    },
    materials: {
      publicGuideEnabled: true,
      liveAvailabilityEnabled: false,
      colorAvailabilityEnabled: true,
    },
  },
} as const;

export function withBasePath(path: string) {
  if (!path.startsWith('/')) return path;
  return `${siteConfig.basePath}${path}`;
}
