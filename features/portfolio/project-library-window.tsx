'use client';
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Box,
  FolderOpen,
  Layers,
  Code2,
  FlaskConical,
  Globe,
  X,
} from 'lucide-react';
import { interfaceText as copy } from '@/lib/content/interface-text';
import type { Portfolio } from '@/lib/content/types';
import {
  PROJECT_CATEGORIES,
  projectBody,
  projectCategories,
  projectCategoryCount,
  type ProjectCategory,
} from '@/lib/content/project-content';
import { pathFor } from '@/lib/paths';
import { ContactScrollArea } from './contact-scroll-area';
import { ProjectMarkdown, ProjectMedia } from './project-markdown';
import { projectContentUrl } from './project-markdown-content';
import './contact-computer-window.css';
import './project-library-window.css';

export type ProjectFilter = 'all' | ProjectCategory;
const filters = [
  { id: 'all', label: 'All projects' },
  ...PROJECT_CATEGORIES,
] as const;
const icons = {
  all: FolderOpen,
  systems: Layers,
  interfaces: Code2,
  experiments: FlaskConical,
};

function filteredProjects(data: Portfolio, category: ProjectFilter) {
  return data.projects.filter(
    (project) =>
      category === 'all' || projectCategories(project).includes(category),
  );
}

function CategoryControls({
  category,
  onChange,
  data,
}: {
  category: ProjectFilter;
  onChange: (category: ProjectFilter) => void;
  data: Portfolio;
}) {
  return (
    <nav
      className="project-category-controls"
      aria-label={copy(data.site, 'Project categories')}
    >
      {filters.map((filter) => {
        const count = projectCategoryCount(data.projects, filter.id);
        if (!count) return null;
        const Icon = icons[filter.id];
        return (
          <button
            key={filter.id}
            type="button"
            aria-pressed={category === filter.id}
            onClick={() => onChange(filter.id)}
          >
            <Icon size={16} aria-hidden="true" />
            <span>{projectFilterLabel(data.site, filter.id)}</span>
            <small>{count}</small>
          </button>
        );
      })}
    </nav>
  );
}

/** A small client boundary keeps the reading page's ordinary native links,
 * document flow and card styling while sharing explicit authored categories. */
export function ReadingProjectLibrary({ data }: { data: Portfolio }) {
  const [selectedCategory, setCategory] = useState<ProjectFilter>('all');
  const category = projectCategoryCount(data.projects, selectedCategory)
    ? selectedCategory
    : 'all';
  return (
    <div className="reading-project-library">
      <CategoryControls
        category={category}
        onChange={setCategory}
        data={data}
      />
      <ProjectCollection data={data} category={category} />
    </div>
  );
}

export function ProjectLibraryWindow({
  data,
  category,
  project,
  onProjectSelect,
  onBack,
  onClose,
}: {
  data: Portfolio;
  category: ProjectFilter;
  project?: Record<string, any>;
  onProjectSelect: (project: Record<string, any>) => void;
  onBack: () => void;
  onClose: () => void;
}) {
  const scroll = useRef<HTMLDivElement>(null);
  const positions = useRef<Record<string, number>>({});
  const heading = useRef<HTMLHeadingElement>(null);
  const viewKey = project ? `project:${project.id}` : `category:${category}`;
  const categoryLabel = projectFilterLabel(data.site, category);
  const CategoryIcon = icons[category];

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [viewKey]);

  const remember = () => {
    positions.current[viewKey] = scroll.current?.scrollTop ?? 0;
  };
  const returnToCollection = () => {
    remember();
    onBack();
  };
  const selectProject = (
    event: MouseEvent<HTMLAnchorElement>,
    selected: Record<string, any>,
  ) => {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.shiftKey
    )
      return;
    event.preventDefault();
    remember();
    onProjectSelect(selected);
  };

  return (
    <div className="project-computer-desktop">
      <article
        className="project-library-window"
        id="world-reader"
        tabIndex={-1}
        aria-label={copy(data.site, 'Projects application')}
        data-project-interface
      >
        <header className="project-window-bar">
          {project ? (
            <button
              type="button"
              className="project-library-back project-window-back"
              onClick={returnToCollection}
            >
              <ArrowLeft size={16} aria-hidden="true" />
              {data.site.backLabel || copy(data.site, 'Back to projects')}
            </button>
          ) : (
            <span className="project-window-label">
              <CategoryIcon size={15} aria-hidden="true" />
              <span>{categoryLabel}</span>
            </span>
          )}
          <button
            type="button"
            className="project-window-close"
            onClick={onClose}
            aria-label={copy(data.site, 'Close Projects application')}
            title={copy(data.site, 'Close Projects application')}
          >
            <X size={21} aria-hidden="true" />
          </button>
        </header>
        <ContactScrollArea
          site={data.site}
          label={copy(data.site, 'Projects application')}
          viewportRef={scroll}
          restorationKey={viewKey}
          initialScrollTop={positions.current[viewKey] ?? 0}
          onScroll={(top) => {
            positions.current[viewKey] = top;
          }}
        >
          {project ? (
            <ProjectStory data={data} project={project} headingRef={heading} />
          ) : (
            <ProjectCollection
              data={data}
              category={category}
              headingRef={heading}
              onSelect={selectProject}
            />
          )}
        </ContactScrollArea>
        {project && (
          <footer className="project-window-status">
            <span>
              <i aria-hidden="true" />
              <span className="project-status-title">{project.title}</span>
            </span>
          </footer>
        )}
      </article>
    </div>
  );
}

