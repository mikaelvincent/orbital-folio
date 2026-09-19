import type { EarthOpening } from './earth-view-transform';
import { NIGHT_EARTH_OPENING } from './earth-view-transform';
import type { EarthAppearance } from './earth-satellite';

export type { EarthOpening } from './earth-view-transform';

export const EARTH_ROTATION_RADIANS_PER_SECOND = 0.003;
export const MAX_EARTH_ROTATION_RADIANS_PER_SECOND = 0.015;
export const EARTH_PREVIEW_SPEEDS = [1, 10, 30, 60] as const;
export type EarthPreviewSpeed = (typeof EARTH_PREVIEW_SPEEDS)[number];

export type EarthPreviewOptions = {
  paused: boolean;
  speed: EarthPreviewSpeed;
  /** Simulated seconds of Earth rotation at the selected saved rate. */
  elapsed?: number;
};

export type EarthPreviewState = {
  active: boolean;
  opening: EarthOpening;
  elapsed: number;
  paused: boolean;
  speed: EarthPreviewSpeed;
  rotationRadiansPerSecond: number;
  appearance: EarthAppearance;
  requestedAppearance: EarthAppearance;
  appearanceLoading: boolean;
  appearanceError: string | null;
};

export type EarthCompositionControls = {
  setEarthComposition(
    opening: EarthOpening | null,
    rotationRadiansPerSecond?: number,
  ): void;
  setEarthPreview(options: EarthPreviewOptions): void;
  setEarthAppearance(appearance: EarthAppearance): Promise<void>;
  getEarthPreview(): EarthPreviewState;
};

export type EarthCompositionSettings = {
  earthOpening: EarthOpening;
  rotationRadiansPerSecond: number;
} & ({ version: 1 } | { version: 2; earthAppearance: EarthAppearance });

/** Screened across a 2× cycle, with 3× checks; all routes have dim stretches. */
export const EARTH_PRESET_GROUPS = [
  'Mediterranean & Europe',
  'Middle East',
  'Earlier comparisons',
] as const;

export const EARTH_COMPOSITION_PRESETS = [
  {
    id: 'mediterranean-classic',
    group: 'Mediterranean & Europe',
    label: 'Mediterranean classic',
    description:
      'The previously chosen angles: Italy, Greece and illuminated coastlines against dark water.',
    opening: { longitude: 18, latitude: 38, roll: -12 },
  },
  {
    id: 'mediterranean-diagonal',
    group: 'Mediterranean & Europe',
    label: 'Mediterranean diagonal',
    description:
      'A more cinematic tilt of the same region, with a broad sweep of lights and coastlines.',
    opening: { longitude: 18, latitude: 38, roll: 45 },
  },
  {
    id: 'europe',
    group: 'Mediterranean & Europe',
    label: 'Europe at night',
    description:
      'The earlier European preset. Denser mainland lights, less sea; the Atlantic arrives sooner.',
    opening: { longitude: 12, latitude: 48, roll: -10 },
  },
  {
    id: 'nile-mediterranean',
    group: 'Middle East',
    label: 'Nile & Mediterranean',
    description:
      'A bright Nile delta beside the sea. Distinctive light shapes, with more unlit desert around them.',
    opening: { longitude: 32, latitude: 30, roll: 20 },
  },
  {
    id: 'middle-east-sweep',
    group: 'Middle East',
    label: 'Middle East sweep',
    description:
      'Starts farther east and reaches the Mediterranean later. A longer early sequence, with dim inland patches.',
    opening: { longitude: 50, latitude: 32, roll: -52.5 },
  },
  {
    id: 'coastal-asia',
    group: 'Earlier comparisons',
    label: 'Coastal Asia',
    description:
      'The earlier overall-balance recommendation: city lights and dark coastlines, with an early inland dip.',
    opening: { longitude: 124, latitude: 31, roll: 7.5 },
  },
  {
    id: 'tilted-asia',
    group: 'Earlier comparisons',
    label: 'Tilted Asia',
    description:
      'A cinematic sweep of lights and sculptural coastlines. More dramatic, less geographically familiar.',
    opening: { longitude: 112, latitude: 32.5, roll: 135 },
  },
  {
    id: 'asian-light-corridor',
    group: 'Earlier comparisons',
    label: 'Asian light corridor',
    description:
      'More lights through the first few minutes, but longer dark stretches later. Closest to the old opening.',
    opening: { longitude: 116, latitude: 23.5, roll: 7.5 },
  },
  {
    id: 'american-city-lights',
    group: 'Earlier comparisons',
    label: 'American city lights',
    description:
      'A dazzling opening city network. Fades toward a long Pacific stretch within about two minutes at 2×.',
    opening: { longitude: -86, latitude: 32.5, roll: 7.5 },
  },
  {
    id: 'current',
    group: 'Earlier comparisons',
    label: 'Current opening',
    description: 'The existing coastal East Asia view, for comparison.',
    opening: { ...NIGHT_EARTH_OPENING },
  },
] as const satisfies readonly {
  id: string;
  group: (typeof EARTH_PRESET_GROUPS)[number];
  label: string;
  description: string;
  opening: EarthOpening;
}[];

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: string[]) {
  return (
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}

/** Reject malformed imports instead of silently clamping to an unintended pose. */
export function validateEarthOpening(value: unknown): EarthOpening {
  if (!record(value) || !exactKeys(value, ['longitude', 'latitude', 'roll']))
    throw new Error('Earth opening must contain longitude, latitude and roll.');
  for (const [key, limit] of [
    ['longitude', 180],
    ['latitude', 85],
    ['roll', 180],
  ] as const) {
    const angle = value[key];
    if (
      typeof angle !== 'number' ||
      !Number.isFinite(angle) ||
      Math.abs(angle) > limit
    )
      throw new Error(
        `${key[0].toUpperCase()}${key.slice(1)} must be a number between −${limit}° and ${limit}°.`,
      );
  }
  return {
    longitude: value.longitude as number,
    latitude: value.latitude as number,
    roll: value.roll as number,
  };
}

/** Zero holds the selected view; saved rotation is separate from fast-forward. */
export function validateEarthRotationRate(value: unknown): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > MAX_EARTH_ROTATION_RADIANS_PER_SECOND
  )
    throw new Error(
      `Rotation rate must be a number between 0 and ${MAX_EARTH_ROTATION_RADIANS_PER_SECOND} radians per second.`,
    );
  return value;
}

