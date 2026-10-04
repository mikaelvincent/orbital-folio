export type PortfolioView = 'interactive' | 'reading';

// Use available space, not device names, touch support or hardware estimates.
export const COMPACT_VIEW_QUERY = '(width < 768px), (height < 480px)';
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
export const AUTOMATIC_READING_QUERY = `${COMPACT_VIEW_QUERY}, ${REDUCED_MOTION_QUERY}`;

export function requestedPortfolioView(
  searchParams: Pick<URLSearchParams, 'get'>,
  hash = '',
): PortfolioView | undefined {
  // The loader escape must win even on an explicitly Interactive URL.
  if (hash === '#room-reader') return 'reading';
  const view = searchParams.get('view');
  return view === 'interactive' || view === 'reading' ? view : undefined;
}

/** Defaults are evaluated at entry, never while resizing an active view. */
export function resolvePortfolioView({
  requested,
  section,
  compact = false,
  reducedMotion = false,
  saveData = false,
}: {
  requested?: PortfolioView;
  section: string;
  compact?: boolean;
  reducedMotion?: boolean;
  saveData?: boolean;
}): PortfolioView {
  if (requested) return requested;
  // Direct content links should reach their content without a camera journey.
  return section !== 'home' || compact || reducedMotion || saveData
    ? 'reading'
    : 'interactive';
}
