import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { createShadowUpdates } from '../../features/spacecraft/shadow-updates.ts';
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';
import {
  applyCabinLighting,
  createExteriorLight,
} from '../../features/spacecraft/lighting.ts';

function fixture() {
  const root = new T.Group();
  Object.assign(root.userData, {
    geometryRevision: 0,
    dishGeometryRevision: 0,
    nonCasterGeometryRevision: 0,
  });
  const dish = new T.Mesh(new T.BoxGeometry(0.1, 0.1, 0.1));
  dish.name = 'service-mounted-communications-dish';
  dish.position.set(4, 0, 0);
  const receiver = new T.Mesh(new T.BoxGeometry(1, 1, 0.1));
  receiver.position.z = -2;
  const lamp = new T.SpotLight();
  lamp.position.set(0, 0, 2);
  lamp.target.position.z = -2;
  lamp.distance = 7;
  lamp.shadow.radius = 4;
  lamp.shadow.mapSize.set(512, 512);
  const sun = createExteriorLight(T);
  root.add(dish, receiver, lamp, lamp.target, sun);
  const lights = [sun, lamp];
  const renderer = { shadowMap: { type: T.PCFShadowMap, needsUpdate: false } };
  const cache = createShadowUpdates({
    three: T,
    renderer,
    root,
    lights,
    receivers: () => new Map([[lamp, new Set([receiver])]]),
  });
  function frame() {
    root.updateMatrixWorld(true);
    cache.update();
    const dirty = lights.filter((light) => light.shadow.needsUpdate);
    // Model Three's successful shadow pass consuming both levels of dirty flag.
    lights.forEach((light) => {
      light.shadow.needsUpdate = false;
    });
    renderer.shadowMap.needsUpdate = false;
    return dirty;
  }
  function moveDish(x) {
    dish.position.x = x;
    root.userData.geometryRevision++;
    root.userData.dishGeometryRevision++;
    return frame();
  }
  return {
    root,
    dish,
    receiver,
    lamp,
    sun,
    lights,
    renderer,
    cache,
    frame,
    moveDish,
  };
}

test('unchanged maps survive camera movement; dish-only motion refreshes just relevant lights', () => {
  const f = fixture();
  assert.deepEqual(f.frame(), f.lights);
  assert.ok(f.lights.every((light) => !light.shadow.autoUpdate));
  const camera = new T.PerspectiveCamera();
  camera.position.set(2, 5, 10);
  camera.rotation.z = Math.PI / 2;
  camera.updateMatrixWorld();
  assert.deepEqual(f.frame(), []);
  assert.deepEqual(f.moveDish(3.5), [f.sun]);
  assert.deepEqual(f.frame(), []);
});

test('a dish entering or leaving a receiver ray volume refreshes its old and new shadows', () => {
  const f = fixture();
  f.frame();
  assert.deepEqual(f.moveDish(0), f.lights);
  assert.deepEqual(f.moveDish(4), f.lights);
  assert.deepEqual(f.moveDish(3.5), [f.sun]);
});

test('receiver movement refreshes all maps and recomputes relevance, including hidden receivers', () => {
  const f = fixture();
  f.frame();
  assert.deepEqual(f.moveDish(3.5), [f.sun]);
  f.receiver.position.x = 4;
  f.receiver.visible = false;
  f.root.userData.geometryRevision++;
  assert.deepEqual(f.frame(), f.lights);
  assert.deepEqual(f.moveDish(3.8), f.lights);
});

function moveReceiver(f, x) {
  f.receiver.position.x = x;
  f.root.userData.geometryRevision++;
  f.root.userData.nonCasterGeometryRevision++;
  return f.frame();
}

test('verified non-casters retain maps while receiver bounds still follow their motion', () => {
  const f = fixture();
  f.frame();
  f.moveDish(3.5);
  assert.deepEqual(moveReceiver(f, 0.1), []);
  f.receiver.visible = false;
  assert.deepEqual(moveReceiver(f, 3.5), [f.lamp]);
  assert.deepEqual(f.moveDish(3.8), f.lights);
});

