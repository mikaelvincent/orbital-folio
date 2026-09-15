import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';
import { installLocalTransformCache } from './local-transform-cache-candidate.ts';
import { updateRoomMaterialLighting } from './material-lighting-candidate.ts';
import { createExactMatrixInverse } from './exact-matrix-inverse-candidate.ts';
import {
  applyExperiment,
  collisionFixture,
} from '../probe-targeted-exact-indexing.mjs';

export const CASE_NAMES = [
  'local-matrix',
  'lighting-settled',
  'lighting-changing',
  'iris-settled',
  'iris-moving',
  'indexing-startup',
];

/** Reuse steady fixtures for frame work. Fresh construction is intentional only
 * for the separately labeled startup experiment; no production candidates run. */
export function createControlledCases(selected = CASE_NAMES) {
  const referenceModel = createSpacecraft(THREE);
  const candidateModel = createSpacecraft(THREE);
  const disposers = [];
  const cases = new Map();
  if (selected.includes('local-matrix')) {
    const a = new THREE.Scene(),
      b = new THREE.Scene();
    a.add(referenceModel.group);
    b.add(candidateModel.group);
    disposers.push(installLocalTransformCache(b, THREE.Object3D));
    cases.set('local-matrix', {
      name: 'local-matrix',
      kind: 'steady',
      unit: 'full forced world-matrix update',
      reference: () => a.updateMatrixWorld(true),
      candidate: () => b.updateMatrixWorld(true),
      reset() {},
      verify() {
        a.updateMatrixWorld(true);
        b.updateMatrixWorld(true);
        const left = [],
          right = [];
        a.traverse((o) => left.push(o.matrixWorld.elements));
        b.traverse((o) => right.push(o.matrixWorld.elements));
        assert.deepEqual(left, right);
        return { worldMatricesCompared: left.length };
      },
    });
  }
  const materials = [];
  const unique = new Set();
  referenceModel.group.traverse((mesh) => {
    if (!mesh.isMesh) return;
    for (const material of Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material]) {
      if (
        material.userData.baseColor &&
        material.userData.baseEmissive &&
        !unique.has(material)
      ) {
        unique.add(material);
        materials.push(material);
      }
    }
  });
  const cloneMaterials = () =>
    materials.map((material) => ({
      color: material.color.clone(),
      emissive: material.emissive.clone(),
      emissiveIntensity: material.emissiveIntensity,
      userData: {
        ...material.userData,
        baseColor: material.userData.baseColor.clone(),
        baseEmissive: material.userData.baseEmissive.clone(),
      },
    }));
  const dimmers = {
    projects: 0.5,
    experience: 0.5,
    about: 0.5,
    contact: 0.5,
    walkway: 0.5,
  };
  const originalLighting = (entries, level) => {
    for (const material of entries) {
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
  for (const changing of [false, true]) {
    const name = changing ? 'lighting-changing' : 'lighting-settled';
    if (!selected.includes(name)) continue;
    const a = cloneMaterials(),
      b = cloneMaterials();
    const level = (i) => (changing ? 0.5 + (i % 30) / 60 : 0.5);
    const reference = (i) => originalLighting(a, level(i));
    const candidate = (i) => updateRoomMaterialLighting(b, level(i), dimmers);
    cases.set(name, {
      name,
      kind: 'steady',
      unit: 'all room-material lighting updates',
      reference,
      candidate,
      reset() {
        originalLighting(a, 0.5);
        originalLighting(b, 0.5);
      },
      verify() {
        for (let frame = 0; frame < 90; frame++) {
          reference(frame);
          candidate(frame);
          for (let i = 0; i < a.length; i++) {
            assert.deepEqual(a[i].color.toArray(), b[i].color.toArray());
            assert.deepEqual(a[i].emissive.toArray(), b[i].emissive.toArray());
            assert.equal(a[i].emissiveIntensity, b[i].emissiveIntensity);
          }
        }
        return { materials: a.length, frames: 90 };
      },
    });
  }
  const sources = referenceModel.group.userData.irisHatches.map((hatch) =>
    hatch.matrixWorld.clone(),
  );
  for (const moving of [false, true]) {
    const name = moving ? 'iris-moving' : 'iris-settled';
    if (!selected.includes(name)) continue;
    const fixture = (cached) =>
      sources.map((matrix) => {
        const source = matrix.clone(),
          target = new THREE.Matrix4();
        return {
          source,
          target,
          update: cached
            ? createExactMatrixInverse(source, target)
            : () => target.copy(source).invert(),
        };
      });
    const a = fixture(false),
      b = fixture(true);
    const frame = (entries, index) => {
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        if (moving)
          entry.source.elements[12] =
            sources[i].elements[12] + (index % 120) * 0.001;
        for (let leaf = 0; leaf < 6; leaf++) entry.update();
      }
    };
    cases.set(name, {
      name,
      kind: 'steady',
      unit: 'six leaf callbacks per hatch',
      reference: (i) => frame(a, i),
      candidate: (i) => frame(b, i),
      reset() {
        for (const entries of [a, b])
          for (let i = 0; i < entries.length; i++) {
            entries[i].source.copy(sources[i]);
            entries[i].update();
          }
      },
      verify() {
        for (let i = 0; i < 120; i++) {
          frame(a, i);
          frame(b, i);
          for (let j = 0; j < a.length; j++)
            assert.deepEqual(a[j].target.elements, b[j].target.elements);
        }
        return { hatches: a.length, leavesPerHatch: 6, frames: 120 };
      },
    });
  }
  if (selected.includes('indexing-startup')) {
    const construct = (optimized) => {
      const start = performance.now();
      const model = createSpacecraft(THREE);
      const constructionMs = performance.now() - start;
      const compactStart = performance.now();
      const details = optimized ? applyExperiment(model.group) : null;
      const compactionMs = optimized ? performance.now() - compactStart : 0;
      return { constructionMs, compactionMs, groups: details?.groups ?? null };
    };
    cases.set('indexing-startup', {
      name: 'indexing-startup',
      kind: 'construction',
      unit: 'fresh model ready; compaction separately reported',
      reference: () => construct(false),
      candidate: () => construct(true),
      reset() {},
      verify() {
        collisionFixture();
        const result = applyExperiment(createSpacecraft(THREE).group, true);
        return {
          exactExpandedDrawInputs: 'passed',
          forcedHashCollisionFixture: 'passed',
          groups: result.groups,
        };
      },
    });
  }
  return {
    cases,
    dispose() {
      for (const dispose of disposers) dispose();
    },
  };
}
