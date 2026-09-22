'use client';
/* oxlint-disable jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- Delegated native link clicks also receive keyboard activation; the paper wrapper is not an additional control. */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { splitNotebookPages } from '@/lib/content/notebook-pages';
import { ProjectMarkdown } from './project-markdown';
import { parseProjectMarkdown } from './project-markdown-content';
import './notebook-section-pages.css';

export const NOTEBOOK_INK_WIDTH = 438;
export const NOTEBOOK_INK_HEIGHT = 428;
const COLUMN_GAP = 32;

/** The editor and physical reader use the same fixed paper and browser line layout.
 * Legacy oversized leaves flow into additional pages, never an inner scrollbar. */
export function NotebookSectionPages({
  title,
  subtitle,
  body,
  media = [],
  biography,
  footer,
  page,
  onPageCount,
  onPageSelect,
  headingIdPrefix = 'notebook-',
}: {
  title: string;
  subtitle?: string;
  body: string;
  media?: Record<string, any>[];
  biography?: string;
  footer?: ReactNode;
  page: number;
  onPageCount?: (
    total: number,
    perAuthoredPage: number[],
    overHeight?: boolean,
  ) => void;
  headingIdPrefix?: string;
  onPageSelect?: (page: number) => void;
}) {
  const authored = splitNotebookPages(body);
  const headingLinks: Record<string, string> = {};
  authored.forEach((markdown, index) => {
    for (const heading of parseProjectMarkdown(markdown).headings) {
      headingLinks[heading.id] ??= `${headingIdPrefix}${index}-${heading.id}`;
    }
  });
  const root = useRef<HTMLDivElement>(null);
  const callback = useRef(onPageCount);
  callback.current = onPageCount;
  const [counts, setCounts] = useState<number[]>([]);
  const signature = JSON.stringify([title, subtitle, body, biography, media]);
  useEffect(() => {
    const host = root.current;
    if (!host) return;
    let disposed = false;
    let frame = 0;
    let fontsReady = false;
    const images = [...host.querySelectorAll<HTMLImageElement>('img')];
    images.forEach((image) => {
      image.loading = 'eager';
    });
    const measure = () => {
      if (
        disposed ||
        !fontsReady ||
        images.some((image) => !image.complete) ||
        !host.getClientRects().length
      )
        return;
      const columns = [
        ...host.querySelectorAll<HTMLElement>('.notebook-columns'),
      ];
      if (!columns.every((column) => column.clientWidth)) return;
      const next = columns.map((column) =>
        Math.max(
          1,
          Math.ceil(
            (column.scrollWidth + COLUMN_GAP - 1) /
              (NOTEBOOK_INK_WIDTH + COLUMN_GAP),
          ),
        ),
      );
      setCounts((previous) =>
        JSON.stringify(previous) === JSON.stringify(next) ? previous : next,
      );
      callback.current?.(
        next.reduce((sum, count) => sum + count, 0),
        next,
        columns.some((column) => column.scrollHeight > NOTEBOOK_INK_HEIGHT + 1),
      );
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(host);
    host
      .querySelectorAll(
        '.notebook-columns, .notebook-columns > *, .project-markdown > *',
      )
      .forEach((element) => observer.observe(element));
    host.addEventListener('load', schedule, true);
    host.addEventListener('error', schedule, true);
    void document.fonts.ready.then(() => {
      fontsReady = true;
      schedule();
    });
    schedule();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      host.removeEventListener('load', schedule, true);
      host.removeEventListener('error', schedule, true);
    };
  }, [signature]);
  const total = authored.reduce(
    (sum, _, index) => sum + (counts[index] || 1),
    0,
  );
  const selected = Math.max(0, Math.min(page, total - 1));
  let offset = 0;
  useEffect(() => {
    const host = root.current;
    if (!host) return;
    // Clipped pages must not contain invisible keyboard stops. Read-only semantic
    // Reading view remains available for continuous assistive-technology reading.
    const visible = host.querySelector<HTMLElement>('[data-visible="true"]');
    if (!visible) return;
    const bounds = host.getBoundingClientRect();
    visible
      .querySelectorAll<HTMLElement>('a, video, input')
      .forEach((element) => {
        const rect = element.getBoundingClientRect();
        element.tabIndex =
          rect.right > bounds.left && rect.left < bounds.right ? 0 : -1;
      });
  }, [selected, signature, counts]);
  return (
    <div
      className="notebook-section-pages notebook-ink"
      ref={root}
      tabIndex={-1}
      data-page={selected}
      data-page-count={total}
      onClick={(event) => {
        const link = (event.target as Element).closest('a');
        if (!link || !onPageSelect) return;
        const href = link.getAttribute('href');
        if (!href?.startsWith('#')) return;
        const target = document.getElementById(href.slice(1));
        const host = root.current;
        if (!target || !host?.contains(target)) return;
        event.preventDefault();
        const column = target.closest<HTMLElement>('.notebook-columns');
        if (!column) return;
        const all = [...host.querySelectorAll('.notebook-columns')];
        const authoredIndex = all.indexOf(column);
        const preceding = counts
          .slice(0, authoredIndex)
          .reduce((sum, count) => sum + count, 0);
        const bounds = column.getBoundingClientRect();
        const x =
          ((target.getBoundingClientRect().left - bounds.left) *
            NOTEBOOK_INK_WIDTH) /
          bounds.width;
        onPageSelect(
          preceding +
            Math.max(
              0,
              Math.floor((x + 1) / (NOTEBOOK_INK_WIDTH + COLUMN_GAP)),
            ),
        );
      }}
    >
      {authored.map((markdown, index) => {
        const count = counts[index] || 1;
        const visible = selected >= offset && selected < offset + count;
        const column = visible ? selected - offset : 0;
        offset += count;
        return (
          <div
            className="notebook-authored-page"
            key={index}
            data-visible={visible}
            aria-hidden={!visible}
            inert={!visible}
          >
            <div
              className="notebook-columns"
              style={{
                transform: `translateX(${-column * (NOTEBOOK_INK_WIDTH + COLUMN_GAP)}px)`,
              }}
            >
              {index === 0 && title && <h1 tabIndex={-1}>{title}</h1>}
              {index === 0 && subtitle && (
                <p className="notebook-subtitle">{subtitle}</p>
              )}
              {index === 0 && biography && (
                <p className="notebook-biography">{biography}</p>
              )}
              <ProjectMarkdown
                paginated
                preserveSoftBreaks
                body={markdown}
                media={media}
                headingIdPrefix={`${headingIdPrefix}${index}-`}
                headingLinks={headingLinks}
              />
              {index === authored.length - 1 && footer}
            </div>
          </div>
        );
      })}
    </div>
  );
}
