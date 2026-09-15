import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';
import { updateRoomMaterialLighting } from './material-lighting-candidate.ts';
import { resolveSocialScreens } from '../../lib/content/social-links.ts';

function reference(materials, level, dimmers) {
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
}

function copy(material) {
  return {
    color: material.color.clone(),
    emissive: material.emissive.clone(),
    emissiveIntensity: material.emissiveIntensity,
    userData: {
      ...material.userData,
      baseColor: material.userData.baseColor.clone(),
      baseEmissive: material.userData.baseEmissive.clone(),
      linkedRooms: material.userData.linkedRooms
        ? [...material.userData.linkedRooms]
        : undefined,
    },
  };
}

const values = (materials) =>
  materials.map((material) => [
    ...material.color.toArray(),
    ...material.emissive.toArray(),
    material.emissiveIntensity,
  ]);

test('Lighting exactly matches the former calculation for changing levels and externally mutated inputs/outputs', () => {
  const material = new THREE.MeshStandardMaterial({
    color: 0xaa6611,
    emissive: 0x123456,
  });
  material.userData = {
    baseColor: material.color.clone(),
    baseEmissive: material.emissive.clone(),
    baseIntensity: 0.4,
  };
  const before = [copy(material)],
    after = [copy(material)];
  const mutations = [
    () => {},
    (m) => m.color.set(0xffffff),
    (m) => m.emissive.set(0xff0000),
    (m) => {
      m.emissiveIntensity = 9;
    },
    (m) => {
      m.userData.baseColor.r = -0;
      m.userData.baseColor.g = 0.7;
    },
    (m) => {
      m.userData.baseEmissive.b = 0.91;
      m.userData.baseIntensity = 0.92;
    },
    (m) => {
      m.userData.surfaceOnly = true;
    },
    (m) => {
      m.userData.surfaceOnly = false;
      m.userData.linkedRooms = ['projects', 'about', 'missing'];
    },
    (m) => {
      m.userData.linkedRooms = [];
    },
    (m) => {
      m.userData.exterior = true;
    },
  ];
  for (const mutate of mutations) {
    mutate(before[0]);
    mutate(after[0]);
    for (const level of [0.5, 0.573183, 1, 0.5, 0.5]) {
      const dimmers = { projects: level, about: 0.8 };
      reference(before, level, dimmers);
      updateRoomMaterialLighting(after, level, dimmers);
      assert.deepEqual(values(after), values(before));
    }
  }
});

test('Settled material components receive no redundant writes but external edits are corrected immediately', () => {
  const material = new THREE.MeshStandardMaterial();
  material.userData = {
    baseColor: material.color.clone(),
    baseEmissive: material.emissive.clone(),
    baseIntensity: 1,
  };
  updateRoomMaterialLighting([material], 0.5, {});
  let writes = 0;
  for (const color of [material.color, material.emissive]) {
    for (const key of ['r', 'g', 'b']) {
      let value = color[key];
      Object.defineProperty(color, key, {
        get: () => value,
        set: (next) => {
          value = next;
          writes++;
        },
      });
    }
  }
  for (let index = 0; index < 100; index++)
    updateRoomMaterialLighting([material], 0.5, {});
  assert.equal(writes, 0);
  material.color.r = 0.99;
  writes = 0;
  updateRoomMaterialLighting([material], 0.5, {});
  assert.equal(material.color.r, 0.5);
  assert.equal(writes, 1);
});

test('Actual room, door and social-highlight lighting inputs remain exact throughout route/reading/reduced-motion states', () => {
  const model = createSpacecraft(THREE, {
    socials: resolveSocialScreens([
      {
        id: 'github',
        title: 'GitHub',
        url: 'https://github.com/example',
        screen: 'left',
      },
    ]),
  });
  const groups = new Map();
  model.group.traverse((mesh) => {
    if (!mesh.isMesh) return;
    for (const material of Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material]) {
      if (!material.userData.baseColor || !material.userData.baseEmissive)
        continue;
      if (!groups.has(mesh.userData.section))
        groups.set(mesh.userData.section, new Set());
      groups.get(mesh.userData.section).add(material);
    }
  });
  const states = [
    { activeRoom: 'home' },
    { activeRoom: 'projects', hoveredPortal: 'projects:experience' },
    {
      activeRoom: 'projects',
      travelling: true,
      transitRoom: 'projects',
      openPortalIds: ['projects:about'],
    },
    {
      activeRoom: 'about',
      travelling: true,
      transitWalkway: true,
      openPortalIds: ['about:projects'],
    },
    {
      activeRoom: 'contact',
      travelling: false,
      transitWalkway: false,
      openPortalIds: [],
      hoveredObject: 'contact-social-left',
    },
    { activeRoom: 'contact', reading: true, hoveredObject: null },
    { activeRoom: 'about', reading: false, hoveredPortal: null },
    { activeRoom: 'experience' },
  ];
  let frame = 0,
    compared = 0;
  for (const immediate of [false, true]) {
    for (const state of states) {
      for (let index = 0; index < 12; index++) {
        model.update(++frame / 60, state.activeRoom, immediate, {
          delta: 1 / 60,
          ...state,
        });
        const dimmers = Object.fromEntries(
          Object.entries(model.group.userData.lightingState).map(
            ([room, value]) => [room, value.level],
          ),
        );
        for (const [room, materials] of groups) {
          const baseline = [...materials].map(copy),
            candidate = [...materials].map(copy);
          reference(baseline, dimmers[room] ?? 0.5, dimmers);
          updateRoomMaterialLighting(candidate, dimmers[room] ?? 0.5, dimmers);
          assert.deepEqual(
            values(candidate),
            values(baseline),
            `${state.activeRoom}/${immediate}/${index}/${room}`,
          );
          compared += baseline.length;
        }
      }
    }
  }
  assert.ok(compared > 30_000);
});
