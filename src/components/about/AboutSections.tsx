import { retailVisibility } from '@/config/retailVisibility';
import Link from 'next/link';
import {
  ArrowDown,
  ArrowRight,
  CheckCircle2,
  CircleDot,
  MapPin,
  MoveRight,
  PackageCheck,
  Route,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { businessIdentity } from '@/config/businessIdentity';
import {
  aboutAudiences,
  aboutRouteCards,
  aboutStartingPoints,
  aboutTrustPoints,
  clearExpectations,
  ecosystemNeeds,
  innovationSteps,
  prototypeValues,
} from '@/data/about';

export function AboutHero() {
  return (
    <section className="ab-hero" aria-labelledby="about-page-heading">
      <div className="shell ab-hero-grid">
        <div>
          <span className="section-kicker">ABOUT ESHANTVA</span>
          <h1 id="about-page-heading">Ideas deserve a practical first step.</h1>
          <p>Whether you start with a product need, drawing, reference, file or an early idea, ESHANTVA helps identify a practical route toward a selected physical result.</p>
          <div className="ab-hero-actions">
            <Button to="/custom-order">Start a Custom Order <ArrowRight size={15} /></Button>
            <Button to="/services" variant="secondary">Explore Services</Button>
            <Link className="text-link" href="/how-it-works">See How It Works <ArrowRight size={14} /></Link>
          </div>
        </div>
        <aside className="ab-hero-signal" aria-label="ESHANTVA brand direction">
          <span>FROM IDEA TO PHYSICAL PRODUCT.</span>
          <div className="ab-signal-flow" aria-hidden="true">
            <div><small>START</small><strong>IDEA / FILE / NEED</strong></div>
            <MoveRight size={24} />
            <div><small>PATH</small><strong>ESHANTVA</strong></div>
            <MoveRight size={24} />
            <div><small>RESULT</small><strong>PHYSICAL FORM</strong></div>
          </div>
          <p>The route depends on what you already have and what the requirement actually needs.</p>
        </aside>
      </div>
    </section>
  );
}

export function PurposeSection() {
  return (
    <section className="section ab-purpose" aria-labelledby="ab-purpose-heading">
      <div className="shell ab-purpose-grid">
        <div>
          <span className="section-kicker">WHY ESHANTVA EXISTS</span>
          <h2 id="ab-purpose-heading">Making the first physical step easier to approach.</h2>
        </div>
        <div className="ab-purpose-copy">
          <p>An idea can stay abstract when the next practical step is unclear. Turning it into a physical version can involve choosing an appropriate route, communicating the requirement and deciding what should be checked before moving further.</p>
          <p>ESHANTVA is being built around making selected custom-production and prototyping pathways easier to understand and access. It does not promise that every idea can be manufactured or that one studio can cover the entire innovation journey.</p>
          <blockquote>Give the idea a physical starting point, then learn from what that first version makes visible.</blockquote>
        </div>
      </div>
    </section>
  );
}

export function StartingPointSection() {
  return (
    <section className="section-dark ab-start" aria-labelledby="ab-start-heading">
      <div className="shell">
        <div className="ab-section-heading ab-section-heading-dark">
          <div><span className="section-kicker">START WITH WHAT YOU HAVE</span><h2 id="ab-start-heading">You do not need everything figured out before you begin.</h2></div>
          <p>A starting point is information, not a promise of acceptance. ESHANTVA reviews the route that best fits the requirement.</p>
        </div>
        <div className="ab-start-grid">
          {aboutStartingPoints.map(({ label, icon: Icon }, index) => (
            <article key={label}><span>{String(index + 1).padStart(2, '0')}</span><Icon size={23} aria-hidden="true" /><strong>{label}</strong></article>
          ))}
        </div>
        <div className="ab-start-route" aria-label="ESHANTVA starting point to result pathway">
          <div><small>MANY STARTING POINTS</small><strong>WHAT YOU ALREADY HAVE</strong></div>
          <ArrowDown className="ab-flow-mobile" size={22} aria-hidden="true" />
          <MoveRight className="ab-flow-desktop" size={28} aria-hidden="true" />
          <div className="is-accent"><small>ESHANTVA PATH</small><strong>REVIEW THE PRACTICAL ROUTE</strong></div>
          <ArrowDown className="ab-flow-mobile" size={22} aria-hidden="true" />
          <MoveRight className="ab-flow-desktop" size={28} aria-hidden="true" />
          <div><small>SELECTED OUTCOME</small><strong>PHYSICAL RESULT</strong></div>
        </div>
      </div>
    </section>
  );
}

export function AudienceSection() {
  return (
    <section className="section ab-audiences" aria-labelledby="ab-audiences-heading">
      <div className="shell">
        <div className="ab-section-heading">
          <div><span className="section-kicker">WHO ESHANTVA IS BUILT FOR</span><h2 id="ab-audiences-heading">Different people can begin from different levels of readiness.</h2></div>
          <p>The useful question is not whether you already have a production-ready file. It is what you are trying to make, examine or improve.</p>
        </div>
        <div className="ab-audience-grid">
          {aboutAudiences.map(({ id, eyebrow, title, description, examples, icon: Icon }, index) => (
            <article key={id} id={`about-${id}`}>
              <header><span>{String(index + 1).padStart(2, '0')}</span><Icon size={25} aria-hidden="true" /></header>
              <small>{eyebrow}</small>
              <h3>{title}</h3>
              <p>{description}</p>
              <ul>{examples.map((item) => <li key={item}><CircleDot size={10} aria-hidden="true" />{item}</li>)}</ul>
              {id === 'businesses' && <div className="ab-audience-actions"><Button to="/custom-order" variant="secondary">Start a Custom Order</Button><Link className="text-link" href="/bulk-order">Bulk Requirement <ArrowRight size={14} /></Link></div>}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function InnovationJourney() {
  return (
    <section className="section-dark ab-innovation" aria-labelledby="ab-innovation-heading">
      <div className="shell">
        <div className="ab-section-heading ab-section-heading-dark">
          <div><span className="section-kicker">FROM IDEA TO FIRST PHYSICAL VERSION</span><h2 id="ab-innovation-heading">Think. Build. Check. Improve.</h2></div>
          <p>This compact loop explains iteration. It does not replace ESHANTVA&apos;s main Start → Define → Prepare → Review → Produce → Deliver customer journey.</p>
        </div>
        <ol className="ab-innovation-grid">
          {innovationSteps.map((item, index) => (
            <li key={item.step}><span>{item.step}</span><strong>{item.label}</strong><p>{item.description}</p>{index < innovationSteps.length - 1 && <MoveRight size={21} aria-hidden="true" />}</li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function PrototypeValueSection() {
  return (
    <section className="section ab-prototype" aria-labelledby="ab-prototype-heading">
      <div className="shell">
        <div className="ab-section-heading">
          <div><span className="section-kicker">WHAT A PHYSICAL PROTOTYPE CAN HELP EXPLORE</span><h2 id="ab-prototype-heading">A first version can make the next question easier to see.</h2></div>
          <p>A physical prototype may help examine form, selected dimensions, fit, layout, enclosure and geometry. It does not by itself prove structural safety, certification, lifetime or final-production suitability.</p>
        </div>
        <div className="ab-prototype-grid">
          {prototypeValues.map(({ title, description, icon: Icon }) => <article key={title}><Icon size={24} aria-hidden="true" /><h3>{title}</h3><p>{description}</p></article>)}
        </div>
        <div className="ab-prototype-guard"><ShieldCheck size={23} aria-hidden="true" /><p><strong>Prototype ≠ certification.</strong> Formal safety, compliance or performance claims require the appropriate testing, standards and professional expertise beyond a visual or dimensional prototype.</p></div>
      </div>
    </section>
  );
}

export function LocalAccessSection() {
  return (
    <section className="ab-local" aria-labelledby="ab-local-heading">
      <div className="shell ab-local-grid">
        <div>
          <MapPin size={31} aria-hidden="true" />
          <span className="section-kicker">INNOVATION CAN BEGIN ANYWHERE</span>
          <h2 id="ab-local-heading">Based in Biswanath, Assam.</h2>
          <p>A classroom, home workspace, small business, independent project or institution can all be starting points. ESHANTVA aims to provide a practical local and online route for selected 3D production and prototype-related requirements.</p>
        </div>
        <aside>
          <strong>A practical local option.</strong>
          <p>A more local route can reduce some of the friction involved in discussing and sourcing selected custom parts or prototypes from distant providers, without promising to be cheaper or faster than every alternative.</p>
          <Link href="/how-it-works">See the customer path <ArrowRight size={14} /></Link>
        </aside>
      </div>
    </section>
  );
}

export function EcosystemSection() {
  return (
    <section className="section ab-ecosystem" aria-labelledby="ab-ecosystem-heading">
      <div className="shell ab-ecosystem-grid">
        <div>
          <Route size={31} aria-hidden="true" />
          <span className="section-kicker">PART OF A WIDER ECOSYSTEM</span>
          <h2 id="ab-ecosystem-heading">Good projects often need more than one kind of expertise.</h2>
          <p>Some requirements also involve electronics, software, specialist design, testing, certification, other manufacturing methods or other professional expertise. ESHANTVA handles the portions that fit its actual capability and leaves room for complementary providers, referrals and collaboration.</p>
        </div>
        <div className="ab-ecosystem-list">{ecosystemNeeds.map((item) => <span key={item}><CheckCircle2 size={15} aria-hidden="true" />{item}</span>)}</div>
      </div>
    </section>
  );
}

export function ClearExpectationsSection() {
  return (
    <section className="section-dark ab-expectations" aria-labelledby="ab-expectations-heading">
      <div className="shell ab-expectations-grid">
        <div><PackageCheck size={31} aria-hidden="true" /><span className="section-kicker">CLEAR EXPECTATIONS FROM THE START</span><h2 id="ab-expectations-heading">A practical path still needs review.</h2><p>Clear boundaries make an early conversation more useful. They also help separate an interesting idea from an accepted production requirement.</p></div>
        <ul>{clearExpectations.map((item) => <li key={item}><CheckCircle2 size={18} aria-hidden="true" /><span>{item}</span></li>)}</ul>
      </div>
    </section>
  );
}

export function VerifiedIdentitySection() {
  return (
    <section className="section ab-identity" aria-labelledby="ab-identity-heading">
      <div className="shell">
        <div className="ab-section-heading">
          <div><span className="section-kicker">VERIFIED BUSINESS IDENTITY</span><h2 id="ab-identity-heading">Trust should come from verified facts, not inflated claims.</h2></div>
          <p>The shared Footer remains the primary legal identity surface. This section repeats only the minimal public facts useful for understanding who operates the website.</p>
        </div>
        <div className="ab-identity-grid">
          <dl>
            <div><dt>Trade name</dt><dd>{businessIdentity.tradeName}</dd></div>
            <div><dt>Business type</dt><dd>{businessIdentity.constitution}</dd></div>
            <div><dt>GST status</dt><dd>{businessIdentity.gstRegistered ? 'Registered' : 'Not registered'}</dd></div>
            <div><dt>GSTIN</dt><dd>{businessIdentity.gstin}</dd></div>
            <div><dt>Public location</dt><dd>{businessIdentity.publicLocation}</dd></div>
          </dl>
          <div className="ab-trust-stack">
            {aboutTrustPoints.map(({ label, copy, icon: Icon }) => <article key={label}><Icon size={22} aria-hidden="true" /><div><strong>{label}</strong><p>{copy}</p></div></article>)}
          </div>
        </div>
      </div>
    </section>
  );
}

export function AboutRouteSection() {
  return (
    <section className="section ab-routes" aria-labelledby="ab-routes-heading">
      <div className="shell">
        <div className="ab-section-heading"><div><span className="section-kicker">CHOOSE THE NEXT ROUTE</span><h2 id="ab-routes-heading">Start from what you need today.</h2></div><p>The three customer routes begin differently. Pick the closest one and let the later review handle the next decision.</p></div>
        <div className="ab-route-grid">
          {aboutRouteCards.map(({ label, title, copy, href, icon: Icon }) => <Link key={label} href={href}><Icon size={24} aria-hidden="true" /><span>{label}</span><strong>{title}</strong><p>{copy}</p><em>Open route <ArrowRight size={14} /></em></Link>)}
        </div>
        <div className="ab-crosslinks">
          <Link href="/services">Explore Services &amp; Capabilities <ArrowRight size={14} /></Link>
          <Link href="/how-it-works">See How It Works <ArrowRight size={14} /></Link>
          <Link href="/our-work">View Our Work <ArrowRight size={14} /></Link>
          <Link href="/faq">Read FAQ <ArrowRight size={14} /></Link>
        </div>
      </div>
    </section>
  );
}

export function AboutFinalCta() {
  return (
    <section className="shell ab-final" aria-labelledby="ab-final-heading">
      <div><span className="section-kicker">IDEAS → PRACTICAL FIRST STEP</span><h2 id="ab-final-heading">Start with what you have.</h2><p>A sketch, dimensions, reference, file or simple requirement can be enough to begin the right conversation. The requirement will still be reviewed before production is accepted.</p></div>
      <div><Button to="/custom-order">Start a Custom Order <ArrowRight size={15} /></Button>{retailVisibility.isInternal && <Button to="/shop" variant="secondary">Browse Products</Button>}</div>
    </section>
  );
}
