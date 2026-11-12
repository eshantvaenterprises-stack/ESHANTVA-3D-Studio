import type { Metadata } from 'next';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Footer } from '@/components/layout/Footer';
import { AccountResetClient } from '@/components/account/AccountResetClient';

export const metadata: Metadata = {
  title: 'Reset Password',
  description: 'Set a new password for your ESHANTVA account.',
  robots: { index: false, follow: false },
};

export default function AccountResetPage() {
  return <><SiteHeader /><main className="account-page"><AccountResetClient /></main><Footer /></>;
}
