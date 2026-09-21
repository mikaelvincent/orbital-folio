import {
  CASE_STUDY_CATEGORIES,
  type CaseStudyFilter,
} from '../../../lib/content/case-study-content.ts';

// Keep the persisted experience key while its rendered room is Case studies.
export const rooms = ['experience', 'projects', 'about', 'contact'] as const;
export type Room = (typeof rooms)[number];
export type Destination = {
  section: string;
  slug?: string;
  category?: CaseStudyFilter;
  open?: boolean;
  sent?: boolean;
  error?: boolean;
};
export function destinationFromURL(
  url: URL,
  preview = false,
  projects: Record<string, any>[] = [],
  caseStudies: Record<string, any>[] = [],
): Destination | null {
  let section: string, slug: string | undefined;
  if (preview) {
    if (url.pathname !== '/admin/preview') return null;
    section = url.searchParams.get('section') || 'home';
    slug = url.searchParams.get('slug') || undefined;
    if (url.searchParams.has('id')) {
      const entries = ['experience', 'case-studies'].includes(section)
        ? caseStudies
        : projects;
      slug = entries.find((p) => p.id === url.searchParams.get('id'))?.slug;
      if (!slug) return null;
    }
  } else {
    const parts = url.pathname.split('/').filter(Boolean);
    if (
      parts.length > 2 ||
      (parts.length === 2 &&
        !['projects', 'case-studies', 'experience'].includes(parts[0]))
    )
      return null;
    section = parts[0] || 'home';
    slug = parts[1];
  }
  if (section === 'case-studies') section = 'experience';
  if (!['home', 'privacy', ...rooms].includes(section)) return null;
  const category = url.searchParams.get('category');
  return {
    section,
    slug,
    ...(section === 'experience' &&
    category &&
    CASE_STUDY_CATEGORIES.some((item) => item.id === category)
      ? { category: category as CaseStudyFilter }
      : {}),
    open:
      ['projects', 'experience', 'about', 'contact'].includes(section) &&
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

export const PROJECTS_PER_PAGE = 9;
export type MotionAxis = { value: number; velocity: number };

/** A critically damped camera spring with explicit speed and acceleration limits.
 * Velocity survives target changes, so rapid pointer reversals never restart an ease.
 */
export function moveCameraAxis(
  axis: MotionAxis,
  target: number,
  delta: number,
  limits = { frequency: 10, speed: 12, acceleration: 40 },
) {
  if (!Number.isFinite(target)) return axis.value;
  const duration = Number.isFinite(delta)
    ? Math.max(0, Math.min(0.05, delta))
    : 0;
  const steps = Math.max(1, Math.ceil(duration * 120));
  const dt = duration / steps;
  for (let i = 0; i < steps; i++) {
    const force =
      limits.frequency ** 2 * (target - axis.value) -
      2 * limits.frequency * axis.velocity;
    const acceleration = Math.max(
      -limits.acceleration,
      Math.min(limits.acceleration, force),
    );
    axis.velocity = Math.max(
      -limits.speed,
      Math.min(limits.speed, axis.velocity + acceleration * dt),
    );
    axis.value += axis.velocity * dt;
  }
  return axis.value;
}
