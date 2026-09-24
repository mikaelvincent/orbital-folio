import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';
import { CASE_STUDY_CATEGORIES } from '../../lib/content/case-study-content.ts';
import { CABIN_FLOOR } from '../../features/spacecraft/geometry/spacecraft-wall-layout.ts';
import {
  CAMERA_RANGES,
  cursorViewSamples,
  fitRoomCameraFrame,
  responsiveCameraFov,
} from '../../features/spacecraft/navigation/scene-controls.ts';

const sources = new Map();
// Preserve the physical source parts through production batching. Their parent
// groups remain live, so layout changes still supply the real world transforms.
class SourceMesh extends THREE.Mesh {
  removeFromParent() {
    if (this.parent && !this.userData.parts)
      sources.set(this, {
        mesh: this,
        parent: this.parent,
        matrix: this.matrix.clone(),
      });
    return super.removeFromParent();
  }
}
const model = createSpacecraft(
  { ...THREE, Mesh: SourceMesh },
  {
    caseStudies: CASE_STUDY_CATEGORIES.map(({ id, label }) => ({
      title: label,
      slug: id,
      categories: [id],
    })),
  },
);

function setLayout(layout) {
  model.setLayout(layout);
  model.update(0, 'experience', true, {
    activeRoom: 'experience',
    reading: false,
    delta: 0,
  });
  model.group.updateMatrixWorld(true);
}

function archiveSources() {
  return [...sources.values()]
    .filter(({ mesh }) => mesh.name.startsWith('case-archive-'))
    .map(({ mesh, parent, matrix }) => ({
      mesh,
      matrix: parent.matrixWorld.clone().multiply(matrix),
    }));
}

const solidMaterial = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
function solidPart(source) {
  const mesh = new THREE.Mesh(source.mesh.geometry, solidMaterial);
  mesh.matrixAutoUpdate = false;
  mesh.matrix.copy(source.matrix);
  mesh.matrixWorld.copy(source.matrix);
  mesh.geometry.computeBoundingBox();
  const bounds = mesh.geometry.boundingBox.clone().applyMatrix4(source.matrix);
  return { mesh, bounds };
}

function containsPoint(part, point) {
  if (!part.bounds.containsPoint(point)) return false;
  const origin = point
    .clone()
    .lerp(part.bounds.getCenter(new THREE.Vector3()), 1e-7);
  const hits = new THREE.Raycaster(
    origin,
    new THREE.Vector3(0.819, 0.421, 0.386).normalize(),
    0,
    10,
  ).intersectObject(part.mesh, false);
  const crossings = hits.filter(
    (hit, index) =>
      index === 0 || Math.abs(hit.distance - hits[index - 1].distance) > 1e-7,
  );
  return crossings.length % 2 === 1;
}

function solidContact(a, b) {
  const overlap = a.bounds.clone().intersect(b.bounds);
  if (overlap.isEmpty()) return false;
  const center = overlap.getCenter(new THREE.Vector3());
  if (containsPoint(a, center) && containsPoint(b, center)) return true;
  // AABB overlap alone misses gaps beneath sloping parts. Require a real
  // surface vertex of one solid to enter the other solid, checked by parity.
  for (const [from, into] of [
    [a, b],
    [b, a],
  ]) {
    const position = from.mesh.geometry.getAttribute('position');
    for (let index = 0; index < position.count; index++) {
      const point = new THREE.Vector3()
        .fromBufferAttribute(position, index)
        .applyMatrix4(from.mesh.matrixWorld);
      if (containsPoint(into, point)) return true;
    }
  }
  return false;
}

