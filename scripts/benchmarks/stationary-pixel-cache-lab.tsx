import { createRoot } from 'react-dom/client';
import { ImmersivePortfolio } from '../../features/portfolio/immersive-portfolio';
import type {
  SceneAudit,
  SceneAuditController,
  SceneShadingContext,
} from '../../features/diagnostics/scene-audit';
import { seeds } from '../../lib/content/seed';
import { toPortfolio, type Content, type Kind } from '../../lib/content/types';
import { createStationaryPixelCache } from '../../features/spacecraft/stationary-pixel-cache';
import './camera-invalidation-lab.css';

const panel = document.getElementById('camera-lab-controls')!;
panel.innerHTML = `<section class="camera-lab-panel"><h2>Dish and receiver cache investigation</h2>
<p id="pixel-status">Preparing…</p><button id="pixel-probe" disabled>Probe cache</button>
<button id="pixel-verify" disabled>Verify rooms</button><button id="pixel-timing" disabled>Rested comparison</button>
<button id="pixel-stop">Stop</button><label>Room <select id="pixel-room"><option>projects</option><option>home</option><option>contact</option><option>about</option><option>experience</option></select></label>
<textarea id="pixel-output" readonly aria-label="Pixel cache results"></textarea></section>`;
const data = toPortfolio(
  seeds.map((item) => ({
    id: item.id,
    kind: item.kind as Kind,
    draft: item.data,
    published: item.data,
    revision: 1,
    updatedAt: '2026-09-27T00:00:00.000Z',
  })) as Content[],
);
let controller: SceneAuditController, context: SceneShadingContext;
let cache: ReturnType<typeof createStationaryPixelCache>;
let modelSeconds = 14,
  stopped = false,
  busy = false,
  report: any;
const button = (id: string) =>
  document.getElementById('pixel-' + id) as HTMLButtonElement;
