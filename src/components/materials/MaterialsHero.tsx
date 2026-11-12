import Link from 'next/link';
import { ArrowDown, ArrowRight, CircleDotDashed, Palette, Shapes } from 'lucide-react';

export function MaterialsHero() {
  return <section className="mt-hero">
    <nav className="shell mt-breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Materials &amp; Options</span></nav>
    <div className="shell mt-hero-grid">
      <div><span className="section-kicker">MATERIALS &amp; OPTIONS</span><h1>Choose for the result you need.</h1><p>Material and colour options vary by product and requirement. Use this practical guide, or tell us how the product will be used if you are unsure which option fits best.</p><div className="mt-hero-actions"><a className="button button-primary" href="#choose-by-need">Choose by Need <ArrowDown size={16} /></a><Link className="button button-secondary" href="/custom-order">Ask About My Requirement <ArrowRight size={16} /></Link></div></div>
      <aside className="mt-hero-guide" aria-label="Customer material decision path"><span>YOUR NEED</span><Shapes size={30} aria-hidden="true" /><i aria-hidden="true" /><span>PUBLIC GUIDANCE</span><CircleDotDashed size={30} aria-hidden="true" /><i aria-hidden="true" /><span>SUITABLE OPTION</span><Palette size={30} aria-hidden="true" /><small>USE → REVIEW → CHOOSE</small></aside>
    </div>
  </section>;
}
