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
  geometryCompaction?: boolean;
  modelReady?: (model: any, options: any, three: any, constructionMs: number) => void;
};
