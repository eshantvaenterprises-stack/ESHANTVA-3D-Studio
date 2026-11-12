export type CustomRequestConfirmation = {
  publicRequestId: string;
  customerEmail: string;
  submittedAt: string;
};

export type BulkRequestConfirmation = {
  publicRequestId: string;
  customerEmail: string;
  submittedAt: string;
};

// Transport is injected by the configured adapter at committed application call
// sites. The default remains disabled. Real Gmail acceptance is a separate gate.
export type NotificationResult =
  | { sent: true; attempts: number }
  | { sent: false; reason: 'provider_not_configured' }
  | { sent: false; reason: 'delivery_rejected' | 'delivery_unknown'; attempts: number };

export type NotificationTransport = {
  // retryable MUST mean definitely not accepted, e.g. an SMTP 4xx rejection.
  // Ambiguous network failures must throw; retrying those can duplicate delivery.
  send: (event: CustomRequestConfirmation & { kind: 'custom' | 'bulk'; eventKey: string }, signal: AbortSignal) => Promise<
    { accepted: true } | { accepted: false; retryable: boolean }
  >;
};

export type NotificationDelivery = {
  transport: NotificationTransport;
  wait?: (milliseconds: number) => Promise<void>;
};

async function deliver(kind: 'custom' | 'bulk', confirmation: CustomRequestConfirmation, delivery?: NotificationDelivery): Promise<NotificationResult> {
  if (!delivery) return { sent: false, reason: 'provider_not_configured' };
  const event = { ...confirmation, kind, eventKey: `${kind}:${confirmation.publicRequestId}` };
  for (let attempt = 1; attempt <= 3; attempt++) {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const outcome = await Promise.race([
        delivery.transport.send(event, controller.signal),
        new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error('Notification timeout')); }, 2000); }),
      ]);
      if (outcome.accepted) return { sent: true, attempts: attempt };
      if (!outcome.retryable || attempt === 3) return { sent: false, reason: 'delivery_rejected', attempts: attempt };
    } catch {
      // No exception text or recipient is logged or returned. Submission remains successful.
      return { sent: false, reason: 'delivery_unknown', attempts: attempt };
    } finally { if (timer !== undefined) clearTimeout(timer); }
    try { await (delivery.wait ?? ((ms) => new Promise(resolve => setTimeout(resolve, ms))))(100 * 2 ** (attempt - 1)); }
    catch { return { sent: false, reason: 'delivery_unknown', attempts: attempt }; }
  }
  return { sent: false, reason: 'delivery_rejected', attempts: 3 };
}

export async function sendCustomRequestConfirmation(
  confirmation: CustomRequestConfirmation,
  delivery?: NotificationDelivery,
): Promise<NotificationResult> {
  return deliver('custom', confirmation, delivery);
}

export async function sendBulkRequestConfirmation(
  confirmation: BulkRequestConfirmation,
  delivery?: NotificationDelivery,
): Promise<NotificationResult> {
  return deliver('bulk', confirmation, delivery);
}
