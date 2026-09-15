/** Fresh single-model, fresh-WebGL-context startup samples; local lab only. */
import { createRoot } from 'react-dom/client';
import { ImmersivePortfolio } from '../../features/portfolio/immersive-portfolio';
import type { SceneAudit } from '../../features/diagnostics/scene-audit';
import { seeds } from '../../lib/content/seed';
import { toPortfolio, type Content, type Kind } from '../../lib/content/types';
import { inventory } from './geometry-compaction-utils.mjs';
import { controlStability } from './controlled-protocol.mjs';

const params = new URLSearchParams(location.search);
const variant = params.get('variant');
const now = () => new Date().toISOString();
const pause = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));
let telemetryEverAvailable = false;
const context = async () => {
  const value: any = await (await fetch('/context')).json();
  telemetryEverAvailable ||= value.availability === 'available';
  return value;
};
const metricControls = (samples: any[]) => ({
  construction: controlStability(samples.map((s) => s.constructionMs)),
  firstFrame: controlStability(
    samples.map((s) => s.firstFrame.mountToSubmissionMs),
  ),
  earthReady: controlStability(
    samples.map((s) => s.earthReadyFrame.mountToSubmissionMs),
  ),
});
function stableContext(values: any[]) {
  if (new Set(values.map((v) => v.availability)).size !== 1) return false;
  if (values[0]?.availability !== 'available') return !telemetryEverAvailable;
  const power = (v: any) =>
    JSON.stringify(v.native ?? {}).match(/Now drawing from ([^\\]+)/)?.[1];
  return values.every(
    (v) =>
      v.native?.thermalState === 'nominal' &&
      v.native?.lowPowerMode === values[0].native?.lowPowerMode &&
      power(v) === power(values[0]),
  );
}
const comparisonSettings = (settings: any) =>
  JSON.stringify(
    Object.fromEntries(
      [
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
        'reducedMotion',
        'contactShading',
        'build',
        'threeRevision',
        'unmaskedRenderer',
      ].map((key) => [key, settings[key]]),
    ),
  );
const comparableSamples = (samples: any[]) =>
  samples.every((s) => s.validity.valid) &&
  new Set(samples.map((s) => comparisonSettings(s.settings))).size === 1;
