import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';
import {
  applyCabinLighting,
  cabinLightingChunk,
  createExteriorLight,
} from '../../features/spacecraft/lighting.ts';
import {
  wallLayout,
  LADDER_CENTER_Y,
} from '../../features/spacecraft/geometry/spacecraft-wall-layout.ts';

const model = createSpacecraft(THREE, { layout: 'wide' });
const lights = [];
const meshes = [];
model.group.traverse((object) => {
  if (object.isLight) lights.push(object);
  if (object.isMesh) meshes.push(object);
});
const authoredShadows = new Map(
  meshes.map((mesh) => [mesh, [mesh.castShadow, mesh.receiveShadow]]),
);
const linked = applyCabinLighting(THREE, model.group);
const camera = new THREE.PerspectiveCamera();

function compile(material) {
  const shader = {
    uniforms: {},
    vertexShader: THREE.ShaderLib.standard.vertexShader,
    fragmentShader: THREE.ShaderLib.standard.fragmentShader,
  };
  material.onBeforeCompile(shader, {});
  return shader;
}

test('aimed emitters follow their physical fixtures and targets in both asset layouts', () => {
  assert.equal(lights.length, 5);
  assert.ok(lights.every((light) => light.isSpotLight && light.castShadow));
  for (const layout of ['compact', 'wide']) {
    model.setLayout(layout);
    model.group.updateMatrixWorld(true);
    for (const light of lights.filter(
      (light) => light.userData.section !== 'walkway',
    )) {
      const world = light.getWorldPosition(new THREE.Vector3());
      const [x, y] = model.group.userData.roomAnchors[light.userData.section];
      assert.ok(Math.abs(world.x - x) > 0.7);
      assert.equal(
        light.parent.name,
        `${light.userData.section}-aimed-lamp-fixture`,
      );
      assert.ok(world.y > y + 1.1 && world.y < y + 1.3);
      const direction = light.target
        .getWorldPosition(new THREE.Vector3())
        .sub(world)
        .normalize();
      const fixtureDirection = new THREE.Vector3(0, -1, 0).applyNormalMatrix(
        new THREE.Matrix3().getNormalMatrix(light.parent.matrixWorld),
      );
      assert.ok(
        direction.dot(fixtureDirection) > 0.999999,
        'emitter points along the angled fixture after room scaling',
      );
      assert.ok(
        direction.y < -0.5 && direction.z < -0.4,
        'beam points down and toward the rear furnishings',
      );
      const casters = meshes.filter((mesh) => mesh.castShadow);
      const blocked = new THREE.Raycaster(
        world,
        direction,
        0,
        0.15,
      ).intersectObjects(casters, false);
      assert.equal(blocked.length, 0, 'own housing must not block the lamp');
      assert.ok(light.shadow.camera.near < 0.1);
      assert.ok(light.penumbra > 0);
    }
  }
  assert.equal(createExteriorLight(THREE).castShadow, true);
});

test('the ladder lamp remains attached, unobstructed and aimed across the rungs in both layouts', () => {
  const light = lights.find((light) => light.userData.section === 'walkway');
  const mount = model.group.getObjectByName('ladder-bay-lamp-mount');
  const lamp = light.parent;
  const sizes = [];
  for (const layout of ['compact', 'wide']) {
    model.setLayout(layout);
    model.group.updateMatrixWorld(true);
    const wall = wallLayout(layout === 'wide' ? 1.4 : 1);
    const position = mount.getWorldPosition(new THREE.Vector3());
    assert.ok(Math.abs(position.x - wall.ladderRightWall) < 1e-8);
    assert.equal(position.y, LADDER_CENTER_Y);
    assert.deepEqual(
      lamp.getWorldScale(new THREE.Vector3()).toArray(),
      [1, 1, 1],
    );
    const fixtureBounds = new THREE.Box3().setFromObject(mount);
    sizes.push(fixtureBounds.getSize(new THREE.Vector3()).toArray());
    const cassette = model.group.getObjectByName(
      'ladder-wall-isolation-cassette',
    );
    assert.ok(
      !fixtureBounds.intersectsBox(new THREE.Box3().setFromObject(cassette)),
    );
    for (const guide of meshes.filter(
      (mesh) => mesh.name === 'recessed-iris-guide',
    ))
      assert.ok(
        !fixtureBounds.intersectsBox(new THREE.Box3().setFromObject(guide)),
      );
    const source = light.getWorldPosition(new THREE.Vector3());
    const direction = light.target
      .getWorldPosition(new THREE.Vector3())
      .sub(source)
      .normalize();
    const normal = new THREE.Vector3(0, 0, -1).transformDirection(
      lamp.matrixWorld,
    );
    assert.ok(normal.dot(direction) > 0.999999);
    assert.ok(direction.x < -0.3 && direction.z < -0.8);
    const blocked = new THREE.Raycaster(
      source,
      direction,
      0,
      0.15,
    ).intersectObjects(
      meshes.filter((mesh) => mesh.castShadow),
      false,
    );
    assert.equal(blocked.length, 0);
  }
  sizes[0].forEach((value, index) =>
    assert.ok(Math.abs(value - sizes[1][index]) < 1e-8),
  );
  model.update(1, '', true, { activeRoom: 'home' });
  const intensity = light.intensity;
  model.update(2, '', true, {
    activeRoom: 'about',
    travelling: true,
    transitWalkway: true,
  });
  assert.equal(
    light.intensity,
    intensity,
    'navigation feedback must not invalidate cached lighting',
  );
  const receivers = linked.shadowReceivers().get(light);
  assert.ok(
    [...receivers].some(
      (mesh) => mesh.parent?.name === 'engineering-service-spine',
    ),
  );
  assert.ok(
    [...receivers].some((mesh) =>
      mesh.userData.parts?.includes('walkway-continuous-rear-liner'),
    ),
  );
  assert.ok([...receivers].every((mesh) => !mesh.material.userData.exterior));
});

