import { ArrowRight, MapPin } from 'lucide-react';
import { siteConfig } from '../../config/site';
import { Button } from '../ui/Button';

export function LocalServiceSection() {
  return (
    <section className="local-section">
      <div className="local-inner shell">
        <div className="local-map">
          <iframe
            src={siteConfig.mapEmbedUrl}
            title="ESHANTVA 3D Studio public service area in Biswanath, Assam"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
          <div className="map-location-card">
            <MapPin size={18} aria-hidden="true" />
            <span>
              <strong>BISWANATH · ASSAM</strong>
              <small>India</small>
            </span>
          </div>
        </div>
        <div className="local-copy">
          <span className="section-kicker">LOCAL ROOTS / ONLINE REACH</span>
          <h2>Made in Biswanath.<br />Available beyond it.</h2>
          <p>Online orders can be shipped across India. Local customers may request an appointment for consultation, ordering or pickup.</p>
          <div className="local-actions">
            <Button to="/contact/#appointment">Request an Appointment</Button>
            <a
              className="button button-secondary"
              href={siteConfig.directionsUrl}
              target="_blank"
              rel="noreferrer"
            >
              Get Directions <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