export function parseEarthCompositionSettings(
  text: string,
): EarthCompositionSettings {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error(
      'Paste the complete settings JSON copied from this helper.',
    );
  }
  if (!record(value))
    throw new Error('Settings must be a complete settings object.');
  if (value.version !== 1 && value.version !== 2)
    throw new Error('This helper supports settings versions 1 and 2.');
  const keys = ['version', 'earthOpening', 'rotationRadiansPerSecond'];
  if (value.version === 2) keys.push('earthAppearance');
  if (!exactKeys(value, keys))
    throw new Error(`Settings must contain exactly ${keys.join(', ')}.`);
  const common = {
    earthOpening: validateEarthOpening(value.earthOpening),
    rotationRadiansPerSecond: validateEarthRotationRate(
      value.rotationRadiansPerSecond,
    ),
  };
  return value.version === 1
    ? { version: 1, ...common }
    : {
        version: 2,
        ...common,
        earthAppearance: validateEarthAppearance(value.earthAppearance),
      };
}

function validateEarthAppearance(value: unknown): EarthAppearance {
  if (value !== 'night' && value !== 'day')
    throw new Error('Earth model must be "night" or "day".');
  return value;
}

export function serializeEarthCompositionSettings(
  opening: EarthOpening,
  rotationRadiansPerSecond = EARTH_ROTATION_RADIANS_PER_SECOND,
  earthAppearance: EarthAppearance = 'night',
): string {
  const settings: EarthCompositionSettings = {
    version: 2,
    earthOpening: validateEarthOpening(opening),
    rotationRadiansPerSecond: validateEarthRotationRate(
      rotationRadiansPerSecond,
    ),
    earthAppearance: validateEarthAppearance(earthAppearance),
  };
  return JSON.stringify(settings, null, 2);
}

/** Fold a previewed spin into the geographic opening without changing its image. */
export function earthOpeningAtElapsed(
  opening: EarthOpening,
  elapsed: number,
  rotationRadiansPerSecond = EARTH_ROTATION_RADIANS_PER_SECOND,
): EarthOpening {
  const validated = validateEarthOpening(opening);
  const rate = validateEarthRotationRate(rotationRadiansPerSecond);
  if (!Number.isFinite(elapsed) || elapsed < 0)
    throw new Error('Preview time must be a nonnegative number of seconds.');
  const longitude =
    validated.longitude - (((elapsed * rate) % (Math.PI * 2)) * 180) / Math.PI;
  return {
    ...validated,
    longitude: ((((longitude + 180) % 360) + 360) % 360) - 180,
  };
}
