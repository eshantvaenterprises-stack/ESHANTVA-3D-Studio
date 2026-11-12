import type { NotificationTransport } from './notification.ts';

export interface NotificationLedger {
  claim(eventKey: string, payloadHash: string): Promise<{ state: 'claimed'; lease: string } | { state: 'sent' | 'blocked' }>;
  settle(eventKey: string, lease: string, state: 'sent' | 'retryable' | 'rejected' | 'unknown'): Promise<void>;
}

// Optional decorator, never activated by configuration alone. The database must
// atomically claim each event; expired claims become UNKNOWN, never auto-replayed.
export function withNotificationLedger(transport: NotificationTransport, ledger: NotificationLedger): NotificationTransport {
  return { async send(event, signal) {
    const bytes = new TextEncoder().encode(JSON.stringify([event.kind, event.publicRequestId, event.customerEmail, event.submittedAt]));
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
    const claim = await ledger.claim(event.eventKey, hash);
    if (claim.state === 'sent') return { accepted: true };
    if (claim.state !== 'claimed') throw new Error('Notification claim unavailable');
    try {
      if (signal.aborted) throw new Error('Notification cancelled');
      const result = await transport.send(event, signal);
      await ledger.settle(event.eventKey, claim.lease, result.accepted ? 'sent' : result.retryable ? 'retryable' : 'rejected');
      return result;
    } catch {
      try { await ledger.settle(event.eventKey, claim.lease, 'unknown'); } catch { /* retained SENDING lease also blocks replay */ }
      throw new Error('Notification delivery unresolved');
    }
  } };
}
