import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';
import {
  applyCabinLighting,
  cabinLightingChunk,
  createExteriorLight,
  roomLightColor,
  VESSEL_LIGHTING,
} from '../../features/spacecraft/lighting.ts';
import { DEFAULT_RENDERING_SETTINGS } from '../../features/spacecraft/rendering-settings.ts';
const fixtures = [];
class SourceMesh extends THREE.Mesh {
  removeFromParent() {
    if (this.name === 'service-spine-bay-worklight-diffuser' && this.parent)
      fixtures.push({
        mesh: this,
        parent: this.parent,
        matrix: this.matrix.clone(),
      });
    return super.removeFromParent();
  }
}
const model = createSpacecraft(
  { ...THREE, Mesh: SourceMesh },
  { layout: 'wide' },
);
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
  assert.equal(lights.length, 10);
  assert.ok(lights.every((light) => light.isSpotLight && light.castShadow));
  for (const layout of ['compact', 'wide']) {
    model.setLayout(layout);
    model.group.updateMatrixWorld(true);
    for (const room of ['projects', 'experience', 'about', 'contact']) {
      const pair = lights.filter((light) => light.userData.section === room);
      assert.equal(pair.length, 2);
      const key = pair.find((light) => light.userData.cabinBeam === 'key');
      const fill = pair.find((light) => light.userData.cabinBeam === 'fill');
      assert.equal(key.parent, fill.parent);
      assert.equal(
        key.target,
        fill.target,
        'both beams follow the same physical aim',
      );
      assert.ok(
        key.position.equals(fill.position),
        'no displaced second shadow',
      );
      assert.notEqual(
        key.shadow,
        fill.shadow,
        'each beam needs its own shadow projection',
      );
      assert.ok(key.intensity > fill.intensity && key.angle < fill.angle);
    }
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

test('both existing guarded ladder fixtures provide unobstructed light in both layouts', () => {
  const ladder = lights.filter((light) => light.userData.section === 'walkway');
  assert.equal(ladder.length, 2);
  assert.equal(fixtures.length, 2);
  assert.equal(model.group.getObjectByName('ladder-bay-lamp-mount'), undefined);
  assert.ok(
    meshes.every(
      (mesh) =>
        !mesh.userData.parts?.some((name) => name.startsWith('ladder-lamp-')),
    ),
  );
  for (const layout of ['compact', 'wide']) {
    model.setLayout(layout);
    model.group.updateMatrixWorld(true);
    for (const [index, light] of ladder.entries()) {
      const fixture = fixtures[index];
      assert.equal(light.parent, fixture.parent);
      const source = light.getWorldPosition(new THREE.Vector3());
      fixture.mesh.geometry.computeBoundingBox();
      const lens = fixture.mesh.geometry.boundingBox.getCenter(
        new THREE.Vector3(),
      );
      lens.z = fixture.mesh.geometry.boundingBox.max.z;
      lens
        .applyMatrix4(fixture.matrix)
        .applyMatrix4(fixture.parent.matrixWorld);
      const expected = lens.clone().add(new THREE.Vector3(0, 0, 0.012));
      assert.ok(
        source.distanceTo(expected) < 1e-8,
        'source follows the actual existing diffuser face',
      );
      const direction = light.target
        .getWorldPosition(new THREE.Vector3())
        .sub(source)
        .normalize();
      assert.ok(
        direction.x < 0 && direction.z > 0.5,
        'beam leaves the front of the rear-mounted worklight',
      );
      const blocked = new THREE.Raycaster(
        source,
        direction,
        0,
        0.15,
      ).intersectObjects(
        meshes.filter((mesh) => mesh.castShadow),
        false,
      );
      assert.equal(
        blocked.length,
        0,
        'own guard and housing must not block the source',
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
      assert.ok(
        [...receivers].every((mesh) => !mesh.material.userData.exterior),
      );
    }
  }
});

test('room and ladder brightness stay independent through navigation and do not change shadow geometry', () => {
  model.update(1, '', true, { activeRoom: 'home', reducedMotion: true });
  const revision = model.group.userData.geometryRevision;
  const fixtures = meshes
    .flatMap((mesh) => [mesh.material].flat())
    .filter((material) => material.userData.lightFixture);
  const emissions = new Map(
    fixtures.map((material) => [material, material.emissive.clone()]),
  );
  const set = (rooms, ladder) => {
    model.setLighting(rooms, ladder);
    model.update(1, '', true, { activeRoom: 'home', reducedMotion: true });
    for (const light of lights) {
      const walkway = light.userData.section === 'walkway';
      assert.equal(
        light.intensity,
        walkway
          ? VESSEL_LIGHTING.ladderIntensity * ladder
          : VESSEL_LIGHTING.cabinIntensity *
              rooms *
              (light.userData.cabinBeam === 'fill'
                ? DEFAULT_RENDERING_SETTINGS.roomFillLight
                : DEFAULT_RENDERING_SETTINGS.roomKeyLight),
      );
    }
    for (const material of fixtures) {
      const scale = material.userData.section === 'walkway' ? ladder : rooms;
      const expected = emissions.get(material).clone().multiplyScalar(scale);
      for (const channel of ['r', 'g', 'b'])
        assert.ok(
          Math.abs(material.emissive[channel] - expected[channel]) < 1e-12,
        );
    }
    assert.equal(model.group.userData.geometryRevision, revision);
  };
  set(0, 1.5);
  set(2, 0);
  set(1, 1);
  const intensities = lights.map((light) => light.intensity);
  model.update(2, '', true, {
    activeRoom: 'about',
    travelling: true,
    transitWalkway: true,
  });
  assert.deepEqual(
    lights.map((light) => light.intensity),
    intensities,
  );
});

test('independent beam strengths survive animation, navigation and zero settings without changing geometry', () => {
  model.update(2, '', true, { activeRoom: 'home', reducedMotion: true });
  const revision = model.group.userData.geometryRevision;
  for (const [key, wide] of [
    [1.6, 0.15],
    [0, 1],
    [1, 0],
    [0, 0],
  ]) {
    model.setLighting(1.25, 0.6, DEFAULT_RENDERING_SETTINGS.roomWarmth, {
      ...DEFAULT_RENDERING_SETTINGS,
      roomKeyLight: key,
      roomFillLight: wide,
    });
    for (const state of [
      { activeRoom: 'home' },
      { activeRoom: 'projects' },
      { activeRoom: 'contact', travelling: true, transitRoom: 'about' },
      { activeRoom: 'contact', travelling: false, transitRoom: '' },
    ]) {
      model.update(2, '', true, { reducedMotion: true, ...state });
      for (const light of lights) {
        const ladder = light.userData.section === 'walkway';
        const expected = ladder
          ? VESSEL_LIGHTING.ladderIntensity * 0.6
          : VESSEL_LIGHTING.cabinIntensity *
            1.25 *
            (light.userData.cabinBeam === 'fill' ? wide : key);
        assert.equal(light.intensity, expected, light.name);
      }
      if (key === 0 && wide === 0) {
        for (const material of meshes.flatMap((mesh) => [mesh.material].flat()))
          if (
            material.userData.lightFixture &&
            material.userData.section !== 'walkway'
          )
            assert.equal(
              material.emissive.getHex(),
              0,
              'a switched-off fixture does not glow',
            );
      }
    }
    assert.equal(model.group.userData.geometryRevision, revision);
  }
  model.setLighting(1, 1);
  model.update(2, '', true, {
    activeRoom: 'home',
    travelling: false,
    transitRoom: '',
    reducedMotion: true,
  });
});

test('room and shared-door materials link fixtures, fill and attenuated sunlight while exterior materials retain the sun', () => {
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
        assert.equal(shader.uniforms.cabinSunlight, undefined);
        assert.equal(shader.uniforms.cabinFill, undefined);
        assert.doesNotMatch(
          shader.fragmentShader,
          /getSpotLightInfo\( spotLight/,
        );
        continue;
      }
      assert.equal(
        shader.uniforms.cabinSunlight.value,
        DEFAULT_RENDERING_SETTINGS.exteriorSpill,
      );
      assert.match(
        shader.fragmentShader,
        /directLight.color \*= cabinSunlight/,
      );
      assert.match(shader.fragmentShader, /irradiance \+= cabinFill/);
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
    'authored|cabin-lighting-v4:1',
  );
  assert.throws(
    () => cabinLightingChunk('changed upstream shader', 1),
    /Review cabin lighting/,
  );
});

test('cabin-facing ladder partitions receive the same interior profile as the cabin walls', () => {
  for (const room of ['projects', 'about']) {
    const name = `walkway-${room}-cabin-facing-wall`;
    const faces = meshes.filter(
      (mesh) => mesh.name === name || mesh.userData.parts?.includes(name),
    );
    assert.ok(faces.length, name);
    for (const face of faces) {
      for (const material of [face.material].flat()) {
        assert.equal(material.userData.exterior, false, name);
        assert.deepEqual(material.userData.linkedRooms, [room, 'walkway']);
        const shader = compile(material);
        assert.ok(shader.uniforms.cabinFill, name);
        assert.equal(
          shader.uniforms.cabinSunlight.value,
          DEFAULT_RENDERING_SETTINGS.exteriorSpill,
        );
      }
    }
  }
});

test('warmth, spread and fill stay shared across rooms and hatch faces without recompilation', () => {
  const uniforms = meshes
    .flatMap((mesh) => [mesh.material].flat())
    .filter((material) => material.isMeshStandardMaterial)
    .map((material) => ({ material, uniforms: compile(material).uniforms }));
  const revision = model.group.userData.geometryRevision;
  for (const settings of [
    {
      ...DEFAULT_RENDERING_SETTINGS,
      roomWarmth: 1,
      roomSpread: 85,
      roomFillSpread: 55,
      roomFill: 0.8,
      exteriorSpill: 0,
      roomLight: 0,
      ladderLight: 2,
    },
    {
      ...DEFAULT_RENDERING_SETTINGS,
      roomWarmth: 0,
      roomSpread: 35,
      roomFillSpread: 85,
      roomFill: 0,
      exteriorSpill: 1,
      roomLight: 2,
      ladderLight: 0,
    },
    DEFAULT_RENDERING_SETTINGS,
  ]) {
    const color = roomLightColor(THREE, settings.roomWarmth);
    model.setLighting(
      settings.roomLight,
      settings.ladderLight,
      settings.roomWarmth,
    );
    linked.setAppearance(settings);
    for (const layout of ['compact', 'wide']) {
      model.setLayout(layout);
      for (const section of ['projects', 'experience', 'about', 'contact']) {
        model.update(2, '', true, { activeRoom: section, reducedMotion: true });
        for (const light of lights) {
          assert.ok(light.color.equals(color));
          if (light.userData.section !== 'walkway')
            assert.equal(
              light.angle,
              THREE.MathUtils.degToRad(
                light.userData.cabinBeam === 'fill'
                  ? settings.roomFillSpread
                  : settings.roomSpread,
              ),
            );
        }
      }
    }
    for (const { material, uniforms: shader } of uniforms) {
      if (!shader.cabinFill) continue;
      const rooms = material.userData.linkedRooms ?? [
        material.userData.section,
      ];
      const level = Math.max(
        ...rooms.map((room) =>
          room === 'walkway' ? settings.ladderLight : settings.roomLight,
        ),
      );
      const expected = color
        .clone()
        .multiplyScalar(Math.PI * settings.roomFill * level);
      assert.ok(shader.cabinFill.value.equals(expected), material.name);
      assert.equal(shader.cabinSunlight.value, settings.exteriorSpill);
    }
  }
  // Layout changes may alter geometry; changing just the appearance must not.
  const afterLayout = model.group.userData.geometryRevision;
  linked.setAppearance({ ...DEFAULT_RENDERING_SETTINGS, roomFill: 0.6 });
  assert.equal(model.group.userData.geometryRevision, afterLayout);
  assert.ok(afterLayout >= revision);
  linked.setAppearance(DEFAULT_RENDERING_SETTINGS);
});
