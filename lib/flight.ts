export const rooms = ['projects', 'experience', 'about', 'contact'] as const;
export type Room = (typeof rooms)[number];
export type Destination = {
  section: string;
  slug?: string;
  open?: boolean;
  sent?: boolean;
  error?: boolean;
};
export function destinationFromURL(
  url: URL,
  preview = false,
  projects: Record<string, any>[] = [],
): Destination | null {
  let section: string, slug: string | undefined;
  if (preview) {
    if (url.pathname !== '/admin/preview') return null;
    section = url.searchParams.get('section') || 'home';
    slug = url.searchParams.get('slug') || undefined;
    if (url.searchParams.has('id')) {
      slug = projects.find((p) => p.id === url.searchParams.get('id'))?.slug;
      if (!slug) return null;
    }
  } else {
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length > 2 || (parts.length === 2 && parts[0] !== 'projects'))
      return null;
    section = parts[0] || 'home';
    slug = parts[1];
  }
  if (!['home', 'privacy', ...rooms].includes(section)) return null;
  return {
    section,
    slug,
    open:
      ['experience', 'about', 'contact'].includes(section) &&
      (url.searchParams.get('open') === '1' ||
        url.searchParams.get('sent') === '1' ||
        url.searchParams.get('error') === '1'),
    sent: url.searchParams.get('sent') === '1',
    error: url.searchParams.get('error') === '1',
  };
}
export function flightEase(t: number) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * x * (x * (x * 6 - 15) + 10);
}
// Bounded cursor response. Pointer dragging never accumulates an orbit angle.
export function cursorTranslation(x: number, y: number, disabled: boolean) {
  return disabled
    ? [0, 0]
    : [Math.max(-1, Math.min(1, x)) * 0.16, Math.max(-1, Math.min(1, y)) * 0.1];
}
export function cursorRotation(x: number, y: number, disabled: boolean) {
  return disabled
    ? [0, 0]
    : [
        Math.max(-1, Math.min(1, y)) * 0.025,
        Math.max(-1, Math.min(1, x)) * 0.045,
      ];
}
export function damping(delta: number, speed = 8) {
  return 1 - Math.exp(-Math.max(0, Math.min(0.1, delta)) * speed);
}
