/** Device-agnostic, recoverable paired CPU experiments. Never imported by app.
 * --dry-run prints configuration without constructing models or timing kernels.
 * Example: node --expose-gc scripts/benchmark-controlled-performance.mjs
 *   --cases=all --blocks=4 --burst-ms=120 --initial-rest-ms=60000
 *   --telemetry-argv='["/tmp/orbital-thermal-monitor"]' --out=/absolute/run.json
 */
import { readFile, writeFile, appendFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { setTimeout as delay } from 'node:timers/promises';
import * as os from 'node:os';
import * as THREE from 'three';
import {
  runControlledKernel,
  runUntimedPrelude,
} from './benchmarks/controlled-kernel.mjs';
import {
  CASE_NAMES,
  createControlledCases,
} from './benchmarks/controlled-cases.mjs';
import {
  seededRandom,
  shuffle,
  balancedOrders,
  controlStability,
  thermalIssue,
  summarizeBlocks,
} from './benchmarks/controlled-protocol.mjs';

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const at = arg.indexOf('=');
    return at < 0
      ? [arg.slice(2), true]
      : [arg.slice(2, at), arg.slice(at + 1)];
  }),
);
const allowed = new Set([
  'cases',
  'blocks',
  'burst-ms',
  'prelude-ms',
  'initial-rest-ms',
  'sample-rest-ms',
  'block-rest-ms',
  'control-rest-ms',
  'recovery-rest-ms',
  'thermal-poll-ms',
  'max-cool-polls',
  'max-attempts',
  'drift-limit',
  'seed',
  'telemetry-argv',
  'context-telemetry-argv',
  'allow-unknown-thermal',
  'notes',
  'out',
  'dry-run',
  'correctness-only',
]);
for (const key of args.keys())
  if (!allowed.has(key)) throw new Error(`Unknown option --${key}`);
const numeric = (key, fallback, min = 0, max = 3_600_000) => {
  const value = Number(args.get(key) ?? fallback);
  if (!Number.isFinite(value) || value < min || value > max)
    throw new Error(`Invalid --${key}`);
  return value;
};
const selected =
  args.get('cases') && args.get('cases') !== 'all'
    ? String(args.get('cases')).split(',')
    : CASE_NAMES;
if (!selected.length || selected.some((name) => !CASE_NAMES.includes(name)))
  throw new Error(`Unknown case; choose ${CASE_NAMES.join(',')}`);
const telemetryArgv = args.has('telemetry-argv')
  ? JSON.parse(args.get('telemetry-argv'))
  : null;
if (
  telemetryArgv &&
  (!Array.isArray(telemetryArgv) ||
    !telemetryArgv.length ||
    telemetryArgv.some((value) => typeof value !== 'string'))
)
  throw new Error(
    '--telemetry-argv must be a JSON array of executable and arguments.',
  );
const contextTelemetryArgv = args.has('context-telemetry-argv')
  ? JSON.parse(args.get('context-telemetry-argv'))
  : null;
if (
  contextTelemetryArgv &&
  (!Array.isArray(contextTelemetryArgv) ||
    !contextTelemetryArgv.length ||
    contextTelemetryArgv.some((value) => typeof value !== 'string'))
)
  throw new Error('--context-telemetry-argv must be a JSON argv array.');
const config = {
  selected,
  blocks: numeric('blocks', 4, 2, 20),
  burstMs: numeric('burst-ms', 120, 20, 250),
  preludeMs: numeric('prelude-ms', 0, 0, 250),
  initialRestMs: numeric('initial-rest-ms', 60_000),
  sampleRestMs: numeric('sample-rest-ms', 1000),
  blockRestMs: numeric('block-rest-ms', 20_000),
  controlRestMs: numeric('control-rest-ms', 10_000),
  recoveryRestMs: numeric('recovery-rest-ms', 60_000),
  thermalPollMs: numeric('thermal-poll-ms', 5000),
  maxCoolPolls: numeric('max-cool-polls', 12, 2, 120),
  maxAttempts: numeric('max-attempts', 2, 1, 10),
  driftLimit: numeric('drift-limit', 0.05, 0.001, 0.5),
  seed: numeric('seed', 20260914, 0, 0xffffffff),
  thermalGate:
    telemetryArgv && !args.has('allow-unknown-thermal')
      ? 'nominal-required'
      : 'unknown-allowed',
  telemetryArgv,
  contextTelemetryArgv,
  notes: String(args.get('notes') ?? ''),
  gc: globalThis.gc
    ? 'before-block; before-every-startup-sample; outside-timer'
    : 'unavailable',
};
if (
  !Number.isInteger(config.blocks) ||
  config.blocks % 2 ||
  !Number.isInteger(config.maxAttempts) ||
  !Number.isInteger(config.maxCoolPolls)
)
  throw new Error('Blocks must be even; poll/attempt counts must be integers.');
