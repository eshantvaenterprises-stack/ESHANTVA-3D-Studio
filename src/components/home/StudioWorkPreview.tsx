import { Aperture, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function StudioWorkPreview() {
  return (
    <section className="section work-section">
      <div className="section-heading shell">
        <div><span className="section-kicker">PORTFOLIO / COMING AFTER LAUNCH</span><h2>From the Studio</h2></div>
        <p>Actual ESHANTVA project photography will appear here after production begins.</p>
      </div>
      {/* REPLACE ABSTRACT PLACEHOLDERS WITH ACTUAL ESHANTVA PROJECT PHOTOGRAPHY BEFORE LAUNCH */}
      <div className="work-grid shell">
        {[1, 2, 3].map((item) => (
          <div className={`work-placeholder work-${item}`} key={item}>
            <Aperture size={29} /><span>PROJECT IMAGE<br />PLACEHOLDER {String(item).padStart(2, '0')}</span>
          </div>
        ))}
      </div>
      <div className="section-action shell"><Link className="text-link" href="/our-work">View studio page <ArrowRight size={16} /></Link></div>
    </section>
  );
}
