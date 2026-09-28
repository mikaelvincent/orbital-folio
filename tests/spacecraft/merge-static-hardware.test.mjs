import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { mergeStaticHardware } from '../../features/spacecraft/geometry/merge-static-hardware.ts';
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';

function fixture() {
  const root = new THREE.Group();
  root.position.set(2, -1, 0.3);
  root.rotation.set(0.1, 0.2, 0.3);
  root.scale.set(0.7, 1.3, 0.9);
  const material = new THREE.MeshStandardMaterial();
  const target = new THREE.Mesh(new THREE.BoxGeometry(1, 0.1, 0.2), material);
  target.name = 'support';
  target.position.set(-0.3, 0.1, 0.2);
  target.rotation.z = 0.15;
  target.scale.set(1.2, 0.8, 1.1);
  const batch = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.05, 0.05, 0.1, 12),
    material,
    3,
  );
  batch.name = 'fasteners';
  batch.position.set(0.1, 0.2, 0.3);
  batch.rotation.x = 0.2;
  for (let i = 0; i < batch.count; i++)
    batch.setMatrixAt(
      i,
      new THREE.Matrix4().compose(
        new THREE.Vector3(i * 0.2, 0.1, -0.2),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0.1, i * 0.3, 0)),
        new THREE.Vector3(0.8, 1.2, 0.9),
      ),
    );
  for (const mesh of [target, batch]) {
    mesh.userData.section = 'projects';
    mesh.castShadow = mesh.receiveShadow = true;
    root.add(mesh);
  }
  root.updateMatrixWorld(true);
  return { root, target, batch };
}

function triangleInputs(object, geometry = object.geometry) {
  const values = [];
  const position = geometry.attributes.position;
  const normal = geometry.attributes.normal;
  const uv = geometry.attributes.uv;
  for (
    let instance = 0;
    instance < (object.isInstancedMesh ? object.count : 1);
    instance++
  ) {
    const matrix = object.matrixWorld.clone();
    if (object.isInstancedMesh) {
      const local = new THREE.Matrix4();
      object.getMatrixAt(instance, local);
      matrix.multiply(local);
    }
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(matrix);
    for (let i = 0; i < (geometry.index?.count ?? position.count); i++) {
      const j = geometry.index ? geometry.index.getX(i) : i;
      values.push(
        ...new THREE.Vector3()
          .fromBufferAttribute(position, j)
          .applyMatrix4(matrix)
          .toArray(),
      );
      values.push(
        ...new THREE.Vector3()
          .fromBufferAttribute(normal, j)
          .applyMatrix3(normalMatrix)
          .normalize()
          .toArray(),
      );
      values.push(uv.getX(j), uv.getY(j));
    }
  }
  return values;
}
function nearInputs(actual, expected) {
  assert.equal(
    actual.length,
    expected.length,
    'all original triangles and UVs survive',
  );
  let largest = 0;
  for (let i = 0; i < actual.length; i++)
    largest = Math.max(largest, Math.abs(actual[i] - expected[i]));
  assert.ok(largest < 2e-6, `world position/normal/UV error ${largest}`);
}

test('Small hardware retains transformed triangle inputs, material, shadows, picking and source geometry', () => {
  const { root, target, batch } = fixture();
  const expected = [...triangleInputs(target), ...triangleInputs(batch)];
  const original = target.geometry;
  const source = batch.geometry;
  const sourcePositions = source.attributes.position.array.slice();
  let disposed = false;
  source.addEventListener('dispose', () => (disposed = true));
  assert.equal(mergeStaticHardware(THREE, root).drawsRemoved, 1);
  nearInputs(triangleInputs(target), expected);
  assert.deepEqual(source.attributes.position.array, sourcePositions);
  assert.notEqual(target.geometry, original);
  assert.equal(
    disposed,
    false,
    'shared source geometry must outlive its other consumers',
  );
  assert.equal(target.material, batch.material);
  assert.equal(target.castShadow, true);
  assert.equal(target.receiveShadow, true);
  assert.deepEqual(target.userData.parts, ['support', 'fasteners']);
  assert.equal(target.userData.section, 'projects');
  assert.ok(target.geometry.boundingBox && target.geometry.boundingSphere);
  assert.equal(batch.parent, null);
  assert.equal(mergeStaticHardware(THREE, root).drawsRemoved, 0);
});

