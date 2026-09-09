import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
const sections = ['projects', 'experience', 'about', 'contact'];
const parse = (d) => {
  if (typeof d !== 'string' || !/^[\sML0-9eE+.,-]+$/.test(d))
    throw new Error('Expected absolute M/L-only path.');
  const t = d.match(/[ML]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g) || [];
  if (t.length !== 9 || t[0] !== 'M' || t[3] !== 'L' || t[6] !== 'L')
    throw new Error('Expected exactly M a L b L c.');
  return [1, 4, 7].map((i) => {
    const p = [Number(t[i]), Number(t[i + 1])];
    if (!p.every(Number.isFinite)) throw new Error('Non-finite point.');
    return p;
  });
};
const intersects = (a, b, rect, pad = 8) => {
  let lo = 0,
    hi = 1;
  const dx = b[0] - a[0],
    dy = b[1] - a[1];
  const p = [-dx, dx, -dy, dy],
    q = [
      a[0] - rect.left + pad,
      rect.right + pad - a[0],
      a[1] - rect.top + pad,
      rect.bottom + pad - a[1],
    ];
  for (let i = 0; i < 4; i++) {
    if (Math.abs(p[i]) < 1e-12) {
      if (q[i] < 0) return false;
      continue;
    }
    const t = q[i] / p[i];
    if (p[i] < 0) lo = Math.max(lo, t);
    else hi = Math.min(hi, t);
    if (lo > hi) return false;
  }
  return true;
};
const geometry = (p) => {
  const a = [p[1][0] - p[0][0], p[1][1] - p[0][1]],
    b = [p[2][0] - p[1][0], p[2][1] - p[1][1]],
    l1 = Math.hypot(...a),
    l2 = Math.hypot(...b);
  if (l1 < 1e-6 || l2 < 1e-6) throw new Error('Degenerate segment.');
  return {
    firstLength: l1,
    secondLength: l2,
    turnDegrees:
      (Math.acos(
        Math.max(-1, Math.min(1, (a[0] * b[0] + a[1] * b[1]) / (l1 * l2))),
      ) *
        180) /
      Math.PI,
  };
};
// Analytical self-checks validate clipping, tangency, padding and the template metric.
const testRect = { left: 10, right: 20, top: 10, bottom: 20 };
assert(intersects([0, 15], [30, 15], testRect, 0));
assert(!intersects([0, 0], [0, 30], testRect, 0));
assert(intersects([0, 10], [10, 10], testRect, 0));
assert(intersects([3, 0], [3, 30], testRect, 8));
assert(!intersects([1, 0], [1, 30], testRect, 8));
assert(
  Math.abs(geometry(parse('M 0 0 L 20 20 L 20 36')).turnDegrees - 45) < 1e-10,
);
const input = process.argv[2];
if (!input)
  throw new Error('Usage: node script.mjs browser-qa.json [output.json]');
const raw = JSON.parse(readFileSync(input, 'utf8'));
const records = Array.isArray(raw) ? raw : raw.records || raw.cases || [];
const states = [],
  skipped = [],
  failures = [];
for (const r of records) {
  let meta = r.renderer || {};
  if (typeof meta === 'string') meta = JSON.parse(meta);
  const active = r.activeRoom || meta.activeRoom || meta.active;
  const travelling = r.travelling ?? meta.travelling;
  if (
    (active && active !== 'home') ||
    travelling === true ||
    travelling === 'true'
  ) {
    skipped.push({
      name: r.name,
      reason:
        'Selected room or travelling; settled overview invariants not applicable.',
    });
    continue;
  }
  const mode = r.connectorLayout || r.layout;
  if (!['mirrored-template', 'mirrored-rails'].includes(mode)) {
    skipped.push({ name: r.name, reason: 'No supported connector layout.' });
    continue;
  }
  const paths = r.paths || [];
  const state = {
    name: r.name,
    viewport: r.viewport,
    mode,
    geometry: [],
    segmentObstacleTests: 0,
    failures: [],
  };
  try {
    if (paths.length !== 4) throw new Error('Expected four paths.');
    const points = paths.map((p) => parse(typeof p === 'string' ? p : p.d));
    state.geometry = points.map((p, i) => ({
      section: sections[i],
      ...geometry(p),
    }));
    if (mode === 'mirrored-template') {
      for (const key of ['firstLength', 'secondLength', 'turnDegrees']) {
        const v = state.geometry.map((g) => g[key]),
          spread = Math.max(...v) - Math.min(...v);
        if (spread > 0.02)
          state.failures.push({
            kind: 'Landscape equality',
            metric: key,
            spread,
            tolerance: 0.02,
          });
      }
      for (const g of state.geometry)
        if (Math.abs(g.turnDegrees - 45) > 0.02)
          state.failures.push({
            kind: 'Landscape turn',
            section: g.section,
            actual: g.turnDegrees,
            expected: 45,
          });
    } else {
      let solar = r.solar || r.solarBounds || [];
      if (typeof solar === 'string') solar = JSON.parse(solar);
      if (solar.length !== 2)
        throw new Error('Expected both solar-panel rectangles.');
      for (const rect of solar) {
        if (
          !['left', 'right', 'top', 'bottom'].every((k) =>
            Number.isFinite(rect[k]),
          ) ||
          rect.left >= rect.right ||
          rect.top >= rect.bottom
        )
          throw new Error('Invalid solar rectangle.');
        for (const [i, p] of points.entries())
          for (let segment = 0; segment < 2; segment++) {
            state.segmentObstacleTests++;
            if (intersects(p[segment], p[segment + 1], rect, 8))
              state.failures.push({
                kind: 'Solar clearance',
                section: sections[i],
                segment: segment + 1,
                panel: rect.name,
                padding: 8,
              });
          }
      }
    }
  } catch (error) {
    state.failures.push({
      kind: 'Malformed evidence',
      message: String(error.message),
    });
  }
  state.passed = state.failures.length === 0;
  states.push(state);
  for (const f of state.failures) failures.push({ state: r.name, ...f });
}
if (!states.length) failures.push({ kind: 'No settled overview evidence' });
const result = {
  scope:
    'Independent audit of recorded actual SVG paths and projected solar rectangles. Four M/L/L paths; landscape segment lengths/45-degree turns; portrait both-segment clearance against both rectangles inflated 8px. Does not certify screenshots, hidden geometry, typography or unrecorded motion.',
  input,
  selfChecksPassed: true,
  states,
  skipped,
  failures,
  summary: {
    states: states.length,
    landscape: states.filter((s) => s.mode === 'mirrored-template').length,
    portrait: states.filter((s) => s.mode === 'mirrored-rails').length,
    portraitSegmentObstacleTests: states.reduce(
      (n, s) => n + s.segmentObstacleTests,
      0,
    ),
  },
  passed: failures.length === 0,
};
const output = process.argv[3] || '/tmp/leader-routing-critic-audit.json';
writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
console.log(
  JSON.stringify(
    { output, passed: result.passed, ...result.summary, failures },
    null,
    2,
  ),
);
if (!result.passed) process.exitCode = 1;
