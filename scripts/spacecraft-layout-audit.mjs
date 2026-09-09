import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const root = resolve(process.argv[2] || process.cwd());
// Usage: node spacecraft-model-v9-audit.mjs <repo> [model.ts] [report.json]
// Defaults to the current checkout model; Node 22.18+ is required for TypeScript.
const modelPath = resolve(
  process.argv[3] || join(root, 'components/spacecraft-model.ts'),
);
const outputPath = resolve(
  process.argv[4] || '/tmp/spacecraft-model-v9-audit.json',
);
const req = createRequire(pathToFileURL(join(root, 'package.json')));
const THREE = await import(pathToFileURL(req.resolve('three')).href);
const { createSpacecraft } = await import(pathToFileURL(modelPath).href);
const near = (a, b) => Math.abs(a - b) < 1e-5;
const fixtures = (n) =>
  Array.from({ length: n }, (_, i) => ({
    title: `Project ${i + 1}`,
    slug: `audit-${i + 1}`,
    sample: i % 2 === 0,
  }));
const report = {
  modelPath,
  sha256: createHash('sha256').update(readFileSync(modelPath)).digest('hex'),
  mapping: [],
  mutations: [],
  layouts: {},
  readers: {},
  routes: [],
  visibility: [],
  headers: [],
  attachments: [],
  walls: [],
  labels: [],
  passages: [],
  lighting: [],
  checks: [],
};
function hierarchyVisible(object) {
  for (let o = object; o; o = o.parent) if (!o.visible) return false;
  return object.material?.visible !== false;
}
function countDraws(m) {
  let n = 0;
  m.group.traverseVisible((o) => {
    if (o.isMesh && o.material.visible !== false) n++;
  });
  return n;
}
for (const count of [0, 1, 8, 9, 10, 18, 19]) {
  const data = fixtures(count),
    m = createSpacecraft(THREE, { projects: data, layout: 'compact' }),
    pages = [];
  const targetIdentity = m.interactionTargets.map((t) => t.object),
    readerIdentity = { ...m.readerSurfaces };
  for (const layout of ['compact', 'wide']) {
    m.setLayout(layout);
    for (let page = 0; page < Math.max(1, Math.ceil(count / 9)); page++) {
      const r = m.setProjectPage(page),
        expected = Array.from(
          { length: 9 },
          (_, i) => data[page * 9 + i] || null,
        );
      assert.deepEqual(r.slots, expected);
      const slotChecks = [];
      for (let i = 0; i < 9; i++) {
        const door = m.group.getObjectByName('project-compartment-hinge-' + i),
          cartridge = m.group.getObjectByName('occupied-cartridge-' + i);
        assert.equal(door.visible, !!expected[i]);
        assert.equal(cartridge.visible, !!expected[i]);
        const spare = m.group.getObjectByName('spare-equipment-bay-' + i);
        assert.equal(spare.visible, !expected[i]);
        assert(
          !m.targets.some((t) => {
            let a = t.object;
            while (a) {
              if (a === spare) return true;
              a = a.parent;
            }
            return false;
          }),
          'spares must not be actionable project geometry',
        );
        const proxy = m.interactionTargets.find(
          (t) => t.object.userData.projectSlot === i,
        ).object;
        assert.equal(
          proxy.userData.projectSlug || null,
          expected[i]?.slug || null,
        );
        const center = proxy.getWorldPosition(new THREE.Vector3());
        const hits = new THREE.Raycaster(
          center.clone().add(new THREE.Vector3(0, 0, 3)),
          new THREE.Vector3(0, 0, -1),
        ).intersectObject(proxy, false);
        assert.equal(hits.length > 0, !!expected[i]);
        slotChecks.push({
          slot: i,
          slug: expected[i]?.slug || null,
          door: door.visible,
          cartridge: cartridge.visible,
          pickable: hits.length > 0,
        });
      }
      pages.push({ layout, page, slots: slotChecks });
    }
  }
  report.mapping.push({ count, pages });
  const reversed = data.toReversed(),
    r = m.setProjects(reversed);
  assert.deepEqual(
    r.slots,
    Array.from({ length: 9 }, (_, i) => reversed[r.page * 9 + i] || null),
  );
  const one = m.setProjects(data.slice(0, 1));
  assert.equal(one.page, 0);
  assert.equal(one.pageCount, 1);
  assert.deepEqual(
    one.slots,
    Array.from({ length: 9 }, (_, i) => data.slice(0, 1)[i] || null),
  );
  const empty = m.setProjects([]);
  assert.equal(empty.page, 0);
  assert(empty.slots.every((p) => p === null));
  for (let i = 0; i < 9; i++) {
    const proxy = m.interactionTargets.find(
      (t) => t.object.userData.projectSlot === i,
    ).object;
    assert.equal(proxy.userData.projectSlug, undefined);
    assert.equal(proxy.layers.mask, 2 ** 31);
  }
  assert(m.interactionTargets.every((t, i) => t.object === targetIdentity[i]));
  assert(
    Object.entries(readerIdentity).every(([k, v]) => m.readerSurfaces[k] === v),
  );
  assert.equal(m.setProjectPage(-10).page, 0);
  assert.equal(m.setProjectPage(Infinity).page, 0);
  const grown = m.setProjects(data);
  assert.equal(grown.page, 0);
  assert.deepEqual(
    grown.slots,
    Array.from({ length: 9 }, (_, i) => data[i] || null),
  );
  report.mutations.push({
    count,
    reordered: true,
    shrankToOne: true,
    shrankToZero: true,
    grewBack: true,
    objectsStable: true,
  });
}
// Exercise the Canvas path without pretending to render browser fonts.
// Canvas factory stub implementing the DOM factory used by the model.
globalThis.document = {
  // oxlint-disable-next-line typescript/no-deprecated
  createElement() {
    const ctx = new Proxy(
      {},
      {
        get(t, k) {
          if (k in t) return t[k];
          if (k === 'measureText')
            return (text) => {
              const n = Number(
                (t.font || '10px').match(/[\d.]+(?=px)/)?.[0] || 10,
              );
              return {
                width: text.length * n * 0.58,
                actualBoundingBoxAscent: n * 0.72,
                actualBoundingBoxDescent: n * 0.1,
              };
            };
          if (k === 'createLinearGradient')
            return () => ({ addColorStop() {} });
          return () => {};
        },
      },
    );
    return {
      width: 0,
      height: 0,
      getContext() {
        return ctx;
      },
    };
  },
};
const sources = [];
class AuditMesh extends THREE.Mesh {
  constructor(...args) {
    super(...args);
    sources.push(this);
  }
  removeFromParent() {
    if (this.parent && !this.auditParent) this.auditParent = this.parent;
    return super.removeFromParent();
  }
}
const m = createSpacecraft(
  { ...THREE, Mesh: AuditMesh },
  {
    projects: fixtures(9),
    labels: {
      projects: 'Projects',
      experience: 'Experience',
      about: 'About',
      contact: 'Contact',
    },
    layout: 'compact',
  },
);
delete globalThis.document;
const readers = { ...m.readerSurfaces },
  targetObjects = m.portalTargets.map((t) => t.object);
