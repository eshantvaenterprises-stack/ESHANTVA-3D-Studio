import { Plus } from 'lucide-react';
import { getFaqsByIds, homeFaqIds } from '../../data/faqs';

export function FaqPreview() {
  const faqs = getFaqsByIds(homeFaqIds);
  return (
    <section className="faq-section">
      <div className="faq-grid shell">
        <div className="faq-intro"><span className="section-kicker">QUESTIONS / ANSWERED</span><h2>Before you start.</h2><p>Clear answers about files, visits, delivery and custom-order acceptance.</p></div>
        <div className="faq-list">
          {faqs.map((faq, index) => (
            <details key={faq.question} open={index === 0}>
              <summary><span>{String(index + 1).padStart(2, '0')}</span>{faq.question}<Plus size={20} /></summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
