import { ArrowRight, Camera, Play, ScanLine } from 'lucide-react';
import Link from 'next/link';

export function VerificationFeature() {
  return (
    <section className="verification-section shell">
      <div className="verification-art" aria-hidden="true">
        <span className="scan-corner top-left" /><span className="scan-corner top-right" />
        <span className="scan-corner bottom-left" /><span className="scan-corner bottom-right" />
        <div className="verification-object"><ScanLine size={42} /></div>
        <div className="verification-controls"><Camera size={18} /><Play size={17} /></div>
      </div>
      <div className="verification-copy">
        <span className="section-kicker">OPTIONAL ORDER FEATURE</span>
        <h2>Want to see the finished item before dispatch?</h2>
        <p>Selected custom orders may request photo or video verification of the completed product before dispatch.</p>
        <small>Additional charges may apply depending on the order.</small>
        <Link className="text-link" href="/custom-order">Learn About Custom Orders <ArrowRight size={16} /></Link>
      </div>
    </section>
  );
}
