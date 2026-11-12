import { ArrowDown } from 'lucide-react';
import { enabledServiceCapabilities } from '@/data/services';
import { CapabilityStatusBadge } from './CapabilityStatusBadge';
import { ServiceIcon } from './ServiceIcon';
import { ServiceLink } from './ServiceLink';

export function CapabilityNavigation() {
  return <nav className="sv-cap-nav" aria-label="Service capabilities"><div className="shell">{enabledServiceCapabilities.map((service) => <a key={service.id} href={`#${service.anchor}`}>{service.title.replace('Product ', '').replace(' Requests', '').replace(' Production', '')}</a>)}</div></nav>;
}

export function CapabilityOverview() {
  return (
    <section className="sv-overview section" aria-labelledby="capability-heading">
      <div className="shell">
        <div className="sv-section-title"><span>03</span><div><span className="section-kicker">SERVICES</span><h2 id="capability-heading">What ESHANTVA can help with.</h2></div><p>Each category shows how requests are currently handled—without implying that every individual requirement is guaranteed.</p></div>
        <div className="sv-cap-grid">
          {enabledServiceCapabilities.map((service) => <ServiceLink className="sv-cap-card" href={`#${service.anchor}`} key={service.id} event="service_capability_view" detail={service.id}>
            <header><span>{service.index}</span><ServiceIcon name={service.icon} size={23} /></header>
            <div><CapabilityStatusBadge status={service.status} /><h3>{service.title}</h3><p>{service.shortDescription}</p></div>
            <footer>View capability <ArrowDown size={16} /></footer>
          </ServiceLink>)}
        </div>
      </div>
    </section>
  );
}
