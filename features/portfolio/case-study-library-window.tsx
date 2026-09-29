'use client';
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type RefObject,
} from 'react';
import {
  Archive,
  ArrowLeft,
  ArrowUpRight,
  Box,
  FlaskConical,
  Layers,
  PanelsTopLeft,
  X,
} from 'lucide-react';
import { interfaceText as copy } from '@/lib/content/interface-text';
import type { Portfolio } from '@/lib/content/types';
import {
  CASE_STUDY_CATEGORIES,
  caseStudyBody,
  caseStudyCategories,
  caseStudyCategoryCount,
  type CaseStudyFilter,
} from '@/lib/content/case-study-content';
import { pathFor } from '@/lib/paths';
import { ContactScrollArea } from './contact-scroll-area';
import { ProjectMarkdown, ProjectMedia } from './project-markdown';
import './contact-computer-window.css';
import './project-library-window.css';
import './case-study-library-window.css';

const filters = [
  { id: 'all', label: 'All case studies' },
  ...CASE_STUDY_CATEGORIES,
] as const;
const icons = {
  all: Archive,
  product: Box,
  systems: Layers,
  research: FlaskConical,
  interfaces: PanelsTopLeft,
};

function filteredCaseStudies(data: Portfolio, category: CaseStudyFilter) {
  return data.experience.filter(
    (entry) =>
      category === 'all' || caseStudyCategories(entry).includes(category),
  );
}

function categoryLabel(entry: Record<string, any>, site: Record<string, any>) {
  return caseStudyCategories(entry)
    .map((id) => caseStudyFilterLabel(site, id))
    .join(' · ');
}

function CaseStudyList({
  data,
  category,
  onSelect,
}: {
  data: Portfolio;
  category: CaseStudyFilter;
  onSelect?: (
    event: MouseEvent<HTMLAnchorElement>,
    entry: Record<string, any>,
  ) => void;
}) {
  const entries = filteredCaseStudies(data, category);
  return entries.length ? (
    <ol className="case-study-archive-list">
      {entries.map((entry, index) => (
        <li key={entry.id}>
          <a
            className="case-study-archive-entry"
            href={pathFor(
              `/case-studies/${entry.slug}${category === 'all' ? '' : `?category=${category}`}`,
              data.site,
            )}
            onClick={onSelect ? (event) => onSelect(event, entry) : undefined}
            aria-label={copy(data.site, 'Read case study: {title}', {
              title: entry.title,
            })}
          >
            <span className="case-study-archive-number" aria-hidden="true">
              {String(index + 1).padStart(2, '0')}
            </span>
            <div className="case-study-archive-copy">
              {!!categoryLabel(entry, data.site) && (
                <p className="case-study-archive-category">
                  {categoryLabel(entry, data.site)}
                </p>
              )}
              <h2>{entry.title}</h2>
              {entry.summary && (
                <p className="case-study-archive-summary">{entry.summary}</p>
              )}
              {(entry.organization || entry.period) && (
                <p className="case-study-archive-meta">
                  {entry.organization && <span>{entry.organization}</span>}
                  {entry.period && <span>{entry.period}</span>}
                </p>
              )}
            </div>
            <ArrowUpRight
              className="case-study-archive-arrow"
              size={19}
              aria-hidden="true"
            />
          </a>
        </li>
      ))}
    </ol>
  ) : (
    <p className="case-study-empty" role="status">
      {category === 'all'
        ? copy(data.site, 'No case studies are available yet.')
        : copy(
            data.site,
            'No case studies have been added to this category yet.',
          )}
    </p>
  );
}

/** The semantic collection keeps category controls because it has no physical cartridges. */
export function ReadingCaseStudyLibrary({
  data,
  category: requestedCategory,
  onCategoryChange,
}: {
  data: Portfolio;
  category?: CaseStudyFilter;
  onCategoryChange?: (category: CaseStudyFilter) => void;
}) {
  const [selected, setSelected] = useState<CaseStudyFilter>('all');
  const requested = requestedCategory ?? selected;
  const category = caseStudyCategoryCount(data.experience, requested)
    ? requested
    : 'all';
  return (
    <div className="reading-case-study-library">
      <nav
        className="project-category-controls"
        aria-label={copy(data.site, 'Case study categories')}
      >
        {filters.map((filter) => {
          const count = caseStudyCategoryCount(data.experience, filter.id);
          if (!count) return null;
          const Icon = icons[filter.id];
          return (
            <button
              key={filter.id}
              type="button"
              aria-pressed={category === filter.id}
              onClick={() => {
                setSelected(filter.id);
                onCategoryChange?.(filter.id);
              }}
            >
              <Icon size={16} aria-hidden="true" />
              <span>{caseStudyFilterLabel(data.site, filter.id)}</span>
              <small>{count}</small>
            </button>
          );
        })}
      </nav>
      <CaseStudyCollection data={data} category={category} />
    </div>
  );
}

