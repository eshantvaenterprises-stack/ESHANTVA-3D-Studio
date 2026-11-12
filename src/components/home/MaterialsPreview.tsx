import { ArrowRight, CircleDashed, Hexagon, Layers2, Waves } from 'lucide-react';
import Link from 'next/link';

const materials = [
  { name: 'Everyday Prints', note: 'Material details to be confirmed', icon: Layers2 },
  { name: 'Functional Requests', note: 'Reviewed by requirement', icon: Hexagon },
  { name: 'Flexible Applications', note: 'Availability not connected', icon: Waves },
  { name: 'Special Requirements', note: 'Case-by-case review', icon: CircleDashed },
];

export function MaterialsPreview() {
  return (
    <section className="section materials-section">
      <div className="materials-grid shell">
        <div className="materials-intro">
          <span className="section-kicker">MATERIALS / PUBLIC PREVIEW</span>
          <h2>Materials for different kinds of ideas.</h2>
          <p>Final material selection depends on the product, use case and current public availability.</p>
          <div className="inventory-note">Availability shown after inventory connection</div>
          <Link className="text-link" href="/materials">Explore Materials <ArrowRight size={16} /></Link>
        </div>
        <div className="material-cards">
          {materials.map(({ icon: Icon, name, note }, index) => (
            <article key={name}><span>{String(index + 1).padStart(2, '0')}</span><Icon size={31} strokeWidth={1.4} /><h3>{name}</h3><p>{note}</p><small>STATUS: NOT CONNECTED</small></article>
          ))}
        </div>
      </div>
    </section>
  );
}
