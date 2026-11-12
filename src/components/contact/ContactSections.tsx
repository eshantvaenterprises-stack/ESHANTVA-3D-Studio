import Link from 'next/link';
import { ArrowRight, CalendarClock, CheckCircle2, Mail, MapPin, Route, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { businessIdentity } from '@/config/businessIdentity';
import { contactConfig } from '@/config/contact';
import { siteConfig } from '@/config/site';
import { businessContactUses, contactRouteCards, contactTrustNotes, visitExpectations } from '@/data/contact';
import { AppointmentRequestForm, ContactRequestForm } from './ContactForms';

export function ContactHero() {
  return <section className="ct-hero" aria-labelledby="contact-page-heading"><div className="shell ct-hero-grid"><div><span className="section-kicker">CONTACT &amp; APPOINTMENT</span><h1 id="contact-page-heading">Get in touch through the right route.</h1><p>Questions, appointment requests and general business enquiries can begin here. Custom production and bulk requirements have dedicated pathways so the right information reaches the right workflow.</p><div className="ct-hero-actions"><Button to="#contact-form">General Enquiry <ArrowRight size={15} /></Button><Button to="#appointment" variant="secondary">Request a Visit</Button></div></div><aside className="ct-hero-note"><Route size={28} aria-hidden="true" /><span>RIGHT ROUTE, RIGHT INFORMATION</span><strong>General contact stays simple. Technical and bulk requirements keep their dedicated workflows.</strong><p>Share only the information needed for a useful reply.</p></aside></div></section>;
}

export function ContactRoutes() {
  return <section className="section ct-routes" aria-labelledby="ct-routes-heading"><div className="shell"><div className="ct-section-heading"><div><span className="section-kicker">CHOOSE THE RIGHT ROUTE</span><h2 id="ct-routes-heading">Start where your question belongs.</h2></div><p>Using the dedicated route keeps product, custom and bulk information attached to the correct workflow.</p></div><div className="ct-route-grid">{contactRouteCards.map(({ label, description, href, icon: Icon }) => <Link key={label} href={href}><Icon size={24} aria-hidden="true" /><strong>{label}</strong><p>{description}</p><span>Continue <ArrowRight size={14} /></span></Link>)}</div></div></section>;
}

export function ContactOptions() {
  const subject = encodeURIComponent('ESHANTVA Website Enquiry');
  return <section className="section-dark ct-options" aria-labelledby="ct-options-heading"><div className="shell ct-options-grid"><div><span className="section-kicker">CONTACT OPTIONS</span><h2 id="ct-options-heading">Choose the public contact route that fits your enquiry.</h2><p>Use the verified business email for general and non-urgent enquiries.</p></div><article className="ct-email-card"><Mail size={25} aria-hidden="true" /><small>PUBLIC BUSINESS EMAIL</small><a href={`mailto:${contactConfig.publicEmail}?subject=${subject}`}>{contactConfig.publicEmail}</a><ul>{businessContactUses.map((item) => <li key={item}><CheckCircle2 size={14} />{item}</li>)}</ul><p>Choose a dedicated Custom or Bulk route when more structured information is needed.</p></article></div></section>;
}

export function ContactFormSection() {
  return <section className="section ct-form-section" id="contact-form" aria-labelledby="ct-form-heading"><div className="shell ct-form-layout"><div className="ct-form-intro"><span className="section-kicker">GENERAL CONTACT</span><h2 id="ct-form-heading">Send a focused enquiry.</h2><p>Use this form for general questions, business enquiries or an existing-request query. For project files, detailed custom requirements or bulk specifications, use the dedicated forms instead.</p>{contactTrustNotes.map(({ title, description, icon: Icon }) => <article key={title}><Icon size={20} aria-hidden="true" /><div><strong>{title}</strong><p>{description}</p></div></article>)}</div><div className="ct-form-card"><ContactRequestForm /></div></div></section>;
}

export function AppointmentSection() {
  return <section className="section ct-appointment" id="appointment" aria-labelledby="ct-appointment-heading"><div className="shell ct-form-layout"><div className="ct-form-intro"><CalendarClock size={28} aria-hidden="true" /><span className="section-kicker">REQUEST A VISIT</span><h2 id="ct-appointment-heading">Choose a preferred date. ESHANTVA confirms it separately.</h2><p>There are no published fixed opening hours. Visits are arranged by prior appointment, and availability is confirmed after the request is reviewed.</p></div><div className="ct-form-card"><AppointmentRequestForm /></div></div></section>;
}

export function LocationSection() {
  return <section className="section-dark ct-location" aria-labelledby="ct-location-heading"><div className="shell"><div className="ct-section-heading ct-section-heading-dark"><div><span className="section-kicker">LOCATION</span><h2 id="ct-location-heading">Based in Biswanath, Assam.</h2></div><p>Use the map for navigation context when planning an appointment.</p></div><div className="ct-location-grid"><div className="ct-map-wrap"><iframe src={siteConfig.mapEmbedUrl} loading="lazy" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" title="ESHANTVA location map" /></div><aside><MapPin size={25} aria-hidden="true" /><small>PUBLIC LOCATION</small><strong>{businessIdentity.publicLocation}</strong><p>Visits are arranged by prior appointment. The customer-facing service is ESHANTVA 3D Studio.</p></aside></div></div></section>;
}

export function VisitExpectations() {
  return <section className="section ct-visit" aria-labelledby="ct-visit-heading"><div className="shell ct-visit-grid"><div><span className="section-kicker">BEFORE YOU VISIT</span><h2 id="ct-visit-heading">A visit starts with confirmation, not assumption.</h2></div><ul>{visitExpectations.map((item) => <li key={item}><CheckCircle2 size={17} aria-hidden="true" />{item}</li>)}</ul></div></section>;
}

export function ContactIdentity() {
  return <section className="section ct-identity" aria-labelledby="ct-identity-heading"><div className="shell ct-identity-grid"><div><ShieldCheck size={28} aria-hidden="true" /><span className="section-kicker">VERIFIED BUSINESS IDENTITY</span><h2 id="ct-identity-heading">Business details stay consistent across the site.</h2><p>The shared site identity provides the verified trade name, business type, GST status and public location.</p></div><dl><div><dt>Trade name</dt><dd>{businessIdentity.tradeName}</dd></div><div><dt>Business type</dt><dd>{businessIdentity.constitution}</dd></div><div><dt>GST status</dt><dd>{businessIdentity.gstRegistered ? 'Registered' : 'Not registered'}</dd></div><div><dt>Public location</dt><dd>{businessIdentity.publicLocation}</dd></div></dl></div></section>;
}

export function ContactFinalCta() {
  return <section className="shell ct-final" aria-labelledby="ct-final-heading"><div><span className="section-kicker">NEED MORE CONTEXT?</span><h2 id="ct-final-heading">Read the answer, choose the route, then send only what is needed.</h2><p>The FAQ covers common questions, while Custom Order and Bulk Order collect requirement-specific information.</p></div><div><Button to="/faq">Browse FAQ</Button><Button to="/how-it-works" variant="secondary">See How It Works</Button></div></section>;
}
