import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { localBounds } from '../../features/spacecraft/local-bounds.ts';

test('shared geometry reuses local bounds through transforms, visibility and normal updates', (t) => {
  const geometry = new T.BoxGeometry(2, 2, 2);
  const a = new T.Mesh(geometry),
    b = new T.Mesh(geometry);
  const scan = t.mock.method(geometry, 'computeBoundingBox');
  const box = localBounds(a).clone();
  a.position.set(20, 10, -3);
  a.scale.set(2, 3, 4);
  a.visible = false;
  a.updateMatrixWorld(true);
  geometry.attributes.normal.needsUpdate = true;
  assert.deepEqual(localBounds(a), box);
  assert.deepEqual(localBounds(b), box);
  assert.equal(scan.mock.callCount(), 1);
  assert.deepEqual(new T.Box3().setFromObject(a).min.toArray(), [18, 7, -7]);
});

test('in-place positions, replacement buffers and cleared boxes invalidate local geometry', () => {
  const mesh = new T.Mesh(new T.BoxGeometry(2, 2, 2));
  const geometry = mesh.geometry;
  localBounds(mesh);
  const position = geometry.attributes.position;
  position.setX(0, 8);
  position.needsUpdate = true;
  assert.equal(localBounds(mesh).max.x, 8);
  geometry.setAttribute(
    'position',
    new T.Float32BufferAttribute([-4, 0, 0, 3, 1, 2], 3),
  );
  assert.equal(localBounds(mesh).min.x, -4);
  geometry.attributes.position.array = new Float32Array([-12, 0, 0, 14, 1, 2]);
  assert.equal(localBounds(mesh).max.x, 14);
  geometry.boundingBox = null;
  assert.equal(localBounds(mesh).min.x, -12);
  geometry.deleteAttribute('position');
  assert.ok(localBounds(mesh).isEmpty());
  mesh.geometry = new T.BoxGeometry(30, 2, 2);
  assert.equal(localBounds(mesh).max.x, 15);
});

test('instance bounds track placements, count, buffers and shared geometry independently of world transforms', (t) => {
  const geometry = new T.BoxGeometry(2, 2, 2);
  const mesh = new T.InstancedMesh(geometry, new T.MeshBasicMaterial(), 2);
  mesh.setMatrixAt(1, new T.Matrix4().makeTranslation(10, 0, 0));
  const scan = t.mock.method(mesh, 'computeBoundingBox');
  assert.equal(localBounds(mesh).max.x, 11);
  mesh.position.x = 30;
  localBounds(mesh);
  assert.equal(scan.mock.callCount(), 1);
  mesh.setMatrixAt(1, new T.Matrix4().makeTranslation(20, 0, 0));
  mesh.instanceMatrix.needsUpdate = true;
  assert.equal(localBounds(mesh).max.x, 21);
  mesh.count = 1;
  assert.equal(localBounds(mesh).max.x, 1);
  mesh.count = 0;
  assert.ok(localBounds(mesh).isEmpty());
  mesh.count = 2;
  assert.equal(localBounds(mesh).max.x, 21);
  mesh.instanceMatrix = mesh.instanceMatrix.clone();
  mesh.setMatrixAt(1, new T.Matrix4().makeTranslation(25, 0, 0));
  assert.equal(localBounds(mesh).max.x, 26);
  mesh.instanceMatrix.array = mesh.instanceMatrix.array.slice();
  mesh.setMatrixAt(1, new T.Matrix4().makeTranslation(30, 0, 0));
  assert.equal(localBounds(mesh).max.x, 31);
  geometry.attributes.position.setX(0, 5);
  geometry.attributes.position.needsUpdate = true;
  // A different consumer refreshes the shared geometry first. The instance
  // still has to notice this change even though the geometry is now up to date.
  localBounds(new T.Mesh(geometry));
  assert.equal(localBounds(mesh).max.x, 35);
  mesh.boundingBox = null;
  assert.equal(localBounds(mesh).max.x, 35);
  mesh.geometry = new T.BoxGeometry(20, 2, 2);
  assert.equal(localBounds(mesh).max.x, 40);
});

test('interleaved and morph positions remain live, including removing morph targets', () => {
  const geometry = new T.BufferGeometry();
  const data = new T.InterleavedBuffer(new Float32Array([0, 0, 0, 1, 1, 1]), 3);
  const position = new T.InterleavedBufferAttribute(data, 3, 0);
  geometry.setAttribute('position', position);
  const mesh = new T.Mesh(geometry);
  assert.equal(localBounds(mesh).max.x, 1);
  position.setX(1, 4);
  position.needsUpdate = true;
  assert.equal(localBounds(mesh).max.x, 4);
  geometry.setAttribute(
    'position',
    new T.Float32BufferAttribute([0, 0, 0, 1, 1, 1], 3),
  );
  assert.equal(localBounds(mesh).max.x, 1);
  geometry.morphAttributes.position = [
    new T.Float32BufferAttribute([0, 0, 0, 8, 0, 0], 3),
  ];
  assert.equal(localBounds(mesh).max.x, 8);
  geometry.morphAttributes.position[0].setX(1, 12);
  geometry.morphAttributes.position[0].needsUpdate = true;
  assert.equal(localBounds(mesh).max.x, 12);
  geometry.morphTargetsRelative = true;
  assert.equal(localBounds(mesh).max.x, 13);
  delete geometry.morphAttributes.position;
  assert.equal(localBounds(mesh).max.x, 1);
});

test('skinned poses recompute object bounds even when vertex buffers are unchanged', () => {
  const geometry = new T.BoxGeometry(2, 2, 2);
  const count = geometry.attributes.position.count;
  geometry.setAttribute(
    'skinIndex',
    new T.Uint16BufferAttribute(new Uint16Array(count * 4), 4),
  );
  const weights = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) weights[i * 4] = 1;
  geometry.setAttribute('skinWeight', new T.Float32BufferAttribute(weights, 4));
  const mesh = new T.SkinnedMesh(geometry, new T.MeshBasicMaterial());
  const bone = new T.Bone();
  mesh.add(bone);
  mesh.bind(new T.Skeleton([bone]));
  assert.equal(localBounds(mesh).max.x, 1);
  bone.position.x = 10;
  mesh.updateMatrixWorld(true);
  assert.equal(localBounds(mesh).max.x, 11);
});
