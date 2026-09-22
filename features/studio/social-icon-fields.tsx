'use client';
import { useEffect, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import type { Content } from '@/lib/content/types';
import { socialIcon } from '@/lib/content/social-links';
import { projectContentUrl } from '@/features/portfolio/project-markdown-content';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import type { PhotoMediaActions } from './about-photo-fields';
import { prepareSocialIconUpload } from './social-icon-upload';
import './social-icon-fields.css';

export function SocialIconMark({ platform }: { platform: string }) {
  const icon = socialIcon(platform);
  return (
    <svg
      viewBox={icon.viewBox}
      aria-hidden="true"
      fill={icon.filled ? 'currentColor' : 'none'}
      stroke={icon.filled ? 'none' : 'currentColor'}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={icon.path} />
    </svg>
  );
}

export function SocialIconFields({
  mediaId,
  platform,
  records,
  onSelect,
  busy,
  onUpload,
  onPublishAssets,
  onPreparingChange,
}: PhotoMediaActions & {
  mediaId: string;
  platform: string;
  records: Content[];
  onSelect: (id: string) => void;
  onPreparingChange: (preparing: boolean) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState('');
  const [feedback, setFeedback] = useState('');
  const [preparing, setPreparing] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      onPreparingChange(false);
    };
  }, [onPreparingChange]);
  const media = records.find(
    (record) =>
      record.kind === 'media' &&
      record.id === mediaId &&
      record.draft.mime === 'image/png',
  );
  const src = media ? projectContentUrl(media.draft.url, 'media') : '';
  const pending =
    media && JSON.stringify(media.draft) !== JSON.stringify(media.published);
  const preset = socialIcon(platform);
  return (
    <fieldset
      className="social-icon-fields wide-field"
      disabled={busy || preparing}
    >
      <legend>About icon</legend>
      <p>
        The card shows only your icon. Dark or colored icons read clearly on the
        cream surface. Its name and destination remain available to keyboard and
        screen-reader users.
      </p>
      <div className="social-icon-editor-grid">
        <div className="social-icon-preview" aria-label="About icon preview">
          {src ? (
            <img src={src} alt={media?.draft.alt || `${preset.label} icon`} />
          ) : (
            <SocialIconMark platform={platform} />
          )}
        </div>
        <div>
          <label className="studio-field">
            Custom icon from library (optional)
            <NativeSelect
              value={mediaId}
              onChange={(event) => {
                onSelect(event.target.value);
                setFeedback('');
              }}
            >
              <NativeSelectOption value="">
                Use the {preset.label} preset
              </NativeSelectOption>
              {mediaId && !media && (
                <NativeSelectOption value={mediaId}>
                  Unavailable icon
                </NativeSelectOption>
              )}
              {records
                .filter(
                  (record) =>
                    record.kind === 'media' &&
                    record.draft.mime === 'image/png',
                )
                .map((record) => (
                  <NativeSelectOption key={record.id} value={record.id}>
                    {record.draft.title || 'Untitled PNG'}
                    {record.published ? '' : ' · private draft'}
                  </NativeSelectOption>
                ))}
            </NativeSelect>
            <small>
              A custom PNG replaces this About card’s preset. Contact keeps its
              platform icon.
            </small>
          </label>
          {mediaId && (
            <button
              type="button"
              className="button"
              onClick={() => onSelect('')}
            >
              Use preset icon
            </button>
          )}
          {media && (
            <p className="social-icon-description">
              <strong>Description:</strong>{' '}
              {media.draft.alt || 'Add a description in the Media library.'}
            </p>
          )}
          {mediaId && !media && (
            <p className="form-error" role="status">
              This icon is unavailable. Choose a PNG or use the preset.
            </p>
          )}
        </div>
      </div>
      <details className="photo-upload-tools">
        <summary>Upload a custom icon</summary>
        <div>
          <label className="studio-field">
            PNG or SVG icon
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/svg+xml,.png,.svg"
              onChange={(event) => {
                setFile(event.target.files?.[0] || null);
                setFeedback('');
              }}
            />
            <small>
              PNG up to 5 MiB or SVG up to 1 MiB. Transparent icons keep their
              original colors and proportions.
            </small>
          </label>
          <label className="studio-field">
            Icon description
            <input
              value={alt}
              maxLength={1000}
              placeholder="For example, Discord logo"
              onChange={(event) => setAlt(event.target.value)}
            />
          </label>
          <button
            type="button"
            className="button"
            disabled={!file || !alt.trim() || busy || preparing}
            onClick={async () => {
              if (!file) return;
              setPreparing(true);
              onPreparingChange(true);
              setFeedback('');
              try {
                const prepared = await prepareSocialIconUpload(file);
                if (!mounted.current) return;
                const uploaded = await onUpload(prepared, alt.trim());
                if (!uploaded || !mounted.current) return;
                onSelect(uploaded.id);
                setFile(null);
                setAlt('');
                if (fileInput.current) fileInput.current.value = '';
                setFeedback(
                  'Icon uploaded privately and selected. Save your social link draft to preview it.',
                );
              } catch (error) {
                if (mounted.current)
                  setFeedback(
                    error instanceof Error
                      ? error.message
                      : 'The icon could not be prepared. Choose a PNG or SVG.',
                  );
              } finally {
                if (mounted.current) {
                  setPreparing(false);
                  onPreparingChange(false);
                }
              }
            }}
          >
            <Upload size={15} />
            {preparing ? 'Preparing icon…' : 'Upload and select'}
          </button>
          <p className="social-icon-help">
            SVGs are converted to transparent PNGs before upload. No SVG editing
            is needed; choose an ordinary downloaded icon.
          </p>
        </div>
      </details>
      {feedback && (
        <p className="social-icon-feedback" role="status">
          {feedback}
        </p>
      )}
      {pending && (
        <div className="photo-publication-note" role="status">
          <p>
            {media.published
              ? 'This icon has unpublished changes.'
              : 'This icon is private.'}{' '}
            Publish the image before publishing this link in About. The image
            becomes public immediately; your social link edits stay as drafts.
          </p>
          <button
            type="button"
            className="button"
            onClick={() => void onPublishAssets([media])}
          >
            {media.published ? 'Publish icon changes' : 'Publish selected icon'}
          </button>
        </div>
      )}
    </fieldset>
  );
}
