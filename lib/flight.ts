export const rooms = ['projects', 'experience', 'about', 'contact'] as const;
export type Room = typeof rooms[number];
export type Destination = { section: string; slug?: string; sent?: boolean; error?: boolean };
export function destinationFromURL(url: URL, preview = false, projects: Record<string, any>[] = []): Destination | null {
  let section: string, slug: string | undefined;
  if (preview) {
    if (url.pathname !== '/admin/preview') return null;
    section = url.searchParams.get('section') || 'home';
    slug = url.searchParams.get('slug') || undefined;
    if (url.searchParams.has('id')) {
      slug = projects.find(p => p.id === url.searchParams.get('id'))?.slug;
      if (!slug) return null;
    }
  } else {
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length > 2 || (parts.length === 2 && parts[0] !== 'projects')) return null;
    section = parts[0] || 'home';
    slug = parts[1];
  }
  if (!['home', 'privacy', ...rooms].includes(section)) return null;
  return { section, slug, sent: url.searchParams.get('sent') === '1', error: url.searchParams.get('error') === '1' };
}
export function flightEase(t: number) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * x * (x * (x * 6 - 15) + 10);
}
// Camera translation only: no orbit angle, drag state, Euler rotation or quaternion changes.
export function cursorTranslation(x: number, y: number, disabled: boolean) {
  return disabled ? [0, 0] : [Math.max(-1, Math.min(1, x)) * 0.16, Math.max(-1, Math.min(1, y)) * 0.1];
}
