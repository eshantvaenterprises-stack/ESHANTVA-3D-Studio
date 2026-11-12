import type { Metadata } from 'next';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Footer } from '@/components/layout/Footer';
import { CustomerOrderFilesClient } from '@/components/customer-files/CustomerOrderFilesClient';

export const metadata: Metadata = {
  title: 'Files & Approvals | ESHANTVA 3D Studio',
  description: 'Secure customer files, approvals and verification media for an ESHANTVA order.',
  robots: { index:false, follow:false },
};

export default function CustomerOrderFilesShellPage() {
  return <><SiteHeader /><main className="customer-files-page"><CustomerOrderFilesClient /></main><Footer /></>;
}
