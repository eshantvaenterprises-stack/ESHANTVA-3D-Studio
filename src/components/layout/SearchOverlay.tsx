'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type SearchOverlayProps = { open: boolean; onClose: () => void };

export function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  if (!open) return null;

  return (
    <div className="search-overlay" role="dialog" aria-modal="true" aria-label="Search products and materials">
      <div className="search-panel">
        <div className="search-panel-top">
          <span>SEARCH</span>
          <button className="icon-button" onClick={onClose} aria-label="Close search"><X size={22} /></button>
        </div>
        <form onSubmit={(event) => { event.preventDefault(); router.push(query.trim() ? `/shop?q=${encodeURIComponent(query.trim())}` : '/shop'); onClose(); }}>
          <label htmlFor="site-search">What are you looking for?</label>
          <div className="search-input-wrap">
            <Search size={23} aria-hidden="true" />
            <input
              id="site-search"
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search products, categories or materials"
            />
            <button type="submit">Search</button>
          </div>
        </form>
        <p>Search the current catalogue by product name, category, tag or material.</p>
        <Link href="/custom-order" onClick={onClose}>Have a custom requirement? Submit it for review →</Link>
      </div>
      <button className="search-backdrop" onClick={onClose} aria-label="Close search" />
    </div>
  );
}
