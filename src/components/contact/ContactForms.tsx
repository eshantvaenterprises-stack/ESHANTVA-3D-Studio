'use client';

import { useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowRight, CalendarClock, CheckCircle2, Mail, Send } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { contactConfig } from '@/config/contact';
import { contactReasons, contactReasonRoutes } from '@/data/contact';
import { contactBackendConfigured, submitAppointmentRequest, submitContactRequest } from '@/lib/contactApi';
import type { AppointmentSubmission, ContactReason, ContactSubmission } from '@/types/contact';

function localToday() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function BackendFallback({ appointment = false }: { appointment?: boolean }) {
  const subject = appointment ? 'ESHANTVA Website Appointment Request' : 'ESHANTVA Website Enquiry';
  const href = `mailto:${contactConfig.publicEmail}?subject=${encodeURIComponent(subject)}`;
  return (
    <div className="ct-backend-fallback" role="status">
      <Mail size={24} aria-hidden="true" />
      <div>
        <strong>{appointment ? 'Appointment request submission is temporarily unavailable.' : 'Secure web submission is temporarily unavailable.'}</strong>
        <p>{appointment ? 'Send your preferred visit date, time window and reason by email. A request is not a confirmed appointment.' : 'You can still contact ESHANTVA through the verified public business email.'}</p>
        <a className="text-link" href={href}>Email {contactConfig.publicEmail} <ArrowRight size={14} /></a>
      </div>
    </div>
  );
}

export function ContactRequestForm() {
  const [reason, setReason] = useState<ContactReason>('general_business');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [orderReference, setOrderReference] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');
  const [state, setState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [feedback, setFeedback] = useState('');
  const [publicReference, setPublicReference] = useState('');
  const feedbackRef = useRef<HTMLDivElement>(null);
  const route = contactReasonRoutes[reason];

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!contactBackendConfigured || state === 'submitting') return;
    setState('submitting');
    setFeedback('');
    setPublicReference('');
    try {
      const submission: ContactSubmission = { reason, name, email, orderReference, message, website };
      const result = await submitContactRequest(submission);
      setPublicReference(result.publicReference);
      setState('success');
      setFeedback('Your enquiry was submitted for review. Keep the reference below if you need to follow up.');
      setName(''); setEmail(''); setOrderReference(''); setMessage(''); setWebsite('');
    } catch (error) {
      setState('error');
      setFeedback(error instanceof Error ? error.message : 'We could not submit this request. Please try again or contact us by email.');
    } finally {
      requestAnimationFrame(() => feedbackRef.current?.focus());
    }
  }

  if (!contactBackendConfigured) return <BackendFallback />;

  return (
    <form className="ct-form" onSubmit={onSubmit}>
      <div className="ct-field">
        <label htmlFor="contact-reason">Reason <span aria-hidden="true">*</span></label>
        <select id="contact-reason" required value={reason} onChange={(event) => setReason(event.target.value as ContactReason)}>
          {contactReasons.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
        {route && <div className="ct-route-hint"><route.icon size={16} aria-hidden="true" /><span>This topic has a dedicated route.</span><Link href={route.href}>{route.label} <ArrowRight size={13} /></Link></div>}
      </div>
      <div className="ct-two-cols">
        <div className="ct-field"><label htmlFor="contact-name">Name <span aria-hidden="true">*</span></label><input id="contact-name" autoComplete="name" required minLength={2} maxLength={contactConfig.limits.nameMaxLength} value={name} onChange={(event) => setName(event.target.value)} /></div>
        <div className="ct-field"><label htmlFor="contact-email">Email <span aria-hidden="true">*</span></label><input id="contact-email" type="email" autoComplete="email" required maxLength={contactConfig.limits.emailMaxLength} value={email} onChange={(event) => setEmail(event.target.value)} /></div>
      </div>
      <div className="ct-field"><label htmlFor="contact-reference">Order / Request Reference <span>Optional</span></label><input id="contact-reference" maxLength={contactConfig.limits.referenceMaxLength} value={orderReference} onChange={(event) => setOrderReference(event.target.value)} aria-describedby="contact-reference-help" /><small id="contact-reference-help">Use this only if your question relates to an existing order or request. Never submit passwords, OTPs or card details.</small></div>
      <div className="ct-field"><label htmlFor="contact-message">Message <span aria-hidden="true">*</span></label><textarea id="contact-message" required minLength={contactConfig.limits.messageMinLength} maxLength={contactConfig.limits.messageMaxLength} rows={7} value={message} onChange={(event) => setMessage(event.target.value)} /><small>{message.length}/{contactConfig.limits.messageMaxLength} characters</small></div>
      <div className="ct-honeypot" aria-hidden="true"><label htmlFor="contact-website">Website</label><input id="contact-website" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} /></div>
      <p className="ct-privacy-note">Submitted information is used only to review and respond to this enquiry under the site&apos;s applicable privacy practices. Marketing consent is not bundled with this form.</p>
      <Button type="submit" disabled={state === 'submitting'}>{state === 'submitting' ? 'Submitting…' : <>Submit Enquiry <Send size={15} /></>}</Button>
      {state !== 'idle' && state !== 'submitting' && <div ref={feedbackRef} tabIndex={-1} className={`ct-form-feedback ${state === 'success' ? 'is-success' : 'is-error'}`} role={state === 'error' ? 'alert' : 'status'}>{state === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}<div><strong>{feedback}</strong>{publicReference && <p>Reference: <code>{publicReference}</code></p>}{state === 'error' && <a href={`mailto:${contactConfig.publicEmail}?subject=${encodeURIComponent('ESHANTVA Website Enquiry')}`}>Email fallback</a>}</div></div>}
    </form>
  );
}

