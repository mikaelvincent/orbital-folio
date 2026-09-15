export type SceneRenderCounts = {
  calls: number;
  triangles: number;
  points: number;
  lines: number;
};

export type ScenePerformanceStats = {
  samples: number;
  mean: number;
  p50: number;
  p95: number;
  max: number;
} | null;

export type ScenePerformanceFrame = {
  id: number;
  rafNow: number;
  intervalMs: number | null;
  cpuTotalMs: number;
  cpuPhases: Record<string, number>;
  passes: Record<string, SceneRenderCounts>;
  counters: Record<string, number>;
  activity: string;
  context: Record<string, unknown>;
};

export type SceneGpuSample = { frameId: number; name: string; ms: number };

export type ScenePerformanceReport = {
  schemaVersion: 1;
  window: { frames: number; durationMs: number; renderedFps: number | null };
  frameInterval: ScenePerformanceStats;
  cpuTotal: ScenePerformanceStats;
  cpuPhases: Record<string, ScenePerformanceStats>;
  gpu: {
    status: string;
    scope: 'passes' | 'frame';
    phases: Record<string, ScenePerformanceStats>;
    pending: number;
    sampleEvery: number;
    discardedSamples: number;
    skippedSamples: number;
    /** Raw results are opt-in and join to retained frames by frameId. */
    samples?: SceneGpuSample[];
  };
  passes: Record<
    string,
    Record<keyof SceneRenderCounts, ScenePerformanceStats>
  >;
  counters: Record<string, number>;
  context: Record<string, unknown>;
  activity: Record<string, { frames: number; cpuMeanMs: number }>;
  limitations: string[];
  resetReason: string | null;
  frames?: ScenePerformanceFrame[];
};

type TimerExtension = {
  TIME_ELAPSED_EXT: number;
  GPU_DISJOINT_EXT: number;
};

type GpuQuery = {
  query: WebGLQuery;
  frameId: number;
  name: string;
};

type ActivePass = {
  name: string;
  counts: SceneRenderCounts;
  query: GpuQuery | null;
};

const countKeys = ['calls', 'triangles', 'points', 'lines'] as const;

function stats(values: number[]): ScenePerformanceStats {
  if (!values.length) return null;
  values.sort((a, b) => a - b);
  return {
    samples: values.length,
    mean: values.reduce((total, value) => total + value, 0) / values.length,
    // Nearest-rank percentiles keep isolated expensive frames visible.
    p50: values[Math.ceil(values.length * 0.5) - 1],
    p95: values[Math.ceil(values.length * 0.95) - 1],
    max: values[values.length - 1],
  };
}

function dictionary<T>(): Record<string, T> {
  return Object.create(null) as Record<string, T>;
}

// Frame annotations contain plain diagnostic data (scalars, arrays and records),
// never live Three.js objects. Copy nested values on input and export so later
// camera updates or consumers cannot rewrite an earlier recorded frame.
function copyContext(values: Record<string, unknown>): Record<string, unknown> {
  const copyValue = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(copyValue);
    if (
      value !== null &&
      typeof value === 'object' &&
      (Object.getPrototypeOf(value) === Object.prototype ||
        Object.getPrototypeOf(value) === null)
    )
      return Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [key, copyValue(entry)]),
      );
    return value;
  };
  return copyValue(values) as Record<string, unknown>;
}

function boundedInteger(
  value: number | undefined,
  fallback: number,
  max: number,
) {
  return Number.isFinite(value)
    ? Math.min(max, Math.max(1, Math.floor(value!)))
    : fallback;
}

/** Instantiate only when diagnostics are enabled. No render loop or UI work is
 * scheduled here; snapshots do the aggregation on demand. CPU phases partition
 * the frame callback, while GPU timers sample non-overlapping render passes. */
