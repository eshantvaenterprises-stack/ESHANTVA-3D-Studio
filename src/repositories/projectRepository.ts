import { siteConfig } from '@/config/site';
import { publicProjects } from '@/data/projects';
import type { ProjectCategory, PublicProject } from '@/types/project';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type ProjectFilters = {
  category?: ProjectCategory;
};

export function validateProjectRecords(projects: readonly PublicProject[] = publicProjects) {
  const ids = new Set<string>();
  const slugs = new Set<string>();

  for (const project of projects) {
    if (!project.id.trim()) throw new Error('Public project record has an empty id.');
    if (ids.has(project.id)) throw new Error(`Duplicate public project id: ${project.id}`);
    ids.add(project.id);

    if (!SLUG_PATTERN.test(project.slug)) throw new Error(`Invalid public project slug: ${project.slug}`);
    if (slugs.has(project.slug)) throw new Error(`Duplicate public project slug: ${project.slug}`);
    slugs.add(project.slug);

    if (!project.title.trim()) throw new Error(`Public project ${project.slug} has an empty title.`);
    if (!project.shortDescription.trim()) throw new Error(`Public project ${project.slug} has an empty shortDescription.`);

    if (project.published && !project.customerApprovedForPublication) {
      throw new Error(`Published project ${project.slug} does not have publication approval.`);
    }

    if (project.published && project.media.length === 0) {
      throw new Error(`Published project ${project.slug} has no approved public media.`);
    }

    if (process.env.NODE_ENV === 'production' && project.published && project.isDevelopmentPlaceholder) {
      throw new Error(`Development placeholder ${project.slug} cannot be published in production.`);
    }
  }
}

validateProjectRecords();

export function isApprovedPublicProject(project: PublicProject) {
  return project.published
    && project.customerApprovedForPublication
    && !project.isDevelopmentPlaceholder;
}

export function isPortfolioPubliclyEnabled() {
  return siteConfig.features.realPortfolio;
}

export function getPublishedProjects(filters: ProjectFilters = {}) {
  if (!isPortfolioPubliclyEnabled()) return [];

  return publicProjects
    .filter(isApprovedPublicProject)
    .filter((project) => !filters.category || project.category === filters.category)
    .slice()
    .sort((a, b) => {
      const aTime = a.publishDate ? Date.parse(a.publishDate) : 0;
      const bTime = b.publishDate ? Date.parse(b.publishDate) : 0;
      return bTime - aTime;
    });
}

export function getFeaturedProjects(limit = 3) {
  return getPublishedProjects().filter((project) => project.featured).slice(0, limit);
}

export function getPublishedProjectBySlug(slug: string) {
  return getPublishedProjects().find((project) => project.slug === slug) ?? null;
}

export function getProjectCategories() {
  return Array.from(new Set(getPublishedProjects().map((project) => project.category)));
}
