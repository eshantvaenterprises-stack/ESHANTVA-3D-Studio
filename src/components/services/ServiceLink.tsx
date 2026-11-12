'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { trackServiceEvent } from '@/lib/analytics';
import type { ServiceAnalyticsEvent } from '@/types/service';

export function ServiceLink({ href, event, className, children, detail }: {
  href: string;
  event: ServiceAnalyticsEvent;
  className?: string;
  children: ReactNode;
  detail?: string;
}) {
  return <Link href={href} className={className} onClick={() => trackServiceEvent(event, detail ? { detail } : {})}>{children}</Link>;
}
