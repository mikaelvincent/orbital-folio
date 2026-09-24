import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';
import {
  CABIN_FLOOR,
  CABIN_CEILING,
  CABIN_HALF_WIDTH,
} from '../../features/spacecraft/geometry/spacecraft-wall-layout.ts';

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
    aboutPhotos: {
      portrait: null,
      socials: Object.fromEntries(
        ['left', 'center', 'right'].map((side) => [
          side,
          {
            link: {
              id: side,
              title: `${side} fixture`,
              url: `https://example.com/${side}`,
              platform: 'custom',
              aboutSlot: side,
            },
            icon: null,
          },
        ]),
      ),
    },
  },
);

function setLayout(layout) {
  model.setLayout(layout);
  model.update(0, 'about', true, {
    activeRoom: 'about',
    reading: false,
    delta: 0,
  });
  model.group.updateMatrixWorld(true);
}

function visible(object) {
  for (let part = object; part; part = part.parent)
    if (!part.visible) return false;
  return true;
}

function studySources() {
  return [...sources.values()]
    .filter(
      ({ mesh, parent }) =>
        mesh.name.startsWith('personal-study-') && visible(parent),
    )
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
  // Rounded corners and inclined surfaces can overlap in bounding boxes while
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
  const parts = studySources().map(solidPart);
  const matches = (suffix) =>
    parts.filter((part) => part.name === `personal-study-${suffix}`);
  const joined = (left, right, label) => {
    assert.ok(left.length && right.length, `${label}: both parts exist`);
    for (const part of left)
      assert.ok(
        right.some((other) => solidContact(part, other)),
        `${label}: each actual solid must meet its support`,
      );
  };
  return { parts, matches, joined };
}

function uniqueVertices(source) {
  const positions = source.mesh.geometry.getAttribute('position');
  const vertices = new Map();
  for (let i = 0; i < positions.count; i++) {
    const point = new THREE.Vector3()
      .fromBufferAttribute(positions, i)
      .applyMatrix4(source.matrix);
    vertices.set(
      point
        .toArray()
        .map((value) => value.toFixed(7))
        .join(','),
      point,
    );
  }
  return [...vertices.values()];
}

