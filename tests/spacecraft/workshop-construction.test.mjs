import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';
import { CABIN_FLOOR } from '../../features/spacecraft/geometry/spacecraft-wall-layout.ts';
import {
  CAMERA_RANGES,
  cursorViewSamples,
  fitRoomCameraFrame,
  responsiveCameraFov,
} from '../../features/spacecraft/navigation/scene-controls.ts';

const sources = new Map();
// Inspect the real rounded source solids before production material batching.
// Their retained parents provide the actual transforms for each cabin layout.
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
    projects: [
      {
        title: 'Workshop fixture',
        slug: 'workshop-fixture',
        categories: ['systems', 'interfaces', 'experiments'],
      },
    ],
  },
);

function setLayout(layout) {
  model.setLayout(layout);
  model.update(0, 'projects', true, {
    activeRoom: 'projects',
    reading: false,
    delta: 0,
  });
  model.group.updateMatrixWorld(true);
}

function workshopSources() {
  return [...sources.values()]
    .filter(({ mesh }) => mesh.name.startsWith('projects-workshop-'))
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
  return {
    name: source.mesh.name,
    mesh,
    bounds: mesh.geometry.boundingBox.clone().applyMatrix4(source.matrix),
  };
}

function containsPoint(part, point) {
  // Separately authored Float32 solids can differ by a few billionths at an
  // intended flush joint. This tolerance is far below visible construction gaps.
  if (!part.bounds.clone().expandByScalar(1e-7).containsPoint(point))
    return false;
  const origin = point
    .clone()
    .lerp(part.bounds.getCenter(new THREE.Vector3()), 1e-6);
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
  const overlap = a.bounds
    .clone()
    .expandByScalar(1e-7)
    .intersect(b.bounds.clone().expandByScalar(1e-7));
  if (overlap.isEmpty()) return false;
  const center = overlap.getCenter(new THREE.Vector3());
  if (containsPoint(a, center) && containsPoint(b, center)) return true;
  // Rounded corners and the shaped apron can overlap in bounding boxes while
  // remaining detached. Require the actual surfaces to enter the other solid.
  for (const [from, into] of [
    [a, b],
    [b, a],
  ]) {
    const positions = from.mesh.geometry.getAttribute('position');
    for (let index = 0; index < positions.count; index++) {
      const point = new THREE.Vector3()
        .fromBufferAttribute(positions, index)
        .applyMatrix4(from.mesh.matrixWorld);
      if (containsPoint(into, point)) return true;
    }
  }
  return false;
}

function partsForLayout(layout) {
  setLayout(layout);
  const parts = workshopSources().map(solidPart);
  const roomX = model.group.userData.roomAnchors.projects[0];
  const matches = (suffix, side) =>
    parts.filter(
      (part) =>
        part.name === `projects-workshop-${suffix}` &&
        (side === undefined ||
          Math.sign(part.bounds.getCenter(new THREE.Vector3()).x - roomX) ===
            side),
    );
  const joined = (left, right, label) => {
    assert.ok(left.length && right.length, `${label}: both parts exist`);
    assert.ok(
      left.some((a) => right.some((b) => solidContact(a, b))),
      `${label}: actual solids must meet rather than only overlap in projection`,
    );
  };
  return { parts, matches, joined };
}

