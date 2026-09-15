import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { coalesceStaticInstances } from '../lib/coalesce-static-instances.ts';
import { createSpacecraft } from '../components/spacecraft-model.ts';

function fixture() {
  const root = new THREE.Group();
  const parent = new THREE.Group();
  parent.name = 'static-hardware';
  parent.position.set(1.25, -0.2, 3);
  parent.rotation.set(0.1, 0.3, 0.2);
  root.add(parent);
  const material = new THREE.MeshStandardMaterial();
  const batches = [];
  for (let index = 0; index < 3; index++) {
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(), material, 2);
    mesh.name = `hardware-${index}`;
    mesh.userData.section = 'projects';
    mesh.castShadow = mesh.receiveShadow = true;
    for (let instance = 0; instance < 2; instance++) {
      mesh.setMatrixAt(
        instance,
        new THREE.Matrix4().compose(
          new THREE.Vector3(index, instance * 0.4, index * 0.1),
          new THREE.Quaternion().setFromEuler(
            new THREE.Euler(0.1, index * 0.2, 0),
          ),
          new THREE.Vector3(0.1, 0.2, 0.3),
        ),
      );
      mesh.setColorAt(instance, new THREE.Color(index / 4, instance / 2, 0.5));
    }
    parent.add(mesh);
    batches.push(mesh);
  }
  return { root, parent, batches };
}

function geometryDigest(geometry) {
  const hash = createHash('sha256');
  for (const [name, attribute] of Object.entries(geometry.attributes).sort(
    ([a], [b]) => a.localeCompare(b),
  )) {
    hash.update(
      JSON.stringify([
        name,
        attribute.itemSize,
        attribute.normalized,
        attribute.gpuType,
      ]),
    );
    hash.update(
      new Uint8Array(
        attribute.array.buffer,
        attribute.array.byteOffset,
        attribute.array.byteLength,
      ),
    );
  }
  if (geometry.index)
    hash.update(
      new Uint8Array(
        geometry.index.array.buffer,
        geometry.index.array.byteOffset,
        geometry.index.array.byteLength,
      ),
    );
  hash.update(JSON.stringify([geometry.groups, geometry.drawRange]));
  return hash.digest('hex');
}

function expandedInstances(root) {
  root.updateMatrixWorld(true);
  const result = [];
  root.traverseVisible((mesh) => {
    if (!mesh.isInstancedMesh) return;
    const geometry = geometryDigest(mesh.geometry);
    for (let index = 0; index < mesh.count; index++) {
      const matrix = new THREE.Matrix4();
      mesh.getMatrixAt(index, matrix);
      const color = mesh.instanceColor
        ? Array.from(mesh.instanceColor.array.slice(index * 3, index * 3 + 3))
        : null;
      result.push(
        JSON.stringify({
          geometry,
          material: mesh.material.uuid,
          matrix: mesh.matrixWorld.clone().multiply(matrix).toArray(),
          color,
          castShadow: mesh.castShadow,
          receiveShadow: mesh.receiveShadow,
          layers: mesh.layers.mask,
          renderOrder: mesh.renderOrder,
        }),
      );
    }
  });
  return result.sort((a, b) => a.localeCompare(b));
}

test('Coalescing retains every exact geometry input, world instance matrix, color and render flag', () => {
  const { root, parent, batches } = fixture();
  const before = expandedInstances(root);
  const geometry = batches[0].geometry;
  const material = batches[0].material;
  const result = coalesceStaticInstances(THREE, root);
  assert.deepEqual(result, {
    meshesBefore: 3,
    meshesAfter: 1,
    mergedGroups: 1,
    drawsRemoved: 2,
  });
  assert.deepEqual(expandedInstances(root), before);
  assert.equal(
    parent.children[0],
    batches[0],
    'retain the original object and transform',
  );
  assert.equal(batches[0].geometry, geometry);
  assert.equal(batches[0].material, material);
  assert.deepEqual(batches[0].userData.parts, [
    'hardware-0',
    'hardware-1',
    'hardware-2',
  ]);
  assert.ok(batches[0].boundingBox);
  assert.ok(batches[0].boundingSphere);
  assert.equal(
    coalesceStaticInstances(THREE, root).drawsRemoved,
    0,
    'idempotent',
  );
});

