import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import * as THREE from 'three';
import { createSpacecraft } from '../features/spacecraft/spacecraft-model.ts';
import { updateRoomMaterialLighting } from './benchmarks/material-lighting-candidate.ts';
import { installLocalTransformCache } from './benchmarks/local-transform-cache-candidate.ts';

const selected =
  process.argv.find((arg) => arg.startsWith('--case='))?.slice(7) || 'all';
const output = process.argv.find((arg) => arg.startsWith('--out='))?.slice(6);
const sourceFile = new URL(
  '../features/spacecraft/spacecraft-model.ts',
  import.meta.url,
);
const source = await readFile(sourceFile);
const sourceHashes = Object.fromEntries(
  await Promise.all(
    [
      '../features/spacecraft/spacecraft-model.ts',
      '../features/spacecraft/geometry/model-primitives.ts',
      '../features/spacecraft/equipment/docking-service-assemblies.ts',
    ].map(async (path) => [
      path.slice(3),
      createHash('sha256')
        .update(await readFile(new URL(path, import.meta.url)))
        .digest('hex'),
    ]),
  ),
);
const model = createSpacecraft(THREE);

function timing(action, iterations) {
  const start = performance.now();
  for (let index = 0; index < iterations; index++) action(index);
  return (performance.now() - start) / iterations;
}

function abba(before, after, iterations) {
  timing(before, 1000);
  timing(after, 1000);
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
      meanMs: timing(variant === 'reference' ? before : after, iterations),
    });
  }
  const mean = (variant) =>
    runs
      .filter((run) => run.variant === variant)
      .reduce((sum, run) => sum + run.meanMs, 0) / 4;
  return {
    iterationsPerRun: iterations,
    runs,
    referenceMeanMs: mean('reference'),
    candidateMeanMs: mean('candidate'),
    differenceMs: mean('candidate') - mean('reference'),
  };
}

const result = {
  recordedAt: new Date().toISOString(),
  node: process.version,
  threeRevision: THREE.REVISION,
  source: sourceFile.pathname,
  sourceSha256: createHash('sha256').update(source).digest('hex'),
  sourceHashes,
  methodology:
    'Node CPU microbenchmark, no browser/GPU rendering. Four samples per version in ABBA/ABBA order after 1000 warmup iterations each. Results measure only the isolated operation and do not establish FPS, GPU, temperature, or power improvement.',
  measurements: {},
};

if (selected === 'all' || selected === 'lighting') {
  const unique = new Set();
  model.group.traverse((mesh) => {
    if (!mesh.isMesh) return;
    for (const material of Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material]) {
      if (material.userData.baseColor && material.userData.baseEmissive)
        unique.add(material);
    }
  });
  const materials = [...unique];
  const dimmers = {
    projects: 0.5,
    experience: 0.5,
    about: 0.5,
    contact: 0.5,
    walkway: 0.5,
  };
  const reference = (level) => {
    for (const material of materials) {
      const data = material.userData;
      const value = data.exterior
        ? 1
        : data.linkedRooms
          ? Math.max(...data.linkedRooms.map((key) => dimmers[key] ?? 0.5))
          : level;
      material.color.copy(data.baseColor).multiplyScalar(value);
      material.emissive
        .copy(data.baseEmissive)
        .multiplyScalar(data.surfaceOnly ? 0 : data.baseIntensity * value);
      material.emissiveIntensity = 1;
    }
  };
  result.measurements.lighting = {
    materials: materials.length,
    settled: abba(
      () => reference(0.5),
      () => updateRoomMaterialLighting(materials, 0.5, dimmers),
      10000,
    ),
    changing: abba(
      (i) => reference(0.5 + (i % 30) / 60),
      (i) =>
        updateRoomMaterialLighting(materials, 0.5 + (i % 30) / 60, dimmers),
      10000,
    ),
  };
}

if (selected === 'all' || selected === 'matrices') {
  const reference = new THREE.Scene(),
    candidate = new THREE.Scene();
  reference.add(model.group);
  candidate.add(createSpacecraft(THREE).group);
  const dispose = installLocalTransformCache(candidate, THREE.Object3D);
  let nodes = 0;
  reference.traverse(() => nodes++);
  result.measurements.rejectedLocalMatrixCache = {
    nodes,
    decision:
      'Not activated: exact TRS and direct-matrix checks can cost more than native composition. Retained only as a reproducible rejected candidate.',
    ...abba(
      () => reference.updateMatrixWorld(true),
      () => candidate.updateMatrixWorld(true),
      3000,
    ),
  };
  dispose();
}

const json = JSON.stringify(result, null, 2) + '\n';
if (output) {
  const target = resolve(output);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, json);
}
process.stdout.write(json);
