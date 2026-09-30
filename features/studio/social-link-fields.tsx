import { entryMedia } from './entry-media';
import { useRef, useState } from 'react';
import type { Content } from '@/lib/content/types';
import {
  socialIcon,
  socialPlatforms,
  socialScreens,
  socialLinkDraft,
  aboutSlots,
} from '@/lib/content/social-links';
import type { PhotoMediaActions } from './about-photo-fields';
import { SocialIconFields, SocialIconMark } from './social-icon-fields';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';

export function SocialLinkFields({
  data,
  onChange,
  records,
  selected,
  busy,
  onUpload,
  onPublishAssets,
  onMediaAction,
  onMediaDirtyChange,
}: {
  data: Record<string, any>;
  onChange: (data: Record<string, any>) => void;
  records: Content[];
  selected: string;
} & PhotoMediaActions) {
  const isAbout = data.room === 'about';
  const draft = socialLinkDraft(data),
    icon = socialIcon(draft.platform);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const [preparingIcon, setPreparingIcon] = useState(false);
  const set = (key: string, value: string | number) =>
    onChange({ ...draft, [key]: value });
  const conflicts = ['left', 'right'].includes(draft.screen)
    ? records.filter(
        (r) =>
          r.kind === 'link' &&
          r.id !== selected &&
          r.draft.room !== 'about' &&
          (r.draft.screen === draft.screen ||
            r.published?.screen === draft.screen),
      )
    : [];
  const aboutConflicts =
    draft.aboutSlot !== 'off'
      ? records.filter(
          (record) =>
            record.kind === 'link' &&
            record.id !== selected &&
            record.draft.room !== 'contact' &&
            (record.draft.aboutSlot === draft.aboutSlot ||
              record.published?.aboutSlot === draft.aboutSlot),
        )
      : [];
  const occupied = aboutConflicts.filter(
    (record) => record.published?.aboutSlot === draft.aboutSlot,
  );
  const draftLinks = [
    ...records
      .filter((record) => record.kind === 'link' && record.id !== selected)
      .map((record) => record.draft),
    draft,
  ];
  return (
    <>
      <section
        className="studio-field-group social-link-group wide-field"
        aria-label="Identity and destination"
      >
        <h3>Identity and destination</h3>
        <p>Set the name visitors see and where the link takes them.</p>
        <div className="editor-fields">
          <label className="studio-field">
            Display name
            <input
              required
              value={draft.title}
              maxLength={60}
              placeholder="GitHub, LinkedIn, or your own name"
              onChange={(e) => set('title', e.target.value)}
            />
          </label>
          {!isAbout && (
            <label className="studio-field">
              Contact caption (optional)
              <input
                value={draft.description}
                maxLength={64}
                placeholder="Code & projects"
                onChange={(e) => set('description', e.target.value)}
              />
            </label>
          )}
          <label className="studio-field wide-field">
            Destination URL
            <input
              required
              type="url"
              value={draft.url}
              maxLength={2000}
              placeholder="https://…"
              onChange={(e) => set('url', e.target.value)}
            />
            <small>
              Enter the full HTTPS profile URL, or a mailto: link. HTTPS links
              open in a new tab; mailto: links open the visitor’s email
              application.
            </small>
          </label>
        </div>
      </section>
      <section
        className="studio-field-group social-link-group wide-field"
        aria-label="Room placement"
      >
        <h3>Room placement</h3>
        <p>
          {isAbout
            ? 'Choose a card above the notebook.'
            : 'Choose one of the two Contact screens.'}{' '}
          Links in each room are edited separately.
        </p>
        <div className="editor-fields">
          {!isAbout && (
            <label className="studio-field">
              Contact console placement
              <NativeSelect
                value={draft.screen}
                onChange={(e) => set('screen', e.target.value)}
              >
                {socialScreens.map((s) => (
                  <NativeSelectOption key={s.id} value={s.id}>
                    {s.id === 'list' ? 'Hidden from Contact' : s.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <small>Both Contact views show the two assigned links.</small>
            </label>
          )}
          <label className="studio-field">
            Display order (smaller numbers first)
            <input
              type="number"
              value={draft.order}
              step={1}
              onChange={(e) => set('order', Number(e.target.value))}
            />
          </label>
        </div>
        {!isAbout && conflicts.length > 0 && (
          <p role="status" className="wide-field form-error">
            Also assigned to this screen:{' '}
            {conflicts.map((r) => r.draft.title).join(', ')}. The first
            published link by display order is shown. Change the other link’s
            placement to use this one.
          </p>
        )}
        {isAbout && (
          <div className="about-slot-preview wide-field">
            <h4>About social icons</h4>
            <p>Each card has its own destination and icon.</p>
            <div className="about-slot-row" aria-label="About icon positions">
              {aboutSlots
                .filter((slot) => slot.id !== 'off')
                .map((slot) => {
                  const saved = draftLinks.filter(
                    (link) => link.aboutSlot === slot.id,
                  );
                  const live = records.filter(
                    (record) =>
                      record.kind === 'link' &&
                      record.published?.room !== 'contact' &&
                      record.published?.aboutSlot === slot.id,
                  );
                  return (
                    <div
                      key={slot.id}
                      className={
                        draft.aboutSlot === slot.id ? 'is-selected' : ''
                      }
                    >
                      <strong>{slot.label}</strong>
                      <span>
                        Draft:{' '}
                        {saved.length
                          ? saved
                              .map((link) => link.title || 'Untitled link')
                              .join(', ')
                          : 'No link'}
                      </span>
                      <span>
                        Live:{' '}
                        {live.length
                          ? live
                              .map((record) => record.published!.title)
                              .join(', ')
                          : 'No link'}
                      </span>
                    </div>
                  );
                })}
            </div>
            <label className="studio-field">
              About position
              <NativeSelect
                value={draft.aboutSlot}
                onChange={(event) => set('aboutSlot', event.target.value)}
              >
                {aboutSlots.map((slot) => (
                  <NativeSelectOption key={slot.id} value={slot.id}>
                    {slot.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </label>
            {aboutConflicts.length > 0 && (
              <p role="status" className="form-error">
                {occupied.length
                  ? `This position is live for ${occupied.map((record) => record.published!.title).join(', ')}. Change and publish that link’s About position before publishing this one.`
                  : `Another draft uses this position: ${aboutConflicts.map((record) => record.draft.title || 'Untitled link').join(', ')}. Choose different positions before publishing both links.`}{' '}
                You can save your draft while arranging the cards.
              </p>
            )}
          </div>
        )}
      </section>
      <section
        className="studio-field-group social-link-group wide-field"
        aria-label="Icon appearance"
      >
        <h3>Icon appearance</h3>
        <p>
          {isAbout
            ? 'Choose a platform mark or upload a custom icon.'
            : 'Choose the platform mark for this Contact screen.'}
        </p>
        {!isAbout && (
          <div className="social-channel-preview wide-field">
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
            <div>
              <strong>
                {draft.title ||
                  (draft.platform === 'custom'
                    ? 'Your social channel'
                    : icon.label)}
              </strong>
              <span>{draft.description || 'Contact console preview'}</span>
            </div>
          </div>
        )}
        <fieldset
          className="social-preset-fields wide-field"
          disabled={busy || preparingIcon}
        >
          <legend>Popular icons</legend>
          <p>
            {isAbout
              ? 'Choose a platform, or upload an icon below. A preset replaces the custom icon.'
              : 'Choose a platform icon. This does not change the destination URL.'}
          </p>
          <div className="social-preset-grid">
            {socialPlatforms.map((platform) => (
              <button
                key={platform.id}
                type="button"
                aria-label={`Use ${platform.label} icon`}
                aria-pressed={
                  draft.platform === platform.id && !draft.iconMediaId
                }
                onClick={() =>
                  onChange({
                    ...draft,
                    platform: platform.id,
                    iconMediaId: '',
                    title:
                      !draft.title || draft.title === icon.label
                        ? platform.id === 'custom'
                          ? ''
                          : platform.label
                        : draft.title,
                  })
                }
              >
                <SocialIconMark platform={platform.id} />
                <span>{platform.label}</span>
              </button>
            ))}
          </div>
        </fieldset>
        {isAbout && (
          <SocialIconFields
            mediaId={draft.iconMediaId || ''}
            platform={draft.platform}
            title={draft.title}
            url={draft.url}
            records={entryMedia(records, selected, data, 'link')}
            busy={busy}
            onUpload={onUpload}
            onPublishAssets={onPublishAssets}
            onMediaAction={onMediaAction}
            onMediaDirtyChange={onMediaDirtyChange}
            onPreparingChange={setPreparingIcon}
            onSelect={(iconMediaId) =>
              onChange({ ...draftRef.current, iconMediaId })
            }
          />
        )}
      </section>
      <p className="wide-field setup-help">
        Save a draft to preview it privately, then publish to update the
        selected room in both views. Changing the platform never changes your
        destination URL.
      </p>
    </>
  );
}
