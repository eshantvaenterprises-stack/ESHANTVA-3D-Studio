import { ArrowRight, Check, CornerDownRight } from 'lucide-react';
import { enabledServiceCapabilities } from '@/data/services';
import type { ServiceCapability } from '@/types/service';
import { CapabilityStatusBadge } from './CapabilityStatusBadge';
import { ServiceIcon } from './ServiceIcon';
import { ServiceLink } from './ServiceLink';

function DetailList({ title, items }: { title: string; items: string[] }) {
  return <div className="sv-detail-list"><strong>{title}</strong><ul>{items.map((item) => <li key={item}><Check size={14} aria-hidden="true" />{item}</li>)}</ul></div>;
}

function ServiceDetailSection({ service, reverse }: { service: ServiceCapability; reverse?: boolean }) {
  return (
    <section id={service.anchor} className={`sv-detail ${reverse ? 'sv-detail-reverse' : ''}`} aria-labelledby={`${service.anchor}-heading`}>
      <div className="shell sv-detail-grid">
        <div className="sv-detail-copy">
          <div className="sv-detail-index"><span>{service.index}</span><ServiceIcon name={service.icon} size={24} /></div>
          <CapabilityStatusBadge status={service.status} />
          <p className="sv-detail-title">{service.title}</p>
          <h2 id={`${service.anchor}-heading`}>{service.headline}</h2>
          <p>{service.description}</p>
          {service.notes?.map((note) => <p className="sv-detail-note" key={note}>{note}</p>)}
          <ServiceLink className="button button-primary" href={service.primaryCta.href} event={service.primaryCta.event} detail={service.id}>{service.primaryCta.label} <ArrowRight size={16} /></ServiceLink>
        </div>
        <aside className="sv-detail-panel" aria-label={`${service.title} request information`}>
          <div className="sv-detail-motif"><span>YOUR INPUT</span><CornerDownRight size={18} /><span>ESHANTVA PATH</span><CornerDownRight size={18} /><strong>PHYSICAL RESULT</strong></div>
          {service.suitableRequests && <DetailList title="Examples of suitable requests" items={service.suitableRequests} />}
          {service.helpfulInputs && <DetailList title="Helpful information to provide" items={service.helpfulInputs} />}
          <small>Examples describe request types, not completed ESHANTVA customer work.</small>
        </aside>
      </div>
    </section>
  );
}

export function ServiceDetails() {
  return <div className="sv-details">{enabledServiceCapabilities.map((service, index) => <ServiceDetailSection key={service.id} service={service} reverse={index === 1 || index === 4} />)}</div>;
}
