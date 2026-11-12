import { getFaqsByIds, servicesFaqIds } from '@/data/faqs';

export function ServicesFAQ() {
  const faqs = getFaqsByIds(servicesFaqIds);
  return <section className="sv-faq section" aria-labelledby="services-faq-heading"><div className="shell sv-faq-grid"><div><span className="section-kicker">SERVICES FAQ</span><h2 id="services-faq-heading">Useful before you choose a route.</h2><p>These answers explain how to begin without promising acceptance, price or turnaround.</p></div><div>{faqs.map((faq) => <details key={faq.id}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</div></div></section>;
}
