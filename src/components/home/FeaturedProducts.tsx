import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { getFeaturedProducts } from '@/repositories/productRepository';
import { formatCurrency } from '@/lib/currency';
import { withBasePath } from '@/config/site';

export function FeaturedProducts() {
  const products = getFeaturedProducts().slice(0, 6);
  return (
    <section className="section featured-section">
      <div className="section-heading shell">
        <div><span className="section-kicker">DEVELOPMENT CATALOG</span><h2>Featured Prints</h2></div>
        <p>Browse selected ready-made and customisable products.</p>
      </div>
      <div className="product-grid shell">
        {products.map((product) => (
          <article className="product-card" key={product.id}>
            <Link href={`/shop/${product.slug}`} className="product-image">
              <Image src={withBasePath(product.thumbnail)} alt={product.images[0]?.alt || product.name} fill sizes="(max-width: 640px) 100vw, (max-width: 900px) 50vw, 33vw" />
              <span className="sample-badge">SAMPLE</span>
              {product.customisable && <span className="custom-badge">Customisable</span>}
            </Link>
            <div className="product-info">
              <small>{product.id} · DEVELOPMENT ONLY</small>
              <h3>{product.name}</h3>
              <p>{product.shortDescription}</p>
              <div><span>{formatCurrency(product.price)}</span><Link href={`/shop/${product.slug}`} aria-label={`View ${product.name}`}><ArrowRight size={18} /></Link></div>
            </div>
          </article>
        ))}
      </div>
      <div className="section-action shell"><Link className="text-link" href="/shop">View all products <ArrowRight size={16} /></Link></div>
    </section>
  );
}
