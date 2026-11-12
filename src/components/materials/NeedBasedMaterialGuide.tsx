import Link from 'next/link';
import { ArrowDownRight, Flame, HelpCircle, Palette, ShieldQuestion, Sparkles, Waves } from 'lucide-react';
import { materialNeeds } from '@/data/materials';
import type { MaterialNeed } from '@/types/material';

const icons = { everyday: Sparkles, heat: Flame, flexibility: Waves, appearance: Palette, outdoor: ShieldQuestion, unsure: HelpCircle } satisfies Record<MaterialNeed['icon'], typeof Sparkles>;

export function NeedBasedMaterialGuide() {
  return <section id="choose-by-need" className="mt-needs section" aria-labelledby="material-needs-heading"><div className="shell">
    <div className="mt-section-heading"><div><span>01</span><span className="section-kicker">CHOOSE BY NEED</span><h2 id="material-needs-heading">What matters most for your product?</h2></div><p>Start with the outcome or use condition. The final material choice still depends on the complete product requirement.</p></div>
    <div className="mt-needs-grid">{materialNeeds.map((need) => { const Icon = icons[need.icon]; return <Link key={need.id} className="mt-need-card" href={need.href}><header><b>{need.index}</b><Icon size={23} aria-hidden="true" /></header><div><h3>{need.title}</h3><p>{need.description}</p></div><footer><span>{need.nextStep}</span><ArrowDownRight size={17} aria-hidden="true" /></footer></Link>; })}</div>
  </div></section>;
}
