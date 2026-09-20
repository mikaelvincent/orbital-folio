/** Frozen developer-only comparison: Git regional baseline vs the current source/asset candidate.
 * Derived from the established finite cloud lab protocol; no production imports.
 */
import * as THREE from 'three';
import { responsiveCameraFov } from '../../features/spacecraft/navigation/scene-controls';
import { EARTH_TEXTURE_WIDTH, EARTH_TEXTURE_HEIGHT } from '../../features/orbit/earth-satellite';
// @ts-expect-error Standalone launcher resolves the dimensions from frozen Git source.
import { EARTH_TEXTURE_WIDTH as BASELINE_TEXTURE_WIDTH, EARTH_TEXTURE_HEIGHT as BASELINE_TEXTURE_HEIGHT } from 'regional-earth-baseline-texture';

type Version = 'reference' | 'current';
type AnimationMode = 'frozen' | 'replay-60hz';
type PlaybackState = { time: number; duration: number; speed: number; playing: boolean; ready: boolean };
type PlaybackCommand = { type: 'seek'; time: number } | { type: 'speed'; speed: number } | { type: 'playing'; playing: boolean };
type Environment = {
  scene: THREE.Scene;
  camera: THREE.Camera;
  ready?: Promise<unknown>;
  resize(width: number, height: number, pixelRatio: number, cameraFov?: number): void;
  update(time: number, moving: boolean, x: number, y: number): void;
  followCamera(world: THREE.PerspectiveCamera, reference: THREE.PerspectiveCamera): void;
  getDiagnostics(): unknown;
  getEarthPlayback?(): PlaybackState;
  setEarthPlayback?(command: PlaybackCommand): void;
  dispose(): void;
};
type EnvironmentModule = { createOrbitalEnvironment(three: typeof THREE, invalidate: () => void, options: { mobile: boolean; cameraFov: number }): Environment };
const REST_MS = 60000;
const WARMUP_FRAMES = 30;
const comparison = {
  reference: { label: 'Before — previous regional Earth', source: 'Git baseline/features/orbit/orbital-environment.ts', textureDimensions: [BASELINE_TEXTURE_WIDTH, BASELINE_TEXTURE_HEIGHT] },
  current: { label: 'After — current regional Earth', source: 'features/orbit/orbital-environment.ts', textureDimensions: [EARTH_TEXTURE_WIDTH, EARTH_TEXTURE_HEIGHT] },
};
type TimerExtension = { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number };
type Frame = {
  index: number; rafTimestamp: number; frameIntervalMs: number | null; animationTime: number;
  updateCpuMs: number; renderCpuMs: number; totalCpuMs: number;
  gpuNs: number | null; gpuMs: number | null;
  gpuStatus: 'pending' | 'valid' | 'unsupported' | 'disjoint' | 'stopped' | 'timeout' | 'query-unavailable' | 'not-sampled';
  calls: number; triangles: number; points: number;
};
type Block = {
  index: number; version: Version; startedAt: string; finishedAt?: string;
  warmupFrames: number; measuredFramesTarget: number; environmentDiagnostics: unknown;
  frames: Frame[]; disjointEvents: number[];
  animation: { mode: AnimationMode; startTime: number; finalTime: number; stepSeconds: number; firstMeasuredTime: number | null };
  finalEnvironmentDiagnostics?: unknown;
};
type Report = {
  schemaVersion: 1; runId: string; startedAt: string; finishedAt?: string;
  status: 'running' | 'complete' | 'stopped' | 'invalid'; reason?: string;
  buildManifest: unknown; device: unknown; configuration: unknown;
  preparationMs?: number; preparation?: unknown; blocks: Block[]; summary?: unknown; comparisonAssessment?: unknown;
  limits: string[];
};
const element = <T>(id: string) => document.getElementById(id) as T;
const versionInput = element<HTMLSelectElement>('version');
const timeInput = element<HTMLInputElement>('time');
const phaseInput = element<HTMLInputElement>('phase');
const periodInput = element<HTMLInputElement>('period');
const yawInput = element<HTMLInputElement>('yaw');
const pitchInput = element<HTMLInputElement>('pitch');
const rollInput = element<HTMLInputElement>('roll');
const dprInput = element<HTMLSelectElement>('dpr');
const orderInput = element<HTMLSelectElement>('order');
const framesInput = element<HTMLSelectElement>('frames');
const animationInput = element<HTMLSelectElement>('animation');
const previewButton = element<HTMLButtonElement>('preview');
const beforeButton = element<HTMLButtonElement>('before');
const afterButton = element<HTMLButtonElement>('after');
const startButton = element<HTMLButtonElement>('start');
const stopButton = element<HTMLButtonElement>('stop');
const fullscreenButton = element<HTMLButtonElement>('fullscreen');
const copyButton = element<HTMLButtonElement>('copy');
const downloadButton = element<HTMLButtonElement>('download');
const showButton = element<HTMLButtonElement>('show');
const output = element<HTMLTextAreaElement>('report');
const status = element<HTMLParagraphElement>('status');
const controls = element<HTMLElement>('controls');
const restoreButton = element<HTMLButtonElement>('restore');
const now = () => new Date().toISOString();
const settings = () => ({
  width: innerWidth, height: innerHeight,
  dpr: dprInput.value === 'native' ? devicePixelRatio : Number(dprInput.value),
  mobile: innerWidth < 700, frozenTime: Math.max(0, Number(timeInput.value)),
  animationMode: animationInput.value as AnimationMode,
  camera: { yaw: Number(yawInput.value), pitch: Number(pitchInput.value), roll: Number(rollInput.value) },
  cameraScope: 'Shared origin camera/reference. Baseline lens38 degrees; candidate uses delivered responsive lens (desktop38, portrait preserves38 horizontal up to78 vertical). Does not reproduce whole-app camera position, framing or roll.',
  lens: { reference: 38, current: responsiveCameraFov(innerWidth / innerHeight) },
});
let renderer: THREE.WebGLRenderer | undefined;
let extension: TimerExtension | null = null;
let active: AbortController | undefined;
let lastReport: Report | undefined;
type Preparation = {
  version: Version; startedAt: string; trigger: 'preview' | 'comparison';
  moduleImportWallMs: number; factoryCpuMs: number; readyWaitWallMs: number;
  compileAsyncWallMs?: number; firstRenderCpuMs?: number; firstRenderGpuMs?: number | null;
  firstRenderGpuStatus?: string; firstSubmittedFrameWallMs?: number;
  environmentDiagnostics?: unknown;
};
const environments = new Map<Version, { environment: Environment; mobile: boolean; preparation: Preparation }>();
const manifestPromise = fetch('/build-manifest.json').then(response => {
  if (!response.ok) throw new Error('Build manifest could not be loaded. Restart the lab server.');
  return response.json() as Promise<unknown>;
});
// Attach a handler immediately; an inaccessible manifest is reported on explicit start.
void manifestPromise.catch(() => undefined);

