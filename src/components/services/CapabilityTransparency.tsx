import { Check, ListChecks, SearchCheck, SlidersHorizontal } from 'lucide-react';
import { capabilityStatusDescriptions, capabilityStatusLabels } from '@/data/services';
import type { CapabilityStatus } from '@/types/service';

const statuses: Array<{ status: CapabilityStatus; icon: typeof Check }> = [
  { status: 'available', icon: Check },
  { status: 'selected_requests', icon: ListChecks },
  { status: 'review_required', icon: SearchCheck },
  { status: 'case_by_case', icon: SlidersHorizontal },
];

export function CapabilityTransparency() {
  return (
    <section className="sv-transparency section-dark" aria-labelledby="transparency-heading">
      <div className="shell">
        <div className="sv-section-title sv-section-title-dark"><span>04</span><div><span className="section-kicker">CAPABILITY TRANSPARENCY</span><h2 id="transparency-heading">Clear capability. No guesswork.</h2></div><p>Simple labels show whether a service category can normally proceed or needs further review.</p></div>
        <div className="sv-status-grid">{statuses.map(({ status, icon: Icon }) => <article key={status} className={`sv-status-card sv-status-card-${status}`}><header><Icon size={21} aria-hidden="true" /><span>{capabilityStatusLabels[status]}</span></header><p>{capabilityStatusDescriptions[status]}</p></article>)}</div>
        <p className="sv-status-note">A status describes the service category, not an unconditional guarantee for every individual request.</p>
      </div>
    </section>
  );
}
