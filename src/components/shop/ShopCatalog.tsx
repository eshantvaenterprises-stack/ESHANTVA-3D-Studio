'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Filter, Search, SlidersHorizontal, X } from 'lucide-react';
import type { Product, PublicAvailability } from '@/types/product';
import { filterProducts, getCatalogFacets, sortProducts, type CatalogSort } from '@/lib/catalog';
import { trackCatalogEvent } from '@/lib/analytics';
import { availabilityLabel } from '@/services/publicAvailability';
import { ProductCard } from './ProductCard';

const availabilityValues: PublicAvailability[] = ['in_stock', 'limited', 'made_to_order', 'on_request', 'out_of_stock'];
const pageSize = 9;

function selectedValues(params: URLSearchParams, key: string) {
  return params.get(key)?.split(',').filter(Boolean) || [];
}

export function ShopCatalog({ products }: { products: Product[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const filterTriggerRef = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const categories = selectedValues(searchParams, 'category');
  const materials = selectedValues(searchParams, 'material');
  const availability = selectedValues(searchParams, 'availability') as PublicAvailability[];
  const customisable = searchParams.get('customisable') === 'true';
  const madeToOrder = searchParams.get('madeToOrder') === 'true';
  const sort = (searchParams.get('sort') || 'featured') as CatalogSort;
  const page = Math.max(1, Number(searchParams.get('page') || 1));
  const facets = useMemo(() => getCatalogFacets(products), [products]);

  function update(changes: Record<string, string | null>, replace = false) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!('page' in changes)) next.delete('page');
    const url = next.size ? `${pathname}?${next}` : pathname;
    if (replace) router.replace(url, { scroll: false });
    else router.push(url, { scroll: false });
  }

  useEffect(() => { trackCatalogEvent('view_shop'); }, []);
  useEffect(() => {
    if (!drawerOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') closeDrawer(); };
    document.addEventListener('keydown', closeOnEscape);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', closeOnEscape); document.body.style.overflow = ''; };
  }, [drawerOpen]);

  const filtered = sortProducts(filterProducts(products, { query: searchParams.get('q') || '', categories, materials, availability, customisable, madeToOrder }), sort);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const activeCount = categories.length + materials.length + availability.length + Number(customisable) + Number(madeToOrder) + Number(Boolean(searchParams.get('q')));

  function toggle(key: string, value: string) {
    const values = selectedValues(searchParams, key);
    const next = values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
    update({ [key]: next.join(',') || null });
    trackCatalogEvent('filter_catalog', { filter: key });
  }

  function closeDrawer() {
    setDrawerOpen(false);
    window.setTimeout(() => filterTriggerRef.current?.focus(), 0);
  }

  const chips = [
    ...(searchParams.get('q') ? [{ key: 'q', value: searchParams.get('q')!, label: `Search: ${searchParams.get('q')}` }] : []),
    ...categories.map((value) => ({ key: 'category', value, label: value })),
    ...materials.map((value) => ({ key: 'material', value, label: value })),
    ...availability.map((value) => ({ key: 'availability', value, label: availabilityLabel(value) })),
    ...(customisable ? [{ key: 'customisable', value: 'true', label: 'Customisable' }] : []),
    ...(madeToOrder ? [{ key: 'madeToOrder', value: 'true', label: 'Made to order' }] : []),
  ];

  function removeChip(key: string, value: string) {
    if (key === 'q' || key === 'customisable' || key === 'madeToOrder') update({ [key]: null });
    else toggle(key, value);
  }

  const filters = (
    <div className="filters-inner">
      <div className="filter-heading"><strong>Filter products</strong><button onClick={closeDrawer} aria-label="Close filters"><X size={20} /></button></div>
      <FilterGroup title="Category" values={facets.categories} selected={categories} onToggle={(value) => toggle('category', value)} />
      <FilterGroup title="Material" values={facets.materials} selected={materials} onToggle={(value) => toggle('material', value)} />
      <FilterGroup title="Availability" values={availabilityValues} selected={availability} labels={Object.fromEntries(availabilityValues.map((value) => [value, availabilityLabel(value)]))} onToggle={(value) => toggle('availability', value)} />
      <fieldset className="filter-group"><legend>Options</legend>
        <label><input type="checkbox" checked={customisable} onChange={() => update({ customisable: customisable ? null : 'true' })} /> Customisable</label>
        <label><input type="checkbox" checked={madeToOrder} onChange={() => update({ madeToOrder: madeToOrder ? null : 'true' })} /> Made to order</label>
      </fieldset>
      {activeCount > 0 && <button className="clear-filters" onClick={() => update({ q: null, category: null, material: null, availability: null, customisable: null, madeToOrder: null, sort: null })}>Clear all filters</button>}
    </div>
  );

  return (
    <section className="shop-catalog shell" aria-label="Product catalogue">
      <div className="shop-toolbar">
        <form className="catalog-search" onSubmit={(event) => { event.preventDefault(); update({ q: query.trim() || null }); trackCatalogEvent('search_catalog', { length: query.trim().length }); }}>
          <Search size={18} /><label className="sr-only" htmlFor="catalog-search">Search products</label><input id="catalog-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products" /><button type="submit">Search</button>
        </form>
        <button ref={filterTriggerRef} className="filter-trigger" onClick={() => setDrawerOpen(true)}><Filter size={17} /> Filters {activeCount > 0 && <span>{activeCount}</span>}</button>
        <label className="sort-control"><SlidersHorizontal size={17} /><span>Sort</span><select value={sort} onChange={(event) => update({ sort: event.target.value === 'featured' ? null : event.target.value })}><option value="featured">Featured</option><option value="newest">Newest</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="name">Name</option></select></label>
      </div>
      {chips.length > 0 && <div className="active-filter-chips" aria-label="Active filters">{chips.map((chip) => <button key={`${chip.key}-${chip.value}`} onClick={() => removeChip(chip.key, chip.value)}>{chip.label}<X size={13} aria-hidden="true" /><span className="sr-only">Remove filter</span></button>)}</div>}
      <div className={`filter-drawer ${drawerOpen ? 'is-open' : ''}`} aria-hidden={!drawerOpen}><button className="drawer-backdrop" onClick={closeDrawer} aria-label="Close filters" />{filters}</div>
      <div className="shop-layout"><aside className="desktop-filters">{filters}</aside><div className="catalog-results">
        <div className="results-summary"><span>{filtered.length} {filtered.length === 1 ? 'product' : 'products'}</span>{activeCount > 0 && <button onClick={() => update({ q: null, category: null, material: null, availability: null, customisable: null, madeToOrder: null })}>Reset</button>}</div>
        {visible.length ? <div className="shop-product-grid">{visible.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="catalog-empty"><h2>No matching products</h2><p>Try removing a filter or using a broader search.</p><button onClick={() => update({ q: null, category: null, material: null, availability: null, customisable: null, madeToOrder: null })}>Clear filters</button></div>}
        {totalPages > 1 && <nav className="pagination" aria-label="Catalog pages">{Array.from({ length: totalPages }, (_, index) => index + 1).map((number) => <button key={number} aria-current={safePage === number ? 'page' : undefined} onClick={() => update({ page: number === 1 ? null : String(number) })}>{number}</button>)}</nav>}
      </div></div>
    </section>
  );
}

function FilterGroup({ title, values, selected, labels, onToggle }: { title: string; values: string[]; selected: string[]; labels?: Record<string, string>; onToggle: (value: string) => void }) {
  return <fieldset className="filter-group"><legend>{title}</legend>{values.map((value) => <label key={value}><input type="checkbox" checked={selected.includes(value)} onChange={() => onToggle(value)} /> {labels?.[value] || value}</label>)}</fieldset>;
}
