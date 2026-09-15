/** Developer-only replay of the delivered renderer, model, navigation and UI.
 * Fixed simulation steps preserve equal work; RAF timestamps still expose host
 * pacing. This is neither native-input automation nor a deployed-page benchmark.
 */
import { createRoot } from 'react-dom/client';
import { ImmersivePortfolio } from '../../features/portfolio/immersive-portfolio';
import type { SceneAudit, SceneAuditController } from '../../features/diagnostics/scene-audit';
import { seeds } from '../../lib/content/seed';
import { toPortfolio, type Content, type Kind } from '../../lib/content/types';
import './camera-invalidation-lab.css';
import { createGeometryCompactionSession } from './geometry-compaction-session';

const geometryExperiment = document.body.dataset.experiment === 'geometry';
const geometrySession = createGeometryCompactionSession();

type Policy = 'legacy' | 'geometry';
type Mode = 'survey' | 'paired' | 'verify';
type NativeContext = {
  availability: string;
  capturedAt?: string;
  native?: { thermalState?: string; lowPowerMode?: boolean; [key: string]: unknown };
  [key: string]: unknown;
};
type Scenario = {
  name: string;
  room: string;
  frames: number;
  prepare?: () => Promise<void>;
  action?: (index: number) => void;
  completeTravel?: boolean;
};
type Row = {
  scenario: string;
  policy: Policy;
  startedAt: string;
  stateBefore: any;
  stateAfter: any;
  checkpoints: { frame: number; state: any }[];
  report: ReturnType<SceneAuditController['snapshot']>;
  requestedFrames: number;
  measuredFrames: number;
};
type Report = {
  schemaVersion: number;
  runId: string;
  mode: Mode;
  status: string;
  startedAt: string;
  endedAt?: string;
  settings: Record<string, unknown>;
  notes: string;
  contexts: NativeContext[];
  rows: Row[];
  blocks: any[];
  controls: any[];
  verifications: any[];
  errors: string[];
  limitations: string[];
};

