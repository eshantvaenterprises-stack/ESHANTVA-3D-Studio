import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Scale } from 'lucide-react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Footer } from '@/components/layout/Footer';
import { getCustomerLegalPolicies } from '@/data/legalPolicies';

export const metadata: Metadata = { title: 'Policies', description: 'ESHANTVA policy foundation and current publication status.', robots: { index: false, follow: true } };

export default function PoliciesPage() {
  return <><SiteHeader /><main className="policies-page shell"><header><Scale size={38} /><span className="section-kicker">POLICY CENTRE</span><h1>Policies, with controlled publication.</h1><p>These policy routes provide one versioned foundation. Drafts remain clearly marked and noindex until the owner and legal review decisions are complete.</p></header><div className="policy-grid">{getCustomerLegalPolicies().map((policy) => <Link key={policy.slug} href={`/${policy.slug}`}><span>{policy.status === 'published' ? 'Published' : 'Review required'}</span><strong>{policy.title}</strong><small>Version {policy.version}</small><ArrowRight size={16} /></Link>)}</div></main><Footer /></>;
}
