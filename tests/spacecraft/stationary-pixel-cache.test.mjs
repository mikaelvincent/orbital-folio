/* eslint-disable typescript/unbound-method -- Tests compare preserved renderer method identity. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { createStationaryPixelCache } from '../../features/spacecraft/stationary-pixel-cache.ts';

function fixture(
  withDish = false,
  eligible = () => true,
  areaLight = false,
  lampCount = 0,
  beforeCache = () => {},
) {
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera();
  const group = new THREE.Group();
  scene.add(group);
  group.userData.geometryRevision = 0;
  const hull = new THREE.Mesh(
    new THREE.BoxGeometry(),
    new THREE.MeshStandardMaterial(),
  );
  const meter = new THREE.Mesh(
    new THREE.BoxGeometry(),
    new THREE.MeshStandardMaterial(),
  );
  meter.material.userData.ambientColorAnimation = true;
  const ink = new THREE.Mesh(
    new THREE.PlaneGeometry(),
    new THREE.MeshBasicMaterial({ transparent: true }),
  );
  hull.add(ink);
  group.add(hull, meter);
  const light = areaLight
    ? new THREE.RectAreaLight()
    : new THREE.DirectionalLight();
  scene.add(light);
  let dish, ao;
  if (withDish) {
    dish = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.2, 0.2),
      new THREE.MeshStandardMaterial(),
    );
    dish.name = 'service-mounted-communications-dish';
    hull.castShadow = dish.castShadow = true;
    group.add(dish);
    dish.position.x = -2;
    hull.position.x = 2;
    group.userData.dishGeometryRevision = 0;
    camera.position.z = 8;
    camera.updateMatrixWorld();
    light.castShadow = true;
    light.shadow.autoUpdate = false;
    light.shadow.needsUpdate = true;
    light.position.z = 10;
    light.shadow.map = new THREE.WebGLRenderTarget(512, 512);
    ao = new GTAOPass(scene, camera, 100, 100);
    ao.updateGtaoMaterial({ radius: 0.32, thickness: 0.18 });
  }
  const lamps = Array.from({ length: lampCount }, () => {
    const lamp = new THREE.SpotLight();
    lamp.castShadow = true;
    lamp.shadow.autoUpdate = false;
    lamp.shadow.needsUpdate = true;
    scene.add(lamp, lamp.target);
    return lamp;
  });
  beforeCache({ scene, group, hull, dish });
  camera.updateMatrixWorld();
  scene.updateMatrixWorld(true);
  let target = null,
    alpha = 1;
  const color = new THREE.Color(0x123456);
  const passes = [];
  const shadowPasses = [];
  const renderer = {
    shadowMap: {
      needsUpdate: true,
      enabled: true,
      type: THREE.PCFShadowMap,
      render(lights, root, view) {
        for (const source of lights) {
          if (!source.castShadow) continue;
          const shadow = source.shadow;
          if (!shadow.autoUpdate && !shadow.needsUpdate) continue;
          shadow.map ??= new THREE.WebGLRenderTarget(512, 512);
          const casters = [];
          root.traverseVisible((o) => {
            if (o.isMesh && o.castShadow && o.layers.test(view.layers))
              casters.push(o);
          });
          shadowPasses.push({
            source,
            casters,
            scissor: shadow.map.scissorTest,
          });
          shadow.needsUpdate = false;
        }
        this.needsUpdate = false;
      },
    },
    toneMapping: THREE.ACESFilmicToneMapping,
    toneMappingExposure: 0.95,
    outputColorSpace: THREE.SRGBColorSpace,
    getRenderTarget: () => target,
    setRenderTarget: (value) => {
      target = value;
    },
    getDrawingBufferSize: (value) => value.set(80, 60),
    getClearAlpha: () => alpha,
    getClearColor: (value) => value.copy(color),
    setClearColor: (value, a) => {
      color.set(value);
      alpha = a;
    },
    clear() {},
    render(root) {
      const shadows = this.shadowMap.needsUpdate;
      if (root === scene && this.shadowMap.needsUpdate)
        this.shadowMap.render([light, ...lamps], scene, camera);
      const meshes = [];
      root.traverseVisible((o) => {
        if (o.isMesh && o.layers.test(camera.layers)) meshes.push(o);
      });
      passes.push({
        target,
        meshes,
        shadows,
        root,
      });
      if (root === scene) this.shadowMap.needsUpdate = false;
    },
  };
  const original = renderer.render;
  const cache = createStationaryPixelCache({
    three: THREE,
    renderer,
    scene,
    camera,
    model: { group },
    key: withDish ? light : undefined,
    ao,
    eligible,
  });
  const frames = (n = 6) => {
    for (let i = 0; i < n; i++) renderer.render(scene, camera);
  };
  return {
    scene,
    camera,
    group,
    dish,
    ao,
    hull,
    meter,
    ink,
    light,
    lamps,
    renderer,
    original,
    passes,
    shadowPasses,
    cache,
    frames,
  };
}

function disposeDishFixture(f) {
  f.cache.dispose();
  f.ao.dispose();
  for (const light of [f.light, ...f.lamps]) light.shadow.map?.dispose();
}

function moveDish(f) {
  f.dish.rotation.y += 0.1;
  f.scene.updateMatrixWorld(true);
  f.group.userData.geometryRevision++;
  f.group.userData.dishGeometryRevision++;
  f.group.userData.shadowCasterChanged = true;
  f.light.shadow.needsUpdate = true;
  f.renderer.shadowMap.needsUpdate = true;
  f.frames(1);
}

test('ten cached interior maps coexist with regional sun, color and AO reuse', () => {
  const f = fixture(true, undefined, false, 10);
  f.frames();
  f.cache.occlusion(() => {}, true);
  const before = f.cache.stats();
  assert.equal(before.valid, true);
  for (const lamp of f.lamps) {
    const passes = f.shadowPasses.filter((p) => p.source === lamp);
    assert.equal(passes.length, 1);
    assert.ok(passes[0].casters.includes(f.hull));
  }
  const shadowStart = f.shadowPasses.length;
  moveDish(f);
  f.cache.occlusion(() => {}, true);
  const after = f.cache.stats();
  assert.equal(after.builds, before.builds);
  assert.equal(after.hits, before.hits + 1);
  assert.equal(after.influence.aoRepairs, 1);
  const repairs = f.shadowPasses.slice(shadowStart);
  assert.equal(repairs.length, 1);
  assert.equal(repairs[0].source, f.light);
  assert.equal(repairs[0].scissor, true);
  assert.ok(repairs[0].casters.includes(f.dish));
  assert.ok(!repairs[0].casters.includes(f.hull));
  disposeDishFixture(f);
});

test('AO-off frames reuse color and repair moving shadows without drawing contact shading', () => {
  const f = fixture(true, undefined, false, 10);
  f.frames();
  const before = f.cache.stats();
  assert.equal(before.valid, true);
  assert.equal(f.cache.requiresOcclusion(), true);
  const shadowStart = f.shadowPasses.length;
  for (let i = 0; i < 4; i++) moveDish(f);
  const after = f.cache.stats();
  assert.equal(after.builds, before.builds);
  assert.equal(after.hits, before.hits + 4);
  assert.equal(after.influence.aoRepairs, 0);
  const repairs = f.shadowPasses.slice(shadowStart);
  assert.equal(repairs.length, 4);
  assert.ok(repairs.every((pass) => pass.source === f.light && pass.scissor));
  assert.ok(repairs.every((pass) => pass.casters.includes(f.dish)));
  let fullAo = 0;
  f.cache.occlusion(() => fullAo++, true);
  assert.equal(
    fullAo,
    1,
    'enabling contact shading starts with a complete AO draw',
  );
  assert.equal(f.cache.requiresOcclusion(), false);
  disposeDishFixture(f);
});

test('a dirty interior map restores all casters and recaptures color while retaining regional AO', () => {
  const f = fixture(true, undefined, false, 6);
  f.frames();
  f.cache.occlusion(() => {}, true);
  const before = f.cache.stats();
  f.lamps[4].shadow.needsUpdate = true;
  const shadowStart = f.shadowPasses.length;
  moveDish(f);
  assert.equal(f.cache.stats().valid, false);
  assert.equal(f.cache.requiresOcclusion(), false);
  assert.equal(f.cache.stats().influence.shadowRepairs, 0);
  for (const pass of f.shadowPasses.slice(shadowStart)) {
    assert.ok(pass.casters.includes(f.hull));
    assert.ok(pass.casters.includes(f.dish));
    assert.equal(pass.scissor, false);
  }
  assert.deepEqual(
    f.shadowPasses.slice(shadowStart).map((p) => p.source),
    [f.light, f.lamps[4]],
  );
  f.cache.occlusion(() => {}, true);
  assert.equal(f.cache.stats().influence.aoRepairs, 1);
  f.frames();
  assert.equal(f.cache.stats().builds, before.builds + 1);
  disposeDishFixture(f);
});

test('automatic or missing interior shadow maps fall back instead of freezing their receivers', () => {
  for (const mutate of [
    (f) => {
      f.lamps[0].shadow.autoUpdate = true;
    },
    (f) => {
      f.lamps[0].shadow.map.dispose();
      f.lamps[0].shadow.map = null;
    },
  ]) {
    const f = fixture(true, undefined, false, 1);
    f.frames();
    mutate(f);
    moveDish(f);
    assert.equal(f.cache.stats().valid, false);
    assert.equal(f.passes.at(-1).target, null);
    assert.ok(f.passes.at(-1).meshes.includes(f.hull));
    disposeDishFixture(f);
  }
});

test('interior beam and shadow projection edits recapture color and preserve AO', () => {
  for (const mutate of [
    (light) => {
      light.angle = Math.PI / 3;
      light.shadow.updateMatrices(light);
    },
    (light) => {
      light.shadow.radius = 4;
    },
    (light) => {
      light.shadow.mapSize.set(1024, 1024);
    },
    (light) => {
      light.shadow.camera.fov += 5;
      light.shadow.camera.updateProjectionMatrix();
    },
  ]) {
    const f = fixture(true, undefined, false, 1);
    f.frames();
    f.cache.occlusion(() => {}, true);
    const builds = f.cache.stats().builds;
    const shadowCount = f.shadowPasses.length;
    mutate(f.lamps[0]);
    f.lamps[0].shadow.needsUpdate = true;
    f.renderer.shadowMap.needsUpdate = true;
    f.frames(1);
    assert.equal(f.cache.stats().valid, false);
    assert.equal(f.cache.requiresOcclusion(), false);
    assert.equal(f.shadowPasses.length, shadowCount + 1);
    assert.equal(f.shadowPasses.at(-1).source, f.lamps[0]);
    assert.ok(f.shadowPasses.at(-1).casters.includes(f.hull));
    assert.equal(f.shadowPasses.at(-1).scissor, false);
    f.frames();
    assert.equal(f.cache.stats().builds, builds + 1);
    disposeDishFixture(f);
  }
});

test('beam changes never conceal simultaneous geometry or camera changes from AO', () => {
  for (const mutate of [
    (f) => f.group.userData.geometryRevision++,
    (f) => {
      f.camera.position.x += 0.1;
      f.camera.updateMatrixWorld();
    },
  ]) {
    const f = fixture(true, undefined, false, 1);
    f.frames();
    f.cache.occlusion(() => {}, true);
    f.lamps[0].angle *= 0.8;
    f.lamps[0].shadow.needsUpdate = true;
    f.renderer.shadowMap.needsUpdate = true;
    mutate(f);
    f.frames(1);
    assert.equal(f.cache.requiresOcclusion(), true);
    assert.equal(f.cache.stats().valid, false);
    assert.ok(f.shadowPasses.at(-1).casters.includes(f.hull));
    disposeDishFixture(f);
  }
});

test('idle-brightness easing and live color sliders retain regional AO through dish motion', () => {
  for (const easing of [false, true]) {
    const f = fixture(true, undefined, false, 1);
    f.frames();
    f.cache.occlusion(() => {}, true);
    const builds = f.cache.stats().builds;
    for (let i = 0; i < 4; i++) {
      f.group.userData.transitionActive = easing;
      f.hull.material.color.multiplyScalar(0.95);
      f.lamps[0].color.setRGB(1, 0.9 - i * 0.05, 0.8);
      moveDish(f);
      assert.equal(f.cache.stats().valid, false);
      assert.equal(f.cache.requiresOcclusion(), false);
      assert.ok(f.passes.at(-1).meshes.includes(f.hull));
      f.cache.occlusion(() => {}, true);
      assert.equal(f.cache.stats().influence.aoRepairs, i + 1);
    }
    f.group.userData.geometryRevision++;
    f.frames(1);
    assert.equal(f.cache.requiresOcclusion(), true);
    f.group.userData.transitionActive = false;
    f.frames();
    assert.equal(f.cache.stats().builds, builds + 1);
    disposeDishFixture(f);
  }
});

test('brightness-only edits preserve AO and shadows; simultaneous geometry edits still refresh AO', () => {
  for (const geometryChanged of [false, true]) {
    const f = fixture(true, undefined, false, 6);
    f.frames();
    f.cache.occlusion(() => {}, true);
    const shadowCount = f.shadowPasses.length;
    const builds = f.cache.stats().builds;
    f.lamps[0].intensity *= 2;
    f.hull.material.color.multiplyScalar(0.8);
    f.hull.material.emissiveIntensity = 2;
    if (geometryChanged) f.group.userData.geometryRevision++;
    f.frames(1);
    assert.equal(f.cache.stats().valid, false);
    assert.equal(f.cache.requiresOcclusion(), geometryChanged);
    assert.equal(f.shadowPasses.length, shadowCount);
    f.frames();
    assert.equal(f.cache.stats().builds, builds + 1);
    disposeDishFixture(f);
  }
});

test('capture preserves complete shadow casters and live children of cached meshes', () => {
  const f = fixture();
  f.frames();
  assert.deepEqual(f.passes[0].meshes, [f.hull, f.ink, f.meter]);
  assert.equal(f.passes[0].shadows, true);
  const capture = f.passes.find((p) => p.target);
  assert.deepEqual(capture.meshes, [f.hull]);
  assert.equal(capture.shadows, false);
  assert.deepEqual(f.passes.at(-1).meshes, [f.ink, f.meter]);
  const composite = f.passes.find((p) => p.root.isMesh);
  assert.equal(composite.root.material.depthWrite, true);
  assert.equal(composite.root.material.depthFunc, THREE.AlwaysDepth);
  assert.equal(f.hull.layers.mask, 1);
  assert.equal(f.ink.layers.mask, 1);
  f.cache.dispose();
  assert.equal(f.renderer.render, f.original);
});

test('uniform-only room fill and sunlight spill recapture color without discarding shadows or contact AO', () => {
  const f = fixture(true, undefined, false, 6);
  f.group.userData.lightingColorSignature = '1:1:0.85:0.25:0.05';
  f.frames();
  f.cache.occlusion(() => {}, true);
  const shadowCount = f.shadowPasses.length;
  const builds = f.cache.stats().builds;
  f.group.userData.lightingColorSignature = '1:1:0.85:0.7:0';
  f.frames(1);
  assert.equal(
    f.cache.stats().valid,
    false,
    'The very next frame uses the new uniforms',
  );
  assert.equal(f.cache.requiresOcclusion(), false);
  assert.equal(f.shadowPasses.length, shadowCount);
  f.frames();
  assert.equal(f.cache.stats().builds, builds + 1);
  disposeDishFixture(f);
});

test('an ineligible quality path draws normally, releases storage and rebuilds on return', () => {
  let eligible = false;
  const f = fixture(false, () => eligible);
  f.frames();
  assert.equal(f.cache.stats().width, 1);
  assert.equal(f.cache.stats().builds, 0);
  assert.equal(f.cache.requiresOcclusion(), false);
  assert.ok(f.passes.every((p) => !p.target && p.root === f.scene));
  eligible = true;
  f.frames();
  assert.ok(f.cache.stats().hits > 0);
  const builds = f.cache.stats().builds;
  eligible = false;
  f.frames(1);
  assert.equal(f.cache.stats().width, 1);
  assert.equal(f.cache.stats().valid, false);
  assert.deepEqual(f.passes.at(-1).meshes, [f.hull, f.ink, f.meter]);
  eligible = true;
  f.frames();
  assert.equal(f.cache.stats().builds, builds + 1);
  f.cache.dispose();
});

test('camera, material, geometry, texture replacement and light changes invalidate the very next frame', () => {
  for (const mutate of [
    (f) => {
      f.camera.position.x++;
      f.camera.updateMatrixWorld();
    },
    (f) => {
      f.hull.material.color.set(0xabcdef);
    },
    (f) => {
      f.hull.geometry.attributes.position.needsUpdate = true;
    },
    (f) => {
      f.hull.material.map = new THREE.Texture();
    },
    (f) => {
      f.hull.geometry.setIndex(new THREE.Uint16BufferAttribute([0, 1, 2], 1));
    },
    (f) => {
      f.hull.material.bumpScale = 2;
    },
    (f) => {
      f.hull.position.x++;
      f.scene.updateMatrixWorld(true);
    },
    (f) => {
      f.light.intensity = 2;
    },
    (f) => {
      f.group.visible = false;
    },
  ]) {
    const f = fixture();
    f.frames();
    assert.ok(f.cache.stats().hits > 0);
    mutate(f);
    const start = f.passes.length;
    f.frames(1);
    assert.equal(f.cache.stats().valid, false);
    assert.equal(f.passes.length - start, 1, 'immediate full-render fallback');
    assert.equal(f.passes.at(-1).target, null);
    f.cache.dispose();
  }
});

test('changing a ceiling emitter footprint invalidates cached illumination immediately', () => {
  for (const dimension of ['width', 'height']) {
    const f = fixture(false, undefined, true);
    f.frames();
    assert.ok(f.cache.stats().hits > 0);
    f.light[dimension] *= 2;
    f.frames(1);
    assert.equal(f.cache.stats().valid, false);
    assert.equal(f.passes.at(-1).target, null);
    f.cache.dispose();
  }
});

test('opaque ambient colors remain live without invalidating stationary pixels', () => {
  const f = fixture();
  f.frames();
  const builds = f.cache.stats().builds;
  f.meter.material.color.set(0x00ff00);
  f.frames(1);
  assert.equal(f.cache.stats().builds, builds);
  assert.equal(f.cache.stats().valid, true);
  assert.ok(f.passes.at(-1).meshes.includes(f.meter));
  f.cache.dispose();
});

test('transitions, new objects and unsupported material states use complete rendering', () => {
  for (const mutate of [
    (f) => {
      f.group.userData.transitionActive = true;
    },
    (f) => {
      f.group.add(
        new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial()),
      );
    },
    (f) => {
      f.hull.material.transparent = true;
    },
    (f) => {
      f.hull.material.alphaToCoverage = true;
    },
    (f) => {
      f.hull.material = new THREE.MeshStandardMaterial();
    },
  ]) {
    const f = fixture();
    f.frames();
    mutate(f);
    f.frames(5);
    assert.equal(f.cache.stats().valid, false);
    assert.equal(f.passes.at(-1).target, null);
    f.cache.dispose();
  }
});

test('rest releases attachments and wake-up recaptures before reuse', () => {
  const f = fixture();
  f.frames();
  const builds = f.cache.stats().builds;
  f.cache.release();
  assert.equal(f.cache.stats().width, 1);
  assert.equal(f.cache.stats().valid, false);
  f.frames(1);
  assert.equal(f.passes.at(-1).target, null);
  f.frames();
  assert.equal(f.cache.stats().builds, builds + 1);
  f.cache.dispose();
});

test('dish-only movement repairs shading while simultaneous hull changes invalidate the cache', () => {
  const f = fixture(true);
  f.frames();
  f.cache.occlusion(() => {}, true);
  const builds = f.cache.stats().builds,
    hits = f.cache.stats().hits;
  f.dish.rotation.y = 0.3;
  f.scene.updateMatrixWorld(true);
  f.group.userData.geometryRevision++;
  f.group.userData.dishGeometryRevision++;
  f.group.userData.shadowCasterChanged = true;
  f.light.shadow.needsUpdate = true;
  f.renderer.shadowMap.needsUpdate = true;
  f.frames(1);
  assert.equal(f.cache.stats().builds, builds);
  assert.equal(f.cache.stats().hits, hits + 1);
  assert.equal(f.cache.stats().influence.shadowRepairs, 1);
  f.cache.occlusion(() => {}, true);
  assert.equal(f.cache.stats().influence.aoRepairs, 1);
  f.group.userData.geometryRevision += 2;
  f.group.userData.dishGeometryRevision++;
  f.light.shadow.needsUpdate = true;
  f.renderer.shadowMap.needsUpdate = true;
  f.frames(1);
  assert.equal(f.cache.stats().valid, false);
  assert.equal(f.cache.requiresOcclusion(), true);
  assert.equal(f.cache.stats().influence.shadowRepairs, 1);
  f.cache.occlusion(() => {}, true);
  assert.equal(
    f.cache.stats().influence.aoRepairs,
    1,
    'a full AO refresh follows mixed geometry changes',
  );
  f.frames();
  assert.equal(f.cache.stats().valid, true);
  f.dish.geometry.attributes.position.needsUpdate = true;
  f.frames(1);
  assert.equal(
    f.cache.stats().valid,
    false,
    'dish geometry changes rebuild its swept bound',
  );
  f.cache.dispose();
  f.ao.dispose();
  f.light.shadow.map.dispose();
});

test('changes to the dish mount, scale, shadow intensity and softness invalidate cached shading', () => {
  for (const mutate of [
    (f) => {
      f.dish.position.x += 0.1;
    },
    (f) => {
      f.dish.scale.x = 1.1;
    },
    (f) => {
      f.light.shadow.intensity = 0.5;
    },
    (f) => {
      f.light.shadow.radius = 4;
    },
  ]) {
    const f = fixture(true);
    f.frames();
    assert.equal(f.cache.stats().valid, true);
    mutate(f);
    f.scene.updateMatrixWorld(true);
    f.frames(1);
    assert.equal(f.cache.stats().valid, false);
    f.cache.dispose();
    f.ao.dispose();
    f.light.shadow.map.dispose();
  }
});

test('unrevisioned transforms, matrix replacement and return poses refresh depth before reuse', () => {
  const f = fixture();
  f.frames();
  const initialRevision = f.group.userData.geometryRevision;
  for (const mutate of [
    () => {
      f.hull.position.x = 2;
      f.scene.updateMatrixWorld(true);
    },
    () => {
      f.hull.matrixWorld.elements[12] = 3;
    },
    () => {
      f.hull.matrixWorld = new THREE.Matrix4().makeTranslation(4, 0, 0);
    },
    () => {
      f.hull.position.x = 0;
      f.scene.updateMatrixWorld(true);
    },
    () => {
      f.group.scale.setScalar(2);
      f.scene.updateMatrixWorld(true);
    },
  ]) {
    f.cache.occlusion(() => {}, true);
    const builds = f.cache.stats().builds;
    mutate();
    f.hull.material.color.offsetHSL(0.1, 0.1, -0.1);
    f.frames(1);
    assert.equal(f.cache.stats().valid, false);
    assert.equal(
      f.cache.requiresOcclusion(),
      true,
      'geometry takes priority over color',
    );
    assert.equal(f.group.userData.geometryRevision, initialRevision);
    f.frames();
    assert.equal(f.cache.stats().valid, true);
    assert.equal(f.cache.stats().builds, builds + 1);
  }
  f.cache.dispose();
});

test('attribute inventory edits and replacement geometry are observed without a model revision', () => {
  const f = fixture();
  f.frames();
  for (const mutate of [
    () =>
      f.hull.geometry.setAttribute(
        'extra',
        new THREE.Float32BufferAttribute([0, 1, 2], 3),
      ),
    () =>
      f.hull.geometry.setAttribute(
        'extra',
        new THREE.Float32BufferAttribute([3, 4, 5], 3),
      ),
    () => f.hull.geometry.deleteAttribute('extra'),
    () => {
      f.hull.geometry = f.hull.geometry.clone();
    },
    () => {
      f.hull.geometry.attributes.position.needsUpdate = true;
    },
  ]) {
    mutate();
    f.frames(1);
    assert.equal(f.cache.stats().valid, false);
    f.frames();
    assert.equal(f.cache.stats().valid, true);
  }
  f.cache.dispose();
});

test('late texture uploads, UV edits, viewport and environment changes remain live checks', () => {
  const f = fixture();
  f.hull.material.map = new THREE.Texture();
  f.scene.environment = new THREE.Texture();
  f.frames();
  for (const mutate of [
    () => {
      f.hull.material.map.needsUpdate = true;
    },
    () => {
      f.hull.material.map.offset.x += 0.2;
    },
    () => {
      f.hull.material.map = new THREE.Texture();
    },
    () => {
      f.scene.environment.needsUpdate = true;
    },
    () => {
      f.scene.environmentRotation.y += 0.2;
    },
    () => {
      f.renderer.getDrawingBufferSize = (v) => v.set(90, 70);
    },
    () => {
      f.camera.fov += 10;
      f.camera.updateProjectionMatrix();
    },
  ]) {
    f.cache.occlusion(() => {}, true);
    mutate();
    f.frames(1);
    assert.equal(f.cache.stats().valid, false);
    assert.equal(f.cache.requiresOcclusion(), true);
    f.frames();
    assert.equal(f.cache.stats().valid, true);
  }
  f.cache.dispose();
});

test('only dish root rotation is exempt; descendants read their current local matrices', () => {
  const child = new THREE.Group();
  const f = fixture(true, undefined, false, 0, ({ dish }) => dish.add(child));
  f.frames();
  moveDish(f);
  assert.equal(f.cache.stats().valid, true);
  for (const mutate of [
    () => {
      child.position.x = 0.2;
      child.updateMatrix();
    },
    () => {
      child.matrix = new THREE.Matrix4().makeScale(2, 2, 2);
    },
    () => {
      child.matrix.elements[12] = 0.5;
    },
  ]) {
    f.cache.occlusion(() => {}, true);
    mutate();
    f.frames(1);
    assert.equal(f.cache.stats().valid, false);
    assert.equal(f.cache.requiresOcclusion(), true);
    f.frames();
    assert.equal(f.cache.stats().valid, true);
  }
  disposeDishFixture(f);
});
