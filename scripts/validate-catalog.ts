import { products } from '../src/data/products';
import { siteConfig } from '../src/config/site';
import { validateProductCatalog } from '../src/repositories/productRepository';

const errors = validateProductCatalog(products);
if (siteConfig.catalogMode === 'live' && products.some((product) => product.isSample)) {
  errors.push('Launch blocked: catalogMode is live while SAMPLE products remain.');
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
if (siteConfig.catalogMode === 'sample') {
  console.warn('Catalog validation passed in SAMPLE mode. Shop routes are excluded from indexing.');
} else {
  console.log(`Catalog validation passed for ${products.length} live products.`);
}
