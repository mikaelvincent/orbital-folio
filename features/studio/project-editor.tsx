'use client';
import { useMemo, useRef, useState } from 'react';
import {
  Eye,
  FileText,
  ImagePlus,
  Monitor,
  Smartphone,
  Upload,
} from 'lucide-react';
import {
  PROJECT_CATEGORIES,
  PROJECT_STORY_TEMPLATE,
  projectBody,
  projectCategories,
  projectSlug,
} from '@/lib/content/project-content';
import {
  CASE_STUDY_CATEGORIES,
  CASE_STUDY_STORY_TEMPLATE,
  caseStudyBody,
  caseStudyCategories,
} from '@/lib/content/case-study-content';
import type { Content } from '@/lib/content/types';
import { normalizeNotebookBody } from '@/lib/content/notebook-pages';
import { JournalPagePreview } from './journal-page-preview';
import {
  ProjectMarkdown,
  ProjectMedia,
} from '@/features/portfolio/project-markdown';
import {
  insertProjectMedia,
  projectUploadError,
  projectAssetPublication,
} from './project-editor-helpers';
import './project-editor.css';

export type ProjectEditorProps = {
  kind?: 'project' | 'experience' | 'journal';
  data: Record<string, any>;
  records: Content[];
  busy: boolean;
  onChange: (data: Record<string, any>) => void;
  onUpload: (file: File, alt: string) => Promise<Record<string, any> | null>;
  onPublishAssets: (assets: Content[]) => Promise<void>;
  journalRecordId?: string;
};

