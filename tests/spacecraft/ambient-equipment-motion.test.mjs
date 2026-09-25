import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';

const model = createSpacecraft(THREE);
const dish = model.group.getObjectByName('service-mounted-communications-dish');
const radio = model.group.getObjectByName('contact-outboard-equipment');
const recorder = model.group.getObjectByName('experience-outboard-equipment');
const channels = [];
radio.traverse((part) => {
  if (part.isMesh && part.material.name.includes('meter-channel-'))
    channels.push(part.material);
});

const update = (time, reducedMotion = false) => {
  model.update(time, 'home', true, {
    activeRoom: 'home',
    delta: 1 / 60,
    reducedMotion,
  });
};
const meterColors = () =>
  channels.map((material) => [
    material.color.getHex(),
    material.emissive.getHex(),
  ]);

test('the existing dish moves briefly around its supported axle and holds between trims', () => {
  assert.ok(dish);
  assert.equal(dish.userData.animated, true);
  const axle = model.group.getObjectByName('aft-service-assembly');
  assert.deepEqual(dish.position.toArray(), [5.63, 0.18, 1.065]);
  assert.ok(axle.children.includes(dish));
  const movingMeshes = [];
  dish.traverse((part) => {
    if (part.isMesh) movingMeshes.push(part);
  });
  assert.ok(movingMeshes.length > 0);
  assert.ok(
    movingMeshes.every((part) => part.castShadow === true),
    'moving dish retains its feed and rim shadows',
  );

  update(11);
  assert.equal(dish.rotation.y, 0);
  const idleRevision = model.group.userData.geometryRevision;
  update(14);
  assert.ok(dish.rotation.y > 0);
  assert.ok(dish.rotation.y < THREE.MathUtils.degToRad(3.3));
  assert.ok(model.group.userData.geometryRevision > idleRevision);
  assert.equal(model.group.userData.shadowCasterChanged, true);
  update(20);
  const heldAngle = dish.rotation.y;
  const heldRevision = model.group.userData.geometryRevision;
  update(30);
  assert.equal(dish.rotation.y, heldAngle);
  assert.equal(model.group.userData.shadowCasterChanged, false);
  assert.equal(
    model.group.userData.geometryRevision,
    heldRevision,
    'dish hold and meter-only activity must reuse settled contact shading',
  );
});

test('Contact meters vary without changing geometry, and reduced motion restores a steady pose', () => {
  assert.equal(channels.length, 6);
  assert.equal(typeof radio.userData.updateRadioMeters, 'function');
  assert.equal(recorder.userData.updateRadioMeters, undefined);
  update(0);
  const restingColors = meterColors();
  update(20);
  const firstColors = meterColors();
  update(30);
  const laterColors = meterColors();
  assert.notDeepEqual(firstColors, laterColors);

  update(30, true);
  assert.equal(dish.rotation.y, 0);
  assert.equal(model.group.userData.shadowCasterChanged, true);
  assert.deepEqual(meterColors(), restingColors);
  const restingRevision = model.group.userData.geometryRevision;
  update(120, true);
  assert.equal(dish.rotation.y, 0);
  assert.equal(model.group.userData.shadowCasterChanged, false);
  assert.deepEqual(meterColors(), restingColors);
  assert.equal(model.group.userData.geometryRevision, restingRevision);
});