/** One story renderer keeps the monitor, reading route and private preview equivalent. */
export function CaseStudyStory({
  data,
  caseStudy,
  headingRef,
}: {
  data: Portfolio;
  caseStudy: Record<string, any>;
  headingRef?: RefObject<HTMLHeadingElement | null>;
}) {
  const body = caseStudyBody(caseStudy, data.site);
  const cover = data.media.find((media) => media.id === caseStudy.mediaId);
  const categories = categoryLabel(caseStudy, data.site);
  const metadata = [
    ['role', data.site.roleLabel || copy(data.site, 'Role')],
    ['organization', copy(data.site, 'Organization')],
    ['period', copy(data.site, 'Period')],
  ];
  return (
    <div className="case-study-story">
      <header className="case-study-story-heading">
        <p className="case-study-story-kicker">
          {categories || copy(data.site, 'Case study')}
        </p>
        <h1 ref={headingRef} tabIndex={headingRef ? -1 : undefined}>
          {caseStudy.title}
        </h1>
        {caseStudy.subtitle && (
          <p className="case-study-story-subtitle">{caseStudy.subtitle}</p>
        )}
        {caseStudy.summary && (
          <p className="case-study-story-summary">{caseStudy.summary}</p>
        )}
      </header>
      {metadata.some(([key]) => caseStudy[key]) && (
        <dl className="case-study-story-meta">
          {metadata.map(([key, label]) =>
            caseStudy[key] ? (
              <div key={key}>
                <dt>{label}</dt>
                <dd>{caseStudy[key]}</dd>
              </div>
            ) : null,
          )}
        </dl>
      )}
      {cover && (
        <ProjectMedia site={data.site} item={cover} media={data.media} />
      )}
      {body.trim() ? (
        <ProjectMarkdown site={data.site} body={body} media={data.media} />
      ) : (
        <p className="case-study-empty">
          {copy(
            data.site,
            'More details about this case study will be added here.',
          )}
        </p>
      )}
    </div>
  );
}

export function CaseStudyLibraryWindow({
  data,
  category,
  caseStudy,
  onCaseStudySelect,
  onBack,
  onClose,
}: {
  data: Portfolio;
  category: CaseStudyFilter;
  caseStudy?: Record<string, any>;
  onCaseStudySelect: (entry: Record<string, any>) => void;
  onBack: () => void;
  onClose: () => void;
}) {
  const scroll = useRef<HTMLDivElement>(null);
  const positions = useRef<Record<string, number>>({});
  const heading = useRef<HTMLHeadingElement>(null);
  const viewKey = caseStudy
    ? `case-study:${caseStudy.id}`
    : `category:${category}`;
  const label = caseStudyFilterLabel(data.site, category);
  const Icon = icons[category];
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [viewKey]);
  const remember = () => {
    positions.current[viewKey] = scroll.current?.scrollTop ?? 0;
  };
  const select = (
    event: MouseEvent<HTMLAnchorElement>,
    entry: Record<string, any>,
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
    onCaseStudySelect(entry);
  };
  return (
    <div className="project-computer-desktop case-study-computer-desktop">
      <article
        className="project-library-window case-study-library-window"
        id="world-reader"
        tabIndex={-1}
        aria-label={copy(data.site, 'Case studies application')}
        data-case-study-interface
      >
        <header className="project-window-bar">
          {caseStudy ? (
            <button
              type="button"
              className="project-library-back project-window-back"
              onClick={() => {
                remember();
                onBack();
              }}
            >
              <ArrowLeft size={16} aria-hidden="true" />
              {copy(data.site, 'Back to case studies')}
            </button>
          ) : (
            <span className="project-window-label">
              <Icon size={15} aria-hidden="true" />
              <span>{label}</span>
            </span>
          )}
          <button
            type="button"
            className="project-window-close"
            onClick={onClose}
            aria-label={copy(data.site, 'Close Case studies application')}
            title={copy(data.site, 'Close Case studies application')}
          >
            <X size={21} aria-hidden="true" />
          </button>
        </header>
        <ContactScrollArea
          site={data.site}
          label={copy(data.site, 'Case studies application')}
          viewportRef={scroll}
          restorationKey={viewKey}
          initialScrollTop={positions.current[viewKey] ?? 0}
          onScroll={(top) => {
            positions.current[viewKey] = top;
          }}
        >
          {caseStudy ? (
            <div className="case-study-window-detail">
              <CaseStudyStory
                data={data}
                caseStudy={caseStudy}
                headingRef={heading}
              />
            </div>
          ) : (
            <CaseStudyCollection
              data={data}
              category={category}
              headingRef={heading}
              onSelect={select}
            />
          )}
        </ContactScrollArea>
        {caseStudy && (
          <footer className="project-window-status">
            <span>
              <i aria-hidden="true" />
              <span className="project-status-title">{caseStudy.title}</span>
            </span>
          </footer>
        )}
      </article>
    </div>
  );
}

export function caseStudyFilterLabel(
  site: Record<string, any>,
  category: CaseStudyFilter,
) {
  return copy(site, filters.find((filter) => filter.id === category)!.label);
}
export function CaseStudyCollection({
  data,
  category,
  headingRef,
  onSelect,
}: {
  data: Portfolio;
  category: CaseStudyFilter;
  headingRef?: RefObject<HTMLHeadingElement | null>;
  onSelect?: (
    event: MouseEvent<HTMLAnchorElement>,
    entry: Record<string, any>,
  ) => void;
}) {
  const entries = filteredCaseStudies(data, category);
  const label = caseStudyFilterLabel(data.site, category);
  return (
    <div className="case-study-window-collection">
      <div className="case-study-collection-heading">
        <div>
          <p className="case-study-story-kicker">
            {copy(data.site, 'THE DECISIONS BEHIND THE WORK')}
          </p>
          <h1 ref={headingRef} tabIndex={-1}>
            {category === 'all' ? data.site.experienceHeading : label}
          </h1>
        </div>
        <span className="case-study-collection-count">
          {String(entries.length).padStart(2, '0')}
          <small>
            {entries.length === 1
              ? copy(data.site, 'story')
              : copy(data.site, 'stories')}
          </small>
        </span>
      </div>
      <p className="case-study-collection-intro">{data.site.experienceIntro}</p>
      <CaseStudyList data={data} category={category} onSelect={onSelect} />
    </div>
  );
}
