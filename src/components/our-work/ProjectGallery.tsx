'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ProjectCategory, PublicProject } from '@/types/project';
import { ProjectCard } from './ProjectCard';

const FILTER_THRESHOLD = 5;

export function ProjectGallery({ projects }: { projects: PublicProject[] }) {
  const categories = useMemo(
    () => Array.from(new Set(projects.map((project) => project.category))),
    [projects],
  );
  const shouldShowFilters = projects.length >= FILTER_THRESHOLD && categories.length > 1;
  const [activeCategory, setActiveCategory] = useState<ProjectCategory | 'All'>('All');

  useEffect(() => {
    if (!shouldShowFilters) return;

    function syncCategoryFromUrl() {
      const query = new URLSearchParams(window.location.search).get('category');
      const matchingCategory = categories.find((category) => category.toLowerCase().replace(/[^a-z0-9]+/g, '-') === query);
      setActiveCategory(matchingCategory ?? 'All');
    }

    const initialSync = window.setTimeout(syncCategoryFromUrl, 0);
    window.addEventListener('popstate', syncCategoryFromUrl);

    return () => {
      window.clearTimeout(initialSync);
      window.removeEventListener('popstate', syncCategoryFromUrl);
    };
  }, [categories, shouldShowFilters]);

  const visibleProjects = activeCategory === 'All'
    ? projects
    : projects.filter((project) => project.category === activeCategory);

  function selectCategory(category: ProjectCategory | 'All') {
    setActiveCategory(category);
    const url = new URL(window.location.href);
    if (category === 'All') {
      url.searchParams.delete('category');
    } else {
      url.searchParams.set('category', category.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
    }
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }

  return (
    <section className="section ow-gallery" aria-labelledby="project-gallery-title">
      <div className="shell">
        <div className="ow-section-heading">
          <div><span className="section-kicker">SELECTED PROJECTS</span><h2 id="project-gallery-title">Browse approved project stories.</h2></div>
          <p>Each public record is limited to customer-useful information approved for display.</p>
        </div>

        {shouldShowFilters && (
          <div className="ow-filters" role="group" aria-label="Filter projects by category">
            <button type="button" className={activeCategory === 'All' ? 'is-active' : undefined} aria-pressed={activeCategory === 'All'} onClick={() => selectCategory('All')}>All</button>
            {categories.map((category) => (
              <button key={category} type="button" className={activeCategory === category ? 'is-active' : undefined} aria-pressed={activeCategory === category} onClick={() => selectCategory(category)}>{category}</button>
            ))}
          </div>
        )}

        <div className="ow-project-grid" aria-live="polite">
          {visibleProjects.map((project) => <ProjectCard key={project.id} project={project} />)}
        </div>
      </div>
    </section>
  );
}
