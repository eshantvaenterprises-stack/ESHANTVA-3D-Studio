import { ArrowRight, Boxes, MapPin, PackageOpen, Palette, Route } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { ServiceLink } from './ServiceLink';
import { retailVisibility } from '@/config/retailVisibility';

export function MaterialsCrossLink() {
  return <section className="sv-materials"><div className="shell sv-materials-grid"><div className="sv-materials-mark"><Palette size={34} aria-hidden="true" /><span>MATERIAL</span><i>+</i><span>REQUIREMENT</span></div><div><span className="section-kicker">MATERIALS &amp; OPTIONS</span><h2>Materials are part of the decision.</h2><p>Available material and colour options depend on the product and requirement. Only approved public options are shown; internal inventory remains private.</p><ServiceLink className="text-link" href="/materials" event="service_materials_click">Explore Materials &amp; Options <ArrowRight size={15} /></ServiceLink></div></div></section>;
}

export function LocalOnlineSection() {
  return <section className="sv-local"><div className="shell sv-local-grid"><div><MapPin size={26} aria-hidden="true" /><span className="section-kicker">BISWANATH · ASSAM · INDIA</span><h2>Local when useful. Online when easier.</h2></div><div><p>ESHANTVA operates from Biswanath, Assam. Customers can submit custom requirements and request bulk orders online{retailVisibility.isInternal ? ', and browse the internal product catalogue' : ''}.</p><ul><li>Online request routes</li><li>{siteConfig.localPickup ? 'Local pickup by applicable arrangement' : 'Local service information on request'}</li><li>Studio visit by prior appointment</li>{siteConfig.panIndiaDelivery && <li>Pan-India shipping according to the applicable order</li>}</ul></div></div></section>;
}

export function ActionSections() {
  return <div className="sv-actions shell">
    <section className="sv-action-card sv-action-custom"><PackageOpen size={28} aria-hidden="true" /><span className="section-kicker">CUSTOM ORDER</span><h2>Have something specific in mind?</h2><p>Send the information you already have and describe the result you need.</p><div><ServiceLink className="button button-primary" href="/custom-order" event="service_custom_order_click">Start a Custom Order <ArrowRight size={16} /></ServiceLink><a className="button button-ghost" href="#feasibility-review">How Custom Orders Work</a></div></section>
    <section className="sv-action-card sv-action-bulk"><Boxes size={28} aria-hidden="true" /><span className="section-kicker">BULK ORDER</span><h2>Need a larger quantity?</h2><p>Request larger quantities of catalog, personalized or accepted custom products.</p><ServiceLink className="button button-secondary" href="/bulk-order" event="service_bulk_order_click">Start a Bulk Enquiry <ArrowRight size={16} /></ServiceLink></section>
  </div>;
}

export function FinalServicesCTA() {
  return <section className="sv-final shell"><div className="sv-final-mark" aria-hidden="true"><span>INPUT</span><Route size={28} /><strong>OUTPUT</strong></div><div><span className="section-kicker">YOUR NEXT STEP</span><h2>You don&apos;t need to start with a finished design.</h2><p>Start with a file, drawing, measurements, reference image or idea.</p></div><div className="sv-final-actions"><ServiceLink className="button button-primary" href="/custom-order" event="service_custom_order_click">Start a Custom Order</ServiceLink>{retailVisibility.isInternal && <ServiceLink className="button button-secondary" href="/shop" event="service_shop_click">Browse Products</ServiceLink>}<ServiceLink className="text-link" href="/bulk-order" event="service_bulk_order_click">Bulk Order <ArrowRight size={14} /></ServiceLink></div></section>;
}
