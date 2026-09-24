import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildContactFlightConsole } from '../../features/spacecraft/rooms/contact-flight-console.ts';
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';
import {
  CABIN_FLOOR,
  CABIN_CEILING,
  CABIN_HALF_WIDTH,
  PRESSURE_THROAT_START,
} from '../../features/spacecraft/geometry/spacecraft-wall-layout.ts';

// Invoke the real furniture builder while retaining individual part names.
// Box bevels stay within these bounds; their edge detail cannot conceal an
// unsupported microphone base or a headset intersecting the desk/supports.
function inspectableConsole(options = {}) {
  const root = new THREE.Group();
  const h = {
    mesh(geometry, material, into, name = '') {
      const object = new THREE.Mesh(geometry, material);
      object.name = name;
      into.add(object);
      return object;
    },
    box(w, height, depth, material, x, y, z, into, _radius, name) {
      const object = h.mesh(
        new THREE.BoxGeometry(w, height, depth),
        material,
        into,
        name,
      );
      object.position.set(x, y, z);
      return object;
    },
    cylinder(
      radius,
      length,
      material,
      x,
      y,
      z,
      into,
      axis = 'y',
      top = radius,
      segments = 64,
    ) {
      const object = h.mesh(
        new THREE.CylinderGeometry(top, radius, length, segments),
        material,
        into,
      );
      object.position.set(x, y, z);
      if (axis === 'x') object.rotation.z = -Math.PI / 2;
      if (axis === 'z') object.rotation.x = Math.PI / 2;
      return object;
    },
    rod(from, to, radius, material, into) {
      const a = new THREE.Vector3(...from);
      const b = new THREE.Vector3(...to);
      const object = h.cylinder(
        radius,
        a.distanceTo(b),
        material,
        0,
        0,
        0,
        into,
      );
      object.position.copy(a).add(b).multiplyScalar(0.5);
      object.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        b.sub(a).normalize(),
      );
      return object;
    },
    instances(geometry, material, transforms, into, name) {
      const object = new THREE.InstancedMesh(
        geometry,
        material,
        transforms.length,
      );
      object.name = name;
      const dummy = new THREE.Object3D();
      transforms.forEach(({ p, s = [1, 1, 1], r = [0, 0, 0] }, i) => {
        dummy.position.set(...p);
        dummy.scale.set(...s);
        dummy.rotation.set(...r);
        dummy.updateMatrix();
        object.setMatrixAt(i, dummy.matrix);
      });
      into.add(object);
      return object;
    },
  };
  const profile = new THREE.Path();
  profile.moveTo(-PRESSURE_THROAT_START, CABIN_FLOOR);
  profile.lineTo(0.67, CABIN_FLOOR);
  profile.quadraticCurveTo(1.1, CABIN_FLOOR, 1.1, -0.61);
  profile.lineTo(1.1, 0.89);
  profile.quadraticCurveTo(1.1, CABIN_CEILING, 0.67, CABIN_CEILING);
  profile.lineTo(-PRESSURE_THROAT_START, CABIN_CEILING);
  buildContactFlightConsole(THREE, h, root, {
    ...options,
    rearWallProfile: profile.getPoints(48).map((p) => ({ y: p.y, z: -p.x })),
  });
  return root;
}
const bounds = (object) => new THREE.Box3().setFromObject(object);
const matching = (root, pattern) => {
  const found = [];
  root.traverseVisible((object) => {
    if (pattern.test(object.name)) found.push(object);
  });
  return found;
};
const vessel = createSpacecraft(THREE, { layout: 'wide' });

test('Contact uses the shared wallpaper only on available screens; unassigned channels show standby', (t) => {
  const previousDocument = globalThis.document;
  const previousPath = globalThis.Path2D;
  t.after(() => {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    if (previousPath === undefined) delete globalThis.Path2D;
    else globalThis.Path2D = previousPath;
  });
  const canvasDocument = {
    createElement() {
      const calls = { images: [], text: [] };
      const ctx = {
        createLinearGradient: () => ({ addColorStop() {} }),
        createRadialGradient: () => ({ addColorStop() {} }),
        fillText: (value) => calls.text.push(value),
        drawImage: (image) => calls.images.push(image),
        measureText: (value) => ({ width: value.length * 18 }),
        fillRect() {},
        beginPath() {},
        moveTo() {},
        lineTo() {},
        closePath() {},
        arc() {},
        fill() {},
        stroke() {},
        save() {},
        restore() {},
        translate() {},
        scale() {},
      };
      return { calls, getContext: () => ctx };
    },
  };
  globalThis.document = canvasDocument;
  globalThis.Path2D = class {};
  const wallpaper = canvasDocument.createElement();
  const desktopMaterial = new THREE.MeshBasicMaterial({
    map: new THREE.CanvasTexture(wallpaper),
  });
  const root = inspectableConsole({
    desktopMaterial,
    socials: {
      left: {
        id: 'github',
        title: 'GitHub',
        url: 'https://github.com',
        platform: 'github',
        screen: 'left',
        description: 'Explore my code',
        order: 0,
      },
      right: null,
    },
  });
  const display = (kind) =>
    root.getObjectByName(`contact-flight-${kind}-screen-glass`).material.map
      .image.calls;
  for (const kind of ['contact', 'link']) {
    assert.deepEqual(display(kind).images, [wallpaper]);
    assert.ok(!display(kind).text.includes('STANDBY'));
  }
  assert.ok(display('contact').text.includes('LET’S CONNECT'));
  assert.ok(display('link').text.includes('GitHub'));
  assert.ok(display('link').text.includes('Open link'));
  assert.deepEqual(display('signal').images, []);
  assert.deepEqual(display('signal').text, ['STANDBY']);
  assert.equal(root.userData.socialScreens[1].link, null);
});