for (const layout of ['wide', 'compact']) {
  test(`${layout}: the study clears the real cabin coves and wall mounts seat on the lining`, () => {
    setLayout(layout);
    const [roomX, roomY] = model.group.userData.roomAnchors.about;
    const halfWidth = CABIN_HALF_WIDTH * (layout === 'wide' ? 1.4 : 1);
    const lining = [];
    model.group.traverseVisible((object) => {
      if (
        object.isMesh &&
        [object.name, ...(object.userData.parts || [])].some((name) =>
          name.startsWith('about-continuous-pressure-skin-interior'),
        )
      )
        lining.push(object);
    });
    assert.ok(lining.length, 'Test uses the rendered pressure lining');
    const failures = [];
    let mounts = 0,
      checkedVertices = 0;
    for (const source of studySources()) {
      const mount = /wall-anchor|mounting-carrier/.test(source.mesh.name);
      let minimumClearance = Infinity;
      for (const point of uniqueVertices(source)) {
        assert.ok(
          point.x >= roomX - halfWidth - 1e-6 &&
            point.x <= roomX + halfWidth + 1e-6 &&
            point.y >= roomY + CABIN_FLOOR - 1e-6 &&
            point.y <= roomY + CABIN_CEILING + 1e-6,
          `${source.mesh.name}: furniture stays inside the cabin sides, floor and ceiling`,
        );
        const hit = new THREE.Raycaster(
          new THREE.Vector3(point.x, point.y, 0.5),
          new THREE.Vector3(0, 0, -1),
          0,
          3,
        ).intersectObjects(lining, false)[0];
        assert.ok(
          hit,
          `${source.mesh.name}: actual lining lies behind the furniture`,
        );
        minimumClearance = Math.min(minimumClearance, point.z - hit.point.z);
        checkedVertices++;
      }
      // Mounts embed slightly for a solid wall joint; furniture bodies must not
      // disappear into the lower or upper cove, including in the smaller layout.
      if (minimumClearance < (mount ? -0.007 : -0.001))
        failures.push(`${source.mesh.name}: penetrates ${-minimumClearance}`);
      if (mount) {
        mounts++;
        if (minimumClearance > 0.0005)
          failures.push(
            `${source.mesh.name}: floats ${minimumClearance} from the lining`,
          );
      }
    }
    assert.ok(
      mounts > 0 && checkedVertices > 1000,
      'The actual fitted mounts and furniture surfaces were checked',
    );
    assert.deepEqual(failures, []);
  });

  test(`${layout}: the desk, notebook cradle and handhold have continuous support paths`, () => {
    const { matches, joined } = partsForLayout(layout);
    joined(
      matches('desk-triangular-stay'),
      matches('desk-stay-wall-anchor'),
      'Desk braces reach their fitted wall anchors',
    );
    joined(
      matches('desk-triangular-stay'),
      matches('desk-stay-top-shoe'),
      'Desk braces reach the upper shoes',
    );
    joined(
      matches('desk-stay-top-shoe'),
      matches('folding-desk-body'),
      'Upper shoes support the desk',
    );
    joined(
      matches('desk-hinge-barrel'),
      matches('desk-hinge-wall-anchor'),
      'Rear hinges meet the wall mounts',
    );
    joined(
      matches('desk-hinge-barrel'),
      matches('folding-desk-body'),
      'Rear hinges support the desk',
    );
    for (const type of ['front-foot', 'rear-stay']) {
      joined(
        matches(`journal-cradle-${type}`),
        matches('flush-writing-insert'),
        `Every cradle ${type} seats on the writing surface`,
      );
      joined(
        matches(`journal-cradle-${type}`),
        matches('journal-cradle-back'),
        `Every cradle ${type} reaches the cradle`,
      );
    }
    joined(
      matches('desk-rail-anchor'),
      matches('folding-desk-body'),
      'Handhold shoes seat in the desk apron',
    );
    joined(
      matches('desk-rail-return'),
      matches('desk-rail-anchor'),
      'Handhold returns reach the shoes',
    );
    joined(
      matches('desk-rail-return'),
      matches('desk-retaining-rail'),
      'Handhold returns reach the crossbar',
    );
    joined(
      matches('desk-rail-collar'),
      matches('desk-rail-return'),
      'Alloy collars capture the handhold returns',
    );
    joined(
      matches('desk-foot-loop-wall-anchor'),
      matches('desk-foot-restraint'),
      'Both foot-loop ends reach the fitted anchors',
    );
  });

  test(`${layout}: personal restraints, locker handling parts and lamp wiring attach to their assemblies`, () => {
    const { matches, joined } = partsForLayout(layout);
    for (const [anchor, equipment] of [
      ['berth-wall-anchor', 'berth-back-frame'],
      ['blanket-stowage-wall-anchor', 'blanket-stowage-pouch-body'],
      ['locker-wall-anchor', 'locker-rear-case'],
      ['berth-service-wall-anchor', 'berth-rail-mount'],
      ['berth-light-wall-anchor', 'berth-light-retained-arm'],
      ['task-lamp-wall-anchor', 'task-lamp-wall-base'],
    ])
      joined(
        matches(anchor),
        matches(equipment),
        `${anchor}: fitted mount reaches the supported equipment`,
      );
    joined(
      matches('locker-handle-return'),
      matches('locker-inset-door'),
      'Each locker handle return reaches the door',
    );
    joined(
      matches('locker-handle-return'),
      matches('locker-handle'),
      'Each locker handle return reaches the grip',
    );
    joined(
      matches('berth-restraint-buckle'),
      matches('berth-webbing-restraint'),
      'Berth buckle retains the webbing',
    );
    joined(
      matches('berth-buckle-latch'),
      matches('berth-restraint-buckle'),
      'Berth latch bridges the buckle opening',
    );
    joined(
      matches('berth-buckle-release'),
      matches('berth-buckle-latch'),
      'Berth release attaches to its latch',
    );
    joined(
      matches('pen-retaining-cuff'),
      matches('pen-retaining-clip-base'),
      'Pen cuffs meet their mounting pads',
    );
    joined(
      matches('pen-retaining-cuff'),
      matches('pen-barrel'),
      'Pen cuffs capture the barrel',
    );
    joined(
      matches('lamp-lower-arm'),
      matches('task-lamp-wall-base').concat(matches('lamp-pivot')),
      'Lamp lower arm attaches to a pivot',
    );
    joined(
      matches('lamp-upper-arm'),
      matches('lamp-pivot'),
      'Lamp upper arm attaches to a pivot',
    );
    joined(
      matches('lamp-cable-clip'),
      matches('lamp-retained-power-cable'),
      'Every lamp cable clip captures the cable',
    );
    joined(
      matches('lamp-cable-clip'),
      matches('lamp-lower-arm').concat(
        matches('lamp-upper-arm'),
        matches('lamp-pivot'),
        matches('task-lamp-wall-base'),
      ),
      'Every cable clip attaches to the physical lamp assembly',
    );
    joined(
      matches('reading-lamp-inner-rim'),
      matches('reading-lamp-shade'),
      'Lamp rim attaches to its shade',
    );
    joined(
      matches('reading-lamp-diffuser'),
      matches('reading-lamp-inner-rim'),
      'Lamp lens seats in the rim',
    );
  });
  test(`${layout}: the open library supports its books and leaves the mounted social prints clear`, () => {
    const { parts, matches, joined } = partsForLayout(layout);
    joined(
      matches('personal-library-back'),
      matches('library-wall-anchor'),
      'Library back seats on the fitted mounts',
    );
    joined(
      matches('personal-library-cheek'),
      matches('personal-library-back'),
      'Both library cheeks join the back',
    );
    joined(
      matches('personal-library-shelf'),
      matches('personal-library-cheek'),
      'Library shelf reaches the formed sides',
    );
    const books = parts.filter(({ name }) =>
      name.startsWith('personal-study-personal-library-retained-book-'),
    );
    assert.ok(books.length > 0, 'The retained library books exist');
    for (const book of books)
      joined(
        [book],
        matches('personal-library-shelf'),
        'Every retained book rests on the shelf',
      );
    joined(
      matches('personal-library-cheek'),
      matches('personal-library-retaining-webbing'),
      'Both ends of the low book restraint reach the cheeks',
    );
    joined(
      matches('personal-library-webbing-keeper'),
      matches('personal-library-retaining-webbing'),
      'The restraint keeper meets the webbing',
    );
    const library = new THREE.Box3();
    for (const part of parts.filter(({ name }) =>
      name.startsWith('personal-study-personal-library-'),
    ))
      library.union(part.bounds);
    const cards = model.group.userData.aboutSocialCards;
    assert.equal(
      cards.length,
      3,
      'All configured physical print targets remain registered',
    );
    for (const card of cards) {
      const cardBounds = new THREE.Box3().setFromObject(card.root);
      assert.ok(
        library.min.y > cardBounds.max.y,
        'Library has a real vertical gap above every social print',
      );
      assert.equal(
        card.anchor.parent,
        card.root,
        'Social target follows its physical paper mount',
      );
    }
    for (const kind of [
      'landscape-postcard',
      'mountain-note',
      'personal-note',
      'curiosity-note',
    ]) {
      joined(
        matches(`${kind}-mounting-carrier`),
        matches(`${kind}-paper-backing`),
        'Paper backing attaches to its wall carrier',
      );
      joined(
        matches(`${kind}-corner-retainer`),
        matches(`${kind}-paper-backing`),
        'Each print retainer overlaps its paper backing',
      );
    }
  });
}
