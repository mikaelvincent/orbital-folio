import type { Content } from '@/lib/content/types';
import {
  socialIcon,
  socialPlatforms,
  socialScreens,
  socialLinkDraft,
} from '@/lib/content/social-links';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';

export function SocialLinkFields({
  data,
  onChange,
  records,
  selected,
}: {
  data: Record<string, any>;
  onChange: (data: Record<string, any>) => void;
  records: Content[];
  selected: string;
}) {
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
          <span>{draft.description || 'Console channel preview'}</span>
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
        Console placement
        <NativeSelect
          value={draft.screen}
          onChange={(e) => set('screen', e.target.value)}
        >
          {socialScreens.map((s) => (
            <NativeSelectOption key={s.id} value={s.id}>
              {s.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <small>
          Two screens are available. Additional links stay in reading view.
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
      <p className="wide-field setup-help">
        Save a draft to preview it privately, then publish to update the
        console. Changing the platform never changes your destination URL.
      </p>
    </>
  );
}
