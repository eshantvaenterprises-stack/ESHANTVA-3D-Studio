import type { StartingPoint } from '@/types/service';
import { retailVisibility } from '@/config/retailVisibility';

const allStartingPoints: StartingPoint[] = [
  {
    id: 'ready-product', index: '01', icon: 'product',
    title: 'I found a product I like.',
    description: 'Browse existing ESHANTVA products and choose the options shown for that product.',
    actionLabel: 'Shop Products', href: '/shop', event: 'service_shop_click',
  },
  {
    id: 'personalise-product', index: '02', icon: 'sparkles',
    title: 'I want to personalise something.',
    description: 'Start with a compatible catalog product and choose its supported name, text, colour, logo or other options.',
    actionLabel: 'Explore Customisable Products', href: '/shop?customisable=true', event: 'service_shop_click',
  },
  {
    id: 'three-d-file', index: '03', icon: 'file',
    title: 'I already have a 3D file.',
    description: 'Submit the digital file together with the result, quantity and intended use you need.',
    actionLabel: 'Submit My File', href: '/custom-order', event: 'service_custom_order_click',
  },
  {
    id: 'drawing-dimensions', index: '04', icon: 'ruler',
    title: 'I have a drawing or dimensions.',
    description: 'Provide the measurements, drawing or dimensional information available for feasibility review.',
    actionLabel: 'Submit Specifications', href: '/custom-order', event: 'service_custom_order_click',
  },
  {
    id: 'photo-reference', index: '05', icon: 'image',
    title: 'I have a photo or reference.',
    description: 'Share visual references and explain the physical result or purpose you need.',
    actionLabel: 'Send a Reference', href: '/custom-order', event: 'service_custom_order_click',
  },
  {
    id: 'idea', index: '06', icon: 'idea',
    title: 'I only have an idea.',
    description: 'Describe what you want to create. We will identify what information may be needed before it can proceed.',
    actionLabel: 'Describe My Idea', href: '/custom-order', event: 'service_custom_order_click',
  },
];

export const startingPoints = allStartingPoints.filter((point) =>
  retailVisibility.isInternal || !['ready-product', 'personalise-product'].includes(point.id),
);