if (variant) {
  const mountStart = performance.now();
  let hidden = document.visibilityState !== 'visible',
    contextLost = false,
    resized = false;
  const initialViewport = [innerWidth, innerHeight, devicePixelRatio].join(',');
  document.addEventListener('visibilitychange', () => {
    hidden ||= document.visibilityState !== 'visible';
  });
  window.addEventListener('resize', () => {
    resized = true;
  });
  document.addEventListener(
    'webglcontextlost',
    () => {
      contextLost = true;
    },
    true,
  );
  let constructionMs = 0,
    measuredModel: any,
    firstFrame: any;
  const data = toPortfolio(
    seeds.map((item) => ({
      id: item.id,
      kind: item.kind as Kind,
      draft: item.data,
      published: item.data,
      revision: 1,
      updatedAt: '2026-09-15T00:00:00.000Z',
    })) as Content[],
  );
  const audit: SceneAudit = {
    manual: true,
    geometryCompaction: variant === 'indexed',
    modelReady(model, _options, _three, ms) {
      constructionMs = ms;
      measuredModel = model;
    },
    ready(controller) {
      controller.freezeBackground(0);
      controller.setPolicy('geometry');
      let frames = 0;
      function step() {
        const started = performance.now();
        controller.step(1 / 60);
        const submitted = performance.now();
        firstFrame ??= {
          frameCpuMs: submitted - started,
          mountToSubmissionMs: submitted - mountStart,
          navigationToSubmissionMs: submitted,
        };
        const state = controller.state();
        if (state.backgroundReady) {
          const report = {
            variant,
            validity: {
              valid:
                !hidden &&
                !contextLost &&
                !resized &&
                initialViewport ===
                  [innerWidth, innerHeight, devicePixelRatio].join(','),
              hidden,
              contextLost,
              resized,
              initialViewport,
            },
            constructionMs,
            geometry: inventory(measuredModel.group),
            firstFrame,
            earthReadyFrame: {
              frame: frames,
              frameCpuMs: submitted - started,
              mountToSubmissionMs: submitted - mountStart,
              navigationToSubmissionMs: submitted,
            },
            settings: controller.snapshot().settings,
            resources: performance
              .getEntriesByType('resource')
              .map((r: any) => ({
                name: r.name.split(location.origin)[1] ?? r.name,
                transferSize: r.transferSize,
                encodedBodySize: r.encodedBodySize,
                decodedBodySize: r.decodedBodySize,
                duration: r.duration,
              })),
            cleanup: null as any,
          };
          const cleanupStart = performance.now();
          const canvas =
            document.querySelector<HTMLCanvasElement>('#ship canvas');
          const lose = canvas
            ?.getContext('webgl2')
            ?.getExtension('WEBGL_lose_context');
          startupRoot.unmount();
          lose?.loseContext();
          report.cleanup = {
            milliseconds: performance.now() - cleanupStart,
            reactUnmounted: !document.querySelector('#ship'),
            contextReleaseRequested: !!lose,
          };
          parent.postMessage(
            { type: 'geometry-startup', token: params.get('token'), report },
            location.origin,
          );
        } else if (++frames < 900) requestAnimationFrame(step);
        else
          parent.postMessage(
            {
              type: 'geometry-startup',
              token: params.get('token'),
              error: 'Earth did not become ready',
            },
            location.origin,
          );
      }
      requestAnimationFrame(step);
    },
  };
  const startupRoot = createRoot(document.getElementById('portfolio-root')!);
  startupRoot.render(
    <ImmersivePortfolio
      data={data}
      initialSection="home"
      preview={false}
      sceneAudit={audit}
    >
      <p>Public seed fixture.</p>
    </ImmersivePortfolio>,
  );
} else {
  document.getElementById('camera-lab-controls')!.innerHTML =
    '<section style="padding:24px;background:#172635;color:#eadfc9;font:16px sans-serif"><h1>Geometry startup comparison</h1><p>Fresh model and WebGL context for each sample. Same bundle, public content and 8K Earth. Driver and HTTP cache are not cleared.</p><button id="startup-start">Start startup runs</button><p id="startup-status" role="status">Ready</p></section>';
  const label = document.getElementById('startup-status')!;
  const progress = async (phase: string) => {
    label.textContent = phase;
    await fetch('/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phase, at: now() }),
    });
  };
  const run = (selected: string) =>
    new Promise<any>((resolve, reject) => {
      const frame = document.createElement('iframe'),
        token = crypto.randomUUID();
      frame.style.cssText =
        'position:fixed;inset:0;width:100vw;height:100vh;border:0;z-index:9999';
      frame.src = `/startup?variant=${selected}&token=${token}`;
      const timeout = setTimeout(
        () => finish(new Error('Startup sample timeout')),
        60000,
      );
      function finish(error?: Error, report?: any) {
        clearTimeout(timeout);
        window.removeEventListener('message', receive);
        frame.remove();
        if (error) reject(error);
        else resolve(report);
      }
      function receive(event: MessageEvent) {
        if (
          event.origin !== location.origin ||
          event.source !== frame.contentWindow ||
          event.data?.token !== token
        )
          return;
        finish(
          event.data.error ? new Error(event.data.error) : undefined,
          event.data.report,
        );
      }
      window.addEventListener('message', receive);
      document.body.appendChild(frame);
    });
  document.getElementById('startup-start')!.onclick = async () => {
    (document.getElementById('startup-start') as HTMLButtonElement).disabled =
      true;
    const report: any = {
      schemaVersion: 1,
      runId: `startup-${Date.now()}`,
      startedAt: now(),
      status: 'running',
      warmups: [],
      controls: [],
      blocks: [],
      errors: [],
      settings: {
        orders: [
          ['baseline', 'indexed', 'indexed', 'baseline'],
          ['indexed', 'baseline', 'baseline', 'indexed'],
        ],
        controlSpreadLimit: 0.05,
        initialRestMs: 60000,
        blockRestMs: 20000,
        viewport: [innerWidth, innerHeight],
        devicePixelRatio,
      },
      limitations: [
        'Fresh iframe/model/WebGL context, shared previously loaded bundle and driver caches. Not cold browser startup or physical presentation latency.',
        'First-frame CPU measures submission; GPU completion is not timed here.',
        'Actual loopback transfer is recorded, not a simulated public-network download. Both variants load the same comparison bundle; separate bundle-size accounting measures production code delta.',
        'Nominal OS pressure and rests do not prove equal clocks or absence of throttling.',
      ],
    };
    try {
      for (const selected of ['baseline', 'indexed', 'indexed', 'baseline']) {
        await progress(`Untimed startup warmup: ${selected}`);
        report.warmups.push(await run(selected));
        await pause(1000);
      }
      let ready = false;
      for (let attempt = 0; attempt < 2; attempt++) {
        await progress('Recovery: 60 seconds without rendering');
        await pause(60000);
        const controls = [];
        for (let i = 0; i < 3; i++) {
          await progress(`Startup reference ${i + 1}/3`);
          const control = {
            attempt,
            before: await context(),
            sample: await run('baseline'),
            after: await context(),
          };
          controls.push(control);
          report.controls.push(control);
          if (i < 2) await pause(10000);
        }
        report.readiness = metricControls(controls.map((c: any) => c.sample));
        report.readinessContexts = controls.flatMap((c: any) => [
          c.before,
          c.after,
        ]);
        report.readinessComparable = comparableSamples(
          controls.map((c: any) => c.sample),
        );
        ready =
          report.readinessComparable &&
          report.readiness.construction.stable &&
          stableContext(report.readinessContexts);
        if (ready) break;
      }
      if (!ready) {
        report.status = 'inconclusive-readiness';
        throw new Error(
          'Startup reference controls did not stabilize within two recovery attempts.',
        );
      }
      for (const [i, order] of report.settings.orders.entries()) {
        const block: any = {
          index: i,
          order,
          before: await context(),
          samples: [],
        };
        report.blocks.push(block);
        if (!stableContext([...report.readinessContexts, block.before])) {
          report.status = 'inconclusive-context';
          break;
        }
        for (const selected of order) {
          await progress(`Startup block ${i + 1}/2: ${selected}`);
          block.samples.push(await run(selected));
          await pause(1000);
        }
        block.after = await context();
        block.stability = metricControls(
          block.samples.filter((s: any) => s.variant === 'baseline'),
        );
        block.contextStable = stableContext([
          ...report.readinessContexts,
          block.before,
          block.after,
        ]);
        block.comparable = comparableSamples([
          ...report.controls.map((c: any) => c.sample),
          ...block.samples,
        ]);
        block.acceptedMetrics = Object.fromEntries(
          ['construction', 'firstFrame', 'earthReady'].map((key) => [
            key,
            block.comparable &&
              block.contextStable &&
              report.readiness[key].stable &&
              block.stability[key].stable,
          ]),
        );
        block.accepted = block.acceptedMetrics.construction;
        block.acceptanceScope =
          'Model construction. First-frame/Earth-ready acceptance is gated separately in acceptedMetrics.';
        if (!block.accepted) {
          report.status = 'inconclusive-block';
          break;
        }
        if (i === 0) {
          await progress('Recovery: 20 seconds without rendering');
          await pause(20000);
        }
      }
      if (report.status === 'running') report.status = 'complete';
    } catch (error) {
      if (report.status === 'running') report.status = 'failed';
      report.errors.push(String(error));
    }
    report.telemetryEverAvailable = telemetryEverAvailable;
    report.endedAt = now();
    const response = await fetch('/results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runId: report.runId, report }),
    });
    const saved = (await response.json()) as { filename?: string };
    await progress(`${report.status}: ${saved.filename ?? 'save failed'}`);
  };
}