test('room and shared-door materials link fixture light and shadows together while retaining faint sunlight', () => {
  const checked = new Set();
  let shared = 0;
  for (const mesh of meshes) {
    for (const material of [mesh.material].flat()) {
      if (checked.has(material) || !material.isMeshStandardMaterial) continue;
      checked.add(material);
      const section = material.userData.section ?? mesh.userData.section;
      const allowed = material.userData.exterior
        ? []
        : (material.userData.linkedRooms ?? [section]);
      const expected = lights.filter((light) =>
        allowed.includes(light.userData.section),
      );
      const shader = compile(material);
      assert.match(
        shader.fragmentShader,
        /getDirectionalLightInfo\( directionalLight, directLight \)/,
      );
      assert.match(
        shader.fragmentShader,
        /getShadow\( directionalShadowMap\[ i \]/,
      );
      assert.doesNotMatch(
        shader.fragmentShader,
        /#if 0 \/\/ Exterior sunlight/,
      );
      if (!expected.length) {
        assert.equal(shader.uniforms.cabinEmitterPositions, undefined);
        assert.doesNotMatch(
          shader.fragmentShader,
          /getSpotLightInfo\( spotLight/,
        );
        continue;
      }
      assert.match(shader.fragmentShader, /getShadow\( spotShadowMap\[ i \]/);
      assert.ok(
        shader.fragmentShader.indexOf('if (distance(spotLight.position') <
          shader.fragmentShader.indexOf('getSpotLightInfo( spotLight'),
        'membership gates both illumination and its shadow lookup',
      );
      if (expected.length > 1) shared++;
      assert.equal(
        shader.uniforms.cabinEmitterPositions.value.length,
        expected.length,
      );
      for (const roll of [0, Math.PI / 2]) {
        camera.position.set(2, -3, 12);
        camera.rotation.set(0.1, 0.2, roll);
        camera.updateMatrixWorld();
        model.group.updateMatrixWorld(true);
        linked.update(camera);
        const actual = shader.uniforms.cabinEmitterPositions.value;
        for (const light of expected) {
          const position = light
            .getWorldPosition(new THREE.Vector3())
            .applyMatrix4(camera.matrixWorldInverse);
          assert.ok(actual.some((value) => value.distanceTo(position) < 1e-8));
        }
      }
    }
  }
  assert.ok(
    shared > 0,
    'shared physical hatch faces must accept both neighboring cabins',
  );
});

test('lighting preserves authored shadow casters and receivers, including cabin walls and the live dish', () => {
  for (const mesh of meshes)
    assert.deepEqual(
      [mesh.castShadow, mesh.receiveShadow],
      authoredShadows.get(mesh),
      mesh.name,
    );
  const walls = meshes.filter((mesh) =>
    [mesh.name, ...(mesh.userData.parts || [])].some((name) =>
      name.endsWith('continuous-pressure-skin-interior'),
    ),
  );
  assert.equal(walls.length, 4);
  assert.ok(walls.every((mesh) => mesh.castShadow && mesh.receiveShadow));
  const dish = model.group.getObjectByName(
    'service-mounted-communications-dish',
  );
  let casters = 0;
  dish.traverse((object) => {
    if (object.isMesh && object.castShadow) casters++;
  });
  assert.ok(casters > 0);
});

test('shadow invalidation uses the same material membership as the light shader', () => {
  const receivers = linked.shadowReceivers();
  for (const mesh of meshes) {
    for (const light of lights) {
      const expected =
        mesh.receiveShadow &&
        [mesh.material].flat().some((material) => {
          if (!material.isMeshStandardMaterial) return false;
          const positions =
            compile(material).uniforms.cabinEmitterPositions?.value ?? [];
          const world = light
            .getWorldPosition(new THREE.Vector3())
            .applyMatrix4(camera.matrixWorldInverse);
          return positions.some(
            (position) => position.distanceTo(world) < 1e-8,
          );
        });
      assert.equal(receivers.get(light).has(mesh), expected, mesh.name);
    }
  }
});

test('light linking preserves authored shader hooks and separates programs by membership count', () => {
  const root = new THREE.Group();
  const light = new THREE.SpotLight();
  light.userData.section = 'about';
  root.add(light);
  const material = new THREE.MeshPhysicalMaterial({ clearcoat: 0.2 });
  material.userData.section = 'about';
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader += '\n// authored iris mask';
  };
  material.customProgramCacheKey = () => 'authored';
  root.add(new THREE.Mesh(new THREE.BoxGeometry(), material));
  applyCabinLighting(THREE, root);
  assert.match(compile(material).fragmentShader, /authored iris mask/);
  assert.equal(
    material.customProgramCacheKey(),
    'authored|cabin-lighting-v3:1',
  );
  assert.throws(
    () => cabinLightingChunk('changed upstream shader', 1),
    /Review cabin lighting/,
  );
});