const sourceMatrix = (o) =>
  o.auditParent
    ? o.auditParent.matrixWorld.clone().multiply(o.matrix)
    : o.matrixWorld.clone();
const sourceBounds = (o) => {
  o.geometry.computeBoundingBox();
  return o.geometry.boundingBox.clone().applyMatrix4(sourceMatrix(o));
};
const { cursorViewSamples, fitPerspectiveDistance, solveApertureFraming } =
  await import(pathToFileURL(join(root, 'lib/scene-controls.ts')).href);
const qaPath = join(
  root,
  'docs/evidence/connected-cabins-revision/browser-qa.json',
);
let savedPhoneDistance = 9.707012534740858;
try {
  const qa = JSON.parse(readFileSync(qaPath));
  const p = qa.find((x) => x.name === 'projects-phone');
  if (p) savedPhoneDistance = JSON.parse(p.framing).chosenDistance;
} catch {}
report.phoneEvidence = {
  qaPath,
  distance: savedPhoneDistance,
  targetOffset: [0, 0.17, 0.16],
  fov: 38,
  viewport: [390, 844],
};
const viewsFor = (room, distance) =>
  [-1, 0, 1].flatMap((py) =>
    [-1, 0, 1].map((px) => {
      const target = new THREE.Vector3(room[0], room[1] + 0.17, 0.16);
      const direction = new THREE.Vector3(0, 0, 1).applyEuler(
        new THREE.Euler(py * 0.025, px * 0.045, 0),
      );
      return { px, py, camera: target.addScaledVector(direction, distance) };
    }),
  );
