import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createNotebookOcclusion } from '../../features/spacecraft/notebook-occlusion.ts';
import { buildIrisHatch } from '../../features/spacecraft/navigation/iris-hatch.ts';

function fixture() {
  const scene = new THREE.Group();
  const root = new THREE.Group();
  const anchor = new THREE.Object3D();
  root.add(anchor);
  scene.add(root);
  const notebook = { root, anchor, pixelsWidth: 2000, pixelsHeight: 1600 };
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(0.3, 0.15, 3);
  const update = () => {
    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
  };
  const box = (size, position, material = new THREE.MeshBasicMaterial()) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...position);
    scene.add(mesh);
    return mesh;
  };
  return { scene, notebook, camera, update, box };
}

function polygons(path) {
  return [...path.matchAll(/M([^Z]+)Z/g)].map((match) =>
    match[1].split('L').map((point) => point.split(' ').map(Number)),
  );
}

function inside(polygon, point) {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [x, y] = polygon[i],
      [previousX, previousY] = polygon[j];
    if (
      y > point[1] !== previousY > point[1] &&
      point[0] < ((previousX - x) * (point[1] - y)) / (previousY - y) + x
    )
      result = !result;
  }
  return result;
}

function agreesWithRays(
  result,
  camera,
  notebook,
  blockers,
  columns = 25,
  rows = 19,
) {
  assert.equal(result.visible, true);
  const parsed = polygons(result.path);
  for (const polygon of parsed) {
    let area = 0;
    for (let i = 0; i < polygon.length; i++) {
      const next = polygon[(i + 1) % polygon.length];
      area += polygon[i][0] * next[1] - next[0] * polygon[i][1];
    }
    assert.ok(
      area > 0,
      'overlapping blockers share winding and cannot reopen holes',
    );
    for (const [x, y] of polygon) {
      assert.ok(Number.isFinite(x) && Number.isFinite(y));
      assert.ok(x >= -0.01 && x <= notebook.pixelsWidth + 0.01);
      assert.ok(y >= -0.01 && y <= notebook.pixelsHeight + 0.01);
    }
  }
  const ray = new THREE.Raycaster();
  const eye = new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld);
  let hidden = 0,
    clear = 0;
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < columns; x++) {
      const px = ((x + 0.371) / columns) * notebook.pixelsWidth;
      const py = ((y + 0.613) / rows) * notebook.pixelsHeight;
      const target = new THREE.Vector3(
        (px - notebook.pixelsWidth / 2) / 1000,
        (notebook.pixelsHeight / 2 - py) / 1000,
        0,
      ).applyMatrix4(notebook.anchor.matrixWorld);
      ray.set(eye, target.clone().sub(eye).normalize());
      ray.far = eye.distanceTo(target) - 0.000001;
      const expected = ray.intersectObjects(blockers, false).length > 0;
      const actual = parsed.some((polygon) => inside(polygon, [px, py]));
      assert.equal(
        actual,
        expected,
        `paper pixel (${px}, ${py}) must agree with physical depth`,
      );
      if (expected) hidden++;
      else clear++;
    }
  return { hidden, clear };
}

test('the native ink mask preserves partial visibility and unions overlapping furniture and wall coverage', () => {
  const f = fixture();
  const furniture = f.box([0.32, 0.7, 0.25], [-0.23, 0.08, 0.75]);
  furniture.userData.excludePick = true;
  const wall = f.box([0.25, 0.9, 0.12], [-0.16, -0.1, 1.4]);
  const behindPaper = f.box([2, 2, 0.1], [0, 0, -0.3]);
  const behindEye = f.box([2, 2, 0.1], [0, 0, 3.4]);
  const transparent = f.box(
    [2, 2, 0.1],
    [0, 0, 1],
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.1 }),
  );
  const proxy = f.box([2, 2, 0.1], [0, 0, 1.5]);
  proxy.userData.isInteractionProxy = true;
  const invisible = f.box([2, 2, 0.1], [0, 0, 0.4]);
  const parent = new THREE.Group();
  parent.visible = false;
  f.scene.add(parent);
  parent.add(invisible);
  const self = f.box([2, 2, 0.1], [0, 0, 0.25]);
  f.notebook.root.add(self);
  f.update();
  const mask = createNotebookOcclusion(THREE, f.scene, f.notebook);
  const result = mask.update(f.camera, 0);
  const counts = agreesWithRays(result, f.camera, f.notebook, [
    furniture,
    wall,
    behindPaper,
    behindEye,
  ]);
  assert.ok(counts.hidden > 0 && counts.clear > 0);
  assert.ok(
    result.stats.candidateMeshes < result.stats.meshes,
    'frustum and visibility rejection avoid irrelevant triangle work',
  );
  transparent.visible = false;
  assert.equal(mask.update(f.camera, 1).path, result.path);
});

