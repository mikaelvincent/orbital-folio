/** Synchronous warmup/timing boundary. No telemetry, await, or GC is permitted
 * between the selected-variant prelude and its measured repeated work. */
const clock = () => Number(process.hrtime.bigint()) / 1e6;
const processCpu = () => process.cpuUsage();
const threadCpu =
  typeof process.threadCpuUsage === 'function'
    ? process.threadCpuUsage.bind(process)
    : null;

export function runUntimedPrelude(
  fixture,
  variant,
  durationMs = 0,
  now = clock,
) {
  fixture.reset();
  const eligible = fixture.kind !== 'construction' && durationMs > 0;
  const result = {
    requestedMs: durationMs,
    applied: eligible,
    elapsedMs: 0,
    operations: 0,
    reason:
      fixture.kind === 'construction'
        ? 'excluded: model construction stays fully timed'
        : durationMs
          ? 'fixed-duration selected-variant warmup; does not prove stabilization'
          : 'disabled: no-prelude behavior',
  };
  if (!eligible) return result;
  const action = variant === 'A' ? fixture.reference : fixture.candidate;
  const start = now();
  do {
    action(result.operations++);
    result.elapsedMs = now() - start;
  } while (result.elapsedMs < durationMs);
  // Reset changing lighting/iris inputs to the same logical start for A and B.
  fixture.reset();
  return result;
}
function cpuDifference(before, after) {
  if (!before || !after) return null;
  const userUs = after.user - before.user,
    systemUs = after.system - before.system;
  return { userUs, systemUs, totalMs: (userUs + systemUs) / 1000 };
}

export function runControlledKernel(
  fixture,
  variant,
  iterations,
  options = {},
) {
  const now = options.now ?? clock;
  const getProcessCpu =
    options.processCpu === undefined ? processCpu : options.processCpu;
  const getThreadCpu =
    options.threadCpu === undefined ? threadCpu : options.threadCpu;
  const prelude = runUntimedPrelude(
    fixture,
    variant,
    options.preludeMs ?? 0,
    now,
  );
  // Counter getter overhead is outside the wall timer. CPU deltas can include
  // small boundary overhead; process totals include all Node process threads.
  const processBefore = getProcessCpu?.() ?? null;
  const threadBefore = getThreadCpu?.() ?? null;
  const action = variant === 'A' ? fixture.reference : fixture.candidate;
  let detail;
  const start = now();
  for (let index = 0; index < iterations; index++) detail = action(index);
  const elapsedMs = now() - start;
  const threadAfter = getThreadCpu?.() ?? null;
  const processAfter = getProcessCpu?.() ?? null;
  return {
    elapsedMs,
    meanMs: elapsedMs / iterations,
    prelude,
    cpu: {
      process: cpuDifference(processBefore, processAfter),
      thread: cpuDifference(threadBefore, threadAfter),
      threadAvailability: getThreadCpu
        ? 'available'
        : 'unavailable in this Node runtime',
      interpretation:
        'Secondary diagnostics only; never used to correct timings or accept/reject blocks. Process totals can exceed wall time across threads.',
    },
    ...(fixture.kind === 'construction' ? { stages: detail } : {}),
  };
}
