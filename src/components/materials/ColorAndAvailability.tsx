import { CircleHelp, Eye, Layers3 } from 'lucide-react';
import { enabledPublicColors, publicMaterialStatusDescriptions, publicMaterialStatusLabels } from '@/data/materials';
import { siteConfig } from '@/config/site';
import { getPublicMaterialAvailability } from '@/lib/publicMaterialAvailability';
import type { PublicMaterialStatus } from '@/types/material';
import { MaterialStatusBadge } from './MaterialStatusBadge';

const statuses: PublicMaterialStatus[] = ['available', 'limited', 'on_request', 'unavailable'];

export function ColorOptions() {
  if (!siteConfig.features.materials.colorAvailabilityEnabled) return null;
  return <section className="mt-colours section" aria-labelledby="colour-options-heading"><div className="shell mt-colours-grid"><div><span className="section-kicker">COLOUR / APPEARANCE</span><h2 id="colour-options-heading">Colour choices belong to the product.</h2><p>Colour choices depend on the product and material. These examples show how appearance options will be labelled; they are not live choices.</p><div className="mt-colour-boundary"><Eye size={18} aria-hidden="true" /><span>Product pages remain the source for configured customer choices.</span></div></div>
    <div className="mt-swatch-grid" aria-label="Development appearance examples">{enabledPublicColors.map((color) => <article className="mt-swatch" key={color.id}><span className="mt-swatch-colour" style={{ backgroundColor: color.swatch }} aria-hidden="true" /><div><strong>{color.name}</strong><small>{color.developmentPlaceholder ? 'Illustrative example — not a live option' : 'Customer-facing colour option'}</small><MaterialStatusBadge availability={getPublicMaterialAvailability(color)} /></div></article>)}</div>
  </div></section>;
}

export function AvailabilityGuide() {
  return <section className="mt-availability section-dark" aria-labelledby="availability-guide-heading"><div className="shell"><div className="mt-section-heading mt-section-heading-dark"><div><span>03</span><span className="section-kicker">PUBLIC AVAILABILITY</span><h2 id="availability-guide-heading">Simple status. Clear next step.</h2></div><p>When live availability is connected, each option will show whether it can be requested or needs confirmation.</p></div><div className="mt-availability-grid">{statuses.map((status) => <article key={status} className={`mt-availability-card mt-availability-${status}`}><header><Layers3 size={20} aria-hidden="true" /><h3>{publicMaterialStatusLabels[status]}</h3></header><p>{publicMaterialStatusDescriptions[status]}</p></article>)}</div><p className="mt-status-boundary"><CircleHelp size={16} aria-hidden="true" />Until live availability is shown, material and colour choices are confirmed with the applicable product or request.</p></div></section>;
}
