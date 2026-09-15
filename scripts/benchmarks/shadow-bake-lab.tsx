/** Frozen public-fixture shadow experiment. Manual frames; no visitor controls. */
import { createRoot } from 'react-dom/client';
import { ImmersivePortfolio } from '../../features/portfolio/immersive-portfolio';
import type { SceneAudit, SceneAuditController } from '../../features/diagnostics/scene-audit';
import { seeds } from '../../lib/content/seed';
import { toPortfolio, type Content, type Kind } from '../../lib/content/types';
import { createShadowBakeSession } from './shadow-depth-bake';
import { controlStability, median } from './controlled-protocol.mjs';
import './camera-invalidation-lab.css';

const panel = document.getElementById('camera-lab-controls')!;
panel.innerHTML = `<section class="camera-lab-panel"><h2>Cached vs offline shadow lab</h2>
<p id="status" role="status">Preparing the delivered runtime…</p>
<div class="camera-lab-actions"><button id="verify" disabled>Bake and verify</button>
<button id="timing" disabled>Rested comparison</button><button id="survey" disabled>Cost survey (unranked)</button><button id="stop">Stop</button></div>
<p>The bake keeps native depth, the existing PCF shader and its filtering. It is a lab-only candidate; the portfolio remains unchanged.</p>
<label>Conditions <input id="conditions" placeholder="Power, other workload, placement"></label>
<details><summary>Results</summary><textarea id="output" readonly aria-label="Shadow experiment result"></textarea></details></section>`;
const button = (id: string) => document.getElementById(id) as HTMLButtonElement;
let controller: SceneAuditController;
let context: Parameters<NonNullable<SceneAudit['shadowReady']>>[0];
let session: ReturnType<typeof createShadowBakeSession>;
let bytes: Uint8Array;
let asset: any;
let busy = false, stopped = false, contextLost = false;
let runViewport = '';
let interruption: string | null = null;
let nativeEverAvailable = false;
addEventListener('resize', () => { if (busy) interruption = 'Viewport changed'; });
document.addEventListener('visibilitychange', () => { if (busy && document.hidden) interruption = 'Page became hidden'; });
const viewport = () => [innerWidth, innerHeight, devicePixelRatio].join(',');
const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const data = toPortfolio(seeds.map((item) => ({ id: item.id, kind: item.kind as Kind,
  draft: item.data, published: item.data, revision: 1, updatedAt: '2026-09-15T00:00:00.000Z' })) as Content[]);
