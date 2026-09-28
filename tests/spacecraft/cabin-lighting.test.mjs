import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';
import {
  applyCabinLighting,
  cabinLightingChunk,
  createExteriorLight,
} from '../../features/spacecraft/lighting.ts';

const model = createSpacecraft(THREE, { layout: 'wide' });
const lights = [];
const meshes = [];
model.group.traverse((object) => {
  if (object.isLight) lights.push(object);
  if (object.isMesh) meshes.push(object);
});
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

test('ceiling emitters remain aligned and downward-facing in both asset layouts', () => {
  assert.equal(lights.length, 4);
  assert.ok(
    lights.every((light) => light.isRectAreaLight && !light.castShadow),
  );
  for (const layout of ['compact', 'wide']) {
    model.setLayout(layout);
    model.group.updateMatrixWorld(true);
    for (const light of lights) {
      const world = light.getWorldPosition(new THREE.Vector3());
      const [x, y] = model.group.userData.roomAnchors[light.userData.section];
      assert.ok(Math.abs(world.x - x) < 1e-8);
      assert.ok(world.y > y + 1.3 && world.y < y + 1.455);
      assert.ok(
        new THREE.Vector3(0, 0, -1)
          .transformDirection(light.matrixWorld)
          .distanceTo(new THREE.Vector3(0, -1, 0)) < 1e-8,
      );
      assert.equal(light.width, 2.15 * (layout === 'wide' ? 1.4 : 1));
    }
  }
  assert.equal(createExteriorLight(THREE).castShadow, true);
});

test('actual room and shared-door materials follow only their admitted emitters across camera movement', () => {
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
      if (!expected.length) {
        assert.equal(shader.uniforms.cabinEmitterPositions, undefined);
        assert.doesNotMatch(
          shader.fragmentShader,
          /RE_Direct_RectArea\( rectAreaLight/,
        );
        continue;
      }
      if (expected.length > 1) shared++;
      assert.match(shader.fragmentShader, /#if 0 \/\/ Exterior sunlight/);
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

test('interior geometry leaves the sun shadow pass while the dish remains a live caster', () => {
  const walls = meshes.filter((mesh) =>
    [mesh.name, ...(mesh.userData.parts || [])].some((name) =>
      name.endsWith('continuous-pressure-skin-interior'),
    ),
  );
  assert.equal(walls.length, 4);
  assert.ok(walls.every((mesh) => !mesh.castShadow && !mesh.receiveShadow));
  const dish = model.group.getObjectByName(
    'service-mounted-communications-dish',
  );
  let casters = 0;
  dish.traverse((object) => {
    if (object.isMesh && object.castShadow) casters++;
  });
  assert.ok(casters > 0);
});

test('light linking preserves authored shader hooks and separates programs by membership count', () => {
  const root = new THREE.Group();
  const light = new THREE.RectAreaLight();
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
    'authored|cabin-lighting-v1:1',
  );
  assert.throws(
    () => cabinLightingChunk('changed upstream shader', 1, false),
    /Review cabin lighting/,
  );
});
