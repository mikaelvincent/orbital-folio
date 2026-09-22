'use client';
/* oxlint-disable jsx-a11y/no-noninteractive-tabindex -- The scrollable paper region needs native keyboard scrolling. */
import { useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { Portfolio } from '@/lib/content/types';
import { TextBlocks } from './portfolio-parts';
import { type ContactDraft, type ContactSubmission } from './contact-form';
import { pathFor } from '@/lib/paths';
import { ContactComputerWindow } from './contact-computer-window';
import { AboutSocialLinks } from './about-personal-content';

/** Native DOM content on the console or journal plane. */
export function WorldReader({
  data,
  section,
  sent,
  error,
  draft,
  onDraftChange,
  onSent,
  submission,
  onSubmissionChange,
  onClose,
}: {
  data: Portfolio;
  section: string;
  sent?: boolean;
  error?: boolean;
  submission?: ContactSubmission;
  onSubmissionChange?: (value: ContactSubmission) => void;
  draft?: ContactDraft;
  onDraftChange?: (draft: ContactDraft) => void;
  onSent?: () => void;
  onClose: () => void;
}) {
  const s = data.site;
  const [chapter, setChapter] = useState(0);
  if (section === 'contact')
    return (
      <ContactComputerWindow
        site={s}
        initialSent={sent}
        initialError={error}
        draft={draft}
        onDraftChange={onDraftChange}
        onSent={onSent}
        submission={submission}
        onSubmissionChange={onSubmissionChange}
        onClose={onClose}
      />
    );
  const entries = data.journal;
  const entry = entries[chapter];
  const count = entries.length;
  const index = chapter;
  const firstPage = Math.max(0, Math.min(index - 1, count - 3));
  const visiblePages = Array.from(
    { length: Math.min(3, count) },
    (_, i) => firstPage + i,
  );
  const select = setChapter;
  return (
    <article
      className={`world-document document-${section}`}
      tabIndex={-1}
      id="world-reader"
      aria-label={s[section + 'Label']}
    >
      <header className="world-document-bar">
        <button type="button" onClick={onClose}>
          <ArrowLeft size={18} />
          {s.closeReaderLabel}
        </button>
        <span>{s[section + 'Room']}</span>
      </header>
      <div
        className="world-document-body"
        tabIndex={0}
        role="region"
        aria-label={s.readLabel}
        key={chapter}
      >
        {section === 'about' ? (
          <>
            <p className="world-kicker">{s.journalLabel}</p>
            <h1>{s.name}</h1>
            <p>{s.biography}</p>
            <AboutSocialLinks data={data} />
            {entry ? (
              <>
                <div className="world-kicker">
                  <span>{String(chapter + 1).padStart(2, '0')}</span>
                </div>
                <h2 className="world-entry-title">{entry.title}</h2>
                <p className="world-subtitle">{entry.subtitle}</p>
                <TextBlocks text={entry.body} />
              </>
            ) : (
              <p>{s.emptyLabel}</p>
            )}
            <a className="world-link" href={pathFor('/contact', s)}>
              {s.inviteLabel}
              <ArrowUpRight size={18} />
            </a>
          </>
        ) : null}
      </div>
      {section !== 'contact' && (
        <footer className="world-document-footer">
          <button
            type="button"
            disabled={index <= 0}
            onClick={() => select(index - 1)}
            aria-label={s.previousPageLabel}
          >
            <ChevronLeft size={22} />
          </button>
          <nav aria-label={s.readAllLabel}>
            {visiblePages.map((i) => (
              <button
                key={i}
                type="button"
                aria-current={i === index ? 'page' : undefined}
                onClick={() => select(i)}
                aria-label={entries[i].title}
              >
                {String(i + 1).padStart(2, '0')}
              </button>
            ))}
          </nav>
          <button
            type="button"
            disabled={index >= count - 1}
            onClick={() => select(index + 1)}
            aria-label={s.nextPageLabel}
          >
            <ChevronRight size={22} />
          </button>
        </footer>
      )}
    </article>
  );
}