const random = seededRandom(config.seed);
const schedule = shuffle(selected, random).map((name) => ({
  name,
  orders: balancedOrders(config.blocks, random),
}));
if (args.has('dry-run')) {
  console.log(
    JSON.stringify(
      {
        config,
        schedule,
        mode: 'dry-run: no model construction or performance measurement',
      },
      null,
      2,
    ),
  );
  process.exit(0);
}
const stamp = new Date().toISOString().replaceAll(':', '-');
const output = resolve(
  String(
    args.get('out') ?? `docs/evidence/performance/controlled/${stamp}.json`,
  ),
);
const eventsPath = output.replace(/\.json$/, '') + '.events.jsonl';
await mkdir(dirname(output), { recursive: true });
const abort = new AbortController();
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => abort.abort(signal));
const execFileAsync = promisify(execFile);
const report = {
  recordedAt: new Date().toISOString(),
  status: 'preparing',
  protocolVersion: 2,
  comparisonState:
    config.preludeMs > 0
      ? 'warmed steady CPU work; startup excludes prelude'
      : 'no-prelude behavior compatible with v1',
  config,
  schedule,
  metadata: {
    node: process.version,
    threeRevision: THREE.REVISION,
    platform: process.platform,
    architecture: process.arch,
    osRelease: os.release(),
    cpuModel: os.cpus()[0]?.model ?? null,
    logicalCpus: os.cpus().length,
    totalMemoryBytes: os.totalmem(),
    execArgv: process.execArgv,
    sourceHashes: {},
  },
  methodology:
    'Balanced seeded ABBA/BAAB blocks with identical work counts, short calibrated bursts, real idle rests, nominal-OS-pressure gate when telemetry is available, and repeated reference controls. Every attempt and rejection is retained; timings are never thermally corrected.',
  limitations: [
    'Nominal OS thermal pressure plus stable controls does not prove cold hardware, peak clocks, or absence of throttling.',
    'Rests are configurable minimum idle periods, not guaranteed cooldown times. Drift and telemetry can invalidate a block.',
    'CPU-only Node kernels. No browser CanvasTextures, GPU uploads/draws, FPS, energy or device-temperature conclusions.',
    'Steady frame kernels reuse fixtures. Indexing intentionally creates one fresh model per sample and reports construction and compaction separately.',
    'All candidates remain benchmark-only; paired timings never automatically activate production changes.',
    'A configured prelude measures warmed repeated CPU work, not first work after idle. Its duration does not prove CPU frequency or JIT stabilization. Startup excludes the prelude and remains warmed repeated model construction after earlier verification/calibration.',
    'Process/thread CPU deltas are descriptive only, never corrections or acceptance gates; process totals may exceed wall time across threads.',
  ],
  checkpoints: [],
  cases: {},
};
const sourcePaths = [
  'features/spacecraft/spacecraft-model.ts',
  'features/spacecraft/geometry/model-primitives.ts',
  'features/spacecraft/equipment/docking-service-assemblies.ts',
  'features/spacecraft/geometry/flush-window-reveals.ts',
  'features/spacecraft/rooms/case-study-archive.ts',
  'features/spacecraft/geometry/rounded-cabin-interior.ts',
  'features/spacecraft/geometry/spacecraft-wall-layout.ts',
  'features/spacecraft/navigation/iris-hatch.ts',
  'scripts/benchmark-controlled-performance.mjs',
  'scripts/benchmarks/controlled-cases.mjs',
  'scripts/benchmarks/controlled-kernel.mjs',
  'scripts/benchmarks/controlled-protocol.mjs',
  'scripts/benchmarks/local-transform-cache-candidate.ts',
  'scripts/benchmarks/material-lighting-candidate.ts',
  'scripts/benchmarks/exact-matrix-inverse-candidate.ts',
  'scripts/probe-targeted-exact-indexing.mjs',
];
for (const path of sourcePaths)
  report.metadata.sourceHashes[path] = createHash('sha256')
    .update(await readFile(resolve(path)))
    .digest('hex');
