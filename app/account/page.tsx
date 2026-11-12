import type { Metadata } from 'next';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Footer } from '@/components/layout/Footer';
import { AccountAccessClient } from '@/components/account/AccountAccessClient';

export const metadata: Metadata = {
  title: 'Account Access',
  description: 'Sign in, create an ESHANTVA account, or recover account access.',
  robots: { index: false, follow: true },
};

export default function AccountPage() {
  return <><SiteHeader /><main className="account-page"><AccountAccessClient /></main><Footer /></>;
}
