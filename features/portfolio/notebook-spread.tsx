'use client';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  NOTEBOOK_COLUMN_STRIDE,
  notebookPageLabel,
  notebookSpreadCount,
} from '@/lib/content/notebook-pages';
import {
  NotebookSectionPages,
  type NotebookSectionPagesProps,
} from './notebook-section-pages';
import './notebook-spread.css';

/** One continuous semantic story, with its next column on the facing page. */
export function NotebookSpread({
  page,
  pageCount,
  ready = true,
  measuring = false,
  section,
  onPageSelect,
  ...content
}: Omit<NotebookSectionPagesProps, 'spread'> & {
  pageCount: number;
  ready?: boolean;
  measuring?: boolean;
  section?: number;
}) {
  const spreads = notebookSpreadCount(pageCount);
  return (
    <div className="notebook-spread" data-notebook-section={section}>
      <NotebookSectionPages
        {...content}
        page={page * 2}
        spread
        onPageSelect={
          onPageSelect
            ? (column) => onPageSelect(Math.floor(column / 2))
            : undefined
        }
      />
      {[0, 1].map((side) => {
        const number = page * 2 + side + 1;
        const pageLabel = notebookPageLabel(number, pageCount);
        return (
          <div
            className="notebook-page"
            data-side={side ? 'right' : 'left'}
            data-empty={number > pageCount}
            key={side}
            style={{ left: side * NOTEBOOK_COLUMN_STRIDE }}
          >
            <header className="notebook-page-header">
              <span>{content.title}</span>
            </header>
            {spreads > 1 && (
              <footer className="notebook-page-footer">
                {side === 0 && (
                  <button
                    type="button"
                    disabled={!ready || page <= 0}
                    onClick={() => onPageSelect?.(page - 1)}
                    aria-label="Previous page in section"
                  >
                    <ChevronLeft size={18} aria-hidden="true" />
                  </button>
                )}
                <span>{pageLabel}</span>
                {side === 1 && (
                  <button
                    type="button"
                    disabled={!ready || page >= spreads - 1}
                    onClick={() => onPageSelect?.(page + 1)}
                    aria-label="Next page in section"
                  >
                    <ChevronRight size={18} aria-hidden="true" />
                  </button>
                )}
              </footer>
            )}
          </div>
        );
      })}
      {!measuring && (
        <span className="sr-only" aria-live="polite" aria-atomic="true">
          Pages {page * 2 + 1}–{Math.min(page * 2 + 2, pageCount)} of{' '}
          {pageCount}
        </span>
      )}
    </div>
  );
}