const audit: SceneAudit = {
  manual: true,
  shadowReady(value) { context = value; session = createShadowBakeSession(value); return () => session.dispose(); },
  ready(value) {
    controller = value; value.freezeBackground(0);
    button('verify').disabled = false;
    document.querySelector('#ship canvas')?.addEventListener('webglcontextlost', () => { contextLost = true; });
    void status('Ready. Nothing renders until you start a check.');
  },
};
createRoot(document.getElementById('portfolio-root')!).render(
  <ImmersivePortfolio data={data} initialSection="home" preview={false} sceneAudit={audit}><p>Public seed fixture.</p></ImmersivePortfolio>,
);
function check() {
  if (interruption || stopped || contextLost || document.hidden || (runViewport && runViewport !== viewport())) throw new Error('Interrupted: stop, hidden page, lost context or changed viewport.');
}
async function status(message: string) {
  document.getElementById('status')!.textContent = message;
  await fetch('/progress', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phase: message }) });
}
async function step(after?: () => void) {
  await new Promise<void>((resolve, reject) => requestAnimationFrame(() => {
    try { check(); controller.step(1 / 60); after?.(); resolve(); } catch (error) { reject(error); }
  }));
}
async function steps(count: number) { for (let i = 0; i < count; i++) await step(); }
async function settle(room: string) {
  session.selectLive(); controller.navigate(room); await pause(0);
  for (let i = 0; i < 480; i++) {
    await step();
    if (i > 90 && !controller.state().travelling && !controller.state().motionActive && controller.state().backgroundReady) return;
  }
  throw new Error(`Could not settle ${room}`);
}
async function native() { const value: any = await (await fetch('/context')).json(); nativeEverAvailable ||= value.availability === 'available'; return value; }
async function save(report: any) {
  report.endedAt = new Date().toISOString();
  const response = await fetch('/results', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ runId: report.runId, report }) });
  if (!response.ok) throw new Error(await response.text());
  const result: any = await response.json();
  (document.getElementById('output') as HTMLTextAreaElement).value = JSON.stringify({ status: report.status, result, depth: report.depth, asset: report.asset, checks: report.verifications?.map((v: any) => ({ name: v.name, changedPixels: v.changedPixels, maxChannelDifference: v.maxChannelDifference })), blocks: report.blocks }, null, 2);
  await status(`${report.status}: ${result.filename}`);
}
async function loadBake() {
  const begin = performance.now();
  const response = await fetch(asset.url, { cache: 'no-store' });
  if (!response.ok) throw new Error(await response.text());
  const compressed = await response.arrayBuffer();
  const fetched = performance.now();
  const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'));
  const decoded = new Uint8Array(await new Response(stream).arrayBuffer());
  return { data: decoded, loopbackFetchMs: fetched - begin, decompressMs: performance.now() - fetched, downloadedBytes: compressed.byteLength };
}
async function verify(report: any) {
  await status('Preparing the source shadow map and 8K Earth');
  await settle('home');
  // Force the current baseline at this exact light/camera state before export.
  await step(() => controller.compareGeometry(() => () => {}));
  if (!asset) {
    const captured = session.capture();
    let binary = '';
    for (let i = 0; i < captured.data.length; i += 32768) binary += String.fromCharCode(...captured.data.subarray(i, i + 32768));
    const response = await fetch('/bake', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ size: captured.size, base64: btoa(binary), signature: captured.signature }) });
    if (!response.ok) throw new Error(await response.text());
    asset = await response.json();
    report.captureMs = captured.captureMs;
  }
  const loaded = await loadBake(); bytes = loaded.data;
  const started = performance.now(); session.restore(bytes, asset.size);
  report.restoreSubmissionMs = performance.now() - started;
  report.load = { ...loaded, data: undefined };
  report.asset = asset;
  report.depth = session.verifyDepth(bytes);
  report.verifications = [];
  const compare = async (name: string, image = false) => {
    await step(() => {
      const state = controller.state();
      const result = controller.compareGeometry(() => { session.selectBaked(); return () => session.selectLive(); }, image);
      report.verifications.push({ name, state, ...result, liveFallback: controller.verifyFrame(false) });
    });
  };
  await compare('overview', true);
  for (const room of ['projects', 'about', 'experience', 'contact']) {
    await status(`Comparing ${room}, including the moving view and door states`);
    controller.navigate(room); await pause(0);
    for (let i = 0; i < 360; i++) {
      await step();
      if ([10, 40, 80, 160].includes(i)) await compare(`${room}-travel-${i}`, i === 40 && room === 'projects');
      if (i > 160 && !controller.state().travelling && !controller.state().motionActive) break;
    }
    await compare(`${room}-settled`, true);
  }
  await settle('projects');
  const canvas = document.querySelector('#ship canvas')!;
  const bounds = canvas.getBoundingClientRect();
  const pointer = (type: string, x: number, y: number) => canvas.dispatchEvent(new PointerEvent(type, {
    bubbles: true, cancelable: true, pointerType: 'mouse', isPrimary: true,
    pointerId: 911, button: 0, buttons: type === 'pointerup' ? 0 : 1,
    clientX: bounds.left + bounds.width * x, clientY: bounds.top + bounds.height * y,
  }));
  for (let i = 0; i < 90; i++) {
    pointer('pointermove', .5 + .2 * Math.sin(i / 89 * Math.PI * 2), .4);
    await step(); if ([15,45,75].includes(i)) await compare(`hover-${i}`);
  }
  pointer('pointerdown', .5, .5);
  for (let i = 0; i < 30; i++) { pointer('pointermove', .5 + .2 * i / 29, .5 - .1 * i / 29); await step(); }
  await compare('drag-held'); pointer('pointerup', .7, .4);
  await steps(15); await compare('drag-return');
  canvas.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse', isPrimary: true }));
  await settle('about');
  for (const open of [true, false]) {
    history.pushState({ orbital: true }, '', location.pathname + (open ? '?open=1' : ''));
    dispatchEvent(new PopStateEvent('popstate', { state: { orbital: true } }));
    await pause(0); await steps(30); await compare(`reader-${open ? 'opening' : 'closing'}`);
    await steps(150); await compare(`reader-${open ? 'open' : 'closed'}`);
  }
  await settle('home'); await compare('overview-return', true);
  report.settingsAfter = controller.snapshot().settings;
  report.status = report.depth.changedBytes === 0 ? 'complete' : 'depth-roundtrip-failed';
}

