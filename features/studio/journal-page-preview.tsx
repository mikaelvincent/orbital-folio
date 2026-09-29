'use client';
/* oxlint-disable jsx-a11y/no-noninteractive-tabindex -- The named paper overflow region needs focus for keyboard scrolling at its fixed preview size. */
import { useCallback, useMemo, useState } from 'react';
import type { Content } from '@/lib/content/types';
import { notebookSpreadCount } from '@/lib/content/notebook-pages';
import { NotebookSpread } from '@/features/portfolio/notebook-spread';
import './journal-page-preview.css';

/** The same automatic paper layout used by the mounted public notebook. */
export function JournalPagePreview({
  data,
  records,
  recordId,
  body,
  media,
}: {
  data: Record<string, any>;
  records: Content[];
  recordId?: string;
  body: string;
  media: Record<string, any>[];
}) {
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
    site,
  ]);
  const [measurement, setMeasurement] = useState<{
    signature: string;
    count: number;
  } | null>(null);
  const [selection, setSelection] = useState<{
    signature: string;
    page: number;
  } | null>(null);
  const count = measurement?.signature === signature ? measurement.count : 1;
  const spreads = notebookSpreadCount(count);
  const page =
    selection?.signature === signature
      ? Math.min(selection.page, spreads - 1)
      : 0;
  const receivePageCount = useCallback(
    (total: number) => {
      setMeasurement((previous) =>
        previous?.signature === signature && previous.count === total
          ? previous
          : { signature, count: Math.max(1, total) },
      );
    },
    [signature],
  );
  const selectPage = (next: number) =>
    setSelection({ signature, page: Math.max(0, Math.min(next, spreads - 1)) });

  return (
    <div className="journal-page-review">
      <p className="journal-paper-scroll-hint">
        Full-size paper preview. Scroll sideways to inspect both facing pages.
      </p>
      <div
        className="journal-paper-stage"
        role="region"
        aria-label="Full-size notebook spread"
        tabIndex={0}
      >
        <article
          className="journal-paper-preview"
          aria-label={`Notebook spread ${page + 1} preview`}
        >
          <NotebookSpread
            site={site}
            title={title}
            subtitle={subtitle}
            body={body}
            media={previewMedia}
            biography={biography}
            page={page}
            pageCount={count}
            onPageCount={receivePageCount}
            onPageSelect={selectPage}
            headingIdPrefix="studio-notebook-"
          />
        </article>
      </div>
      {biography && page === 0 && (
        <p className="editor-hint">
          This opening page also includes the published biography from the
          room’s Profile &amp; notebook settings.
        </p>
      )}
      <p className="editor-hint">
        The notebook lays out your story across both facing pages automatically.
        This preview uses the same text size and available space as the reader.
      </p>
    </div>
  );
}
