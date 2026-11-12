import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { footerNavigation } from '../../data/navigation';
import { businessIdentity, getPublicBusinessIdentityLine } from '../../config/businessIdentity';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-main shell">
        <div className="footer-brand">
          <Link href="/" className="wordmark wordmark-light">
            <span>ESHANTVA</span><small>3D STUDIO</small>
          </Link>
          <p>Custom 3D printing, personalised products and reviewed production requests.</p>
          <div className="footer-legal-identity" aria-label="Business identity">
            <strong>{businessIdentity.tradeName}</strong>
            <span>{getPublicBusinessIdentityLine()}</span>
            <span>{businessIdentity.publicLocation}</span>
          </div>
        </div>
        {Object.entries(footerNavigation).map(([title, links]) => (
          <div className="footer-column" key={title}>
            <h3>{title}</h3>
            {links.map((link) => (
              <Link key={link.href} href={link.href}>{link.label}</Link>
            ))}
          </div>
        ))}
      </div>
      <div className="footer-bottom shell">
        <span>© {new Date().getFullYear()} ESHANTVA 3D Studio.</span>
        <span>Biswanath · Assam <ArrowUpRight size={14} aria-hidden="true" /></span>
      </div>
    </footer>
  );
}