/** An isolated GPU query, outside the application frame/pass timers. */
async function measureOperation(operation: () => void, iterations = 8) {
  check();
  const gl = context.renderer.getContext() as WebGL2RenderingContext;
  const priorGlError = gl.getError();
  const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  const query = ext ? gl.createQuery() : null;
  const disjointBefore = ext ? !!gl.getParameter(ext.GPU_DISJOINT_EXT) : false;
  if (ext && gl.getQuery(ext.TIME_ELAPSED_EXT, gl.CURRENT_QUERY)) throw new Error('Refusing nested GPU query.');
  const before = { ...context.renderer.info.render };
  let cpuMs = 0;
  try {
    if (query) gl.beginQuery(ext.TIME_ELAPSED_EXT, query);
    const started = performance.now();
    for (let i = 0; i < iterations; i++) operation();
    cpuMs = (performance.now() - started) / iterations;
  } finally { if (query) gl.endQuery(ext.TIME_ELAPSED_EXT); }
  const after = { ...context.renderer.info.render };
  let gpuMs: number | null = null;
  if (query) {
    gl.flush();
    for (let i = 0; i < 400; i++) {
      if (gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)) {
        if (!disjointBefore && !gl.getParameter(ext.GPU_DISJOINT_EXT)) gpuMs = gl.getQueryParameter(query, gl.QUERY_RESULT) / 1e6 / iterations;
        break;
      }
      await pause(5);
    }
    gl.deleteQuery(query);
  }
  check();
  return { iterations, cpuMs, gpuMs, priorGlError, counts: Object.fromEntries(['calls', 'triangles', 'points', 'lines'].map((key) => [key, (after[key as keyof typeof after] - before[key as keyof typeof before]) / iterations])), glError: gl.getError() };
}
async function timing(report: any, survey = false) {
  if (!bytes || !asset) throw new Error('Bake and verify first.');
  report.asset = asset; report.controls = []; report.blocks = []; report.steady = [];
  await settle('home');
  const generate = () => {
    session.selectLive();
    context.renderer.setRenderTarget(null); context.renderer.clear();
    context.renderer.render(context.scene, context.camera);
  };
  const restore = () => {
    session.restore(bytes, asset.size); session.selectBaked();
    context.renderer.setRenderTarget(null); context.renderer.clear();
    context.renderer.render(context.scene, context.camera);
  };
  // Compile both helpers outside timed samples. These are warmed marginal costs.
  generate(); restore();
  if (survey) {
    report.preparation = [];
    await status('Diagnostic ABBA survey: descriptive costs only, no performance ranking');
    for (const variant of ['A','B','B','A']) {
      report.preparation.push({ variant, ...await measureOperation(variant === 'A' ? generate : restore) });
      await pause(1000); check();
    }
    controller.setGpuScope('frame');
    for (const variant of ['A','B','B','A']) {
      if (variant === 'A') session.selectLive(); else session.selectBaked();
      await steps(3); controller.reset(); await steps(120);
      report.steady.push({ variant, ...controller.snapshot() });
      await pause(1000); check();
    }
    report.status = 'descriptive-only-no-timing-ranking'; return;
  }
  await status('Resting for 60 seconds before three repeated baseline controls');
  for (let i = 0; i < 6; i++) { await pause(10000); check(); }
  for (let i = 0; i < 3; i++) {
    report.controls.push(await measureOperation(generate));
    await pause(10000); check();
  }
  const stable = (samples: any[]) => ({ cpu: controlStability(samples.map((s) => s.cpuMs)), gpu: controlStability(samples.map((s) => s.gpuMs)) });
  report.readinessContext = await native();
  report.readiness = stable(report.controls);
  if (report.controls.some((s: any) => s.priorGlError !== 0 || s.glError !== 0)) throw new Error('WebGL error in readiness controls');
  if (!report.readiness.cpu.stable || (report.controls.every((s: any) => s.gpuMs !== null) && !report.readiness.gpu.stable)) { report.status = 'inconclusive-readiness-drift'; return; }
  const matchingContext = (a: any, b: any) => {
    if (a.availability !== b.availability) return false;
    if (a.availability !== 'available') return !nativeEverAvailable;
    const power = (v: any) => v.native?.pmset?.battery?.stdout?.split('\n')[0];
    return a.native?.thermalState === 'nominal' && b.native?.thermalState === 'nominal' &&
      a.native?.lowPowerMode === b.native?.lowPowerMode && power(a) === power(b);
  };
  if (!matchingContext(report.contexts[0], report.readinessContext)) { report.status = 'inconclusive-context-change'; return; }
  for (const order of [['A','B','B','A'], ['B','A','A','B']]) {
    await status(`Measuring generation/restoration plus the same spacecraft pass ${order.join('')}`);
    const block: any = { order, samples: [], before: await native() };
    report.blocks.push(block);
    for (const variant of order) {
      block.samples.push({ variant, ...await measureOperation(variant === 'A' ? generate : restore) });
      await pause(1000); check();
    }
    block.after = await native();
    const controls = block.samples.filter((s: any) => s.variant === 'A');
    block.stability = stable(controls);
    block.cpuAccepted = matchingContext(report.readinessContext, block.before) && matchingContext(block.before, block.after) && block.samples.every((s: any) => s.glError === 0 && s.priorGlError === 0) && block.stability.cpu.stable;
    block.gpuAccepted = block.cpuAccepted && block.samples.every((s: any) => s.gpuMs !== null) && block.stability.gpu.stable;
    block.accepted = block.cpuAccepted && (block.samples.every((s: any) => s.gpuMs === null) || block.gpuAccepted);
    if (!block.accepted) { report.status = 'inconclusive-block-drift'; return; }
    await pause(20000); check();
  }
  // Same ordinary PCF sampling on both sides; one warm frame removes generation.
  controller.setGpuScope('frame');
  for (const variant of ['A','B','B','A','B','A','A','B']) {
    if (variant === 'A') session.selectLive(); else session.selectBaked();
    await steps(3); controller.reset(); await steps(120);
    report.steady.push({ variant, ...controller.snapshot() });
    await pause(1000); check();
  }
  report.summary = Object.fromEntries(['A','B'].map((variant) => [variant, {
    cpuMs: median(report.blocks.flatMap((b: any) => b.samples.filter((s: any) => s.variant === variant).map((s: any) => s.cpuMs))),
    gpuMs: median(report.blocks.flatMap((b: any) => b.samples.filter((s: any) => s.variant === variant).map((s: any) => s.gpuMs)).filter((v: any) => v !== null)),
  }]));
  report.status = 'complete';
}
async function start(mode: 'verify' | 'timing' | 'survey') {
  if (busy) return;
  busy = true; stopped = false; interruption = null; runViewport = viewport();
  button('verify').disabled = button('timing').disabled = button('survey').disabled = true;
  const report: any = { runId: `shadow-${mode}-${innerWidth}x${innerHeight}-${Date.now()}`, mode, status: 'running', startedAt: new Date().toISOString(), settings: controller.snapshot().settings,
    conditions: (document.getElementById('conditions') as HTMLInputElement).value,
    limitations: ['Built-in Chromium; public fixture, not Safari.', 'Frozen background, fixed 1/60 simulation steps; readbacks only outside timed samples.', 'Native-depth bake retains the exact PCF shader: no claimed steady sampling reduction.', 'Operation timings include map generation/restoration plus the same main spacecraft pass; exclude background, AO, HTML, cold page startup, real-network download and first-fallback latency.', 'Loopback fetch is not an internet speed estimate. Nominal OS pressure does not prove equal clocks or no throttling.'], errors: [], contexts: [] };
  try {
    report.contexts.push(await native());
    if (mode === 'verify') await verify(report); else await timing(report, mode === 'survey');
  } catch (error) { report.status = 'failed'; report.errors.push(String(error)); }
  finally {
    session.selectLive(); report.contexts.push(await native());
    try { await save(report); } catch (error) { await status(`Save failed: ${String(error)}`); }
    busy = false; runViewport = ''; button('verify').disabled = false; button('timing').disabled = button('survey').disabled = !bytes;
  }
}
button('verify').onclick = () => void start('verify');
button('timing').onclick = () => void start('timing');
button('survey').onclick = () => void start('survey');
button('stop').onclick = () => { stopped = true; };
