import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';
import {
  PRESSURE_WALL,
  CABIN_FLOOR,
  CABIN_CEILING,
  wallLayout,
} from '../../features/spacecraft/geometry/spacecraft-wall-layout.ts';

const EPSILON = 2e-6;
const layouts = [
  ['wide', 1.4],
  ['compact', 1],
  ['wide', 1.4],
];
const sections = ['projects', 'experience', 'about', 'contact'];
const near = (actual, expected, message) =>
  assert.ok(
    Math.abs(actual - expected) < EPSILON,
    `${message}: expected ${expected}, received ${actual}`,
  );

function meshesMatching(group, pattern) {
  const result = [];
  group.traverseVisible((object) => {
    if (
      object.isMesh &&
      [object.name, ...(object.userData.parts || [])].some((name) =>
        pattern.test(name),
      )
    )
      result.push(object);
  });
  return result;
}

function surfaceAt(meshes, origin, direction, far = 1) {
  const ray = new THREE.Raycaster(
    new THREE.Vector3(...origin),
    new THREE.Vector3(...direction),
    0,
    far,
  );
  const hit = ray.intersectObjects(meshes, false)[0];
  assert.ok(
    hit,
    `A structural face must exist from ${origin} toward ${direction}`,
  );
  return hit.point;
}

test('Thicker walls retain the established cabin dimensions and C-shaped room arrangement', () => {
  assert.equal(PRESSURE_WALL, 0.17);
  assert.equal(CABIN_FLOOR, -1.32);
  assert.equal(CABIN_CEILING, 1.455);
  const model = createSpacecraft(THREE, { layout: 'wide' });
  for (const [layout, scale] of layouts) {
    model.setLayout(layout);
    const a = model.group.userData.roomAnchors;
    assert.ok(a.projects[0] < a.experience[0]);
    assert.ok(a.about[0] < a.contact[0]);
    near(a.projects[0], a.about[0], 'Left column alignment');
    near(a.experience[0], a.contact[0], 'Right column alignment');
    near(a.projects[1], a.experience[1], 'Upper deck alignment');
    near(a.about[1], a.contact[1], 'Lower deck alignment');
    assert.ok(a.projects[1] > a.about[1]);
    assert.ok(model.group.userData.walkwayAnchor[0] < a.projects[0]);
    assert.deepEqual(model.group.userData.circulation, [
      'experience',
      'projects',
      'about',
      'contact',
    ]);
    near(
      a.experience[0] - a.projects[0] - 2.86 * scale,
      0.17,
      'One shared wall separates the fixed-width cabin interiors',
    );
    near(
      a.projects[1] + CABIN_FLOOR - a.about[1] - CABIN_CEILING,
      0.17,
      'One shared wall separates the deck interiors',
    );
    for (const section of sections) {
      const bounds = model.group.userData.roomBounds[section];
      const aperture = model.group.userData.innerApertureBounds[section];
      near(bounds.size[0], 3.3 * scale, `${section} original framing width`);
      near(bounds.size[1], 3.25, `${section} original framing height`);
      near(bounds.size[2], 2.8, `${section} original framing depth`);
      near(
        aperture.size[0],
        2.44 * scale,
        `${section} original aperture width`,
      );
      near(aperture.size[1], 2.775, `${section} original aperture height`);
    }
  }
});

