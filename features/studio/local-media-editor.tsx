'use client';
import { useEffect, useId, useState } from 'react';
import { attachmentPublication } from './entry-media';
import type { Content } from '@/lib/content/types';
export type MediaAction = (
  record: Content,
  action: 'save' | 'delete' | 'unpublish',
  data?: Record<string, any>,
) => Promise<boolean>;
export function LocalMediaEditor({
  records,
  busy,
  onAction,
  onDirtyChange,
  onPublishAssets,
}: {
  records: Content[];
  busy: boolean;
  onAction?: MediaAction;
  onDirtyChange?: (key: string, dirty: boolean) => void;
  onPublishAssets?: (records: Content[]) => Promise<void>;
}) {
  if (!onAction || !records.length) return null;
  return (
    <details className="local-media-editor">
      <summary>Attachment details · {records.length}</summary>
      <p>
        Edit descriptions, video posters and captions for this entry. Changes
        stay private until the media is published.
      </p>
      <div className="local-media-list">
        {records.map((record) => (
          <LocalMediaItem
            key={`${record.id}:${record.revision}`}
            record={record}
            records={records}
            busy={busy}
            onAction={onAction}
            onDirtyChange={onDirtyChange}
            onPublishAssets={onPublishAssets}
          />
        ))}
      </div>
    </details>
  );
}
function LocalMediaItem({
  record,
  records,
  busy,
  onAction,
  onDirtyChange,
  onPublishAssets,
}: {
  record: Content;
  records: Content[];
  busy: boolean;
  onAction: MediaAction;
  onDirtyChange?: (key: string, dirty: boolean) => void;
  onPublishAssets?: (records: Content[]) => Promise<void>;
}) {
  const [data, setData] = useState(record.draft);
  const [confirm, setConfirm] = useState<'delete' | 'unpublish' | null>(null);
  const [notice, setNotice] = useState('');
  const dirty = JSON.stringify(data) !== JSON.stringify(record.draft);
  const publication = attachmentPublication(record.id, records);
  const instance = useId();
  useEffect(() => {
    onDirtyChange?.(instance, dirty);
    return () => onDirtyChange?.(instance, false);
  }, [dirty, instance, onDirtyChange]);
  return (
    <fieldset className="local-media-item" disabled={busy}>
      <legend>{record.draft.title}</legend>
      <p className="editor-hint">
        {record.draft.mime} ·{' '}
        {record.published
          ? JSON.stringify(record.draft) === JSON.stringify(record.published)
            ? 'Published'
            : 'Unpublished changes'
          : 'Private draft'}
      </p>
      <label className="studio-field">
        File title
        <input
          value={data.title}
          maxLength={150}
          onChange={(e) => setData({ ...data, title: e.target.value })}
        />
      </label>
      <label className="studio-field">
        Description / alternative text
        <textarea
          rows={2}
          value={data.alt}
          maxLength={1000}
          onChange={(e) => setData({ ...data, alt: e.target.value })}
        />
      </label>
      {String(data.mime).startsWith('video/') && (
        <div className="project-editor-grid">
          {[
            ['posterMediaId', 'Poster image', 'image/'],
            ['captionsMediaId', 'Captions (WebVTT)', 'text/vtt'],
          ].map(([key, label, mime]) => (
            <label className="studio-field" key={key}>
              {label}
              <select
                value={data[key] || ''}
                onChange={(e) => setData({ ...data, [key]: e.target.value })}
              >
                <option value="">None</option>
                {records
                  .filter((item) => String(item.draft.mime).startsWith(mime))
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.draft.title}
                    </option>
                  ))}
              </select>
            </label>
          ))}
        </div>
      )}
      <div className="local-media-actions">
        <button
          className="button"
          type="button"
          disabled={!dirty || !data.alt.trim() || !data.title.trim()}
          onClick={async () => {
            if (await onAction(record, 'save', data))
              setNotice(
                'Attachment details saved. Publish referenced media to make these changes public.',
              );
          }}
        >
          Save details
        </button>
        {onPublishAssets && publication.pending.length > 0 && (
          <button
            className="button"
            type="button"
            disabled={dirty}
            onClick={() => void onPublishAssets(publication.pending)}
          >
            Publish file
          </button>
        )}
        {dirty && (
          <button
            className="quiet-button"
            type="button"
            onClick={() => setData(record.draft)}
          >
            Discard details
          </button>
        )}
        {record.published && (
          <button
            className="quiet-button"
            type="button"
            disabled={dirty}
            onClick={() => setConfirm('unpublish')}
          >
            Unpublish
          </button>
        )}
        <button
          className="quiet-button delete-button"
          type="button"
          onClick={() => setConfirm('delete')}
        >
          Delete file
        </button>
      </div>
      {confirm && (
        <div
          className="local-media-confirm"
          role="group"
          aria-label="Confirm media action"
        >
          <p>
            {confirm === 'delete'
              ? 'Delete this file permanently? Content that still references it will need another attachment.'
              : 'Make this media private? Published content must stop using it first.'}
          </p>
          <button
            type="button"
            className="button"
            onClick={async () => {
              if (await onAction(record, confirm)) setConfirm(null);
            }}
          >
            Confirm {confirm}
          </button>
          <button
            type="button"
            className="quiet-button"
            onClick={() => setConfirm(null)}
          >
            Cancel
          </button>
        </div>
      )}
      {publication.error && <p className="form-error">{publication.error}</p>}
      {notice && (
        <p role="status" className="editor-hint">
          {notice}
        </p>
      )}
    </fieldset>
  );
}
