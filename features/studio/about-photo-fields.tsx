'use client';
import { useId, useRef, useState, type ReactNode } from 'react';
import { Upload } from 'lucide-react';
import type { Content } from '@/lib/content/types';
import {
  imageCropStyle,
  normalizeImageCrop,
  type ImageCrop,
} from '@/lib/content/about-photos';
import { projectContentUrl } from '@/features/portfolio/project-markdown-content';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import './about-photo-fields.css';

export type PhotoMediaActions = {
  busy: boolean;
  onUpload: (file: File, alt: string) => Promise<Record<string, any> | null>;
  onPublishAssets: (assets: Content[]) => Promise<void>;
};

/** Crop the display only: the library's uploaded original is never rewritten. */
export function PhotoCropFields({
  title,
  media,
  value,
  aspect,
  onChange,
  caption,
  overlay,
}: {
  title: string;
  media: Content;
  value: unknown;
  aspect: number;
  onChange: (crop: ImageCrop) => void;
  caption?: ReactNode;
  overlay?: ReactNode;
}) {
  const cropId = useId();
  const crop = normalizeImageCrop(value);
  const src = projectContentUrl(media.draft.url, 'media');
  return (
    <fieldset className="photo-crop-fields">
      <legend>{title}</legend>
      <div className="photo-crop-paper">
        <div className="photo-crop-preview" style={{ aspectRatio: aspect }}>
          {src && (
            <img
              src={src}
              alt={media.draft.alt || media.draft.title || 'Selected photo'}
              style={imageCropStyle(crop)}
            />
          )}
          {overlay && <div className="photo-crop-overlay">{overlay}</div>}
        </div>
        {caption && (
          <div
            className="photo-crop-caption"
            style={{ aspectRatio: (aspect * 0.72) / 0.28 }}
          >
            {caption}
          </div>
        )}
      </div>
      {(
        [
          ['x', 'Horizontal position', 0, 1, 0.01],
          ['y', 'Vertical position', 0, 1, 0.01],
          ['zoom', 'Zoom', 1, 3, 0.05],
        ] as const
      ).map(([key, label, min, max, step]) => (
        <label
          className="studio-field photo-crop-control"
          key={key}
          htmlFor={`${cropId}-${key}`}
        >
          <span>
            {label}
            <output>
              {key === 'zoom'
                ? `${crop[key].toFixed(2)}×`
                : `${Math.round(crop[key] * 100)}%`}
            </output>
          </span>
          <input
            id={`${cropId}-${key}`}
            aria-label={label}
            type="range"
            min={min}
            max={max}
            step={step}
            value={crop[key]}
            onChange={(event) =>
              onChange({ ...crop, [key]: Number(event.target.value) })
            }
          />
        </label>
      ))}
      <button
        className="quiet-button"
        type="button"
        onClick={() => onChange(normalizeImageCrop(null))}
      >
        Reset this crop
      </button>
    </fieldset>
  );
}

export function PhotoMediaFields({
  title,
  description,
  emptyLabel,
  mediaId,
  records,
  onSelect,
  busy,
  onUpload,
  onPublishAssets,
  children,
}: PhotoMediaActions & {
  title: string;
  description: string;
  emptyLabel: string;
  mediaId: string;
  records: Content[];
  onSelect: (id: string) => void;
  children: (media: Content) => ReactNode;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState('');
  const [feedback, setFeedback] = useState('');
  const uploadInput = useRef<HTMLInputElement>(null);
  const media = records.find(
    (record) =>
      record.id === mediaId &&
      record.kind === 'media' &&
      String(record.draft.mime).startsWith('image/'),
  );
  const unpublished = media && !media.published;
  const changed =
    media &&
    !!media.published &&
    JSON.stringify(media.draft) !== JSON.stringify(media.published);
  return (
    <section className="about-photo-fields wide-field" aria-label={title}>
      <h3>{title}</h3>
      <p>{description}</p>
      <label className="studio-field">
        Choose from library
        <NativeSelect
          value={mediaId}
          onChange={(event) => {
            onSelect(event.target.value);
            setFeedback('');
          }}
        >
          <NativeSelectOption value="">{emptyLabel}</NativeSelectOption>
          {mediaId && !media && (
            <NativeSelectOption value={mediaId}>
              Unavailable image
            </NativeSelectOption>
          )}
          {records
            .filter(
              (record) =>
                record.kind === 'media' &&
                String(record.draft.mime).startsWith('image/'),
            )
            .map((record) => (
              <NativeSelectOption key={record.id} value={record.id}>
                {record.draft.title || record.draft.alt || 'Untitled image'}
                {record.published ? '' : ' · private draft'}
              </NativeSelectOption>
            ))}
        </NativeSelect>
      </label>
      <details className="photo-upload-tools">
        <summary>Upload a new photo</summary>
        <div>
          <label className="studio-field">
            Image file
            <input
              ref={uploadInput}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={(event) => {
                setFile(event.target.files?.[0] || null);
                setFeedback('');
              }}
            />
            <small>PNG, JPEG, WebP or GIF · up to 5 MiB.</small>
          </label>
          <label className="studio-field">
            Description / alternative text
            <input
              value={alt}
              maxLength={1000}
              placeholder="Describe who or what appears in this photo"
              onChange={(event) => setAlt(event.target.value)}
            />
          </label>
          <button
            className="button"
            type="button"
            disabled={busy || !file || !alt.trim()}
            onClick={async () => {
              if (!file) return;
              if (
                ![
                  'image/png',
                  'image/jpeg',
                  'image/webp',
                  'image/gif',
                ].includes(file.type)
              ) {
                setFeedback('Choose a PNG, JPEG, WebP or GIF image.');
                return;
              }
              const uploaded = await onUpload(file, alt.trim());
              if (!uploaded) return;
              onSelect(uploaded.id);
              setFile(null);
              setAlt('');
              if (uploadInput.current) uploadInput.current.value = '';
              setFeedback(
                'Photo uploaded privately and selected. Adjust its crop, then save your draft.',
              );
            }}
          >
            <Upload size={15} /> Upload and select
          </button>
        </div>
      </details>
      {feedback && (
        <p role="status" className="photo-field-feedback">
          {feedback}
        </p>
      )}
      {media ? (
        <>
          <p className="photo-alt-description">
            <strong>Image description:</strong>{' '}
            {media.draft.alt || 'No description. Add one in the Media library.'}
          </p>
          <div className="photo-crop-grid">{children(media)}</div>
          {(unpublished || changed) && (
            <div className="photo-publication-note" role="status">
              <p>
                {unpublished
                  ? 'This photo is private. Publish the image before publishing the identity or social link that uses it.'
                  : 'This image has unpublished changes. The previews show its draft; publish the image to use these changes on the public site.'}{' '}
                Publishing the image makes its file public immediately; your
                identity and social link edits stay as drafts.
              </p>
              <button
                className="button"
                type="button"
                disabled={busy}
                onClick={() => void onPublishAssets([media])}
              >
                {unpublished
                  ? 'Publish selected image'
                  : 'Publish image changes'}
              </button>
            </div>
          )}
        </>
      ) : mediaId ? (
        <p className="form-error" role="status">
          This image is unavailable. Choose another image before publishing.
        </p>
      ) : null}
      <p className="photo-field-help">
        Cropping changes the display only. The original image stays in your
        library.
      </p>
    </section>
  );
}
