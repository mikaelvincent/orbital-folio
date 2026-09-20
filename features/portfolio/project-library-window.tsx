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
  X,
} from 'lucide-react';
import type { Portfolio } from '@/lib/content/types';
import {
  PROJECT_CATEGORIES,
  projectBody,
  projectCategories,
  type ProjectCategory,
} from '@/lib/content/project-content';
import { pathFor } from '@/lib/paths';
import { ContactScrollArea } from './contact-scroll-area';
import { ProjectCards } from './portfolio-parts';
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
    <nav className="project-category-controls" aria-label="Project categories">
      {filters.map((filter) => {
        const Icon = icons[filter.id];
        return (
          <button
            key={filter.id}
            type="button"
            aria-pressed={category === filter.id}
            onClick={() => onChange(filter.id)}
          >
            <Icon size={16} aria-hidden="true" />
            <span>{filter.label}</span>
            <small>{filteredProjects(data, filter.id).length}</small>
          </button>
        );
      })}
    </nav>
  );
}

/** A small client boundary keeps the reading page's ordinary native links,
 * document flow and card styling while sharing explicit authored categories. */
export function ReadingProjectLibrary({ data }: { data: Portfolio }) {
  const [category, setCategory] = useState<ProjectFilter>('all');
  const projects = filteredProjects(data, category);
  return (
    <div className="reading-project-library">
      <CategoryControls
        category={category}
        onChange={setCategory}
        data={data}
      />
      {projects.length ? (
        <ProjectCards projects={projects} site={data.site} />
      ) : (
        <p className="project-category-empty" role="status">
          {category === 'all'
            ? 'No projects are available yet.'
            : `No projects are assigned to ${category} yet.`}
        </p>
      )}
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
  const projects = filteredProjects(data, category);
  const categoryLabel = filters.find((filter) => filter.id === category)!.label;

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
  const cover =
    project && data.media.find((item) => item.id === project.mediaId);

  return (
    <div className="project-computer-desktop">
      <article
        className="project-library-window"
        id="world-reader"
        tabIndex={-1}
        aria-label="Projects application"
        data-project-interface
      >
        <header className="project-window-bar">
          <span className="project-window-brand">
            <FolderOpen size={15} aria-hidden="true" />
            <span className="project-window-title">PROJECT LIBRARY</span>
          </span>
          <div className="project-window-actions">
            {project && (
              <button
                type="button"
                className="project-library-back project-window-back"
                onClick={returnToCollection}
              >
                <ArrowLeft size={15} aria-hidden="true" />
                Back to {categoryLabel.toLowerCase()}
              </button>
            )}
            <button
              type="button"
              className="project-window-close"
              onClick={onClose}
              aria-label="Close Projects application"
              title="Close Projects application"
            >
              <X size={21} aria-hidden="true" />
            </button>
          </div>
        </header>
        <ContactScrollArea
          label="Projects application"
          viewportRef={scroll}
          restorationKey={viewKey}
          initialScrollTop={positions.current[viewKey] ?? 0}
          onScroll={(top) => {
            positions.current[viewKey] = top;
          }}
        >
          {project ? (
            <div className="project-window-detail">
              <div className="project-detail-heading">
                <p className="project-library-eyebrow">
                  {project.category ||
                    projectCategories(project)
                      .map(
                        (id) =>
                          PROJECT_CATEGORIES.find((item) => item.id === id)!
                            .label,
                      )
                      .join(' · ') ||
                    'PROJECT'}
                </p>
                <h1 ref={heading} tabIndex={-1}>
                  {project.title}
                </h1>
                {project.subtitle && (
                  <p className="project-detail-subtitle">{project.subtitle}</p>
                )}
                {project.summary && (
                  <p className="project-detail-summary">{project.summary}</p>
                )}
              </div>
              {(project.role || project.period || project.stack) && (
                <dl className="project-library-meta">
                  {[
                    ['role', data.site.roleLabel || 'Role'],
                    ['period', data.site.periodLabel || 'Period'],
                    ['stack', data.site.stackLabel || 'Built with'],
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
              <ProjectLinks project={project} site={data.site} />
              {cover && <ProjectMedia item={cover} media={data.media} />}
              <ProjectMarkdown body={projectBody(project)} media={data.media} />
              {!projectBody(project).trim() && (
                <p className="project-story-pending">
                  More details about this project will be added here.
                </p>
              )}
              <footer className="project-detail-footer">
                <button
                  className="project-library-back"
                  type="button"
                  onClick={returnToCollection}
                >
                  <ArrowLeft size={16} aria-hidden="true" />
                  Back to {categoryLabel.toLowerCase()}
                </button>
                <span>END OF PROJECT</span>
              </footer>
            </div>
          ) : (
            <div className="project-window-gallery">
              <div className="project-gallery-heading">
                <div>
                  <p className="project-library-eyebrow">IDEAS, BUILT.</p>
                  <h1 ref={heading} tabIndex={-1}>
                    {category === 'all' ? 'Selected work' : categoryLabel}
                  </h1>
                </div>
                <span className="project-gallery-count">
                  {String(projects.length).padStart(2, '0')}{' '}
                  <span>{projects.length === 1 ? 'project' : 'projects'}</span>
                </span>
              </div>
              <p className="project-gallery-intro">
                Explore the work, the decisions, and what came next.
              </p>
              {projects.length ? (
                <div className="project-app-grid">
                  {projects.map((item, index) => {
                    const media = data.media.find(
                      (asset) => asset.id === item.mediaId,
                    );
                    const categories = projectCategories(item);
                    const Icon = icons[categories[0] || 'all'];
                    return (
                      <a
                        className="project-app-card"
                        key={item.id}
                        href={pathFor(`/projects/${item.slug}`, data.site)}
                        onClick={(event) => selectProject(event, item)}
                        aria-label={`Read project: ${item.title}`}
                      >
                        <div
                          className={`project-card-cover${media ? ' has-media' : ''}`}
                        >
                          {media ? (
                            <ProjectMedia
                              item={media}
                              media={data.media}
                              compact
                              caption={false}
                            />
                          ) : (
                            <>
                              <Icon
                                size={38}
                                strokeWidth={1.1}
                                aria-hidden="true"
                              />
                              <span aria-hidden="true">
                                {String(index + 1).padStart(2, '0')}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="project-app-card-content">
                          <div className="project-card-kicker">
                            <span>
                              {item.category ||
                                categories
                                  .map(
                                    (id) =>
                                      PROJECT_CATEGORIES.find(
                                        (entry) => entry.id === id,
                                      )!.label,
                                  )
                                  .join(' / ') ||
                                'PROJECT'}
                            </span>
                            <ArrowUpRight size={17} aria-hidden="true" />
                          </div>
                          <h2>{item.title}</h2>
                          <p>{item.summary}</p>
                          {item.stack && <small>{item.stack}</small>}
                          <span className="project-card-read">
                            Explore project <span aria-hidden="true">↗</span>
                          </span>
                        </div>
                      </a>
                    );
                  })}
                </div>
              ) : (
                <div className="project-app-empty" role="status">
                  <Box size={34} strokeWidth={1} aria-hidden="true" />
                  <h2>No projects here yet</h2>
                  <p>
                    {category === 'all'
                      ? data.site._preview
                        ? 'Your drafts will appear in this library.'
                        : 'Published projects will appear in this library.'
                      : `Projects assigned to ${categoryLabel.toLowerCase()} will appear here.`}
                  </p>
                  {category !== 'all' && (
                    <button
                      type="button"
                      onClick={onClose}
                    >
                      Back to room <ArrowLeft size={16} />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </ContactScrollArea>
        <footer className="project-window-status">
          <span>
            <i aria-hidden="true" />
            {project ? 'PROJECT OPEN' : 'LIBRARY ONLINE'}
          </span>
          <span>{project ? categoryLabel : 'SELECT A PROJECT TO EXPLORE'}</span>
        </footer>
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
  const links = [
    {
      href: projectContentUrl(project.demoUrl),
      label: site.demoLabel || 'Live project',
    },
    {
      href: projectContentUrl(project.sourceUrl),
      label: site.codeLabel || 'Source code',
    },
  ].filter((link) => link.href);
  return links.length ? (
    <div className="project-library-links">
      {links.map(({ href, label }) => (
        <a key={href} href={href} target="_blank" rel="noopener noreferrer">
          {label}
          <ArrowUpRight size={16} />
        </a>
      ))}
    </div>
  ) : null;
}
