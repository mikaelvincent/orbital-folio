import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';
import {
  CABIN_FLOOR,
  CABIN_CEILING,
  CABIN_HALF_WIDTH,
} from '../../features/spacecraft/geometry/spacecraft-wall-layout.ts';
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
    socials: {
      left: {
        id: 'left',
        title: 'Left fixture',
        url: 'https://example.com/left',
        platform: 'custom',
        screen: 'left',
        order: 0,
      },
      right: {
        id: 'right',
        title: 'Right fixture',
        url: 'https://example.com/right',
        platform: 'custom',
        screen: 'right',
        order: 1,
      },
    },
  },
);

function setLayout(layout) {
  model.setLayout(layout);
  model.update(0, 'contact', true, {
    activeRoom: 'contact',
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

function consoleSources() {
  return [...sources.values()]
    .filter(
      ({ mesh, parent }) =>
        /^(contact-flight-|outboard-communications-)/.test(mesh.name) &&
        visible(parent),
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
  const parts = consoleSources().map(solidPart);
  const roomX = model.group.userData.roomAnchors.contact[0];
  const matches = (suffix, side) =>
    parts.filter(
      (part) =>
        part.name === `contact-flight-${suffix}` &&
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
  test(`${layout}: Contact supports meet the real deck and all furniture clears the cabin envelope`, () => {
    setLayout(layout);
    const data = model.group.userData;
    const [roomX, roomY] = data.roomAnchors.contact;
    const floorY = roomY + CABIN_FLOOR;
    const ceilingY = roomY + CABIN_CEILING;
    const halfWidth = CABIN_HALF_WIDTH * (layout === 'wide' ? 1.4 : 1);
    const lining = [];
    model.group.traverseVisible((object) => {
      if (
        object.isMesh &&
        [object.name, ...(object.userData.parts || [])].some((name) =>
          name.startsWith('contact-continuous-pressure-skin-interior'),
        )
      )
        lining.push(object);
    });
    let checkedVertices = 0;
    let groundedPads = 0;
    for (const { mesh, matrix } of consoleSources()) {
      const positions = mesh.geometry.getAttribute('position');
      const visited = new Set();
      let minimumClearance = Infinity;
      for (let index = 0; index < positions.count; index++) {
        const point = new THREE.Vector3()
          .fromBufferAttribute(positions, index)
          .applyMatrix4(matrix);
        assert.ok(
          point.x >= roomX - halfWidth - 1e-6 &&
            point.x <= roomX + halfWidth + 1e-6 &&
            point.y <= ceilingY + 1e-6,
          `${mesh.name}: physical furniture remains within the cabin sides and ceiling`,
        );
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
          `${mesh.name}: the actual pressure deck lies beneath the support`,
        );
        const clearance = point.y - hit.point.y;
        assert.ok(
          clearance >= -0.0015,
          `${mesh.name}: enters the deck/cove by ${-clearance} units`,
        );
        minimumClearance = Math.min(minimumClearance, clearance);
        checkedVertices++;
      }
      if (mesh.name === 'contact-flight-isolator-foot') {
        assert.ok(
          minimumClearance <= 0.003,
          'Each console isolator seats on the real deck',
        );
        groundedPads++;
      }
    }
    assert.ok(
      checkedVertices > 100,
      'Probe real support surfaces including their rear corners',
    );
    assert.equal(groundedPads, 2, 'Both console supports meet the deck');
  });

  test(`${layout}: the working deck and all three displays have connected structural supports`, () => {
    const { parts, matches, joined } = partsForLayout(layout);
    const data = model.group.userData;
    const screenBounds = [data.contactComputer, ...data.socialScreens].map(
      ({ root }) => new THREE.Box3().setFromObject(root),
    );
    for (let a = 0; a < screenBounds.length; a++)
      for (let b = a + 1; b < screenBounds.length; b++)
        assert.ok(
          !screenBounds[a].intersectsBox(screenBounds[b]),
          'Complete monitor envelopes remain separated',
        );
    for (const side of [-1, 1]) {
      for (const [a, b] of [
        ['isolator-foot', 'anchored-foot'],
        ['anchored-foot', 'console-stanchion'],
        ['console-stanchion', 'deck-mount'],
      ])
        joined(
          matches(a, side),
          matches(b, side),
          `${side}: ${a} supports ${b}`,
        );
      joined(
        matches('deck-mount', side),
        matches('continuous-console-shell'),
        `${side}: frame supports the console shell`,
      );
      joined(
        matches('diagonal-brace', side),
        matches('console-stanchion', side),
        `${side}: brace reaches the front support`,
      );
      joined(
        matches('diagonal-brace', side),
        matches('wall-mount', side),
        `${side}: brace reaches its rear wall shoe`,
      );
    }
    joined(
      matches('continuous-console-shell'),
      matches('deck-seal'),
      'Shell supports the deck seal',
    );
    joined(
      matches('deck-seal'),
      matches('working-deck'),
      'Working deck seats on its seal',
    );
    joined(
      matches('service-enclosure'),
      matches('crossmember'),
      'Under-console service enclosure meets its supporting crossmember',
    );
    joined(
      matches('crossmember'),
      matches('diagonal-brace'),
      'Service crossmember reaches the structural frame',
    );
    for (const kind of ['contact', 'link', 'signal']) {
      const rails = matches(`${kind}-mounting-rail`);
      const stands = matches(`${kind}-display-standoff`);
      const shoes = matches(`${kind}-wall-shoe`);
      assert.ok(
        rails.length && stands.length && shoes.length,
        `${kind}: the display has a complete mounting assembly`,
      );
      for (const rail of rails)
        joined([rail], shoes, `${kind}: each rear rail meets a wall shoe`);
      for (const stand of stands) {
        joined([stand], rails, `${kind}: every standoff meets a rail`);
        joined(
          [stand],
          matches(`${kind}-bezel`),
          `${kind}: every standoff reaches the enclosure`,
        );
      }
      for (const shoe of shoes)
        joined(
          [shoe],
          parts.filter(({ name }) =>
            name.startsWith(`contact-flight-rear-anchor-${kind}-`),
          ),
          `${kind}: each wall shoe reaches its fitted rear anchor`,
        );
      for (const heel of matches(`${kind}-display-heel`)) {
        joined(
          [heel],
          matches('working-deck'),
          `${kind}: display heel meets the deck`,
        );
        joined(
          [heel],
          matches(`${kind}-bezel`),
          `${kind}: display heel reaches the enclosure`,
        );
      }
    }
  });
  test(`${layout}: grips, deck sockets and the suspended headset have actual physical attachments`, () => {
    const { parts, matches, joined } = partsForLayout(layout);
    for (const side of [-1, 1]) {
      joined(
        matches('handhold-saddle', side),
        matches('continuous-console-shell'),
        `${side}: console handhold saddle seats into the body`,
      );
      joined(
        matches('handhold-collar', side),
        matches('handhold-saddle', side),
        `${side}: handhold collar seats onto its saddle`,
      );
      joined(
        matches('handhold-collar', side),
        matches('front-handhold'),
        `${side}: collar captures the console handhold`,
      );
    }
    const grips = matches('main-display-grip');
    assert.equal(
      grips.length,
      2,
      'The monitor has handling grips on both sides',
    );
    for (const grip of grips)
      joined(
        [grip],
        matches('main-display-grip-seat'),
        'Each monitor grip meets a fitted seat',
      );
    for (const seat of matches('main-display-grip-seat')) {
      joined(
        [seat],
        matches('contact-bezel'),
        'Every handling-grip seat enters the monitor enclosure',
      );
      joined([seat], grips, 'Every handling-grip seat captures the grip');
    }
    const sockets = matches('deck-restraint-socket-ring');
    assert.equal(
      sockets.length,
      2,
      'Paired restraint sockets remain seated on the working deck',
    );
    for (const ring of sockets)
      joined(
        [ring],
        matches('working-deck'),
        'Each restraint socket seats on the worktop',
      );
    for (const cap of matches('deck-captive-socket-cap'))
      joined(
        [cap],
        matches('deck-restraint-socket-ring'),
        'Each captive cap meets its socket',
      );
    joined(
      matches('audio-microphone-isolation-foot'),
      matches('working-deck'),
      'Microphone sits on the working deck',
    );
    joined(
      matches('audio-microphone-deck-connector-gasket'),
      matches('working-deck'),
      'Microphone connector seats on the working deck',
    );
    joined(
      matches('audio-microphone-flexible-neck'),
      matches('audio-microphone-neck-boot'),
      'Bent microphone neck remains attached to its base boot',
    );
    joined(
      matches('audio-microphone-flexible-neck'),
      matches('audio-microphone-capsule-collar'),
      'Bent microphone neck reaches the capsule collar',
    );
    joined(
      matches('audio-microphone-capsule-collar'),
      matches('audio-microphone-capsule-rear-housing'),
      'Capsule collar reaches the microphone head',
    );
    joined(
      matches('audio-headset-ceiling-shoe'),
      matches('continuous-console-shell'),
      'Headset shoe mounts into the console underside',
    );
    joined(
      matches('audio-headset-ceiling-shoe'),
      matches('audio-headset-hanger-neck'),
      'Hanger neck reaches its console shoe',
    );
    joined(
      matches('audio-headset-hanger-neck'),
      matches('audio-headset-dock-saddle-base'),
      'Hanger neck supports the headset saddle',
    );
    joined(
      matches('audio-headset-dock-saddle-base'),
      matches('audio-headset-dock-padded-saddle'),
      'Padding seats on the saddle',
    );
    joined(
      matches('audio-headset-dock-padded-saddle'),
      matches('audio-headset-arched-padded-band'),
      'The headset rests on its hanger',
    );
    joined(
      matches('audio-headset-connector-housing'),
      matches('audio-headset-dock-saddle-base'),
      'Cord connector housing is secured to the hanger',
    );
    joined(
      matches('audio-headset-dock-plug'),
      matches('audio-headset-connector-housing'),
      'Plug enters the mounted connector',
    );
    joined(
      matches('audio-headset-secured-cable'),
      matches('audio-headset-plug-strain-relief'),
      'Cord reaches its plug boot',
    );
    joined(
      matches('audio-headset-secured-cable'),
      matches('audio-headset-cup-strain-relief'),
      'Cord reaches the earcup boot',
    );
    const outboard = (suffix) =>
      parts.filter(({ name }) => name === `outboard-communications-${suffix}`);
    for (const selector of outboard('selector'))
      joined(
        [selector],
        outboard('selector-recess'),
        'Each radio selector seats into its recess',
      );
    joined(
      outboard('connector-bank-edge-guard'),
      outboard('connector-panel'),
      'Radio connector guard seats on its panel',
    );
  });
}

test('Main and social glass remain visible through the full console at sampled room-view extremes', () => {
  const obstructions = [];
  for (const [width, height] of [
    [1280, 720],
    [390, 844],
  ]) {
    setLayout(width < 700 ? 'compact' : 'wide');
    const data = model.group.userData;
    const target = [
      data.roomAnchors.contact[0],
      data.innerApertureBounds.contact.center[1],
      data.roomAnchors.contact[2],
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
    const screens = [
      { name: 'contact', ...data.contactComputer },
      ...data.socialScreens.map((screen) => ({
        ...screen,
        name: screen.side,
        width: screen.glassWidth,
        height: screen.glassHeight,
      })),
    ];
    for (const view of cursorViewSamples(
      { target, direction: [0, 0, 1] },
      2,
      CAMERA_RANGES.room,
    )) {
      const camera = new THREE.Vector3(...target).addScaledVector(
        new THREE.Vector3(...view.direction),
        fit.chosenDistance,
      );
      for (const screen of screens)
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
            ).intersectObject(data.contactComputer.consoleRoot, true);
            const blocker = hits.find(
              ({ object }) =>
                visible(object) &&
                [object.material]
                  .flat()
                  .some(
                    (material) => material.visible && !material.transparent,
                  ),
            );
            if (blocker)
              obstructions.push(
                `${width}×${height}/${screen.name}: face ${x},${y}; view ${view.direction.join(',')}; ${blocker.object.name}`,
              );
          }
    }
  }
  assert.deepEqual(
    obstructions,
    [],
    'Console hardware must not obscure the usable glass',
  );
});
