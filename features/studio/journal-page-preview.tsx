'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Content } from '@/lib/content/types';
import {
  NOTEBOOK_MAX_PAGE_CHARACTERS,
  NOTEBOOK_MAX_SECTION_PAGES,
  splitNotebookPages,
} from '@/lib/content/notebook-pages';
import { NotebookSectionPages } from '@/features/portfolio/notebook-section-pages';
import './journal-page-preview.css';

/** Use the public paper renderer for both the visible preview and save checks. */
export function JournalPagePreview({
  data,
  records,
  recordId,
  body,
  media,
  authoredPage,
  visible,
  onValidationChange,
  onPageSelect,
}: {
  data: Record<string, any>;
  records: Content[];
  recordId?: string;
  body: string;
  media: Record<string, any>[];
  authoredPage: number;
  visible: boolean;
  onValidationChange?: (message: string) => void;
  onPageSelect: (page: number) => void;
}) {
  const pages = splitNotebookPages(body);
  const previewMedia = useMemo(
    () =>
      media.map((asset) => {
        const published = records.find(
          (record) => record.kind === 'media' && record.id === asset.id,
        )?.published;
        return published ? { ...published, id: asset.id } : asset;
      }),
    [media, records],
  );
  const siteRecord = records.find((record) => record.kind === 'site');
  const site = siteRecord?.published || siteRecord?.draft;
  const currentId =
    recordId ||
    records.find(
      (record) => record.kind === 'journal' && record.draft.slug === data.slug,
    )?.id ||
    'new';
  const sections = records
    .filter(
      (record) =>
        record.kind === 'journal' &&
        (record.id === currentId || record.published),
    )
    .map((record) => ({
      id: record.id,
      order:
        Number(
          record.id === currentId ? data.order : record.published?.order,
        ) || 0,
    }));
  if (!sections.some((section) => section.id === currentId))
    sections.push({ id: currentId, order: Number(data.order) || 0 });
  sections.sort((a, b) => a.order - b.order);
  const biography =
    sections[0]?.id === currentId ? String(site?.biography || '') : '';
  const title = String(data.title || 'Untitled section');
  const subtitle = String(data.subtitle || '');
  const signature = JSON.stringify([
    title,
    subtitle,
    body,
    biography,
    previewMedia,
  ]);
  const [measurement, setMeasurement] = useState<{
    signature: string;
    counts: number[];
    overHeight: boolean;
  } | null>(null);
  const receivePageCount = useCallback(
    (_total: number, counts: number[], overHeight = false) => {
      if (
        !counts.length ||
        counts.some((count) => !Number.isFinite(count) || count < 1)
      )
        return;
      setMeasurement((previous) =>
        previous?.signature === signature &&
        previous.overHeight === overHeight &&
        previous.counts.length === counts.length &&
        previous.counts.every((count, index) => count === counts[index])
          ? previous
          : { signature, counts: [...counts], overHeight },
      );
    },
    [signature],
  );
  const measured =
    measurement?.signature === signature &&
    measurement.counts.length === pages.length;
  const counts = measured ? measurement.counts : [];
  const overHeight = measured && measurement.overHeight;
  const overlong = pages.flatMap((page, index) =>
    page.length > NOTEBOOK_MAX_PAGE_CHARACTERS ? [index] : [],
  );
  const overflow = counts.flatMap((count, index) => (count > 1 ? [index] : []));
  const invalidPages = [...new Set([...overlong, ...overflow])].sort(
    (a, b) => a - b,
  );
  const problem =
    pages.length > NOTEBOOK_MAX_SECTION_PAGES
      ? `A section can contain up to ${NOTEBOOK_MAX_SECTION_PAGES} pages. Move the remaining pages into another section before saving or publishing.`
      : overlong.length
        ? `Page ${overlong[0] + 1} exceeds ${NOTEBOOK_MAX_PAGE_CHARACTERS.toLocaleString()} characters. Move some text to another page before saving or publishing.`
        : !measured
          ? 'Checking paper fit before saving or publishing…'
          : overHeight
            ? 'Content extends beyond the paper. Shorten or divide the oversized block before saving or publishing.'
            : overflow.length
              ? `Page ${overflow[0] + 1} extends beyond the paper. Move some content to another page before saving or publishing.`
              : '';
  useEffect(() => {
    onValidationChange?.(problem);
  }, [onValidationChange, problem]);
  const physicalPage = counts
    .slice(0, authoredPage)
    .reduce((total, count) => total + count, 0);

  return (
    <div className="journal-page-review">
      <div
        className={`journal-page-fit ${invalidPages.length || overHeight || pages.length > NOTEBOOK_MAX_SECTION_PAGES ? 'has-overflow' : ''}`}
        role="status"
      >
        <p>
          {problem ||
            `Page ${authoredPage + 1} fits. All ${pages.length} ${pages.length === 1 ? 'page is' : 'pages are'} ready to save.`}
        </p>
        {invalidPages.length > 1 && (
          <div role="group" aria-label="Pages that need more room">
            {invalidPages.map((index) => (
              <button
                type="button"
                key={index}
                onClick={() => onPageSelect(index)}
              >
                Check page {index + 1}
              </button>
            ))}
          </div>
        )}
      </div>
      <div
        className={
          visible ? 'journal-paper-stage' : 'journal-paper-measurement'
        }
        aria-hidden={!visible || undefined}
        inert={!visible || undefined}
      >
        <article
          className="journal-paper-preview"
          aria-label={`Notebook page ${authoredPage + 1} preview`}
        >
          <header>
            <span>{site?.journalLabel || 'Personal log'}</span>
            <span>Paper preview</span>
          </header>
          <NotebookSectionPages
            title={title}
            subtitle={subtitle}
            body={body}
            media={previewMedia}
            biography={biography}
            page={physicalPage}
            onPageCount={receivePageCount}
            onPageSelect={(physicalPage) => {
              let offset = 0;
              const target = pages.findIndex((_, index) => {
                offset += counts[index] || 1;
                return physicalPage < offset;
              });
              if (target >= 0) onPageSelect(target);
            }}
            headingIdPrefix="studio-notebook-"
          />
          <footer>
            Page {authoredPage + 1} / {pages.length}
          </footer>
        </article>
      </div>
      {biography && authoredPage === 0 && (
        <p className="editor-hint">
          This opening page also includes the published biography from Identity
          &amp; copy.
        </p>
      )}
      {visible && (
        <p className="editor-hint">
          The notebook has fixed paper pages. This preview uses the same text
          size and available space. Any content beyond this sheet must move to
          another page.
        </p>
      )}
    </div>
  );
}