test('Different small sibling instance geometries share a draw without an ordinary target', () => {
  const { root, target, batch } = fixture();
  root.remove(target);
  const second = batch.clone();
  second.geometry = new THREE.BoxGeometry(0.08, 0.01, 0.03);
  second.name = 'slots';
  second.position.z += 0.15;
  root.add(second);
  root.updateMatrixWorld(true);
  const expected = [...triangleInputs(batch), ...triangleInputs(second)];
  assert.equal(mergeStaticHardware(THREE, root).drawsRemoved, 1);
  root.updateMatrixWorld(true);
  assert.equal(root.children.length, 1);
  const merged = root.children[0];
  assert.ok(!merged.isInstancedMesh);
  nearInputs(triangleInputs(merged), expected);
  assert.equal(merged.material, batch.material);
  assert.equal(merged.castShadow, batch.castShadow);
  assert.equal(merged.receiveShadow, batch.receiveShadow);
  assert.deepEqual(merged.userData.parts, ['fasteners', 'slots']);
  assert.equal(merged.userData.section, 'projects');
  assert.equal(mergeStaticHardware(THREE, root).drawsRemoved, 0);
});

test('New hardware draws require multiple compatible siblings within the combined expansion budget', () => {
  for (const change of [
    (_root, second) => second.removeFromParent(),
    (root, second) => {
      const child = new THREE.Group();
      root.add(child);
      child.add(second);
    },
    (_root, second) => {
      second.receiveShadow = false;
    },
    (_root, second) => {
      second.userData.excludePick = true;
    },
    (_root, second) => {
      second.setMatrixAt(0, new THREE.Matrix4().makeScale(-1, 1, 1));
    },
    (_root, second, batch) => {
      // Each source fits individually; their combined expansion does not.
      batch.geometry = second.geometry = new THREE.SphereGeometry(0.1, 16, 16);
    },
  ]) {
    const { root, target, batch } = fixture();
    root.remove(target);
    const second = batch.clone();
    second.geometry = new THREE.BoxGeometry(0.08, 0.01, 0.03);
    root.add(second);
    change(root, second, batch);
    assert.equal(mergeStaticHardware(THREE, root).drawsRemoved, 0);
    assert.equal(batch.parent, root);
  }
});

test('Incompatible rendering, picking, animation and large repetitions retain separate draws', () => {
  const mutations = [
    ({ batch }) => (batch.castShadow = false),
    ({ batch }) => (batch.receiveShadow = false),
    ({ batch }) => batch.layers.set(2),
    ({ batch }) => (batch.renderOrder = 2),
    ({ batch }) => (batch.visible = false),
    ({ batch }) => (batch.userData.excludePick = true),
    ({ batch }) => (batch.userData.section = 'about'),
    ({ batch }) => (batch.userData.openReader = true),
    ({ batch }) => (batch.userData.interactionId = 'button'),
    ({ batch }) => batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage),
    ({ batch }) => batch.setColorAt(0, new THREE.Color('red')),
    ({ batch }) => (batch.material.transparent = true),
    ({ batch }) => (batch.material.onBeforeCompile = () => {}),
    ({ batch }) => (batch.onBeforeRender = () => {}),
    ({ batch }) => batch.geometry.setDrawRange(0, 3),
    ({ batch }) =>
      batch.geometry.setAttribute(
        'color',
        new THREE.Float32BufferAttribute(
          new Float32Array(batch.geometry.attributes.position.count * 3),
          3,
        ),
      ),
    ({ batch }) =>
      batch.setMatrixAt(0, new THREE.Matrix4().makeScale(-1, 1, 1)),
    ({ batch }) => {
      const matrix = new THREE.Matrix4();
      matrix.elements[4] = 0.2;
      batch.setMatrixAt(0, matrix);
    },
    ({ root }) => (root.userData.animated = true),
    ({ root }) => (root.userData.irisHatch = true),
    ({ root }) => (root.userData.openReader = true),
    ({ batch }) => (batch.geometry = new THREE.SphereGeometry(1, 64, 32)),
  ];
  for (const mutate of mutations) {
    const f = fixture();
    mutate(f);
    assert.equal(
      mergeStaticHardware(THREE, f.root).drawsRemoved,
      0,
      mutate.toString(),
    );
    assert.equal(f.batch.parent, f.root);
  }
});

