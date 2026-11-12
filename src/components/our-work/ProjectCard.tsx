import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, ImageIcon, Play } from 'lucide-react';
import type { PublicProject } from '@/types/project';

export function ProjectCard({ project }: { project: PublicProject }) {
  const primaryMedia = project.media[0];

  return (
    <article className="ow-project-card">
      <Link className="ow-project-media" href={`/our-work/${project.slug}`} aria-label={`View project: ${project.title}`}>
        {primaryMedia?.type === 'image' ? (
          <Image
            src={primaryMedia.src}
            alt={primaryMedia.alt}
            fill
            sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw"
          />
        ) : primaryMedia?.type === 'video' && primaryMedia.poster ? (
          <>
            <Image
              src={primaryMedia.poster}
              alt={primaryMedia.posterAlt || `${project.title} video preview`}
              fill
              sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw"
            />
            <span className="ow-media-kind"><Play size={14} aria-hidden="true" /> Video</span>
          </>
        ) : (
          <span className="ow-media-fallback" role="img" aria-label="Project media preview unavailable">
            <ImageIcon size={32} aria-hidden="true" />
            <small>MEDIA PREVIEW UNAVAILABLE</small>
          </span>
        )}
      </Link>
      <div className="ow-project-copy">
        <div className="ow-project-meta">
          <span>{project.category}</span>
          {project.startingPoint && <small>Started with · {project.startingPoint}</small>}
        </div>
        <h3><Link href={`/our-work/${project.slug}`}>{project.title}</Link></h3>
        <p>{project.resultSummary || project.shortDescription}</p>
        <Link className="text-link" href={`/our-work/${project.slug}`}>View Project <ArrowUpRight size={15} /></Link>
      </div>
    </article>
  );
}
