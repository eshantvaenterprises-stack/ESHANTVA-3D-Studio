import Link from 'next/link';
import { ArrowRight, HelpCircle, PackageSearch } from 'lucide-react';
import { getFaqsByIds, materialsFaqIds } from '@/data/faqs';
import { retailVisibility } from '@/config/retailVisibility';


export function NotSureGuidance() {
  return <section className="mt-unsure"><div className="shell mt-unsure-grid"><HelpCircle size={38} aria-hidden="true" /><div><span className="section-kicker">NOT SURE?</span><h2>Tell us how the product will be used.</h2><p>Describe what matters most—appearance, flexibility, heat exposure, general everyday use or another practical condition.</p></div><Link className="button button-primary" href="/custom-order">Start a Custom Order <ArrowRight size={16} /></Link></div></section>;
}

export function CustomMaterialCTA() {
  return <section className="mt-custom-cta shell"><PackageSearch size={34} aria-hidden="true" /><div><span className="section-kicker">OUTSIDE THE GUIDE</span><h2>Need a different material or option?</h2><p>Submit the requirement for review. A request does not guarantee availability or sourcing.</p></div><div><Link className="button button-primary" href="/custom-order">Start Custom Order <ArrowRight size={16} /></Link>{retailVisibility.isInternal && <Link className="button button-secondary" href="/shop">Browse Products</Link>}</div></section>;
}

export function MaterialsFAQ() {
  const faqs = getFaqsByIds(materialsFaqIds);
  return <section className="mt-faq section" aria-labelledby="materials-faq-heading"><div className="shell mt-faq-grid"><div><span className="section-kicker">MATERIALS FAQ</span><h2 id="materials-faq-heading">Before you choose.</h2><p>Product-specific options take priority over this general guide.</p></div><div>{faqs.map((faq) => <details key={faq.id}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</div></div></section>;
}
