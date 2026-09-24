import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';

const sources = new Map();
// Inspect the real rounded source solids before production material batching.
// Their retained parents provide the actual transforms for each bay layout.
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
const model = createSpacecraft({ ...THREE, Mesh: SourceMesh });

function setLayout(layout) {
  model.setLayout(layout);
  model.update(0, 'home', true, {
    activeRoom: 'home',
    delta: 0,
    immediateDoors: true,
  });
  model.group.updateMatrixWorld(true);
}

function visible(object) {
  for (let part = object; part; part = part.parent)
    if (!part.visible) return false;
  return true;
}

function baySources() {
  return [...sources.values()]
    .filter(
      ({ mesh, parent }) =>
        /^(service-spine-|ladder-end-|docking-shoulder-|ladder-web-|walkway-continuous-rear-liner)/.test(
          mesh.name,
        ) && visible(parent),
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
  const parts = baySources().map(solidPart);
  const matches = (prefix, suffix) =>
    parts.filter(({ name }) => name === `${prefix}-${suffix}`);
  const joined = (left, right, label) => {
    assert.ok(left.length && right.length, `${label}: both parts exist`);
    for (const part of left)
      assert.ok(
        right.some((other) => solidContact(part, other)),
        `${label}: each actual solid reaches its support`,
      );
  };
  return {
    parts,
    joined,
    spine: (name) => matches('service-spine', name),
    tool: (name) => matches('docking-shoulder', name),
    end: (name) => matches('ladder-end', name),
    web: (name) => matches('ladder-web', name),
  };
}

for (const layout of ['wide', 'compact']) {
  test(`${layout}: fitted carriers connect the real liner to the transfer rails and rungs`, () => {
    const { parts, spine, joined } = partsForLayout(layout);
    const liner = parts.find(
      ({ name }) => name === 'walkway-continuous-rear-liner',
    );
    assert.ok(liner, 'The production rear lining exists');
    const carriers = spine('liner-seated-rail-carrier');
    assert.ok(carriers.length > 0, 'The rails have structural wall carriers');
    for (const carrier of carriers) {
      const positions = carrier.mesh.geometry.attributes.position;
      let rearFaceSamples = 0;
      for (let i = 0; i < positions.count; i++) {
        const point = new THREE.Vector3()
          .fromBufferAttribute(positions, i)
          .applyMatrix4(carrier.mesh.matrixWorld);
        const hit = new THREE.Raycaster(
          new THREE.Vector3(point.x, point.y, 0),
          new THREE.Vector3(0, 0, -1),
          0,
          2,
        ).intersectObject(liner.mesh, false)[0];
        assert.ok(
          hit,
          'The carrier has actual lining behind its full footprint',
        );
        assert.ok(
          point.z - hit.point.z >= -0.005,
          'Carrier does not penetrate deeply into the pressure lining',
        );
        if (Math.abs(point.z - carrier.bounds.min.z) < 1e-6) {
          rearFaceSamples++;
          assert.ok(
            point.z - hit.point.z <= 0.001,
            'The whole carrier backing face seats on the liner',
          );
        }
      }
      assert.ok(
        rearFaceSamples > 0,
        'Actual carrier rear faces were inspected',
      );
    }
    joined(
      spine('rail-anchor-plate'),
      carriers,
      'Every rail plate meets a carrier',
    );
    joined(
      spine('rail-rigid-stand-off'),
      spine('rail-anchor-plate'),
      'Stand-offs meet their wall plates',
    );
    joined(
      spine('rail-rigid-stand-off'),
      spine('rail-split-clamp'),
      'Stand-offs reach the split clamps',
    );
    joined(
      spine('rail-split-clamp'),
      spine('continuous-rail'),
      'Each clamp captures a rail',
    );
    joined(
      spine('rail-end-cap'),
      spine('continuous-rail'),
      'End caps meet the rails',
    );
    joined(
      spine('rail-end-cap'),
      spine('upper-terminal-anchor').concat(spine('lower-terminal-anchor')),
      'Rail ends seat in the terminal supports',
    );
    joined(
      spine('rung-end-socket'),
      spine('rung-rail-sleeve'),
      'Every rung socket meets a rail sleeve',
    );
    joined(
      spine('rung-end-socket'),
      spine('satin-rung'),
      'Both ends of every rung reach their sockets',
    );
    joined(
      spine('rung-rail-sleeve'),
      spine('continuous-rail'),
      'Rung sleeves capture the rails',
    );
    joined(
      spine('rung-grip-insert'),
      spine('satin-rung'),
      'Each central grasp meets its rung',
    );
    joined(
      spine('rung-grip-ferrule'),
      spine('rung-grip-insert'),
      'Grasp ferrules meet their inserts',
    );
    joined(
      spine('uniform-grip-sleeve'),
      spine('continuous-rail'),
      'Rail grasps cover their rails',
    );
  });

  test(`${layout}: the continuous tread backing seats on the liner and preserves hand and transfer clearance`, () => {
    const { parts, spine, joined } = partsForLayout(layout);
    const liner = parts.find(
      ({ name }) => name === 'walkway-continuous-rear-liner',
    );
    const backing = spine('continuous-tread-backing');
    assert.ok(liner && backing.length, 'The backing and actual liner exist');
    for (const panel of backing) {
      const positions = panel.mesh.geometry.attributes.position;
      let rearFaceSamples = 0;
      for (let i = 0; i < positions.count; i++) {
        const point = new THREE.Vector3()
          .fromBufferAttribute(positions, i)
          .applyMatrix4(panel.mesh.matrixWorld);
        const hit = new THREE.Raycaster(
          new THREE.Vector3(point.x, point.y, 0),
          new THREE.Vector3(0, 0, -1),
          0,
          2,
        ).intersectObject(liner.mesh, false)[0];
        assert.ok(hit, 'Actual lining supports the entire backing footprint');
        assert.ok(
          point.z - hit.point.z >= -0.005,
          'The backing does not penetrate deeply into the pressure lining',
        );
        if (Math.abs(point.z - panel.bounds.min.z) < 1e-6) {
          rearFaceSamples++;
          assert.ok(
            point.z - hit.point.z <= 0.001,
            'The complete backing rear face seats on the liner',
          );
        }
      }
      assert.ok(rearFaceSamples > 0, 'Actual backing rear faces were checked');
    }
    const carriers = spine('liner-seated-rail-carrier').sort(
      (a, b) => a.bounds.min.x - b.bounds.min.x,
    );
    joined(carriers, backing, 'Both structural carriers capture the backing');
    const meshes = parts.map(({ mesh }) => mesh);
    const rungs = spine('satin-rung').sort(
      (a, b) => a.bounds.min.y - b.bounds.min.y,
    );
    assert.ok(rungs.length > 1, 'A sequence of actual rungs was inspected');
    const rowCenters = rungs.map(
      ({ bounds }) => bounds.getCenter(new THREE.Vector3()).y,
    );
    const sampleYs = [
      rungs[0].bounds.min.y,
      ...rowCenters,
      ...rowCenters.slice(1).map((y, i) => (rowCenters[i] + y) / 2),
      rungs.at(-1).bounds.max.y,
    ];
    // Inspect the real unobstructed lane between the two carriers, including
    // every rung and every intervening space. A segmented or shortened shield
    // must not expose gaps through the working part of the ladder.
    for (const fraction of [0.1, 0.5, 0.9])
      for (const y of sampleYs) {
        const x = THREE.MathUtils.lerp(
          carriers[0].bounds.max.x,
          carriers.at(-1).bounds.min.x,
          fraction,
        );
        const origin = new THREE.Vector3(x, y, backing[0].bounds.max.z + 0.08);
        const hit = new THREE.Raycaster(
          origin,
          new THREE.Vector3(0, 0, -1),
          0,
          0.4,
        ).intersectObjects(meshes, false)[0];
        assert.ok(
          backing.some(({ mesh }) => hit?.object === mesh),
          'The fitted backing continuously covers the working lane behind and between the rungs',
        );
      }
    for (const grip of spine('rung-grip-insert')) {
      const center = grip.bounds.getCenter(new THREE.Vector3());
      for (const fraction of [0.25, 0.5, 0.75]) {
        const origin = new THREE.Vector3(
          THREE.MathUtils.lerp(grip.bounds.min.x, grip.bounds.max.x, fraction),
          center.y,
          grip.bounds.min.z - 0.001,
        );
        const hit = new THREE.Raycaster(
          origin,
          new THREE.Vector3(0, 0, -1),
          0,
          0.5,
        ).intersectObjects(meshes, false)[0];
        assert.ok(
          hit && hit.distance > 0.2,
          'Every rung retains a substantial clear hand opening across its grasp',
        );
      }
    }
    const data = model.group.userData;
    const route = [
      data.roomAnchors.projects,
      ...data.portals.find(({ id }) => id === 'projects:about').waypoints,
      data.roomAnchors.about,
    ];
    // Sample the fixed fittings around the existing transfer centerline. Iris
    // motion and the wider camera envelope remain covered by navigation tests.
    for (let i = 1; i < route.length; i++) {
      const start = new THREE.Vector3(...route[i - 1]),
        finish = new THREE.Vector3(...route[i]);
      const direction = finish.clone().sub(start),
        length = direction.length();
      direction.normalize();
      const lateral = new THREE.Vector3(-direction.y, direction.x, 0);
      for (const offset of [
        new THREE.Vector3(),
        lateral.clone().multiplyScalar(0.12),
        lateral.clone().multiplyScalar(-0.12),
        new THREE.Vector3(0, 0, 0.12),
        new THREE.Vector3(0, 0, -0.12),
      ]) {
        const hit = new THREE.Raycaster(
          start.clone().add(offset),
          direction,
          0.001,
          length - 0.001,
        ).intersectObjects(meshes, false)[0];
        assert.ok(
          !hit,
          'Fixed bay fittings leave the sampled transfer corridor clear',
        );
      }
    }
  });

  test(`${layout}: service couplings, cap stowage and isolation controls have rigid attachments`, () => {
    const { spine, web, joined } = partsForLayout(layout);
    const backs = spine('upper-junction-closed-back').concat(
      spine('lower-junction-closed-back'),
    );
    joined(
      spine('recessed-service-coupling-body'),
      backs,
      'Coupling bodies mount rigidly into their pocket backs',
    );
    joined(
      spine('dust-cap-retaining-peg'),
      backs,
      'Cap retaining pegs mount into their pocket backs',
    );
    joined(
      spine('tethered-coupling-dust-cap'),
      spine('dust-cap-retaining-peg'),
      'Each stowed cap sits on its retaining peg',
    );
    joined(
      spine('dust-cap-inset-grip'),
      spine('tethered-coupling-dust-cap'),
      'Cap grips meet their bodies',
    );
    joined(
      spine('service-coupling-hex-collar'),
      spine('recessed-service-coupling-body'),
      'Coupling collars meet their bodies',
    );
    joined(
      spine('service-coupling-socket'),
      spine('service-coupling-hex-collar'),
      'Service sockets seat in their collars',
    );
    joined(
      web('wall-foot'),
      web('isolation-case'),
      'Cassette feet meet its case',
    );
    joined(
      web('service-cover'),
      web('isolation-case'),
      'Isolation cover seats on its case',
    );
    joined(
      web('valve-socket'),
      web('service-cover'),
      'Both isolation sockets seat on the cover',
    );
    joined(
      web('valve-cap'),
      web('valve-socket'),
      'Isolation caps seat in their sockets',
    );
    joined(
      web('isolation-grip'),
      web('valve-cap'),
      'Isolation handles meet their caps',
    );
    joined(
      web('captured-guard'),
      web('service-cover'),
      'Every protective guard seats on the cover',
    );
  });

  test(`${layout}: stowed tools and end grips retain complete attachment paths`, () => {
    const { tool, end, joined } = partsForLayout(layout);
    joined(
      tool('clip-rigid-post'),
      tool('clip-bonded-mount-foot'),
      'Tool posts reach their bonded liner feet',
    );
    joined(
      tool('open-tool-retention-clip'),
      tool('clip-rigid-post'),
      'Tool clips reach their rigid posts',
    );
    joined(
      tool('clip-contact-pad'),
      tool('open-tool-retention-clip'),
      'Resilient pads meet their clips',
    );
    joined(
      tool('clip-contact-pad'),
      tool('substantial-spanner-grasp'),
      'Every pad grips its spanner',
    );
    joined(
      tool('substantial-spanner-grasp'),
      tool('forged-open-jaw-spanner'),
      'Tool grasps meet their forged cores',
    );
    joined(
      tool('spring-clip-release-tab'),
      tool('open-tool-retention-clip'),
      'Tool release tabs attach to their clips',
    );
    joined(
      tool('open-holder-backbone'),
      tool('open-tool-retention-clip'),
      'Holder backbones join the clips',
    );
    joined(
      end('handhold-anchor-collar'),
      end('liner-seated-handhold-shoe'),
      'End-grip collars seat on their fitted shoes',
    );
    joined(
      end('curved-transfer-handhold'),
      end('handhold-anchor-collar'),
      'End-grip returns enter their collars',
    );
    joined(
      end('rigid-handhold-grasp'),
      end('curved-transfer-handhold'),
      'End grasps enclose their transfer handholds',
    );
    joined(
      end('handhold-grip-index'),
      end('rigid-handhold-grasp'),
      'Grip index rings remain attached',
    );
  });
}
