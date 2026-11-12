import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Box, FileText, Ruler } from 'lucide-react';
import { ServiceLink } from './ServiceLink';
import { retailVisibility } from '@/config/retailVisibility';

export function ServicesHero() {
  return (
    <section className="sv-hero">
      <nav className="shell sv-breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Services</span></nav>
      <div className="shell sv-hero-grid">
        <div className="sv-hero-copy">
          <span className="section-kicker">SERVICES &amp; CAPABILITIES</span>
          <h1>Start with what you have.<em>We&apos;ll identify the next practical step.</em></h1>
          <p>Bring a product, 3D file, drawing, measurements, reference image or simply an idea. ESHANTVA connects it to the most suitable product, custom or small-batch route—subject to the requirement and feasibility.</p>
          <div className="sv-hero-actions">
            <ServiceLink className="button button-primary" href="/custom-order" event="service_custom_order_click">Start a Custom Order <ArrowRight size={16} /></ServiceLink>
            {retailVisibility.isInternal && <ServiceLink className="button button-secondary" href="/shop" event="service_shop_click">Browse Products</ServiceLink>}
          </div>
          <ServiceLink className="text-link" href="/bulk-order" event="service_bulk_order_click">Need larger quantities? Bulk Order <ArrowRight size={15} /></ServiceLink>
        </div>
        <div className="sv-hero-visual" aria-label="Development composition showing different customer starting points and physical outcomes">
          {/* REPLACE WITH ACTUAL ESHANTVA PRODUCT PHOTOGRAPHY BEFORE PUBLIC LAUNCH */}
          <div className="sv-visual-stage">
            {retailVisibility.isInternal ? <><Image className="sv-visual-product sv-visual-product-main" src="/images/products/sample-nameplate.svg" alt="Development-only sample personalized desk object illustration" width={700} height={520} priority /><Image className="sv-visual-product sv-visual-product-small" src="/images/products/sample-bracket.svg" alt="Development-only sample functional component illustration" width={360} height={280} priority /></> : <div className="sv-visual-public"><FileText size={54} /><span>FILE · DRAWING · IDEA</span></div>}
          </div>
          <div className="sv-input-chip sv-input-chip-file"><FileText size={15} /> 3D FILE</div>
          <div className="sv-input-chip sv-input-chip-measure"><Ruler size={15} /> DIMENSIONS</div>
          <div className="sv-output-chip"><Box size={16} /><span>INPUT → PATH → <strong>PHYSICAL RESULT</strong></span></div>
          <small>DEVELOPMENT VISUAL · NOT CUSTOMER WORK</small>
        </div>
      </div>
    </section>
  );
}
