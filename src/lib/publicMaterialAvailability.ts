import { siteConfig } from '@/config/site';
import type { PublicColorOption, PublicMaterial, SanitizedPublicAvailability } from '@/types/material';

export function getPublicMaterialAvailability(
  record: Pick<PublicMaterial | PublicColorOption, 'publicStatus'>,
): SanitizedPublicAvailability {
  if (!siteConfig.features.materials.liveAvailabilityEnabled || !record.publicStatus) {
    return { status: null, customerMessage: 'Availability confirmed when ordering' };
  }

  return {
    status: record.publicStatus,
    customerMessage: record.publicStatus === 'limited'
      ? 'Availability may change based on current orders.'
      : record.publicStatus === 'on_request'
        ? 'Confirmation is required before production.'
        : '',
  };
}
