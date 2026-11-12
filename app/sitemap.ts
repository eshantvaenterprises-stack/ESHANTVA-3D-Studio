import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';
import { getProducts } from '@/repositories/productRepository';
import { getPublishedProjects, isPortfolioPubliclyEnabled } from '@/repositories/projectRepository';
import { retailVisibility } from '@/config/retailVisibility';
import { getPublicLegalPolicyRoutes } from '@/data/legalPolicies';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  if (!siteConfig.siteUrl) return [];

  const portfolioProjects = getPublishedProjects();
  const portfolioIsLive = isPortfolioPubliclyEnabled() && portfolioProjects.length > 0;
  // Include only implemented, indexable production routes. Catch-all development
  // placeholders are intentionally noindex and must not be advertised here.
  const routes = ['', '/custom-order', '/bulk-order', '/services', '/materials', '/how-it-works', '/faq', '/about', '/contact', ...getPublicLegalPolicyRoutes()];
  if (retailVisibility.isInternal && siteConfig.catalogMode === 'live') routes.splice(1, 0, '/shop');
  if (portfolioIsLive) routes.push('/our-work');

  const staticEntries = routes.map((route) => ({
    url: `${siteConfig.siteUrl}${siteConfig.basePath}${route}/`,
    lastModified: new Date(),
    changeFrequency: route === '/shop' ? 'weekly' as const : 'monthly' as const,
    priority: route === '' ? 1 : 0.7,
  }));

  const productEntries = retailVisibility.isInternal && siteConfig.catalogMode === 'live'
    ? getProducts().filter((product) => !product.isSample).map((product) => ({
        url: `${siteConfig.siteUrl}${siteConfig.basePath}/shop/${product.slug}/`,
        lastModified: new Date(product.updatedAt),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }))
    : [];

  const projectEntries = portfolioIsLive
    ? portfolioProjects.map((project) => ({
        url: `${siteConfig.siteUrl}${siteConfig.basePath}/our-work/${project.slug}/`,
        lastModified: project.publishDate ? new Date(project.publishDate) : new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      }))
    : [];

  return [...staticEntries, ...productEntries, ...projectEntries];
}
