import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';

const model = createSpacecraft(THREE);
const dish = model.group.getObjectByName('service-mounted-communications-dish');
const radio = model.group.getObjectByName('contact-outboard-equipment');
const recorder = model.group.getObjectByName('experience-outboard-equipment');
const contactComputer = model.group.userData.contactComputer;
const channels = [];
const signalArcs = [];
radio.traverse((part) => {
  if (part.isMesh && part.material.name.includes('meter-channel-'))
    channels.push(part.material);
});
contactComputer.idleDisplay.traverse((part) => {
  if (part.isMesh && part.material.name.includes('idle-signal-arc-'))
    signalArcs.push(part);
});
signalArcs.sort((a, b) => a.material.name.localeCompare(b.material.name));

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

  update(0.5);
  assert.equal(dish.rotation.y, 0);
  const idleRevision = model.group.userData.geometryRevision;
  update(2);
  assert.ok(dish.rotation.y > 0);
  assert.ok(dish.rotation.y < THREE.MathUtils.degToRad(18.1));
  assert.ok(dish.rotation.x > 0);
  assert.ok(model.group.userData.geometryRevision > idleRevision);
  assert.equal(model.group.userData.shadowCasterChanged, true);
  update(4);
  const heldAngle = dish.rotation.y;
  const heldRevision = model.group.userData.geometryRevision;
  update(4.4);
  assert.equal(dish.rotation.y, heldAngle);
  assert.equal(model.group.userData.shadowCasterChanged, false);
  assert.equal(
    model.group.userData.geometryRevision,
    heldRevision,
    'dish hold and meter-only activity must reuse settled contact shading',
  );
  update(9);
  assert.ok(dish.rotation.y < 0);
  assert.ok(dish.rotation.y >= -THREE.MathUtils.degToRad(18.1));
  assert.ok(dish.rotation.x < 0);
  update(13.5);
  assert.equal(dish.rotation.y, 0);
  assert.equal(dish.rotation.x, 0);
});

test('Contact meters vary without changing geometry, and reduced motion restores a steady pose', () => {
  assert.equal(channels.length, 6);
  assert.equal(typeof radio.userData.updateRadioMeters, 'function');
  assert.equal(recorder.userData.updateRadioMeters, undefined);
  update(0);
  const restingColors = meterColors();
  update(2.5);
  const firstColors = meterColors();
  update(3.5);
  const laterColors = meterColors();
  assert.notDeepEqual(firstColors, restingColors);
  assert.notDeepEqual(firstColors, laterColors);

  update(3.5, true);
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

test('the Contact idle display traces its existing signal arcs without moving geometry or changing connection state', () => {
  assert.equal(signalArcs.length, 3);
  assert.equal(typeof contactComputer.updateIdleSignal, 'function');
  assert.ok(
    signalArcs.every(
      (arc) => arc.material.transparent && arc.castShadow === false,
    ),
  );
  for (const [time, dominant] of [
    [0.9, 0],
    [1.75, 1],
    [2.6, 2],
  ]) {
    update(time);
    const opacities = signalArcs.map((arc) => arc.material.opacity);
    assert.equal(opacities.indexOf(Math.max(...opacities)), dominant);
    assert.ok(opacities[dominant] > 0.7);
  }
  update(14.95);
  const heldRevision = model.group.userData.geometryRevision;
  const firstOpacity = signalArcs[0].material.opacity;
  update(15.4);
  assert.notEqual(signalArcs[0].material.opacity, firstOpacity);
  assert.equal(model.group.userData.geometryRevision, heldRevision);
  assert.equal(model.group.userData.shadowCasterChanged, false);

  update(16, true);
  assert.ok(
    signalArcs.every(
      (arc) => arc.material.opacity === 0 && arc.material.visible === false,
    ),
  );
  model.update(17, 'contact', true, {
    activeRoom: 'contact',
    reading: true,
    reducedMotion: false,
  });
  assert.equal(contactComputer.idleDisplay.visible, false);
});