const save = () => writeFile(output, JSON.stringify(report, null, 2) + '\n');
const event = async (type, data = {}) => {
  const entry = { timestamp: new Date().toISOString(), type, ...data };
  await appendFile(eventsPath, JSON.stringify(entry) + '\n');
  console.log(JSON.stringify(entry));
};
async function rest(milliseconds, reason) {
  if (!milliseconds) return;
  await event('rest', { milliseconds, reason });
  await delay(milliseconds, undefined, { signal: abort.signal });
}
async function snapshot(argv = telemetryArgv) {
  let telemetry = {
    thermalState: 'unavailable',
    reason: 'no external telemetry configured',
  };
  if (argv) {
    try {
      const result = await execFileAsync(argv[0], argv.slice(1), {
        timeout: 4000,
        maxBuffer: 65536,
        signal: abort.signal,
      });
      telemetry = JSON.parse(result.stdout);
    } catch (error) {
      telemetry = { thermalState: 'unavailable', error: error.message };
    }
  }
  return {
    timestamp: new Date().toISOString(),
    telemetry,
    systemLoadAverage: os.loadavg(),
    freeMemoryBytes: os.freemem(),
    processMemory: process.memoryUsage(),
  };
}
async function nominalGate(name) {
  if (!telemetryArgv)
    return {
      qualified: config.thermalGate !== 'nominal-required',
      snapshots: [await snapshot()],
      qualifier: 'thermal pressure unknown',
    };
  let nominal = 0;
  const snapshots = [];
  for (let poll = 0; poll < config.maxCoolPolls; poll++) {
    const state = await snapshot();
    snapshots.push(state);
    nominal = thermalIssue(state, config.thermalGate === 'nominal-required')
      ? 0
      : nominal + 1;
    if (nominal >= 2)
      return {
        qualified: true,
        snapshots,
        qualifier: snapshots.every(
          (s) => s.telemetry.thermalState === 'nominal',
        )
          ? 'nominal OS thermal pressure observed'
          : 'some thermal observations unavailable',
      };
    await rest(
      config.thermalPollMs,
      `${name}: waiting for consecutive acceptable thermal observations`,
    );
  }
  return {
    qualified: false,
    snapshots,
    qualifier: 'thermal gate did not recover within poll budget',
  };
}
function kernel(fixture, variant, iterations, preludeMs = 0) {
  return runControlledKernel(fixture, variant, iterations, { preludeMs });
}
async function sample(fixture, variant, iterations, role) {
  if (abort.signal.aborted) throw new Error('Benchmark interrupted');
  if (fixture.kind === 'construction') globalThis.gc?.();
  const before = await snapshot();
  const pressureIssue = thermalIssue(
    before,
    config.thermalGate === 'nominal-required',
  );
  if (pressureIssue) {
    const skipped = {
      variant,
      iterations,
      role,
      skipped: true,
      reason: pressureIssue,
      before,
      after: before,
      elapsedMs: null,
      meanMs: null,
    };
    await event('sample-skipped', {
      case: fixture.name,
      variant,
      role,
      reason: pressureIssue,
    });
    return skipped;
  }
  const result = kernel(fixture, variant, iterations, config.preludeMs);
  const after = await snapshot();
  const value = { variant, iterations, role, ...result, before, after };
  await event('sample', {
    case: fixture.name,
    variant,
    role,
    iterations,
    elapsedMs: result.elapsedMs,
    meanMs: result.meanMs,
    preludeMs: result.prelude.elapsedMs,
    preludeOperations: result.prelude.operations,
    processCpuMs: result.cpu.process?.totalMs ?? null,
    threadCpuMs: result.cpu.thread?.totalMs ?? null,
  });
  return value;
}
function calibrate(fixture) {
  const preCalibrationWarmups = {
    A: runUntimedPrelude(fixture, 'A', config.preludeMs),
    B: runUntimedPrelude(fixture, 'B', config.preludeMs),
  };
  if (fixture.kind === 'construction') {
    const warmups = [kernel(fixture, 'A', 1), kernel(fixture, 'B', 1)];
    return {
      iterations: 1,
      preCalibrationWarmups,
      warmups,
      reason:
        'one fully timed startup operation per sample; warmed repeated model construction after verification and calibration, not cold startup; may exceed burst target',
    };
  }
  let iterations = 1;
  const probes = [];
  for (let attempt = 0; attempt < 8; attempt++) {
    const a = kernel(fixture, 'A', iterations),
      b = kernel(fixture, 'B', iterations);
    probes.push({
      iterations,
      referenceMs: a.elapsedMs,
      candidateMs: b.elapsedMs,
    });
    const slower = Math.max(a.elapsedMs, b.elapsedMs);
    if (slower >= 10) {
      iterations = Math.max(
        1,
        Math.min(
          10_000_000,
          Math.floor((iterations * config.burstMs) / slower),
        ),
      );
      break;
    }
    iterations = Math.min(
      10_000_000,
      iterations *
        Math.min(8, Math.max(2, Math.ceil(10 / Math.max(slower, 0.001)))),
    );
  }
  const warmups = [
    kernel(fixture, 'A', iterations),
    kernel(fixture, 'B', iterations),
  ];
  return {
    iterations,
    preCalibrationWarmups,
    probes,
    warmups,
    targetMs: config.burstMs,
    reason:
      'shared iteration count sized to slower calibrated variant; one full warmup burst per version',
  };
}
async function controls(fixture, iterations) {
  const thermal = await nominalGate(fixture.name);
  const samples = [];
  if (thermal.qualified)
    for (let i = 0; i < 3; i++) {
      samples.push(await sample(fixture, 'A', iterations, 'stability-control'));
      if (samples.at(-1).skipped) break;
      if (i < 2)
        await rest(
          config.controlRestMs,
          `${fixture.name}: separate baseline controls`,
        );
    }
  const stability = controlStability(
    samples.map((s) => s.meanMs),
    config.driftLimit,
  );
  const pressure = samples
    .flatMap((s) => [s.before, s.after])
    .map((s) => thermalIssue(s, config.thermalGate === 'nominal-required'))
    .filter(Boolean);
  return {
    thermal,
    samples,
    stability,
    qualified: thermal.qualified && stability.stable && !pressure.length,
    pressure,
  };
}
let fixtures;
try {
  await event('prepare', { output, schedule });
  report.metadata.initialSystemContext = await snapshot(
    contextTelemetryArgv ?? telemetryArgv,
  );
  fixtures = createControlledCases(selected);
  for (const name of selected)
    report.cases[name] = {
      verification: fixtures.cases.get(name).verify(),
      calibration: null,
      gates: [],
      blocks: [],
    };
  await save();
  if (args.has('correctness-only')) {
    report.status = 'correctness-only-passed';
    await save();
    await event('complete', { output, status: report.status });
  } else {
    report.status = 'running';
    await rest(
      config.initialRestMs,
      'Initial idle recovery after setup and correctness checks',
    );
    for (const planned of schedule) {
      const fixture = fixtures.cases.get(planned.name),
        result = report.cases[planned.name];
      result.preparationThermal = await nominalGate(fixture.name);
      if (!result.preparationThermal.qualified) {
        result.status = 'inconclusive-thermal-readiness';
        await save();
        continue;
      }
      result.calibration = calibrate(fixture);
      await save();
      const iterations = result.calibration.iterations;
      let gate;
      for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
        gate = await controls(fixture, iterations);
        result.gates.push(gate);
        await save();
        if (gate.qualified) break;
        await rest(
          config.recoveryRestMs,
          `${fixture.name}: baseline or thermal gate needs recovery`,
        );
      }
      if (!gate?.qualified) {
        result.status = 'inconclusive-initial-controls';
        await save();
        continue;
      }
      const initialControl = gate.stability.medianMs;
      for (const [blockIndex, order] of planned.orders.entries()) {
        for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
          await rest(
            config.blockRestMs,
            `${fixture.name}: minimum idle before block ${blockIndex + 1}`,
          );
          globalThis.gc?.();
          const blockContext = contextTelemetryArgv
            ? await snapshot(contextTelemetryArgv)
            : null;
          const block = {
            block: blockIndex + 1,
            attempt: attempt + 1,
            order,
            preControl: null,
            samples: [],
            postControl: null,
            accepted: false,
            reasons: [],
            systemContextBefore: blockContext,
          };
          result.blocks.push(block);
          block.preControl = await sample(
            fixture,
            'A',
            iterations,
            'block-control-before',
          );
          for (const variant of order) {
            if (block.preControl.skipped || block.samples.at(-1)?.skipped)
              break;
            await rest(
              config.sampleRestMs,
              `${fixture.name}: separate short samples`,
            );
            block.samples.push(
              await sample(fixture, variant, iterations, 'comparison'),
            );
          }
          await rest(
            config.sampleRestMs,
            `${fixture.name}: separate ending control`,
          );
          block.postControl = await sample(
            fixture,
            'A',
            iterations,
            'block-control-after',
          );
          const all = [block.preControl, ...block.samples, block.postControl];
          const refs = [
            block.preControl,
            ...block.samples.filter((s) => s.variant === 'A'),
            block.postControl,
          ];
          block.controlStability = controlStability(
            refs.map((s) => s.meanMs),
            config.driftLimit,
          );
          block.referenceChangeFromInitial = Number.isFinite(
            block.controlStability.medianMs,
          )
            ? block.controlStability.medianMs / initialControl - 1
            : null;
          if (!block.controlStability.stable)
            block.reasons.push(block.controlStability.reason);
          if (Math.abs(block.referenceChangeFromInitial) > config.driftLimit)
            block.reasons.push('reference-drift-from-initial-controls');
          for (const state of all.flatMap((s) => [s.before, s.after])) {
            const issue = thermalIssue(
              state,
              config.thermalGate === 'nominal-required',
            );
            if (issue && !block.reasons.includes(issue))
              block.reasons.push(issue);
          }
          const powerModes = new Set(
            all
              .flatMap((s) => [
                s.before.telemetry.lowPowerMode,
                s.after.telemetry.lowPowerMode,
              ])
              .filter((v) => typeof v === 'boolean'),
          );
          if (powerModes.size > 1) block.reasons.push('low-power-mode-changed');
          if (
            fixture.kind !== 'construction' &&
            block.samples.some((s) => s.elapsedMs > config.burstMs * 3)
          )
            block.reasons.push('burst-exceeded-three-times-calibrated-target');
          if (contextTelemetryArgv)
            block.systemContextAfter = await snapshot(contextTelemetryArgv);
          block.accepted = !block.reasons.length;
          await event('block', {
            case: fixture.name,
            block: block.block,
            attempt: block.attempt,
            accepted: block.accepted,
            reasons: block.reasons,
          });
          await save();
          if (block.accepted) break;
          if (attempt + 1 < config.maxAttempts) {
            await rest(
              config.recoveryRestMs,
              `${fixture.name}: rejected block; recover before retry`,
            );
            const recovered = await controls(fixture, iterations);
            result.gates.push(recovered);
            await save();
            if (!recovered.qualified) break;
          }
        }
      }
      result.summary = summarizeBlocks(result.blocks);
      result.status =
        result.summary.acceptedBlocks === config.blocks
          ? 'complete-accepted-blocks'
          : 'inconclusive-insufficient-stable-blocks';
      await save();
    }
    report.status = Object.values(report.cases).every(
      (result) => result.status === 'complete-accepted-blocks',
    )
      ? 'complete'
      : 'complete-with-inconclusive-cases';
    report.completedAt = new Date().toISOString();
    await save();
    await event('complete', { output, status: report.status });
  }
} catch (error) {
  report.status = abort.signal.aborted ? 'interrupted' : 'failed';
  report.error = error.message;
  await save();
  await event(report.status, { output, error: error.message });
  process.exitCode = abort.signal.aborted ? 130 : 1;
} finally {
  fixtures?.dispose();
}
