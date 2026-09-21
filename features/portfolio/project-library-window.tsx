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
            <span>{filter.label}</span>
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
          {project ? (
            <button
              type="button"
              className="project-library-back project-window-back"
              onClick={returnToCollection}
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Back to projects
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
            aria-label="Close Projects application"
            title="Close Projects application"
          >
            <X size={21} aria-hidden="true" />
          </button>
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
                <div className="project-detail-title-row">
                  <h1 ref={heading} tabIndex={-1}>
                    {project.title}
                  </h1>
                  <ProjectLiveLink project={project} site={data.site} />
                </div>
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
                    ['role', data.site.roleLabel || 'Role'],
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
              {cover && <ProjectMedia item={cover} media={data.media} />}
              <ProjectMarkdown body={projectBody(project)} media={data.media} />
              {!projectBody(project).trim() && (
                <p className="project-story-pending">
                  More details about this project will be added here.
                </p>
              )}
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
                  {projects.map((item) => {
                    const categories = projectCategories(item);
                    return (
                      <a
                        className="project-app-card"
                        key={item.id}
                        href={pathFor(`/projects/${item.slug}`, data.site)}
                        onClick={(event) => selectProject(event, item)}
                        aria-label={`Read project: ${item.title}`}
                      >
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
                    <button type="button" onClick={onClose}>
                      Back to room <ArrowLeft size={16} />
                    </button>
                  )}
                </div>
              )}
            </div>
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
  const href = projectContentUrl(project.sourceUrl);
  const label =
    !site.codeLabel || site.codeLabel === 'View source'
      ? 'View source code'
      : site.codeLabel;
  return href ? (
    <nav className="project-library-links" aria-label="Project resources">
      <a
        className="project-resource-link is-source"
        href={href}
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
    </nav>
  ) : null;
}

export function ProjectLiveLink({
  project,
  site,
}: {
  project: Record<string, any>;
  site: Record<string, any>;
}) {
  const href = projectContentUrl(project.demoUrl);
  return href ? (
    <a
      className="project-live-link"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      <Globe size={17} aria-hidden="true" />
      <span>{site.demoLabel || 'Open live project'}</span>
      <ArrowUpRight size={16} aria-hidden="true" />
    </a>
  ) : null;
}
