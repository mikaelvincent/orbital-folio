import type { Content } from '@/lib/content/types';
import {
  socialIcon,
  socialPlatforms,
  socialScreens,
  socialLinkDraft,
  aboutSlots,
} from '@/lib/content/social-links';
import {
  ABOUT_SOCIAL_PHOTO_ASPECT,
  normalizeImageCrop,
} from '@/lib/content/about-photos';
import {
  PhotoCropFields,
  PhotoMediaFields,
  type PhotoMediaActions,
} from './about-photo-fields';
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
}: {
  data: Record<string, any>;
  onChange: (data: Record<string, any>) => void;
  records: Content[];
  selected: string;
} & PhotoMediaActions) {
  const draft = socialLinkDraft(data),
    icon = socialIcon(draft.platform);
  const set = (key: string, value: string | number) =>
    onChange({ ...draft, [key]: value });
  const conflicts = ['left', 'right'].includes(draft.screen)
    ? records.filter(
        (r) =>
          r.kind === 'link' &&
          r.id !== selected &&
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
          <span>{draft.description || 'Social channel preview'}</span>
        </div>
      </div>
      <label className="studio-field">
        Platform
        <NativeSelect
          value={draft.platform}
          onChange={(e) => {
            const next = socialIcon(e.target.value);
            onChange({
              ...draft,
              platform: next.id,
              title:
                !draft.title || draft.title === icon.label
                  ? next.id === 'custom'
                    ? ''
                    : next.label
                  : draft.title,
            });
          }}
        >
          {socialPlatforms.map((p) => (
            <NativeSelectOption key={p.id} value={p.id}>
              {p.id === 'custom'
                ? 'Custom — any other social or website'
                : p.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <small>
          Preset platforms include their icons. Custom uses a link icon.
        </small>
      </label>
      <label className="studio-field">
        Contact console placement
        <NativeSelect
          value={draft.screen}
          onChange={(e) => set('screen', e.target.value)}
        >
          {socialScreens.map((s) => (
            <NativeSelectOption key={s.id} value={s.id}>
              {s.id === 'list' ? 'Off — Contact reading view only' : s.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <small>
          Two Contact screens are available. About placement is independent; all
          published links remain in Contact’s Reading view.
        </small>
      </label>
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
      <label className="studio-field">
        Caption (optional)
        <input
          value={draft.description}
          maxLength={64}
          placeholder="Code & projects"
          onChange={(e) => set('description', e.target.value)}
        />
      </label>
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
          Enter the full HTTPS profile URL, or a mailto: link. Visitors open it
          directly in a new tab.
        </small>
      </label>
      <label className="studio-field">
        Display order (smaller numbers first)
        <input
          type="number"
          value={draft.order}
          step={1}
          onChange={(e) => set('order', Number(e.target.value))}
        />
      </label>
      {conflicts.length > 0 && (
        <p role="status" className="wide-field form-error">
          Also assigned to this screen:{' '}
          {conflicts.map((r) => r.draft.title).join(', ')}. The first published
          link by display order is shown. Change the other link’s placement to
          use this one.
        </p>
      )}
      <div className="about-slot-preview wide-field">
        <h3>About photo cards</h3>
        <p>
          Choose one of the three cards above the notebook. This does not change
          your Contact console placement.
        </p>
        <div className="about-slot-row" aria-label="About photo positions">
          {aboutSlots
            .filter((slot) => slot.id !== 'off')
            .map((slot) => {
              const saved = draftLinks.filter(
                (link) => link.aboutSlot === slot.id,
              );
              const live = records.filter(
                (record) =>
                  record.kind === 'link' &&
                  record.published?.aboutSlot === slot.id,
              );
              return (
                <div
                  key={slot.id}
                  className={draft.aboutSlot === slot.id ? 'is-selected' : ''}
                >
                  <strong>{slot.label}</strong>
                  <span>
                    Draft:{' '}
                    {saved.length
                      ? saved
                          .map((link) => link.title || 'Untitled link')
                          .join(', ')
                      : 'Decorative artwork'}
                  </span>
                  <span>
                    Live:{' '}
                    {live.length
                      ? live.map((record) => record.published!.title).join(', ')
                      : 'Decorative artwork'}
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
      <PhotoMediaFields
        title="Social photo (optional)"
        description="Add a personal photo behind this card’s platform icon. The crop preview shows the desktop card; phones use a larger icon and an external-link arrow. Use Preview About to see the full room. Without a photo, this becomes a printed platform card."
        emptyLabel="Use the printed platform card"
        mediaId={draft.photoMediaId}
        records={records}
        busy={busy}
        onUpload={onUpload}
        onPublishAssets={onPublishAssets}
        onSelect={(photoMediaId) =>
          onChange({
            ...draft,
            photoMediaId,
            photoCrop: normalizeImageCrop(null),
          })
        }
      >
        {(media) => (
          <PhotoCropFields
            title="About card photo"
            media={media}
            value={draft.photoCrop}
            aspect={ABOUT_SOCIAL_PHOTO_ASPECT}
            onChange={(photoCrop) => onChange({ ...draft, photoCrop })}
            caption={icon.id === 'custom' ? 'Website' : icon.label}
            overlay={
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
            }
          />
        )}
      </PhotoMediaFields>
      <p className="wide-field setup-help">
        Save a draft to preview it privately, then publish to update the
        selected rooms and Reading view. Changing the platform never changes
        your destination URL.
      </p>
    </>
  );
}