const plateSources = (portal) =>
  sources.filter((o) => {
    let a = o.auditParent || o.parent;
    while (a) {
      if (a.userData.portalId === portal.id) return true;
      a = a.parent;
    }
    return false;
  });
function visibleTargets() {
  const result = [];
  m.group.traverseVisible((o) => {
    if (
      o.isMesh &&
      !o.userData.isInteractionProxy &&
      hierarchyVisible(o) &&
      !['identification-label', 'portal-destination-label'].includes(
        o.material.name,
      )
    )
      result.push(o);
  });
  return result;
}
function blockers(camera, point, targets) {
  const d = point.clone().sub(camera),
    n = d.length();
  d.normalize();
  return new THREE.Raycaster(camera, d, 0.001, n - 0.004).intersectObjects(
    targets,
    false,
  );
}
for (const layout of ['compact', 'wide']) {
  const meta = m.setLayout(layout),
    scale = layout === 'wide' ? 1.4 : 1;
  assert.equal(meta.innerApertureBounds.projects.size[0], 2.44 * scale);
  assert(m.portalTargets.every((p, i) => p.object === targetObjects[i]));
  assert(
    Object.entries(readers).every(
      ([key, value]) => m.readerSurfaces[key] === value,
    ),
  );
  report.layouts[layout] = {
    anchors: structuredClone(meta.roomAnchors),
    aperture: structuredClone(meta.innerApertureBounds),
    bounds: structuredClone(meta.overviewBounds),
    walkway: structuredClone(m.group.userData.walkwayBounds),
    drawCalls: countDraws(m),
  };
  for (const section of Object.keys(readers)) {
    m.update(0, '', true, {
      activeRoom: section,
      reading: true,
      selectedProject: section === 'projects' ? 'audit-1' : null,
      hoveredPortal: null,
    });
    const p = readers[section].getWorldPosition(new THREE.Vector3()).toArray(),
      expected = m.group.userData.readerAnchors[section];
    assert(p.every((v, i) => near(v, expected[i])));
    report.readers[`${layout}/${section}`] = p;
  }
  m.update(0, '', true, {
    activeRoom: 'home',
    reading: false,
    selectedProject: null,
    hoveredPortal: null,
  });
  for (const portal of m.group.userData.portals) {
    assert(['left', 'right'].includes(portal.edge));
    assert(portal.open && !portal.sealed);
    const target = m.portalTargets.find((t) => t.id === portal.id);
    assert.equal(target.object.parent.userData.section, portal.from);
    assert.equal(target.object.userData.portalDestination, portal.to);
    const related = plateSources(portal),
      ink = related.find((o) => o.name === 'portal-destination-ink');
    const inkCenter = sourceBounds(ink)
      .getCenter(new THREE.Vector3())
      .toArray();
    assert(
      inkCenter.every((v, i) => near(v, portal.labelPosition[i])),
      'caption batch root must preserve movable ink',
    );
    const back = related.find(
        (o) => o.name === 'portal-flush-wall-nameplate-backing',
      ),
      wall = sources.find(
        (o) =>
          o.name === 'upper-room-enamel-header' &&
          o.userData.section === portal.from,
      );
    const overlap = sourceBounds(back)
      .intersect(sourceBounds(wall))
      .getSize(new THREE.Vector3())
      .toArray();
    assert(
      overlap.every((v) => v > 1e-5),
      'flush label backing must contact the wall',
    );
    report.attachments.push({ layout, portal: portal.id, overlap });
    const room = m.group.userData.roomAnchors[portal.from];
    // Current responsive camera solver, plus the recorded phone distance that
    // exposed the previous long-distance jamb occlusion (same fixed +Z target).
    const targetPoint = [room[0], room[1] + 0.17, 0.16],
      cameraViews = cursorViewSamples({
        target: targetPoint,
        direction: [0, 0, 1],
      });
    const required = m.group.userData.requiredFramingPoints[portal.from].map(
        (p) => p.position,
      ),
      aperture = m.group.userData.innerApertureBounds[portal.from];
    const viewport = layout === 'wide' ? [1440, 1000] : [390, 844];
    const safe =
      layout === 'wide'
        ? {
            left: -1 + 48 / 1440,
            right: 1 - 48 / 1440,
            top: 1 - 48 / 1000,
            bottom: -1 + 160 / 1000,
          }
        : {
            left: -1 + 28 / 390,
            right: 1 - 28 / 390,
            top: 1 - 48 / 844,
            bottom: -1 + 264 / 844,
          };
    const solution = solveApertureFraming({
      aperture: {
        center: aperture.center,
        right: [1, 0, 0],
        up: [0, 1, 0],
        width: aperture.size[0],
        height: aperture.size[1],
      },
      views: cameraViews,
      requiredPoints: required,
      fovDegrees: 38,
      aspect: viewport[0] / viewport[1],
      overscan: 1.015,
      portalBounds: safe,
    });
    const fitted = solution.feasible
      ? solution.minimumDistance +
        (solution.maximumDistance - solution.minimumDistance) * 0.16
      : Math.max(
          ...cameraViews.map((v) =>
            fitPerspectiveDistance(
              required,
              v,
              38,
              viewport[0] / viewport[1],
              safe,
            ),
          ),
        ) + 0.05;
    const distances =
      layout === 'compact'
        ? [
            ['actual-phone', savedPhoneDistance],
            ['current-fit', fitted],
            ['narrow-tall-stress', 12],
          ]
        : [
            ['current-fit', fitted],
            ['legacy-stress', 5.65],
          ];
    for (const [pose, distance] of distances)
      for (const view of viewsFor(room, distance)) {
        const blocked = [],
          pickMisses = [],
          targets = visibleTargets();
        for (const sx of [-0.94, -0.47, 0, 0.47, 0.94])
          for (const sy of [-0.6, 0, 0.6]) {
            const point = new THREE.Vector3(
              portal.labelPosition[0] + (sx * portal.labelSize[0]) / 2,
              portal.labelPosition[1] + (sy * portal.labelSize[1]) / 2,
              portal.labelPosition[2],
            );
            const hits = blockers(view.camera, point, targets);
            if (hits.length)
              blocked.push({
                sx,
                sy,
                object: hits[0].object.name,
                point: hits[0].point.toArray(),
              });
          }
        for (const sx of [-0.9, 0, 0.9])
          for (const sy of [-0.9, 0, 0.9]) {
            const point = new THREE.Vector3(
              portal.labelPosition[0] + (sx * portal.plateSize[0]) / 2,
              portal.labelPosition[1] + (sy * portal.plateSize[1]) / 2,
              portal.labelPosition[2],
            );
            const d = point.clone().sub(view.camera),
              len = d.length();
            d.normalize();
            if (
              !new THREE.Raycaster(
                view.camera,
                d,
                0.001,
                len + 0.1,
              ).intersectObject(target.object, false).length
            )
              pickMisses.push({ sx, sy });
          }
        report.visibility.push({
          layout,
          portal: portal.id,
          pose,
          distance,
          pointer: [view.px, view.py],
          camera: view.camera.toArray(),
          blocked,
          pickMisses,
        });
      }
    // Cast across the actual side bulkhead, connection sleeve and facing wall.
    // Keep the sample segment at the opening; content beyond the doorway is
    // supposed to be visible, so furnishings deep in the next room are excluded.
    const sign = portal.edge === 'right' ? 1 : -1;
    const fromX = room[0] + sign * (1.5 * scale - 0.15);
    const nextX = portal.via
      ? m.group.userData.walkwayAnchor[0] + 0.75 * scale - 0.15
      : m.group.userData.roomAnchors[portal.to][0] -
        sign * (1.5 * scale - 0.15);
    const blocked = [];
    for (const yy of [-0.72, -0.36, 0, 0.36, 0.72])
      for (const zz of [-0.8, -0.4, 0, 0.4, 0.8]) {
        const a = new THREE.Vector3(fromX, room[1] + 0.04 + yy, zz),
          b = new THREE.Vector3(nextX, room[1] + 0.04 + yy, zz),
          d = b.clone().sub(a),
          len = d.length();
        d.normalize();
        const hits = new THREE.Raycaster(
          a,
          d,
          0.001,
          len - 0.001,
        ).intersectObjects(visibleTargets(), false);
        if (hits.length)
          blocked.push({
            yy,
            zz,
            object: hits[0].object.name,
            point: hits[0].point.toArray(),
          });
      }
    report.passages.push({ layout, portal: portal.id, fromX, nextX, blocked });
  }
  for (const section of Object.keys(readers)) {
    const room = m.group.userData.roomAnchors[section],
      anchor = m.group.userData.headerAnchors[section],
      plaque = m.group.userData.labelPlaques.find(
        (p) => p.section === section && p.role === 'header',
      );
    const distances =
      layout === 'wide' ? [4.14, 5.65] : [savedPhoneDistance, 12];
    for (const distance of distances)
      for (const view of viewsFor(room, distance)) {
        const blocked = [];
        for (const sx of [-0.94, -0.47, 0, 0.47, 0.94])
          for (const sy of [-0.6, 0, 0.6]) {
            const p = new THREE.Vector3(
              anchor[0] + (sx * plaque.size[0]) / 2,
              anchor[1] + (sy * plaque.size[1]) / 2,
              anchor[2],
            );
            const hits = blockers(view.camera, p, visibleTargets());
            if (hits.length)
              blocked.push({ sx, sy, object: hits[0].object.name });
          }
        report.headers.push({
          layout,
          section,
          distance,
          pointer: [view.px, view.py],
          blocked,
        });
      }
  }
}
for (const from of ['projects', 'experience', 'about', 'contact'])
  for (const to of ['projects', 'experience', 'about', 'contact']) {
    m.update(1, from, true, {
      activeRoom: from,
      reading: false,
      hoveredPortal: to,
      selectedProject: null,
    });
    const route = m.group.userData.activeRoute,
      lit = m.group.userData.portals.filter((p) => p.highlight === 1);
    assert.equal(lit.length, from === to ? 0 : 1);
    if (from !== to) {
      assert.equal(route[0], from);
      assert.equal(route.at(-1), to);
      assert.equal(lit[0].from, from);
      assert.equal(lit[0].to, route[1]);
    }
    report.routes.push({ from, to, route, lit: lit.map((p) => p.id) });
  }
