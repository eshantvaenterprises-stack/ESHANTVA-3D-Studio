import Link from 'next/link';
import { ArrowRight, Box, CheckCircle2, MapPin, PackageCheck, Ruler, Settings2, Truck } from 'lucide-react';
import type { Product } from '@/types/product';
import { siteConfig } from '@/config/site';

export function ProductFacts({ product }: { product: Product }) {
  const facts = [
    product.productType && { label: 'Product type', value: product.productType, icon: Box },
    product.materialOptions.length > 0 && { label: 'Material options', value: product.materialOptions.join(', '), icon: Settings2 },
    { label: 'Customisation', value: product.customisable ? 'Available as configured' : 'Not configured', icon: CheckCircle2 },
    { label: 'Order type', value: product.orderMode === 'request_only' ? 'Reviewed request' : product.madeToOrder ? 'Made to order' : 'Catalog order', icon: PackageCheck },
  ].filter(Boolean) as Array<{ label: string; value: string; icon: typeof Box }>;
  return <section className="pdp-facts shell" aria-label="Key product information">{facts.map((fact) => <div key={fact.label}><fact.icon size={21} /><span><small>{fact.label}</small><strong>{fact.value}</strong></span></div>)}</section>;
}

export function ProductEditorialDetails({ product }: { product: Product }) {
  return (
    <>
      <section className="pdp-editorial shell"><div className="pdp-section-heading"><span className="section-kicker">PRODUCT INFORMATION</span><h2>About This Product</h2></div><div className="pdp-editorial-copy">{(product.longDescription || [product.description]).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}{product.highlights && <ul>{product.highlights.map((highlight) => <li key={highlight}><CheckCircle2 size={17} />{highlight}</li>)}</ul>}</div></section>

      {product.customisable && <section className="pdp-dark-section"><div className="shell pdp-detail-grid"><div><span className="section-kicker">PERSONALISATION</span><h2>Make It Yours</h2><p>Only the options configured for this product are offered. Additional requests require review.</p></div><div className="pdp-option-summary">{(product.productOptions || []).map((option) => <article key={option.id}><span>{String((product.productOptions || []).indexOf(option) + 1).padStart(2, '0')}</span><h3>{option.label}</h3><p>{option.helpText || option.type.replace('_', ' ')}</p></article>)}</div></div><div className="shell change-policy"><strong>Important change policy</strong><p>Changes requested before production begins may be possible. Changes after production has started may involve additional charges; completed items may require reprinting.</p></div></section>}

      <section className="pdp-materials shell"><div className="pdp-section-heading"><span className="section-kicker">CUSTOMER-FACING OPTIONS</span><h2>Material &amp; Finish</h2></div><div className="material-option-grid">{product.materialOptions.map((material) => <article key={material}><Settings2 size={21} /><h3>{material}</h3><p>Development option from this sample record. Replace with approved material description and limitations.</p></article>)}{product.colorOptions.length > 0 && <article><span className="material-color-mark" /><h3>Configured Colours</h3><p>{product.colorOptions.join(', ')}. These are sample options and not confirmed live filament inventory.</p></article>}</div></section>

      {(product.specifications?.length || product.importantNotice) && <section className="pdp-specifications"><div className="shell pdp-spec-grid"><div><span className="section-kicker">TECHNICAL SUMMARY</span><h2>Specifications</h2>{product.importantNotice && <div className="important-notice"><Ruler size={20} /><p>{product.importantNotice}</p></div>}</div>{product.specifications && <dl>{product.specifications.map((specification) => <div key={specification.label}><dt>{specification.label}</dt><dd>{specification.value}</dd></div>)}</dl>}</div></section>}

      {product.threeDPreview && siteConfig.features.product3DPreview && <section className="pdp-preview shell"><span className="section-kicker">OPTIONAL MEDIA</span><h2>Interactive 3D Preview</h2><div className="preview-placeholder"><Box size={42} /><strong>3D Preview unavailable</strong><p>Normal product imagery and ordering remain available.</p></div><p className="preview-warning"><strong>Visual reference only.</strong> Appearance, displayed scale, colors, surface details and certain model features may differ from the final manufactured product. Final production is based on accepted order specifications and source files.</p></section>}

      {product.verificationEligible && <section className="pdp-verification shell"><div><span className="section-kicker">OPTIONAL CHECK</span><h2>Finished Product Verification</h2></div><p>Customer may request photos and/or video of the completed product before dispatch. Additional charges may apply depending on the order; no fixed fee is claimed here.</p></section>}

      <DeliveryAndOrder product={product} />
    </>
  );
}

function DeliveryAndOrder({ product }: { product: Product }) {
  const requestOnly = product.orderMode === 'request_only';
  const steps = requestOnly
    ? ['Submit requirement', 'Review and confirmation', 'Accepted commercial terms', 'Production or preparation', 'Dispatch or pickup']
    : product.customisable || product.madeToOrder
      ? ['Choose options', 'Add to cart', 'Complete payment', 'Configuration confirmation', 'Production or preparation', 'Dispatch or pickup']
      : ['Choose quantity', 'Add to cart', 'Complete payment', 'Preparation', 'Dispatch or pickup'];
  return <section className="pdp-delivery-order"><div className="shell"><div className="delivery-grid"><div className="pdp-section-heading"><span className="section-kicker">FULFILMENT</span><h2>Delivery &amp; Pickup</h2></div><div className="delivery-cards">{siteConfig.panIndiaDelivery && <article><Truck size={22} /><h3>Pan-India Shipping</h3><p>Customer pays applicable shipping charges. A live courier quote is not shown on this page.</p></article>}{siteConfig.localPickup && <article><MapPin size={22} /><h3>Local Pickup</h3><p>No pickup charge when the customer collects the order under the applicable arrangement.</p></article>}<article><PackageCheck size={22} /><h3>Local Delivery / Studio Visit</h3><p>Location-based charges may apply for local delivery. Prior appointment is required for a studio visit.</p></article></div></div><div className="order-workflow"><div><span className="section-kicker">ORDER PROCESS</span><h2>How Ordering Works</h2></div><ol>{steps.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, '0')}</span>{step}</li>)}</ol><div className="payment-policy"><strong>{requestOnly ? 'Payment terms are confirmed with the accepted request.' : 'Full payment required for normal catalog orders.'}</strong><p>Alternative terms may be available for qualifying high-value orders and are confirmed separately. Personalized or made-to-order products may have limited cancellation/refund eligibility once work has begun.</p><Link className="text-link" href="/cancellation-refund">View Cancellation &amp; Refund Policy <ArrowRight size={15} /></Link></div></div></div></section>;
}
