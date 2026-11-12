'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { Search, X } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { getPublicProductAvailability } from '@/services/publicAvailability';
import type { Product } from '@/types/product';

export function ProductPicker({ products, selectedSlugs, onSelect }: { products: Product[]; selectedSlugs: string[]; onSelect: (product: Product) => void }) {
  const [open, setOpen] = useState(false); const [query, setQuery] = useState(''); const closeRef = useRef<HTMLButtonElement>(null); const dialogRef = useRef<HTMLElement>(null);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products.filter((p) => !selectedSlugs.includes(p.slug) && (!needle || [p.name, p.sku, p.category, ...p.tags].join(' ').toLowerCase().includes(needle)));
  }, [products, query, selectedSlugs]);
  useEffect(() => {
    if (!open) return; const previous = document.activeElement as HTMLElement | null; document.body.style.overflow = 'hidden';
    closeRef.current?.focus(); const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
      if (event.key !== 'Tab') return;
      const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])') || [])];
      if (!focusable.length) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', handleKey); return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', handleKey); previous?.focus(); };
  }, [open]);
  return <>
    <button type="button" className="button button-primary" onClick={() => setOpen(true)}>Select product</button>
    {open && <div className="bo-picker-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
      <section ref={dialogRef} className="bo-picker" role="dialog" aria-modal="true" aria-labelledby="product-picker-title">
        <header><div><span className="section-kicker">SHOP CATALOG</span><h3 id="product-picker-title">Choose a product</h3></div><button ref={closeRef} type="button" onClick={() => setOpen(false)} aria-label="Close product picker"><X /></button></header>
        <label className="bo-picker-search"><Search size={18} /><span className="visually-hidden">Search products</span><input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, SKU, category or tag" /></label>
        <div className="bo-picker-list" role="list">{filtered.length ? filtered.map((product) => {
          const availability = getPublicProductAvailability(product);
          return <article key={product.id} role="listitem"><Image src={product.thumbnail} width={88} height={88} alt={product.images[0]?.alt || ''} /><div><strong>{product.name}</strong>{product.isSample && <em>SAMPLE PRODUCT</em>}<small>{product.sku} · {product.category}</small><span>{availability.label} · Current catalog price {formatCurrency(product.price)}</span></div><button type="button" aria-label={`Select ${product.name}`} onClick={() => { onSelect(product); setOpen(false); setQuery(''); }}>Select</button></article>;
        }) : <p className="bo-empty">No active product matches this search.</p>}</div>
      </section>
    </div>}
  </>;
}
