import type { NotificationDelivery } from './notification.ts';
import { withNotificationLedger } from './notificationLedger.ts';
import { createSmtpTlsTransport } from './smtpTransport.ts';

type RpcClient = { rpc(name: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }> };

// OPEN-10 is DEFERRED_NOT_PASS for this release. Environment configuration
// cannot activate request delivery; enabling it requires a separately reviewed
// source change after event/recipient authorization. Existing Gmail Auth config
// is independent and unchanged.
const REQUEST_NOTIFICATION_RELEASE_ENABLED: boolean = false;

// Explicit opt-in only. Missing/invalid transport or ledger must never undo a
// committed request. Durable queued events remain available for reconciliation.
export function configuredNotificationDelivery(admin: RpcClient): NotificationDelivery | undefined {
  if (!REQUEST_NOTIFICATION_RELEASE_ENABLED) return undefined;
  if (Deno.env.get('NOTIFICATION_TRANSPORT') !== 'smtp_tls') return undefined;
  return { transport: { async send(event, signal) {
    const hostname = Deno.env.get('SMTP_HOST') || '';
    const port = Number(Deno.env.get('SMTP_PORT') || '465');
    const ca = Deno.env.get('SMTP_CA_CERT');
    const smtp = createSmtpTlsTransport({
      hostname, port, username: Deno.env.get('SMTP_USERNAME') || '',
      password: Deno.env.get('SMTP_PASSWORD') || '', from: Deno.env.get('SMTP_FROM') || '',
      connectTls: () => Deno.connectTls({ hostname, port, ...(ca ? { caCerts: [ca] } : {}) }),
    });
    return withNotificationLedger(smtp, {
      async claim(eventKey, payloadHash) {
        const { data, error } = await admin.rpc('claim_notification_delivery', { p_key: eventKey, p_hash: payloadHash });
        if (error || !data || typeof data !== 'object' || !('state' in data)) throw new Error('Notification ledger unavailable');
        if (data.state === 'claimed' && 'lease' in data && typeof data.lease === 'string') return { state: 'claimed', lease: data.lease };
        if (data.state === 'sent') return { state: 'sent' };
        return { state: 'blocked' };
      },
      async settle(eventKey, lease, state) {
        const { data, error } = await admin.rpc('settle_notification_delivery', { p_key: eventKey, p_lease: lease, p_state: state });
        if (error || data !== true) throw new Error('Notification settlement unavailable');
      },
    }).send(event, signal);
  } } };
}
