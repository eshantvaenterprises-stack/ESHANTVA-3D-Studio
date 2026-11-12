import { configuredNotificationDelivery } from './configuredNotification.ts';
import { sendBulkRequestConfirmation, sendCustomRequestConfirmation } from './notification.ts';

type RpcClient = { rpc(name: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }> };

// Service-side recovery entrypoint. Scheduling/host activation is deliberately
// separate. Every send uses the same atomic ledger as the immediate call site;
// concurrent dispatchers may select the same event but only one can send it.
export async function dispatchRequestConfirmations(admin: RpcClient, limit = 10) {
  const delivery = configuredNotificationDelivery(admin);
  if (!delivery) return { enabled: false, selected: 0, sent: 0, unresolved: 0 };
  if (!Number.isInteger(limit) || limit < 1 || limit > 25) throw new Error('Invalid notification batch size');
  const { data, error } = await admin.rpc('list_notification_deliveries', { p_limit: limit });
  if (error || !Array.isArray(data)) throw new Error('Notification queue unavailable');
  let sent = 0; let unresolved = 0;
  for (const row of data) {
    const payload = row?.payload;
    if (!payload || !['custom', 'bulk'].includes(payload.kind) || typeof payload.publicRequestId !== 'string' || typeof payload.customerEmail !== 'string' || typeof payload.submittedAt !== 'string' || row.event_key !== `${payload.kind}:${payload.publicRequestId}`) {
      unresolved++; continue;
    }
    const result = await (payload.kind === 'custom' ? sendCustomRequestConfirmation : sendBulkRequestConfirmation)(payload, delivery);
    if (result.sent) sent++; else unresolved++;
  }
  return { enabled: true, selected: data.length, sent, unresolved };
}
