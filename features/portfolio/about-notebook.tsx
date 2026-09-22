'use client';
import { useEffect, useRef } from 'react';
import { ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Portfolio } from '@/lib/content/types';
import { pathFor } from '@/lib/paths';
import {
  ABOUT_NOTEBOOK_LAYOUT,
  NOTEBOOK_MARKER_LIMIT,
  notebookMarkers,
  notebookWindowStart,
} from '../spacecraft/rooms/about-notebook-layout';
import { AboutSocialLinks } from './about-personal-content';
import { NotebookSectionPages } from './notebook-section-pages';
import './about-notebook.css';

/** Native ink stays registered to the complete stationary physical spread. */
export function AboutNotebook({
  data,
  section,
  ready,
  page,
  pageCounts,
  onSectionChange,
  onPageChange,
  onPageCount,
}: {
  data: Portfolio;
  section: number;
  ready: boolean;
  page: number;
  pageCounts: number[];
  onSectionChange: (index: number) => void;
  onPageChange: (index: number) => void;
  onPageCount: (section: number, count: number) => void;
}) {
  const s = data.site;
  const root = useRef<HTMLElement>(null);
  const start = notebookWindowStart(section);
  useEffect(() => {
    root.current
      ?.querySelector<HTMLElement>('.notebook-page .notebook-section-pages')
      ?.focus({ preventScroll: true });
  }, [section, page]);
  const sheet = (index: number, measuring = false) => {
    const item = data.journal[index];
    return (
      <NotebookSectionPages
        title={item?.title || s.aboutHeading || 'A little about me'}
        subtitle={item?.subtitle}
        body={item?.body || (!item ? s.emptyLabel || '' : '')}
        media={data.media}
        biography={index === 0 ? s.biography : undefined}
        page={measuring ? 0 : page}
        onPageSelect={measuring ? undefined : onPageChange}
        headingIdPrefix={`notebook-${item?.id || index}-${measuring ? 'measure-' : ''}`}
        onPageCount={(total) => onPageCount(index, total)}
      />
    );
  };
  const paper = (index: number, measuring = false) => {
    const total = pageCounts[index] || 1;
    const selected = measuring ? 0 : page;
    return (
      <div
        className="notebook-page"
        data-notebook-section={index}
        style={{
          left: ABOUT_NOTEBOOK_LAYOUT.page.x,
          width: ABOUT_NOTEBOOK_LAYOUT.page.width,
        }}
      >
        <header className="notebook-page-header">
          <span>{s.journalLabel || 'Field notes'}</span>
        </header>
        {sheet(index, measuring)}
        {total > 1 && (
          <footer className="notebook-page-footer">
            <button
              type="button"
              disabled={!ready || selected <= 0}
              onClick={() => onPageChange(selected - 1)}
              aria-label="Previous page in section"
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <span
              aria-live={measuring ? undefined : 'polite'}
              aria-atomic="true"
            >
              Page {selected + 1} of {total}
            </span>
            <button
              type="button"
              disabled={!ready || selected >= total - 1}
              onClick={() => onPageChange(selected + 1)}
              aria-label="Next page in section"
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </footer>
        )}
      </div>
    );
  };
  return (
    <article
      ref={root}
      className="about-notebook"
      id="world-reader"
      tabIndex={-1}
      aria-label={`${s.journalLabel || 'Notebook'} · ${s.name}`}
      data-notebook-interface
      data-section={section}
    >
      {paper(section)}
      <div className="notebook-connections">
        <AboutSocialLinks data={data} />
        <a href={pathFor('/contact', s)}>
          {s.inviteLabel}
          <ArrowUpRight size={13} aria-hidden="true" />
        </a>
      </div>
      <nav className="notebook-markers" aria-label="Notebook sections">
        {notebookMarkers(data.journal.length, section).map((flag) => (
          <button
            type="button"
            key={flag.index}
            disabled={!ready}
            className="notebook-marker"
            data-marker-index={flag.index}
            data-side={flag.side}
            style={{
              left: flag.exposedX,
              top: flag.y,
              width: flag.exposedWidth,
              height: flag.height,
            }}
            aria-current={flag.index === section ? 'page' : undefined}
            aria-label={`Section ${flag.index + 1}: ${data.journal[flag.index].title}`}
            title={data.journal[flag.index].title}
            onClick={() => onSectionChange(flag.index)}
          >
            <span>{String(flag.index + 1).padStart(2, '0')}</span>
            <strong>{data.journal[flag.index].title}</strong>
          </button>
        ))}
      </nav>
      {data.journal.length > NOTEBOOK_MARKER_LIMIT && (
        <nav
          className="notebook-section-banks"
          aria-label="More notebook sections"
        >
          <button
            type="button"
            disabled={!ready || !start}
            onClick={() => onSectionChange(start - NOTEBOOK_MARKER_LIMIT)}
          >
            Earlier sections
          </button>
          <span>
            Sections {start + 1}–
            {Math.min(start + NOTEBOOK_MARKER_LIMIT, data.journal.length)}
          </span>
          <button
            type="button"
            disabled={
              !ready || start + NOTEBOOK_MARKER_LIMIT >= data.journal.length
            }
            onClick={() => onSectionChange(start + NOTEBOOK_MARKER_LIMIT)}
          >
            More sections
          </button>
        </nav>
      )}
      <div className="notebook-measurements" inert aria-hidden="true">
        {data.journal.map(
          (item, index) =>
            index !== section && (
              <div key={item.id || index}>{paper(index, true)}</div>
            ),
        )}
      </div>
    </article>
  );
}
