import {
  CASE_STUDY_CATEGORIES,
  type CaseStudyFilter,
} from '../../../lib/content/case-study-content.ts';
import { pathFor } from '../../../lib/paths.ts';
import type { PortfolioView } from '../../portfolio/view-policy.ts';

// Keep the persisted experience key while its rendered room is Case studies.
export const rooms = ['projects', 'experience', 'about', 'contact'] as const;
export type Room = (typeof rooms)[number];
export type Destination = {
  section: string;
  slug?: string;
  /** Zero-based notebook spread; URLs use the first printed page number. */
  page?: number;
  category?: CaseStudyFilter;
  open?: boolean;
  sent?: boolean;
  error?: boolean;
};

/** Privacy is a page of the Contact computer, with its own public URL. */
export function applicationDestination(destination: Destination): Destination {
  return destination.section === 'privacy'
    ? { section: 'contact', open: true }
    : destination;
}

/** Step out through the current application's hierarchy, even on a deep link. */
export function parentDestination(destination: Destination): Destination {
  const { section, slug, category, open, sent, error } = destination;
  if (section === 'privacy') return { section: 'contact', open: true };
  if (slug && (section === 'projects' || section === 'experience'))
    return {
      section,
      open: true,
      ...(section === 'experience' && category ? { category } : {}),
    };
  if (slug || open || sent || error) return { section };
  return { section: 'home' };
}

export function destinationFromURL(
  url: URL,
  preview = false,
  projects: Record<string, any>[] = [],
  caseStudies: Record<string, any>[] = [],
  journal: Record<string, any>[] = [],
): Destination | null {
  let section: string, slug: string | undefined;
  if (preview) {
    if (url.pathname !== '/admin/preview') return null;
    section = url.searchParams.get('section') || 'home';
    slug = url.searchParams.get('slug') || undefined;
    if (url.searchParams.has('id')) {
      const entries =
        section === 'about'
          ? journal
          : ['experience', 'case-studies'].includes(section)
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
        !['projects', 'case-studies', 'experience', 'about'].includes(parts[0]))
    )
      return null;
    section = parts[0] || 'home';
    slug = parts[1];
  }
  if (section === 'case-studies') section = 'experience';
  if (!['home', 'privacy', ...rooms].includes(section)) return null;
  const category = url.searchParams.get('category');
  const page = Number(url.searchParams.get('page'));
  return {
    section,
    slug,
    ...(section === 'about' && slug
      ? {
          page:
            Number.isSafeInteger(page) && page > 0
              ? Math.floor((page - 1) / 2)
              : 0,
        }
      : {}),
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

export function destinationHref(
  destination: Destination,
  site: Record<string, any>,
  view: boolean | PortfolioView = false,
) {
  const { section, slug, page, open, category } = destination;
  const path = pathFor(
    section === 'home' ? '/' : '/' + section + (slug ? '/' + slug : ''),
    site,
  );
  const query = new URLSearchParams();
  if (open) query.set('open', '1');
  if (section === 'about' && slug && page)
    query.set('page', String(page * 2 + 1));
  if (section === 'experience' && category && category !== 'all')
    query.set('category', category);
  if (view) query.set('view', view === true ? 'reading' : view);
  return path + (query.size ? (path.includes('?') ? '&' : '?') + query : '');
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
  limits: {
    frequency: number;
    speed: number;
    acceleration: number;
    /** Opt-in for input springs; travel/door sequencing keeps its own tolerances. */
    settle?: number;
  } = { frequency: 10, speed: 12, acceleration: 40 },
) {
  if (!Number.isFinite(target)) return axis.value;
  if (axis.value === target && axis.velocity === 0) return axis.value;
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
  if (
    duration > 0 &&
    limits.settle &&
    Math.abs(target - axis.value) <= limits.settle &&
    Math.abs(axis.velocity) <= limits.settle
  ) {
    axis.value = target;
    axis.velocity = 0;
  }
  return axis.value;
}
