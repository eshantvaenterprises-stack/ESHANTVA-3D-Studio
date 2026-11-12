import { ArrowRight, Box } from 'lucide-react';
import { Button } from '../ui/Button';
import { retailVisibility } from '@/config/retailVisibility';

export function FinalCTA() {
  return (
    <section className="final-cta shell">
      <div className="final-cta-mark" aria-hidden="true"><Box size={70} strokeWidth={1} /></div>
      <div><span className="section-kicker">START HERE</span><h2>Have something in mind?</h2><p>{retailVisibility.isInternal ? 'Browse ready designs or send your requirement for review.' : 'Send a custom requirement, plan a bulk need or securely track an existing order.'}</p></div>
      <div className="final-actions"><Button to="/custom-order">Start a Custom Order <ArrowRight size={17} /></Button><Button to={retailVisibility.isInternal ? '/shop' : '/bulk-order'} variant="secondary">{retailVisibility.isInternal ? 'Browse Products' : 'Bulk Order'}</Button>{!retailVisibility.isInternal && <Button to="/track-order" variant="secondary">Track Order</Button>}</div>
    </section>
  );
}
