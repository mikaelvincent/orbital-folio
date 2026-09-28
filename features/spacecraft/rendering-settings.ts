export type RenderingSettings = {
  shadows: boolean;
  shadowSize: 'auto' | 512 | 1024 | 2048;
  pixelDensity: 'auto' | number;
  contactShading: 'auto' | 'on' | 'off';
  background: boolean;
  spacecraftCache: boolean;
};

export const DEFAULT_RENDERING_SETTINGS: RenderingSettings = {
  shadows: true,
  shadowSize: 'auto',
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
  },
) {
  const {
    width,
    height,
    nativePixelRatio,
    capableShading,
    contactShadingSupported,
    maxTextureSize,
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
  return {
    pixelDensity: Math.min(
      density,
      Math.sqrt(4_000_000 / Math.max(1, width * height)),
      maxTextureSize / Math.max(1, width, height),
    ),
    shadowSize: Math.min(
      maxTextureSize,
      settings.shadowSize === 'auto'
        ? small
          ? 1024
          : 2048
        : settings.shadowSize,
    ),
    contactShading,
    // The live-receiver cache is validated only for this rendering path.
    cacheAvailable: !small && contactShading && settings.shadows,
  };
}

export type RenderingState = {
  pixelDensity: number;
  drawingBuffer: [number, number];
  shadowSize: number;
  contactShading: boolean;
  contactShadingSupported: boolean;
  cacheAvailable: boolean;
};

/** Settings observation is event-driven; opening the panel starts no collector. */
export type RenderingObserver = {
  getState: () => RenderingState;
  subscribe: (listener: () => void) => () => void;
};
