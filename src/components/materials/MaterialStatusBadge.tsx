import { Check, CircleHelp, Clock3, MinusCircle, TriangleAlert } from 'lucide-react';
import { publicMaterialStatusLabels } from '@/data/materials';
import type { SanitizedPublicAvailability } from '@/types/material';

const statusIcons = {
  available: Check,
  limited: TriangleAlert,
  on_request: Clock3,
  unavailable: MinusCircle,
};

export function MaterialStatusBadge({ availability }: { availability: SanitizedPublicAvailability }) {
  if (!availability.status) {
    return <span className="mt-status mt-status-neutral"><CircleHelp size={15} aria-hidden="true" />{availability.customerMessage}</span>;
  }
  const Icon = statusIcons[availability.status];
  return <span className={`mt-status mt-status-${availability.status}`}><Icon size={15} aria-hidden="true" />{publicMaterialStatusLabels[availability.status]}</span>;
}
