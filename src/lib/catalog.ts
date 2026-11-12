import type { Product, PublicAvailability } from '@/types/product';

export type CatalogFilters = {
  query?: string;
  categories?: string[];
  materials?: string[];
  availability?: PublicAvailability[];
  customisable?: boolean;
  madeToOrder?: boolean;
};

export type CatalogSort = 'featured' | 'newest' | 'price-asc' | 'price-desc' | 'name';

export function filterProducts(products: Product[], filters: CatalogFilters) {
  const query = filters.query?.trim().toLocaleLowerCase();
  return products.filter((product) => {
    const searchable = [product.name, product.shortDescription, product.category, ...product.tags, ...product.materialOptions]
      .join(' ')
      .toLocaleLowerCase();
    if (query && !searchable.includes(query)) return false;
    if (filters.categories?.length && !filters.categories.includes(product.category)) return false;
    if (filters.materials?.length && !product.materialOptions.some((value) => filters.materials?.includes(value))) return false;
    if (filters.availability?.length && !filters.availability.includes(product.publicAvailability)) return false;
    if (filters.customisable && !product.customisable) return false;
    if (filters.madeToOrder && !product.madeToOrder) return false;
    return true;
  });
}

export function sortProducts(products: Product[], sort: CatalogSort) {
  return [...products].sort((a, b) => {
    if (sort === 'price-asc') return a.price - b.price;
    if (sort === 'price-desc') return b.price - a.price;
    if (sort === 'newest') return Date.parse(b.createdAt) - Date.parse(a.createdAt);
    if (sort === 'name') return a.name.localeCompare(b.name);
    return Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name);
  });
}

export function getCatalogFacets(products: Product[]) {
  const unique = (values: string[]) => [...new Set(values)].sort();
  return {
    categories: unique(products.map((product) => product.category)),
    materials: unique(products.flatMap((product) => product.materialOptions)),
  };
}