assert.deepEqual(m.group.userData.adjacency.experience, ['projects']);
assert.deepEqual(m.group.userData.adjacency.contact, ['about']);
for (const section of ['home', 'projects', 'experience', 'about', 'contact']) {
  m.update(2, '', true, {
    activeRoom: section,
    reading: false,
    hoveredPortal: null,
  });
  const state = structuredClone(m.group.userData.lightingState);
  report.lighting.push({ section, state });
  for (const room of ['projects', 'experience', 'about', 'contact']) {
    const selected = room === section,
      s = state[room];
    assert(near(s.interiorColor, selected ? 1 : 0.28));
    assert(near(s.fixtureEmission, selected ? 1 : 0.1));
    assert(near(s.screenEmission, selected ? 1 : 0.22));
    assert.equal(s.pointIntensities.length, 2);
    assert(s.pointIntensities.every((v) => near(v, selected ? 0.9 : 0.06)));
    assert.equal(s.labels, 1);
  }
}
const parts = m.targets.flatMap(
  (t) => t.object.userData.parts || [t.object.name],
);
assert.equal(parts.filter((n) => n === 'coherent-cabin-deck').length, 4);
assert(
  !parts.some((n) =>
    [
      'recessed-non-slip-deck',
      'deck-service-joint',
      'collapsed-project-reader-dock',
      'closed-pressure-hatch-leaf',
      'closed-deck-transfer-hatch',
      'sealed-deck-transfer-recess',
      'ceiling-route-rail',
    ].includes(n),
  ),
);
assert.equal(
  parts.filter((n) => n === 'open-side-pressure-bulkhead').length,
  6,
);
assert.equal(m.portalTargets.length, 6);
let vertices = 0,
  invalidNormals = 0,
  nonfinite = 0;
