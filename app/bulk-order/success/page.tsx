import type { Metadata } from 'next';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Footer } from '@/components/layout/Footer';
import { BulkOrderSuccess } from '@/components/bulk-order/BulkOrderSuccess';

export const metadata: Metadata = { title: 'Bulk Enquiry Received', robots: { index: false, follow: false } };
export default function BulkOrderSuccessPage() { return <><SiteHeader /><BulkOrderSuccess /><Footer /></>; }