const root = document.getElementById('portfolio-root')!;
const panel = document.getElementById('camera-lab-controls')!;
panel.innerHTML = `<section class="camera-lab-panel" data-running="false">
  <h2>Delivered camera · invalidation lab</h2>
  <p id="camera-lab-status" role="status">Preparing the production runtime…</p>
  <div class="camera-lab-actions">
    <button data-action="setup" disabled>Check setup</button>
    <button data-action="survey" disabled>Start survey</button>
    <button data-action="paired" disabled>Start paired runs</button>
    <button data-action="verify" disabled>Verify motion</button>
    <button data-action="stop" disabled>Stop</button>
    <button data-action="show">Hide controls</button>
  </div>
  <div class="camera-lab-setup">
    <label>Survey policy <select id="camera-lab-policy"><option value="legacy">Delivered baseline</option><option value="geometry">Geometry invalidation</option></select></label>
    <label>Frames per sample <select id="camera-lab-frames"><option>180</option><option>120</option></select></label>
    <label>Paired workload <select id="camera-lab-workload"><option value="both">Both workloads</option><option value="contact-object-focus">Contact feedback</option><option value="overview-room-focus">Overview camera control</option></select></label>
    <label>Paired blocks <select id="camera-lab-blocks"><option>4</option><option>2</option></select></label>
    <label>Verify scope <select id="camera-lab-verify-scope"><option value="full">Full coverage</option><option value="overview-transitions">Overview transitions only</option></select></label>
    <p>Paired runs alternate ABBA / BAAB for the selected number of blocks, with 20-second pauses, repeated controls and bounded recovery. No scene frames render during pauses.</p>
    <label>Conditions <input id="camera-lab-notes" placeholder="Power source, other workload, placement"></label>
    <p>Full portfolio fixture; actual application CSS and 8K night Earth. Fixed 1/60-second simulation steps on browser RAF. Only selected checkpoints read pixels, outside timed samples.</p>
  </div>
  <details><summary>Result and limitations</summary><textarea id="camera-lab-result" readonly aria-label="Last lab summary"></textarea></details>
</section>`;
const shell = panel.querySelector<HTMLElement>('.camera-lab-panel')!;
if (geometryExperiment) {
  shell.querySelector('h2')!.textContent = 'Lossless geometry · comparison lab';
  shell.querySelector('#camera-lab-policy')!.innerHTML = '<option value="legacy">Original cylinders</option><option value="geometry">Direct indexed cylinders</option>';
  shell.querySelector('#camera-lab-workload')!.innerHTML = '<option value="both">Idle + camera motion</option><option value="idle-home">Idle overview</option><option value="pointer-hover-sweep">Projects camera motion</option>';
}
const statusElement = document.getElementById('camera-lab-status')!;
const output = document.getElementById('camera-lab-result') as HTMLTextAreaElement;
const button = (action: string) => panel.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)!;
const now = () => new Date().toISOString();
let controller: SceneAuditController;
let aborter: AbortController | null = null;
let running: Report | null = null;
let currentSignal: AbortSignal | null = null;
let viewport: string;
let contextLost = false;
let nativeAvailable = false;
let partialRow: Row | null = null;
let expectedFocus: { room: string; object: string; portal: string } | null = null;
let lastCompletedBlock: Record<string, unknown> | null = null;
const data = toPortfolio(seeds.map((item) => ({
  id: item.id,
  kind: item.kind as Kind,
  draft: item.data,
  published: item.data,
  revision: 1,
  updatedAt: '2026-09-15T00:00:00.000Z',
})) as Content[]);
const initialSection = ({ '/about': 'about', '/projects': 'projects', '/case-studies': 'experience', '/experience': 'experience', '/contact': 'contact' } as Record<string, string>)[location.pathname] ?? 'home';
const audit: SceneAudit = {
  manual: true,
  geometryCompaction: geometryExperiment ? false : undefined,
  modelReady: geometryExperiment ? (...args) => geometrySession.modelReady(...args) : undefined,
  ready(value) {
    controller = value;
    controller.freezeBackground(0);
    viewport = viewportKey();
    document.querySelector('#ship canvas')?.addEventListener('webglcontextlost', () => {
      contextLost = true;
      aborter?.abort('WebGL context lost');
    });
    for (const action of ['setup', 'survey', 'paired', 'verify']) button(action).disabled = false;
    document.body.dataset.cameraLabReady = 'true';
    status('Ready. The scene advances only during a requested replay.');
  },
};
createRoot(root).render(<ImmersivePortfolio data={data} initialSection={initialSection} preview={false} sceneAudit={audit}><p>Public seed fixture.</p></ImmersivePortfolio>);

