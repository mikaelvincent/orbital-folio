'use client';
import { useEffect, useRef } from 'react';
import type { Portfolio } from '@/lib/content/types';
import {
  ABOUT_NOTEBOOK_LAYOUT,
  NOTEBOOK_MARKER_LIMIT,
  notebookMarkers,
  notebookWindowStart,
} from '../spacecraft/rooms/about-notebook-layout';
import { NotebookSpread } from './notebook-spread';
import './about-notebook.css';

/** Native ink stays registered to the complete stationary physical spread. */
export function AboutNotebook({
  data,
  interactive,
  section,
  ready,
  page,
  pageCounts,
  onSectionChange,
  onPageChange,
  onPageCount,
  onClose,
}: {
  data: Portfolio;
  interactive: boolean;
  section: number;
  ready: boolean;
  page: number;
  pageCounts: number[];
  onSectionChange: (index: number) => void;
  onPageChange: (index: number) => void;
  onPageCount: (section: number, count: number) => void;
  onClose: () => void;
}) {
  const s = data.site;
  const root = useRef<HTMLElement>(null);
  const start = notebookWindowStart(section);
  useEffect(() => {
    if (!interactive) return;
    root.current
      ?.querySelector<HTMLElement>('.notebook-spread .notebook-section-pages')
      ?.focus({ preventScroll: true });
  }, [section, page, interactive]);
  const paper = (index: number, measuring = false) => {
    const item = data.journal[index];
    return (
      <NotebookSpread
        section={index}
        title={item?.title || s.aboutHeading || 'A little about me'}
        subtitle={item?.subtitle}
        body={item?.body || (!item ? s.emptyLabel || '' : '')}
        media={data.media}
        biography={index === 0 ? s.biography : undefined}
        page={measuring ? 0 : page}
        pageCount={pageCounts[index] || 1}
        ready={ready}
        measuring={measuring}
        onPageSelect={measuring ? undefined : onPageChange}
        headingIdPrefix={`notebook-${item?.id || index}-${measuring ? 'measure-' : ''}`}
        onPageCount={(total) => onPageCount(index, total)}
      />
    );
  };
  return (
    <article
      ref={root}
      className="about-notebook"
      id={interactive ? 'world-reader' : undefined}
      tabIndex={-1}
      aria-label={`${s.journalLabel || 'Notebook'} · ${s.name}`}
      data-notebook-interface
      data-section={section}
      data-notebook-ready={ready}
      data-banked={data.journal.length > NOTEBOOK_MARKER_LIMIT}
      style={{
        ['--notebook-paper-left' as string]: `${ABOUT_NOTEBOOK_LAYOUT.leftPage.x}px`,
      }}
    >
      {paper(section)}
      <button
        type="button"
        className="notebook-close"
        disabled={!interactive}
        aria-hidden={!interactive}
        aria-label={interactive ? 'Close notebook' : undefined}
        title={interactive ? 'Return to room view' : undefined}
        onClick={interactive ? onClose : undefined}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path className="notebook-close-wash" d="m6 6 12 12M18 6 6 18" />
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      </button>
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
