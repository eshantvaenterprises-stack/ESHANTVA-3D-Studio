import { ArrowDown, ArrowRight } from 'lucide-react';
import { pathToProduct } from '@/data/pathToProduct';

export function PathToProduct() {
  return (
    <section className="sv-path section-dark" aria-labelledby="path-heading">
      <div className="shell">
        <div className="sv-section-title sv-section-title-dark"><span>02</span><div><span className="section-kicker">ESHANTVA PATH-TO-PRODUCT</span><h2 id="path-heading">From where you are to what you need.</h2></div><p>A practical route from available information to an accepted physical result.</p></div>
        <ol className="sv-path-list">
          {pathToProduct.map((item, index) => <li key={item.step}>
            <div className="sv-path-node"><small>{item.step}</small><b>{item.title}</b></div>
            <p>{item.description}</p>
            {index < pathToProduct.length - 1 && <span className="sv-path-arrow"><ArrowRight className="sv-arrow-desktop" size={18} /><ArrowDown className="sv-arrow-mobile" size={18} /></span>}
          </li>)}
        </ol>
        <p className="sv-path-note">The exact workflow may vary depending on the product or request. Custom and complex requirements are reviewed before production is confirmed.</p>
      </div>
    </section>
  );
}
