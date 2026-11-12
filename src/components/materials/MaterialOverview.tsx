import Link from 'next/link';
import { ArrowRight, Check, Info } from 'lucide-react';
import { enabledPublicMaterials } from '@/data/materials';
import { getPublicMaterialAvailability } from '@/lib/publicMaterialAvailability';
import { MaterialStatusBadge } from './MaterialStatusBadge';

export function MaterialOverview() {
  return <section className="mt-overview section" aria-labelledby="material-overview-heading"><div className="shell">
    <div className="mt-section-heading"><div><span>02</span><span className="section-kicker">MATERIAL GUIDE</span><h2 id="material-overview-heading">Broad choices, explained practically.</h2></div><p>These categories are customer guidance. Listing a material does not mean it is suitable or immediately available for every product.</p></div>
    <div className="mt-material-list">{enabledPublicMaterials.map((material, index) => <article id={material.id} className="mt-material-card" key={material.id}>
      <div className="mt-material-title"><span>0{index + 1}</span><MaterialStatusBadge availability={getPublicMaterialAvailability(material)} /><h3>{material.name}</h3><p>{material.shortDescription}</p></div>
      <div className="mt-material-details"><div><strong>May suit</strong><ul>{material.bestFor.map((item) => <li key={item}><Check size={14} aria-hidden="true" />{item}</li>)}</ul></div><div><strong>Consider</strong><ul>{material.considerations.map((item) => <li key={item}><Info size={14} aria-hidden="true" />{item}</li>)}</ul></div></div>
      <Link className="text-link" href="/custom-order">Discuss this requirement <ArrowRight size={15} /></Link>
    </article>)}</div>
    <p className="mt-availability-note">Availability may vary by product, colour and current production requirements.</p>
  </div></section>;
}
