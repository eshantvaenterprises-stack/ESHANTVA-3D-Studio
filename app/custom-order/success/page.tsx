import type { Metadata } from 'next';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Footer } from '@/components/layout/Footer';
import { CustomOrderSuccess } from '@/components/custom-order/CustomOrderSuccess';

export const metadata: Metadata = {
  title: 'Custom Request Received',
  robots: { index: false, follow: false },
};

export default function CustomOrderSuccessPage() {
  return <><SiteHeader /><CustomOrderSuccess /><Footer /></>;
}