for (const layout of ['wide', 'compact']) {
  test(`${layout}: archive supports sit on the real deck without penetrating its rear cove`, () => {
    setLayout(layout);
    const floorY = model.group.userData.roomAnchors.experience[1] + CABIN_FLOOR;
    const lining = [];
    model.group.traverseVisible((object) => {
      if (
        object.isMesh &&
        [object.name, ...(object.userData.parts || [])].some((name) =>
          name.startsWith('experience-continuous-pressure-skin-interior'),
        )
      )
        lining.push(object);
    });
    let checkedVertices = 0;
    let groundedPads = 0;
    for (const { mesh, matrix } of archiveSources()) {
      // The anchor bolts deliberately enter the deck. All visible support
      // bodies and elastomer pads must remain on the cabin side of its lining.
      if (mesh.name.includes('floor-anchor-bolt')) continue;
      const positions = mesh.geometry.getAttribute('position');
      const visited = new Set();
      let minimumClearance = Infinity;
      for (let index = 0; index < positions.count; index++) {
        const point = new THREE.Vector3()
          .fromBufferAttribute(positions, index)
          .applyMatrix4(matrix);
        if (point.y > floorY + 0.16) continue;
        const key = point
          .toArray()
          .map((value) => value.toFixed(7))
          .join(',');
        if (visited.has(key)) continue;
        visited.add(key);
        const hit = new THREE.Raycaster(
          new THREE.Vector3(point.x, floorY + 0.65, point.z),
          new THREE.Vector3(0, -1, 0),
          0,
          1,
        ).intersectObjects(lining, false)[0];
        assert.ok(
          hit,
          `${mesh.name}: a real pressure-deck surface supports the foot`,
        );
        const clearance = point.y - hit.point.y;
        assert.ok(
          clearance >= -0.0015,
          `${mesh.name}: support penetrates the floor/cove by ${-clearance} units at ${point.toArray().join(',')}`,
        );
        minimumClearance = Math.min(minimumClearance, clearance);
        checkedVertices++;
      }
      if (mesh.name.endsWith('isolator')) {
        assert.ok(
          minimumClearance <= 0.003,
          `${mesh.name}: an isolator must seat on the actual floor rather than float`,
        );
        groundedPads++;
      }
    }
    assert.ok(
      checkedVertices > 100,
      'Probe real support surfaces, including their rear corners',
    );
    assert.ok(
      groundedPads >= 2,
      'The archive has grounded support on both sides',
    );
  });
  test(`${layout}: the rack and terminal share physically connected load paths to their feet`, () => {
    setLayout(layout);
    const roomX = model.group.userData.roomAnchors.experience[0];
    const parts = archiveSources().map((source) => ({
      name: source.mesh.name,
      ...solidPart(source),
    }));
    const matches = (suffix, side) =>
      parts.filter(
        (part) =>
          part.name === `case-archive-${suffix}` &&
          (side === undefined ||
            Math.sign(part.bounds.getCenter(new THREE.Vector3()).x - roomX) ===
              side),
      );
    const joined = (left, right, label) => {
      assert.ok(
        left.length && right.length,
        `${label}: both support assemblies exist`,
      );
      assert.ok(
        left.some((a) => right.some((b) => solidContact(a, b))),
        `${label}: structural parts must meet in real geometry, not only in projection`,
      );
    };
    for (const side of [-1, 1]) {
      const rackFoot = matches('rack-anchored-foot', side);
      const terminalFoot = matches('terminal-foot', side);
      const cheek = matches('swept-rack-cheek', side);
      const tie = matches('terminal-base-tie', side);
      joined(
        matches('rack-isolator', side),
        rackFoot,
        `${side}: rack shoe seats on its pad`,
      );
      joined(rackFoot, cheek, `${side}: formed cheek seats into the rack shoe`);
      for (const crossmember of matches('rack-crossmember'))
        joined(
          cheek,
          [crossmember],
          `${side}: cheek supports each magazine crossmember`,
        );
      joined(rackFoot, tie, `${side}: base tie joins the rack shoe`);
      joined(tie, terminalFoot, `${side}: base tie joins the terminal shoe`);
      joined(
        matches('terminal-isolator', side),
        terminalFoot,
        `${side}: terminal shoe seats on its pad`,
      );
      for (const name of ['terminal-front-strut', 'terminal-rear-strut']) {
        joined(
          terminalFoot,
          matches(name, side),
          `${side}: ${name} meets the terminal shoe`,
        );
        joined(
          matches(name, side),
          matches('terminal-solid-enclosure'),
          `${side}: ${name} reaches the enclosure`,
        );
      }
    }
  });
}

test('Archive hardware leaves category ink and terminal glass readable through the room camera range', () => {
  for (const [width, height] of [
    [1280, 720],
    [390, 844],
  ]) {
    setLayout(width < 700 ? 'compact' : 'wide');
    const data = model.group.userData;
    const target = [
      data.roomAnchors.experience[0],
      data.innerApertureBounds.experience.center[1],
      data.roomAnchors.experience[2],
    ];
    const inset = width < 760 ? 12 : 18;
    const fit = fitRoomCameraFrame(
      data.roomCameraFrame,
      responsiveCameraFov(width / height),
      width / height,
      {
        left: -1 + (2 * inset) / width,
        right: 1 - (2 * inset) / width,
        top: 1 - 48 / height,
        bottom: -1 + 160 / height,
      },
    );
    for (const view of cursorViewSamples(
      { target, direction: [0, 0, 1] },
      2,
      CAMERA_RANGES.room,
    )) {
      const camera = new THREE.Vector3(...target).addScaledVector(
        new THREE.Vector3(...view.direction),
        fit.chosenDistance,
      );
      for (const screen of data.caseStudyScreens) {
        assert.ok(
          screen.available,
          'The fixture exercises every populated category',
        );
        for (const x of [-0.4, 0, 0.4])
          for (const y of [-0.35, 0, 0.35]) {
            // Sample the usable label/glass, inside the physical grip and
            // bezel margins. Native target dimensions supply the real scale.
            const point = screen.interactionAnchor.localToWorld(
              new THREE.Vector3(x * screen.width, y * screen.height, 0),
            );
            const direction = point.clone().sub(camera);
            const distance = direction.length();
            const hits = new THREE.Raycaster(
              camera,
              direction.normalize(),
              0,
              distance - 0.002,
            ).intersectObject(data.caseStudyArchive, true);
            const blocker = hits.find(({ object }) => {
              for (let part = object; part; part = part.parent)
                if (!part.visible) return false;
              return [object.material]
                .flat()
                .some((material) => material.visible && !material.transparent);
            });
            assert.equal(
              blocker,
              undefined,
              `${width}×${height}/${screen.category}: hardware obscures the face at ${x},${y}: ${blocker?.object.name}`,
            );
          }
      }
    }
  }
});
