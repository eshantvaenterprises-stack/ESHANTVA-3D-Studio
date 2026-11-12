import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Footer } from '@/components/layout/Footer';
import { ProductBreadcrumb } from '@/components/product/ProductBreadcrumb';
import { ProductGallery } from '@/components/product/ProductGallery';
import { ProductConfigurator } from '@/components/product/ProductConfigurator';
import { ProductEditorialDetails, ProductFacts } from '@/components/product/ProductDetails';
import { RelatedProducts } from '@/components/product/RelatedProducts';
import { getProductBySlug, getProducts } from '@/repositories/productRepository';
import { siteConfig } from '@/config/site';
import { retailVisibility } from '@/config/retailVisibility';

export const dynamicParams = false;

export function generateStaticParams() {
  // Static export requires at least one param. The public build emits a
  // build-only 404 shell which cleanup-static-export removes afterwards.
  return retailVisibility.isInternal
    ? getProducts().map((product) => ({ slug: product.slug }))
    : [{ slug: '__retail-disabled-build__' }];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  if (!retailVisibility.isInternal) return { title: 'Product unavailable', robots: { index: false, follow: false } };
  const product = getProductBySlug(slug);
  if (!product) return { title: 'Product not found', robots: { index: false, follow: false } };
  const title = product.seoTitle || product.name;
  const description = product.seoDescription || product.shortDescription;
  const canonical = siteConfig.siteUrl ? `${siteConfig.siteUrl}${siteConfig.basePath}/shop/${product.slug}/` : undefined;
  const image = siteConfig.siteUrl ? `${siteConfig.siteUrl}${siteConfig.basePath}${product.thumbnail}` : undefined;
  return {
    title,
    description,
    alternates: canonical && !product.isSample ? { canonical } : undefined,
    robots: product.isSample ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: { title, description, type: 'website', url: canonical, images: image ? [{ url: image, alt: product.images[0]?.alt || product.name }] : undefined },
    twitter: { card: image ? 'summary_large_image' : 'summary', title, description, images: image ? [image] : undefined },
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  if (!retailVisibility.isInternal) notFound();
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();
  const productUrl = siteConfig.siteUrl ? `${siteConfig.siteUrl}${siteConfig.basePath}/shop/${product.slug}/` : undefined;
  const imageUrls = siteConfig.siteUrl ? product.images.map((image) => `${siteConfig.siteUrl}${siteConfig.basePath}${image.src}`) : product.images.map((image) => image.src);
  const availabilityMap = {
    in_stock: 'https://schema.org/InStock', limited: 'https://schema.org/LimitedAvailability',
    made_to_order: 'https://schema.org/PreOrder', on_request: 'https://schema.org/LimitedAvailability', out_of_stock: 'https://schema.org/OutOfStock',
  } as const;
  const productJsonLd = {
    '@context': 'https://schema.org', '@type': 'Product', name: product.name, image: imageUrls,
    description: product.seoDescription || product.shortDescription, sku: product.sku,
    brand: { '@type': 'Brand', name: siteConfig.brand },
    url: productUrl,
    offers: { '@type': 'Offer', price: product.price, priceCurrency: product.currency, availability: availabilityMap[product.publicAvailability], url: productUrl },
  };
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteConfig.siteUrl ? `${siteConfig.siteUrl}${siteConfig.basePath}/` : undefined },
      { '@type': 'ListItem', position: 2, name: 'Shop', item: siteConfig.siteUrl ? `${siteConfig.siteUrl}${siteConfig.basePath}/shop/` : undefined },
      { '@type': 'ListItem', position: 3, name: product.name, item: productUrl },
    ],
  };

  return (
    <>
      <SiteHeader />
      <main className="pdp-page">
        <div className="shell"><ProductBreadcrumb product={product} /></div>
        <section className="pdp-hero shell"><ProductGallery product={product} /><ProductConfigurator product={product} /></section>
        <ProductFacts product={product} />
        <ProductEditorialDetails product={product} />
        <RelatedProducts product={product} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd).replace(/</g, '\\u003c') }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c') }} />
      </main>
      <Footer />
    </>
  );
}
