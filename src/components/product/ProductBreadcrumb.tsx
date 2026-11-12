import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { Product } from '@/types/product';

export function ProductBreadcrumb({ product }: { product: Product }) {
  return (
    <nav className="breadcrumbs product-breadcrumb" aria-label="Breadcrumb">
      <Link href="/">Home</Link><ChevronRight size={14} />
      <Link href="/shop">Shop</Link><ChevronRight size={14} />
      <span aria-current="page">{product.name}</span>
    </nav>
  );
}