export function ProjectLinks({
  project,
  site,
}: {
  project: Record<string, any>;
  site: Record<string, any>;
}) {
  const sourceHref = projectContentUrl(project.sourceUrl);
  const liveHref = projectContentUrl(project.demoUrl);
  const label = site.codeLabel || copy(site, 'View source code');
  return liveHref || sourceHref ? (
    <nav
      className="project-library-links"
      aria-label={copy(site, 'Project resources')}
    >
      {liveHref && (
        <a
          className="project-live-link"
          href={liveHref}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Globe size={17} aria-hidden="true" />
          <span>{site.demoLabel || copy(site, 'Open live project')}</span>
          <ArrowUpRight size={16} aria-hidden="true" />
        </a>
      )}
      {sourceHref && (
        <a
          className="project-resource-link is-source"
          href={sourceHref}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Code2 size={17} aria-hidden="true" />
          <span>{label}</span>
          <ArrowUpRight
            className="project-resource-external"
            size={14}
            aria-hidden="true"
          />
        </a>
      )}
    </nav>
  ) : null;
}

export function projectFilterLabel(
  site: Record<string, any>,
  category: ProjectFilter,
) {
  return category === 'all'
    ? site.allProjectsLabel || copy(site, 'All projects')
    : copy(
        site,
        PROJECT_CATEGORIES.find((entry) => entry.id === category)!.label,
      );
}

export function ProjectStory({
  data,
  project,
  headingRef,
}: {
  data: Portfolio;
  project: Record<string, any>;
  headingRef?: React.RefObject<HTMLHeadingElement | null>;
}) {
  const cover = data.media.find((item) => item.id === project.mediaId);
  return (
    <div className="project-window-detail">
      <div className="project-detail-heading">
        <p className="project-library-eyebrow">
          {project.category ||
            projectCategories(project)
              .map((id) => projectFilterLabel(data.site, id))
              .join(' · ') ||
            copy(data.site, 'PROJECT')}
        </p>
        <h1 ref={headingRef} tabIndex={-1}>
          {project.title}
        </h1>
        {project.subtitle && (
          <p className="project-detail-subtitle">{project.subtitle}</p>
        )}
        {project.summary && (
          <p className="project-detail-summary">{project.summary}</p>
        )}
        <ProjectLinks project={project} site={data.site} />
      </div>
      {(project.role || project.stack) && (
        <dl className="project-library-meta">
          {[
            ['role', data.site.roleLabel || copy(data.site, 'Role')],
            ['stack', data.site.stackLabel || copy(data.site, 'Built with')],
          ].map(([key, label]) =>
            project[key] ? (
              <div key={key}>
                <dt>{label}</dt>
                <dd>{project[key]}</dd>
              </div>
            ) : null,
          )}
        </dl>
      )}
      {cover && (
        <ProjectMedia site={data.site} item={cover} media={data.media} />
      )}
      <ProjectMarkdown
        site={data.site}
        body={projectBody(project, data.site)}
        media={data.media}
      />
      {!projectBody(project, data.site).trim() && (
        <p className="project-story-pending">
          {copy(
            data.site,
            'More details about this project will be added here.',
          )}
        </p>
      )}
    </div>
  );
}

export function ProjectCollection({
  data,
  category,
  headingRef,
  onSelect,
}: {
  data: Portfolio;
  category: ProjectFilter;
  headingRef?: React.RefObject<HTMLHeadingElement | null>;
  onSelect?: (
    event: MouseEvent<HTMLAnchorElement>,
    project: Record<string, any>,
  ) => void;
}) {
  const projects = filteredProjects(data, category);
  const categoryLabel = projectFilterLabel(data.site, category);
  return (
    <div className="project-window-gallery">
      <div className="project-gallery-heading">
        <div>
          <p className="project-library-eyebrow">
            {copy(data.site, 'IDEAS, BUILT.')}
          </p>
          <h1 ref={headingRef} tabIndex={headingRef ? -1 : undefined}>
            {category === 'all' ? data.site.projectsHeading : categoryLabel}
          </h1>
        </div>
        <span className="project-gallery-count">
          {String(projects.length).padStart(2, '0')}{' '}
          <span>
            {projects.length === 1
              ? copy(data.site, 'project')
              : copy(data.site, 'projects')}
          </span>
        </span>
      </div>
      <p className="project-gallery-intro">{data.site.projectsIntro}</p>
      {projects.length ? (
        <div className="project-app-grid">
          {projects.map((item) => (
            <a
              className="project-app-card"
              key={item.id}
              href={pathFor(`/projects/${item.slug}`, data.site)}
              onClick={onSelect ? (event) => onSelect(event, item) : undefined}
              aria-label={copy(data.site, 'Read project: {title}', {
                title: item.title,
              })}
            >
              <div className="project-app-card-content">
                <div className="project-card-kicker">
                  <span>
                    {item.category ||
                      projectCategories(item)
                        .map((id) => projectFilterLabel(data.site, id))
                        .join(' / ') ||
                      copy(data.site, 'PROJECT')}
                  </span>
                  <ArrowUpRight size={17} aria-hidden="true" />
                </div>
                <h2>{item.title}</h2>
                <p>{item.summary}</p>
                {item.stack && <small>{item.stack}</small>}
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className="project-app-empty" role="status">
          <Box size={34} strokeWidth={1} aria-hidden="true" />
          <h2>{copy(data.site, 'No projects here yet')}</h2>
          <p>{data.site.emptyLabel}</p>
        </div>
      )}
    </div>
  );
}
