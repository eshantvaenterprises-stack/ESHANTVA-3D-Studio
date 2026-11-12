import { Check, ListChecks, SearchCheck, SlidersHorizontal } from 'lucide-react';
import { capabilityStatusLabels } from '@/data/services';
import type { CapabilityStatus } from '@/types/service';

const icons = {
  available: Check,
  selected_requests: ListChecks,
  review_required: SearchCheck,
  case_by_case: SlidersHorizontal,
} satisfies Record<CapabilityStatus, typeof Check>;

export function CapabilityStatusBadge({ status }: { status: CapabilityStatus }) {
  const Icon = icons[status];
  return <span className={`sv-status sv-status-${status}`}><Icon size={14} aria-hidden="true" />{capabilityStatusLabels[status]}</span>;
}
