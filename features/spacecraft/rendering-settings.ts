export type RenderingSettings = {
  shadows: boolean;
  shadowSize: 'auto' | 512 | 1024 | 2048;
  shadowSoftness: number;
  exteriorLight: number;
  roomLight: number;
  ladderLight: number;
  roomWarmth: number;
  roomKeyLight: number;
  roomSpread: number;
  roomFillLight: number;
  roomFillSpread: number;
  roomFill: number;
  roomIdleLevel: number;
  exteriorSpill: number;
  pixelDensity: 'auto' | number;
  contactShading: 'auto' | 'on' | 'off';
  background: boolean;
  spacecraftCache: boolean;
};

export const DEFAULT_ROOM_LIGHTING = {
  roomWarmth: 0.6,
  roomKeyLight: 1,
  roomSpread: 45,
  roomFillLight: 1,
  roomFillSpread: 74,
  roomFill: 0.05,
  roomIdleLevel: 0.75,
  exteriorSpill: 0.05,
};

export const DEFAULT_RENDERING_SETTINGS: RenderingSettings = {
  shadows: true,
  shadowSize: 512,
  shadowSoftness: 4,
  exteriorLight: 1,
  roomLight: 1,
  ladderLight: 1,
  ...DEFAULT_ROOM_LIGHTING,
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
  const brightness = (key: 'exteriorLight' | 'roomLight' | 'ladderLight') =>
    Number.isFinite(settings[key])
      ? Math.min(5, Math.max(0, settings[key]))
      : DEFAULT_RENDERING_SETTINGS[key];
  const lighting = (
    key: keyof typeof DEFAULT_ROOM_LIGHTING,
    min = 0,
    max = 1,
  ) =>
    Number.isFinite(settings[key])
      ? Math.min(max, Math.max(min, settings[key]))
      : DEFAULT_ROOM_LIGHTING[key];
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
    exteriorLight: brightness('exteriorLight'),
    roomLight: brightness('roomLight'),
    ladderLight: brightness('ladderLight'),
    roomWarmth: lighting('roomWarmth'),
    roomKeyLight: lighting('roomKeyLight', 0, 5),
    roomSpread: lighting('roomSpread', 15, 85),
    roomFillLight: lighting('roomFillLight', 0, 5),
    roomFillSpread: lighting('roomFillSpread', 35, 85),
    roomFill: lighting('roomFill'),
    roomIdleLevel: lighting('roomIdleLevel', 0.5, 1),
    exteriorSpill: lighting('exteriorSpill'),
    contactShading,
    // Color/depth reuse and moving shadow receivers also work without contact AO.
    cacheAvailable: stationaryCacheSupported && settings.shadows,
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
  roomWarmth: number;
  roomKeyLight: number;
  roomSpread: number;
  roomFillLight: number;
  roomFillSpread: number;
  roomFill: number;
  roomIdleLevel: number;
  exteriorSpill: number;
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
