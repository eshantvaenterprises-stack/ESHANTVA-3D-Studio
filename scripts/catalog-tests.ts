import assert from 'node:assert/strict';
import { products } from '../src/data/products';
import { filterProducts, sortProducts } from '../src/lib/catalog';
import { calculateConfiguredProductPrice, createConfigurationSignature } from '../src/lib/productPricing';
import { getProductBySlug, getProducts, getRelatedProducts, validateProductCatalog } from '../src/repositories/productRepository';

assert.deepEqual(validateProductCatalog(products), []);
assert.equal(new Set(products.map((product) => product.slug)).size, products.length);
assert.equal(getProducts().length, 10);
assert.equal(getProductBySlug('sample-desk-nameplate')?.id, 'SAMPLE-001');
assert.equal(getProductBySlug('does-not-exist'), undefined);
assert.ok(filterProducts(products, { query: 'planter' }).every((product) => product.tags.includes('planter')));
assert.ok(filterProducts(products, { categories: ['Decor'] }).every((product) => product.category === 'Decor'));
assert.ok(filterProducts(products, { customisable: true }).every((product) => product.customisable));
const ascending = sortProducts(products, 'price-asc');
assert.ok(ascending.every((product, index) => index === 0 || ascending[index - 1].price <= product.price));
const storageBox = getProductBySlug('sample-storage-box')!;
const configuredStoragePrice = calculateConfiguredProductPrice(storageBox, [{ optionId: 'sample-storage-size', label: 'Size', valueId: 'sample-medium', valueLabel: 'Sample Medium', priceModifier: 80 }], 2);
assert.equal(configuredStoragePrice.unitPrice, 509);
assert.equal(configuredStoragePrice.lineTotal, 1018);
assert.notEqual(
  createConfigurationSignature('SAMPLE-001', [{ optionId: 'display-name', label: 'Display name', valueLabel: 'Aarav', priceModifier: 0 }]),
  createConfigurationSignature('SAMPLE-001', [{ optionId: 'display-name', label: 'Display name', valueLabel: 'Meera', priceModifier: 0 }]),
);
const related = getRelatedProducts(getProductBySlug('sample-desk-nameplate')!);
assert.ok(related.length > 0 && related.length <= 4);
assert.ok(related.every((product) => product.id !== 'SAMPLE-001'));
console.log('Catalog tests passed.');
