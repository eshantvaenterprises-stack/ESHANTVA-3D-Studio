import { ArrowUpRight, Boxes, FileUp, Palette, Route, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { retailVisibility } from '@/config/retailVisibility';

const retailPaths = [
  {
    index: '01', label: 'READY / BROWSE', title: 'Shop Ready Designs',
    copy: 'For customers who want to browse available products and selected designs.',
    cta: 'Explore Shop', href: '/shop', icon: ShoppingBag, tone: 'light',
  },
  {
    index: '02', label: 'SELECT / PERSONALISE', title: 'Personalise a Product',
    copy: 'Customise selected products with a name, text, colour, logo, image or size where applicable.',
    cta: 'Browse Customisable Products', href: '/shop?type=customisable', icon: Palette, tone: 'orange',
  },
  {
    index: '03', label: 'UPLOAD / REVIEW', title: 'Start With Your Idea',
    copy: 'Share a 3D file, drawing, dimensions, photo, reference or an existing design for review.',
    cta: 'Submit a Custom Request', href: '/custom-order', icon: FileUp, tone: 'dark',
  },
];
const publicPaths = [
  { index: '01', label: 'FILE / IDEA / REFERENCE', title: 'Start a Custom Order', copy: 'Share the information you already have and describe the physical result you need.', cta: 'Submit a Custom Request', href: '/custom-order', icon: FileUp, tone: 'light' },
  { index: '02', label: 'QUANTITY / BUSINESS', title: 'Plan a Bulk Requirement', copy: 'Submit a larger-quantity or recurring requirement for feasibility and commercial review.', cta: 'Start a Bulk Enquiry', href: '/bulk-order', icon: Boxes, tone: 'orange' },
  { index: '03', label: 'CAPABILITY / DIRECTION', title: 'Find the Right Service Path', copy: 'Understand available, selected, review-required and case-by-case capabilities.', cta: 'Explore Services', href: '/services', icon: Route, tone: 'dark' },
];

export function CustomerPaths() {
  const paths = retailVisibility.isInternal ? retailPaths : publicPaths;
  return (
    <section className="section customer-paths">
      <div className="section-heading shell">
        <div><span className="section-kicker">CHOOSE YOUR PATH</span><h2>What would you like to make?</h2></div>
        <p>Start with what you already have—an idea, a design or simply a product in mind.</p>
      </div>
      <div className="path-grid shell">
        {paths.map(({ icon: Icon, ...path }) => (
          <Link key={path.index} href={path.href} className={`path-card path-${path.tone}`}>
            <div className="path-card-top"><span>{path.index}</span><Icon size={30} strokeWidth={1.5} /></div>
            <div className="path-card-art" aria-hidden="true"><span /><span /><span /></div>
            <div className="path-card-copy">
              <small>{path.label}</small><h3>{path.title}</h3><p>{path.copy}</p>
              {path.tone === 'dark' && <em>Requests are reviewed for feasibility before acceptance.</em>}
              <strong>{path.cta}<ArrowUpRight size={17} /></strong>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
