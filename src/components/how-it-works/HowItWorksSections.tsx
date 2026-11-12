import Link from 'next/link';
import {
  ArrowDown,
  ArrowRight,
  Boxes,
  CheckCircle2,
  CircleHelp,
  ClipboardCheck,
  CreditCard,
  FileCheck2,
  MapPin,
  PackageCheck,
  PencilRuler,
  RefreshCw,
  Route,
  ShieldCheck,
  ShoppingBag,
  Truck,
  UserRoundCheck,
  Video,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { customOrderConfig, statusLabels } from '@/config/customOrder';
import { bulkOrderConfig, bulkStatusLabels } from '@/config/bulkOrder';
import { siteConfig } from '@/config/site';
import { customerPaths, routeDecisions } from '@/data/howItWorks';
import { getFaqsByIds, howItWorksFaqIds } from '@/data/faqs';
import { pathToProduct } from '@/data/pathToProduct';
import type { CustomerPath, CustomerPathId } from '@/types/howItWorks';
import { retailVisibility } from '@/config/retailVisibility';

const pathIcons = {
  shoppingBag: ShoppingBag,
  pencilRuler: PencilRuler,
  boxes: Boxes,
} as const;

const customStatusSummary = [
  statusLabels.SUBMITTED,
  statusLabels.UNDER_REVIEW,
  statusLabels.NEEDS_INFORMATION,
  statusLabels.QUOTED,
  statusLabels.ACCEPTED,
  statusLabels.CONVERTED_TO_ORDER,
];

const bulkStatusSummary = [
  bulkStatusLabels.SUBMITTED,
  bulkStatusLabels.UNDER_REVIEW,
  bulkStatusLabels.MORE_INFORMATION_REQUIRED,
  bulkStatusLabels.QUOTATION_SENT,
  bulkStatusLabels.AWAITING_CUSTOMER_APPROVAL,
  bulkStatusLabels.ACCEPTED,
  bulkStatusLabels.CONVERTED_TO_ORDER,
];

export function HowItWorksHero() {
  return (
    <section className="hiw-hero">
      <div className="shell hiw-hero-grid">
        <div>
          <span className="section-kicker">HOW IT WORKS</span>
          <h1>A clear path from request to physical result.</h1>
          <p>{retailVisibility.isInternal ? 'Whether you start with a Shop product, a custom requirement or a larger-quantity request' : 'Whether you start with a custom requirement or a larger-quantity request'}, ESHANTVA guides it through the appropriate review, confirmation, production and delivery stages.</p>
          <div className="hiw-hero-actions">
            <a className="button button-primary" href="#starting-paths">Choose Your Starting Point <ArrowDown size={16} /></a>
            {retailVisibility.isInternal && <Button to="/shop" variant="secondary">Browse Products</Button>}
          </div>
          <Link className="text-link" href="/custom-order">Start a Custom Order <ArrowRight size={15} /></Link>
        </div>
        <div className="hiw-hero-map" aria-label="Three ESHANTVA customer paths converge on confirmation, production and delivery">
          <span className="hiw-map-label">YOUR PATH THROUGH ESHANTVA</span>
          <div className="hiw-map-starts">
            <span><ShoppingBag size={18} /> PRODUCT</span>
            <span><PencilRuler size={18} /> CUSTOM</span>
            <span><Boxes size={18} /> BULK</span>
          </div>
          <div className="hiw-map-connector" aria-hidden="true"><i /><b>REVIEW / CONFIRM</b><i /></div>
          <div className="hiw-map-result"><PackageCheck size={30} /><span>ACCEPTED ORDER</span><strong>PRODUCE → DELIVER</strong></div>
          <small>Different starts. One practical next step.</small>
        </div>
      </div>
    </section>
  );
}

export function StartingPathSelector() {
  return (
    <section id="starting-paths" className="section hiw-start" aria-labelledby="hiw-start-heading">
      <div className="shell">
        <div className="hiw-section-heading">
          <div><span className="section-kicker">YOUR START</span><h2 id="hiw-start-heading">How are you starting?</h2></div>
          <p>Choose the closest path. The routes can converge later, but they do not begin with the same assumptions.</p>
        </div>
        <div className="hiw-start-grid">
          {customerPaths.map((path) => {
            const Icon = pathIcons[path.icon];
            return <a key={path.id} className={`hiw-start-card hiw-start-card-${path.id}`} href={path.anchor}>
              <header><span>{path.eyebrow}</span><Icon size={25} /></header>
              <div><b>{path.index}</b><h3>{path.shortTitle}</h3><p>{path.summary}</p></div>
              <footer>View this path <ArrowDown size={17} /></footer>
            </a>;
          })}
        </div>
      </div>
    </section>
  );
}

export function OverallJourney() {
  return (
    <section className="section-dark hiw-overall" aria-labelledby="hiw-overall-heading">
      <div className="shell">
        <div className="hiw-section-heading hiw-section-heading-dark">
          <div><span className="section-kicker">ESHANTVA PATH-TO-PRODUCT</span><h2 id="hiw-overall-heading">The shared journey, without pretending every order is identical.</h2></div>
          <p>ESHANTVA uses this six-stage vocabulary across the site. Here, it shows where Shop, Custom and Bulk use those stages differently.</p>
        </div>
        <ol className="hiw-overall-list">
          {pathToProduct.map((item, index) => <li key={item.step}>
            <span>{item.step}</span>
            <div><h3>{item.title}</h3><p>{item.description}</p></div>
            {index < pathToProduct.length - 1 && <ArrowRight size={17} aria-hidden="true" />}
          </li>)}
        </ol>
        <p className="hiw-overall-note">Review and confirmation happen only where the product or requirement needs them. Production starts only after the applicable requirement, approval and payment conditions are complete.</p>
      </div>
    </section>
  );
}

function CustomerPathSection({ path }: { path: CustomerPath }) {
  const Icon = pathIcons[path.icon];
  return (
    <section id={`${path.id}-path`} className={`section hiw-path hiw-path-${path.id}`} aria-labelledby={`${path.id}-path-heading`}>
      <div className="shell">
        <div className="hiw-path-intro">
          <div className="hiw-path-mark"><span>{path.eyebrow}</span><Icon size={31} /></div>
          <div><span className="section-kicker">{path.id === 'shop' ? 'CATALOG ROUTE' : path.id === 'custom' ? 'REVIEWED REQUEST ROUTE' : 'LARGER-QUANTITY ROUTE'}</span><h2 id={`${path.id}-path-heading`}>{path.title}</h2><p>{path.summary}</p></div>
          <Button to={path.href} variant={path.id === 'shop' ? 'secondary' : 'primary'}>{path.id === 'shop' ? 'Browse Shop' : path.id === 'custom' ? 'Start Custom Order' : 'Start Bulk Enquiry'} <ArrowRight size={15} /></Button>
        </div>
        {path.id === 'bulk' && <div className="hiw-bulk-starts" aria-label="Bulk order starting options"><span>Existing Catalog Product</span><span>Personalised Catalog Product</span><span>Custom Requirement</span></div>}
        <ol className="hiw-path-steps">
          {path.steps.map((step) => <li key={step.step}><span>{step.step}</span><div><h3>{step.title}</h3><p>{step.description}</p></div></li>)}
        </ol>
        {path.id === 'shop' && <p className="hiw-path-note"><ShieldCheck size={17} /> A catalog product can still become personalised, made-to-order or higher-value because of quantity. The actual order data determines the applicable path. {siteConfig.features.onlinePayments ? 'Online payment is enabled for applicable checkout flows.' : 'Online payment checkout is not live yet, so the applicable confirmation/payment route is used instead.'}</p>}
        {path.id === 'custom' && <p className="hiw-path-note"><FileCheck2 size={17} /> Customer-facing request states reuse the existing custom-order architecture: {customStatusSummary.join(' → ')}. Not every request uses every state.</p>}
        {path.id === 'bulk' && <p className="hiw-path-note"><ClipboardCheck size={17} /> Customer-facing bulk states reuse the existing enquiry architecture: {bulkStatusSummary.join(' → ')}. No fixed MOQ or automatic volume discount is promised.</p>}
      </div>
    </section>
  );
}

export function CustomerPathSections() {
  return <>{customerPaths.map((path) => <CustomerPathSection key={path.id} path={path} />)}</>;
}

export function PricingApprovalPayment() {
  return (
    <section className="section hiw-commercial" aria-labelledby="hiw-commercial-heading">
      <div className="shell">
        <div className="hiw-section-heading">
          <div><span className="section-kicker">REVIEW · APPROVAL · PAYMENT</span><h2 id="hiw-commercial-heading">When is pricing confirmed?</h2></div>
          <p>Submission is not the same thing as acceptance. For Custom and Bulk especially, a request can exist before there is an accepted order.</p>
        </div>
        <div className="hiw-commercial-grid">
          <article><ShoppingBag size={23} /><span>SHOP</span><h3>Displayed or configured pricing</h3><p>Displayed/configured product pricing applies where a product can be purchased directly. Personalisation, made-to-order configuration or quantity can change the applicable confirmation path.</p></article>
          <article><PencilRuler size={23} /><span>CUSTOM</span><h3>Confirmed after review</h3><p>Pricing is confirmed after the requirement has been reviewed and enough information exists to prepare the applicable quotation or terms.</p></article>
          <article><Boxes size={23} /><span>BULK</span><h3>Requirement-based quotation</h3><p>Pricing is reviewed according to product, quantity, customisation and production requirements. No internal pricing formula is published.</p></article>
        </div>
        <div className="hiw-payment-panel">
          <div><CreditCard size={30} /><span className="section-kicker">PAYMENT RULE</span><h3>Payment terms belong to the accepted order.</h3></div>
          <div>
            <div className="hiw-payment-rules">
              <p><strong>Standard / lower-value accepted orders</strong><span>Full payment required.</span></p>
              <p><strong>Lower-value bulk orders</strong><span>Full payment required.</span></p>
              <p><strong>Qualifying high-value orders</strong><span>May receive individually agreed partial or advance-payment terms. There is no publicly fixed percentage.</span></p>
              <p><strong>Cash on delivery</strong><span>COD is not available.</span></p>
            </div>
            <p className="hiw-payment-note">High value can come from a custom requirement, personalisation, a large catalog quantity, customised bulk or another accepted high-value order. It is an order-level decision, not a rule that automatically applies to every custom request.</p>
          </div>
        </div>
        <div className="hiw-submission-clarity"><UserRoundCheck size={22} /><p><strong>Request submission does not automatically mean accepted, ordered, paid or in production.</strong> Production begins only after the applicable requirement, approval and payment conditions have been completed.</p></div>
      </div>
    </section>
  );
}

export function OrderStatusJourney() {
  const groups = [
    { icon: ClipboardCheck, title: 'Request / Confirmation', copy: 'Received, requirement review, clarification, quotation and customer approval where applicable.' },
    { icon: FileCheck2, title: 'Preparation', copy: 'Accepted information and applicable design or order preparation before production.' },
    { icon: PackageCheck, title: 'Production', copy: 'The accepted order is being produced. Internal machine or scheduling details stay private.' },
    { icon: CheckCircle2, title: 'Packing', copy: 'Applicable quality check, packing and ready-for-pickup or dispatch preparation.' },
    { icon: Truck, title: 'Delivery', copy: 'Shipping, transit, local delivery or pickup according to the accepted order.' },
  ];
  return (
    <section className="section-dark hiw-status" aria-labelledby="hiw-status-heading">
      <div className="shell">
        <div className="hiw-section-heading hiw-section-heading-dark">
          <div><span className="section-kicker">ORDER STATUS JOURNEY</span><h2 id="hiw-status-heading">Follow the accepted order without exposing the factory floor.</h2></div>
          <p>Visible status depends on order type. Customer-facing labels are grouped into meaningful stages rather than exposing raw operational status codes.</p>
        </div>
        <div className="hiw-status-grid">
          {groups.map(({ icon: Icon, title, copy }, index) => <article key={title}><header><span>{String(index + 1).padStart(2, '0')}</span><Icon size={22} /></header><h3>{title}</h3><p>{copy}</p></article>)}
        </div>
      </div>
    </section>
  );
}

export function DeliveryAndChanges() {
  const delivery = [
    { icon: Truck, title: 'Pan-India Shipping', copy: siteConfig.panIndiaDelivery ? 'Available. Applicable shipping charges are paid by the customer.' : 'Availability depends on current service configuration.' },
    { icon: MapPin, title: 'Local Pickup', copy: siteConfig.localPickup ? 'Available according to the current arrangement, with no pickup charge.' : 'Availability depends on current service configuration.' },
    { icon: Route, title: 'Local Delivery', copy: customOrderConfig.features.localDeliveryEnabled ? 'May be available with a location-based additional charge.' : 'Not currently enabled.' },
    { icon: UserRoundCheck, title: 'Visit', copy: 'Studio visits are arranged by prior appointment.' },
  ];
  return (
    <section className="section hiw-delivery" aria-labelledby="hiw-delivery-heading">
      <div className="shell">
        <div className="hiw-section-heading"><div><span className="section-kicker">DELIVERY &amp; CHANGES</span><h2 id="hiw-delivery-heading">The last kilometre matters too.</h2></div><p>Delivery is agreed without inventing courier partners or fixed timelines, and changes are handled according to how far the order has progressed.</p></div>
        <div className="hiw-delivery-grid">{delivery.map(({ icon: Icon, title, copy }) => <article key={title}><Icon size={22} /><h3>{title}</h3><p>{copy}</p></article>)}</div>
        <div className="hiw-change-grid">
          <article><RefreshCw size={25} /><span className="section-kicker">NEED TO CHANGE SOMETHING?</span><h3>Earlier changes are easier to review.</h3><p>Changes before production begins may be possible. Changes after design, preparation or production work starts may involve additional charges. Changes after manufacturing may require reprinting.</p></article>
          <article><ShieldCheck size={25} /><span className="section-kicker">CUSTOMER-SUPPLIED INFORMATION</span><h3>Check the information that defines the result.</h3><p>For custom or functional work, verify submitted dimensions, text, personalisation, files and reference information before approval. Ordinary Shop orders are not burdened with irrelevant engineering warnings.</p></article>
        </div>
      </div>
    </section>
  );
}

export function TrackingPreview() {
  const accountLive = siteConfig.features.accountPortal;
  return (
    <section className="hiw-tracking" aria-labelledby="hiw-tracking-heading">
      <div className="shell hiw-tracking-grid">
        <div><span className="section-kicker">AFTER CONFIRMATION</span><h2 id="hiw-tracking-heading">Follow the order after confirmation.</h2><p>{accountLive
          ? 'The customer dashboard can show account identity, recent orders, payment state and request summaries. Detailed order tracking, files and approvals remain separate account features and are not presented as live here.'
          : 'The customer account portal is not live yet. Order updates therefore continue through the communication route agreed for the accepted order. The future portal architecture may surface applicable status, quotation/approval, payment state, files, verification media and delivery tracking.'}</p>
          <div className={`hiw-feature-state ${accountLive ? 'is-live' : 'is-planned'}`}><span>{accountLive ? 'LIVE' : 'FEATURE-AWARE PREVIEW'}</span><strong>{accountLive ? 'Customer dashboard enabled' : 'No fake live dashboard'}</strong></div>
        </div>
        <div className="hiw-verification-card"><Video size={31} /><span className="section-kicker">OPTIONAL VERIFICATION</span><h3>Finished Product Photo / Video Verification</h3><p>{customOrderConfig.features.verificationServiceEnabled || bulkOrderConfig.features.verificationServiceEnabled
          ? 'Eligible orders may request photo/video of the completed product before dispatch. Availability and any additional order-specific charge are confirmed during review.'
          : 'This option is not currently enabled.'}</p><small>This is separate from a digital 3D preview.</small></div>
      </div>
    </section>
  );
}

export function RouteDecisionSection() {
  return (
    <section className="section hiw-decision" aria-labelledby="hiw-decision-heading">
      <div className="shell">
        <div className="hiw-section-heading"><div><span className="section-kicker">WHICH ROUTE IS RIGHT?</span><h2 id="hiw-decision-heading">Match the situation to the next useful route.</h2></div><p>If your requirement sits between two routes, start with the closest one. The review step can redirect it without pretending every request is identical.</p></div>
        <div className="hiw-decision-table" aria-label="Situation and recommended ESHANTVA route">
          <div className="hiw-decision-row hiw-decision-head"><span>Situation</span><span>Best route</span></div>
          {routeDecisions.map((item) => <div key={item.situation} className="hiw-decision-row"><span>{item.situation}</span><Link href={item.href}>{item.route} <ArrowRight size={14} /></Link></div>)}
        </div>
        <div className="hiw-crosslinks"><article><span className="section-kicker">RESULT SIDE</span><h3>Want to see the result side of the process?</h3><Button to="/our-work" variant="secondary">View Our Work <ArrowRight size={15} /></Button></article><article><span className="section-kicker">CAPABILITY QUESTIONS</span><h3>Need to know what ESHANTVA can help with?</h3><Button to="/services" variant="secondary">Explore Services &amp; Capabilities <ArrowRight size={15} /></Button></article></div>
      </div>
    </section>
  );
}

export function HowItWorksFaq() {
  const processFaqs = getFaqsByIds(howItWorksFaqIds);
  return (
    <section className="section hiw-faq" aria-labelledby="hiw-faq-heading"><div className="shell hiw-faq-grid"><div><CircleHelp size={30} /><span className="section-kicker">PROCESS FAQ</span><h2 id="hiw-faq-heading">Useful before you choose a route.</h2><p>These answers explain the customer journey without inventing turnaround times, fixed discounts or acceptance guarantees.</p></div><div>{processFaqs.map((faq) => <details key={faq.id}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</div></div></section>
  );
}

export function HowItWorksFinalCta() {
  const allOptions: Array<{ id: CustomerPathId; title: string; href: string }> = [
    { id: 'shop', title: 'Browse Products', href: '/shop' },
    { id: 'custom', title: 'Start a Custom Order', href: '/custom-order' },
    { id: 'bulk', title: 'Start a Bulk Enquiry', href: '/bulk-order' },
  ];
  const options = allOptions.filter((option) => retailVisibility.isInternal || option.id !== 'shop');
  return (
    <section className="shell hiw-final" aria-labelledby="hiw-final-heading"><div><span className="section-kicker">READY FOR THE NEXT STEP?</span><h2 id="hiw-final-heading">Choose the route that matches what you have today.</h2><p>You do not need to solve the entire process before starting. Pick the closest route and provide the information you already have.</p></div><div>{options.map((option) => <Link key={option.id} href={option.href}><span>{option.id.toUpperCase()}</span><strong>{option.title}</strong><ArrowRight size={17} /></Link>)}</div></section>
  );
}
