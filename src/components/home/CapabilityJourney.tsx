import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { capabilities } from '../../data/capabilities';

export function CapabilityJourney() {
  return (
    <section className="capability-section section-dark">
      <div className="shell">
        <div className="section-heading section-heading-dark">
          <div><span className="section-kicker">CAPABILITY PATH</span><h2>One requirement.<br />Different paths to production.</h2></div>
          <p>Service availability depends on the requirement, complexity and production feasibility.</p>
        </div>
        <ol className="capability-list">
          {capabilities.map((item, index) => (
            <li key={item.name}>
              <span>{item.index}</span><h3><Link href={item.href}>{item.name}</Link></h3><small>{item.status}</small>
              {index < capabilities.length - 1 && <ArrowRight size={18} aria-hidden="true" />}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
