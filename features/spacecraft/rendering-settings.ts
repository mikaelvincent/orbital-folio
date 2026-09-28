export type RenderingSettings = {
  shadows: boolean;
  shadowSize: 'auto' | 512 | 1024 | 2048;
  shadowSoftness: number;
  exteriorLight: number;
  roomLight: number;
  ladderLight: number;
  pixelDensity: 'auto' | number;
  contactShading: 'auto' | 'on' | 'off';
  background: boolean;
  spacecraftCache: boolean;
};

export const DEFAULT_RENDERING_SETTINGS: RenderingSettings = {
  shadows: true,
  shadowSize: 512,
  shadowSoftness: 4,
  exteriorLight: 1,
  roomLight: 1,
  ladderLight: 1,
  pixelDensity: 'auto',
  contactShading: 'auto',
  background: true,
  spacecraftCache: true,
};

export function renderingSettingsAreDefault(settings: RenderingSettings) {
  return (
    Object.keys(DEFAULT_RENDERING_SETTINGS) as (keyof RenderingSettings)[]
  ).every((key) => settings[key] === DEFAULT_RENDERING_SETTINGS[key]);
}

/** Explicit visual comparisons may exceed the automatic device profile, while
 * retaining the drawing-buffer limit and actual WebGL capability requirements. */
export function resolveRenderingSettings(
  settings: RenderingSettings,
  environment: {
    width: number;
    height: number;
    nativePixelRatio: number;
    capableShading: boolean;
    contactShadingSupported: boolean;
    maxTextureSize: number;
    stationaryCacheSupported?: boolean;
  },
) {
  const {
    width,
    height,
    nativePixelRatio,
    capableShading,
    contactShadingSupported,
    maxTextureSize,
    stationaryCacheSupported = true,
  } = environment;
  const small = width < 700;
  const automaticDensity = Math.min(nativePixelRatio, small ? 1.75 : 2);
  const density =
    typeof settings.pixelDensity === 'number' &&
    Number.isFinite(settings.pixelDensity)
      ? Math.min(2, Math.max(0.5, settings.pixelDensity))
      : automaticDensity;
  const contactShading =
    contactShadingSupported &&
    (settings.contactShading === 'on' ||
      (settings.contactShading === 'auto' && capableShading && !small));
  const brightness = (value: number) =>
    Number.isFinite(value) ? Math.min(2, Math.max(0, value)) : 1;
  return {
    pixelDensity: Math.min(
      density,
      Math.sqrt(4_000_000 / Math.max(1, width * height)),
      maxTextureSize / Math.max(1, width, height),
    ),
    shadowSize: Math.min(
      maxTextureSize,
      settings.shadowSize === 'auto' ? 1024 : settings.shadowSize,
    ),
    shadowSoftness: Number.isFinite(settings.shadowSoftness)
      ? Math.min(4, Math.max(0, settings.shadowSoftness))
      : DEFAULT_RENDERING_SETTINGS.shadowSoftness,
    exteriorLight: brightness(settings.exteriorLight),
    roomLight: brightness(settings.roomLight),
    ladderLight: brightness(settings.ladderLight),
    contactShading,
    // The live-receiver cache is validated only for this rendering path.
    cacheAvailable:
      stationaryCacheSupported && !small && contactShading && settings.shadows,
  };
}

export type RenderingState = {
  pixelDensity: number;
  drawingBuffer: [number, number];
  shadowSize: number;
  shadowSoftness: number;
  exteriorLight: number;
  roomLight: number;
  ladderLight: number;
  contactShading: boolean;
  contactShadingSupported: boolean;
  cacheAvailable: boolean;
  cacheLightingSupported: boolean;
};

/** Settings observation is event-driven; opening the panel starts no collector. */
export type RenderingObserver = {
  getState: () => RenderingState;
  subscribe: (listener: () => void) => () => void;
};