const pause = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));
async function status(message: string) {
  document.getElementById('pixel-status')!.textContent = message;
  await fetch('/progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phase: message }),
  });
}
const audit: SceneAudit = {
  manual: true,
  modelReady(model) {
    const update = model.update;
    model.update = (_time: number, ...args: any[]) =>
      update(modelSeconds, ...args);
  },
  shadingReady(value) {
    context = value;
    cache = value.pixelCache!;
    cache.select(false);
    return () => {};
  },
  ready(value) {
    controller = value;
    controller.freezeBackground(0);
    controller.setGpuScope('frame');
    for (const id of ['probe', 'verify', 'timing']) button(id).disabled = false;
    void status('Ready; scene advances only during replay.');
  },
};
createRoot(document.getElementById('portfolio-root')!).render(
  <ImmersivePortfolio
    data={data}
    initialSection="home"
    preview={false}
    sceneAudit={audit}
  >
    <p>Public seed fixture</p>
  </ImmersivePortfolio>,
);
function check() {
  if (stopped || document.hidden) throw new Error('Replay stopped or hidden');
}
async function step(after?: () => void) {
  await new Promise<void>((resolve, reject) =>
    requestAnimationFrame(() => {
      try {
        check();
        controller.step(1 / 60);
        after?.();
        resolve();
      } catch (e) {
        reject(e);
      }
    }),
  );
}
async function steps(n: number) {
  for (let i = 0; i < n; i++) await step();
}
function clearInput() {
  (document.activeElement as HTMLElement)?.blur?.();
  document.getElementById('ship')!.dispatchEvent(
    new PointerEvent('pointerleave', {
      pointerType: 'mouse',
      isPrimary: true,
    }),
  );
  document.body.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }),
  );
}
async function settle(room: string) {
  cache.select(false);
  clearInput();
  modelSeconds = 14;
  controller.navigate(room);
  await pause(0);
  for (let i = 0; i < 900; i++) {
    await step();
    const s = controller.state();
    if (
      s.backgroundReady &&
      s.room === room &&
      !s.travelling &&
      !s.motionActive
    ) {
      await steps(120);
      return;
    }
  }
  throw new Error('Room failed to settle: ' + room);
}
function pointer(x: number, y: number) {
  const canvas = document.querySelector('#ship canvas')!;
  const r = canvas.getBoundingClientRect();
  canvas.dispatchEvent(
    new PointerEvent('pointermove', {
      bubbles: true,
      isPrimary: true,
      pointerId: 981,
      pointerType: 'mouse',
      clientX: r.left + x * r.width,
      clientY: r.top + y * r.height,
    }),
  );
}
async function sample(
  variant: 'A' | 'B',
  workload = 'hold',
  frames = 240,
  room = 'projects',
) {
  await settle(room);
  cache.select(variant === 'B');
  await steps(30);
  const startSeconds = workload === 'cycle' ? 0 : workload === 'scan' ? 5 : 14;
  modelSeconds = startSeconds;
  await steps(5);
  controller.freezeBackground(0, true);
  await step();
  if (workload === 'cycle') cache.invalidate();
  controller.reset();
  const before = cache.stats();
  const stateBefore = controller.state();
  const startedAt = new Date().toISOString();
  for (let i = 0; i < frames; i++) {
    modelSeconds = startSeconds + i / 60;
    controller.freezeBackground(0);
    if (workload === 'camera')
      pointer(
        0.5 + 0.2 * Math.sin((i / frames) * Math.PI * 2),
        0.5 - 0.12 * Math.sin((i / frames) * Math.PI),
      );
    await step();
  }
  const snapshot = controller.snapshot();
  const after = cache.stats();
  const result = {
    variant,
    workload,
    frames,
    room,
    startedAt,
    stateBefore,
    stateAfter: controller.state(),
    snapshot,
    cache: {
      ...after,
      hits: after.hits - before.hits,
      builds: after.builds - before.builds,
      fallbacks: after.fallbacks - before.fallbacks,
    },
    glError: context.renderer.getContext().getError(),
  };
  report.rows.push(result);
  return result;
}
function readPixels() {
  const gl = context.renderer.getContext();
  const pixels = new Uint8Array(
    gl.drawingBufferWidth * gl.drawingBufferHeight * 4,
  );
  gl.readPixels(
    0,
    0,
    gl.drawingBufferWidth,
    gl.drawingBufferHeight,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    pixels,
  );
  return pixels;
}
async function compare(name: string, images = false) {
  cache.select(false);
  await steps(4);
  let a!: Uint8Array,
    b!: Uint8Array,
    before: string | undefined,
    after: string | undefined;
  await step(() => {
    a = readPixels();
    if (images) before = context.renderer.domElement.toDataURL();
  });
  cache.select(true);
  await steps(4);
  await step(() => {
    b = readPixels();
    if (images) after = context.renderer.domElement.toDataURL();
  });
  let changedPixels = 0,
    maxChannelDifference = 0,
    total = 0,
    over8 = 0;
  for (let i = 0; i < a.length; i += 4) {
    let d = 0;
    for (let j = 0; j < 3; j++) {
      const x = Math.abs(a[i + j] - b[i + j]);
      d = Math.max(d, x);
      total += x;
    }
    if (d) changedPixels++;
    if (d > 8) over8++;
    maxChannelDifference = Math.max(maxChannelDifference, d);
  }
  const row = {
    name,
    state: controller.state(),
    changedPixels,
    maxChannelDifference,
    over8,
    meanAbsoluteChannelDifference: total / ((a.length / 4) * 3),
    before,
    after,
    cache: cache.stats(),
    glError: context.renderer.getContext().getError(),
  };
  report.verifications.push(row);
  if (row.glError) throw new Error('WebGL error ' + row.glError);
}
async function compareCurrent(name: string, images = false) {
  await step(() => {
    cache.select(false);
    let candidate: ReturnType<typeof cache.stats> | undefined;
    const result = controller.compareGeometry(
      () => {
        cache.select(true);
        return () => {
          candidate = cache.stats();
          cache.select(false);
        };
      },
      images,
      4,
    );
    report.verifications.push({
      name,
      ...result,
      cache: candidate,
      state: controller.state(),
      glError: context.renderer.getContext().getError(),
    });
  });
}
async function interactions() {
  await status('Hover, doors, navigation and wake comparisons');
  await settle('projects');
  for (const [x, y] of [
    [0.3, 0.38],
    [0.7, 0.62],
  ]) {
    pointer(x, y);
    await steps(100);
    await compareCurrent('projects-hover-' + x);
  }
  clearInput();
  await steps(150);
  const door = [
    ...document.querySelectorAll<HTMLElement>(
      '.portal-hotspot[data-scene-room="experience"]',
    ),
  ].find(
    (el) =>
      !el.closest('[inert],[hidden],[aria-hidden="true"]') &&
      el.checkVisibility({ visibilityProperty: true }),
  );
  if (!door) throw new Error('No visible Projects door');
  door.focus({ preventScroll: true });
  await steps(12);
  await compareCurrent('door-moving');
  await steps(120);
  await compareCurrent('door-open', true);
  clearInput();
  await steps(12);
  await compareCurrent('door-closing');
  await steps(150);
  await compareCurrent('door-closed');
  for (const room of ['about', 'contact', 'home']) {
    controller.navigate(room);
    await pause(0);
    for (let i = 0; i < 400; i++) {
      modelSeconds = 5 + i / 60;
      await step();
      if ([20, 80, 160].includes(i))
        await compareCurrent('travel-' + room + '-' + i);
      if (i > 160 && !controller.state().travelling) break;
    }
    modelSeconds = 14;
    await steps(150);
    await compareCurrent('arrived-' + room);
  }
  const before = cache.stats();
  cache.release();
  await compareCurrent('released-cache-wake');
  report.verifications.push({
    name: 'release-lifecycle',
    before,
    after: cache.stats(),
  });
}
async function native() {
  const r = await fetch('/context');
  return r.json();
}
async function save() {
  // Publish metadata before image export so a rejected export remains inspectable.
  (document.getElementById('pixel-output') as HTMLTextAreaElement).value =
    JSON.stringify({
      status: report.status,
      errors: report.errors,
      verifications: report.verifications.map(
        ({ before: _before, after: _after, ...v }: any) => v,
      ),
    });
  report.endedAt = new Date().toISOString();
  report.contexts.push(await native());
  const r = await fetch('/results', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ runId: report.runId, report }),
  });
  if (!r.ok) throw new Error(await r.text());
  const saved: any = await r.json();
  (document.getElementById('pixel-output') as HTMLTextAreaElement).value =
    JSON.stringify(
      {
        saved,
        errors: report.errors,
        controls: report.controls,
        rows: report.rows.map((r: any) => ({
          variant: r.variant,
          workload: r.workload,
          room: r.room,
          cpu: r.snapshot.scene.cpuTotal,
          gpu: r.snapshot.scene.gpu.phases,
          cache: r.cache,
        })),
        verifications: report.verifications.map(
          ({ before: _before, after: _after, ...v }: any) => v,
        ),
      },
      null,
      2,
    );
  await status(report.status + ': ' + saved.filename);
}
function qualitySignature(r: any) {
  const s = r.snapshot.settings;
  return JSON.stringify(
    [
      'room',
      'cameraMatrix',
      'projectionMatrix',
      'lightRigQuaternion',
      'keyPosition',
      'shadowCameraUp',
      'vesselMatrix',
      'viewport',
      'drawingBuffer',
      'pixelRatio',
      'nativePixelRatio',
      'aoEnabled',
      'aoBuffer',
      'aoSamples',
      'denoiseSamples',
      'shadowMap',
      'shadowsEnabled',
      'policy',
      'experiment',
      'filter',
      'unmaskedRenderer',
      'userAgent',
    ].map((k) => s[k]),
  );
}
function validCapture(r: any) {
  const s = r.snapshot.scene,
    settings = r.snapshot.settings;
  const unchanged = (key: string) =>
    JSON.stringify(r.stateBefore[key]) === JSON.stringify(r.stateAfter[key]);
  return (
    r.glError === 0 &&
    s.window.frames === 1080 &&
    s.frames.length === 1080 &&
    s.activity.idle?.frames === 1080 &&
    s.gpu.phases.frame?.samples >= 10 &&
    s.gpu.discardedSamples === 0 &&
    s.gpu.pending === 0 &&
    [s.cpuTotal.mean, s.frameInterval.mean, s.gpu.phases.frame?.mean].every(
      (v) => Number.isFinite(v) && v > 0,
    ) &&
    [
      'cameraMatrix',
      'projectionMatrix',
      'lightRigQuaternion',
      'vesselMatrix',
      'doors',
      'readers',
      'feedback',
    ].every(unchanged) &&
    settings.visible &&
    !settings.travelling &&
    !settings.reading &&
    settings.room === r.room &&
    settings.backgroundReady &&
    !settings.reducedMotion &&
    settings.experiment === 'normal' &&
    settings.filter.mode === 'all' &&
    settings.aoEnabled &&
    settings.shadowsEnabled &&
    JSON.stringify(settings.viewport) === '[1280,720]' &&
    JSON.stringify(settings.drawingBuffer) === '[2560,1440]'
  );
}
function stability(rows: any[]) {
  const median = (a: number[]) => {
    const s = [...a].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  const metric = (values: number[]) => {
    const m = median(values),
      spread = (Math.max(...values) - Math.min(...values)) / m;
    const monotonic =
      values.length >= 3 &&
      (values.every((v, i) => !i || v >= values[i - 1]) ||
        values.every((v, i) => !i || v <= values[i - 1]));
    const drift = Math.abs(values.at(-1)! - values[0]) / m;
    return {
      values,
      median: m,
      spread,
      monotonic,
      drift,
      pass:
        values.every((v) => Number.isFinite(v) && v > 0) &&
        spread <= 0.05 &&
        (!monotonic || drift <= 0.025),
    };
  };
  const cpu = metric(rows.map((r) => r.snapshot.scene.cpuTotal.mean));
  const gpu = metric(rows.map((r) => r.snapshot.scene.gpu.phases.frame?.mean));
  const cadence = metric(rows.map((r) => r.snapshot.scene.frameInterval.mean));
  const coverage = rows.every(validCapture);
  return {
    cpu,
    gpu,
    cadence,
    coverage,
    pass: coverage && cpu.pass && gpu.pass && cadence.pass,
  };
}
async function run(mode: string) {
  if (busy) return;
  busy = true;
  stopped = false;
  const room = (
    document.getElementById('pixel-room') as unknown as HTMLSelectElement
  ).value;
  report = {
    runId: 'receivers-' + mode + '-' + Date.now(),
    mode,
    status: 'running',
    startedAt: new Date().toISOString(),
    rows: [],
    controls: [],
    verifications: [],
    contexts: [await native()],
    errors: [],
    method: {
      frameStep: 1 / 60,
      backgroundReplay:
        'Earth reset and all background time held at 0; dish and Contact time replay identically',
      holdSeconds: [14, 18],
      scanSeconds: [5, 9],
    },
  };
  try {
    if (mode === 'probe') {
      await settle(room);
      await compare(room + '-hold', room === 'projects');
      for (const workload of ['scan', 'cycle'])
        for (const variant of ['A', 'B', 'B', 'A'] as const) {
          await status('Exploratory ' + room + ' ' + workload + ' ' + variant);
          await sample(
            variant,
            workload,
            workload === 'cycle' ? 1080 : 240,
            room,
          );
          await pause(1000);
        }
    } else if (mode === 'verify') {
      for (const room of [
        'home',
        'projects',
        'contact',
        'about',
        'experience',
      ]) {
        await status('Moving comparison ' + room);
        await settle(room);
        controller.freezeBackground(0, true);
        await compare(room + '-hold', room === 'projects');
        cache.select(true);
        for (let i = 0; i < 1080; i++) {
          modelSeconds = i / 60;
          await step(() => {
            if (![90, 240, 390, 540, 720, 1079].includes(i)) return;
            const stats = cache.stats();
            // Read the existing moving B frame before forcing a complete A
            // render of the same pose, including a fresh shadow map and GTAO.
            cache.select(false);
            context.renderer.shadowMap.needsUpdate = true;
            const result = controller.verifyFrame(
              (room === 'home' && i === 390) ||
                (room === 'contact' && i === 720),
            );
            report.verifications.push({
              name: room + '-moving-' + i,
              comparison: 'before=cached B, after=fresh A at identical pose',
              ...result,
              cache: stats,
              state: controller.state(),
              glError: context.renderer.getContext().getError(),
            });
            cache.select(true);
          });
        }
      }
      await interactions();
    } else {
      const started = performance.now();
      let waitMs = 0,
        recoveryUsed = false;
      const acceptedA: any[] = [];
      const wait = async (ms: number) => {
        if (waitMs + ms > 300000 || performance.now() - started + ms > 1200000)
          throw new Error('Recovery/wall-time budget exhausted');
        waitMs += ms;
        report.waitMs = waitMs;
        await pause(ms);
        check();
      };
      let baselineContext: any;
      const conditions = async () => {
        const value: any = await native();
        report.contexts.push(value);
        const n = value.native;
        const battery = n?.pmset?.battery?.stdout || '';
        const signature = JSON.stringify([
          value.availability,
          n?.lowPowerMode,
          battery.match(/Now drawing from '([^']+)'/)?.[1],
          battery.match(
            /;\s*(discharging|charging|charged|finishing charge);/,
          )?.[1],
          n?.pmset?.settings?.stdout,
        ]);
        if (baselineContext === undefined) baselineContext = signature;
        const pass =
          signature === baselineContext &&
          (value.availability !== 'available' || n.thermalState === 'nominal');
        if (['serious', 'critical'].includes(n?.thermalState))
          throw new Error('OS pressure stop');
        return pass;
      };
      const controls = async (label: string) => {
        const before = await conditions();
        const rows: any[] = [];
        for (let i = 0; i < 3; i++) {
          await status(label + ' readiness ' + (i + 1));
          rows.push(await sample('A', 'cycle', 1080, room));
          if (i < 2) await wait(10000);
        }
        const gate = stability(rows);
        const after = await conditions();
        const pass =
          gate.pass &&
          before &&
          after &&
          rows.every((r) => qualitySignature(r) === qualitySignature(rows[0]));
        report.controls.push({
          label,
          gate,
          conditions: before && after,
          pass,
          rows: rows.map((r) => r.startedAt),
        });
        return { rows, gate, pass };
      };
      await status('Initial 60-second recovery');
      await wait(60000);
      let readiness = await controls('initial');
      if (!readiness.pass) {
        await status('One initial-readiness recovery');
        await wait(60000);
        readiness = await controls('initial-retry');
      }
      if (!readiness.pass)
        throw new Error(
          'Readiness failed; no qualified performance gain established',
        );
      const reference = readiness.gate;
      acceptedA.push(...readiness.rows);
      for (const [block, order] of ['ABBA', 'BAAB', 'ABBA', 'BAAB'].entries()) {
        for (let attempt = 0; attempt < 2; attempt++) {
          if (performance.now() - started > 1200000)
            throw new Error('Wall-time budget exhausted');
          const before = await conditions(),
            rows = [];
          for (const [index, v] of ('A' + order + 'A').split('').entries()) {
            if (performance.now() - started > 1200000)
              throw new Error('Wall-time budget exhausted');
            await status(
              'Block ' +
                (block + 1) +
                ' ' +
                order +
                ' attempt ' +
                (attempt + 1) +
                ' capture ' +
                (index + 1),
            );
            rows.push(await sample(v as 'A' | 'B', 'cycle', 1080, room));
            if (index < 5) await wait(1000);
          }
          const after = await conditions();
          const aRows = rows.filter((r) => r.variant === 'A');
          const gate = stability(aRows);
          const drift = stability([...acceptedA, ...aRows]);
          const referenceDelta = Object.fromEntries(
            ['cpu', 'gpu', 'cadence'].map((key) => {
              const k = key as 'cpu' | 'gpu' | 'cadence';
              return [
                key,
                Math.abs(
                  gate[k].values.reduce((a, b) => a + b, 0) /
                    aRows.length /
                    reference[k].median -
                    1,
                ),
              ];
            }),
          );
          const pass =
            before &&
            after &&
            rows.every(
              (r) =>
                validCapture(r) &&
                qualitySignature(r) === qualitySignature(readiness.rows[0]),
            ) &&
            gate.pass &&
            drift.pass &&
            Object.values(referenceDelta).every((v) => v <= 0.05);
          report.controls.push({
            block,
            order,
            attempt,
            gate,
            drift,
            referenceDelta,
            captureValidity: rows.map(validCapture),
            conditions: before && after,
            pass,
            rows: rows.map((r) => r.startedAt),
          });
          if (pass) {
            acceptedA.push(...aRows);
            break;
          }
          if (recoveryUsed)
            throw new Error(
              'Second block failure; no qualified complete order set',
            );
          recoveryUsed = true;
          await status('Failed block retained; one permitted recovery');
          await wait(60000);
          const recovery = await controls('block-recovery');
          const recoveryDrift = stability([...acceptedA, ...recovery.rows]);
          report.controls.push({
            label: 'recovery-drift',
            gate: recoveryDrift,
          });
          if (!recovery.pass || !recoveryDrift.pass)
            throw new Error(
              'Recovery controls failed; preserve results without ranking',
            );
          acceptedA.push(...recovery.rows);
        }
        if (block < 3) await wait(20000);
      }
    }
    report.status = 'complete';
  } catch (e) {
    report.errors.push(e instanceof Error ? e.stack : String(e));
    report.status = 'inconclusive-or-interrupted';
  } finally {
    await save();
    cache.select(false);
    busy = false;
  }
}
for (const mode of ['probe', 'verify', 'timing'])
  button(mode).onclick = () => void run(mode);
button('stop').onclick = () => {
  stopped = true;
};