function getRenderer() {
  if (renderer) return renderer;
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.setClearColor('#050a11', 1);
  renderer.domElement.setAttribute('aria-label', 'Orbital background preview');
  document.body.appendChild(renderer.domElement);
  const gl = renderer.getContext() as WebGL2RenderingContext;
  extension = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  element<HTMLParagraphElement>('capabilities').textContent = extension
    ? 'Direct GPU timer queries are available. CPU submission and frame intervals are separate measurements.'
    : 'Direct GPU timer queries are unavailable in this browser. The report will explicitly contain CPU/frame measurements only.';
  renderer.domElement.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    active?.abort(new Error('WebGL context lost; comparison invalid.'));
    status.textContent = 'WebGL context lost. Reload the lab before another comparison.';
  });
  resizeRenderer();
  return renderer;
}
function resizeRenderer() {
  if (!renderer) return;
  const config = settings();
  renderer.setPixelRatio(config.dpr);
  renderer.setSize(config.width, config.height, false);
  for (const [version, { environment }] of environments) environment.resize(config.width, config.height, config.dpr, config.lens[version]);
}
function blank() {
  if (!renderer || renderer.getContext().isContextLost()) return;
  renderer.setClearColor('#050a11', 1);
  renderer.clear();
}
function disposeIncomplete() {
  for (const [version, value] of environments) {
    if (value.preparation.firstSubmittedFrameWallMs !== undefined) continue;
    value.environment.dispose();
    environments.delete(version);
  }
}
function busy(controller?: AbortController) {
  active = controller;
  for (const input of [versionInput, timeInput, phaseInput, periodInput, yawInput, pitchInput, rollInput, dprInput, orderInput, framesInput, animationInput, previewButton, beforeButton, afterButton, startButton, fullscreenButton]) input.disabled = !!controller;
  stopButton.disabled = !controller;
  copyButton.disabled = downloadButton.disabled = !!controller || !lastReport;
  showButton.disabled = !!controller || !lastReport;
  document.body.classList.toggle('measuring', !!controller);
}
function abortError(signal: AbortSignal): Error {
  return signal.reason instanceof Error ? signal.reason : new Error(String(signal.reason || 'Stopped by user.'));
}
function check(signal: AbortSignal) {
  if (signal.aborted) throw abortError(signal);
}
function requireReadyEnvironment(version: Version, environment: Environment) {
  const value = environment.getDiagnostics();
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${comparison[version].label}: missing environment diagnostics.`);
  const diagnostics = value as Record<string, unknown>;
  if (diagnostics.ready !== true)
    throw new Error(`${comparison[version].label}: environment is not ready.`);
  const dimensions = diagnostics.earthTextureDimensions;
  const expected = comparison[version].textureDimensions;
  if (diagnostics.earthReady !== true || diagnostics.earthLoadError !== null ||
    !Array.isArray(dimensions) || dimensions[0] !== expected[0] || dimensions[1] !== expected[1])
    throw new Error(`${comparison[version].label}: expected texture not ready; incomplete or fallback rendering is not a valid comparison.`);
  return value;
}
function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  check(signal);
  return new Promise((resolve, reject) => {
    const stop = () => reject(abortError(signal));
    signal.addEventListener('abort', stop, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', stop));
  });
}
function pause(milliseconds: number, signal: AbortSignal): Promise<void> {
  check(signal);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { signal.removeEventListener('abort', stop); resolve(); }, milliseconds);
    const stop = () => { clearTimeout(timer); reject(abortError(signal)); };
    signal.addEventListener('abort', stop, { once: true });
  });
}
function frame(signal: AbortSignal): Promise<number> {
  check(signal);
  return new Promise((resolve, reject) => {
    const request = requestAnimationFrame(timestamp => { signal.removeEventListener('abort', stop); resolve(timestamp); });
    const stop = () => { cancelAnimationFrame(request); reject(abortError(signal)); };
    signal.addEventListener('abort', stop, { once: true });
  });
}
async function loadEnvironment(version: Version, signal: AbortSignal, trigger: Preparation['trigger']) {
  const config = settings();
  const cached = environments.get(version);
  if (cached && cached.mobile !== config.mobile) {
    cached.environment.dispose();
    environments.delete(version);
  }
  let environment = environments.get(version)?.environment;
  if (!environment) {
    status.textContent = `Loading ${comparison[version].label}…`;
    // Both source-identified versions remain unloaded until requested.
    // The launcher resolves the baseline import to its isolated Git source tree.
    const preparationStart = performance.now();
    const preparationStartedAt = now();
    const source = await abortable<EnvironmentModule>(version === 'reference'
      // @ts-expect-error Standalone launcher resolves this to a frozen Git source tree.
      ? import('regional-earth-baseline')
      : import('../../features/orbit/orbital-environment.ts'), signal);
    check(signal);
    const imported = performance.now();
    environment = source.createOrbitalEnvironment(THREE, () => {}, { mobile: config.mobile, cameraFov: config.lens[version] });
    const constructed = performance.now();
    const preparation: Preparation = {
      version, startedAt: preparationStartedAt, trigger,
      moduleImportWallMs: imported - preparationStart,
      factoryCpuMs: constructed - imported, readyWaitWallMs: 0,
    };
    environments.set(version, { environment, mobile: config.mobile, preparation });
    await abortable(environment.ready ?? Promise.resolve(), signal);
    preparation.readyWaitWallMs = performance.now() - constructed;
    check(signal);
    requireReadyEnvironment(version, environment);
    environment.resize(config.width, config.height, config.dpr, config.lens[version]);
    setCamera(environment);
    environment.update(config.frozenTime, true, 0, 0);
    status.textContent = `Preparing ${version} shaders and first complete frame…`;
    const target = getRenderer();
    const compileStart = performance.now();
    await abortable(target.compileAsync(environment.scene, environment.camera), signal);
    preparation.compileAsyncWallMs = performance.now() - compileStart;
    await frame(signal);
    // Record the first fully ready render separately, including initial texture
    // upload. It is not included in the steady-state ABBA/BAAB frame samples.
    const gl = target.getContext() as WebGL2RenderingContext;
    const timer = extension;
    const disjointBefore = timer ? !!gl.getParameter(timer.GPU_DISJOINT_EXT) : false;
    const query = timer && !disjointBefore ? gl.createQuery() : null;
    const renderStart = performance.now();
    try {
      if (query) gl.beginQuery(timer!.TIME_ELAPSED_EXT, query);
      try { target.render(environment.scene, environment.camera); }
      finally { if (query) gl.endQuery(timer!.TIME_ELAPSED_EXT); }
      preparation.firstRenderCpuMs = performance.now() - renderStart;
      preparation.firstSubmittedFrameWallMs = performance.now() - preparationStart;
      preparation.firstRenderGpuMs = null;
      preparation.firstRenderGpuStatus = timer ? disjointBefore ? 'disjoint' : 'query-unavailable' : 'unsupported';
      if (query) {
        const deadline = performance.now() + 3000;
        preparation.firstRenderGpuStatus = 'timeout';
        while (performance.now() < deadline) {
          await pause(16, signal);
          if (gl.getParameter(timer!.GPU_DISJOINT_EXT)) { preparation.firstRenderGpuStatus = 'disjoint'; break; }
          if (!gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)) continue;
          const ns = gl.getQueryParameter(query, gl.QUERY_RESULT) as unknown;
          preparation.firstRenderGpuStatus = typeof ns === 'number' && Number.isFinite(ns) && ns >= 0 ? 'valid' : 'query-unavailable';
          if (preparation.firstRenderGpuStatus === 'valid') preparation.firstRenderGpuMs = (ns as number) / 1e6;
          break;
        }
      }
      preparation.environmentDiagnostics = requireReadyEnvironment(version, environment);
    } finally { if (query) gl.deleteQuery(query); }
  }
  await abortable(environment.ready ?? Promise.resolve(), signal);
  check(signal);
  requireReadyEnvironment(version, environment);
  environment.resize(config.width, config.height, config.dpr, config.lens[version]);
  setCamera(environment);
  return environment;
}
function resetEnvironments() {
  for (const { environment } of environments.values()) environment.dispose();
  environments.clear();
}
function setCamera(environment: Environment) {
  const reference = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, .1, 1200);
  reference.updateMatrixWorld(true);
  const world = reference.clone();
  const pose = settings().camera;
  world.rotation.set(THREE.MathUtils.degToRad(pose.pitch), THREE.MathUtils.degToRad(pose.yaw), THREE.MathUtils.degToRad(pose.roll), 'YXZ');
  world.updateMatrixWorld(true);
  environment.followCamera(world, reference);
}
async function rest(prefix: string, signal: AbortSignal) {
  const deadline = performance.now() + REST_MS;
  while (performance.now() < deadline) {
    status.textContent = `${prefix}. Idle recovery: ${Math.ceil((deadline - performance.now()) / 1000)} seconds remaining. No WebGL rendering or animation-frame requests.`;
    await pause(Math.min(1000, Math.max(1, deadline - performance.now())), signal);
  }
}
function deviceDetails() {
  const target = getRenderer();
  const gl = target.getContext();
  const debug = gl.getExtension('WEBGL_debug_renderer_info');
  const buffer = target.getDrawingBufferSize(new THREE.Vector2());
  return {
    userAgent: navigator.userAgent, platform: navigator.platform,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemoryGiB: (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null,
    nativePixelRatio: devicePixelRatio, threeRevision: THREE.REVISION,
    webglVersion: gl.getParameter(gl.VERSION), shadingLanguage: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
    vendor: gl.getParameter(gl.VENDOR), renderer: gl.getParameter(gl.RENDERER),
    unmaskedVendor: debug ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL) : null,
    unmaskedRenderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null,
    drawingBuffer: { width: buffer.x, height: buffer.y },
    contextAttributes: gl.getContextAttributes(), gpuTimerAvailable: !!extension,
    visibility: document.visibilityState, fullscreen: !!document.fullscreenElement,
  };
}
function statistics(values: number[]) {
  if (!values.length) return { count: 0, mean: null, median: null, p95: null, min: null, max: null };
  const sorted = [...values].sort((a, b) => a - b);
  return {
    count: values.length, mean: values.reduce((sum, value) => sum + value, 0) / values.length,
    median: (sorted[Math.floor((sorted.length - 1) / 2)] + sorted[Math.ceil((sorted.length - 1) / 2)]) / 2,
    p95: sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)], min: sorted[0], max: sorted[sorted.length - 1],
  };
}
function summary(report: Report) {
  return Object.fromEntries((['reference', 'current'] as const).map(version => {
    const rows = report.blocks.filter(block => block.version === version).flatMap(block => block.frames);
    return [version, {
      measuredFrames: rows.length,
      gpuMs: statistics(rows.filter(row => row.gpuStatus === 'valid').map(row => row.gpuMs!)),
      updateCpuMs: statistics(rows.map(row => row.updateCpuMs)),
      renderCpuMs: statistics(rows.map(row => row.renderCpuMs)),
      totalCpuMs: statistics(rows.map(row => row.totalCpuMs)),
      frameIntervalMs: statistics(rows.flatMap(row => row.frameIntervalMs === null ? [] : [row.frameIntervalMs])),
      invalidGpuFrames: rows.filter(row => !['valid', 'not-sampled'].includes(row.gpuStatus)).length,
    }];
  }));
}
/** This gate concerns timing evidence, separately from run/data validity. */
function assessStability(report: Report) {
  const metric = extension ? 'gpuMs' : 'totalCpuMs';
  const controls = Object.fromEntries((['reference', 'current'] as const).map(version => {
    const means = report.blocks.filter(block => block.version === version).map(block => {
      const rows = metric === 'gpuMs' ? block.frames.filter(row => row.gpuStatus === 'valid').map(row => row.gpuMs!) : block.frames.map(row => row.totalCpuMs);
      return statistics(rows).mean;
    });
    const valid = means.filter((value): value is number => value !== null && value > 0);
    const mean = valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
    const spreadPercent = valid.length >= 2 && mean ? (Math.max(...valid) - Math.min(...valid)) / mean * 100 : null;
    const returnChangePercent = valid.length >= 2 ? (valid[valid.length - 1] - valid[0]) / valid[0] * 100 : null;
    return [version, { blockMeansMs: means, meanMs: mean, spreadPercent, returnChangePercent, stable: valid.length === means.length && spreadPercent !== null && spreadPercent <= 5 }];
  }));
  const a = controls.reference, b = controls.current;
  const relativeSavingPercent = a.meanMs && b.meanMs ? (a.meanMs - b.meanMs) / a.meanMs * 100 : null;
  const exceedsObservedControlSpread = relativeSavingPercent !== null && Math.abs(relativeSavingPercent) > Math.max(a.spreadPercent ?? Infinity, b.spreadPercent ?? Infinity);
  return {
    metric, controlSpreadLimitPercent: 5, controls, relativeSavingPercent,
    exceedsObservedControlSpread,
    conclusion: report.status !== 'complete' ? 'inconclusive: run did not complete with valid required samples'
      : !a.stable || !b.stable ? 'inconclusive: repeated controls exceed the 5% spread gate or have insufficient data'
      : !exceedsObservedControlSpread ? 'inconclusive: difference does not exceed observed control variation'
      : 'difference exceeds this run’s control variation; repeat in the opposite order before drawing a performance conclusion',
    limits: 'This heuristic is not a confidence interval or a thermal diagnosis. GPU-unavailable fallback describes CPU command submission only. Small CPU timings are sensitive to timer quantization. No power, heat, whole-app FPS or battery claim follows.',
  };
}
function publish(report: Report) {
  report.comparisonAssessment = assessStability(report);
  report.summary = { pooled: summary(report), perBlock: report.blocks.map(block => ({ index: block.index, version: block.version, summary: summary({ ...report, blocks: [block] })[block.version] })) };
  lastReport = report;
  output.value = JSON.stringify(report, null, 2);
  copyButton.disabled = downloadButton.disabled = false;
  showButton.disabled = false;
}
function requirePlayback(environment: Environment, version: Version) {
  const playback = environment.getEarthPlayback?.();
  if (!environment.setEarthPlayback || !playback || !playback.ready ||
    !Number.isFinite(playback.duration) || playback.duration <= 0)
    throw new Error(`${comparison[version].label}: animated timing requires the Earth playback API. Use frozen timing with older baselines.`);
  return playback;
}
/** Reset outside measurement; both sky and Earth replay the same elapsed range. */
function resetBlockClock(environment: Environment, version: Version, startTime: number, mode: AnimationMode) {
  if (!environment.getEarthPlayback || !environment.setEarthPlayback) {
    if (mode !== 'frozen') requirePlayback(environment, version);
    return;
  }
  const playback = requirePlayback(environment, version);
  environment.setEarthPlayback({ type: 'playing', playing: false });
  // update accepts an absolute caller clock. This synchronizes the sky and the
  // previous-Earth-time anchor without advancing Earth during the rewind.
  environment.update(startTime, true, 0, 0);
  environment.setEarthPlayback({ type: 'seek', time: startTime % playback.duration });
  environment.setEarthPlayback({ type: 'speed', speed: 1 });
  environment.setEarthPlayback({ type: 'playing', playing: true });
}
async function measureBlock(block: Block, environment: Environment, frozenTime: number, signal: AbortSignal) {
  const target = getRenderer();
  const gl = target.getContext() as WebGL2RenderingContext;
  const timer = extension;
  const pending = new Map<WebGLQuery, Frame>();
  let lastTimestamp: number | null = null;
  let sawDisjoint = false;
  const invalidatePending = (reason: Frame['gpuStatus']) => {
    for (const [query, row] of pending) {
      row.gpuStatus = reason;
      row.gpuNs = row.gpuMs = null;
      gl.deleteQuery(query);
    }
    pending.clear();
  };
  const poll = () => {
    if (!timer) return false;
    const disjoint = !!gl.getParameter(timer.GPU_DISJOINT_EXT);
    if (disjoint) {
      if (!sawDisjoint) block.disjointEvents.push(performance.now());
      sawDisjoint = true;
      invalidatePending('disjoint');
      // A clock discontinuity invalidates the entire block conservatively,
      // including queries read before the disjoint signal was observed.
      for (const row of block.frames) { row.gpuStatus = 'disjoint'; row.gpuNs = row.gpuMs = null; }
      return true;
    }
    for (const [query, row] of pending) {
      if (!gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)) continue;
      const ns = gl.getQueryParameter(query, gl.QUERY_RESULT) as unknown;
      row.gpuStatus = sawDisjoint ? 'disjoint' : typeof ns === 'number' && Number.isFinite(ns) && ns >= 0 ? 'valid' : 'query-unavailable';
      if (row.gpuStatus === 'valid') { row.gpuNs = ns as number; row.gpuMs = (ns as number) / 1e6; }
      gl.deleteQuery(query);
      pending.delete(query);
    }
    return false;
  };
  try {
    status.textContent = `Block ${block.index + 1} · ${block.version} · warming up ${WARMUP_FRAMES} frames…`;
    for (let index = 0; index < WARMUP_FRAMES; index++) {
      await frame(signal);
      environment.update(frozenTime, true, 0, 0);
      target.render(environment.scene, environment.camera);
      block.warmupFrames++;
    }
    status.textContent = `Block ${block.index + 1} · ${block.version} · measuring ${block.measuredFramesTarget} frames…`;
    for (let index = 0; index < block.measuredFramesTarget; index++) {
      const timestamp = await frame(signal);
      const disjoint = poll();
      const animationTime = frozenTime + (index + 1) * block.animation.stepSeconds;
      const start = performance.now();
      environment.update(animationTime, true, 0, 0);
      const updated = performance.now();
      const sampled = index % 5 === 0;
      const query = timer && sampled && !disjoint && !sawDisjoint ? gl.createQuery() : null;
      const row: Frame = {
        index, rafTimestamp: timestamp, frameIntervalMs: lastTimestamp === null ? null : timestamp - lastTimestamp, animationTime,
        updateCpuMs: updated - start, renderCpuMs: 0, totalCpuMs: 0, gpuNs: null, gpuMs: null,
        gpuStatus: !timer ? 'unsupported' : sawDisjoint ? 'disjoint' : !sampled ? 'not-sampled' : query ? 'pending' : 'query-unavailable',
        calls: 0, triangles: 0, points: 0,
      };
      block.frames.push(row);
      if (query) { pending.set(query, row); gl.beginQuery(timer!.TIME_ELAPSED_EXT, query); }
      const renderStart = performance.now();
      try { target.render(environment.scene, environment.camera); }
      finally { if (query) gl.endQuery(timer!.TIME_ELAPSED_EXT); }
      const ended = performance.now();
      row.renderCpuMs = ended - renderStart;
      row.totalCpuMs = ended - start;
      row.calls = target.info.render.calls;
      row.triangles = target.info.render.triangles;
      row.points = target.info.render.points;
      lastTimestamp = timestamp;
      block.animation.firstMeasuredTime ??= animationTime;
      block.animation.finalTime = animationTime;
    }
    const drainDeadline = performance.now() + 3000;
    while (pending.size && performance.now() < drainDeadline) {
      await pause(16, signal);
      poll();
    }
    invalidatePending('timeout');
  } finally {
    invalidatePending('stopped');
    block.finishedAt = now();
    block.finalEnvironmentDiagnostics = environment.getDiagnostics();
  }
}
async function preview() {
  if (active) return;
  const controller = new AbortController();
  busy(controller);
  try {
    getRenderer();
    resizeRenderer();
    // A fresh environment makes arbitrary forward/backward time selection exact;
    // the production active clock intentionally never rewinds itself.
    resetEnvironments();
    const environment = await loadEnvironment(versionInput.value as Version, controller.signal, 'preview');
    environment.update(Number(timeInput.value), true, 0, 0);
    getRenderer().render(environment.scene, environment.camera);
    status.textContent = `${comparison[versionInput.value as Version].label} at ${timeInput.value}s. Frozen preview; no continuing animation loop.`;
    const diagnostics = environment.getDiagnostics() as Record<string, unknown>;
    const period = Number(diagnostics.earthLoopSeconds);
    if (versionInput.value === 'current' && period > 0) periodInput.value = String(period);
    element<HTMLPreElement>('preview-info').textContent = JSON.stringify({
      version: versionInput.value, ...settings(), diagnostics,
      source: comparison[versionInput.value as Version],
      buildManifest: await manifestPromise,
      comparisonBasis: 'Before and after use the same elapsed seconds and fixed camera pose. A changed loop period means their fractional phases can differ.',
    }, null, 2);
  } catch (error) { disposeIncomplete(); status.textContent = error instanceof Error ? error.message : String(error); blank(); }
  finally { busy(); }
}
async function compare() {
  if (active) return;
  const controller = new AbortController();
  busy(controller);
  let report: Report | undefined;
  try {
    if (document.hidden) throw new Error('Keep the lab visible before starting.');
    getRenderer();
    resizeRenderer();
    const config = settings();
    if (![config.frozenTime, config.dpr, ...Object.values(config.camera)].every(Number.isFinite)) throw new Error('Use finite time, pixel ratio and camera values.');
    const order = orderInput.value;
    const measuredFrames = Number(framesInput.value);
    report = {
      schemaVersion: 1, runId: crypto.randomUUID(), startedAt: now(), status: 'running',
      buildManifest: await abortable(manifestPromise, controller.signal), device: deviceDetails(),
      configuration: { ...config, animationProtocol: config.animationMode === 'replay-60hz' ? 'Each measured frame advances all environment animation by deterministic 1/60 seconds at normal Earth 1× speed. Warmup stays frozen. Earth phase and sky clock reset outside timing before every block. This is motion-work replay, not wall-clock-rate playback.' : 'All measured frames use the same fixed elapsed time.', comparison, order, framesPerBlock: measuredFrames, measuredFramesPerVersion: measuredFrames * order.length / 2, warmupFramesPerBlock: WARMUP_FRAMES, idleRestMs: REST_MS, blocks: order.length, frozenView: config.camera, queryScope: 'renderer.render(environment.scene, environment.camera)', sampleUnit: 'one background render', gpuSampleEveryFrames: 5 },
      blocks: [], limits: ['GPU timings are direct elapsed timer queries, not power or temperature measurements.', 'This finite background-only comparison excludes spacecraft rendering, app UI and camera motion.', 'Frame intervals include browser scheduling; CPU submission duration is not GPU execution time.', 'Shared device load and thermal state are uncontrolled. Compare repeated ABBA and BAAB runs on the same device/configuration.', 'Both environments are retained during timing for fair warm switching; total process/resource memory is not normal visitor memory. Per-Earth texture storage is an allocation estimate in diagnostics, not a measured process-memory saving.', 'Hidden tabs, viewport changes and lost WebGL contexts stop and invalidate the comparison.', 'Timer disjoint invalidates the affected entire block. Unsupported/invalid query results are null, never zero.'],
    };
    resetEnvironments();
    const preparationStart = performance.now();
    // Sequential preparation is excluded, followed by a blank rest; both
    // implementations are ready before any block is measured.
    const prepared = new Map<Version, Environment>();
    const reusedVersions = [...environments].filter(([, value]) => value.mobile === config.mobile && value.preparation.firstSubmittedFrameWallMs !== undefined).map(([version]) => version);
    const preparationOrder = [...new Set(order.split('').map(letter => letter === 'A' ? 'reference' : 'current'))] as Version[];
    for (const version of preparationOrder) prepared.set(version, await loadEnvironment(version, controller.signal, 'comparison'));
    if (config.animationMode === 'replay-60hz')
      for (const [version, environment] of prepared) requirePlayback(environment, version);
    report.preparationMs = performance.now() - preparationStart;
    report.preparation = {
      reusedVersions, preparationOrder,
      phases: [...environments.values()].map(value => value.preparation),
      note: 'First submitted frame is a CPU-side submission milestone, not a presentation timestamp. Cold means first environment load in this page, not a guaranteed cold browser/driver cache. Reload before a cold comparison; do not preview first. Shader compilation is measured with renderer.compileAsync; first render separately includes initial upload work.',
    };
    const sequence = order.split('').map(letter => letter === 'A' ? 'reference' : 'current') as Version[];
    for (let index = 0; index < sequence.length; index++) {
      blank();
      await rest(`${index === 0 ? 'Preparation complete' : `Block ${index}/${sequence.length} complete`}`, controller.signal);
      const version = sequence[index];
      const environment = prepared.get(version)!;
      resetBlockClock(environment, version, config.frozenTime, config.animationMode);
      const block: Block = { index, version, startedAt: now(), warmupFrames: 0, measuredFramesTarget: measuredFrames, environmentDiagnostics: requireReadyEnvironment(version, environment), frames: [], disjointEvents: [], animation: { mode: config.animationMode, startTime: config.frozenTime, finalTime: config.frozenTime, stepSeconds: config.animationMode === 'replay-60hz' ? 1 / 60 : 0, firstMeasuredTime: null } };
      report.blocks.push(block);
      await measureBlock(block, environment, config.frozenTime, controller.signal);
    }
    report.status = extension && report.blocks.some(block => block.frames.some(row => !['valid', 'not-sampled'].includes(row.gpuStatus))) ? 'invalid' : 'complete';
    if (report.status === 'invalid') report.reason = 'Some GPU queries were invalid or unavailable; do not use this paired comparison for a performance decision.';
    status.textContent = report.status === 'complete'
      ? `Finished ${order}: ${measuredFrames * order.length / 2} frames per version. ${extension ? 'GPU and CPU' : 'CPU/frame only; GPU timer unavailable'} results are ready to copy. Rendering stopped.`
      : 'Finished with invalid GPU timing. Raw results retained; repeat the comparison.';
  } catch (error) {
    disposeIncomplete();
    const message = error instanceof Error ? error.message : String(error);
    if (report) { report.status = message === 'Stopped by user.' ? 'stopped' : 'invalid'; report.reason = message; }
    status.textContent = message;
  } finally {
    blank();
    if (report) { report.finishedAt = now(); publish(report); }
    busy();
  }
}
previewButton.addEventListener('click', () => void preview());
for (const [button, version] of [[beforeButton, 'reference'], [afterButton, 'current']] as const)
  button.addEventListener('click', () => { versionInput.value = version; void preview(); });
element<HTMLButtonElement>('phase-apply').addEventListener('click', () => {
  if (active) return;
  timeInput.value = String(Math.max(0, Number(periodInput.value) * Number(phaseInput.value)));
  void preview();
});
downloadButton.addEventListener('click', () => {
  if (!lastReport) return;
  const url = URL.createObjectURL(new Blob([output.value], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url; link.download = `regional-earth-${lastReport.runId}.json`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
startButton.addEventListener('click', () => void compare());
stopButton.addEventListener('click', () => { active?.abort(new Error('Stopped by user.')); blank(); });
fullscreenButton.addEventListener('click', () => {
  void document.documentElement.requestFullscreen().catch(error => { status.textContent = String(error); });
});
element<HTMLButtonElement>('hide').addEventListener('click', () => { controls.hidden = true; restoreButton.hidden = false; });
restoreButton.addEventListener('click', () => { controls.hidden = false; restoreButton.hidden = true; });
showButton.addEventListener('click', () => { output.hidden = !output.hidden; showButton.textContent = output.hidden ? 'Show JSON' : 'Hide JSON'; });
copyButton.addEventListener('click', () => {
  if (!lastReport) return;
  const fallback = () => {
    output.hidden = false; output.focus(); output.select(); showButton.textContent = 'Hide JSON';
    status.textContent = 'Clipboard unavailable. The JSON is selected; copy it with your keyboard.';
  };
  if (!navigator.clipboard?.writeText) { fallback(); return; }
  void navigator.clipboard.writeText(output.value).then(() => { status.textContent = 'Comparison JSON copied.'; }, fallback);
});
for (const input of [versionInput, timeInput, animationInput, dprInput, yawInput, pitchInput, rollInput]) input.addEventListener('change', () => {
  resizeRenderer(); blank(); status.textContent = 'Settings changed. Choose Preview or Start; rendering remains idle.';
});
window.addEventListener('resize', () => {
  active?.abort(new Error('Viewport or drawing resolution changed; comparison invalid.'));
  resizeRenderer(); blank();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) active?.abort(new Error('Tab became hidden; comparison invalid.'));
});
window.addEventListener('pagehide', () => {
  active?.abort(new Error('Page closed; comparison invalid.'));
  for (const { environment } of environments.values()) environment.dispose();
  environments.clear(); renderer?.dispose();
});
