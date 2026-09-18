import type { EarthOpening } from './earth-view-transform';
import { NIGHT_EARTH_OPENING } from './earth-view-transform';

export type { EarthOpening } from './earth-view-transform';

export const EARTH_ROTATION_RADIANS_PER_SECOND = 0.003;
export const EARTH_PREVIEW_SPEEDS = [1, 10, 30, 60] as const;
export type EarthPreviewSpeed = (typeof EARTH_PREVIEW_SPEEDS)[number];

export type EarthPreviewOptions = {
  paused: boolean;
  speed: EarthPreviewSpeed;
  /** Seconds of Earth rotation at the ordinary production speed. */
  elapsed?: number;
};

export type EarthPreviewState = {
  active: boolean;
  opening: EarthOpening;
  elapsed: number;
  paused: boolean;
  speed: EarthPreviewSpeed;
};

export type EarthCompositionControls = {
  setEarthComposition(opening: EarthOpening | null): void;
  setEarthPreview(options: EarthPreviewOptions): void;
  getEarthPreview(): EarthPreviewState;
};

export type EarthCompositionSettings = {
  version: 1;
  earthOpening: EarthOpening;
  rotationRadiansPerSecond: typeof EARTH_ROTATION_RADIANS_PER_SECOND;
};

/** Starting points for visual comparison, not claims of continuous brightness. */
export const EARTH_COMPOSITION_PRESETS = [
  {
    id: 'europe',
    label: 'Europe at night',
    description: 'Dense city lights across western and central Europe.',
    opening: { longitude: 12, latitude: 48, roll: -10 },
  },
  {
    id: 'india',
    label: 'Northern India',
    description: 'A broad, bright network across the Indo-Gangetic plain.',
    opening: { longitude: 80, latitude: 26, roll: 15 },
  },
  {
    id: 'east-asia',
    label: 'Eastern China',
    description:
      'Inland city clusters near the coast, with a tilted city-light corridor.',
    opening: { longitude: 115, latitude: 31, roll: 22.5 },
  },
  {
    id: 'north-america',
    label: 'Eastern United States',
    description:
      'Great Lakes and eastern city networks, with more dark space between them.',
    opening: { longitude: -83, latitude: 39, roll: 7.5 },
  },
  {
    id: 'current',
    label: 'Current opening',
    description: 'The existing coastal East Asia view, for comparison.',
    opening: { ...NIGHT_EARTH_OPENING },
  },
] as const satisfies readonly {
  id: string;
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
  if (
    !record(value) ||
    !exactKeys(value, ['version', 'earthOpening', 'rotationRadiansPerSecond'])
  )
    throw new Error(
      'Settings must contain version, earthOpening and rotationRadiansPerSecond.',
    );
  if (value.version !== 1)
    throw new Error('This helper supports settings version 1.');
  if (value.rotationRadiansPerSecond !== EARTH_ROTATION_RADIANS_PER_SECOND)
    throw new Error(
      'Keep the normal rotation rate at 0.003 radians per second. Fast-forward is preview-only.',
    );
  return {
    version: 1,
    earthOpening: validateEarthOpening(value.earthOpening),
    rotationRadiansPerSecond: EARTH_ROTATION_RADIANS_PER_SECOND,
  };
}

export function serializeEarthCompositionSettings(
  opening: EarthOpening,
): string {
  const settings: EarthCompositionSettings = {
    version: 1,
    earthOpening: validateEarthOpening(opening),
    rotationRadiansPerSecond: EARTH_ROTATION_RADIANS_PER_SECOND,
  };
  return JSON.stringify(settings, null, 2);
}

/** Fold a previewed spin into the geographic opening without changing its image. */
export function earthOpeningAtElapsed(
  opening: EarthOpening,
  elapsed: number,
): EarthOpening {
  const validated = validateEarthOpening(opening);
  if (!Number.isFinite(elapsed) || elapsed < 0)
    throw new Error('Preview time must be a nonnegative number of seconds.');
  const longitude =
    validated.longitude -
    (((elapsed * EARTH_ROTATION_RADIANS_PER_SECOND) % (Math.PI * 2)) * 180) /
      Math.PI;
  return {
    ...validated,
    longitude: ((((longitude + 180) % 360) + 360) % 360) - 180,
  };
}
