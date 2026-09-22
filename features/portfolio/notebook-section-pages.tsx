'use client';
/* oxlint-disable jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- Delegated native link clicks also receive keyboard activation; the paper wrapper is not an additional control. */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  normalizeNotebookBody,
  NOTEBOOK_COLUMN_STRIDE,
} from '@/lib/content/notebook-pages';
import { ProjectMarkdown } from './project-markdown';
import { parseProjectMarkdown } from './project-markdown-content';
import './notebook-section-pages.css';

export const NOTEBOOK_INK_WIDTH = 438;
export const NOTEBOOK_INK_HEIGHT = 428;
const COLUMN_GAP = NOTEBOOK_COLUMN_STRIDE - NOTEBOOK_INK_WIDTH;

/** A single Markdown story flows through fixed paper columns without scrolling. */
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
  onPageCount?: (total: number) => void;
  headingIdPrefix?: string;
  onPageSelect?: (page: number) => void;
}) {
  const markdown = normalizeNotebookBody(body);
  const headingLinks = useMemo(() => {
    const headings = parseProjectMarkdown(markdown).headings;
    const links: Record<string, string> = Object.create(null);
    for (const heading of headings)
      links[heading.id] = headingIdPrefix + heading.id;
    for (const heading of headings) {
      const alias = heading.id.replace(/^project-/, '');
      links[alias] ??= headingIdPrefix + heading.id;
    }
    return links;
  }, [markdown, headingIdPrefix]);
  const root = useRef<HTMLDivElement>(null);
  const callback = useRef(onPageCount);
  callback.current = onPageCount;
  const [count, setCount] = useState(1);
  const signature = JSON.stringify([
    title,
    subtitle,
    markdown,
    biography,
    media,
  ]);
  useEffect(() => {
    const host = root.current;
    const columns = host?.querySelector<HTMLElement>('.notebook-columns');
    if (!host || !columns) return;
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
        !columns.clientWidth
      )
        return;
      const total = Math.max(
        1,
        Math.ceil(
          (columns.scrollWidth + COLUMN_GAP - 1) /
            (NOTEBOOK_INK_WIDTH + COLUMN_GAP),
        ),
      );
      setCount(total);
      callback.current?.(total);
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
    host.addEventListener('loadedmetadata', schedule, true);
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
      host.removeEventListener('loadedmetadata', schedule, true);
      host.removeEventListener('error', schedule, true);
    };
  }, [signature]);
  const selected = Math.max(0, Math.min(page, count - 1));
  useEffect(() => {
    const host = root.current;
    if (!host) return;
    const bounds = host.getBoundingClientRect();
    host.querySelectorAll<HTMLElement>('a, video, input').forEach((element) => {
      const rect = element.getBoundingClientRect();
      element.tabIndex =
        !('disabled' in element && element.disabled) &&
        rect.right > bounds.left &&
        rect.left < bounds.right
          ? 0
          : -1;
    });
  }, [selected, signature, count]);
  return (
    <div
      className="notebook-section-pages notebook-ink"
      ref={root}
      tabIndex={-1}
      data-page={selected}
      data-page-count={count}
      onClick={(event) => {
        const link = (event.target as Element).closest('a');
        if (!link || !onPageSelect) return;
        const href = link.getAttribute('href');
        if (!href?.startsWith('#')) return;
        const target = document.getElementById(href.slice(1));
        const host = root.current;
        if (!target || !host?.contains(target)) return;
        const columns = host.querySelector<HTMLElement>('.notebook-columns');
        if (!columns) return;
        event.preventDefault();
        const bounds = columns.getBoundingClientRect();
        const x =
          ((target.getBoundingClientRect().left - bounds.left) *
            NOTEBOOK_INK_WIDTH) /
          bounds.width;
        onPageSelect(
          Math.max(0, Math.floor((x + 1) / (NOTEBOOK_INK_WIDTH + COLUMN_GAP))),
        );
      }}
    >
      <div
        className="notebook-columns"
        style={{
          transform: `translateX(${-selected * (NOTEBOOK_INK_WIDTH + COLUMN_GAP)}px)`,
        }}
      >
        {title && <h1 tabIndex={-1}>{title}</h1>}
        {subtitle && <p className="notebook-subtitle">{subtitle}</p>}
        {biography && <p className="notebook-biography">{biography}</p>}
        <ProjectMarkdown
          paginated
          preserveSoftBreaks
          body={markdown}
          media={media}
          headingIdPrefix={headingIdPrefix}
          headingLinks={headingLinks}
        />
        {footer}
      </div>
    </div>
  );
}
