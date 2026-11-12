'use client';

import { retailVisibility } from '@/config/retailVisibility';


import { useMemo, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { parseRequestConfirmation, readSessionConfirmation } from '@/lib/requestConfirmation';

export function BulkOrderSuccess() {
  const raw = useSyncExternalStore(() => () => undefined, () => readSessionConfirmation('eshantva-bulk-order-confirmation'), () => null);
  const confirmation = useMemo(() => parseRequestConfirmation(raw, 'bulk'), [raw]);
  return <main className="co-success shell"><div className="co-success-mark"><CheckCircle2 size={42} /></div><span className="section-kicker">BULK ENQUIRY</span><h1>Bulk enquiry received.</h1>
    {confirmation ? <><p>Your bulk request has been submitted for review. This is not an order confirmation, quotation or production guarantee.</p><dl><div><dt>Enquiry reference</dt><dd>{confirmation.publicRequestId}</dd></div><div><dt>Status</dt><dd>Submitted</dd></div><div><dt>Received</dt><dd>{new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(confirmation.submittedAt))}</dd></div><div><dt>Summary</dt><dd>{confirmation.summary}</dd></div></dl><p className="co-success-note">Pricing, feasibility, production requirements, delivery charges and applicable payment terms are confirmed separately.</p></> : <p>No verified submission was found in this browser session. A reference number alone never grants access to private enquiry details.</p>}
    <div className="co-success-actions">{retailVisibility.isInternal && <Link className="button button-primary" href="/shop">Browse products <ArrowRight size={16} /></Link>}<Link className="button button-secondary" href="/bulk-order">Start another enquiry</Link></div></main>;
}