test('Different geometry bytes, sibling transforms, state, materials and parents remain separate', () => {
  const mutations = [
    (mesh) => {
      mesh.geometry.attributes.position.array[0] += 0.0001;
    },
    (mesh) => {
      mesh.geometry.index.array[0] = 1;
    },
    (mesh) => {
      mesh.geometry.setDrawRange(0, 3);
    },
    (mesh) => {
      mesh.position.x = 0.01;
    },
    (mesh) => {
      mesh.material = mesh.material.clone();
    },
    (mesh) => {
      mesh.castShadow = false;
    },
    (mesh) => {
      mesh.layers.set(3);
    },
    (mesh) => {
      mesh.renderOrder = 1;
    },
    (mesh, root) => {
      root.add(mesh);
    },
    (mesh) => {
      mesh.instanceColor = null;
    },
  ];
  for (const mutate of mutations) {
    const { root, batches } = fixture();
    mutate(batches[1], root);
    const before = expandedInstances(root);
    assert.equal(coalesceStaticInstances(THREE, root).drawsRemoved, 1);
    assert.deepEqual(expandedInstances(root), before);
    assert.ok(batches[1].parent, 'incompatible sibling is retained');
  }
});

test('Dynamic, transparent, custom shader/callback and interactive instances are rejected', () => {
  const mutations = [
    (mesh) => {
      mesh.onBeforeRender = () => {};
    },
    (mesh) => {
      mesh.onAfterRender = () => {};
    },
    (mesh) => {
      mesh.onBeforeShadow = () => {};
    },
    (mesh) => {
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    },
    (mesh) => {
      mesh.material = mesh.material.clone();
      mesh.material.transparent = true;
    },
    (mesh) => {
      mesh.material = mesh.material.clone();
      mesh.material.onBeforeCompile = () => {};
    },
    (mesh) => {
      mesh.userData.isInteractionProxy = true;
    },
    (mesh) => {
      mesh.customDepthMaterial = new THREE.MeshDepthMaterial();
    },
    (mesh) => {
      mesh.visible = false;
    },
  ];
  for (const mutate of mutations) {
    const { root, batches } = fixture();
    mutate(batches[1]);
    assert.equal(coalesceStaticInstances(THREE, root).drawsRemoved, 1);
    assert.ok(batches[1].parent);
  }
  const { root, parent } = fixture();
  parent.userData.animated = true;
  assert.equal(coalesceStaticInstances(THREE, root).drawsRemoved, 0);
});

test('Transmissive physical siblings retain separate draw ordering even with transparent=false', () => {
  const { root, batches } = fixture();
  const material = new THREE.MeshPhysicalMaterial({ transmission: 1 });
  for (const batch of batches) batch.material = material;
  assert.equal(material.transparent, false);
  assert.equal(coalesceStaticInstances(THREE, root).drawsRemoved, 0);
});

test('Real spacecraft batches preserve exact instances through layouts, room updates and reading transitions', () => {
  const model = createSpacecraft(THREE, { coalesceInstances: false });
  const snapshots = [];
  const states = [
    ['wide', 'home', false],
    ['compact', 'home', false],
    ['wide', 'about', false],
    ['compact', 'contact', true],
    ['wide', 'projects', true],
    ['compact', 'experience', false],
  ];
  const sample = ([layout, room, reading]) => {
    model.setLayout(layout);
    model.setReading(room, reading, true);
    model.update(0, room, true, {
      activeRoom: room,
      layout,
      reading,
      delta: 0,
    });
    return expandedInstances(model.group);
  };
  for (const state of states) snapshots.push(sample(state));
  const result = coalesceStaticInstances(THREE, model.group);
  assert.ok(
    result.drawsRemoved >= 20,
    `expected useful static sibling savings, received ${result.drawsRemoved}`,
  );
  for (const [index, state] of states.entries()) {
    assert.deepEqual(
      sample(state),
      snapshots[index],
      `${state.join('/')} must preserve all rendered instance inputs`,
    );
  }
  const optimized = createSpacecraft(THREE);
  // The sealed-equipment redesign removes four Projects slot batches and one
  // Contact slit batch. Integration must match the exact manual path above,
  // rather than a count tied to the old furnishings (30 versus the current 25).
  assert.equal(
    optimized.group.userData.detailStats.coalescedInstanceDraws,
    result.drawsRemoved,
    'Automatic construction must apply the same proven coalescing as the manual path',
  );
});
