'use client';

import {
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronDown,
  List,
} from 'lucide-react';
import { interfaceText as copy } from '@/lib/content/interface-text';
import { resolveAboutPhotos } from '@/lib/content/about-photos';
import { normalizeNotebookBody } from '@/lib/content/notebook-pages';
import type { Portfolio } from '@/lib/content/types';
import { pathFor } from '@/lib/paths';
import { AboutPortrait, AboutSocialLinks } from './about-personal-content';
import { ProjectMarkdown } from './project-markdown';
import './about-reading-view.css';

function AboutSectionPicker({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const picker = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);
  useLayoutEffect(() => {
    const element = picker.current;
    if (!open || !element) return;
    const fit = () => {
      const bottom = element.getBoundingClientRect().bottom;
      const viewport = window.visualViewport;
      // Leave the floating view toggle clear as well as the viewport edge.
      const available =
        (viewport ? viewport.height + viewport.offsetTop : window.innerHeight) -
        bottom -
        88;
      element.style.setProperty(
        '--picker-space',
        `${Math.max(0, available)}px`,
      );
    };
    const closeWhenFocusLeaves = (event: FocusEvent) => {
      if (
        !(event.relatedTarget instanceof Node) ||
        !element.contains(event.relatedTarget)
      ) {
        element.open = false;
      }
    };
    fit();
    element.addEventListener('focusout', closeWhenFocusLeaves);
    window.addEventListener('resize', fit);
    window.addEventListener('scroll', fit, true);
    window.visualViewport?.addEventListener('resize', fit);
    return () => {
      element.removeEventListener('focusout', closeWhenFocusLeaves);
      window.removeEventListener('resize', fit);
      window.removeEventListener('scroll', fit, true);
      window.visualViewport?.removeEventListener('resize', fit);
    };
  }, [open]);
  return (
    <details
      ref={picker}
      className="reading-about-picker"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary onKeyDown={dismissPicker}>
        <List size={18} aria-hidden="true" />
        <span>{label}</span>
        <ChevronDown size={18} aria-hidden="true" />
      </summary>
      {children}
    </details>
  );
}

function dismissPicker(event: KeyboardEvent<HTMLElement>) {
  const picker = event.currentTarget.closest('details');
  if (event.key === 'Escape' && picker?.open) {
    event.preventDefault();
    event.stopPropagation();
    picker.open = false;
    picker.querySelector('summary')?.focus();
  }
}

