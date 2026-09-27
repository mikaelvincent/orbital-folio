import type * as Three from 'three';

/** Explicit developer-lab adapter. Normal portfolio visits never supply one. */
export type SceneAuditController = {
  step: (delta?: number) => void;
  navigate: (room: string) => void;
  setPolicy: (policy: 'legacy' | 'geometry') => void;
  setGpuScope: (scope: 'passes' | 'frame') => void;
  reset: () => void;
  snapshot: () => { scene: any; spacecraft: any; settings: any };
  state: () => any;
  freezeBackground: (seconds: number) => void;
  verifyFrame: (includeImages?: boolean) => {
    changedPixels: number;
    maxChannelDifference: number;
    before?: string;
    after?: string;
  };
  /** Untimed same-state geometry comparison; callback returns exact restoration. */
  compareGeometry: (change: () => () => void, includeImages?: boolean) => {
    changedPixels: number;
    maxChannelDifference: number;
    before?: string;
    after?: string;
  };
};

export type SceneAudit = {
  manual: true;
  ready: (controller: SceneAuditController) => void;
  /** Developer-only access for offline shadow experiments; never supplied by visitors. */
  shadowReady?: (context: {
    three: typeof Three;
    renderer: Three.WebGLRenderer;
    scene: Three.Scene;
    camera: Three.PerspectiveCamera;
    light: Three.DirectionalLight;
  }) => (() => void);
  /** Developer shading experiments; ordinary visits supply neither hook. */
  shadingReady?: (context: SceneShadingContext) => (() => void);
  shadingFrame?: () => void;
  /** Compatibility for existing external developer adapters. */
  contactReady?: (context: SceneShadingContext) => (() => void);
  contactFrame?: () => void;
  geometryCompaction?: boolean;
  modelReady?: (model: any, options: any, three: any, constructionMs: number) => void;
};

export type SceneShadingContext = {
  three: typeof Three;
  renderer: Three.WebGLRenderer;
  scene: Three.Scene;
  camera: Three.PerspectiveCamera;
  model: any;
  ao: any;
  invalidate: () => void;
  enabled: () => boolean;
};