test('new receiver bounds include omitted dish history, not just the last two poses', () => {
  const f = fixture();
  f.frame(); // Lamp map still contains the dish at x=4.
  f.moveDish(8);
  f.moveDish(9);
  assert.deepEqual(moveReceiver(f, 4), [f.lamp]);
  assert.deepEqual(f.frame(), []);
});

test('non-caster instance/vertex edits recompute bounds and simultaneous caster edits win', () => {
  const f = fixture();
  f.frame();
  f.moveDish(3.5);
  f.receiver.geometry.translate(4, 0, 0);
  assert.deepEqual(moveReceiver(f, 0), [f.lamp]);
  f.root.userData.geometryRevision++; // Unknown/caster change alongside receiver motion.
  assert.deepEqual(moveReceiver(f, 0.1), f.lights);
});

test('VSM receiver motion and unbounded PCF receiver volumes keep conservative refreshes', () => {
  const f = fixture();
  f.renderer.shadowMap.type = T.VSMShadowMap;
  f.frame();
  assert.deepEqual(moveReceiver(f, 0.1), f.lights);
  f.renderer.shadowMap.type = T.PCFShadowMap;
  f.lamp.shadow.bias = 0.1;
  f.cache.invalidate();
  f.frame();
  f.moveDish(3.5);
  assert.deepEqual(moveReceiver(f, 0.2), [f.lamp]);
});

test('receiver-only updates do not consume pending shadow requests', () => {
  const f = fixture();
  f.root.updateMatrixWorld(true);
  f.cache.update();
  assert.deepEqual(moveReceiver(f, 0.1), f.lights);
  assert.deepEqual(moveReceiver(f, 0.2), []);
});

test('low-detail soft filter and normal bias retain blockers outside the exact receiver box', () => {
  const f = fixture();
  f.frame();
  // Receiver ends at x=.5, blocker starts at .60. The soft footprint reaches it.
  assert.deepEqual(f.moveDish(0.65), f.lights);
});

test('in-place receiver geometry changes rebuild previously cached local bounds', () => {
  const f = fixture();
  f.frame();
  const position = f.receiver.geometry.getAttribute('position');
  for (let i = 0; i < position.count; i++)
    position.setX(i, position.getX(i) + 4);
  position.needsUpdate = true;
  f.root.userData.geometryRevision++;
  assert.deepEqual(f.frame(), f.lights);
  assert.deepEqual(f.moveDish(3.8), f.lights);
});

test('dish-only vertex edits refresh local bounds without rescanning receivers', (t) => {
  const f = fixture();
  f.frame();
  const scan = t.mock.method(f.receiver.geometry, 'computeBoundingBox');
  const position = f.dish.geometry.attributes.position;
  for (let i = 0; i < position.count; i++)
    position.setX(i, position.getX(i) - 4);
  position.needsUpdate = true;
  assert.deepEqual(f.moveDish(4), f.lights);
  assert.equal(scan.mock.callCount(), 0);
});

test('unsupported shadow filters and positive depth bias conservatively keep lamps live', () => {
  for (const setup of [
    (f) => {
      f.renderer.shadowMap.type = T.VSMShadowMap;
    },
    (f) => {
      f.lamp.shadow.bias = 0.1;
    },
  ]) {
    const f = fixture();
    setup(f);
    f.frame();
    assert.deepEqual(f.moveDish(3.5), f.lights);
  }
});

test('explicit quality/filter invalidation retains dirty flags until the maps actually render', () => {
  const f = fixture();
  f.frame();
  f.lamp.shadow.mapSize.set(2048, 2048);
  f.cache.invalidate();
  f.root.updateMatrixWorld(true);
  f.cache.update();
  f.cache.update();
  assert.ok(f.renderer.shadowMap.needsUpdate);
  assert.ok(f.lights.every((light) => light.shadow.needsUpdate));
  assert.deepEqual(f.frame(), f.lights);
  assert.deepEqual(f.frame(), []);
});

