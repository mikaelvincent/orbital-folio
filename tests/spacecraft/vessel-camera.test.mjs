import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import * as THREE from 'three';
import { createVesselCameraFrame } from '../../features/spacecraft/navigation/vessel-camera.ts';

const close = (a, b, label) =>
  assert.ok(Math.abs(a - b) < 1e-8, `${label}: ${a} vs ${b}`);
const sameMatrix = (a, b, label) =>
  a.elements.forEach((v, i) => close(v, b.elements[i], `${label}[${i}]`));
const zAxis = new THREE.Vector3(0, 0, 1);

void test('Stationary hull camera preserves the prior model-view matrix through travel, tilt, dolly and every roll', () => {
  const rig = createVesselCameraFrame(THREE);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 500);
  const oldCamera = camera.clone();
  const hull = new THREE.Group();
  for (const aspect of [390 / 844, 1, 1422 / 871, 2560 / 600]) {
    camera.aspect = oldCamera.aspect = aspect;
    camera.updateProjectionMatrix();
    oldCamera.updateProjectionMatrix();
    for (let step = 0; step <= 32; step++) {
      const roll = ((Math.PI / 2) * step) / 32;
      const target = new THREE.Vector3(-5 + step / 4, 3 * Math.sin(step), 0.4);
      const direction = new THREE.Vector3(
        Math.sin(step) * 0.35,
        Math.cos(step) * 0.2,
        1,
      ).normalize();
      const distance = 6 + step * 3;
      oldCamera.position.copy(target).addScaledVector(direction, distance);
      oldCamera.lookAt(target);
      oldCamera.updateMatrixWorld(true);
      const oldHull = new THREE.Matrix4().makeRotationZ(roll);
      const oldView = oldCamera.matrixWorldInverse.clone().multiply(oldHull);
      rig.apply(camera, target, direction, distance, roll);
      sameMatrix(camera.matrixWorldInverse, oldView, 'model-view');
      sameMatrix(
        rig.virtualCamera.matrixWorld,
        oldCamera.matrixWorld,
        'annotation camera',
      );
      sameMatrix(
        rig.projectionModel.matrixWorld,
        oldHull,
        'annotation-only transform',
      );
      for (const point of [
        [-7, -4, -1],
        [7, 4, 2],
        [0, 0, 0],
      ]) {
        const before = new THREE.Vector3(...point)
          .applyMatrix4(oldHull)
          .project(oldCamera);
        const after = new THREE.Vector3(...point).project(camera);
        assert.ok(before.distanceTo(after) < 1e-9);
      }
      assert.deepEqual(hull.rotation.toArray(), [0, 0, 0, 'XYZ']);
      sameMatrix(hull.matrix, new THREE.Matrix4(), 'hull stays fixed');
    }
  }
});

void test('Transferred lighting preserves the rectangular shadow projection and light direction relative to the hull', () => {
  const oldLight = new THREE.DirectionalLight();
  const newLight = new THREE.DirectionalLight();
  for (const light of [oldLight, newLight]) {
    light.position.set(-7, 10, 12);
    Object.assign(light.shadow.camera, {
      left: -10,
      right: 10,
      top: 7,
      bottom: -7,
      near: 0.5,
      far: 36,
    });
    light.shadow.camera.updateProjectionMatrix();
    light.updateMatrixWorld(true);
    light.target.updateMatrixWorld(true);
  }
  oldLight.shadow.updateMatrices(oldLight);
  for (let step = 0; step <= 16; step++) {
    const roll = (Math.PI * step) / 32;
    const inverse = new THREE.Quaternion().setFromAxisAngle(zAxis, -roll);
    newLight.position.copy(oldLight.position).applyQuaternion(inverse);
    newLight.shadow.camera.up.set(0, 1, 0).applyQuaternion(inverse);
    newLight.updateMatrixWorld(true);
    newLight.shadow.updateMatrices(newLight);
    const prior = oldLight.shadow.matrix
      .clone()
      .multiply(new THREE.Matrix4().makeRotationZ(roll));
    sameMatrix(newLight.shadow.matrix, prior, 'shadow UV projection');
  }
});

const bundled = await build({
  entryPoints: ['features/orbit/orbital-environment.ts'],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
  logLevel: 'silent',
});
const { createOrbitalEnvironment, ORBITAL_WORLD_SCALE } = await import(
  `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`
);

void test('Orbital camera shares the physical pose under a fixed world registration, without resetting on updates', async (t) => {
  const env = createOrbitalEnvironment(THREE, () => {}, {
    earthTexture: new THREE.Texture({ width: 4096, height: 3072 }),
    cameraFov: 38,
  });
  t.after(() => env.dispose());
  await env.ready;
  const reference = new THREE.PerspectiveCamera(38, 1, 0.5, 1000);
  const physical = reference.clone();
  const rig = createVesselCameraFrame(THREE);
  const originRig = createVesselCameraFrame(THREE);
  for (const [width, height, overviewDistance, overviewRoll] of [
    [1422, 871, 30, 0],
    [390, 844, 60, Math.PI / 2],
    [768, 4096, 220, Math.PI / 2],
  ]) {
    env.resize(width, height, 2);
    reference.aspect = physical.aspect = width / height;
    reference.updateProjectionMatrix();
    physical.updateProjectionMatrix();
    originRig.apply(
      reference,
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(-0.18, 0.14, 1).normalize(),
      overviewDistance,
      overviewRoll,
    );
    const registration = reference.matrixWorld
      .clone()
      .multiply(
        new THREE.Matrix4().makeScale(
          ORBITAL_WORLD_SCALE,
          ORBITAL_WORLD_SCALE,
          ORBITAL_WORLD_SCALE,
        ),
      );
    const earth = env.scene.getObjectByName('satellite-earth-surface').parent;
    const earthPosition = earth.position.clone();
    for (let step = 0; step <= 30; step++) {
      const ratio = step / 30;
      rig.apply(
        physical,
        new THREE.Vector3(-6 * ratio, 3 * ratio, 0),
        new THREE.Vector3(
          -0.18 * (1 - ratio),
          0.14 * (1 - ratio),
          1,
        ).normalize(),
        overviewDistance * (1 - ratio) + 7 * ratio,
        overviewRoll * (1 - ratio),
      );
      env.followCamera(physical, reference);
      for (const point of [
        [-40, -60, -280],
        [80, 60, -480],
        earthPosition.toArray(),
      ]) {
        const authored = new THREE.Vector3(...point).project(env.camera);
        const registered = new THREE.Vector3(...point)
          .applyMatrix4(registration)
          .project(physical);
        close(authored.x, registered.x, 'shared X projection');
        close(authored.y, registered.y, 'shared Y projection');
      }
      assert.ok(
        earth.position.distanceTo(env.camera.position) > 184,
        'Camera never enters the Earth or atmosphere',
      );
      assert.ok(
        earth.position.equals(earthPosition),
        'Navigating does not reposition the planet',
      );
      const before = env.camera.matrixWorld.clone();
      env.update(0, false, 0.9, -0.9);
      env.camera.updateMatrixWorld(true);
      sameMatrix(
        env.camera.matrixWorld,
        before,
        'Legacy pointer drift cannot override physical pose',
      );
    }
  }
  assert.equal(env.getDiagnostics().cameraMode, 'shared-world-camera');
  assert.equal(env.getDiagnostics().earthTextureDimensions[0], 4096);
});
