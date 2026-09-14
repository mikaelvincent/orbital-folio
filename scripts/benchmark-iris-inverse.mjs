import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { createSpacecraft } from '../components/spacecraft-model.ts';
import { createExactMatrixInverse } from './benchmarks/exact-matrix-inverse-candidate.ts';

const model = createSpacecraft(THREE);
const sources = model.group.userData.irisHatches.map((hatch) =>
  hatch.matrixWorld.clone(),
);
function fixture(cached, moving, count = false) {
  const entries = sources.map((matrix) => {
    const source = matrix.clone(),
      target = new THREE.Matrix4();
    return {
      source,
      target,
      update: cached
        ? createExactMatrixInverse(source, target)
        : () => {
            target.copy(source).invert();
          },
    };
  });
  let inversions = 0;
  if (count)
    for (const { target } of entries)
      target.invert = function () {
        inversions++;
        return THREE.Matrix4.prototype.invert.call(this);
      };
  return {
    inversions: () => inversions,
    frame(index) {
      for (const entry of entries) {
        if (moving) entry.source.elements[12] = index * 0.001;
        for (let leaf = 0; leaf < 6; leaf++) entry.update();
      }
    },
  };
}
function measure(action, iterations) {
  const start = performance.now();
  for (let index = 0; index < iterations; index++) action.frame(index);
  return (performance.now() - start) / iterations;
}
function sequence(moving) {
  const a = fixture(false, moving),
    b = fixture(true, moving);
  measure(a, 2000);
  measure(b, 2000);
  const runs = [];
  for (const variant of [
    'reference',
    'candidate',
    'candidate',
    'reference',
    'reference',
    'candidate',
    'candidate',
    'reference',
  ]) {
    runs.push({
      variant,
      meanMsPerFrame: measure(variant === 'reference' ? a : b, 10000),
    });
  }
  const mean = (variant) =>
    runs
      .filter((run) => run.variant === variant)
      .reduce((sum, run) => sum + run.meanMsPerFrame, 0) / 4;
  const countedA = fixture(false, moving, true),
    countedB = fixture(true, moving, true);
  for (let frame = 0; frame < 100; frame++) {
    countedA.frame(frame);
    countedB.frame(frame);
  }
  return {
    runs,
    referenceMeanMs: mean('reference'),
    candidateMeanMs: mean('candidate'),
    differenceMs: mean('candidate') - mean('reference'),
    inversionsOver100Frames: {
      reference: countedA.inversions(),
      candidate: countedB.inversions(),
    },
  };
}
const irisSource = await readFile(
  new URL('../components/iris-hatch.ts', import.meta.url),
);
const report = {
  recordedAt: new Date().toISOString(),
  node: process.version,
  threeRevision: THREE.REVISION,
  irisSourceSha256: createHash('sha256').update(irisSource).digest('hex'),
  hatches: sources.length,
  leavesPerHatch: 6,
  framesPerRun: 10000,
  methodology:
    'Quiet Node CPU microbenchmark after root reported browser blank and no build/tests. Real model hatch world matrices, six callbacks per hatch; ABBA/ABBA after 2000 warmup frames each. Moving changes source translation every frame. Inversion counters measured separately, never inside timed loops. Does not measure GPU/FPS/power or whole callback savings.',
  settled: sequence(false),
  moving: sequence(true),
};
const json = JSON.stringify(report, null, 2) + '\n';
const output = process.argv.find((arg) => arg.startsWith('--out='))?.slice(6);
if (output) {
  const path = resolve(output);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, json);
}
process.stdout.write(json);