test('Unassigned Contact screens have no interactive identity or hover rim', () => {
  for (const screen of vessel.group.userData.socialScreens) {
    assert.equal(screen.link, null);
    assert.equal(screen.interactableId, undefined);
    assert.equal(screen.root.userData.interactableId, undefined);
    assert.deepEqual(matching(screen.root, /hover-rim/), []);
  }
});

for (const [layout, propScale, cabinScale] of [
  ['wide', 1, 1.4],
  ['compact', 0.84, 1],
]) {
  function fittedConsole() {
    vessel.setLayout(layout);
    vessel.group.updateMatrixWorld(true);
    const floorRoot = vessel.group.getObjectByName('contact-flight-console');
    assert.equal(
      floorRoot.userData.rearMountScale,
      propScale,
      'The real layout selects its fitted mounts',
    );
    const root = inspectableConsole();
    root.applyMatrix4(floorRoot.matrixWorld);
    root.userData.setPropScale(propScale);
    root.updateMatrixWorld(true);
    return root;
  }

  test(`${layout} contact audio is supported without desk, foot or cabin-wall intersections`, () => {
    const root = fittedConsole();
    const deck = bounds(root.getObjectByName('contact-flight-working-deck'));
    for (const name of [
      'contact-flight-audio-microphone-isolation-foot',
      'contact-flight-audio-microphone-deck-connector-gasket',
    ]) {
      const foot = bounds(root.getObjectByName(name));
      for (const axis of ['x', 'z']) {
        assert.ok(
          foot.min[axis] >= deck.min[axis] + 0.01 * propScale,
          `${name} must be inside the deck`,
        );
        assert.ok(
          foot.max[axis] <= deck.max[axis] - 0.01 * propScale,
          `${name} must not hang off the deck`,
        );
      }
      assert.ok(
        Math.abs(foot.min.y - deck.max.y) < 0.002 * propScale,
        `${name} must touch the deck`,
      );
    }
    const headset = bounds(
      root.getObjectByName('contact-flight-audio-headset-hardware'),
    );
    const desk = bounds(
      root.getObjectByName('contact-flight-continuous-console-shell'),
    );
    const anchor = vessel.group.userData.roomAnchors.contact;
    assert.ok(
      headset.min.y > anchor[1] + CABIN_FLOOR + 0.06 * propScale,
      'The hanging headset and its cord clear the floor',
    );
    assert.ok(
      headset.max.y < desk.min.y - 0.02 * propScale,
      'The removable headset clears the desk underside',
    );
    for (const support of matching(
      root,
      /contact-flight-(anchored-foot|console-stanchion)$/,
    ))
      assert.ok(
        !headset.intersectsBox(bounds(support)),
        'The headset must not intersect a console support',
      );
    assert.ok(
      headset.max.x < anchor[0] + CABIN_HALF_WIDTH * cabinScale - 0.03,
      'The outboard dock stays inside the cabin',
    );
  });

  test(`${layout} contact rear brackets reach the actual pressure wall and retain fixed display positions`, () => {
    const root = fittedConsole();
    const anchors = matching(root, /^contact-flight-rear-anchor-/);
    assert.equal(
      anchors.length,
      10,
      'Every structural and display shoe has one fitted rear anchor',
    );
    const shoes = matching(
      root,
      /contact-flight-(wall-mount|(contact|link|signal)-wall-shoe)$/,
    ).map(bounds);
    const wall = [];
    vessel.group.traverseVisible((object) => {
      if (
        object.isMesh &&
        (object.userData.parts || []).includes(
          'contact-continuous-pressure-skin-interior',
        )
      )
        wall.push(object);
    });
    assert.ok(wall.length);
    let backFaces = 0;
    for (const anchor of anchors) {
      assert.ok(
        shoes.some((shoe) => shoe.intersectsBox(bounds(anchor))),
        'Each extension must physically meet an existing shoe',
      );
      const geometry = anchor.geometry;
      const positions = geometry.getAttribute('position');
      const count = geometry.index ? geometry.index.count : positions.count;
      for (let i = 0; i < count; i += 3) {
        const vertices = [0, 1, 2].map((j) =>
          new THREE.Vector3()
            .fromBufferAttribute(
              positions,
              geometry.index ? geometry.index.getX(i + j) : i + j,
            )
            .applyMatrix4(anchor.matrixWorld),
        );
        const normal = vertices[1]
          .clone()
          .sub(vertices[0])
          .cross(vertices[2].clone().sub(vertices[0]))
          .normalize();
        if (normal.z > -0.2) continue;
        const point = vertices[0]
          .clone()
          .add(vertices[1])
          .add(vertices[2])
          .multiplyScalar(1 / 3);
        const ray = new THREE.Raycaster(
          point.clone().add(new THREE.Vector3(0, 0, 0.03)),
          new THREE.Vector3(0, 0, -1),
          0,
          0.06,
        );
        const hit = ray.intersectObjects(wall, false)[0];
        assert.ok(
          hit && hit.point.distanceTo(point) < 3e-6,
          'Rear anchor must meet the real wall, including its curved lower section',
        );
        backFaces++;
      }
    }
    assert.ok(
      backFaces > 20,
      'Flat and curved wall attachments are both checked',
    );
    const before = root.userData.socialScreens.map(({ anchor }) =>
      anchor.matrixWorld.toArray(),
    );
    root.userData.setPropScale(propScale === 1 ? 0.84 : 1);
    root.updateMatrixWorld(true);
    assert.deepEqual(
      root.userData.socialScreens.map(({ anchor }) =>
        anchor.matrixWorld.toArray(),
      ),
      before,
      'Mount fitting never moves a social display',
    );
  });
}
