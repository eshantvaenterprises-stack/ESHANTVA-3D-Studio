'use client';

import { retailVisibility } from '@/config/retailVisibility';


import { useMemo, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { parseRequestConfirmation, readSessionConfirmation } from '@/lib/requestConfirmation';

export function CustomOrderSuccess() {
  const raw = useSyncExternalStore(
    () => () => undefined,
    () => readSessionConfirmation('eshantva-custom-order-confirmation'),
    () => null,
  );
  const confirmation = useMemo(() => parseRequestConfirmation(raw, 'custom'), [raw]);

  return (
    <main className="co-success shell">
      <div className="co-success-mark"><CheckCircle2 size={42} /></div>
      <span className="section-kicker">CUSTOM REQUEST</span>
      <h1>Request received.</h1>
      {confirmation ? <>
        <p>Your request has been submitted for individual review. This is not an order confirmation, quotation or production guarantee.</p>
        <dl><div><dt>Request reference</dt><dd>{confirmation.publicRequestId}</dd></div><div><dt>Status</dt><dd>Submitted</dd></div><div><dt>Received</dt><dd>{new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(confirmation.submittedAt))}</dd></div></dl>
        <p className="co-success-note">Keep the request reference for future communication. A confirmation email is not claimed because an email provider is not configured yet.</p>
      </> : <>
        <p>No verified submission was found in this browser session. A request number alone never grants access to request details.</p>
      </>}
      <div className="co-success-actions">{retailVisibility.isInternal && <Link className="button button-primary" href="/shop">Browse products <ArrowRight size={16} /></Link>}<Link className="button button-secondary" href="/custom-order">Start another request</Link></div>
    </main>
  );
}