test('occluders crossing the eye and paper planes remain finite and match physical rays', () => {
  const f = fixture();
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [
        -0.8, -0.6, -0.2, 0.1, 1, 1, 0.5, -0.5, 3.5, -3, 0.35, 0.5, 3, 0.35,
        0.5, 0, 3, 0.5,
      ],
      3,
    ),
  );
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
  );
  f.scene.add(mesh);
  f.update();
  const result = createNotebookOcclusion(THREE, f.scene, f.notebook).update(
    f.camera,
    0,
  );
  agreesWithRays(result, f.camera, f.notebook, [mesh], 35, 29);
});

test('instanced and mirrored opaque geometry respects side culling on a transformed notebook', () => {
  const f = fixture();
  const instances = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.2, 0.38, 0.2),
    new THREE.MeshBasicMaterial(),
    3,
  );
  for (let i = 0; i < 3; i++)
    instances.setMatrixAt(
      i,
      new THREE.Matrix4().makeTranslation(-0.45 + i * 0.42, -0.15, 0.8),
    );
  f.scene.add(instances);
  const mirror = f.box([0.35, 0.2, 0.18], [0.2, 0.32, 0.65]);
  mirror.scale.x = -1;
  f.scene.position.set(1, -0.8, 0.5);
  f.scene.rotation.set(0.2, -0.3, 0.1);
  f.scene.scale.setScalar(0.7);
  f.scene.updateMatrixWorld(true);
  f.camera.position.applyMatrix4(f.scene.matrixWorld);
  f.update();
  const mask = createNotebookOcclusion(THREE, f.scene, f.notebook);
  const result = mask.update(f.camera, 0);
  agreesWithRays(result, f.camera, f.notebook, [instances, mirror]);
  assert.ok(
    result.stats.candidateMeshes >= 4,
    'all relevant instances contribute',
  );
});

test('unchanged camera and geometry reuse the mask, while geometry, visibility, and a turning plane invalidate it', () => {
  const f = fixture();
  const mesh = f.box([0.25, 0.4, 0.1], [-0.4, 0, 0.8]);
  f.update();
  const mask = createNotebookOcclusion(THREE, f.scene, f.notebook);
  const first = mask.update(f.camera, 0);
  assert.equal(mask.update(f.camera, 0).stats.cacheHit, true);
  assert.equal(mask.update(f.camera, 0).changed, false);
  mesh.geometry.translate(0.7, 0, 0);
  const changed = mask.update(f.camera, 1);
  assert.notEqual(changed.path, first.path);
  agreesWithRays(changed, f.camera, f.notebook, [mesh]);
  mesh.visible = false;
  assert.equal(mask.update(f.camera, 2).path, '');
  mesh.visible = true;
  const alternate = new THREE.Object3D();
  alternate.rotation.y = Math.PI;
  f.notebook.root.add(alternate);
  f.update();
  assert.equal(mask.update(f.camera, 3, alternate, 486, 566).visible, false);
  assert.equal(mask.update(f.camera, 3).visible, true);
});

test('iris masks use the actual moving aperture silhouette instead of shader-hidden leaf wings', () => {
  const f = fixture();
  f.camera.position.set(0, 0, 3);
  const hatch = buildIrisHatch(THREE, {
    radius: 0.5,
    bladeMaterial: new THREE.MeshBasicMaterial(),
    rimMaterial: new THREE.MeshBasicMaterial(),
    accentMaterial: new THREE.MeshStandardMaterial(),
  });
  hatch.group.position.z = 0.7;
  f.scene.add(hatch.group);
  f.update();
  const mask = createNotebookOcclusion(THREE, f.scene, f.notebook);
  const silhouette = hatch.group.getObjectByName('iris-occlusion-silhouette');
  const blockers = [silhouette, hatch.rim, ...hatch.indicators];
  for (const [revision, progress] of [0, 0.35, 0.72, 1].entries()) {
    hatch.setOpen(progress);
    f.update();
    const result = mask.update(f.camera, revision);
    agreesWithRays(result, f.camera, f.notebook, blockers, 35, 29);
    const covered = polygons(result.path).some((polygon) =>
      inside(polygon, [1000.1, 800.1]),
    );
    assert.equal(
      covered,
      progress === 0,
      'opening the hatch exposes the page center',
    );
    assert.equal(
      silhouette.visible,
      false,
      'native masking does not alter render-pass visibility',
    );
  }
});

test('a wall already clipped by the camera near plane does not hide native ink during travel', () => {
  const f = fixture();
  f.box([0.25, 0.25, 0.01], [0.3, 0.15, 2.95]);
  f.camera.near = 0.1;
  f.camera.updateProjectionMatrix();
  f.update();
  const mask = createNotebookOcclusion(THREE, f.scene, f.notebook);
  assert.equal(mask.update(f.camera, 0).path, '');
  f.camera.near = 0.01;
  f.camera.updateProjectionMatrix();
  const revealed = mask.update(f.camera, 0);
  assert.notEqual(
    revealed.path,
    '',
    'projection changes invalidate clipping without geometry movement',
  );
  assert.equal(revealed.stats.cacheHit, false);
  f.camera.layers.set(1);
  assert.equal(
    mask.update(f.camera, 0).path,
    '',
    'camera layers match the renderer',
  );
});
