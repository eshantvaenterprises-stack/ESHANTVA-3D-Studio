import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Product } from '@/types/product';
import { getRelatedProducts } from '@/repositories/productRepository';
import { ProductCard } from '@/components/shop/ProductCard';

export function RelatedProducts({ product }: { product: Product }) {
  const related = getRelatedProducts(product, 4);
  return (
    <>
      {related.length > 0 && <section className="pdp-related shell"><div className="pdp-section-heading"><span className="section-kicker">RELATED CATALOGUE</span><h2>You May Also Like</h2></div><div className="related-product-grid">{related.map((relatedProduct) => <ProductCard key={relatedProduct.id} product={relatedProduct} />)}</div></section>}
      <section className="pdp-custom-cta shell"><div><span className="section-kicker">CUSTOM REQUIREMENT</span><h2>Need Something Different?</h2><p>If this product does not match your requirement, send your file, drawing, dimensions or reference for review.</p></div><div><Link className="button button-primary" href="/custom-order">Start a Custom Order <ArrowRight size={16} /></Link><Link className="button button-secondary" href="/shop">Browse All Products</Link></div></section>
    </>
  );
}
