'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ShoppingBag } from 'lucide-react';
import type { Product } from '@/types/product';
import { formatCurrency } from '@/lib/currency';
import { addProductToCart, isProductPurchasable } from '@/lib/cart';
import { trackCatalogEvent } from '@/lib/analytics';
import { availabilityLabel } from '@/services/publicAvailability';
import { withBasePath } from '@/config/site';

export function ProductCard({ product }: { product: Product }) {
  const [imageFailed, setImageFailed] = useState(false);
  const [added, setAdded] = useState(false);
  const requiresOptions = product.customisable || product.madeToOrder || product.publicAvailability === 'on_request';
  const unavailable = !isProductPurchasable(product);

  function addToCart() {
    addProductToCart(product);
    trackCatalogEvent('add_to_cart', { product: product.slug });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }

  return (
    <article className="shop-product-card">
      <Link href={`/shop/${product.slug}`} className="shop-product-image" aria-label={`View ${product.name}`}>
        {!imageFailed ? (
          <Image src={withBasePath(product.thumbnail)} alt={product.images[0]?.alt || product.name} fill sizes="(max-width: 640px) 100vw, (max-width: 900px) 50vw, 28vw" onError={() => setImageFailed(true)} />
        ) : <span className="image-fallback">Image unavailable</span>}
        {product.isSample && <span className="sample-badge">SAMPLE</span>}
        {product.customisable && <span className="custom-badge">Customisable</span>}
        {product.newProduct && <span className="new-badge">New</span>}
      </Link>
      <div className="shop-product-body">
        <div className="shop-card-meta"><span>{product.category}</span><span className={`availability availability-${product.publicAvailability}`}>{availabilityLabel(product.publicAvailability)}</span></div>
        <h2><Link href={`/shop/${product.slug}`}>{product.name}</Link></h2>
        <p>{product.shortDescription}</p>
        <div className="shop-price-row">
          <div><strong>{formatCurrency(product.price)}</strong>{product.compareAtPrice && <del>{formatCurrency(product.compareAtPrice)}</del>}</div>
          {requiresOptions || unavailable ? (
            <Link className="card-action" href={`/shop/${product.slug}`}>{unavailable ? 'View product' : 'Choose options'} <ArrowRight size={16} /></Link>
          ) : (
            <button className="card-action" onClick={addToCart}>
              <ShoppingBag size={15} /> {added ? 'Added' : 'Quick add'}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
