'use client';
import { useEffect, useRef } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { Portfolio } from '@/lib/content/types';
import { pathFor } from '@/lib/paths';
import {
  ABOUT_NOTEBOOK_LAYOUT,
  notebookWindowStart,
} from '../spacecraft/rooms/about-notebook-layout';
import { AboutSocialLinks } from './about-personal-content';
import { ContactScrollArea } from './contact-scroll-area';
import { ProjectMarkdown } from './project-markdown';
import './contact-computer-window.css';
import './about-notebook.css';

/** Transparent ink and controls registered to the actual retained paper. */
export function AboutNotebook({
  data,
  chapter,
  onChapterChange,
  onClose,
  positions,
  ready,
}: {
  data: Portfolio;
  chapter: number;
  onChapterChange: (index: number) => void;
  onClose: () => void;
  positions: Record<string, number>;
  ready: boolean;
}) {
  const entry = data.journal[chapter];
  const s = data.site;
  const count = data.journal.length;
  const viewKey = String(entry?.id || entry?.slug || 'introduction');
  const heading = useRef<HTMLHeadingElement>(null);
  const start = notebookWindowStart(chapter);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [viewKey]);

  return (
    <article
      className="about-notebook"
      id="world-reader"
      tabIndex={-1}
      aria-label={`${s.journalLabel || 'Notebook'} · ${s.name}`}
      data-notebook-interface
    >
      <div
        className="notebook-page"
        style={{
          left: ABOUT_NOTEBOOK_LAYOUT.page.x,
          width: ABOUT_NOTEBOOK_LAYOUT.page.width,
        }}
      >
        <header className="notebook-page-header">
          <button type="button" onClick={onClose}>
            <ArrowLeft size={15} aria-hidden="true" />
            Back to {s.aboutLabel || 'About'}
          </button>
          <span>{s.journalLabel || 'Field notes'}</span>
        </header>
        <ContactScrollArea
          label={entry?.title || s.aboutLabel}
          // The projection is hidden during the first portal commit. Restore
          // again after arrival, when native scroll dimensions are available.
          restorationKey={`${viewKey}:${ready ? 'ready' : 'approaching'}`}
          initialScrollTop={positions[viewKey] || 0}
          onScroll={(top) => {
            if (ready) positions[viewKey] = top;
          }}
        >
          <div className="notebook-ink">
            <p className="notebook-kicker">{s.name}</p>
            <h1 ref={heading} tabIndex={-1}>
              {entry?.title || s.aboutHeading || 'A little about me'}
            </h1>
            {entry?.subtitle && (
              <p className="notebook-subtitle">{entry.subtitle}</p>
            )}
            {chapter === 0 && s.biography && (
              <p className="notebook-biography">{s.biography}</p>
            )}
            {entry ? (
              <ProjectMarkdown
                preserveSoftBreaks
                body={entry.body || ''}
                media={data.media}
                headingIdPrefix={`notebook-${entry.id || chapter}-`}
              />
            ) : (
              <p>{s.emptyLabel}</p>
            )}
            <div className="notebook-signoff">
              <AboutSocialLinks data={data} />
              <a href={pathFor('/contact', s)}>
                {s.inviteLabel}
                <ArrowUpRight size={15} aria-hidden="true" />
              </a>
            </div>
          </div>
        </ContactScrollArea>
        <footer className="notebook-page-footer">
          <button
            type="button"
            disabled={chapter <= 0}
            onClick={() => onChapterChange(chapter - 1)}
            aria-label={s.previousPageLabel || 'Previous chapter'}
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <span aria-live="polite" aria-atomic="true">
            {count
              ? `${String(chapter + 1).padStart(2, '0')} / ${String(count).padStart(2, '0')}`
              : '01'}
          </span>
          <button
            type="button"
            disabled={chapter >= count - 1}
            onClick={() => onChapterChange(chapter + 1)}
            aria-label={s.nextPageLabel || 'Next chapter'}
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </footer>
      </div>
      <nav className="notebook-markers" aria-label="Notebook chapters">
        {ABOUT_NOTEBOOK_LAYOUT.flags.map((flag) => {
          const index = start + flag.slot;
          const item = data.journal[index];
          return item ? (
            <button
              type="button"
              key={flag.slot}
              className="notebook-marker"
              style={{
                left: flag.x,
                top: flag.y,
                width: flag.width,
                height: flag.height,
              }}
              aria-current={index === chapter ? 'page' : undefined}
              aria-label={`Chapter ${index + 1}: ${item.title}`}
              title={item.title}
              onClick={() => onChapterChange(index)}
            >
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{item.title}</strong>
            </button>
          ) : null;
        })}
      </nav>
    </article>
  );
}