export function ProjectEditor({
  kind = 'project',
  data,
  records,
  busy,
  onChange,
  onUpload,
  onPublishAssets,
  journalRecordId,
}: ProjectEditorProps) {
  const isCaseStudy = kind === 'experience';
  const isJournal = kind === 'journal';
  const noun = isJournal ? 'section' : isCaseStudy ? 'case study' : 'project';
  const title = isJournal
    ? 'Notebook section'
    : isCaseStudy
      ? 'Case study'
      : 'Project';
  const collection = isCaseStudy ? 'All case studies' : 'All projects';
  const categoryOptions = isCaseStudy
    ? CASE_STUDY_CATEGORIES
    : PROJECT_CATEGORIES;
  const storyBody = isCaseStudy ? caseStudyBody : projectBody;
  const storyTemplate = isJournal
    ? '## A moment that mattered\n\nTell the story in your own words.\n\n## What stayed with me\n\nShare what you learned or how it shaped you.\n'
    : isCaseStudy
      ? CASE_STUDY_STORY_TEMPLATE
      : PROJECT_STORY_TEMPLATE;
  const [mode, setMode] = useState<'write' | 'preview'>('write');
  const [frame, setFrame] = useState<'landscape' | 'portrait'>('landscape');
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState('');
  const [mediaId, setMediaId] = useState('');
  const [feedback, setFeedback] = useState('');
  const source = useRef<HTMLTextAreaElement>(null);
  const uploadInput = useRef<HTMLInputElement>(null);
  const selection = useRef<{ start: number; end: number } | null>(null);
  const descriptionInput = useRef<HTMLInputElement>(null);
  const dataRef = useRef(data);
  dataRef.current = data;
  const sectionBody = storyBody(data);
  const body = isJournal ? normalizeNotebookBody(sectionBody) : sectionBody;
  const categories: string[] = isCaseStudy
    ? caseStudyCategories(data)
    : projectCategories(data);
  const metadataFields = isJournal
    ? []
    : isCaseStudy
      ? [
          ['role', 'Role'],
          ['organization', 'Organization'],
          ['period', 'Period'],
        ]
      : [
          ['role', 'Role'],
          ['stack', 'Tools'],
        ];
  const media: Record<string, any>[] = useMemo(
    () =>
      records
        .filter((r) => r.kind === 'media')
        .map((r) => ({ ...r.draft, id: r.id, published: !!r.published })),
    [records],
  );
  const visualMedia = media.filter((m) => /^image\/|^video\//.test(m.mime));
  const cover = media.find((m) => m.id === data.mediaId);
  const { pending: pendingAssets, error: assetError } = projectAssetPublication(
    data,
    records,
    kind,
  );
  const change = (key: string, value: unknown) =>
    onChange({ ...data, [key]: value });
  const changeBody = (nextBody: string) => change('body', nextBody);
  const insert = (item: Record<string, any>) => {
    const currentBody = isJournal
      ? normalizeNotebookBody(storyBody(dataRef.current))
      : storyBody(dataRef.current);
    const inserted = insertProjectMedia(
      currentBody,
      item,
      selection.current?.start,
      selection.current?.end,
    );
    onChange({
      ...dataRef.current,
      body: inserted.body,
    });
    selection.current = { start: inserted.caret, end: inserted.caret };
    setMode('write');
    requestAnimationFrame(() => {
      source.current?.focus();
      source.current?.setSelectionRange(inserted.caret, inserted.caret);
    });
  };
  const receiveFiles = (files: FileList | File[]) => {
    if (busy || !files.length) return;
    if (files.length > 1) {
      setFeedback(
        'Add one media file at a time so each has its own description.',
      );
      return;
    }
    const next = files[0];
    const invalid = projectUploadError(next);
    if (invalid) {
      setFeedback(invalid);
      return;
    }
    setFile(next);
    setFeedback(
      `${next.name} is ready. Add a description, then choose Upload and insert. Nothing has been uploaded yet.`,
    );
    descriptionInput.current?.focus();
  };
  const textField = (
    key: string,
    label: string,
    options: { required?: boolean; type?: string; placeholder?: string } = {},
  ) => (
    <label className="studio-field" key={key}>
      {label}
      <input
        value={data[key] || ''}
        onChange={(e) => change(key, e.target.value)}
        maxLength={20000}
        {...options}
      />
    </label>
  );
  return (
    <fieldset className="project-editor wide-field" disabled={busy}>
      <legend className="sr-only">{title} content</legend>
      <section
        className="project-editor-section"
        aria-labelledby="project-details-heading"
      >
        <div className="project-editor-section-heading">
          <span>01</span>
          <div>
            <h3 id="project-details-heading">{title} details</h3>
            <p>
              {isJournal
                ? 'Each section has its own page marker. Write one story and the notebook lays it out across pages automatically.'
                : 'The essentials visitors see in the collection.'}
            </p>
          </div>
        </div>
        <div className="project-editor-grid">
          {textField('title', 'Title', {
            required: true,
            placeholder: `Give the ${noun} a clear name`,
          })}
          <label className="studio-field">
            URL slug
            <input
              value={data.slug || ''}
              placeholder={
                projectSlug(data.title || '') || 'generated-from-title'
              }
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              onChange={(e) => change('slug', e.target.value)}
              maxLength={100}
            />
            <small>
              Generated from the title when first saved. Later title edits keep
              this URL.
            </small>
          </label>
          {isJournal && textField('subtitle', 'Subtitle · optional')}
          {!isJournal && (
            <>
              <label className="studio-field wide-field">
                Short description
                <textarea
                  value={data.summary || ''}
                  rows={3}
                  required
                  maxLength={20000}
                  placeholder="What is it, who is it for, and why does it matter?"
                  onChange={(e) => change('summary', e.target.value)}
                />
              </label>
              <fieldset className="project-category-field wide-field">
                <legend>Categories</legend>
                <p>
                  Choose one or more. Every {noun} appears in {collection}{' '}
                  automatically.
                </p>
                <div className="project-category-options">
                  {categoryOptions.map((category) => (
                    <label key={category.id}>
                      <input
                        type="checkbox"
                        checked={categories.includes(category.id)}
                        onChange={(e) =>
                          change(
                            'categories',
                            e.target.checked
                              ? [...categories, category.id]
                              : categories.filter((id) => id !== category.id),
                          )
                        }
                      />
                      <span>{category.label}</span>
                    </label>
                  ))}
                </div>
                {!categories.length && (
                  <small>
                    {Array.isArray(data.categories)
                      ? 'Select at least one category before saving.'
                      : `This older ${noun} is currently shown in ${collection}. Add categories when ready.`}
                  </small>
                )}
              </fieldset>
              <label className="studio-field">
                Cover image <span className="project-optional">Optional</span>
                <select
                  value={data.mediaId || ''}
                  onChange={(e) => change('mediaId', e.target.value)}
                >
                  <option value="">No cover image</option>
                  {media
                    .filter((m) => String(m.mime).startsWith('image/'))
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title}
                        {m.published ? '' : ' · draft'}
                      </option>
                    ))}
                </select>
                <small>Upload below to add a new image to this list.</small>
              </label>
              {textField('role', 'My role · optional')}
              {isCaseStudy ? (
                <>
                  {textField('organization', 'Organization / team · optional')}
                  {textField('period', 'Period · optional')}
                </>
              ) : (
                <>
                  {textField('stack', 'Tools / technology · optional', {
                    placeholder: 'React, TypeScript, …',
                  })}
                  {textField('demoUrl', 'Live project URL · optional', {
                    type: 'url',
                    placeholder: 'https://',
                  })}
                  {textField('sourceUrl', 'Source repository URL · optional', {
                    type: 'url',
                    placeholder: 'https://',
                  })}
                </>
              )}
            </>
          )}
        </div>
      </section>
      <section
        className="project-editor-section"
        aria-labelledby="project-story-heading"
      >
        <div className="project-editor-section-heading">
          <span>02</span>
          <div>
            <h3 id="project-story-heading">The story</h3>
            <p>
              Write or paste Markdown. Use headings, lists, links, images and
              videos.
            </p>
          </div>
        </div>
        <div className="project-write-toolbar">
          <div role="group" aria-label="Story editor mode">
            <button
              type="button"
              aria-pressed={mode === 'write'}
              onClick={() => setMode('write')}
            >
              <FileText size={15} />
              Write
            </button>
            <button
              type="button"
              aria-pressed={mode === 'preview'}
              onClick={() => setMode('preview')}
            >
              <Eye size={15} />
              Preview
            </button>
          </div>
          {!body.trim() && (
            <button
              type="button"
              onClick={() => {
                changeBody(storyTemplate);
                setMode('write');
              }}
            >
              Use section starter
            </button>
          )}
          {mode === 'preview' && !isJournal && (
            <div role="group" aria-label="Preview orientation">
              <button
                type="button"
                aria-pressed={frame === 'landscape'}
                onClick={() => setFrame('landscape')}
              >
                <Monitor size={15} />
                Landscape
              </button>
              <button
                type="button"
                aria-pressed={frame === 'portrait'}
                onClick={() => setFrame('portrait')}
              >
                <Smartphone size={15} />
                Portrait
              </button>
            </div>
          )}
        </div>
        {mode === 'write' ? (
          <label className="studio-field project-markdown-field">
            <span className="sr-only">{title} Markdown</span>
            <textarea
              ref={source}
              value={body}
              rows={19}
              maxLength={100000}
              spellCheck
              onSelect={(e) => {
                selection.current = {
                  start: e.currentTarget.selectionStart,
                  end: e.currentTarget.selectionEnd,
                };
              }}
              onDragOver={(event) => {
                if (event.dataTransfer.types.includes('Files'))
                  event.preventDefault();
              }}
              onDrop={(event) => {
                if (!event.dataTransfer.files.length) return;
                event.preventDefault();
                selection.current = {
                  start: event.currentTarget.selectionStart,
                  end: event.currentTarget.selectionEnd,
                };
                receiveFiles(event.dataTransfer.files);
              }}
              onPaste={(event) => {
                if (!event.clipboardData.files.length) return;
                event.preventDefault();
                selection.current = {
                  start: event.currentTarget.selectionStart,
                  end: event.currentTarget.selectionEnd,
                };
                receiveFiles(event.clipboardData.files);
              }}
              onChange={(e) => changeBody(e.target.value)}
              placeholder="## The idea\n\nTell the story in your own words…"
            />
            <small>
              {body.length.toLocaleString()} / 100,000 characters · HTML is not
              executed.
              {isJournal &&
                ' Pages are laid out automatically in Preview.'}{' '}
              Drop or paste a media file here to prepare an upload.
            </small>
          </label>
        ) : !isJournal ? (
          <div className={`project-preview-stage is-${frame}`}>
            <article
              className="project-preview-document"
              aria-label={`${frame} ${noun} preview`}
            >
              <p className="eyebrow">UNSAVED CONTENT PREVIEW</p>
              <h2>{data.title || `Untitled ${noun}`}</h2>
              {data.summary && (
                <p className="project-preview-summary">{data.summary}</p>
              )}
              {metadataFields.some(([key]) => data[key]) && (
                <dl className="project-preview-meta">
                  {metadataFields.map(([key, label]) =>
                    data[key] ? (
                      <div key={key}>
                        <dt>{label}</dt>
                        <dd>{data[key]}</dd>
                      </div>
                    ) : null,
                  )}
                </dl>
              )}
              {cover && <ProjectMedia item={cover} media={media} />}
              {body.trim() ? (
                <ProjectMarkdown body={body} media={media} />
              ) : (
                <p>Add your story in Write to preview it here.</p>
              )}
            </article>
            <p className="editor-hint">
              Content-width preview; use Preview saved draft to check the
              complete portfolio.
            </p>
          </div>
        ) : null}
        {isJournal && mode === 'preview' && (
          <JournalPagePreview
            data={data}
            records={records}
            recordId={journalRecordId}
            body={body}
            media={media}
          />
        )}
        {typeof data.body !== 'string' && body && (
          <p className="editor-hint">
            Your existing sections are included here. Editing the story moves
            them into one Markdown document without deleting the original
            fields.
          </p>
        )}
        <details className="project-media-tools" open>
          <summary>
            <ImagePlus size={17} />
            Images and video
          </summary>
          <div className="project-media-grid">
            <div className="project-media-upload">
              <label className="studio-field">
                Upload to this {noun}
                <input
                  ref={uploadInput}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,text/vtt,.vtt"
                  onChange={(e) => {
                    if (e.target.files?.length) receiveFiles(e.target.files);
                    else setFile(null);
                  }}
                />
                <small>
                  Images up to 5 MiB · MP4/WebM up to 12 MiB · VTT captions up
                  to 256 KiB.
                </small>
              </label>
              {file && <p className="editor-hint">Selected: {file.name}</p>}
              <label className="studio-field">
                Description / alternative text
                <input
                  ref={descriptionInput}
                  value={alt}
                  maxLength={1000}
                  onChange={(e) => setAlt(e.target.value)}
                  placeholder="Describe what the media shows"
                />
              </label>
              <button
                type="button"
                className="button"
                disabled={!file || !alt.trim() || busy}
                onClick={async () => {
                  if (!file) return;
                  const invalid = projectUploadError(file);
                  if (invalid) {
                    setFeedback(invalid);
                    return;
                  }
                  const uploaded = await onUpload(file, alt.trim());
                  if (!uploaded) return;
                  if (uploaded.mime !== 'text/vtt') insert(uploaded);
                  setFeedback(
                    uploaded.mime === 'text/vtt'
                      ? 'Captions uploaded privately. Attach this file to a video in the Media library.'
                      : `Uploaded privately and inserted into your story. Save the ${noun} draft when ready.`,
                  );
                  setFile(null);
                  setAlt('');
                  if (uploadInput.current) uploadInput.current.value = '';
                }}
              >
                <Upload size={15} />
                Upload{' '}
                {file && /\.vtt$/i.test(file.name) ? 'captions' : 'and insert'}
              </button>
            </div>
            <div className="project-media-existing">
              <label className="studio-field">
                Use existing media
                <select
                  value={mediaId}
                  onChange={(e) => setMediaId(e.target.value)}
                >
                  <option value="">Choose an image or video</option>
                  {visualMedia.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                      {m.published ? '' : ' · draft'}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="button"
                disabled={!mediaId}
                onClick={() => {
                  const item = visualMedia.find((m) => m.id === mediaId);
                  if (item) insert(item);
                }}
              >
                Insert into story
              </button>
              <p className="editor-hint">
                Insertion uses the last cursor position. Manage video posters
                and captions in the Media library. Media publication is a
                separate, explicit step.
              </p>
            </div>
          </div>
          {feedback && (
            <p className="project-editor-feedback" role="status">
              {feedback}
            </p>
          )}
        </details>
      </section>
      <section
        className="project-media-publication"
        aria-label={`${title} media publication`}
      >
        <div>
          <strong>
            {assetError
              ? 'Check referenced media'
              : pendingAssets.length
                ? `${pendingAssets.length} referenced media item${pendingAssets.length === 1 ? '' : 's'} needs publication`
                : 'Referenced media is ready'}
          </strong>
          <p>
            {assetError ||
              (pendingAssets.length
                ? `Publishing media makes its files public immediately. Your ${noun} remains a draft until you publish it separately.`
                : 'New uploads remain private until you explicitly publish them.')}
          </p>
        </div>
        {pendingAssets.length > 0 && (
          <button
            type="button"
            className="button"
            disabled={busy}
            onClick={() => void onPublishAssets(pendingAssets)}
          >
            Publish referenced media
          </button>
        )}
      </section>
      <details className="project-editor-advanced">
        <summary>
          {isJournal
            ? 'Display order and sample metadata'
            : 'Display order and search settings'}
        </summary>
        <div className="project-editor-grid">
          <label className="studio-field">
            Display order
            <input
              type="number"
              step={1}
              value={data.order || 0}
              onChange={(e) => change('order', Number(e.target.value))}
            />
          </label>
          <label className="project-sample-setting">
            <input
              type="checkbox"
              checked={!!data.sample}
              onChange={(e) => change('sample', e.target.checked)}
            />
            Sample content metadata
          </label>
          {!isJournal && (
            <>
              {textField('subtitle', 'Subtitle · optional')}
              {textField('seoTitle', 'Search / social title · optional')}
              {textField(
                'seoDescription',
                'Search / social description · optional',
              )}
            </>
          )}
        </div>
      </details>
    </fieldset>
  );
}
