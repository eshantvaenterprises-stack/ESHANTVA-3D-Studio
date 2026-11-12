import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Construction } from 'lucide-react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Footer } from '@/components/layout/Footer';
import { getCustomerLegalPolicies } from '@/data/legalPolicies';
import { LegalPolicyPage } from '@/components/legal/LegalPolicyPage';

const placeholderPaths = ['appointment', 'shipping'];
const legalPaths = getCustomerLegalPolicies().map((policy) => policy.slug);

export const dynamicParams = false;

export function generateStaticParams() {
  return [...placeholderPaths, ...legalPaths].map((path) => ({ path: path.split('/') }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ path: string[] }> },
): Promise<Metadata> {
  const { path } = await params;
  const policy = getCustomerLegalPolicies().find((policy) => policy.slug === path.join('/'));
  if (policy) return { title: policy.title, description: policy.summary, robots: policy.status === 'published' ? { index: true, follow: true } : { index: false, follow: true } };
  const label = path.map((part) => part.replace(/-/g, ' ')).join(' / ');
  return { title: label, robots: { index: false, follow: false } };
}

export default async function PlaceholderPage(
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const policy = getCustomerLegalPolicies().find((policy) => policy.slug === path.join('/'));
  if (policy) return <><SiteHeader /><LegalPolicyPage policy={policy} /><Footer /></>;
  const label = path.map((part) => part.replace(/-/g, ' ')).join(' / ');

  return (
    <>
      <SiteHeader />
      <main className="placeholder-page shell">
        <Construction size={44} strokeWidth={1.4} />
        <span className="section-kicker">PAGE ROUTE READY</span>
        <h1>{label}.</h1>
        <p>This route is connected for development. Its complete content will be built in the relevant page phase.</p>
        <Link className="text-link" href="/"><ArrowLeft size={16} /> Back to Home</Link>
      </main>
      <Footer />
    </>
  );
}
