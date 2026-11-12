import { ArrowUpRight } from 'lucide-react';
import { startingPoints } from '@/data/startingPoints';
import { ServiceIcon } from './ServiceIcon';
import { ServiceLink } from './ServiceLink';

export function StartingPointGrid() {
  return (
    <section className="sv-start section" aria-labelledby="starting-point-heading">
      <div className="shell">
        <div className="sv-section-title"><span>01</span><div><span className="section-kicker">YOUR START</span><h2 id="starting-point-heading">Where are you starting from?</h2></div><p>You do not need the same information as every other customer. Choose the closest starting point.</p></div>
        <div className="sv-start-grid">
          {startingPoints.map((point) => <ServiceLink key={point.id} href={point.href} event={point.event} detail={point.id} className="sv-start-card">
            <header><b>{point.index}</b><ServiceIcon name={point.icon} size={24} /></header>
            <div><h3>{point.title}</h3><p>{point.description}</p></div>
            <footer><span>{point.actionLabel}</span><ArrowUpRight size={18} /></footer>
          </ServiceLink>)}
        </div>
      </div>
    </section>
  );
}
