import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { finishWindowReveals } from '../../features/spacecraft/geometry/flush-window-reveals.ts';
import { thinChassisOutline } from '../../features/spacecraft/geometry/thin-chassis-outline.ts';
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';
import {
  PRESSURE_FACE_FRONT,
  PRESSURE_THROAT_START,
  PRESSURE_WALL,
} from '../../features/spacecraft/geometry/spacecraft-wall-layout.ts';

const bandStartZ = PRESSURE_FACE_FRONT - 0.036;
const bandEndZ = PRESSURE_FACE_FRONT - 0.014;
const names = ['about', 'projects', 'contact', 'experience', 'walkway'];
function fixture(scale) {
  const outline = thinChassisOutline(THREE, { scale });
  const source = new THREE.ExtrudeGeometry(outline.outer, outline.extrusion);
  source.translate(0, 0, PRESSURE_THROAT_START);
  const apertures = [...outline.roomHoles, outline.ladderHole].map(
    (path, i) => ({ section: names[i], path }),
  );
  const finishes = finishWindowReveals(THREE, source, apertures, {
    bandStartZ,
    bandEndZ,
  });
  return { source, apertures, finishes };
}
function area(geometry) {
  const p = geometry.getAttribute('position');
  const count = geometry.index?.count ?? p.count;
  let sum = 0;
  for (let i = 0; i < count; i += 3) {
    const points = [0, 1, 2].map((offset) =>
      new THREE.Vector3().fromBufferAttribute(
        p,
        geometry.index ? geometry.index.getX(i + offset) : i + offset,
      ),
    );
    sum += new THREE.Triangle(...points).getArea();
  }
  return sum;
}
function mesh(geometry, kind) {
  const result = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
  result.name = kind;
  result.updateMatrixWorld(true);
  return result;
}
function probeApertures(apertures, reference, actual, label) {
  for (const { section, path } of apertures) {
    const center = new THREE.Box2()
      .setFromPoints(path.getPoints(64))
      .getCenter(new THREE.Vector2());
    for (const depth of [0.002, 0.018, 0.029, 0.057, PRESSURE_WALL - 0.002]) {
      const z = PRESSURE_FACE_FRONT - depth;
      const amber = z >= bandStartZ && z <= bandEndZ;
      for (let sample = 0; sample < 32; sample++) {
        const angle = ((sample + 0.31) * Math.PI) / 16;
        const direction = new THREE.Vector3(
          Math.cos(angle),
          Math.sin(angle),
          0,
        );
        const ray = new THREE.Raycaster(
          new THREE.Vector3(center.x, center.y, z),
          direction,
          0,
          15,
        );
        const expected = ray.intersectObject(reference, false)[0];
        const hits = ray.intersectObjects(actual, false);
        assert.ok(
          expected && hits.length,
          `${label}/${section}: the whole reveal is closed at every angle`,
        );
        assert.ok(
          hits[0].point.distanceTo(expected.point) < 2e-6,
          `${label}/${section}: the finish follows the exact opening, including both bevels`,
        );
        assert.equal(
          hits[0].object.name,
          amber ? 'amber' : 'dark',
          `${label}/${section}: no cream surface can remain on the reveal`,
        );
        assert.equal(
          hits.filter((hit) => Math.abs(hit.distance - hits[0].distance) < 1e-7)
            .length,
          1,
          `${label}/${section}: no coincident trim triangles`,
        );
      }
    }
  }
}

for (const [layout, scale] of [
  ['wide', 1.4],
  ['compact', 1],
]) {
  test(`${layout}: dark and amber finishes partition the original window surfaces without displacement or overlaid rings`, () => {
    const { source, apertures, finishes } = fixture(scale);
    const geometries = [
      finishes.shell,
      finishes.dark,
      ...finishes.bands.map((band) => band.geometry),
    ];
    const originalArea = area(source);
    assert.ok(
      Math.abs(
        geometries.reduce((sum, geometry) => sum + area(geometry), 0) -
          originalArea,
      ) <
        originalArea * 2e-7,
      'The finish only partitions the original surface area',
    );
    assert.equal(finishes.bands.length, 5);
    for (const band of finishes.bands)
      assert.ok(
        area(band.geometry) > 0.1,
        'Every window has one complete signal band',
      );
    const actual = [
      mesh(finishes.shell, 'shell'),
      mesh(finishes.dark, 'dark'),
      ...finishes.bands.map((band) => mesh(band.geometry, 'amber')),
    ];
    probeApertures(apertures, mesh(source, 'source'), actual, layout);
  });
}

test('Production chassis uses the exact flush reveal finish for cabin and ladder windows in both layouts', () => {
  const model = createSpacecraft(THREE);
  model.group.traverse((object) => {
    const parts = [object.name, ...(object.userData.parts || [])];
    assert.ok(
      !parts.some((name) =>
        /^(recessed-front-pressure-seal|hover-perimeter-light-guide|walkway-pressure-collar-seal)$/.test(
          name,
        ),
      ),
      'Remove the conflicting trim geometry, not hide it behind another ring',
    );
  });
  for (const [layout, scale] of [
    ['wide', 1.4],
    ['compact', 1],
  ]) {
    model.setLayout(layout);
    model.group.updateMatrixWorld(true);
    const { source, apertures } = fixture(scale);
    const actual = [];
    model.group
      .getObjectByName(`${layout}-common-pressure-frame`)
      .traverseVisible((object) => {
        if (!object.isMesh) return;
        const kind =
          object.material.name === 'window-perimeter-signal'
            ? 'amber'
            : object.material.name === 'window-reveal-graphite'
              ? 'dark'
              : object.material.name === 'ceramic-hull'
                ? 'shell'
                : null;
        if (!kind) return;
        const clone = new THREE.Mesh(object.geometry, object.material);
        clone.name = kind;
        clone.matrixWorld.copy(object.matrixWorld);
        actual.push(clone);
      });
    probeApertures(
      apertures,
      mesh(source, 'source'),
      actual,
      `${layout} production`,
    );
  }
});
