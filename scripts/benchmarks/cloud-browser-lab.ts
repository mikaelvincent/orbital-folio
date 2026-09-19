/** Developer-only, finite background comparison. No portfolio route imports this file.
 * A: frozen satellite cloud volume. B: current production night Earth texture.
 */
import * as THREE from 'three';
import { EARTH_TEXTURE_WIDTH, EARTH_TEXTURE_HEIGHT } from '../../features/orbit/earth-satellite';

type Version = 'reference' | 'current';
type Environment = {
  scene: THREE.Scene;
  camera: THREE.Camera;
  ready?: Promise<unknown>;
  resize(width: number, height: number, pixelRatio: number): void;
  update(time: number, moving: boolean, x: number, y: number): void;
  getDiagnostics(): unknown;
  dispose(): void;
};
type EnvironmentModule = { createOrbitalEnvironment(three: typeof THREE, invalidate: () => void, options: { mobile: boolean }): Environment };
const REST_MS = 20000;
const comparison = {
  reference: {
    label: 'Before — satellite cloud volume',
    source: 'scripts/benchmarks/satellite-volume-reference.ts',
    expectedAsset: '/textures/cloud-satellite-v2.cfd.gz',
  },
  current: {
    label: `After — ${EARTH_TEXTURE_WIDTH / 1024}K night Earth`,
    source: 'features/orbit/orbital-environment.ts',
    expectedTextureDimensions: [EARTH_TEXTURE_WIDTH, EARTH_TEXTURE_HEIGHT],
  },
};
type TimerExtension = { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number };
type Frame = {
  index: number; rafTimestamp: number; frameIntervalMs: number | null;
  updateCpuMs: number; renderCpuMs: number; totalCpuMs: number;
  gpuNs: number | null; gpuMs: number | null;
  gpuStatus: 'pending' | 'valid' | 'unsupported' | 'disjoint' | 'stopped' | 'timeout' | 'query-unavailable';
  calls: number; triangles: number; points: number;
};
type Block = {
  index: number; version: Version; startedAt: string; finishedAt?: string;
  warmupFrames: number; measuredFramesTarget: number; environmentDiagnostics: unknown;
  frames: Frame[]; disjointEvents: number[];
};
type Report = {
  schemaVersion: 1; runId: string; startedAt: string; finishedAt?: string;
  status: 'running' | 'complete' | 'stopped' | 'invalid'; reason?: string;
  buildManifest: unknown; device: unknown; configuration: unknown;
  preparationMs?: number; preparation?: unknown; blocks: Block[]; summary?: unknown;
  limits: string[];
};
const element = <T>(id: string) => document.getElementById(id) as T;
const versionInput = element<HTMLSelectElement>('version');
const timeInput = element<HTMLSelectElement>('time');
const dprInput = element<HTMLSelectElement>('dpr');
const orderInput = element<HTMLSelectElement>('order');
const framesInput = element<HTMLSelectElement>('frames');
const previewButton = element<HTMLButtonElement>('preview');
const startButton = element<HTMLButtonElement>('start');
const stopButton = element<HTMLButtonElement>('stop');
const fullscreenButton = element<HTMLButtonElement>('fullscreen');
const copyButton = element<HTMLButtonElement>('copy');
const showButton = element<HTMLButtonElement>('show');
const output = element<HTMLTextAreaElement>('report');
const status = element<HTMLParagraphElement>('status');
const controls = element<HTMLElement>('controls');
const restoreButton = element<HTMLButtonElement>('restore');
const now = () => new Date().toISOString();
const settings = () => ({
  width: innerWidth, height: innerHeight,
  dpr: dprInput.value === 'native' ? devicePixelRatio : Number(dprInput.value),
  mobile: innerWidth < 700, frozenTime: Number(timeInput.value),
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
  for (const { environment } of environments.values()) environment.resize(config.width, config.height, config.dpr);
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
  for (const input of [versionInput, timeInput, dprInput, orderInput, framesInput, previewButton, startButton, fullscreenButton]) input.disabled = !!controller;
  stopButton.disabled = !controller;
  copyButton.disabled = !!controller || !lastReport;
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
  if (version === 'reference') {
    if (
      diagnostics.cloudReady !== true ||
      diagnostics.cloudLoadError !== null ||
      diagnostics.cloudSource !== 'developer-baked-atlas' ||
      diagnostics.cloudWeatherModel !== 'satellite-scattered-variable-depth'
    ) throw new Error('Before: the exact satellite cloud atlas must load successfully; recovery or incomplete clouds are not a valid baseline.');
  } else {
    const dimensions = diagnostics.earthTextureDimensions;
    if (
      diagnostics.earthReady !== true ||
      diagnostics.earthLoadError !== null ||
      diagnostics.earthSource !== 'local-satellite-image' ||
      diagnostics.earthMode !== 'satellite-night-lights' ||
      diagnostics.earthAppearance !== 'night' ||
      !Array.isArray(dimensions) || dimensions.length !== 2 ||
      dimensions[0] !== EARTH_TEXTURE_WIDTH || dimensions[1] !== EARTH_TEXTURE_HEIGHT
    ) throw new Error('After: the current 8K night image must load successfully; fallback or incomplete Earth rendering is not a valid comparison.');
  }
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
    // Both versions and the current implementation's recovery generator stay cold
    // until requested. No copied shader strings can drift from the built sources.
    const preparationStart = performance.now();
    const preparationStartedAt = now();
    const source = await abortable<EnvironmentModule>(version === 'reference'
      ? import('./satellite-volume-reference.ts')
      : import('../../features/orbit/orbital-environment.ts'), signal);
    check(signal);
    const imported = performance.now();
    environment = source.createOrbitalEnvironment(THREE, () => {}, { mobile: config.mobile });
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
    environment.resize(config.width, config.height, config.dpr);
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
  environment.resize(config.width, config.height, config.dpr);
  return environment;
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
      invalidGpuFrames: rows.filter(row => row.gpuStatus !== 'valid').length,
    }];
  }));
}
function publish(report: Report) {
  report.summary = summary(report);
  lastReport = report;
  output.value = JSON.stringify(report, null, 2);
  copyButton.disabled = false;
  showButton.disabled = false;
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
    status.textContent = `Block ${block.index + 1}/4 · ${block.version} · warming up 10 frames…`;
    for (let index = 0; index < 10; index++) {
      await frame(signal);
      environment.update(frozenTime, true, 0, 0);
      target.render(environment.scene, environment.camera);
      block.warmupFrames++;
    }
    status.textContent = `Block ${block.index + 1}/4 · ${block.version} · measuring ${block.measuredFramesTarget} frames…`;
    for (let index = 0; index < block.measuredFramesTarget; index++) {
      const timestamp = await frame(signal);
      const disjoint = poll();
      const start = performance.now();
      environment.update(frozenTime, true, 0, 0);
      const updated = performance.now();
      const query = timer && !disjoint && !sawDisjoint ? gl.createQuery() : null;
      const row: Frame = {
        index, rafTimestamp: timestamp, frameIntervalMs: lastTimestamp === null ? null : timestamp - lastTimestamp,
        updateCpuMs: updated - start, renderCpuMs: 0, totalCpuMs: 0, gpuNs: null, gpuMs: null,
        gpuStatus: !timer ? 'unsupported' : sawDisjoint ? 'disjoint' : query ? 'pending' : 'query-unavailable',
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
  }
}
async function preview() {
  if (active) return;
  const controller = new AbortController();
  busy(controller);
  try {
    getRenderer();
    resizeRenderer();
    const environment = await loadEnvironment(versionInput.value as Version, controller.signal, 'preview');
    environment.update(Number(timeInput.value), true, 0, 0);
    getRenderer().render(environment.scene, environment.camera);
    status.textContent = `${comparison[versionInput.value as Version].label} at ${timeInput.value}s. Frozen preview; no continuing animation loop.`;
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
    const order = orderInput.value;
    const measuredFrames = Number(framesInput.value);
    report = {
      schemaVersion: 1, runId: crypto.randomUUID(), startedAt: now(), status: 'running',
      buildManifest: await abortable(manifestPromise, controller.signal), device: deviceDetails(),
      configuration: { ...config, comparison, order, framesPerBlock: measuredFrames, measuredFramesPerVersion: measuredFrames * 2, warmupFramesPerBlock: 10, idleRestMs: REST_MS, blocks: 4, frozenView: { x: 0, y: 0 }, queryScope: 'renderer.render(environment.scene, environment.camera)', sampleUnit: 'one background render' },
      blocks: [], limits: ['GPU timings are direct elapsed timer queries, not power or temperature measurements.', 'This finite background-only comparison excludes spacecraft rendering, app UI and camera motion.', 'Frame intervals include browser scheduling; CPU submission duration is not GPU execution time.', 'Shared device load and thermal state are uncontrolled. Compare repeated ABBA and BAAB runs on the same device/configuration.', 'Hidden tabs, viewport changes and lost WebGL contexts stop and invalidate the comparison.', 'Timer disjoint invalidates the affected entire block. Unsupported/invalid query results are null, never zero.'],
    };
    const preparationStart = performance.now();
    // Sequential preparation is excluded, followed by a blank rest; both
    // implementations are ready before any block is measured.
    const prepared = new Map<Version, Environment>();
    const reusedVersions = [...environments].filter(([, value]) => value.mobile === config.mobile && value.preparation.firstSubmittedFrameWallMs !== undefined).map(([version]) => version);
    for (const version of ['reference', 'current'] as const) prepared.set(version, await loadEnvironment(version, controller.signal, 'comparison'));
    report.preparationMs = performance.now() - preparationStart;
    report.preparation = {
      reusedVersions,
      phases: [...environments.values()].map(value => value.preparation),
      note: 'First submitted frame is a CPU-side submission milestone, not a presentation timestamp. Cold means first environment load in this page, not a guaranteed cold browser/driver cache. Reload before a cold comparison; do not preview first. Shader compilation is measured with renderer.compileAsync; first render separately includes initial upload work.',
    };
    const sequence = order.split('').map(letter => letter === 'A' ? 'reference' : 'current') as Version[];
    for (let index = 0; index < sequence.length; index++) {
      blank();
      status.textContent = `${index === 0 ? 'Preparation complete' : `Block ${index}/4 complete`}. Blank ${REST_MS / 1000}-second rest; no animation frames requested…`;
      await pause(REST_MS, controller.signal);
      const version = sequence[index];
      const environment = prepared.get(version)!;
      const block: Block = { index, version, startedAt: now(), warmupFrames: 0, measuredFramesTarget: measuredFrames, environmentDiagnostics: requireReadyEnvironment(version, environment), frames: [], disjointEvents: [] };
      report.blocks.push(block);
      await measureBlock(block, environment, config.frozenTime, controller.signal);
    }
    report.status = extension && report.blocks.some(block => block.frames.some(row => row.gpuStatus !== 'valid')) ? 'invalid' : 'complete';
    if (report.status === 'invalid') report.reason = 'Some GPU queries were invalid or unavailable; do not use this paired comparison for a performance decision.';
    status.textContent = report.status === 'complete'
      ? `Finished ${order}: ${measuredFrames * 2} frames per version. ${extension ? 'GPU and CPU' : 'CPU/frame only; GPU timer unavailable'} results are ready to copy. Rendering stopped.`
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
for (const input of [versionInput, timeInput, dprInput]) input.addEventListener('change', () => {
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
