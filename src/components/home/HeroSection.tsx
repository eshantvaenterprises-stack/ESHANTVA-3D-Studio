import { ArrowRight, Box, Layers3 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '../ui/Button';
import { withBasePath } from '../../config/site';
import { retailVisibility } from '@/config/retailVisibility';

export function HeroSection() {
  return (
    <section className="hero-section">
      <div className="hero-grid shell">
        <div className="hero-copy">
          <p className="eyebrow">CUSTOM 3D PRINTING <span>•</span> PERSONALISED PRODUCTS <span>•</span> SMALL-BATCH ORDERS</p>
          <h1>From Idea to<br /><em>Physical Product.</em></h1>
          <p className="hero-lede">
            {retailVisibility.isInternal ? 'Shop selected 3D-printed products, personalise a design, or send your own requirement.' : 'Submit a custom or larger-quantity requirement, explore current capabilities, or track an existing accepted order.'} Custom requests are reviewed for feasibility before production.
          </p>
          <div className="hero-actions">
            <Button to="/custom-order">Start a Custom Order <ArrowRight size={17} /></Button>
            <Button to={retailVisibility.isInternal ? '/shop' : '/bulk-order'} variant="secondary">{retailVisibility.isInternal ? 'Shop Products' : 'Bulk / Business Requirements'}</Button>
          </div>
          <Link className="text-link" href="/services">Explore Services <ArrowRight size={16} /></Link>
        </div>

        <div className="hero-visual" aria-label="Development illustration of sample 3D-printed products">
          {/* REPLACE WITH ACTUAL ESHANTVA PRODUCT PHOTOGRAPHY BEFORE LAUNCH */}
          <div className="visual-grid" aria-hidden="true" />
          <span className="visual-index">OBJECT STUDY / 001</span>
          <Image src={withBasePath('/images/hero/sample-composition.svg')} alt="Development placeholder composition of 3D-printed objects" fill sizes="(max-width: 900px) 100vw, 55vw" priority />
          <div className="visual-label"><Layers3 size={16} />CUSTOM / MADE TO ORDER</div>
          <div className="visual-chip"><Box size={15} /> PRODUCT PHOTOGRAPHY PLACEHOLDER</div>
        </div>
      </div>
      <div className="hero-ruler shell" aria-hidden="true">
        <span>01</span><i /><span>ESH / HOME</span>
      </div>
    </section>
  );
}
