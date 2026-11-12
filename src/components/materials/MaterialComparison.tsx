import { enabledPublicMaterials } from '@/data/materials';
import { getPublicMaterialAvailability } from '@/lib/publicMaterialAvailability';
import { MaterialStatusBadge } from './MaterialStatusBadge';

export function MaterialComparison() {
  return <section className="mt-comparison section" aria-labelledby="material-comparison-heading"><div className="shell"><div className="mt-section-heading"><div><span>04</span><span className="section-kicker">QUICK COMPARISON</span><h2 id="material-comparison-heading">Compare without the technical overload.</h2></div><p>Use this qualitative view as a starting point, not as certified engineering data.</p></div>
    <div className="mt-comparison-table" role="region" aria-label="Material comparison" tabIndex={0}><table><thead><tr><th>Material</th><th>Good for</th><th>Flexibility</th><th>Heat context</th><th>Typical use</th><th>Availability</th></tr></thead><tbody>{enabledPublicMaterials.map((material) => <tr key={material.id}><th scope="row">{material.name}</th><td>{material.bestFor.slice(0, 2).join(' · ')}</td><td>{material.flexibility}</td><td>{material.heatSuitability}</td><td>{material.typicalUse}</td><td><MaterialStatusBadge availability={getPublicMaterialAvailability(material)} /></td></tr>)}</tbody></table></div>
    <div className="mt-comparison-cards">{enabledPublicMaterials.map((material) => <article key={material.id}><h3>{material.name}</h3><dl><div><dt>Good for</dt><dd>{material.bestFor.slice(0, 2).join(' · ')}</dd></div><div><dt>Flexibility</dt><dd>{material.flexibility}</dd></div><div><dt>Heat context</dt><dd>{material.heatSuitability}</dd></div><div><dt>Typical use</dt><dd>{material.typicalUse}</dd></div></dl><MaterialStatusBadge availability={getPublicMaterialAvailability(material)} /></article>)}</div>
    <p className="mt-comparison-note">Material suitability depends on product design, environment and intended use. Custom or functional requirements should be reviewed before production.</p>
  </div></section>;
}
