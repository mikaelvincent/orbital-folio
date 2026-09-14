export function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}
export function shuffle(items, random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function balancedOrders(blocks, random) {
  if (!Number.isInteger(blocks) || blocks < 2 || blocks % 2)
    throw new Error('Block count must be an even integer >=2.');
  return shuffle(
    Array.from({ length: blocks }, (_, i) =>
      i % 2 ? ['B', 'A', 'A', 'B'] : ['A', 'B', 'B', 'A'],
    ),
    random,
  );
}
export function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}
export function controlStability(values, limit = 0.05) {
  if (
    values.length < 2 ||
    values.some((value) => !Number.isFinite(value) || value <= 0)
  )
    return { stable: false, reason: 'invalid-or-insufficient-controls' };
  const center = median(values);
  const spreadFraction = (Math.max(...values) - Math.min(...values)) / center;
  const endToEndFraction = (values.at(-1) - values[0]) / center;
  const monotonic =
    values.every((v, i) => !i || v >= values[i - 1]) ||
    values.every((v, i) => !i || v <= values[i - 1]);
  const trend =
    values.length >= 3 && monotonic && Math.abs(endToEndFraction) > limit / 2;
  return {
    stable: spreadFraction <= limit && !trend,
    medianMs: center,
    spreadFraction,
    endToEndFraction,
    monotonic,
    reason:
      spreadFraction > limit
        ? 'control-spread-exceeds-limit'
        : trend
          ? 'monotonic-control-drift'
          : null,
  };
}
export function thermalIssue(snapshot, requireKnown) {
  const state = snapshot?.telemetry?.thermalState ?? 'unavailable';
  if (state === 'nominal') return null;
  if (['fair', 'serious', 'critical'].includes(state))
    return `thermal-pressure-${state}`;
  return requireKnown ? 'thermal-pressure-unavailable' : null;
}
export function summarizeBlocks(blocks) {
  const accepted = blocks.filter((block) => block.accepted);
  const points = accepted.map((block) => {
    const mean = (variant) => {
      const values = block.samples
        .filter((s) => s.variant === variant)
        .map((s) => s.meanMs);
      return values.reduce((a, b) => a + b, 0) / values.length;
    };
    const referenceMs = mean('A'),
      candidateMs = mean('B');
    return {
      block: block.block,
      referenceMs,
      candidateMs,
      differenceMs: candidateMs - referenceMs,
      ratio: candidateMs / referenceMs,
      order: block.order.join(''),
    };
  });
  return {
    acceptedBlocks: accepted.length,
    rejectedAttempts: blocks.length - accepted.length,
    pairs: points,
    medianCandidateReferenceRatio: median(points.map((p) => p.ratio)),
    medianDifferenceMs: median(points.map((p) => p.differenceMs)),
    referenceFasterBlocks: points.filter((p) => p.ratio > 1).length,
    candidateFasterBlocks: points.filter((p) => p.ratio < 1).length,
    limitation:
      'Descriptive paired blocks only; no automatic production decision or inferred device temperature/FPS. A small effect inside observed variation remains inconclusive.',
  };
}
