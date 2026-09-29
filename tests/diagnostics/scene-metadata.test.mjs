import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';
import { createSceneMetadataPublisher } from '../../features/diagnostics/scene-metadata.ts';

// The original public data-attribute calculation, independent of the cache.
function reference(group, camera) {
  const data = group.userData;
  const project = (value) =>
    group
      .localToWorld(new THREE.Vector3(...value))
      .project(camera)
      .toArray();
  const { min, max } = data.overviewBounds;
  const corners = [];
  for (const x of [min[0], max[0]])
    for (const y of [min[1], max[1]])
      for (const z of [min[2], max[2]]) corners.push(project([x, y, z]));
  return {
    physicalLabels: JSON.stringify(data.labelPlaques),
    exteriorLabelAssemblies: JSON.stringify(data.labelAssemblyBounds),
    roomAnchors: JSON.stringify(data.roomAnchors),
    overviewSupports: JSON.stringify(data.overviewSupportPoints.map(project)),
    overviewCorners: JSON.stringify(corners),
  };
}

function fixture() {
  const model = createSpacecraft(THREE, { layout: 'wide' });
  const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.5, 100);
  camera.position.set(0.1, 0.2, 20);
  camera.lookAt(0, 0, 0);
  const scene = new THREE.Scene();
  scene.add(model.group);
  const dataset = {};
  const writes = [];
  const publish = createSceneMetadataPublisher(
    THREE,
    model.group,
    camera,
    new Proxy(dataset, {
      set(target, key, value) {
        writes.push(key);
        target[key] = value;
        return true;
      },
    }),
  );
  const update = () => {
    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    publish();
  };
  const verify = () =>
    assert.deepEqual(dataset, reference(model.group, camera));
  return { model, camera, scene, dataset, writes, update, verify };
}

test('settled metadata avoids projection and serialization, despite ambient model animation', (t) => {
  const f = fixture();
  f.update();
  f.verify();
  assert.equal(f.writes.length, 5);
  f.writes.length = 0;
  const project = t.mock.method(THREE.Vector3.prototype, 'project');
  const stringify = t.mock.method(JSON, 'stringify');
  const initial = f.model.group.userData.geometryRevision;
  for (let i = 1; i <= 30; i++) {
    f.model.update(i / 5, '', false, { activeRoom: 'projects', delta: 0.2 });
    f.update();
  }
  assert.ok(f.model.group.userData.geometryRevision > initial);
  assert.equal(project.mock.callCount(), 0);
  assert.equal(stringify.mock.callCount(), 0);
  assert.deepEqual(f.writes, []);
  f.verify();
});

test('camera, projection and vessel changes refresh exact projections at the next publication', () => {
  const f = fixture();
  f.update();
  for (const change of [
    () => {
      f.camera.position.x += 0.5;
    },
    () => {
      f.camera.rotation.z += 0.1;
    },
    () => {
      f.camera.aspect = 900 / 1200;
      f.camera.updateProjectionMatrix();
    },
    () => {
      f.camera.fov = 55;
      f.camera.updateProjectionMatrix();
    },
    () => {
      f.camera.near = 0.08;
      f.camera.updateProjectionMatrix();
    },
    () => {
      f.camera.far = 120;
      f.camera.updateProjectionMatrix();
    },
    () => {
      f.model.group.rotation.z = Math.PI / 2;
    },
    () => {
      f.model.group.position.y += 1;
    },
    () => {
      f.model.group.scale.setScalar(0.8);
    },
    () => {
      f.scene.position.x += 0.2;
    },
  ]) {
    const before = f.dataset.overviewSupports;
    f.writes.length = 0;
    change();
    f.update();
    f.verify();
    assert.notEqual(f.dataset.overviewSupports, before);
    assert.deepEqual(f.writes, ['overviewSupports', 'overviewCorners']);
    f.writes.length = 0;
    f.update();
    assert.deepEqual(f.writes, []);
  }
});

test('layout revisions refresh in-place metadata and replaced support geometry', () => {
  const f = fixture();
  f.update();
  const labels = f.model.group.userData.labelPlaques;
  const anchors = f.model.group.userData.roomAnchors;
  const wide = { ...f.dataset };
  for (const layout of ['compact', 'wide', 'wide']) {
    f.writes.length = 0;
    f.model.setLayout(layout);
    assert.equal(f.model.group.userData.labelPlaques, labels);
    assert.equal(f.model.group.userData.roomAnchors, anchors);
    f.update();
    f.verify();
    assert.equal(f.writes.length, 5);
    if (layout === 'wide') assert.deepEqual(f.dataset, wide);
    else {
      assert.notEqual(f.dataset.physicalLabels, wide.physicalLabels);
      assert.notEqual(f.dataset.roomAnchors, wide.roomAnchors);
      assert.notEqual(f.dataset.overviewSupports, wide.overviewSupports);
    }
  }
});