export function AppointmentRequestForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [purpose, setPurpose] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredPeriod, setPreferredPeriod] = useState<AppointmentSubmission['preferredPeriod']>('morning');
  const [specificTime, setSpecificTime] = useState('');
  const [orderReference, setOrderReference] = useState('');
  const [notes, setNotes] = useState('');
  const [website, setWebsite] = useState('');
  const [state, setState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [feedback, setFeedback] = useState('');
  const [publicReference, setPublicReference] = useState('');
  const feedbackRef = useRef<HTMLDivElement>(null);
  const minDate = useMemo(() => localToday(), []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!contactBackendConfigured || state === 'submitting') return;
    setState('submitting'); setFeedback(''); setPublicReference('');
    try {
      const submission: AppointmentSubmission = { name, email, purpose, preferredDate, preferredPeriod, specificTime, orderReference, notes, website };
      const result = await submitAppointmentRequest(submission);
      setPublicReference(result.publicReference);
      setState('success');
      setFeedback('Your visit request was submitted for review. This does not confirm an appointment; ESHANTVA will confirm availability separately.');
      setName(''); setEmail(''); setPurpose(''); setPreferredDate(''); setPreferredPeriod('morning'); setSpecificTime(''); setOrderReference(''); setNotes(''); setWebsite('');
    } catch (error) {
      setState('error');
      setFeedback(error instanceof Error ? error.message : 'We could not submit this appointment request. Please try again or contact us by email.');
    } finally {
      requestAnimationFrame(() => feedbackRef.current?.focus());
    }
  }

  if (!contactBackendConfigured) return <BackendFallback appointment />;

  return (
    <form className="ct-form" onSubmit={onSubmit}>
      <div className="ct-two-cols">
        <div className="ct-field"><label htmlFor="appointment-name">Name <span aria-hidden="true">*</span></label><input id="appointment-name" autoComplete="name" required minLength={2} maxLength={contactConfig.limits.nameMaxLength} value={name} onChange={(event) => setName(event.target.value)} /></div>
        <div className="ct-field"><label htmlFor="appointment-email">Email <span aria-hidden="true">*</span></label><input id="appointment-email" type="email" autoComplete="email" required maxLength={contactConfig.limits.emailMaxLength} value={email} onChange={(event) => setEmail(event.target.value)} /></div>
      </div>
      <div className="ct-field"><label htmlFor="appointment-purpose">Reason for visit <span aria-hidden="true">*</span></label><input id="appointment-purpose" required minLength={3} maxLength={240} value={purpose} onChange={(event) => setPurpose(event.target.value)} /></div>
      <div className="ct-two-cols">
        <div className="ct-field"><label htmlFor="appointment-date">Preferred date <span aria-hidden="true">*</span></label><input id="appointment-date" type="date" required min={minDate} value={preferredDate} onChange={(event) => setPreferredDate(event.target.value)} /></div>
        <div className="ct-field"><label htmlFor="appointment-period">Preferred time / window <span aria-hidden="true">*</span></label><select id="appointment-period" required value={preferredPeriod} onChange={(event) => setPreferredPeriod(event.target.value as AppointmentSubmission['preferredPeriod'])}><option value="morning">Morning</option><option value="afternoon">Afternoon</option><option value="evening">Evening</option><option value="specific_time">Specific time</option></select></div>
      </div>
      {preferredPeriod === 'specific_time' && <div className="ct-field"><label htmlFor="appointment-specific-time">Specific preferred time <span aria-hidden="true">*</span></label><input id="appointment-specific-time" type="time" required value={specificTime} onChange={(event) => setSpecificTime(event.target.value)} /><small>This is a preference only and does not imply business hours or availability.</small></div>}
      <div className="ct-field"><label htmlFor="appointment-reference">Order / Request Reference <span>Optional</span></label><input id="appointment-reference" maxLength={contactConfig.limits.referenceMaxLength} value={orderReference} onChange={(event) => setOrderReference(event.target.value)} /></div>
      <div className="ct-field"><label htmlFor="appointment-notes">Notes <span>Optional</span></label><textarea id="appointment-notes" rows={5} maxLength={contactConfig.limits.appointmentNotesMaxLength} value={notes} onChange={(event) => setNotes(event.target.value)} /></div>
      <div className="ct-honeypot" aria-hidden="true"><label htmlFor="appointment-website">Website</label><input id="appointment-website" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} /></div>
      <div className="ct-appointment-notice"><CalendarClock size={20} aria-hidden="true" /><p><strong>Request ≠ confirmed appointment.</strong> ESHANTVA will review the preferred date/time and confirm the visit separately.</p></div>
      <p className="ct-privacy-note">Submitted information is used only to review and respond to this appointment request.</p>
      <Button type="submit" disabled={state === 'submitting'}>{state === 'submitting' ? 'Submitting…' : <>Submit Appointment Request <Send size={15} /></>}</Button>
      {state !== 'idle' && state !== 'submitting' && <div ref={feedbackRef} tabIndex={-1} className={`ct-form-feedback ${state === 'success' ? 'is-success' : 'is-error'}`} role={state === 'error' ? 'alert' : 'status'}>{state === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}<div><strong>{feedback}</strong>{publicReference && <p>Reference: <code>{publicReference}</code></p>}{state === 'error' && <a href={`mailto:${contactConfig.publicEmail}?subject=${encodeURIComponent('ESHANTVA Website Appointment Request')}`}>Email fallback</a>}</div></div>}
    </form>
  );
}
