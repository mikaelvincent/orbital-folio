'use client';
import {
  searchMetadata,
  siteSearchFields,
  type SearchSection,
} from '@/lib/content/search-metadata';

const descriptionSources: Record<SearchSection, string> = {
  home: 'your role / subtitle',
  projects: 'the collection introduction, then the shared description',
  experience: 'the collection introduction, then the shared description',
  about: 'the opening biography, then the shared description',
  contact: 'the monitor subtitle',
  privacy: 'the privacy policy, then the shared description',
};

export function SearchMetadataFields({
  site,
  section,
  record,
  onChange,
}: {
  site: Record<string, any>;
  section: SearchSection;
  record?: Record<string, any>;
  onChange: (data: Record<string, any>) => void;
}) {
  const data = record || site;
  const [titleKey, descriptionKey] = record
    ? ['seoTitle', 'seoDescription']
    : siteSearchFields[section];
  const resolved = searchMetadata(site, section, record);
  return (
    <div className="studio-search-fields wide-field">
      <p className="editor-hint">
        Leave either field blank to follow your content. Overrides affect page
        titles, search results and shared links in both views.
      </p>
      <label className="studio-field">
        <span>Search / social title · optional</span>
        <input
          value={data[titleKey] ?? ''}
          placeholder={resolved.defaultTitle}
          maxLength={20000}
          onChange={(event) =>
            onChange({ ...data, [titleKey]: event.target.value })
          }
        />
        <small>
          {record
            ? 'Blank uses this entry’s title and your name.'
            : section === 'home'
              ? 'Blank uses your name and role / subtitle.'
              : 'Blank uses the page name and your name.'}
        </small>
      </label>
      <label className="studio-field">
        <span>Search / social description · optional</span>
        <textarea
          value={data[descriptionKey] ?? ''}
          placeholder={resolved.defaultDescription}
          rows={3}
          maxLength={20000}
          onChange={(event) =>
            onChange({ ...data, [descriptionKey]: event.target.value })
          }
        />
        <small>
          Blank uses{' '}
          {record
            ? 'this entry’s summary or subtitle, then its room’s description'
            : descriptionSources[section]}
          .
        </small>
      </label>
      <div
        className="studio-search-preview"
        aria-label="Search and sharing text preview"
      >
        <small>Preview using this draft</small>
        <p className="studio-search-preview-title">{resolved.title}</p>
        {resolved.description && <p>{resolved.description}</p>}
      </div>
    </div>
  );
}
