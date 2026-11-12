import { products } from '@/data/products';
import type { Product } from '@/types/product';

export function validateProductCatalog(catalog: Product[]) {
  const errors: string[] = [];
  const ids = new Set<string>();
  const slugs = new Set<string>();
  const validAvailability = new Set(['in_stock', 'limited', 'made_to_order', 'on_request', 'out_of_stock']);

  for (const product of catalog) {
    if (!product.id.trim()) errors.push('A product is missing its ID.');
    if (ids.has(product.id)) errors.push(`Duplicate product ID: ${product.id}`);
    ids.add(product.id);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(product.slug)) errors.push(`Invalid product slug: ${product.slug}`);
    if (slugs.has(product.slug)) errors.push(`Duplicate product slug: ${product.slug}`);
    slugs.add(product.slug);
    if (!product.name.trim()) errors.push(`Product ${product.id} is missing a name.`);
    if (!Number.isFinite(product.price) || product.price < 0) errors.push(`Product ${product.id} has an invalid price.`);
    if (!product.thumbnail || product.images.length === 0) errors.push(`Product ${product.id} needs a main image.`);
    if (!validAvailability.has(product.publicAvailability)) errors.push(`Product ${product.id} has invalid availability.`);
    const optionIds = new Set<string>();
    for (const option of product.productOptions || []) {
      if (optionIds.has(option.id)) errors.push(`Product ${product.id} has duplicate option ID: ${option.id}`);
      optionIds.add(option.id);
      if ('values' in option) {
        if (option.required && option.values.length === 0) errors.push(`Product ${product.id} required option ${option.id} has no values.`);
        const valueIds = new Set<string>();
        for (const value of option.values) {
          if (valueIds.has(value.id)) errors.push(`Product ${product.id} option ${option.id} has duplicate value: ${value.id}`);
          valueIds.add(value.id);
          if (value.priceModifier !== undefined && (!Number.isFinite(value.priceModifier) || value.priceModifier < 0)) errors.push(`Product ${product.id} option ${option.id} has invalid price modifier.`);
        }
      }
      if ('priceModifier' in option && option.priceModifier !== undefined && (!Number.isFinite(option.priceModifier) || option.priceModifier < 0)) errors.push(`Product ${product.id} option ${option.id} has invalid price modifier.`);
    }
  }
  return errors;
}

const catalogErrors = validateProductCatalog(products);
if (catalogErrors.length) throw new Error(`Invalid product catalog:\n${catalogErrors.join('\n')}`);

export function getProducts() {
  return products.filter((product) => product.active && !product.archived);
}

export function getProductBySlug(slug: string) {
  return getProducts().find((product) => product.slug === slug);
}

export function getFeaturedProducts() {
  return getProducts().filter((product) => product.featured);
}

export function getProductsByCategory(category: string) {
  return getProducts().filter((product) => product.category === category);
}

export function getRelatedProducts(product: Product, limit = 4) {
  const candidates = getProducts().filter((candidate) => candidate.id !== product.id && candidate.isSample === product.isSample);
  const explicitOrder = product.relatedProductIds || [];
  return candidates
    .map((candidate) => ({
      product: candidate,
      score:
        (explicitOrder.includes(candidate.id) ? 1000 - explicitOrder.indexOf(candidate.id) : 0) +
        (candidate.category === product.category ? 100 : 0) +
        candidate.tags.filter((tag) => product.tags.includes(tag)).length * 10 +
        Number(candidate.featured),
    }))
    .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name))
    .slice(0, limit)
    .map(({ product: relatedProduct }) => relatedProduct);
}