test('the authored wide ship reuses cabin and ladder maps through a complete dish cycle and reduced-motion snap', () => {
  const model = createSpacecraft(T, { layout: 'wide' });
  const scene = new T.Scene();
  const linked = applyCabinLighting(T, model.group);
  assert.equal(
    linked.lights.filter((light) => light.userData.section === 'walkway')
      .length,
    2,
  );
  const sun = createExteriorLight(T),
    lights = [sun, ...linked.lights];
  scene.add(model.group, sun);
  for (const light of lights) {
    light.shadow.radius = 4;
    light.shadow.mapSize.set(512, 512);
  }
  const renderer = { shadowMap: { type: T.PCFShadowMap, needsUpdate: false } };
  const cache = createShadowUpdates({
    three: T,
    renderer,
    root: model.group,
    lights,
    receivers: linked.shadowReceivers,
  });
  function frame(time, reducedMotion = false) {
    model.update(time, null, reducedMotion, { reducedMotion }, true);
    scene.updateMatrixWorld(true);
    cache.update();
    const dirty = lights.filter((light) => light.shadow.needsUpdate);
    lights.forEach((light) => {
      light.shadow.needsUpdate = false;
    });
    renderer.shadowMap.needsUpdate = false;
    return dirty;
  }
  assert.deepEqual(frame(0), lights);
  let sunFrames = 0;
  for (let i = 1; i <= 180; i++) {
    const dirty = frame(i / 10);
    assert.ok(dirty.every((light) => light === sun));
    sunFrames += dirty.length;
  }
  assert.ok(sunFrames > 80);
  assert.deepEqual(frame(3.25), [sun]);
  assert.deepEqual(frame(3.25, true), [sun]);
  assert.deepEqual(frame(3.25, true), []);
  model.setLayout('compact');
  assert.deepEqual(frame(3.25, true), lights);
});

// Inspect the actual assembled/batched model, including effective visibility,
// vertex and instance edits. This guards the opt-outs against new caster parts.
function meshInputs(root) {
  const result = new Map();
  root.traverse((mesh) => {
    if (!mesh.isMesh) return;
    let visible = true;
    for (let o = mesh; o; o = o.parent) visible &&= o.visible;
    result.set(
      mesh,
      JSON.stringify([
        ...mesh.matrixWorld.elements,
        visible,
        mesh.layers.mask,
        mesh.geometry.id,
        mesh.geometry.attributes.position.version,
        mesh.instanceMatrix?.version,
        mesh.count,
      ]),
    );
  });
  return result;
}