test('Rendered cabin, ladder and docking partitions measure 0.17 in both layouts', () => {
  const model = createSpacecraft(THREE, { layout: 'wide' });
  for (const [layout, scale] of layouts) {
    model.setLayout(layout);
    model.group.updateMatrixWorld(true);
    const a = model.group.userData.roomAnchors;
    const datums = wallLayout(scale);
    const partitions = meshesMatching(
      model.group,
      /open-side-pressure-bulkhead|sealed-outboard-wall|continuous-rounded-outboard-wall|walkway-twin-open-room-wall|walkway-open-docking-wall|walkway-(?:projects|about)-cabin-facing-wall/,
    );
    const probes = [
      {
        name: 'upper shared partition',
        x: 0,
        y: a.projects[1] + 0.24,
        z: 1.06,
      },
      { name: 'lower shared partition', x: 0, y: a.about[1] + 0.24, z: 1.06 },
      {
        name: 'upper ladder partition',
        x: datums.leftCabinWall - 0.085,
        y: a.projects[1] + 0.24,
        z: 1.06,
      },
      {
        name: 'lower ladder partition',
        x: datums.leftCabinWall - 0.085,
        y: a.about[1] + 0.24,
        z: 1.06,
      },
      {
        name: 'upper exterior partition',
        x: datums.rightX - 0.085,
        y: a.experience[1],
        z: 0,
      },
      {
        name: 'lower exterior partition',
        x: datums.rightX - 0.085,
        y: a.contact[1],
        z: 0,
      },
      {
        name: 'docking partition',
        x: datums.dockingInnerWall - 0.085,
        y: 0.03,
        z: 1.11,
      },
    ];
    for (const probe of probes) {
      const left = surfaceAt(
        partitions,
        [probe.x - 0.3, probe.y, probe.z],
        [1, 0, 0],
      );
      const right = surfaceAt(
        partitions,
        [probe.x + 0.3, probe.y, probe.z],
        [-1, 0, 0],
      );
      near(
        right.x - left.x,
        0.17,
        `${layout} ${probe.name} physical thickness`,
      );
      near(
        (right.x + left.x) / 2,
        probe.x,
        `${layout} ${probe.name} placement`,
      );
    }
    // These rays measure the usable room width from actual opposing wall faces,
    // independently of the public framing metadata checked above.
    for (const section of sections) {
      const [x, y] = a[section];
      const left = surfaceAt(partitions, [x, y + 0.24, 1.06], [-1, 0, 0], 3);
      const right = surfaceAt(partitions, [x, y + 0.24, 1.06], [1, 0, 0], 3);
      near(right.x - left.x, 2.86 * scale, `${layout} ${section} usable width`);
    }
  }
});

test('Rendered roofs, floors and the shared deck retain 0.17 walls around unchanged interiors', () => {
  const model = createSpacecraft(THREE, { layout: 'wide' });
  for (const [layout] of layouts) {
    model.setLayout(layout);
    model.group.updateMatrixWorld(true);
    const skins = meshesMatching(
      model.group,
      /continuous-pressure-skin|continuous-exterior-(?:roof|keel)/,
    );
    const a = model.group.userData.roomAnchors;
    for (const section of sections) {
      const [x, y] = a[section];
      const floor = surfaceAt(skins, [x, y, 0], [0, -1, 0], 2);
      const roof = surfaceAt(skins, [x, y, 0], [0, 1, 0], 2);
      near(floor.y - y, -1.32, `${section} unchanged floor datum`);
      near(roof.y - y, 1.455, `${section} unchanged ceiling datum`);
      near(roof.y - floor.y, 2.775, `${section} usable interior height`);
      if (y > 0) {
        const outside = surfaceAt(skins, [x, roof.y + 0.4, 0], [0, -1, 0]);
        near(outside.y - roof.y, 0.17, `${section} roof thickness`);
      } else {
        const outside = surfaceAt(skins, [x, floor.y - 0.4, 0], [0, 1, 0]);
        near(floor.y - outside.y, 0.17, `${section} floor thickness`);
      }
    }
    for (const [upper, lower] of [
      ['projects', 'about'],
      ['experience', 'contact'],
    ]) {
      const upperFloor = surfaceAt(
        skins,
        [a[upper][0], a[upper][1], 0],
        [0, -1, 0],
        2,
      );
      const lowerRoof = surfaceAt(
        skins,
        [a[lower][0], a[lower][1], 0],
        [0, 1, 0],
        2,
      );
      near(
        upperFloor.y - lowerRoof.y,
        0.17,
        `${upper}/${lower} shared deck thickness`,
      );
    }
  }
});

test('One continuous hatch guide spans each shared wall with only a flush lip', () => {
  const model = createSpacecraft(THREE, { layout: 'wide' });
  for (const [layout, scale] of layouts) {
    model.setLayout(layout);
    model.group.updateMatrixWorld(true);
    const datums = wallLayout(scale);
    const hatches = model.group.userData.irisHatches;
    assert.equal(hatches.length, 4);
    for (const hatch of hatches) {
      const id = hatch.userData.physicalHatch;
      const isLadder = id === 'projects:about' || id === 'about:projects';
      const wallMin = isLadder ? datums.ladderRightWall : -PRESSURE_WALL / 2;
      const wallMax = isLadder ? datums.leftCabinWall : PRESSURE_WALL / 2;
      const guide = new THREE.Box3().setFromObject(
        hatch.getObjectByName('recessed-iris-guide'),
      );
      near(wallMax - wallMin, PRESSURE_WALL, `${id} underlying shared wall`);
      near(guide.min.x, wallMin - 0.002, `${layout} ${id} left flush lip`);
      near(guide.max.x, wallMax + 0.002, `${layout} ${id} right flush lip`);
      near(
        hatch.getWorldPosition(new THREE.Vector3()).x,
        (wallMin + wallMax) / 2,
        `${layout} ${id} mechanism centered between structural wall faces`,
      );
    }
  }
});