function viewportKey() { return `${innerWidth}x${innerHeight}@${devicePixelRatio}`; }
function status(message: string) {
  statusElement.textContent = message;
  document.body.dataset.cameraLabStatus = message;
}
function check() {
  if (currentSignal?.aborted) throw new Error(String(currentSignal.reason || 'Stopped'));
  if (contextLost) throw new Error('WebGL context lost');
  if (document.hidden) throw new Error('Page hidden during replay');
  if (running && viewportKey() !== viewport) throw new Error('Viewport or device pixel ratio changed during run');
}
function pause(ms: number) {
  return new Promise<void>((resolve, reject) => {
    check();
    const timer = setTimeout(done, ms);
    const signal = currentSignal;
    function done() { signal?.removeEventListener('abort', aborted); resolve(); }
    function aborted() { clearTimeout(timer); signal?.removeEventListener('abort', aborted); reject(new Error(String(signal?.reason || 'Stopped'))); }
    signal?.addEventListener('abort', aborted, { once: true });
  });
}
function nextFrame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}
function step(after?: () => void) {
  return new Promise<void>((resolve, reject) => requestAnimationFrame(() => {
    try {
      check();
      controller.step(1 / 60);
      // Read the default framebuffer before returning this RAF callback; the
      // delivered renderer deliberately does not preserve its drawing buffer.
      after?.();
      resolve();
    } catch (error) { reject(error); }
  }));
}
async function steps(count: number) { for (let i = 0; i < count; i++) await step(); }
async function progress(phase: string, extra: Record<string, unknown> = {}) {
  status(phase);
  await fetch('/progress', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phase, runId: running?.runId, at: now(), lastCompletedBlock, ...extra }) });
}
async function context(label: string) {
  const response = await fetch('/context', { cache: 'no-store' });
  const value: NativeContext = { ...(await response.json()), label };
  nativeAvailable ||= value.availability === 'available';
  running?.contexts.push(value);
  return value;
}
function nominal(value: NativeContext) {
  return value.availability === 'available' ? value.native?.thermalState === 'nominal' : !nativeAvailable;
}
function samePower(a: NativeContext, b: NativeContext) {
  if (a.availability !== b.availability) return false;
  if (a.native?.lowPowerMode !== b.native?.lowPowerMode) return false;
  // Preserve all raw pmset output for manual AC/battery/charging cohort review.
  // Sampler schemas can differ; absence remains unknown rather than inferred.
  const source = (value: NativeContext) => JSON.stringify(value.native ?? {}).match(/Now drawing from ([^\\]+)/)?.[1];
  const sourceA = source(a), sourceB = source(b);
  return sourceA === sourceB;
}
function sceneHost() {
  const el = document.getElementById('ship');
  if (!el) throw new Error('The delivered spacecraft host is unavailable.');
  return el;
}
function clearInput() {
  expectedFocus = null;
  (document.activeElement as HTMLElement | null)?.blur?.();
  sceneHost().dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerId: 910, isPrimary: true, pointerType: 'mouse' }));
  sceneHost().dispatchEvent(new PointerEvent('pointerleave', { isPrimary: true, pointerType: 'mouse' }));
  // Real keyboard events target an Element. Dispatching on Document would
  // violate the mounted handler's target.closest() contract.
  document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
}
function focus(selector: string) {
  clearInput();
  const target = [...document.querySelectorAll<HTMLElement>(selector)].find((element) => !element.closest('[inert], [hidden], [aria-hidden="true"]') && element.checkVisibility({ visibilityProperty: true }));
  if (!target) throw new Error(`No visible delivered control: ${selector}`);
  target.focus({ preventScroll: true });
  if (document.activeElement !== target) throw new Error(`Delivered control cannot receive focus: ${selector}`);
  expectedFocus = { room: target.dataset.sceneRoom || '', object: target.dataset.sceneObject || '', portal: target.dataset.scenePortal || '' };
}
function reader(open: boolean) {
  clearInput();
  const pathname = location.pathname;
  history.pushState({ orbital: true }, '', pathname + (open ? '?open=1' : ''));
  window.dispatchEvent(new PopStateEvent('popstate', { state: { orbital: true } }));
}
async function prepare(room: string) {
  clearInput();
  if (new URLSearchParams(location.search).has('open')) { reader(false); await steps(120); }
  controller.navigate(room);
  // Yield for the actual React destination callback before stepping its runtime.
  await nextFrame();
  for (let i = 0; i < 900; i++) {
    await step();
    const state = controller.state();
    if (state.backgroundReady && !state.travelling && (state.room === room || state.active === room)) {
      await steps(180);
      controller.freezeBackground(0);
      return;
    }
  }
  throw new Error(`The delivered runtime did not settle in ${room} within 900 preparation steps.`);
}
const controlValue = (id: string) => (document.getElementById(id) as unknown as { value: string }).value;
const frameCount = () => Number(controlValue('camera-lab-frames'));
function pointer(type: string, x: number, y: number) {
  const canvas = sceneHost().querySelector('canvas')!;
  const box = canvas.getBoundingClientRect();
  canvas.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerType: 'mouse', isPrimary: true, pointerId: 910, button: 0, buttons: type === 'pointerup' ? 0 : 1, clientX: box.left + box.width * x, clientY: box.top + box.height * y }));
}
function scenarios(): Scenario[] {
  const frames = frameCount();
  return [
    ...['home', 'projects', 'experience', 'about', 'contact'].map((room) => ({ name: `idle-${room}`, room, frames })),
    { name: 'overview-entry', room: 'home', frames, action: (i) => { if (i === 0) controller.navigate('projects'); }, completeTravel: true },
    { name: 'return-overview', room: 'projects', frames, action: (i) => { if (i === 0) controller.navigate('home'); }, completeTravel: true },
    { name: 'contact-object-focus', room: 'contact', frames, action: (i) => { if (i === 0 || i === 120) focus('.world-social-screen[data-scene-object]'); if (i === 60) clearInput(); } },
    { name: 'overview-room-focus', room: 'home', frames, action: (i) => { if (i === 0) focus('.overview-callout[data-scene-room="projects"]'); if (i === 90) clearInput(); } },
    { name: 'pointer-hover-sweep', room: 'projects', frames, action: (i) => {
      if (i < 120) pointer('pointermove', .5 + .2 * Math.sin(i / 119 * Math.PI * 2), .5 - .12 * Math.sin(i / 119 * Math.PI));
      if (i === 120) clearInput();
    } },
    { name: 'door-focus-open-close', room: 'projects', frames, action: (i) => { if (i === 0) focus('.portal-hotspot[data-scene-room="experience"]'); if (i === 90) clearInput(); } },
    { name: 'ordinary-travel', room: 'projects', frames, action: (i) => { if (i === 0) controller.navigate('experience'); }, completeTravel: true },
    { name: 'ladder-travel', room: 'about', frames, action: (i) => { if (i === 0) controller.navigate('projects'); }, completeTravel: true },
    { name: 'drag-release', room: 'projects', frames, action: (i) => { if (i === 0) pointer('pointerdown', .5, .5); if (i > 0 && i <= 30) pointer('pointermove', .5 + .22 * i / 30, .5 - .14 * i / 30); if (i === 31) pointer('pointerup', .72, .36); } },
    { name: 'reader-open-close', room: 'about', frames: Math.max(240, frames), action: (i) => { if (i === 0) reader(true); if (i === 120) reader(false); } },
    { name: 'arrival-color-tail', room: 'home', frames, prepare: async () => {
      controller.navigate('contact');
      await nextFrame();
      for (let i = 0; i < 600; i++) { await step(); if (!controller.state().travelling && (controller.state().room === 'contact' || controller.state().active === 'contact')) return; }
      throw new Error('Contact arrival did not complete.');
    } },
  ];
}
function stateCheckpoint() { return controller.state(); }
async function runScenario(scenario: Scenario, policy: Policy, verify = false): Promise<Row> {
  await prepare(scenario.room);
  if (geometryExperiment) geometrySession.set(policy === 'geometry');
  controller.setPolicy(geometryExperiment ? 'geometry' : policy);
  await steps(30);
  await scenario.prepare?.();
  controller.reset();
  const row: Row = { scenario: scenario.name, policy, startedAt: now(), stateBefore: stateCheckpoint(), stateAfter: null, checkpoints: [], report: null as any, requestedFrames: scenario.frames, measuredFrames: 0 };
  partialRow = row;
  let limit = scenario.frames;
  for (let index = 0; index < limit; index++) {
    scenario.action?.(index);
    await step(() => {
      row.measuredFrames++;
      if (index === 0 || index % 30 === 29 || index === limit - 1 || (verify && [7, 14, 21].includes(index))) {
        const state = stateCheckpoint();
        if (expectedFocus) {
          for (const key of ['room', 'object', 'portal'] as const) {
            if (expectedFocus[key] && state.feedback?.[key] !== expectedFocus[key])
              throw new Error(`${scenario.name}: requested ${key} focus ${expectedFocus[key]}, but delivered feedback is ${String(state.feedback?.[key])}. The sample is invalid.`);
          }
        }
        row.checkpoints.push({ frame: index, state });
        if (verify) {
          // Full-resolution paired PNGs are intentionally bounded; all other
          // checkpoints retain exact changed-pixel/channel counts and state.
          const includeImages = scenario.name === 'door-focus-open-close'
            ? index === 14
            : index === 29 && ['idle-home', 'contact-object-focus', 'ladder-travel', 'overview-entry', 'return-overview'].includes(scenario.name);
          const comparison = geometryExperiment
            ? controller.compareGeometry(() => geometrySession.swap(), includeImages)
            : controller.verifyFrame(includeImages);
          running!.verifications.push({ scenario: scenario.name, policy, frame: index, state, ...comparison });
        }
      }
    });
    if (scenario.completeTravel && index === limit - 1 && controller.state().travelling) {
      if (limit >= 600) throw new Error(`${scenario.name} exceeded 600 route steps.`);
      limit += 60;
    }
  }
  // Submit no extra simulation frames. GPU queries are polled on beginFrame,
  // not snapshot: final unresolved samples remain explicitly pending here.
  row.stateAfter = stateCheckpoint();
  row.report = controller.snapshot();
  partialRow = null;
  return row;
}
function average(row: Row) { return row.report.scene.cpuTotal?.mean ?? NaN; }
function spread(values: number[]) {
  if (!values.length || values.some((value) => !Number.isFinite(value) || value <= 0)) return Infinity;
  const ordered = [...values].sort((a, b) => a - b);
  return (Math.max(...values) - Math.min(...values)) / ordered[Math.floor(ordered.length / 2)];
}
function drift(values: number[]) {
  if (values.length < 3) return 0;
  const direction = values.at(-1)! - values[0];
  const monotonic = values.slice(1).every((value, index) => direction >= 0 ? value >= values[index] : value <= values[index]);
  return monotonic ? Math.abs(direction) / values[0] : 0;
}
async function recoveryControls(attempt: number) {
  await progress(`Recovery ${attempt + 1}: 60 seconds without scene rendering`);
  await pause(60000);
  const before = await context(`readiness-${attempt}-before`);
  const rows: Row[] = [];
  if (nominal(before)) {
    for (let index = 0; index < 3; index++) {
      await progress(`Readiness reference ${index + 1}/3`);
      rows.push(await runScenario({ name: 'readiness-overview', room: 'home', frames: 120 }, 'legacy'));
      if (index < 2) await pause(10000);
    }
  }
  const after = await context(`readiness-${attempt}-after`);
  const values = rows.map(average);
  const record = { attempt, before, after, rows, controlSpread: spread(values), directionalDrift: drift(values), accepted: nominal(before) && nominal(after) && samePower(before, after) && rows.length === 3 && spread(values) <= .05 && drift(values) <= .025 };
  running!.controls.push(record);
  return record.accepted;
}
async function survey(policy: Policy, verify: boolean) {
  const verifyScope = controlValue('camera-lab-verify-scope');
  const selected = scenarios().filter((scenario) => !verify || verifyScope === 'full' || ['overview-entry', 'return-overview'].includes(scenario.name));
  for (const scenario of selected) {
    await progress(`${verify ? 'Checking images' : 'Survey'}: ${scenario.name} · ${policy}`);
    running!.rows.push(await runScenario(scenario, policy, verify));
    await context(`${scenario.name}-after`);
  }
}
async function paired() {
  let ready = await recoveryControls(0);
  if (!ready) ready = await recoveryControls(1);
  if (!ready) { running!.status = 'inconclusive-readiness'; return; }
  const blockCount = Number(controlValue('camera-lab-blocks'));
  const workload = controlValue('camera-lab-workload');
  const orders: Policy[][] = ([
    ['legacy', 'geometry', 'geometry', 'legacy'],
    ['geometry', 'legacy', 'legacy', 'geometry'],
    ['legacy', 'geometry', 'geometry', 'legacy'],
    ['geometry', 'legacy', 'legacy', 'geometry'],
  ] as Policy[][]).slice(0, blockCount);
  const selected = scenarios().filter((scenario) => (geometryExperiment ? ['idle-home', 'pointer-hover-sweep'] : ['contact-object-focus', 'overview-room-focus']).includes(scenario.name) && (workload === 'both' || workload === scenario.name));
  for (const scenario of selected) {
    for (const [blockIndex, order] of orders.entries()) {
      const before = await context(`${scenario.name}-block-${blockIndex}-before`);
      const block: any = { scenario: scenario.name, index: blockIndex, order, before, after: null, rows: [], accepted: false, reasons: [] };
      running!.blocks.push(block);
      if (!nominal(before)) {
        block.reasons.push('Nonnominal or newly unavailable native thermal context.');
        running!.status = 'inconclusive-thermal-context';
        return;
      }
      for (const policy of order) {
        await progress(`${scenario.name} · block ${blockIndex + 1}/${orders.length} · ${policy}`);
        block.rows.push(await runScenario(scenario, policy));
        await pause(1000);
      }
      block.after = await context(`${scenario.name}-block-${blockIndex}-after`);
      const reference = block.rows.filter((row: Row) => row.policy === 'legacy').map(average);
      block.referenceSpread = spread(reference);
      if (!nominal(block.after)) block.reasons.push('Nonnominal or unavailable ending thermal context.');
      if (!samePower(before, block.after)) block.reasons.push('Power source, Low Power Mode or telemetry availability changed.');
      if (block.referenceSpread > .05) block.reasons.push('Repeated baseline CPU spread exceeds 5%.');
      if (block.rows.some((row: Row) => row.report.scene.gpu?.discardedSamples > 0 || row.report.scene.gpu?.status === 'disjoint')) block.reasons.push('GPU query disjoint/discard observed; GPU comparisons invalid.');
      block.accepted = block.reasons.length === 0;
      if (!block.accepted) running!.status = 'complete-with-inconclusive-blocks';
      lastCompletedBlock = {
        scenario: scenario.name,
        index: blockIndex,
        requestedBlocks: orders.length,
        order,
        accepted: block.accepted,
        reasons: block.reasons,
        referenceSpread: block.referenceSpread,
        rows: block.rows.map((row: Row) => ({
          policy: row.policy,
          frames: row.measuredFrames,
          cpu: row.report.scene.cpuTotal,
          gpu: { scope: row.report.scene.gpu?.scope, status: row.report.scene.gpu?.status, phases: row.report.scene.gpu?.phases },
          counters: row.report.scene.counters,
        })),
      };
      await progress(`${scenario.name} · block ${blockIndex + 1}/${orders.length} ${block.accepted ? 'accepted' : 'excluded'}`);
      await progress(`Recovery between blocks: 20 seconds without scene rendering`);
      await pause(20000);
      if (!block.accepted && !(await recoveryControls(blockIndex + 2))) {
        running!.status = 'inconclusive-recovery'; return;
      }
    }
  }
}
function summary(report: Report) {
  const summarizeRow = (row: Row) => ({ scenario: row.scenario, policy: row.policy, frames: row.measuredFrames, cpu: row.report.scene.cpuTotal, gpu: row.report.scene.gpu, counters: row.report.scene.counters, frameInterval: row.report.scene.frameInterval });
  return {
    runId: report.runId,
    mode: report.mode,
    status: report.status,
    rows: report.rows.map(summarizeRow),
    blocks: report.blocks.map((block) => ({ scenario: block.scenario, index: block.index, accepted: block.accepted, reasons: block.reasons, referenceSpread: block.referenceSpread, rows: block.rows.map(summarizeRow) })),
    verificationFrames: report.verifications.length,
    changedVerificationFrames: report.verifications.filter((row) => row.changedPixels > 0).length,
    maximumChannelDifference: Math.max(0, ...report.verifications.map((row) => row.maxChannelDifference)),
    errors: report.errors,
  };
}
async function save(report: Report) {
  const response = await fetch('/results', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ runId: report.runId, report }) });
  const saved = await response.json() as { filename?: string; [key: string]: unknown };
  if (!response.ok) throw new Error(JSON.stringify(saved));
  return saved;
}
async function start(mode: Mode) {
  if (aborter || !controller) return;
  viewport = viewportKey();
  lastCompletedBlock = null;
  aborter = new AbortController();
  currentSignal = aborter.signal;
  const policy = controlValue('camera-lab-policy') as Policy;
  const report: Report = {
    schemaVersion: 1,
    runId: `${mode}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
    mode,
    status: 'running',
    startedAt: now(),
    settings: { experiment: geometryExperiment ? 'geometry' : 'camera', actualAoPolicy: geometryExperiment ? 'geometry' : policy, variantLabels: geometryExperiment ? { legacy: 'baseline cylinders', geometry: 'direct indexed cylinders' } : undefined, viewport: [innerWidth, innerHeight], devicePixelRatio, userAgent: navigator.userAgent, hardwareConcurrency: navigator.hardwareConcurrency, simulationStep: 1 / 60, backgroundTime: 0, policy, gpuScope: mode === 'paired' ? 'frame' : 'passes', framesPerSample: frameCount(), pairedWorkload: controlValue('camera-lab-workload'), requestedPairedBlocks: Number(controlValue('camera-lab-blocks')), verifyScope: controlValue('camera-lab-verify-scope'), controlSpreadLimit: .05, directionalDriftLimit: .025, initialRecoveryMs: 60000, blockRecoveryMs: 20000, fixture: 'published seed content', initialSection },
    notes: (document.getElementById('camera-lab-notes') as HTMLInputElement).value || 'No additional operator context supplied; inspect native observations and treat other workload as unknown.',
    contexts: [], rows: [], blocks: [], controls: [], verifications: [], errors: [],
    limitations: [
      'Same delivered scene/UI modules with published fixture content, compiled as production React; this is not a deployed Vinext browser session.',
      'Fixed 1/60 simulation delta on RAF preserves the requested input workload. Frame intervals measure host rendering cadence, not elapsed-time driven interaction duration.',
      'Synthetic focus/pointer events exercise actual mounted handlers; they do not verify native touch capture, Safari gestures or operating-system input delivery.',
      geometryExperiment ? 'Verification swaps original/indexed geometry at the same frozen state in one scene/GTAO instance, refreshing AO and shadows for both. Pixel reads occur outside timing.' : 'Verification compares cached versus freshly recomputed AO in one instance; pixel reads occur outside timing.',
      'Verify-motion runs perform synchronous readbacks between steps; their timing fields are audit context only and must not be used for performance rankings.',
      'CPU, GPU and frame pacing are distinct; do not add CPU and GPU time. Missing or disjoint GPU timing is unavailable, not zero.',
      'Survey pass queries locate likely work; paired trials use one whole-frame GPU scope so query boundaries do not assign tiled framebuffer resolve work to the last sampled pass.',
      'Unknown telemetry remains unknown. Nominal thermal pressure and stable baseline controls do not prove fixed clocks, cold hardware or absence of throttling.',
      'Native snapshots occur at boundaries, so transient power/thermal changes can be missed. Preserve raw contexts and inspect AC/battery/charging cohorts manually.',
      'No heat, battery, energy or universal browser performance claim can be derived from these samples.',
    ],
  };
  running = report;
  shell.dataset.running = 'true';
  for (const action of ['setup', 'survey', 'paired', 'verify']) button(action).disabled = true;
  button('stop').disabled = false;
  output.value = '';
  try {
    if (geometryExperiment) {
      geometrySession.initialize();
      report.settings.geometry = geometrySession.snapshot();
      controller.setPolicy('geometry');
    }
    clearInput();
    controller.setGpuScope(mode === 'paired' ? 'frame' : 'passes');
    controller.reset();
    await context('session-before');
    if (mode === 'paired') await paired();
    else await survey(policy, mode === 'verify');
    if (report.status === 'running') report.status = 'complete';
  } catch (error) {
    report.status = currentSignal.aborted ? 'interrupted' : 'failed';
    report.errors.push(String(error));
  } finally {
    report.endedAt = now();
    currentSignal = null;
    if (partialRow) {
      partialRow.stateAfter = stateCheckpoint();
      partialRow.report = controller.snapshot();
      report.rows.push(partialRow);
      partialRow = null;
    }
    try { await context('session-after'); } catch (error) { report.errors.push(`Ending context: ${String(error)}`); }
    try {
      const saved = await save(report);
      output.value = JSON.stringify({ ...summary(report), saved }, null, 2);
      status(`${report.status} · ${saved.filename}`);
    } catch (error) {
      report.errors.push(`Save failed: ${String(error)}`);
      output.value = JSON.stringify(summary(report), null, 2);
      status(`Result retained in this page, but save failed: ${String(error)}`);
    }
    document.body.dataset.cameraLabResult = report.runId;
    document.body.dataset.cameraLabComplete = report.status;
    running = null;
    aborter = null;
    shell.dataset.running = 'false';
    for (const action of ['setup', 'survey', 'paired', 'verify']) button(action).disabled = false;
    button('stop').disabled = true;
  }
}
for (const mode of ['survey', 'paired', 'verify'] as const) button(mode).onclick = () => void start(mode);
button('setup').onclick = async () => {
  if (aborter || !controller) return;
  aborter = new AbortController();
  currentSignal = aborter.signal;
  shell.dataset.running = 'true';
  for (const action of ['setup', 'survey', 'paired', 'verify']) button(action).disabled = true;
  button('stop').disabled = false;
  status('Untimed setup check: preparing the actual overview');
  try {
    await prepare('home');
    let verification: unknown;
    await step(() => { verification = controller.verifyFrame(false); });
    const result = { scope: 'Untimed mounting/readiness check; no performance conclusion.', state: controller.state(), settings: controller.snapshot().settings, verification };
    output.value = JSON.stringify(result, null, 2);
    document.body.dataset.cameraLabSetup = 'passed';
    await fetch('/progress', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phase: 'setup-passed', result }) });
    status('Setup passed. Full renderer and 8K Earth are ready; replay controls are available.');
  } catch (error) {
    output.value = String(error);
    document.body.dataset.cameraLabSetup = 'failed';
    status(`Setup failed: ${String(error)}`);
  } finally {
    aborter = null;
    currentSignal = null;
    shell.dataset.running = 'false';
    for (const action of ['setup', 'survey', 'paired', 'verify']) button(action).disabled = false;
    button('stop').disabled = true;
  }
};
button('stop').onclick = () => aborter?.abort('Stopped by operator; partial data retained.');
button('show').onclick = () => {
  shell.dataset.hidden = shell.dataset.hidden === 'true' ? 'false' : 'true';
  button('show').textContent = shell.dataset.hidden === 'true' ? 'Show controls' : 'Hide controls';
};
addEventListener('resize', () => { if (running && viewportKey() !== viewport) aborter?.abort('Viewport changed during run'); });
document.addEventListener('visibilitychange', () => { if (document.hidden && running) aborter?.abort('Page hidden during run'); });
addEventListener('pagehide', () => aborter?.abort('Page closed during run'));