for (const layout of ['wide', 'compact']) {
  test(`${layout}: workshop supports seat on the real deck without entering its curved returns`, () => {
    setLayout(layout);
    const floorY = model.group.userData.roomAnchors.projects[1] + CABIN_FLOOR;
    const lining = [];
    model.group.traverseVisible((object) => {
      if (
        object.isMesh &&
        [object.name, ...(object.userData.parts || [])].some((name) =>
          name.startsWith('projects-continuous-pressure-skin-interior'),
        )
      )
        lining.push(object);
    });
    let checkedVertices = 0;
    let groundedPads = 0;
    for (const { mesh, matrix } of workshopSources()) {
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
          `${mesh.name}: a real deck surface lies beneath the support`,
        );
        const clearance = point.y - hit.point.y;
        assert.ok(
          clearance >= -0.0015,
          `${mesh.name}: enters the deck/cove by ${-clearance} units at ${point.toArray().join(',')}`,
        );
        minimumClearance = Math.min(minimumClearance, clearance);
        checkedVertices++;
      }
      if (mesh.name.endsWith('floor-isolator')) {
        assert.ok(minimumClearance <= 0.003, 'Floor isolators must not float');
        groundedPads++;
      }
    }
    assert.ok(
      checkedVertices > 100,
      'Probe support surfaces, including rear corners',
    );
    assert.equal(groundedPads, 2, 'Both bench supports seat on the deck');
  });

  test(`${layout}: every monitor has a solid load path through the gantry and bench to the deck`, () => {
    const { matches, joined } = partsForLayout(layout);
    for (const side of [-1, 1]) {
      const chain = [
        'floor-isolator',
        'anchored-sole',
        'foot-retainer',
        'bench-leg',
        'leg-apron-collar',
      ];
      for (let index = 1; index < chain.length; index++)
        joined(
          matches(chain[index - 1], side),
          matches(chain[index], side),
          `${side}: ${chain[index]}`,
        );
      joined(
        matches('leg-apron-collar', side),
        matches('continuous-bench-apron'),
        `${side}: leg seats into apron`,
      );
      joined(
        matches('solid-worktop'),
        matches('gantry-isolation-seat', side),
        `${side}: gantry seats on the top`,
      );
      joined(
        matches('gantry-isolation-seat', side),
        matches('gantry-foot', side),
        `${side}: gantry foot seats on its pad`,
      );
      joined(
        matches('gantry-foot', side),
        matches('gantry-upright', side),
        `${side}: upright seats into its foot`,
      );
      for (const rail of matches('mounting-crossrail'))
        joined(
          matches('gantry-upright', side),
          [rail],
          `${side}: each row crossrail meets the upright`,
        );
    }
    joined(
      matches('continuous-bench-apron'),
      matches('worktop-seal'),
      'Apron supports the worktop gasket',
    );
    joined(
      matches('worktop-seal'),
      matches('solid-worktop'),
      'Worktop seats on the gasket',
    );
    for (const rail of matches('module-rear-rail'))
      joined(
        [rail],
        matches('mounting-crossrail'),
        'Each display back rail meets a row crossrail',
      );
    for (const stand of matches('module-stand-off')) {
      joined(
        [stand],
        matches('module-rear-rail'),
        'Every standoff meets a back rail',
      );
      joined(
        [stand],
        matches('closed-rear-enclosure'),
        'Every standoff reaches a display enclosure',
      );
    }
    assert.equal(matches('closed-rear-enclosure').length, 4);
    for (const enclosure of matches('closed-rear-enclosure'))
      joined(
        [enclosure],
        matches('module-stand-off'),
        'Every display is attached to the bank',
      );
  });

  test(`${layout}: release tips, power clips and the shared work light attach to their supporting solids`, () => {
    const { matches, joined } = partsForLayout(layout);
    const tips = matches('captive-release-tip');
    assert.ok(
      tips.length > 0,
      'The removable monitors retain their release tips',
    );
    for (const tip of tips)
      joined(
        [tip],
        matches('quick-release-lever'),
        'Each captive release tip seats on its lever',
      );
    const clips = matches('trunk-retaining-clip');
    assert.ok(
      clips.length > 0,
      'The vertical power trunk has mechanical retainers',
    );
    for (const clip of clips) {
      joined(
        [clip],
        matches('gantry-upright'),
        'Each cable clip fastens to the gantry',
      );
      joined(
        [clip],
        matches('protected-power-trunk'),
        'Each clip captures the power trunk',
      );
    }
    joined(
      matches('protected-power-trunk'),
      matches('junction-lead'),
      'Power trunk joins the junction lead',
    );
    joined(
      matches('junction-lead'),
      matches('power-junction'),
      'Power lead enters its junction',
    );
    joined(
      matches('power-junction'),
      matches('underbench-crossmember'),
      'Junction seats against the bench structure',
    );
    joined(
      matches('underbench-crossmember'),
      matches('continuous-bench-apron'),
      'Crossmember seats into the apron',
    );
    for (const side of [-1, 1])
      joined(
        matches('bridge-task-hood'),
        matches('gantry-upright', side),
        `${side}: work light mounts to the bridge`,
      );
    joined(
      matches('bridge-task-diffuser'),
      matches('bridge-task-hood'),
      'Diffuser seats in the work light housing',
    );
  });

  test(`${layout}: separate monitor envelopes clear their neighbors and the working plane`, () => {
    setLayout(layout);
    const screens = model.group.userData.projectScreens;
    const bounds = screens.map((screen) =>
      new THREE.Box3().setFromObject(screen.root),
    );
    const worktop = workshopSources().find(({ mesh }) =>
      mesh.name.endsWith('-solid-worktop'),
    );
    const topY = solidPart(worktop).bounds.max.y;
    for (let left = 0; left < bounds.length; left++) {
      assert.ok(
        bounds[left].min.y > topY + 0.03,
        'Monitor hardware leaves usable space above the top',
      );
      for (let right = left + 1; right < bounds.length; right++)
        assert.ok(
          !bounds[left].intersectsBox(bounds[right]),
          'Complete monitor envelopes stay separated',
        );
      assert.equal(screens[left].width, 1.01);
      assert.equal(screens[left].height, 0.57);
      const anchor = screens[left].anchor.getWorldPosition(new THREE.Vector3());
      const source = sources.get(screens[left].screen);
      assert.ok(source, 'The comparison uses the real emitted glass mesh');
      const glass = new THREE.Vector3().applyMatrix4(
        source.parent.matrixWorld.clone().multiply(source.matrix),
      );
      assert.ok(
        anchor.distanceTo(glass) < 1e-9,
        'Application remains registered to the actual glass plane',
      );
      assert.equal(screens[left].anchor.userData.kind, 'computer');
    }
  });
}

test('All four usable monitor faces remain unobscured by the whole workshop at room-view extremes', () => {
  for (const [width, height] of [
    [1280, 720],
    [390, 844],
  ]) {
    setLayout(width < 700 ? 'compact' : 'wide');
    const data = model.group.userData;
    const target = [
      data.roomAnchors.projects[0],
      data.innerApertureBounds.projects.center[1],
      data.roomAnchors.projects[2],
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
      for (const screen of data.projectScreens) {
        assert.ok(
          screen.available,
          'Every category is populated in this fixture',
        );
        for (const x of [-0.4, 0, 0.4])
          for (const y of [-0.35, 0, 0.35]) {
            const point = screen.anchor.localToWorld(
              new THREE.Vector3(x * screen.width, y * screen.height, 0),
            );
            const direction = point.clone().sub(camera);
            const distance = direction.length();
            const hits = new THREE.Raycaster(
              camera,
              direction.normalize(),
              0,
              distance - 0.002,
            ).intersectObject(data.projectWorkshop, true);
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
              `${width}×${height}/${screen.category}: workshop obscures the usable glass at ${x},${y}: ${blocker?.object.name}`,
            );
          }
      }
    }
  }
});
