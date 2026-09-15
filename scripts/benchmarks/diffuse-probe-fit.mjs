import { readFile, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';

const BASIS_SIZE = 9;
const MIN_SAMPLES = BASIS_SIZE;
const MAX_SAMPLES = 65_536;
const UNIT_TOLERANCE = 1e-4;

function directionBasis(direction, offset = 0) {
  const x = direction[offset], y = direction[offset + 1], z = direction[offset + 2];
  if (![x, y, z].every(Number.isFinite) || Math.abs(Math.hypot(x, y, z) - 1) > UNIT_TOLERANCE)
    throw new Error('Directions must be finite unit vectors within 1e-4 length tolerance.');
  return [1, x, y, z, x * y, y * z, 3 * z * z - 1, x * z, x * x - y * y];
}

function multiply(coefficients, basis) {
  const rgb = [0, 0, 0];
  for (let i = 0; i < BASIS_SIZE; i++)
    for (let channel = 0; channel < 3; channel++) rgb[channel] += coefficients[i][channel] * basis[i];
  return rgb;
}

/** Evaluate the fitted polynomial without clamping, preserving negative values
 * for error analysis. The runtime shader may choose max(vec3(0), prediction).
 */
export function evaluateDiffuseProbe(coefficients, direction) {
  if (!Array.isArray(coefficients) || coefficients.length !== BASIS_SIZE ||
    coefficients.some((row) => !row || row.length !== 3 || !Array.from(row).every(Number.isFinite)))
    throw new Error('Coefficients must contain nine finite RGB vectors.');
  if (!direction || direction.length !== 3) throw new Error('A direction requires three components.');
  return multiply(coefficients, directionBasis(direction));
}

/**
 * Fit an already-convolved PMREM roughness1 lobe, sampled as linear RGB in
 * environment-map direction space. This polynomial spans real SH through
 * degree2, with an explicit unnormalized basis shared with the shader:
 * [1,x,y,z,xy,yz,3z²-1,xz,x²-y²]. Do not convolve these coefficients again.
 *
 * Pivoted double-precision normal equations are sufficient for this small,
 * bounded, well-distributed spherical fit. Reject poorly conditioned direction
 * sets instead of regularizing them and silently changing the approximation.
 */
export function fitDiffuseProbe(input, options = {}) {
  const start = performance.now();
  const directions = input?.directions, radiance = input?.radiance;
  const count = directions?.length / 3;
  if (!Number.isSafeInteger(count) || count < MIN_SAMPLES || count > MAX_SAMPLES)
    throw new Error(`Sample count must be between ${MIN_SAMPLES} and ${MAX_SAMPLES}.`);
  if (!radiance || radiance.length !== directions.length)
    throw new Error('Radiance must provide one RGB vector per direction.');
  if (Array.from(radiance).some((value) => !Number.isFinite(value) || value < 0))
    throw new Error('Radiance must be finite, nonnegative linear RGB.');
  const maxConditionNumber = options.maxConditionNumber ?? 1e8;
  const minRelativePivot = options.minRelativePivot ?? 1e-12;
  if (!Number.isFinite(maxConditionNumber) || maxConditionNumber < 1 || maxConditionNumber > 1e12 ||
    !Number.isFinite(minRelativePivot) || minRelativePivot < 1e-15 || minRelativePivot > 1e-2)
    throw new Error('Invalid conditioning limits.');

  const gram = Array.from({ length: BASIS_SIZE }, () => Array(BASIS_SIZE).fill(0));
  const rhs = Array.from({ length: BASIS_SIZE }, () => [0, 0, 0]);
  const bases = [];
  for (let sample = 0; sample < count; sample++) {
    const basis = directionBasis(directions, sample * 3);
    bases.push(basis);
    for (let row = 0; row < BASIS_SIZE; row++) {
      for (let col = 0; col < BASIS_SIZE; col++) gram[row][col] += basis[row] * basis[col] / count;
      for (let channel = 0; channel < 3; channel++) rhs[row][channel] += basis[row] * (radiance[sample * 3 + channel] / count);
    }
  }
  if (rhs.some((row) => row.some((value) => !Number.isFinite(value))))
    throw new Error('Radiance magnitude overflowed the fit.');
  const matrixNorm = Math.max(...gram.map((row) => row.reduce((sum, value) => sum + Math.abs(value), 0)));
  const largestEntry = Math.max(...gram.flat().map(Math.abs));
  // Append RGB right-hand sides and an identity matrix; the solved inverse
  // supplies a useful infinity-norm condition estimate for the normal matrix.
  const work = gram.map((row, i) => [...row, ...rhs[i], ...Array.from({ length: BASIS_SIZE }, (_, j) => +(i === j))]);
  let minimumPivot = Infinity;
  for (let column = 0; column < BASIS_SIZE; column++) {
    let pivotRow = column;
    for (let row = column + 1; row < BASIS_SIZE; row++)
      if (Math.abs(work[row][column]) > Math.abs(work[pivotRow][column])) pivotRow = row;
    const magnitude = Math.abs(work[pivotRow][column]);
    minimumPivot = Math.min(minimumPivot, magnitude);
    if (!Number.isFinite(magnitude) || magnitude <= minRelativePivot * largestEntry)
      throw new Error('Singular or ill-conditioned direction set: insufficient independent spherical coverage.');
    [work[column], work[pivotRow]] = [work[pivotRow], work[column]];
    const divisor = work[column][column];
    for (let j = 0; j < work[column].length; j++) work[column][j] /= divisor;
    for (let row = 0; row < BASIS_SIZE; row++) {
      if (row === column) continue;
      const factor = work[row][column];
      for (let j = 0; j < work[row].length; j++) work[row][j] -= factor * work[column][j];
    }
  }
  const inverseNorm = Math.max(...work.map((row) => row.slice(BASIS_SIZE + 3).reduce((sum, value) => sum + Math.abs(value), 0)));
  const conditionNumber = matrixNorm * inverseNorm;
  if (!Number.isFinite(conditionNumber) || conditionNumber > maxConditionNumber)
    throw new Error(`Ill-conditioned direction set: normal-matrix condition ${conditionNumber} exceeds ${maxConditionNumber}.`);
  const coefficients = work.map((row) => row.slice(BASIS_SIZE, BASIS_SIZE + 3));
  if (coefficients.some((row) => row.some((value) => !Number.isFinite(value))))
    throw new Error('Non-finite fitted coefficients.');

  const squaredError = [0, 0, 0], squaredReference = [0, 0, 0];
  const maxError = [0, 0, 0], negativePredictionsByChannel = [0, 0, 0];
  let samplesWithNegativePredictions = 0;
  for (let sample = 0; sample < count; sample++) {
    const prediction = multiply(coefficients, bases[sample]);
    let negative = false;
    for (let channel = 0; channel < 3; channel++) {
      const reference = radiance[sample * 3 + channel];
      const error = prediction[channel] - reference;
      squaredError[channel] += error * error / count;
      squaredReference[channel] += reference * reference / count;
      maxError[channel] = Math.max(maxError[channel], Math.abs(error));
      if (prediction[channel] < 0) { negative = true; negativePredictionsByChannel[channel]++; }
    }
    if (negative) samplesWithNegativePredictions++;
  }
  if ([...squaredError, ...squaredReference, ...maxError].some((value) => !Number.isFinite(value)))
    throw new Error('Radiance magnitude overflowed error statistics.');
  const rmsError = squaredError.map(Math.sqrt);
  const referenceRms = squaredReference.map(Math.sqrt);
  return {
    schemaVersion: 1,
    basis: 'polynomial-sh2',
    coefficients,
    stats: {
      samples: count,
      rmsError,
      maxError,
      referenceRms,
      relativeRmsError: rmsError.map((error, channel) => referenceRms[channel] > 0 ? error / referenceRms[channel] : null),
      negativePredictions: negativePredictionsByChannel.reduce((sum, value) => sum + value, 0),
      negativePredictionsByChannel,
      samplesWithNegativePredictions,
      normalMatrixConditionNumber: conditionNumber,
      minimumRelativePivot: minimumPivot / largestEntry,
      fitMs: performance.now() - start,
    },
    limits: [
      'Fits already-convolved PMREM roughness1 linear RGB; no additional SH convolution or color-space conversion is applied.',
      'Basis order is [1,x,y,z,x*y,y*z,3*z*z-1,x*z,x*x-y*y]; directions are used as supplied within 1e-4 unit-length tolerance.',
      'Coefficients approximate a global environment-direction field, not surface contact, occlusion, local bounce or final material color.',
      'Fit error uses unclamped predictions on the training samples; independent held-out direction and rendered-view validation remain necessary.',
      'Relative RMS divides per-channel error RMS by reference RMS; a zero-reference channel reports null.',
      'An unconstrained low-order fit can predict negative values; runtime clamping changes its approximation and must be evaluated separately.',
      `Accepts ${MIN_SAMPLES}–${MAX_SAMPLES} samples; normal-matrix infinity-norm condition must not exceed ${maxConditionNumber}.`,
    ],
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [inputPath, outputPath, ...extra] = process.argv.slice(2);
  if (!inputPath || !outputPath || extra.length) {
    console.error('Usage: node scripts/benchmarks/diffuse-probe-fit.mjs input.json output.json');
    process.exitCode = 1;
  } else {
    try {
      const input = JSON.parse(await readFile(inputPath, 'utf8'));
      const result = fitDiffuseProbe(input);
      await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
      console.log(JSON.stringify(result.stats, null, 2));
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
  }
}
