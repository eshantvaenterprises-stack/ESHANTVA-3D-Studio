import assert from 'node:assert/strict';
import { sendCustomRequestConfirmation, sendBulkRequestConfirmation, type NotificationTransport } from '../supabase/functions/_shared/notification.ts';

const confirmation = { publicRequestId: 'CR-2026-TEST01', customerEmail: 'synthetic@example.invalid', submittedAt: '2026-11-11T00:00:00Z' };
let checks = 0;
for (const send of [sendCustomRequestConfirmation, sendBulkRequestConfirmation]) {
  assert.deepEqual(await send(confirmation), { sent: false, reason: 'provider_not_configured' }); checks++;
  let calls = 0;
  const eventKeys: string[] = [], delays: number[] = [];
  const transport: NotificationTransport = { send: async event => {
    eventKeys.push(event.eventKey); calls++;
    return calls < 3 ? { accepted: false, retryable: true } : { accepted: true };
  } };
  assert.deepEqual(await send(confirmation, { transport, wait: async ms => { delays.push(ms); } }), { sent: true, attempts: 3 });
  assert.equal(new Set(eventKeys).size, 1); assert.deepEqual(delays, [100, 200]); checks++;
  calls = 0;
  assert.deepEqual(await send(confirmation, { transport: { send: async () => { calls++; return { accepted: false, retryable: false }; } } }), { sent: false, reason: 'delivery_rejected', attempts: 1 });
  assert.equal(calls, 1); checks++;
  calls = 0;
  const failed = await send(confirmation, { transport: { send: async () => { calls++; throw new Error('synthetic private SMTP detail'); } } });
  assert.deepEqual(failed, { sent: false, reason: 'delivery_unknown', attempts: 1 });
  assert.equal(calls, 1); assert.ok(!JSON.stringify(failed).includes('private')); checks++;
  calls = 0;
  assert.deepEqual(await send(confirmation, { transport: { send: async () => { calls++; return { accepted: false, retryable: true }; } }, wait: async () => {} }), { sent: false, reason: 'delivery_rejected', attempts: 3 });
  assert.equal(calls, 3); checks++;
  let signal: AbortSignal | undefined;
  const timeout = await send(confirmation, { transport: { send: async (_event, receivedSignal) => { signal = receivedSignal; return new Promise(() => {}); } } });
  assert.deepEqual(timeout, { sent: false, reason: 'delivery_unknown', attempts: 1 });
  assert.equal(signal?.aborted, true); checks++;
}
console.log(`NOTIFICATION_MOCK_TESTS_PASS=${checks}; real Gmail/Edge delivery NOT_TESTED`);
