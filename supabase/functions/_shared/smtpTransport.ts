import type { NotificationTransport } from './notification.ts';

// Deliberately has no environment lookup or default activation. The caller owns
// the deadline through AbortSignal. Production recipient/sender approval is separate.
export interface SmtpSocket {
  read(buffer: Uint8Array): Promise<number | null>;
  write(buffer: Uint8Array): Promise<number>;
  close(): void;
}
export interface SmtpTlsConfig {
  hostname: string;
  port: number;
  username: string;
  password: string;
  from: string;
  connectTls: () => Promise<SmtpSocket>; // Must perform certificate/hostname verification.
}
const encoder = new TextEncoder();
const base64 = (text: string) => btoa(String.fromCharCode(...encoder.encode(text)));
const mailbox = (value: string) => /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?$/.test(value) && value.length <= 254;

export function createSmtpTlsTransport(config: SmtpTlsConfig): NotificationTransport {
  if (!config.hostname || !Number.isInteger(config.port) || config.port < 1 || config.port > 65535 || !mailbox(config.from) || /[\r\n\0]/.test(config.username + config.password) || config.username.length > 254 || config.password.length > 512) throw new Error('SMTP configuration invalid');
  return { async send(event, signal) {
    if (!mailbox(event.customerEmail) || !/^(CR|BR)-\d{4}-[A-Z0-9]{6}$/.test(event.publicRequestId) || event.submittedAt.length > 40 || /[\r\n\0]/.test(event.submittedAt)) throw new Error('SMTP event invalid');
    let socket: SmtpSocket | undefined;
    const close = () => { try { socket?.close(); } catch { /* already closed */ } };
    signal.addEventListener('abort', close, { once: true });
    try {
      if (signal.aborted) throw new Error('SMTP cancelled');
      socket = await config.connectTls();
      if (signal.aborted) throw new Error('SMTP cancelled');
      let pending = '';
      const decoder = new TextDecoder('utf-8', { fatal: true });
      const write = async (text: string) => {
        const bytes = encoder.encode(text); let offset = 0;
        while (offset < bytes.length) {
          if (signal.aborted) throw new Error('SMTP cancelled');
          const n = await socket!.write(bytes.subarray(offset));
          if (n < 1) throw new Error('SMTP write closed');
          offset += n;
        }
      };
      const reply = async () => {
        let code: number | undefined; const lines: string[] = []; let total = 0;
        while (true) {
          while (!pending.includes('\r\n')) {
            if (pending.length > 512 || signal.aborted) throw new Error('SMTP reply invalid');
            const buffer = new Uint8Array(1024); const n = await socket!.read(buffer);
            if (n === null || n < 1) throw new Error('SMTP closed');
            pending += decoder.decode(buffer.subarray(0, n), { stream: true });
          }
          const end = pending.indexOf('\r\n'); const line = pending.slice(0, end); pending = pending.slice(end + 2);
          total += line.length + 2;
          const match = /^(\d{3})([ -])(.*)$/.exec(line);
          if (!match || line.length > 512 || total > 16384 || (code !== undefined && code !== Number(match[1]))) throw new Error('SMTP reply invalid');
          code = Number(match[1]); lines.push(match[3]);
          if (match[2] === ' ') return { code, lines };
        }
      };
      const rejected = (code: number) => ({ accepted: false as const, retryable: code >= 400 && code < 500 });
      let response = await reply(); if (response.code !== 220) return rejected(response.code);
      await write('EHLO eshantva.invalid\r\n'); response = await reply();
      if (response.code !== 250) return rejected(response.code);
      if (!response.lines.some(line => /^AUTH\s+(?:.*\s)?PLAIN(?:\s|$)/i.test(line))) return { accepted: false, retryable: false };
      await write('AUTH PLAIN ' + base64('\0' + config.username + '\0' + config.password) + '\r\n');
      response = await reply(); if (response.code !== 235) return rejected(response.code);
      await write('MAIL FROM:<' + config.from + '>\r\n'); response = await reply(); if (response.code !== 250) return rejected(response.code);
      await write('RCPT TO:<' + event.customerEmail + '>\r\n'); response = await reply(); if (response.code !== 250) return rejected(response.code);
      await write('DATA\r\n'); response = await reply(); if (response.code !== 354) return rejected(response.code);
      const body = base64(`Your ${event.kind} request ${event.publicRequestId} was received at ${event.submittedAt}.\nThis is a receipt, not an accepted quotation or confirmed order.`).match(/.{1,76}/g)!.join('\r\n');
      // Base64 body cannot introduce SMTP dot terminators or customer-controlled headers.
      await write(`From: <${config.from}>\r\nTo: <${event.customerEmail}>\r\nSubject: ESHANTVA request received\r\nMessage-ID: <${event.kind}.${event.publicRequestId}@eshantva.invalid>\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${body}\r\n.\r\n`);
      response = await reply();
      // Connection loss after DATA throws; the notification layer never retries ambiguity.
      return response.code === 250 ? { accepted: true } : rejected(response.code);
    } finally { signal.removeEventListener('abort', close); close(); }
  } };
}
