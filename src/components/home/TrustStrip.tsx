import { BadgeCheck, MapPinned, ScanLine, ShieldCheck } from 'lucide-react';
import { retailVisibility } from '@/config/retailVisibility';

const items = [
  { icon: ScanLine, title: 'Custom Requirements', copy: 'Reviewed before acceptance' },
  { icon: BadgeCheck, title: 'Order Tracking', copy: 'Track progress from your account' },
  { icon: MapPinned, title: 'Local + Online', copy: 'Biswanath & Pan-India' },
  { icon: ShieldCheck, title: retailVisibility.isInternal ? 'Retail Development' : 'Private Order Access', copy: retailVisibility.isInternal ? 'Internal review surface' : 'Account-bound customer records' },
];

export function TrustStrip() {
  return (
    <section className="trust-strip" aria-label="Order and service information">
      <div className="trust-grid shell">
        {items.map(({ icon: Icon, title, copy }) => (
          <div key={title} className="trust-item">
            <Icon size={21} strokeWidth={1.7} aria-hidden="true" />
            <div><h2>{title}</h2><p>{copy}</p></div>
          </div>
        ))}
      </div>
    </section>
  );
}
