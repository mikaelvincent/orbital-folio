'use client';
import { Checkbox } from '@/components/ui/checkbox';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { interfaceText } from '@/lib/content/interface-text';
import type { Content } from '@/lib/content/types';
import { seedSite } from '@/lib/content/seed';
import {
  ABOUT_PORTRAIT_ASPECT,
  normalizeImageCrop,
} from '@/lib/content/about-photos';
import {
  PhotoCropFields,
  PhotoMediaFields,
  type PhotoMediaActions,
} from './about-photo-fields';
import { fieldLabel, messageLabel, siteSections } from './studio-site-schema';

export function StudioSiteFields({
  data,
  setData,
  siteGroup,
  search,
  records,
  busy,
  onUpload,
  onPublishAssets,
}: {
  data: Record<string, any>;
  setData: (data: Record<string, any>) => void;
  siteGroup: string;
  search: string;
  records: Content[];
} & PhotoMediaActions) {
  const query = search.trim().toLowerCase();
  const groups = query
    ? siteSections
    : siteSections.filter((section) => section.id === siteGroup);
  let count = 0;
  return (
    <fieldset
      className="studio-site-fields studio-fields-reset"
      disabled={busy}
    >
      {groups.map((section) => {
        const matches = (label: string, value: unknown) =>
          !query ||
          `${section.title} ${section.area} ${data[section.area + 'Label'] || ''} ${label} ${String(value)}`
            .toLowerCase()
            .includes(query);
        const keys = section.keys.filter((key) =>
          matches(fieldLabel(key), data[key]),
        );
        const messages = (section.messages || []).filter((message) =>
          matches(messageLabel(message), interfaceText(data, message)),
        );
        if (!keys.length && !messages.length) return null;
        count += keys.length + messages.length;
        return (
          <section
            className="studio-settings-section"
            key={section.id}
            aria-label={section.title}
          >
            <header>
              <p className="eyebrow">
                {section.area === 'general'
                  ? 'General'
                  : data[section.area + 'Label']}
              </p>
              <h3>{section.title}</h3>
              <p>{section.description}</p>
            </header>
            <div className="studio-setting-grid">
              {keys.map((key) => {
                const value =
                  data[key] ?? (seedSite as Record<string, any>)[key] ?? '';
                if (key === 'portraitMediaId')
                  return (
                    <PhotoMediaFields
                      key={key}
                      title="Portrait image"
                      description="Used in the room frame and reading view."
                      emptyLabel="Use the default artwork"
                      mediaId={value}
                      records={records}
                      busy={busy}
                      onUpload={onUpload}
                      onPublishAssets={onPublishAssets}
                      onSelect={(id) =>
                        setData({
                          ...data,
                          portraitMediaId: id,
                          portraitCrop: normalizeImageCrop(null),
                          portraitReadingCrop: normalizeImageCrop(null),
                        })
                      }
                    >
                      {(media) => (
                        <>
                          <PhotoCropFields
                            title="Room frame crop"
                            media={media}
                            value={data.portraitCrop}
                            aspect={ABOUT_PORTRAIT_ASPECT}
                            onChange={(portraitCrop) =>
                              setData({ ...data, portraitCrop })
                            }
                          />
                          <PhotoCropFields
                            title="Reading view crop"
                            media={media}
                            value={data.portraitReadingCrop}
                            aspect={1}
                            onChange={(portraitReadingCrop) =>
                              setData({ ...data, portraitReadingCrop })
                            }
                          />
                        </>
                      )}
                    </PhotoMediaFields>
                  );
                if (typeof value === 'boolean')
                  return (
                    <label className="studio-check" key={key}>
                      <Checkbox
                        checked={value}
                        onCheckedChange={(checked) =>
                          setData({ ...data, [key]: checked })
                        }
                      />
                      <span>{fieldLabel(key)}</span>
                    </label>
                  );
                if (key === 'seoImageId')
                  return (
                    <label className="studio-field" key={key}>
                      {fieldLabel(key)}
                      <NativeSelect
                        value={value}
                        onChange={(event) =>
                          setData({ ...data, [key]: event.target.value })
                        }
                      >
                        <NativeSelectOption value="">
                          No image
                        </NativeSelectOption>
                        {records
                          .filter(
                            (record) =>
                              record.kind === 'media' &&
                              String(record.draft.mime).startsWith('image/'),
                          )
                          .map((record) => (
                            <NativeSelectOption
                              key={record.id}
                              value={record.id}
                            >
                              {record.draft.title}
                              {record.published ? '' : ' (draft)'}
                            </NativeSelectOption>
                          ))}
                      </NativeSelect>
                    </label>
                  );
                const long =
                  /Intro|Text|Message|Description|biography|headline/.test(
                    key,
                  ) || String(value).length > 100;
                return (
                  <label
                    className={`studio-field ${long ? 'wide-field' : ''}`}
                    key={key}
                  >
                    <span>{fieldLabel(key)}</span>
                    {long ? (
                      <textarea
                        value={value}
                        rows={4}
                        maxLength={20000}
                        onChange={(event) =>
                          setData({ ...data, [key]: event.target.value })
                        }
                      />
                    ) : (
                      <input
                        type={key === 'accent' ? 'color' : 'text'}
                        value={value}
                        maxLength={
                          key.endsWith('Label') &&
                          [
                            'projectsLabel',
                            'experienceLabel',
                            'aboutLabel',
                            'contactLabel',
                          ].includes(key)
                            ? 40
                            : 20000
                        }
                        onChange={(event) =>
                          setData({ ...data, [key]: event.target.value })
                        }
                      />
                    )}
                  </label>
                );
              })}
              {messages.map((message) => {
                const value = interfaceText(data, message);
                const tokens = [
                  ...new Set(message.match(/\{[a-zA-Z][a-zA-Z0-9]*\}/g) || []),
                ];
                const change = (value: string) =>
                  setData({
                    ...data,
                    interfaceText: { ...data.interfaceText, [message]: value },
                  });
                const changed = Object.hasOwn(
                  data.interfaceText || {},
                  message,
                );
                return (
                  <div
                    className={`studio-copy-field ${message.length > 90 ? 'wide-field' : ''}`}
                    key={message}
                  >
                    <label className="studio-field">
                      <span>{messageLabel(message)}</span>
                      {message.length > 90 ? (
                        <textarea
                          rows={3}
                          value={value}
                          required
                          maxLength={2000}
                          onChange={(event) => change(event.target.value)}
                        />
                      ) : (
                        <input
                          value={value}
                          required
                          maxLength={2000}
                          onChange={(event) => change(event.target.value)}
                        />
                      )}
                    </label>
                    <div className="studio-copy-help">
                      {tokens.length > 0 && (
                        <small>
                          Keep {tokens.join(', ')} — filled in automatically.
                        </small>
                      )}
                      {changed && (
                        <button
                          type="button"
                          onClick={() => {
                            const overrides = { ...data.interfaceText };
                            delete overrides[message];
                            const next = { ...data };
                            if (Object.keys(overrides).length)
                              next.interfaceText = overrides;
                            else delete next.interfaceText;
                            setData(next);
                          }}
                        >
                          Reset text
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
      {!count && (
        <p className="studio-fields-empty" role="status">
          No settings match “{search}”. Try a room name, label, or the text
          shown on the site.
        </p>
      )}
    </fieldset>
  );
}
