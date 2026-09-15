import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateDiffuseProbe, fitDiffuseProbe } from '../../scripts/benchmarks/diffuse-probe-fit.mjs';

function directions(count, phase = 0) {
  const result = [];
  for (let i = 0; i < count; i++) {
    const z = 1 - 2 * (i + 0.5) / count;
    const r = Math.sqrt(1 - z * z), angle = (i + phase) * Math.PI * (3 - Math.sqrt(5));
    result.push(r * Math.cos(angle), r * Math.sin(angle), z);
  }
  return result;
}
function fixture(count, evaluate, phase = 0) {
  const points = directions(count, phase);
  return { directions: points, radiance: Array.from({ length: count }, (_, i) => evaluate(points.slice(i * 3, i * 3 + 3))).flat() };
}
const near = (actual, expected, tolerance = 1e-11) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from${expected}`);
const coefficients = [[2, 3, 4], [.1, -.2, .3], [-.15, .12, .07], [.3, .1, -.2], [.08, .09, .1], [-.05, .06, .03], [.09, -.04, .12], [.11, .07, -.08], [.05, .08, .03]];
// Keep this independent of the implementation's basis evaluation.
function polynomial([x, y, z]) {
  return [0, 1, 2].map((c) => coefficients[0][c] + coefficients[1][c] * x + coefficients[2][c] * y + coefficients[3][c] * z + coefficients[4][c] * x * y + coefficients[5][c] * y * z + coefficients[6][c] * (3 * z * z - 1) + coefficients[7][c] * x * z + coefficients[8][c] * (x * x - y * y));
}

test('reconstructs all nine polynomial terms and validates independently held-out directions', () => {
  const input = fixture(128, polynomial);
  const before = structuredClone(input);
  const fit = fitDiffuseProbe(input);
  assert.deepEqual(input, before);
  assert.equal(fit.schemaVersion, 1);
  assert.equal(fit.basis, 'polynomial-sh2');
  for (let i = 0; i < 9; i++) for (let channel = 0; channel < 3; channel++) near(fit.coefficients[i][channel], coefficients[i][channel]);
  const heldOut = directions(257, .371);
  for (let i = 0; i < heldOut.length; i += 3) {
    const direction = heldOut.slice(i, i + 3), expected = polynomial(direction);
    evaluateDiffuseProbe(fit.coefficients, direction).forEach((value, channel) => near(value, expected[channel]));
  }
  assert.ok(fit.stats.rmsError.every((value) => value < 1e-12));
  assert.ok(fit.stats.maxError.every((value) => value < 1e-11));
  assert.equal(fit.stats.negativePredictions, 0);
  assert.ok(Number.isFinite(fit.stats.fitMs) && fit.stats.fitMs >= 0);
  assert.ok(fit.stats.normalMatrixConditionNumber >= 1);
});

test('constant and zero channels retain their scale without a second irradiance convolution', () => {
  const fit = fitDiffuseProbe(fixture(64, () => [2.5, 0, 17]));
  fit.coefficients[0].forEach((value, channel) => near(value, [2.5, 0, 17][channel]));
  for (const row of fit.coefficients.slice(1)) for (const value of row) near(value, 0);
  assert.equal(fit.stats.relativeRmsError[1], null);
  evaluateDiffuseProbe(fit.coefficients, [0, 1, 0]).forEach((value, channel) => near(value, [2.5, 0, 17][channel]));
  assert.ok(fit.limits.some((value) => value.includes('no additional SH convolution')));
});

test('reports approximation residuals and raw negative predictions without silently clamping', () => {
  const input = fixture(96, ([, , z]) => z > .96 ? [1, 2, 3] : [0, 0, 0]);
  const fit = fitDiffuseProbe(input);
  assert.ok(fit.stats.rmsError.every((value) => value > 0));
  assert.ok(fit.stats.maxError.every((value) => value > 0));
  assert.ok(fit.stats.negativePredictions > 0);
  assert.equal(fit.stats.negativePredictions, fit.stats.negativePredictionsByChannel.reduce((sum, value) => sum + value, 0));
  assert.ok(fit.stats.samplesWithNegativePredictions > 0);
  fit.stats.relativeRmsError.forEach((value, channel) => near(value, fit.stats.rmsError[channel] / fit.stats.referenceRms[channel]));
  const negative = Array.from({ length: 9 }, () => [0, 0, 0]);
  negative[0] = [-1, 0, 2];
  assert.deepEqual(evaluateDiffuseProbe(negative, [0, 0, 1]), [-1, 0, 2]);
});

test('supports the minimum sample count when the direction set spans the basis', () => {
  const fit = fitDiffuseProbe(fixture(9, polynomial));
  assert.equal(fit.stats.samples, 9);
  for (const direction of [[1, 0, 0], [0, 1, 0], [0, 0, -1]])
    evaluateDiffuseProbe(fit.coefficients, direction).forEach((value, channel) => near(value, polynomial(direction)[channel]));
});

test('rejects singular and near-singular direction sets instead of fabricating coefficients', () => {
  const singular = { directions: Array.from({ length: 12 }, () => [0, 0, 1]).flat(), radiance: Array(36).fill(1) };
  assert.throws(() => fitDiffuseProbe(singular), /[Ss]ingular|ill-conditioned/);
  const concentrated = fixture(32, () => [1, 1, 1]);
  concentrated.directions = Array.from({ length: 32 }, (_, i) => {
    const angle = i * .73, r = .001 * (i + 1) / 32;
    return [r * Math.cos(angle), r * Math.sin(angle), Math.sqrt(1 - r * r)];
  }).flat();
  assert.throws(() => fitDiffuseProbe(concentrated), /[Ss]ingular|[Ii]ll-conditioned/);
  assert.throws(() => fitDiffuseProbe(fixture(64, polynomial), { maxConditionNumber: 1 }), /[Ii]ll-conditioned/);
});

test('rejects malformed inputs, invalid unit vectors and oversized work before solving', () => {
  const valid = fixture(12, () => [1, 1, 1]);
  for (const input of [undefined, {}, { ...valid, radiance: valid.radiance.slice(1) },
    { ...valid, radiance: [-1, ...valid.radiance.slice(1)] },
    { ...valid, radiance: [NaN, ...valid.radiance.slice(1)] },
    { ...valid, directions: [Infinity, ...valid.directions.slice(1)] },
    { ...valid, directions: [0, 0, 0, ...valid.directions.slice(3)] },
    { ...valid, directions: [2, 0, 0, ...valid.directions.slice(3)] },
    fixture(8, () => [1, 1, 1]),
    { directions: new Float32Array(65_537 * 3), radiance: new Float32Array(65_537 * 3) }])
    assert.throws(() => fitDiffuseProbe(input));
  for (const options of [{ maxConditionNumber: NaN }, { maxConditionNumber: 1e13 }, { minRelativePivot: 0 }, { minRelativePivot: .1 }])
    assert.throws(() => fitDiffuseProbe(valid, options), /conditioning limits/);
  assert.throws(() => evaluateDiffuseProbe([], [1, 0, 0]));
  assert.throws(() => evaluateDiffuseProbe(coefficients, [1, 0]));
  assert.throws(() => evaluateDiffuseProbe(coefficients, [0, 0, 0]));
});

test('accepts small unit-vector roundoff without mutating or normalizing supplied samples', () => {
  const input = fixture(64, polynomial);
  for (let i = 0; i < input.directions.length; i++) input.directions[i] *= 1 + 2e-5;
  input.radiance = Array.from({ length: 64 }, (_, i) => polynomial(input.directions.slice(i * 3, i * 3 + 3))).flat();
  const original = structuredClone(input);
  const fit = fitDiffuseProbe(input);
  assert.deepEqual(input, original);
  for (let i = 0; i < 9; i++) for (let channel = 0; channel < 3; channel++) near(fit.coefficients[i][channel], coefficients[i][channel]);
});