test('Real spacecraft hardware keeps every triangle and parent/material boundary in both layouts', () => {
  for (const layout of ['wide', 'compact']) {
    const model = createSpacecraft(THREE, { layout, mergeHardware: false });
    model.update(0, 'home', true, { activeRoom: 'home', layout, delta: 0 });
    model.group.updateMatrixWorld(true);
    const meshes = [];
    model.group.traverse((o) => {
      if (o.isMesh)
        meshes.push({ object: o, geometry: o.geometry, parent: o.parent });
    });
    const result = mergeStaticHardware(THREE, model.group);
    assert.ok(result.drawsRemoved >= 30);
    const removed = meshes.filter((m) => !m.object.parent);
    const added = [];
    model.group.traverse((object) => {
      if (object.isMesh && !meshes.some((m) => m.object === object))
        added.push({ object, geometry: null, parent: object.parent });
    });
    assert.equal(removed.length - added.length, result.drawsRemoved);
    for (const entry of [
      ...added,
      ...meshes.filter((m) => m.object.geometry !== m.geometry),
    ]) {
      const consumed = removed.filter(
        (m) =>
          m.parent === entry.parent &&
          m.object.material === entry.object.material &&
          !!m.object.userData.excludePick ===
            !!entry.object.userData.excludePick,
      );
      const expected = [
        ...(entry.geometry
          ? [triangleInputs(entry.object, entry.geometry)]
          : []),
        ...consumed.map((m) => triangleInputs(m.object)),
      ].flat();
      nearInputs(triangleInputs(entry.object), expected);
      for (const item of consumed)
        for (const name of item.object.userData.parts ?? [item.object.name])
          assert.ok(entry.object.userData.parts.includes(name));
    }
    for (const room of ['projects', 'about', 'experience', 'contact']) {
      model.setReading(room, true, true);
      model.update(1, room, true, {
        activeRoom: room,
        layout,
        delta: 0,
        reading: true,
      });
      assert.ok(model.readerSurfaces[room]);
      model.setReading(room, false, true);
    }
  }
});

test('Archive repacking, room dimming and Contact feedback match the unmerged reference', () => {
  const before = createSpacecraft(THREE, { mergeHardware: false });
  const after = createSpacecraft(THREE);
  const snapshot = (model) => {
    const result = [];
    const screens = [
      ...model.group.userData.caseStudyScreens,
      { root: model.group.userData.contactComputer.root, category: 'contact' },
    ];
    for (const { root, category, available } of screens) {
      result.push([
        category,
        available,
        root.visible,
        root.matrixWorld.toArray(),
        root.userData.highlightLevel,
      ]);
      const materials = new Map();
      root.traverseVisible((o) => {
        if (!o.isMesh || Array.isArray(o.material)) return;
        const m = o.material;
        materials.set(m.name, [
          m.color?.toArray(),
          m.emissive?.toArray(),
          m.emissiveIntensity,
          m.opacity,
        ]);
      });
      result.push([...materials].sort(([a], [b]) => a.localeCompare(b)));
    }
    return result;
  };
  let time = 0;
  for (const layout of ['wide', 'compact']) {
    for (const entries of [
      [{ title: 'Shared', slug: 'shared', categories: ['product', 'systems'] }],
      [
        {
          title: 'Changed',
          slug: 'changed',
          categories: ['research', 'interfaces'],
        },
      ],
      [],
    ]) {
      for (const model of [before, after]) {
        model.setLayout(layout);
        model.setCaseStudies(entries);
      }
      for (const [room, hoveredObject] of [
        ['experience', 'case-study-screen-product'],
        ['experience', 'case-study-screen-research'],
        ['contact', 'contact-computer'],
      ]) {
        for (const reading of [false, true, false]) {
          time++;
          for (const model of [before, after])
            model.update(time, room, true, {
              activeRoom: room,
              hoveredObject,
              reading,
              caseStudyScreen: 'all',
              layout,
              delta: 0,
            });
          assert.deepEqual(snapshot(after), snapshot(before));
        }
      }
    }
  }
});
