'use client';
/* oxlint-disable jsx-a11y/no-noninteractive-tabindex -- The scrollable paper region needs native keyboard scrolling. */
import { useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  FileText,
  Layers,
  Radio,
  ArrowRight,
} from 'lucide-react';
import type { Portfolio } from '@/lib/content-types';
import { Sample, TextBlocks } from './portfolio-parts';
import {
  ContactForm,
  type ContactDraft,
  type ContactSubmission,
} from './contact-form';
import { pathFor } from '@/lib/paths';

/** A DOM page mounted on the clipboard / console / journal's actual world-space plane. */
export function WorldReader({
  data,
  section,
  project,
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
  project?: Record<string, any>;
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
  const [page, setPage] = useState(0);
  const [chapter, setChapter] = useState(0);
  const parts = [
    ['problem', 'approach'],
    ['system'],
    ['decisions'],
    ['outcomes', 'next'],
  ];
  const entries = section === 'about' ? data.journal : data.experience;
  const entry = entries[chapter];
  const count = project ? parts.length : entries.length;
  const index = project ? page : chapter;
  const firstPage = Math.max(0, Math.min(index - 1, count - 3));
  const visiblePages = Array.from(
    { length: Math.min(3, count) },
    (_, i) => firstPage + i,
  );
  const select = (value: number) => {
    if (project) setPage(value);
    else setChapter(value);
  };
  return (
    <article
      className={`world-document document-${section}`}
      tabIndex={-1}
      id="world-reader"
      aria-label={project?.title || s[section + 'Label']}
    >
      <header className="world-document-bar">
        <button type="button" onClick={onClose}>
          <ArrowLeft size={18} />
          {s.closeReaderLabel}
        </button>
        <span>{project ? s.dossierLabel : s[section + 'Room']}</span>
      </header>
      <div
        className="world-document-body"
        tabIndex={0}
        role="region"
        aria-label={s.readLabel}
        key={`${page}-${chapter}`}
      >
        {project ? (
          <>
            <div className="world-kicker">
              <span>{project.category}</span>
              <Sample site={s} sample={project.sample} />
            </div>
            <h1>{project.title}</h1>
            <p className="world-subtitle">{project.subtitle}</p>
            {page === 0 && <p>{project.summary}</p>}
            {parts[page].map((id) => (
              <section key={id}>
                <h2>{s[id + 'Label']}</h2>
                <TextBlocks text={project[id]} />
                {id === 'system' && (
                  <div className="world-flow" aria-hidden="true">
                    <FileText />
                    <ArrowRight />
                    <Layers />
                    <ArrowRight />
                    <Radio />
                  </div>
                )}
              </section>
            ))}
            {page === 3 && (
              <dl className="world-facts">
                <dt>{s.roleLabel}</dt>
                <dd>{project.role}</dd>
                <dt>{s.periodLabel}</dt>
                <dd>{project.period}</dd>
                <dt>{s.stackLabel}</dt>
                <dd>{project.stack}</dd>
              </dl>
            )}
            {data.media.find((m) => m.id === project.mediaId) && page === 0 && (
              <figure className="world-media">
                <img
                  src={data.media.find((m) => m.id === project.mediaId)!.url}
                  alt={data.media.find((m) => m.id === project.mediaId)!.alt}
                  loading="lazy"
                />
              </figure>
            )}
          </>
        ) : section === 'experience' ? (
          <>
            <p className="world-kicker">{s.experienceRoom}</p>
            <h1>{s.experienceHeading}</h1>
            {entry ? (
              <>
                <div className="world-kicker">
                  <span>{entry.period}</span>
                  <Sample site={s} sample={entry.sample} />
                </div>
                <h2 className="world-entry-title">{entry.title}</h2>
                <p className="world-subtitle">
                  {entry.role} / {entry.organization}
                </p>
                <p>{entry.summary}</p>
                {['context', 'decisions', 'impact'].map((id, i) => (
                  <section key={id}>
                    <h3>
                      {s[['roleLabel', 'decisionsLabel', 'outcomesLabel'][i]]}
                    </h3>
                    <TextBlocks text={entry[id]} />
                  </section>
                ))}
              </>
            ) : (
              <p>{s.emptyLabel}</p>
            )}
          </>
        ) : section === 'about' ? (
          <>
            <p className="world-kicker">{s.journalLabel}</p>
            <h1>{s.name}</h1>
            <p>{s.biography}</p>
            {entry ? (
              <>
                <div className="world-kicker">
                  <span>{String(chapter + 1).padStart(2, '0')}</span>
                  <Sample site={s} sample={entry.sample} />
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
        ) : (
          <>
            <h1>{s.contactLabel}</h1>
            <p className="world-subtitle">{s.contactHeading}</p>
            {s.sampleMode && (
              <details className="world-sample-note">
                <summary>{s.sampleLabel}</summary>
                <p>{s.sampleContact}</p>
              </details>
            )}
            <ContactForm
              site={s}
              initialSent={sent}
              initialError={error}
              draft={draft}
              onDraftChange={onDraftChange}
              onSent={onSent}
              submission={submission}
              onSubmissionChange={onSubmissionChange}
            />
            <a className="world-link" href={'mailto:' + s.email}>
              {s.emailLabelCta}
              <ArrowUpRight size={18} />
            </a>
            <div className="world-social">
              {data.links.map((l) => (
                <a
                  key={l.id}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {l.title}
                </a>
              ))}
            </div>
          </>
        )}
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
          <nav aria-label={project ? s.dossierLabel : s.readAllLabel}>
            {visiblePages.map((i) => (
              <button
                key={i}
                type="button"
                aria-current={i === index ? 'page' : undefined}
                onClick={() => select(i)}
                aria-label={
                  project ? s[parts[i][0] + 'Label'] : entries[i].title
                }
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
      {project && (project.demoUrl || project.sourceUrl) && (
        <div className="world-launches">
          {project.demoUrl && (
            <a href={project.demoUrl} target="_blank" rel="noopener noreferrer">
              {s.demoLabel}
              <ArrowUpRight size={16} />
            </a>
          )}
          {project.sourceUrl && (
            <a
              href={project.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {s.codeLabel}
              <ArrowUpRight size={16} />
            </a>
          )}
        </div>
      )}
    </article>
  );
}
