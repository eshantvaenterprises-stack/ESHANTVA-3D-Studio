import { retailVisibility } from '@/config/retailVisibility';

const baseMainNavigation = [
  { label: 'Shop', href: '/shop' },
  { label: 'Custom Order', href: '/custom-order' },
  { label: 'Bulk Order', href: '/bulk-order' },
  { label: 'Services', href: '/services' },
  { label: 'Materials', href: '/materials' },
  { label: 'Our Work', href: '/our-work' },
  { label: 'How It Works', href: '/how-it-works' },
] as const;

export const mainNavigation = baseMainNavigation.filter((item) => retailVisibility.isInternal || item.href !== '/shop');

export const footerNavigation = {
  Start: [
    ...(retailVisibility.isInternal ? [{ label: 'Products', href: '/shop' }] : []),
    { label: 'Custom Order', href: '/custom-order' },
    { label: 'Bulk Order', href: '/bulk-order' },
    { label: 'Materials', href: '/materials' },
  ],
  Studio: [
    { label: 'Services', href: '/services' },
    { label: 'Our Work', href: '/our-work' },
    { label: 'How It Works', href: '/how-it-works' },
    { label: 'About', href: '/about' },
      { label: 'Appointment', href: '/contact/#appointment' },
  ],
  Support: [
    { label: 'FAQ', href: '/faq' },
    { label: 'Policies', href: '/policies' },
    { label: 'Contact', href: '/contact' },
    { label: 'Order Tracking', href: '/track-order' },
  ],
  Legal: [
    { label: 'Terms', href: '/terms' },
    { label: 'Privacy', href: '/privacy' },
    { label: 'Custom Order Policy', href: '/custom-order-policy' },
    { label: 'Grievance & Support', href: '/grievance-support' },
  ],
};