export function AboutView({
  data,
  section,
}: {
  data: Portfolio;
  section?: Record<string, any>;
}) {
  const s = data.site;
  const selectedIndex = data.journal.findIndex(
    (entry) => entry.id === section?.id,
  );
  const selected = data.journal[selectedIndex];
  const previous = data.journal[selectedIndex - 1];
  const next = selected ? data.journal[selectedIndex + 1] : undefined;
  const hasPortrait = !!resolveAboutPhotos(data).portrait;
  const overviewHref = pathFor('/about?view=reading', s);
  const sectionHref = (entry: Record<string, any>) =>
    pathFor(`/about/${entry.slug}?view=reading`, s);
  const closePicker = (target: HTMLElement) => {
    const picker = target.closest('details');
    if (picker) picker.open = false;
  };
  const navigation = (
    <nav aria-label={copy(s, 'Notebook sections')}>
      <a
        href={overviewHref}
        onClick={(event) => closePicker(event.currentTarget)}
        onKeyDown={dismissPicker}
      >
        <BookOpen size={16} aria-hidden="true" />
        <span>{s.aboutLabel}</span>
      </a>
      {data.journal.map((entry, index) => (
        <a
          key={entry.id}
          href={sectionHref(entry)}
          aria-current={selected?.id === entry.id ? 'page' : undefined}
          onClick={(event) => closePicker(event.currentTarget)}
          onKeyDown={dismissPicker}
        >
          <span className="reading-about-number" aria-hidden="true">
            {String(index + 1).padStart(2, '0')}
          </span>
          <span>{entry.title}</span>
        </a>
      ))}
    </nav>
  );

  return (
    <div className={`reading-about${selected ? ' has-section' : ''}`}>
      {selected && (
        <AboutSectionPicker key={selected.id} label={selected.title}>
          {navigation}
        </AboutSectionPicker>
      )}

      <div className="reading-about-content">
        {selected ? (
          <>
            <a className="reading-about-back" href={overviewHref}>
              <ArrowLeft size={16} aria-hidden="true" />
              {s.aboutLabel}
            </a>
            <article className="reading-about-story" id={selected.slug}>
              <header>
                <p className="reading-eyebrow">{s.journalLabel}</p>
                <h1>{selected.title}</h1>
                {selected.subtitle && (
                  <p className="reading-about-subtitle">{selected.subtitle}</p>
                )}
              </header>
              {selectedIndex === 0 && s.biography && (
                <p className="reading-about-biography">{s.biography}</p>
              )}
              <ProjectMarkdown
                body={normalizeNotebookBody(selected.body || '')}
                media={data.media}
                site={s}
                headingIdPrefix={`journal-${selected.id}-`}
                notebookPageBreaks
                preserveSoftBreaks
              />
            </article>
            {(previous || next) && (
              <nav
                className="reading-about-pagination"
                aria-label={s.journalLabel}
              >
                {previous && (
                  <a href={sectionHref(previous)} rel="prev">
                    <ArrowLeft size={18} aria-hidden="true" />
                    <span>{previous.title}</span>
                  </a>
                )}
                {next && (
                  <a href={sectionHref(next)} rel="next">
                    <span>{next.title}</span>
                    <ArrowRight size={18} aria-hidden="true" />
                  </a>
                )}
              </nav>
            )}
          </>
        ) : (
          <>
            <header
              className={`reading-about-introduction${hasPortrait ? ' has-portrait' : ''}`}
            >
              <div className="reading-about-introduction-copy">
                <div className="reading-about-introduction-heading">
                  <p className="reading-eyebrow">{s.aboutLabel}</p>
                  <h1>{s.name}</h1>
                </div>
                {s.biography && (
                  <p className="reading-about-biography">{s.biography}</p>
                )}
                <AboutSocialLinks data={data} />
              </div>
              {hasPortrait && (
                <div className="reading-about-introduction-portrait">
                  <AboutPortrait data={data} />
                </div>
              )}
            </header>
            <section
              className="reading-about-contents"
              aria-labelledby="reading-about-contents-title"
            >
              <header className="reading-about-heading">
                <h2 id="reading-about-contents-title">
                  {data.journal.length ? s.journalLabel : s.aboutHeading}
                </h2>
                {!!data.journal.length && (
                  <span className="reading-about-total" aria-hidden="true">
                    {String(data.journal.length).padStart(2, '0')}
                  </span>
                )}
              </header>
              {data.journal.length ? (
                <ol className="reading-about-entries">
                  {data.journal.map((entry, index) => (
                    <li key={entry.id}>
                      <a href={sectionHref(entry)}>
                        <span
                          className="reading-about-number"
                          aria-hidden="true"
                        >
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <div>
                          <h3>{entry.title}</h3>
                          {entry.subtitle && <p>{entry.subtitle}</p>}
                        </div>
                        <span
                          className="reading-about-entry-arrow"
                          aria-hidden="true"
                        >
                          <ArrowRight size={18} />
                        </span>
                      </a>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="reading-about-empty">{s.emptyLabel}</p>
              )}
            </section>
          </>
        )}
      </div>
      {selected && (
        <aside className="reading-about-rail">
          <div className="reading-about-profile">
            <AboutPortrait data={data} />
            <h2>{s.name}</h2>
          </div>
          <AboutSocialLinks data={data} />
          <div className="reading-about-index">
            <p className="reading-eyebrow">{s.journalLabel}</p>
            {navigation}
          </div>
        </aside>
      )}
    </div>
  );
}
