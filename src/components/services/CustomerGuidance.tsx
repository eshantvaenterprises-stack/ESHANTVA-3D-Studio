import { ArrowRight, Box, Boxes, CheckCircle2, FileBox, FileImage, Lightbulb, PackageCheck, PencilRuler, Ruler } from 'lucide-react';
import { ServiceLink } from './ServiceLink';
import { retailVisibility } from '@/config/retailVisibility';

const allInputs = [
  { title: '3D File', route: 'Custom Order', href: '/custom-order', icon: FileBox },
  { title: 'Drawing', route: 'Custom Order', href: '/custom-order', icon: PencilRuler },
  { title: 'Measurements', route: 'Custom Order', href: '/custom-order', icon: Ruler },
  { title: 'Photo / Reference', route: 'Custom Order', href: '/custom-order', icon: FileImage },
  { title: 'Existing Product', route: 'Shop / Product Page', href: '/shop', icon: PackageCheck },
  { title: 'Existing Design', route: 'Custom Order', href: '/custom-order', icon: Box },
  { title: 'Just an Idea', route: 'Custom Order', href: '/custom-order', icon: Lightbulb },
  { title: 'Large Quantity', route: 'Bulk Order', href: '/bulk-order', icon: Boxes },
];
const inputs = allInputs.filter((input) => retailVisibility.isInternal || !input.href.startsWith('/shop'));

const reviewSteps = [
  ['01', 'Understand the requirement'],
  ['02', 'Review supplied information'],
  ['03', 'Check feasibility'],
  ['04', 'Confirm next steps'],
];

const allRoutes = [
  { need: 'Ready catalog product', start: 'Shop', pricing: 'Displayed price', review: 'Normally direct', action: 'Browse Products', href: '/shop', event: 'service_shop_click' as const },
  { need: 'Personalized catalog product', start: 'Product Page', pricing: 'Configured price', review: 'Depends on option', action: 'Explore Products', href: '/shop?customisable=true', event: 'service_shop_click' as const },
  { need: 'One custom requirement', start: 'Custom Order', pricing: 'Confirmed after review', review: 'Yes', action: 'Start Custom Order', href: '/custom-order', event: 'service_custom_order_click' as const },
  { need: 'Larger quantity', start: 'Bulk Order', pricing: 'Confirmed according to requirement', review: 'Where applicable', action: 'Start Bulk Enquiry', href: '/bulk-order', event: 'service_bulk_order_click' as const },
];
const routes = allRoutes.filter((route) => retailVisibility.isInternal || !route.href.startsWith('/shop'));

export function CustomerInputTypes() {
  return <section className="sv-inputs section" aria-labelledby="inputs-heading"><div className="shell"><div className="section-heading"><div><span className="section-kicker">CUSTOMER INPUTS</span><h2 id="inputs-heading">Start with whatever information you already have.</h2></div><p>Choose the closest match and continue through the appropriate product, custom or bulk route.</p></div><div className="sv-input-grid">{inputs.map(({ title, route, href, icon: Icon }) => <ServiceLink key={title} href={href} event={href.startsWith('/shop') ? 'service_shop_click' : href.startsWith('/bulk') ? 'service_bulk_order_click' : 'service_custom_order_click'} detail={title} className="sv-input-card"><Icon size={22} aria-hidden="true" /><div><strong>{title}</strong><span>Start: {route}</span></div><ArrowRight size={15} /></ServiceLink>)}</div></div></section>;
}

export function FeasibilityProcess() {
  return <section id="feasibility-review" className="sv-feasibility"><div className="shell sv-feasibility-grid"><div><span className="section-kicker">FEASIBILITY REVIEW</span><h2>What happens before a custom requirement is accepted?</h2><p>Custom and complex requirements may need additional information before a quotation or production decision can be made. Submission does not promise automatic acceptance.</p></div><ol>{reviewSteps.map(([step, title]) => <li key={step}><span>{step}</span><CheckCircle2 size={19} aria-hidden="true" /><strong>{title}</strong></li>)}</ol></div></section>;
}

export function RouteComparison() {
  return <section className="sv-route section" aria-labelledby="route-heading"><div className="shell"><div className="section-heading"><div><span className="section-kicker">CHOOSE YOUR ROUTE</span><h2 id="route-heading">Which route should I use?</h2></div><p>Choose by the result and information you have now. Pricing shown elsewhere remains subject to the applicable product or review flow.</p></div><div className="sv-route-table" role="region" aria-label="Route comparison" tabIndex={0}><table><thead><tr><th>What you need</th><th>Start here</th><th>Pricing</th><th>Review</th><th><span className="sr-only">Action</span></th></tr></thead><tbody>{routes.map((route) => <tr key={route.need}><th scope="row">{route.need}</th><td>{route.start}</td><td>{route.pricing}</td><td>{route.review}</td><td><ServiceLink href={route.href} event={route.event}>{route.action} <ArrowRight size={14} /></ServiceLink></td></tr>)}</tbody></table></div><div className="sv-route-cards">{routes.map((route) => <article key={route.need}><span>{route.need}</span><dl><div><dt>Start</dt><dd>{route.start}</dd></div><div><dt>Pricing</dt><dd>{route.pricing}</dd></div><div><dt>Review</dt><dd>{route.review}</dd></div></dl><ServiceLink className="text-link" href={route.href} event={route.event}>{route.action} <ArrowRight size={14} /></ServiceLink></article>)}</div><p className="sv-payment-note">Standard and lower-value accepted orders require full payment. Qualifying high-value orders may receive individually agreed payment terms.</p></div></section>;
}
