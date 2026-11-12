'use client';

import Link from 'next/link';
import { ArrowRight, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { FaqCategoryDefinition, FaqItem } from '@/types/faq';
import { retailVisibility } from '@/config/retailVisibility';

function normalize(value: string) {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function FaqExplorer({
  categories,
  items,
}: {
  categories: FaqCategoryDefinition[];
  items: FaqItem[];
}) {
  const [query, setQuery] = useState('');
  const normalizedQuery = normalize(query);

  const visibleItems = useMemo(() => {
    if (!normalizedQuery) return items;
    return items.filter((item) => {
      const category = categories.find((candidate) => candidate.id === item.category);
      const haystack = normalize([
        item.question,
        item.answer,
        ...(item.keywords ?? []),
        category?.label ?? '',
        category?.shortLabel ?? '',
      ].join(' '));
      return haystack.includes(normalizedQuery);
    });
  }, [categories, items, normalizedQuery]);

  const grouped = categories
    .map((category) => ({
      category,
      items: visibleItems.filter((item) => item.category === category.id),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      <section className="fq-tools shell" aria-labelledby="faq-search-heading">
        <div className="fq-search-copy">
          <span className="section-kicker">FIND AN ANSWER</span>
          <h2 id="faq-search-heading">Search the questions that matter to your order.</h2>
          <p>Search matches the public question, answer, topic and useful keywords. Nothing here searches private order or customer data.</p>
        </div>
        <div className="fq-search-panel">
          <label htmlFor="faq-search">Search questions</label>
          <div className="fq-search-control">
            <Search size={19} aria-hidden="true" />
            <input
              id="faq-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search questions..."
              autoComplete="off"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} aria-label="Clear FAQ search">
                <X size={18} aria-hidden="true" />
              </button>
            )}
          </div>
          {normalizedQuery && <p className="fq-result-count">Showing {visibleItems.length} matching {visibleItems.length === 1 ? 'answer' : 'answers'}.</p>}
        </div>
      </section>

      {!normalizedQuery && (
        <nav className="fq-topic-nav shell" aria-label="FAQ topics">
          <span>What are you trying to do?</span>
          <div>
            {categories.map((category) => (
              <a key={category.id} href={`#${category.id}`}>{category.shortLabel}</a>
            ))}
          </div>
        </nav>
      )}

      {grouped.length > 0 ? (
        <div className="fq-groups">
          {grouped.map(({ category, items: groupItems }, groupIndex) => (
            <section id={category.id} className="fq-group section" key={category.id} aria-labelledby={`${category.id}-heading`}>
              <div className="shell fq-group-grid">
                <header>
                  <span className="fq-group-index">{String(groupIndex + 1).padStart(2, '0')}</span>
                  <span className="section-kicker">{category.shortLabel}</span>
                  <h2 id={`${category.id}-heading`}>{category.label}</h2>
                  <p>{category.description}</p>
                </header>
                <div className="fq-accordion">
                  {groupItems.map((faq) => (
                    <details id={`faq-${faq.id}`} key={faq.id}>
                      <summary>
                        <span>{faq.question}</span>
                        <span className="fq-question-plus" aria-hidden="true">+</span>
                      </summary>
                      <p>{faq.answer}</p>
                    </details>
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>
      ) : (
        <section className="fq-empty shell" aria-labelledby="faq-empty-heading">
          <span className="section-kicker">NO MATCH</span>
          <h2 id="faq-empty-heading">No matching answer found.</h2>
          <p>Use the route closest to your requirement instead of guessing which form to use.</p>
          <div>
            {retailVisibility.isInternal && <Link className="button button-primary" href="/shop">Shop <ArrowRight size={15} /></Link>}
            <Link className="button button-secondary" href="/custom-order">Custom Order <ArrowRight size={15} /></Link>
            <Link className="button button-secondary" href="/bulk-order">Bulk Order <ArrowRight size={15} /></Link>
            <Link className="text-link" href="/services">Explore Services <ArrowRight size={14} /></Link>
          </div>
        </section>
      )}
    </>
  );
}
