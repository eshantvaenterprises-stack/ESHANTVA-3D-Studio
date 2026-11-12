import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ArrowDown, FileCheck2, MapPin, ShieldCheck } from 'lucide-react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Footer } from '@/components/layout/Footer';
import { CustomOrderWizard } from '@/components/custom-order/CustomOrderWizard';

export const metadata: Metadata = {
  title: 'Custom 3D Printing Request',
  description: 'Share a 3D file, drawing, dimensions, image or idea with ESHANTVA 3D Studio for individual feasibility and pricing review.',
  alternates: { canonical: '/custom-order/' },
};

export default function CustomOrderPage() {
  return <>
    <SiteHeader />
    <main>
      <section className="co-hero">
        <div className="shell co-hero-inner">
          <div><span className="section-kicker">CUSTOM ORDER</span><h1>Tell us what you want to make.</h1><p>Share a file, drawing, dimensions, image, reference or simply describe your idea. Every request is reviewed individually before feasibility, pricing or production is confirmed.</p></div>
          <div className="co-hero-aside"><span><FileCheck2 size={19} /><strong>Structured request</strong></span><span><ShieldCheck size={19} /><strong>Private file handling</strong></span><span><MapPin size={19} /><strong>Biswanath · Pan-India service</strong></span><a href="#request-form">Start request <ArrowDown size={15} /></a></div>
        </div>
        <div className="shell co-chips"><span>3D files</span><span>Drawings</span><span>Dimensions</span><span>Images / references</span><span>Functional parts</span></div>
      </section>
      <section id="request-form" className="co-wizard-section"><Suspense fallback={<div className="shell co-form-loading">Preparing the secure request form…</div>}><CustomOrderWizard /></Suspense></section>
    </main>
    <Footer />
  </>;
}