const seen = new Set();
m.group.traverse((o) => {
  if (!o.isMesh || seen.has(o.geometry)) return;
  seen.add(o.geometry);
  const p = o.geometry.attributes.position,
    n = o.geometry.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    vertices++;
    if (![p.getX(i), p.getY(i), p.getZ(i)].every(Number.isFinite)) nonfinite++;
    if (n && Math.abs(Math.hypot(n.getX(i), n.getY(i), n.getZ(i)) - 1) > 0.003)
      invalidNormals++;
  }
});
assert(!invalidNormals && !nonfinite);
report.geometry = {
  vertices,
  invalidNormals,
  nonfinite,
  decks: 4,
  openSideBulkheads: 6,
  portals: 6,
};
report.failedVisibility = report.visibility.filter(
  (v) => v.blocked.length || v.pickMisses.length,
);
report.failedHeaders = report.headers.filter((v) => v.blocked.length);
report.failedPassages = report.passages.filter((v) => v.blocked.length);
report.summary = {
  mappingCounts: report.mapping.map((m) => m.count),
  slotMappings: report.mapping.reduce((n, m) => n + m.pages.length * 9, 0),
  mutations: report.mutations.length,
  readerPositions: Object.keys(report.readers).length,
  routeCases: report.routes.length,
  portalViews: report.visibility.length,
  portalInkRays: report.visibility.length * 15,
  platePickRays: report.visibility.length * 9,
  headerViews: report.headers.length,
  headerInkRays: report.headers.length * 15,
  passageRays: report.passages.length * 25,
  attachedPlates: report.attachments.length,
  lightingStates: report.lighting.length,
  passed:
    !report.failedVisibility.length &&
    !report.failedHeaders.length &&
    !report.failedPassages.length,
};
writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
console.log(
  JSON.stringify(
    {
      modelPath,
      outputPath,
      summary: report.summary,
      geometry: report.geometry,
      layouts: report.layouts,
      failedVisibility: report.failedVisibility.map((v) => ({
        layout: v.layout,
        portal: v.portal,
        pose: v.pose,
        pointer: v.pointer,
        blocks: v.blocked.length,
        first: v.blocked[0],
      })),
      failedHeaders: report.failedHeaders.map((v) => ({
        layout: v.layout,
        section: v.section,
        distance: v.distance,
        pointer: v.pointer,
        blocks: v.blocked.length,
        first: v.blocked[0],
      })),
      failedPassages: report.failedPassages,
    },
    null,
    2,
  ),
);
// Keep the JSON diagnostic available even when a geometric constraint fails.
assert(
  report.summary.passed,
  'V9 visibility/open-passage regression; inspect JSON report.',
);
