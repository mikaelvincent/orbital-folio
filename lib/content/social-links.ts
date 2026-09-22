import { socialPlatforms } from './social-platforms.ts';
import type { ImageCrop } from './about-photos.ts';
export { socialPlatforms };
export type SocialPlatform = (typeof socialPlatforms)[number]['id'];
export const socialScreens = [
  { id: 'auto', label: 'Automatic — first two by display order' },
  { id: 'left', label: 'Left console screen' },
  { id: 'right', label: 'Right console screen' },
  { id: 'list', label: 'Off — Contact reading view only' },
] as const;
export type SocialScreen = (typeof socialScreens)[number]['id'];
export const aboutSlots = [
  { id: 'off', label: 'Off — not displayed in About' },
  { id: 'left', label: 'Left icon' },
  { id: 'center', label: 'Center icon' },
  { id: 'right', label: 'Right icon' },
] as const;
export type AboutSlot = (typeof aboutSlots)[number]['id'];
export type SocialLink = {
  id: string;
  title: string;
  url: string;
  platform: SocialPlatform;
  screen: SocialScreen;
  description: string;
  order: number;
  aboutSlot: AboutSlot;
  iconMediaId?: string;
  // Retired photo settings remain portable owner content, never icon fallbacks.
  photoMediaId?: string;
  photoCrop?: ImageCrop;
};
export type SocialScreenLinks = {
  left: SocialLink | null;
  right: SocialLink | null;
};
export type AboutSocialLinks = Record<
  Exclude<AboutSlot, 'off'>,
  SocialLink | null
>;
const hosts: Record<string, SocialPlatform> = {
  'github.com': 'github',
  'linkedin.com': 'linkedin',
  'gitlab.com': 'gitlab',
  'youtube.com': 'youtube',
  'youtu.be': 'youtube',
  'instagram.com': 'instagram',
  'bsky.app': 'bluesky',
  'x.com': 'x',
  'twitter.com': 'x',
  'discord.com': 'discord',
  'discord.gg': 'discord',
  'twitch.tv': 'twitch',
  'tiktok.com': 'tiktok',
  'vm.tiktok.com': 'tiktok',
  'vt.tiktok.com': 'tiktok',
  'facebook.com': 'facebook',
  'm.facebook.com': 'facebook',
  'fb.com': 'facebook',
  'reddit.com': 'reddit',
  'old.reddit.com': 'reddit',
  'redd.it': 'reddit',
};
export function inferSocialPlatform(url: string): SocialPlatform {
  try {
    return hosts[new URL(url).hostname.replace(/^www\./, '')] || 'custom';
  } catch {
    return 'custom';
  }
}
export function socialIcon(id: string) {
  return (
    socialPlatforms.find((p) => p.id === id) ||
    socialPlatforms[socialPlatforms.length - 1]
  );
}
export function socialLinkDraft(data: Record<string, any>) {
  return {
    title: data.title || '',
    url: data.url || '',
    order: data.order ?? 0,
    platform: data.platform || inferSocialPlatform(data.url || ''),
    screen: data.screen || 'auto',
    description: data.description || '',
    aboutSlot: data.aboutSlot || 'off',
    iconMediaId: data.iconMediaId || '',
    photoMediaId: data.photoMediaId || '',
    ...(data.photoCrop ? { photoCrop: data.photoCrop } : {}),
  };
}
export function isSocialDestination(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2000) return false;
  try {
    const url = new URL(value);
    return (
      ['https:', 'mailto:'].includes(url.protocol) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}
/** Explicit placements win; older links fill remaining screens in display order.
 * Duplicate explicit placements never silently move to the opposite screen.
 * Published input only: drafts enter here solely through the private preview.
 */
function normalizedSocialLinks(records: Record<string, any>[]): SocialLink[] {
  return records
    .filter(
      (r) =>
        typeof r.title === 'string' &&
        r.title.trim() &&
        isSocialDestination(r.url),
    )
    .map(
      (r, index): SocialLink => ({
        ...socialLinkDraft(r),
        id: String(r.id ?? index),
        title: String(r.title).trim().slice(0, 60),
        description: String(r.description || '')
          .trim()
          .slice(0, 64),
        platform: socialIcon(r.platform || inferSocialPlatform(r.url)).id,
        screen: socialScreens.some((s) => s.id === r.screen)
          ? r.screen
          : 'auto',
        aboutSlot: aboutSlots.some((slot) => slot.id === r.aboutSlot)
          ? r.aboutSlot
          : 'off',
      }),
    )
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}
export function resolveSocialScreens(
  records: Record<string, any>[],
): SocialScreenLinks {
  const links = normalizedSocialLinks(records);
  const result: SocialScreenLinks = { left: null, right: null };
  for (const side of ['left', 'right'] as const)
    result[side] = links.find((l) => l.screen === side) || null;
  const automatic = links.filter((l) => l.screen === 'auto');
  for (const side of ['left', 'right'] as const)
    if (!result[side]) result[side] = automatic.shift() || null;
  return result;
}

/** About placements are explicit and independent of Contact's console screens.
 * Legacy/unassigned links leave their unassigned cards passive. */
export function resolveAboutSocials(
  records: Record<string, any>[],
): AboutSocialLinks {
  const links = normalizedSocialLinks(records);
  return {
    left: links.find((link) => link.aboutSlot === 'left') || null,
    center: links.find((link) => link.aboutSlot === 'center') || null,
    right: links.find((link) => link.aboutSlot === 'right') || null,
  };
}