export function createScenePerformance(
  gl: WebGL2RenderingContext | null,
  options: {
    now?: () => number;
    maxFrames?: number;
    gpuSampleEvery?: number;
    maxPendingQueries?: number;
  } = {},
) {
  const now = options.now ?? (() => performance.now());
  let maxFrames = boundedInteger(options.maxFrames, 600, 1800);
  const sampleEvery = boundedInteger(options.gpuSampleEvery, 15, 600);
  const maxPending = boundedInteger(options.maxPendingQueries, 32, 32);
  let extension: TimerExtension | null = null;
  let gpuStatus = 'unavailable';
  try {
    extension = gl?.getExtension('EXT_disjoint_timer_query_webgl2') ?? null;
    if (extension) gpuStatus = 'available';
  } catch {
    // A lost or unsupported context must not prevent CPU diagnostics.
  }

  let disposed = false;
  let frameId = 0;
  let previousRaf: number | null = null;
  let frameStart = 0;
  let lastMark = 0;
  let current: ScenePerformanceFrame | null = null;
  let activePass: ActivePass | null = null;
  let frameQuery: GpuQuery | null = null;
  let gpuScope: 'passes' | 'frame' = 'passes';
  let frames: ScenePerformanceFrame[] = [];
  let pending: GpuQuery[] = [];
  let gpuSamples: SceneGpuSample[] = [];
  let context: Record<string, unknown> = {};
  let resetReason: string | null = null;
  let discardedSamples = 0;
  let skippedSamples = 0;

  function deleteQuery(query: WebGLQuery) {
    try {
      gl?.deleteQuery(query);
    } catch {
      // Context loss can invalidate an outstanding query before cleanup.
    }
  }

  function discardPending() {
    for (const item of pending) deleteQuery(item.query);
    discardedSamples += pending.length;
    pending = [];
  }

  function cancelActivePass() {
    if (activePass?.query) {
      try {
        gl?.endQuery(extension!.TIME_ELAPSED_EXT);
      } catch {
        // Cleanup is also safe after WebGL context loss.
      }
      deleteQuery(activePass.query.query);
    }
    activePass = null;
  }

  function beginGpu(name: string): GpuQuery | null {
    if (
      !current ||
      !gl ||
      !extension ||
      gpuStatus !== 'available' ||
      (current.id - 1) % sampleEvery !== 0
    )
      return null;
    if (pending.length >= maxPending) {
      skippedSamples++;
      return null;
    }
    let handle: WebGLQuery | null = null;
    try {
      handle = gl.createQuery();
      if (handle) {
        gl.beginQuery(extension.TIME_ELAPSED_EXT, handle);
        return { query: handle, frameId: current.id, name };
      }
      skippedSamples++;
    } catch {
      if (handle) deleteQuery(handle);
      gpuStatus = 'unavailable';
    }
    return null;
  }

  function endGpu(query: GpuQuery | null, retain = true) {
    if (!query || !gl || !extension) return;
    try {
      gl.endQuery(extension.TIME_ELAPSED_EXT);
      if (retain) pending.push(query);
      else deleteQuery(query.query);
    } catch {
      deleteQuery(query.query);
      gpuStatus = 'unavailable';
    }
  }

  function cancelFrameQuery() {
    endGpu(frameQuery, false);
    frameQuery = null;
  }

  function pollQueries() {
    if (!gl || !extension) return;
    try {
      if (gl.isContextLost()) {
        gpuStatus = 'context-lost';
        discardPending();
        return;
      }
      if (gl.getParameter(extension.GPU_DISJOINT_EXT)) {
        gpuStatus = 'disjoint';
        discardPending();
        return;
      }
      gpuStatus = 'available';
      const unresolved: GpuQuery[] = [];
      const oldestId = frames[0]?.id ?? frameId;
      for (const item of pending) {
        if (item.frameId < oldestId) {
          deleteQuery(item.query);
          continue;
        }
        // Never request QUERY_RESULT until the driver reports it is ready,
        // and never poll a query in the frame in which it was submitted.
        if (
          item.frameId < frameId &&
          gl.getQueryParameter(item.query, gl.QUERY_RESULT_AVAILABLE)
        ) {
          const nanoseconds = gl.getQueryParameter(item.query, gl.QUERY_RESULT);
          if (typeof nanoseconds === 'number' && Number.isFinite(nanoseconds)) {
            gpuSamples.push({
              frameId: item.frameId,
              name: item.name,
              ms: Math.max(0, nanoseconds / 1e6),
            });
          }
          deleteQuery(item.query);
        } else {
          unresolved.push(item);
        }
      }
      pending = unresolved;
      gpuSamples = gpuSamples.filter((sample) => sample.frameId >= oldestId);
      // Also bounds memory if a caller uses many distinct passes per frame.
      if (gpuSamples.length > maxFrames * maxPending) {
        gpuSamples.splice(0, gpuSamples.length - maxFrames * maxPending);
      }
    } catch {
      gpuStatus = 'unavailable';
      discardPending();
      extension = null;
    }
  }

  function addPhase(name: string, end: number) {
    if (!current) return;
    current.cpuPhases[name] =
      (current.cpuPhases[name] ?? 0) + Math.max(0, end - lastMark);
    lastMark = end;
  }

  function endPass(name: string, info: SceneRenderCounts) {
    if (!current || !activePass || activePass.name !== name) return;
    const pass = activePass;
    activePass = null;
    endGpu(pass.query);
    const end = now();
    // beginPass already accounted for preceding work; render submission is
    // therefore part of this same partition and cannot be double-counted.
    addPhase(name, end);
    const total = (current.passes[name] ??= {
      calls: 0,
      triangles: 0,
      points: 0,
      lines: 0,
    });
    for (const key of countKeys) {
      total[key] += Math.max(0, info[key] - pass.counts[key]);
    }
  }

  return {
    beginFrame(rafNow: number, frameContext: Record<string, unknown>) {
      if (disposed) return;
      cancelActivePass();
      cancelFrameQuery();
      frameStart = now();
      lastMark = frameStart;
      frameId += 1;
      context = copyContext(frameContext);
      current = {
        id: frameId,
        rafNow,
        intervalMs:
          previousRaf === null ? null : Math.max(0, rafNow - previousRaf),
        cpuTotalMs: 0,
        cpuPhases: dictionary<number>(),
        passes: dictionary<SceneRenderCounts>(),
        counters: dictionary<number>(),
        activity:
          typeof frameContext.activity === 'string'
            ? frameContext.activity
            : 'unknown',
        context,
      };
      previousRaf = rafNow;
      pollQueries();
      addPhase('diagnostics', now());
    },
    mark(name: string) {
      if (!current || activePass) return;
      addPhase(name, now());
    },
    beginPass(name: string, info: SceneRenderCounts) {
      if (!current || activePass) return;
      const start = now();
      addPhase('unattributed', start);
      if (gpuScope === 'frame' && !frameQuery) frameQuery = beginGpu('frame');
      const query = gpuScope === 'passes' ? beginGpu(name) : null;
      activePass = { name, counts: { ...info }, query };
    },
    endPass,
    endGpuFrame() {
      endGpu(frameQuery);
      frameQuery = null;
    },
    count(name: string) {
      if (current) current.counters[name] = (current.counters[name] ?? 0) + 1;
    },
    annotate(values: Record<string, unknown>) {
      if (current) Object.assign(current.context, copyContext(values));
    },
    endFrame() {
      if (!current) return;
      // An incomplete pass has no trustworthy counter delta or GPU sample.
      if (activePass) cancelFrameQuery();
      cancelActivePass();
      const end = now();
      addPhase('unattributed', end);
      endGpu(frameQuery);
      frameQuery = null;
      current.cpuTotalMs = Math.max(0, end - frameStart);
      frames.push(current);
      if (frames.length > maxFrames) frames.shift();
      current = null;
    },
    reset(reason?: string) {
      cancelActivePass();
      cancelFrameQuery();
      discardPending();
      current = null;
      frames = [];
      gpuSamples = [];
      frameId = 0;
      previousRaf = null;
      context = {};
      resetReason = reason ?? null;
      discardedSamples = 0;
      skippedSamples = 0;
    },
    /** Whole-frame timing avoids inter-pass query boundaries on tiled GPUs.
     * It is mutually exclusive with pass queries; CPU/pass counters stay intact. */
    setGpuScope(scope: 'passes' | 'frame') {
      if (scope === gpuScope) return;
      this.reset('GPU timing scope changed');
      gpuScope = scope;
    },
    setWindowSize(limit: number) {
      // Longer recordings opt into a larger bounded window, then return to
      // the small live window. Resizing retention never changes capture identity.
      maxFrames = boundedInteger(limit, 1800, 14400);
      if (frames.length > maxFrames)
        frames.splice(0, frames.length - maxFrames);
      const oldest = frames[0]?.id ?? Infinity;
      gpuSamples = gpuSamples.filter((sample) => sample.frameId >= oldest);
    },
    snapshot(includeFrames = false): ScenePerformanceReport {
      const cpuValues = dictionary<number[]>();
      const passValues =
        dictionary<Record<keyof SceneRenderCounts, number[]>>();
      const counters = dictionary<number>();
      const activity = dictionary<{ frames: number; cpuMeanMs: number }>();
      for (const frame of frames) {
        for (const [name, ms] of Object.entries(frame.cpuPhases)) {
          (cpuValues[name] ??= []).push(ms);
        }
        for (const [name, counts] of Object.entries(frame.passes)) {
          const values = (passValues[name] ??= {
            calls: [],
            triangles: [],
            points: [],
            lines: [],
          });
          for (const key of countKeys) values[key].push(counts[key]);
        }
        for (const [name, count] of Object.entries(frame.counters)) {
          counters[name] = (counters[name] ?? 0) + count;
        }
        const group = (activity[frame.activity] ??= {
          frames: 0,
          cpuMeanMs: 0,
        });
        group.frames += 1;
        group.cpuMeanMs += frame.cpuTotalMs;
      }
      for (const group of Object.values(activity))
        group.cpuMeanMs /= group.frames;
      const cpuPhases = dictionary<ScenePerformanceStats>();
      for (const [name, values] of Object.entries(cpuValues))
        cpuPhases[name] = stats(values);
      const passes =
        dictionary<Record<keyof SceneRenderCounts, ScenePerformanceStats>>();
      for (const [name, values] of Object.entries(passValues)) {
        passes[name] = {
          calls: stats(values.calls),
          triangles: stats(values.triangles),
          points: stats(values.points),
          lines: stats(values.lines),
        };
      }
      const gpuValues = dictionary<number[]>();
      // Every observed pass gets an explicit null until a valid GPU timing is
      // available. Unsupported timing must never look like zero GPU work.
      const gpuPhases = dictionary<ScenePerformanceStats>();
      if (gpuScope === 'frame') gpuPhases.frame = null;
      else for (const name of Object.keys(passes)) gpuPhases[name] = null;
      const oldestId = frames[0]?.id ?? Infinity;
      const newestId = frames[frames.length - 1]?.id ?? -Infinity;
      for (const sample of gpuSamples) {
        if (sample.frameId >= oldestId && sample.frameId <= newestId) {
          (gpuValues[sample.name] ??= []).push(sample.ms);
        }
      }
      for (const [name, values] of Object.entries(gpuValues))
        gpuPhases[name] = stats(values);
      const durationMs =
        frames.length > 1
          ? frames[frames.length - 1].rafNow - frames[0].rafNow
          : 0;
      const report: ScenePerformanceReport = {
        schemaVersion: 1,
        window: {
          frames: frames.length,
          durationMs,
          renderedFps:
            durationMs > 0 ? ((frames.length - 1) * 1000) / durationMs : null,
        },
        frameInterval: stats(
          frames.flatMap((frame) =>
            frame.intervalMs === null ? [] : [frame.intervalMs],
          ),
        ),
        cpuTotal: stats(frames.map((frame) => frame.cpuTotalMs)),
        cpuPhases,
        gpu: {
          status: gpuStatus,
          scope: gpuScope,
          phases: gpuPhases,
          pending: pending.length,
          sampleEvery,
          discardedSamples,
          skippedSamples,
        },
        passes,
        counters,
        context: copyContext(context),
        activity,
        resetReason,
        limitations: [
          'CPU timings measure elapsed frame-callback time, including WebGL submission; they are not CPU utilization or whole-page work.',
          'GPU timings are asynchronous samples; unsupported or unsampled timings are null. CPU and GPU times overlap and must not be added.',
          'This report cannot measure device temperature, power consumption, or thermal throttling.',
          'Pass counters require cumulative renderer.info counters (autoReset disabled) across each measured pass.',
          'Per-phase statistics describe frames where that phase ran; compare sample counts and AO invalidation counters before prioritizing.',
        ],
      };
      if (includeFrames) {
        report.gpu.samples = gpuSamples
          .filter(
            (sample) =>
              sample.frameId >= oldestId && sample.frameId <= newestId,
          )
          .map((sample) => ({ ...sample }));
        report.frames = frames.map((frame) => ({
          ...frame,
          cpuPhases: { ...frame.cpuPhases },
          passes: Object.fromEntries(
            Object.entries(frame.passes).map(([name, counts]) => [
              name,
              { ...counts },
            ]),
          ),
          counters: { ...frame.counters },
          context: copyContext(frame.context),
        }));
      }
      return report;
    },
    dispose() {
      cancelActivePass();
      cancelFrameQuery();
      discardPending();
      current = null;
      disposed = true;
      gpuStatus = 'disposed';
    },
  };
}

export type ScenePerformance = ReturnType<typeof createScenePerformance>;
