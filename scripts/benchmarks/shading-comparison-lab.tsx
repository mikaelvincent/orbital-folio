/** Shared public-fixture replay for developer shading comparisons.
 * Explicit developer lab only; fixed simulation steps and no automatic frames.
 */
import { createRoot } from 'react-dom/client';
import { ImmersivePortfolio } from '../../features/portfolio/immersive-portfolio';
import type { SceneAudit, SceneAuditController, SceneShadingContext } from '../../features/diagnostics/scene-audit';
import { seeds } from '../../lib/content/seed';
import { toPortfolio, type Content, type Kind } from '../../lib/content/types';
import { controlStability, median } from './controlled-protocol.mjs';
import './camera-invalidation-lab.css';

type Variant = 'A' | 'B' | 'C';
type Mode = 'baseline' | 'verify' | 'timing' | 'survey';
type Workload = 'idle' | 'hover';
type Scope = 'frame' | 'passes';
type Snapshot = ReturnType<SceneAuditController['snapshot']>;
export type ShadingSession = {
  exportInput: () => any; install: (payload: any) => void;
  select: (variant: Variant) => void; update: () => void; dispose: () => void;
  stats: () => any; validationEvidence?: () => any; subdivisionOnly?: () => (() => void);
};
export function startShadingComparison(config: {
  id: 'contact' | 'diffuse'; title: string; description: string;
  labels: Record<Variant, string>; createSession: (context: SceneShadingContext) => ShadingSession;
  limitations: string[]; baselineRooms?: string[]; compactFallback?: boolean;
}) {
const labels = config.labels;

const rooms = config.baselineRooms ?? ['projects', 'about', 'experience', 'contact'];
const panel = document.getElementById('camera-lab-controls')!;
panel.innerHTML = `<style>#camera-lab-controls [data-running="true"] h2,#camera-lab-controls [data-running="true"] label,#camera-lab-controls [data-running="true"] details,#camera-lab-controls [data-running="true"] p:not(#shading-status),#camera-lab-controls [data-running="true"] .camera-lab-actions button:not(#shading-stop){display:none}</style><section class="camera-lab-panel"><h2>${config.title}</h2>
<p id="shading-status" role="status">Preparing the delivered runtime…</p>
<div class="camera-lab-actions"><button id="shading-baseline" disabled>1. Survey current rooms</button>
<button id="shading-verify" disabled>2. Bake and inspect</button><button id="shading-timing" disabled>3. Rested comparisons</button>
<button id="shading-survey" disabled>4. Unranked cost survey</button><button id="shading-stop">Stop</button></div>
<p>${config.description}</p>
<label>Conditions <input id="shading-conditions" placeholder="Power source, other workload, placement"></label>
<details><summary>Results and limitations</summary><textarea id="shading-output" readonly aria-label="Shading experiment results"></textarea></details></section>`;
const button = (name: string) => document.getElementById(`shading-${name}`) as HTMLButtonElement;
let controller: SceneAuditController;
let context: SceneShadingContext;
let session: ShadingSession;
let asset: any;
let verified = false, busy = false, stopped = false, contextLost = false;
let interruption: string | null = null;
let fixedViewport = '', nativeEverAvailable = false;
const viewport = () => [innerWidth, innerHeight, devicePixelRatio,
  document.querySelector<HTMLCanvasElement>('#ship canvas')?.width,
  document.querySelector<HTMLCanvasElement>('#ship canvas')?.height].join(',');
const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
addEventListener('resize', () => { if (busy) interruption = 'Viewport changed'; });
document.addEventListener('visibilitychange', () => { if (busy && document.hidden) interruption = 'Page became hidden'; });
const data = toPortfolio(seeds.map((item) => ({ id: item.id, kind: item.kind as Kind,
  draft: item.data, published: item.data, revision: 1, updatedAt: '2026-09-15T00:00:00.000Z' })) as Content[]);
const audit: SceneAudit = {
  manual: true,
  shadingReady(value) { context = value; session = config.createSession(value); return () => session.dispose(); },
  shadingFrame() { session?.update(); },
  ready(value) {
    controller = value; controller.freezeBackground(0);
    document.querySelector('#ship canvas')?.addEventListener('webglcontextlost', () => { contextLost = true; });
    button('baseline').disabled = button('verify').disabled = false;
    void status('Ready. No frames render until a check starts.');
  },
};
createRoot(document.getElementById('portfolio-root')!).render(
  <ImmersivePortfolio data={data} initialSection="home" preview={false} sceneAudit={audit}><p>Public seed fixture.</p></ImmersivePortfolio>,
);
function check() {
  if (stopped || contextLost || document.hidden || interruption || (fixedViewport && viewport() !== fixedViewport))
    throw new Error(interruption || 'Interrupted: stop, hidden page, context loss or changed drawing buffer.');
}
async function status(message: string) {
  document.getElementById('shading-status')!.textContent = message;
  await fetch('/progress', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phase: message }) });
}
async function rest(seconds: number) {
  for (let remaining = seconds; remaining > 0; remaining -= 10) { await pause(Math.min(10, remaining) * 1000); check(); }
}
async function step(after?: () => void) {
  await new Promise<void>((resolve, reject) => requestAnimationFrame(() => {
    try { check(); controller.step(1 / 60); after?.(); resolve(); } catch (error) { reject(error); }
  }));
}
async function steps(count: number) { for (let i = 0; i < count; i++) await step(); }
function host() { return document.getElementById('ship')!; }
function clearInput() {
  (document.activeElement as HTMLElement | null)?.blur?.();
  host().dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerId: 913, isPrimary: true, pointerType: 'mouse' }));
  host().dispatchEvent(new PointerEvent('pointerleave', { isPrimary: true, pointerType: 'mouse' }));
  document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
}
function pointer(type: string, x: number, y: number, dragging = false) {
  const canvas = host().querySelector('canvas')!, bounds = canvas.getBoundingClientRect();
  canvas.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerType: 'mouse', isPrimary: true,
    pointerId: 913, button: 0, buttons: type === 'pointerup' ? 0 : dragging ? 1 : 0,
    clientX: bounds.left + bounds.width * x, clientY: bounds.top + bounds.height * y }));
}
function hover(index: number) { pointer('pointermove', .5 + .2 * Math.sin(index / 119 * Math.PI * 2), .5 - .12 * Math.sin(index / 119 * Math.PI)); }
function reader(open: boolean) {
  clearInput();
  const section = controller.state().room;
  // Projects opens a published project slug; ?open=1 applies to the other cabins.
  const path = section === 'projects'
    ? '/projects' + (open ? '/' + data.projects[0].slug : '')
    : '/' + section + (open ? '?open=1' : '');
  history.pushState({ orbital: true }, '', path);
  dispatchEvent(new PopStateEvent('popstate', { state: { orbital: true } }));
}
async function settle(room: string) {
  session.select('A'); clearInput();
  if (controller.state().reading) { reader(false); await pause(0); await steps(150); }
  controller.navigate(room); await pause(0);
  for (let i = 0; i < 900; i++) {
    await step(); const state = controller.state();
    if (state.backgroundReady && state.room === room && !state.travelling && !state.motionActive) {
      await steps(180); controller.freezeBackground(0); return;
    }
  }
  throw new Error(`Did not settle in ${room} within the bounded preparation.`);
}
function shape(snapshot: Snapshot) {
  const settings = snapshot.settings;
  return JSON.stringify({ viewport: settings.viewport, drawingBuffer: settings.drawingBuffer, pixelRatio: settings.pixelRatio,
    aoBuffer: settings.aoBuffer, aoSamples: settings.aoSamples, denoiseSamples: settings.denoiseSamples,
    shadowMap: settings.shadowMap, shadowsEnabled: settings.shadowsEnabled, threeRevision: settings.threeRevision });
}
function sameView(a: any, b: any) {
  return a.room === b.room && a.travelling === b.travelling && a.reading === b.reading &&
    ['cameraPosition', 'cameraQuaternion', 'projectionMatrix', 'vesselMatrix', 'pointer', 'drag'].every((key) =>
      Array.isArray(a[key]) && a[key].length === b[key]?.length && a[key].every((v: number, i: number) => Math.abs(v - b[key][i]) < 1e-6));
}
async function native() {
  const response = await fetch('/context');
  if (!response.ok) throw new Error('Native context endpoint failed');
  const value: any = await response.json(); nativeEverAvailable ||= value.availability === 'available'; return value;
}
function matchingContext(a: any, b: any) {
  if (a.availability !== b.availability) return false;
  if (a.availability !== 'available') return !nativeEverAvailable;
  const power = (v: any) => v.native?.pmset?.battery?.stdout?.split('\n')[0];
  return a.native?.thermalState === 'nominal' && b.native?.thermalState === 'nominal' &&
    a.native?.lowPowerMode === b.native?.lowPowerMode && !!power(a) && power(a) === power(b);
}
async function save(report: any) {
  report.endedAt = new Date().toISOString();
  const response = await fetch('/results', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ runId: report.runId, report }) });
  if (!response.ok) throw new Error(await response.text());
  const saved: any = await response.json();
  (document.getElementById('shading-output') as HTMLTextAreaElement).value = JSON.stringify({ status: report.status, saved,
    asset: report.asset, stats: report.stats, descriptiveRanking: report.descriptiveRanking,
    verifications: report.verifications.map((v: any) => ({ name: v.name, variant: v.variant, changedPixels: v.changedPixels,
      maxChannelDifference: v.maxChannelDifference, restored: v.restored })), blocks: report.blocks, errors: report.errors }, null, 2);
  await status(`${report.status}: ${saved.filename}`);
}
async function sample(variant: Variant, workload: Workload, scope: Scope, frames = 120, room = 'projects') {
  await settle(room); controller.setGpuScope(scope); session.select(variant); session.update();
  // Compile and warm the chosen material/pass setup, then repeat the same input prelude.
  await steps(12);
  if (session.stats().effective !== variant) throw new Error(`Candidate ${variant} is unavailable at this viewport; refusing to label baseline frames as candidate costs.`);
  if (workload === 'hover') for (let i = 0; i < 120; i++) { hover(i); await step(); }
  const stateBefore = controller.state(), before = controller.snapshot();
  const gl = context.renderer.getContext(); const priorGlError = gl.getError();
  controller.reset();
  for (let i = 0; i < frames; i++) { if (workload === 'hover') hover(i); await step(); }
  const snapshot = controller.snapshot(), stateAfter = controller.state();
  if (snapshot.scene?.window.frames !== frames) throw new Error(`Expected ${frames} measured frames, got ${snapshot.scene?.window.frames}.`);
  if (shape(before) !== shape(snapshot)) throw new Error('Rendering settings changed within a sample.');
  return { variant, label: labels[variant], workload, scope, room, requestedFrames: frames,
    stateBefore, stateAfter, snapshot, stats: session.stats(), priorGlError, glError: gl.getError() };
}
async function baseline(report: any) {
  await status(`Surveying ${rooms.length} selected room(s) in forward/reverse order; descriptive pass costs only`);
  for (const order of [rooms, [...rooms].reverse()]) for (const room of order) {
    await status(`Current ${room}: idle and hover, 90 measured frames each`);
    for (const workload of ['idle', 'hover'] as Workload[]) report.rows.push(await sample('A', workload, 'passes', 90, room));
  }
  report.descriptiveRanking = report.rows.map((row: any) => ({ room: row.room, workload: row.workload,
    cpuMs: row.snapshot.scene?.cpuTotal?.mean ?? null, passes: row.snapshot.scene?.passes,
    gpu: row.snapshot.scene?.gpu, counters: row.snapshot.scene?.counters,
    parts: row.snapshot.spacecraft })).sort((a: any, b: any) => (b.cpuMs ?? -1) - (a.cpuMs ?? -1));
  report.status = 'descriptive-baseline-not-a-cross-device-ranking';
}
async function bake() {
  if (asset) return;
  await status('Preparing the developer lighting asset');
  await settle('projects');
  const started = performance.now();
  const response = await fetch('/' + config.id + '-bake', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(session.exportInput()) });
  if (!response.ok) throw new Error(await response.text());
  const result: any = await response.json(); check();
  const bakeResponseAt = performance.now();
  const downloaded = await fetch(result.asset.url, { cache: 'no-store' });
  if (!downloaded.ok) throw new Error(await downloaded.text());
  const compressed = await downloaded.arrayBuffer(), downloadedAt = performance.now();
  const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'));
  const decoded = await new Response(stream).text(), decompressedAt = performance.now();
  const payload = JSON.parse(decoded), parsedAt = performance.now();
  session.install(payload);
  asset = { ...result.asset, loopbackBakeRequestMs: bakeResponseAt - started,
    downloadedBytes: compressed.byteLength, loopbackFetchMs: downloadedAt - bakeResponseAt,
    decompressTextMs: decompressedAt - downloadedAt, parseMs: parsedAt - decompressedAt,
    installSubmissionMs: performance.now() - parsedAt };
  session.select('A');
}
async function verify(report: any) {
  await bake(); report.asset = asset; report.validation=session.validationEvidence?.(); let images = 0;
  const compare = async (name: string, image = false) => {
    for (const variant of ['B', 'C'] as Variant[]) await step(() => {
      session.select('A'); session.update(); const state = controller.state();
      const includeImages = image && images < 12; if (includeImages) images++;
      let candidateStats: any;
      const result = controller.compareGeometry(() => { session.select(variant); session.update(); candidateStats = session.stats(); return () => { session.select('A'); session.update(); }; }, includeImages);
      const restored = controller.verifyFrame(false);
      const glError = context.renderer.getContext().getError();
      report.verifications.push({ name, variant, state, ...result, restored, glError, candidateStats, stats: session.stats() });
      if (glError) throw new Error(`WebGL error ${glError} at ${name}/${variant}`);
      if (restored.changedPixels !== 0 || restored.maxChannelDifference !== 0) throw new Error(`Live A restoration failed at ${name}/${variant}`);
    });
  };
  await settle('projects');
  if (session.subdivisionOnly) await step(() => {
    const result = controller.compareGeometry(() => session.subdivisionOnly!(), false);
    report.verifications.push({ name: 'subdivision-only-control', variant: 'geometry-control', ...result, restored: controller.verifyFrame(false) });
  });
  await compare('projects-idle', true);
  for (const [x, y] of [[.3,.38],[.7,.38],[.3,.62],[.7,.62]]) {
    pointer('pointermove', x, y); await steps(100); await compare(`projects-hover-${x}-${y}`, x === .7 && y === .38);
  }
  clearInput(); await steps(180); pointer('pointerdown', .5, .5, true);
  for (let i = 1; i <= 30; i++) { pointer('pointermove', .5 + .22 * i / 30, .5 - .14 * i / 30, true); await step(); }
  await compare('projects-drag-held', true); pointer('pointerup', .72, .36);
  await steps(15); await compare('projects-drag-spring'); clearInput(); await steps(180); await compare('projects-drag-restored');
  await settle('projects');
  const door = [...document.querySelectorAll<HTMLElement>('.portal-hotspot[data-scene-room="experience"]')]
    .find((el) => !el.closest('[inert],[hidden],[aria-hidden="true"]') && el.checkVisibility({ visibilityProperty: true }));
  if (!door) throw new Error('No visible Projects door for actual focus validation.');
  door.focus({ preventScroll: true }); let half = false, opened = false;
  for (let i = 0; i < 150; i++) {
    await step(); const progress = Math.max(...controller.state().doors.map((d: any) => d.openProgress ?? 0));
    if (!half && progress >= .25 && progress <= .75) { await compare('projects-door-half'); half = true; }
    if (progress > .999) { await compare('projects-door-open', true); opened = true; break; }
  }
  if (!half || !opened) throw new Error('Focused door did not reach both half/open states.');
  clearInput(); await steps(160); await compare('projects-door-closed');
  for (const open of [true, false]) {
    reader(open); await pause(0); await steps(30); await compare(`projects-reader-${open ? 'opening' : 'closing'}`);
    if (controller.state().reading !== open) throw new Error('Requested reader state was not entered.');
    await steps(160); await compare(`projects-reader-${open ? 'open' : 'closed'}`, open);
  }
  await settle('about'); await compare('about-settled'); controller.navigate('projects'); await pause(0);
  const travelStates = new Set<string>();
  for (let i = 0; i < 800; i++) {
    await step(); const state = controller.state();
    const open = state.doors.filter((d: any) => d.openProgress > .01).map((d: any) => d.physicalHatch).join(',');
    if (state.travelling && (i === 20 || i === 80 || i === 160 || (open && !travelStates.has(open)))) {
      await compare(`ladder-travel-${i}`, i === 80); travelStates.add(open);
    }
    if (i > 160 && !state.travelling && state.room === 'projects') break;
    if (i === 799) throw new Error('Ladder route did not finish.');
  }
  for (const room of ['experience', 'contact']) { await settle(room); await compare(`${room}-settled`); }
  if (config.id === 'diffuse') {
    controller.navigate('home'); await pause(0);
    for (let i=0;i<180;i++) { await step(); if ([30,90].includes(i)) await compare(`overview-roll-${i}`); }
  }
  await settle('home'); await compare('home-settled', true);
  report.settingsAfter = controller.snapshot().settings; report.stats = session.stats();
  verified = true; report.status = report.verifications.filter((v: any) => v.candidateStats).every((v: any) => v.candidateStats.effective === 'A')
    ? 'complete-baseline-fallback-at-this-width' : report.verifications.some((v: any) => v.changedPixels > 0)
    ? 'complete-visual-differences-require-review' : 'complete-at-tested-states';
}
function stability(rows: any[]) {
  const cpu = controlStability(rows.map((r) => r.snapshot.scene?.cpuTotal?.mean));
  const names = [...new Set<string>(rows.flatMap((r) => Object.keys(r.snapshot.scene?.gpu?.phases ?? {})))];
  const phases = Object.fromEntries(names.map((name) => {
    const values = rows.map((r) => r.snapshot.scene?.gpu?.phases?.[name]?.mean ?? null);
    const availability = values.every((v) => v === null) ? 'unavailable' : values.some((v) => v === null) ? 'partial' : 'available';
    return [name, { availability, check: availability === 'available' ? controlStability(values) : null }];
  }));
  const measured = Object.values(phases).filter((phase) => phase.availability !== 'unavailable');
  const gpuAvailability = measured.some((phase) => phase.availability === 'partial') ? 'partial' : measured.length ? 'available' : 'unavailable';
  return { cpu, gpu: phases.frame?.check ?? null, phases, gpuAvailability,
    allMeasuredGpuStable: measured.every((phase) => phase.availability === 'available' && phase.check?.stable) };
}
async function timing(report: any, unranked: boolean) {
  if (!verified || !asset) throw new Error('Bake and inspect before comparing costs.');
  report.asset = asset;
  if (config.compactFallback && innerWidth < 700) { report.status = 'inapplicable-candidates-fall-back-to-baseline'; return; }
  if (unranked) {
    for (const scope of ['frame', 'passes'] as Scope[]) for (const workload of ['idle', 'hover'] as Workload[])
      for (const variant of ['A','B','C','C','B','A'] as Variant[]) {
        await status(`Unranked ${scope} / ${workload} / ${variant}`);
        report.rows.push(await sample(variant, workload, scope));
      }
    report.status = 'descriptive-only-no-timing-ranking'; return;
  }
  await settle('projects'); await status('Resting for 60 seconds; then three baseline controls ten seconds apart');
  await rest(60);
  const readyBefore = await native(); report.contexts.push(readyBefore);
  for (let i = 0; i < 3; i++) {
    report.controls.push(await sample('A', 'idle', 'frame')); if (i < 2) await rest(10);
  }
  const readyAfter = await native(); report.contexts.push(readyAfter); report.readiness = stability(report.controls);
  if (!matchingContext(report.contexts[0], readyBefore) || !matchingContext(readyBefore, readyAfter)) { report.status = 'inconclusive-readiness-context'; return; }
  report.readiness.matchingState = report.controls.every((row: any) => sameView(report.controls[0].stateBefore, row.stateBefore) && shape(report.controls[0].snapshot) === shape(row.snapshot));
  if (!report.readiness.matchingState || report.controls.some((row: any) => row.priorGlError !== 0 || row.glError !== 0)) { report.status = 'inconclusive-readiness-state-or-webgl'; return; }
  if (!report.readiness.cpu.stable || report.readiness.gpuAvailability === 'partial' || !report.readiness.allMeasuredGpuStable) { report.status = 'inconclusive-readiness-drift'; return; }
  for (const candidate of ['B', 'C'] as Variant[]) for (const workload of ['idle', 'hover'] as Workload[]) for (const scope of ['frame', 'passes'] as Scope[]) {
    for (const order of [['A',candidate,candidate,'A'], [candidate,'A','A',candidate]] as Variant[][]) {
      await status(`Rested A/${candidate}: ${workload}, ${scope}, ${order.join('')}`);
      const block: any = { candidate, workload, scope, order, samples: [], before: await native() }; report.blocks.push(block);
      for (const variant of order) block.samples.push(await sample(variant, workload, scope));
      block.after = await native(); block.stability = stability(block.samples.filter((s: any) => s.variant === 'A'));
      const first = block.samples[0];
      block.matchingState = block.samples.every((row: any) => sameView(first.stateBefore, row.stateBefore) && sameView(first.stateAfter, row.stateAfter) && shape(first.snapshot) === shape(row.snapshot));
      block.contextAccepted = matchingContext(readyAfter, block.before) && matchingContext(block.before, block.after);
      block.cpuAccepted = block.contextAccepted && block.matchingState && block.stability.cpu.stable && block.samples.every((s: any) => s.priorGlError === 0 && s.glError === 0);
      block.gpuAccepted = block.cpuAccepted && block.stability.gpuAvailability === 'available' && block.stability.allMeasuredGpuStable && block.samples.every((row: any) => row.snapshot.scene?.gpu?.status === 'available');
      block.accepted = block.cpuAccepted && (block.stability.gpuAvailability === 'unavailable' || block.gpuAccepted);
      if (!block.accepted) { report.status = 'inconclusive-block-drift-or-state'; return; }
      await rest(20);
    }
  }
  report.summary = ['B','C'].flatMap((candidate) => ['idle','hover'].map((workload) => {
    const blocks = report.blocks.filter((b: any) => b.candidate === candidate && b.workload === workload && b.scope === 'frame');
    return { candidate, workload, samples: Object.fromEntries(['A',candidate].map((variant) => {
      const rows = blocks.flatMap((b: any) => b.samples.filter((r: any) => r.variant === variant));
      return [variant, { cpuMs: median(rows.map((r: any) => r.snapshot.scene?.cpuTotal?.mean)),
        gpuMs: median(rows.map((r: any) => r.snapshot.scene?.gpu?.phases?.frame?.mean).filter((v: any) => Number.isFinite(v))) }];
    })) };
  }));
  report.status = 'complete-controlled-samples-not-production-approval';
}
async function start(mode: Mode) {
  if (busy) return; busy = true; stopped = false; interruption = null; fixedViewport = viewport();
  for (const name of ['baseline','verify','timing','survey']) button(name).disabled = true;
  (panel.querySelector('.camera-lab-panel') as HTMLElement).dataset.running = 'true';
  const report: any = { schemaVersion: 1, runId: `${config.id}-${mode}-${innerWidth}x${innerHeight}-${Date.now()}`, mode, status: 'running',
    startedAt: new Date().toISOString(), settings: controller.snapshot().settings,
    conditions: (document.getElementById('shading-conditions') as HTMLInputElement).value,
    variants: labels, rows: [], controls: [], blocks: [], verifications: [], contexts: [], errors: [],
    limitations: ['Developer public-seed fixture in the browser identified by settings.userAgent; not native Safari unless actually run there.',
      'Fixed 1/60 simulation steps and frozen 8K background; RAF pacing remains host dependent.',
      ...config.limitations,
      'Frame and pass GPU queries use separate captures, never nested; missing/disjoint values remain unavailable.',
      'CPU and GPU overlap and must not be added. No measured process memory, battery, heat, device temperature or universal speed claims.',
      'Nominal OS pressure and fixed rests do not establish equal clocks or absence of throttling; source/power changes reject timing.',
      'No hidden quality changes: drawing buffer, view state and settings are checked. Effective variants and any fallback are recorded.',
      'Synthetic pointer/focus and actual runtime routes exercise controlled transitions, not trusted native input or a full accessibility audit.'] };
  try {
    report.contexts.push(await native());
    if (mode === 'baseline') await baseline(report); else if (mode === 'verify') await verify(report); else await timing(report, mode === 'survey');
  } catch (error) { report.status = stopped ? 'stopped' : 'failed'; report.errors.push(String(error)); }
  finally {
    session.select('A'); session.update(); clearInput();
    try { report.contexts.push(await native()); report.finalStats = session.stats(); await save(report); }
    catch (error) { document.getElementById('shading-status')!.textContent = `Result save failed: ${String(error)}`; }
    busy = false; fixedViewport = ''; (panel.querySelector('.camera-lab-panel') as HTMLElement).dataset.running = 'false'; button('baseline').disabled = button('verify').disabled = false;
    button('timing').disabled = button('survey').disabled = !verified;
  }
}
for (const mode of ['baseline','verify','timing','survey'] as Mode[]) button(mode).onclick = () => void start(mode);
button('stop').onclick = () => { stopped = true; };

}