for (const layout of ['wide', 'compact']) {
  test(`${layout}: authored doors, notebook pages and keys preserve caster inputs and refresh AO`, (t) => {
    const model = createSpacecraft(T, {
      layout,
      journal: [{ title: 'One' }, { title: 'Two' }],
    });
    const linked = applyCabinLighting(T, model.group);
    const sun = createExteriorLight(T),
      lights = [sun, ...linked.lights];
    const scene = new T.Scene();
    scene.add(model.group, sun);
    const renderer = {
      shadowMap: { type: T.PCFShadowMap, needsUpdate: false },
    };
    const cache = createShadowUpdates({
      three: T,
      renderer,
      root: model.group,
      lights,
      receivers: linked.shadowReceivers,
    });
    let time = 0;
    const scannedGeometry = new Set();
    const scannedInstances = new Set();
    // eslint-disable-next-line typescript/unbound-method -- Restored spies call with the original receiver.
    const geometryBox = T.BufferGeometry.prototype.computeBoundingBox;
    // eslint-disable-next-line typescript/unbound-method -- Restored spies call with the original receiver.
    const instanceBox = T.InstancedMesh.prototype.computeBoundingBox;
    t.mock.method(
      T.BufferGeometry.prototype,
      'computeBoundingBox',
      function () {
        scannedGeometry.add(this);
        return geometryBox.call(this);
      },
    );
    t.mock.method(T.InstancedMesh.prototype, 'computeBoundingBox', function () {
      scannedInstances.add(this);
      return instanceBox.call(this);
    });
    function frame(state, instant = false) {
      model.update(
        (time += 1 / 60),
        '',
        instant,
        {
          activeRoom: 'about',
          reading: false,
          openPortalIds: [],
          reducedMotion: true,
          delta: 1 / 60,
          ...state,
        },
        true,
      );
      scene.updateMatrixWorld(true);
      cache.update();
      const dirty = lights.filter((light) => light.shadow.needsUpdate);
      for (const light of lights) light.shadow.needsUpdate = false;
      renderer.shadowMap.needsUpdate = false;
      return dirty;
    }
    function verify(state, instant = false) {
      const before = meshInputs(model.group);
      const positions = new Map(),
        instances = new Map();
      model.group.traverse((mesh) => {
        if (!mesh.isMesh) return;
        positions.set(mesh.geometry, mesh.geometry.attributes.position.version);
        if (mesh.isInstancedMesh)
          instances.set(mesh, mesh.instanceMatrix.version);
      });
      scannedGeometry.clear();
      scannedInstances.clear();
      const revision = model.group.userData.geometryRevision;
      const dirty = frame(state, instant);
      assert.deepEqual(
        scannedGeometry,
        new Set(
          [...positions]
            .filter(([g, version]) => g.attributes.position.version !== version)
            .map(([g]) => g),
        ),
        'Only edited vertex buffers are scanned',
      );
      assert.deepEqual(
        scannedInstances,
        new Set(
          [...instances]
            .filter(
              ([mesh, version]) =>
                mesh.instanceMatrix.version !== version ||
                scannedGeometry.has(mesh.geometry),
            )
            .map(([mesh]) => mesh),
        ),
        'Only edited instance placements are scanned',
      );
      const changed = [...meshInputs(model.group)]
        .filter(([m, v]) => before.get(m) !== v)
        .map(([m]) => m);
      assert.ok(
        changed.length,
        'The workload actually changes renderable geometry',
      );
      assert.ok(
        changed.every((m) => !m.castShadow),
        changed
          .filter((m) => m.castShadow)
          .map((m) => m.name)
          .join(', '),
      );
      assert.ok(
        model.group.userData.geometryRevision > revision,
        'AO and stationary pixels still invalidate',
      );
      assert.deepEqual(
        dirty.map((l) => l.name),
        [],
        'No caster or newly relevant dish shadow changed',
      );
      return changed;
    }
    frame({}, true);
    for (const id of model.group.userData.portals
      .filter((p) => p.from === 'about')
      .map((p) => p.id)) {
      assert.ok(model.group.userData.portals.some((p) => p.id === id));
      const changed = verify({ openPortalIds: [id] });
      assert.ok(
        changed.some((m) => m.receiveShadow),
        'Moving leaves are receivers',
      );
      verify({ immediateDoors: true }, true);
    }
    frame({ reading: true }, true);
    const pages = verify({ reading: true, notebookChapter: 1 });
    assert.ok(
      pages.some((m) => m.receiveShadow),
      'Rebatched carried markers include receivers',
    );
    verify({ reading: true, notebookChapter: 1 }, true);
    verify({ reading: true, notebookChapter: 0 }, true);
    frame({ activeRoom: 'contact', reading: true }, true);
    const keyboard = model.group.userData.contactComputer.keyboard;
    keyboard.press('KeyA');
    const keys = verify({ activeRoom: 'contact', reading: true });
    assert.ok(keys.some((m) => m.isInstancedMesh && m.receiveShadow));
    keyboard.release('KeyA');
    verify({ activeRoom: 'contact', reading: true }, true);
    model.setLayout(layout === 'wide' ? 'compact' : 'wide');
    assert.deepEqual(
      frame({}).map((l) => l.id),
      lights.map((l) => l.id),
      'Layout/caster changes still refresh every map',
    );
  });
}
