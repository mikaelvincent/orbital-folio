import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';

function renderedState(model) {
  const values = [];
  model.group.traverse((object) => {
    values.push(object.visible, ...object.matrixWorld.elements);
    if (object.isLight)
      values.push(object.intensity, ...object.color.toArray());
    for (const material of [object.material].flat().filter(Boolean)) {
      values.push(
        material.visible,
        material.opacity,
        material.emissiveIntensity,
      );
      if (material.color) values.push(...material.color.toArray());
      if (material.emissive) values.push(...material.emissive.toArray());
    }
  });
  return values;
}

test('disabling descriptive lighting metadata preserves live rendering and refreshes on re-enable', () => {
  const reference = createSpacecraft(THREE);
  const quiet = createSpacecraft(THREE);
  const lastPublished = Object.values(quiet.group.userData.lightingState);
  let metadataWrites = 0;
  quiet.group.userData.lightingState = new Proxy(
    quiet.group.userData.lightingState,
    {
      set(target, key, value) {
        metadataWrites++;
        target[key] = value;
        return true;
      },
    },
  );
  let frame = 0;
  for (const state of [
    { activeRoom: 'home' },
    { activeRoom: 'projects', hoveredPortal: 'experience' },
    {
      activeRoom: 'contact',
      travelling: true,
      directRoomTravel: true,
      transitRoom: 'about',
    },
    { activeRoom: 'contact', travelling: true, transitWalkway: true },
    { activeRoom: 'contact', hoveredObject: 'contact-computer' },
    {
      activeRoom: 'contact',
      reading: true,
      hoveredObject: 'contact-room-dismiss',
    },
    { activeRoom: 'about', reading: true, reducedMotion: true },
    { activeRoom: 'experience', layout: 'compact' },
  ]) {
    for (let i = 0; i < 20; i++) {
      const next = {
        reading: false,
        travelling: false,
        directRoomTravel: false,
        transitRoom: '',
        transitWalkway: false,
        hoveredPortal: '',
        hoveredObject: '',
        reducedMotion: false,
        delta: 1 / 60,
        ...state,
      };
      frame++;
      reference.update(frame / 60, '', false, next);
      quiet.update(frame / 60, '', false, {
        ...next,
        collectDiagnostics: false,
      });
      assert.deepEqual(renderedState(quiet), renderedState(reference));
      assert.deepEqual(
        quiet.group.userData.portals,
        reference.group.userData.portals,
      );
      assert.equal(
        quiet.group.userData.geometryRevision,
        reference.group.userData.geometryRevision,
      );
      assert.equal(
        quiet.group.userData.transitionActive,
        reference.group.userData.transitionActive,
      );
    }
  }
  assert.equal(metadataWrites, 0);
  Object.values(quiet.group.userData.lightingState).forEach((value, i) =>
    assert.equal(value, lastPublished[i]),
  );

  // Inspection sees current state on its first frame, including settings changed
  // while it was closed. Standalone consumers retain metadata by default.
  for (const model of [reference, quiet]) model.setLighting(0.7, 1.6, 0.9);
  const state = { activeRoom: 'about', reading: false, delta: 1 / 60 };
  reference.update(++frame / 60, 'about', true, state);
  quiet.update(frame / 60, 'about', true, {
    ...state,
    collectDiagnostics: true,
  });
  assert.ok(metadataWrites > 0);
  assert.deepEqual(
    quiet.group.userData.lightingState,
    reference.group.userData.lightingState,
  );
  assert.deepEqual(renderedState(quiet), renderedState(reference));
});
