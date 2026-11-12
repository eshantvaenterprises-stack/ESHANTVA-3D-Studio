import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, LockKeyhole } from 'lucide-react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = { title: 'Track Order', description: 'Use your verified ESHANTVA account to access eligible order information.', robots: { index: false, follow: true } };

export default function TrackOrderPage() {
  return <><SiteHeader /><main className="track-page shell"><LockKeyhole size={42} /><span className="section-kicker">PRIVATE ORDER ACCESS</span><h1>Track through your verified account.</h1><p>Order references are not treated as authorization. Sign in to view information that the server confirms belongs to your account.</p><Link className="button button-primary" href="/account">Open Account <ArrowRight size={16} /></Link></main><Footer /></>;
}
