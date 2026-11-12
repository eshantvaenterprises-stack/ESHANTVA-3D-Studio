import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';
import { retailVisibility } from '@/config/retailVisibility';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  const retailPaths = ['shop/', 'cart/', 'checkout/'].map((path) => `${siteConfig.basePath}/${path}`.replace(/\/+/g, '/'));
  const adminPath = `${siteConfig.basePath}/admin/`.replace(/\/+/g, '/');
  // Removed recruitment routes must return 404. Listing their old addresses in
  // robots.txt advertises those paths and prevents crawlers from seeing the 404.
  // Keep the approved hidden-retail disallows; do not disclose candidate URLs.
  return {
    rules: !retailVisibility.isInternal || siteConfig.catalogMode === 'sample'
      ? { userAgent: '*', allow: '/', disallow: [...retailPaths, adminPath] }
      : { userAgent: '*', allow: '/', disallow: [adminPath] },
    sitemap: siteConfig.siteUrl ? `${siteConfig.siteUrl}${siteConfig.basePath}/sitemap.xml` : undefined,
  };
}
