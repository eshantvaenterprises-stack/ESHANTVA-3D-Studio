import Link from 'next/link';
import { AlertTriangle, ArrowLeft, FileText } from 'lucide-react';
import type { LegalPolicy } from '@/data/legalPolicies';

export function LegalPolicyPage({ policy }: { policy: LegalPolicy }) {
  return <main className="legal-page shell">
    <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/policies">Policies</Link><span>/</span><span aria-current="page">{policy.title}</span></nav>
    <header className="legal-header"><FileText size={34} aria-hidden="true" /><span className="section-kicker">LEGAL FOUNDATION</span><h1>{policy.title}</h1><p>{policy.summary}</p><dl><div><dt>Version</dt><dd>{policy.version}</dd></div><div><dt>Last updated</dt><dd>{policy.lastUpdated}</dd></div></dl></header>
    {policy.status === 'review_required' && <aside className="legal-review" role="note"><AlertTriangle size={20} /><div><strong>Draft for owner and legal review</strong><p>This policy architecture is implemented, but publication requires the controlled decisions listed below. It is currently noindex.</p></div></aside>}
    <div className="legal-body">{policy.sections.map((section) => <section key={section.heading}><h2>{section.heading}</h2>{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}{section.bullets && <ul>{section.bullets.map((item) => <li key={item}>{item}</li>)}</ul>}</section>)}</div>
    <section className="legal-decisions"><h2>Owner decisions before publication</h2><ul>{policy.ownerDecisions.map((decision) => <li key={decision}>{decision}</li>)}</ul></section>
    <Link className="text-link" href="/policies"><ArrowLeft size={16} /> All policies</Link>
  </main>;
}
