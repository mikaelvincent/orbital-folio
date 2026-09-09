import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const root = resolve(process.argv[2] || process.cwd());
// Usage: node spacecraft-model-v8-audit.mjs <repo> [model.ts] [report.json]
// Defaults to the current checkout model; Node 22.18+ is required for TypeScript.
const modelPath = resolve(
  process.argv[3] || join(root, 'components/spacecraft-model.ts'),
);
const outputPath = resolve(
  process.argv[4] || '/tmp/spacecraft-model-v8-audit.json',
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
globalThis.document = {
  // Canvas factory stub; the source uses the standard DOM createElement API.
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
for (const layout of ['compact', 'wide']) {
  const meta = m.setLayout(layout),
    scale = layout === 'wide' ? 1.4 : 1;
  assert.equal(meta.innerApertureBounds.projects.size[0], 2.44 * scale);
  assert(
    m.group.userData.roomAnchors.projects[0] <
      m.group.userData.roomAnchors.experience[0],
  );
  assert(
    m.group.userData.roomAnchors.about[0] <
      m.group.userData.roomAnchors.contact[0],
  );
  assert(
    m.group.userData.roomAnchors.projects[1] >
      m.group.userData.roomAnchors.about[1],
  );
  assert(m.portalTargets.every((p, i) => p.object === targetObjects[i]));
  assert(
    Object.entries(readers).every(
      ([key, value]) => m.readerSurfaces[key] === value,
    ),
  );
  for (const pair of [
    ['projects', 'experience'],
    ['about', 'contact'],
  ]) {
    const walls = pair.map((section) =>
      sources.find(
        (o) =>
          o.name === 'inter-room-pressure-bulkhead' &&
          o.userData.section === section,
      ),
    );
    const a = sourceBounds(walls[0]),
      b = sourceBounds(walls[1]),
      gap = b.min.x - a.max.x;
    assert(
      gap >= 0.01999,
      'opposing wall skins must not overlap after wide scaling',
    );
    report.walls.push({ layout, pair, gap });
  }
  report.layouts[layout] = {
    anchors: structuredClone(meta.roomAnchors),
    aperture: [...meta.innerApertureBounds.projects.size],
    bounds: structuredClone(meta.overviewBounds),
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
    const target = m.portalTargets.find((t) => t.id === portal.id);
    assert.equal(target.object.parent.userData.section, portal.from);
    assert.equal(target.object.userData.portalDestination, portal.to);
    const actualLabel = m.targets.find(
      (t) =>
        t.object.material.name === 'portal-destination-label' &&
        (() => {
          let a = t.object;
          while (a) {
            if (a.userData.portalId === portal.id) return true;
            a = a.parent;
          }
          return false;
        })(),
    ).object;
    const labelCenter = new THREE.Box3()
      .setFromObject(actualLabel)
      .getCenter(new THREE.Vector3())
      .toArray();
    assert(
      labelCenter.every((v, i) => near(v, portal.labelPosition[i])),
      'caption batch root must preserve movable ink',
    );
    const related = sources.filter((o) => {
      let a = o.auditParent || o.parent;
      while (a) {
        if (a.userData.portalId === portal.id) return true;
        a = a.parent;
      }
      return false;
    });
    const saddle = related.find(
      (o) => o.name === 'portal-nameplate-attached-saddle',
    );
    const supportCandidates = sources.filter(
      (o) =>
        o.userData.section === portal.from &&
        [
          'upper-room-enamel-header',
          'coherent-cabin-deck',
          'chamfered-hatch-vestibule',
          'sealed-deck-transfer-recess',
        ].includes(o.name),
    );
    const sb = sourceBounds(saddle),
      support = supportCandidates
        .map((o) => {
          const b = sb.clone().intersect(sourceBounds(o));
          return {
            name: o.name,
            overlap: b.getSize(new THREE.Vector3()).toArray(),
          };
        })
        .filter((v) => v.overlap.every((n) => n > 1e-5));
    assert(
      support.length,
      `${layout}/${portal.id} caption saddle must meet structure`,
    );
    report.attachments.push({
      layout,
      portal: portal.id,
      saddleBounds: { min: sb.min.toArray(), max: sb.max.toArray() },
      intersections: support,
    });
    const room = m.group.userData.roomAnchors[portal.from];
    const visibleTargets = m.targets
      .map((t) => t.object)
      .filter(
        (o) =>
          hierarchyVisible(o) &&
          !['identification-label', 'portal-destination-label'].includes(
            o.material.name,
          ),
      );
    for (const [view, offset] of [
      ['neutral', [-0.14, 0.26, 5.65]],
      ['leftHigh', [-0.45, 0.5, 5.65]],
      ['rightLow', [0.45, -0.1, 5.65]],
    ]) {
      const camera = new THREE.Vector3(
          room[0] + offset[0],
          room[1] + offset[1],
          offset[2],
        ),
        blocked = [];
      for (const sx of [-0.8, 0, 0.8])
        for (const sy of [-0.5, 0, 0.5]) {
          const point = new THREE.Vector3(
            portal.labelPosition[0] + (sx * portal.labelSize[0]) / 2,
            portal.labelPosition[1] + (sy * portal.labelSize[1]) / 2,
            portal.labelPosition[2],
          );
          const direction = point.clone().sub(camera),
            distance = direction.length();
          direction.normalize();
          const hits = new THREE.Raycaster(
            camera,
            direction,
            0.001,
            distance - 0.005,
          ).intersectObjects(visibleTargets, false);
          if (hits.length)
            blocked.push({
              sx,
              sy,
              blocker: hits[0].object.name,
              point: hits[0].point.toArray(),
            });
        }
      const direction = new THREE.Vector3(...portal.labelPosition).sub(camera);
      const distance = direction.length();
      direction.normalize();
      const pickHits = new THREE.Raycaster(
        camera,
        direction,
        0.001,
        distance + 0.8,
      ).intersectObject(target.object, false);
      const platePickMisses = [];
      for (const sx of [-0.9, 0, 0.9])
        for (const sy of [-0.9, 0, 0.9]) {
          const point = new THREE.Vector3(
            portal.labelPosition[0] + (sx * portal.plateSize[0]) / 2,
            portal.labelPosition[1] + (sy * portal.plateSize[1]) / 2,
            portal.labelPosition[2],
          );
          const d = point.clone().sub(camera),
            len = d.length();
          d.normalize();
          if (
            !new THREE.Raycaster(camera, d, 0.001, len + 0.1).intersectObject(
              target.object,
              false,
            ).length
          )
            platePickMisses.push({ sx, sy });
        }
      assert(
        !platePickMisses.length,
        'compound portal pick must cover the whole plate',
      );
      report.visibility.push({
        layout,
        portal: portal.id,
        view,
        blocked,
        pickAtLabel: pickHits.length > 0,
        platePickMisses,
      });
    }
  }
  // Header ink remains attached and visible; use near-full plane width so long
  // database labels receive the same clearance check as the short fixtures.
  for (const section of Object.keys(readers)) {
    const room = m.group.userData.roomAnchors[section],
      anchor = m.group.userData.headerAnchors[section],
      plaque = m.group.userData.labelPlaques.find(
        (p) => p.section === section && p.role === 'header',
      );
    const candidates = m.targets
      .map((t) => t.object)
      .filter(
        (o) =>
          hierarchyVisible(o) &&
          !['identification-label', 'portal-destination-label'].includes(
            o.material.name,
          ),
      );
    for (const [view, offset] of [
      ['neutral', [-0.14, 0.26, 5.65]],
      ['leftHigh', [-0.45, 0.5, 5.65]],
      ['rightLow', [0.45, -0.1, 5.65]],
    ]) {
      const camera = new THREE.Vector3(
          room[0] + offset[0],
          room[1] + offset[1],
          offset[2],
        ),
        blocked = [];
      for (const sx of [-0.96, -0.64, -0.32, 0, 0.32, 0.64, 0.96])
        for (const sy of [-0.5, 0, 0.5]) {
          const point = new THREE.Vector3(
            anchor[0] + (sx * plaque.size[0]) / 2,
            anchor[1] + (sy * plaque.size[1]) / 2,
            anchor[2],
          );
          const direction = point.clone().sub(camera),
            distance = direction.length();
          direction.normalize();
          const hits = new THREE.Raycaster(
            camera,
            direction,
            0.001,
            distance - 0.005,
          ).intersectObjects(candidates, false);
          if (hits.length)
            blocked.push({
              sx,
              sy,
              blocker: hits[0].object.name,
              point: hits[0].point.toArray(),
            });
        }
      report.headers.push({ layout, section, view, blocked });
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
// Real state changes hide only exterior ink; readers and permanent physical
// collars remain attached while switching section, portrait preference or layout.
for (const layout of ['compact', 'wide']) {
  m.setLayout(layout);
  for (const portrait of [false, true]) {
    m.update(2, '', true, {
      activeRoom: 'home',
      reading: false,
      labelPortrait: portrait,
      hoveredPortal: null,
    });
    assert.equal(
      m.group.userData.labelPlaques.filter((p) => p.visible).length,
      8,
    );
    for (const section of Object.keys(readers)) {
      m.update(2, '', true, {
        activeRoom: section,
        reading: true,
        labelPortrait: portrait,
        selectedProject: section === 'projects' ? 'audit-1' : null,
      });
      const visible = m.group.userData.labelPlaques.filter((p) => p.visible);
      assert.equal(visible.length, 4);
      assert(visible.every((p) => p.role === 'header'));
      const p = readers[section]
        .getWorldPosition(new THREE.Vector3())
        .toArray();
      assert(
        p.every((v, i) => near(v, m.group.userData.readerAnchors[section][i])),
      );
      report.labels.push({
        layout,
        portrait,
        section,
        visibleHeaders: 4,
        readerAnchorStable: true,
      });
    }
    m.update(2, '', true, {
      activeRoom: 'home',
      reading: false,
      labelPortrait: portrait,
      selectedProject: null,
    });
    assert.equal(
      m.group.userData.labelPlaques.filter((p) => p.visible).length,
      8,
    );
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
      'clipboard-dock-cover',
    ].includes(n),
  ),
);
assert.equal(
  parts.filter((n) => n === 'deep-empty-compartment-liner').length,
  9,
);
assert.equal(m.portalTargets.length, 8);
assert.equal(
  parts.filter(
    (n) =>
      n === 'inter-room-pressure-bulkhead' ||
      n.endsWith('-sealed-outboard-wall'),
  ).length,
  8,
);
assert.equal(parts.filter((n) => n === 'closed-pressure-hatch-leaf').length, 4);
assert.equal(parts.filter((n) => n === 'closed-deck-transfer-hatch').length, 4);
for (const t of m.targets) {
  let p = t.object.parent,
    moving = false;
  while (p) {
    if (p.userData.animated) moving = true;
    p = p.parent;
  }
  if (moving)
    assert(
      !t.object.castShadow,
      'animated doors/readers must not leave stale static shadows',
    );
}
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
  emptyRecesses: 9,
  portals: 8,
  sealedSideWalls: 8,
  closedHorizontalHatches: 4,
  closedDeckHatches: 4,
};
report.failedVisibility = report.visibility.filter(
  (v) => v.blocked.length || !v.pickAtLabel,
);
report.failedHeaders = report.headers.filter((v) => v.blocked.length);
report.summary = {
  mappingCounts: report.mapping.map((m) => m.count),
  projectPages: report.mapping.reduce((n, m) => n + m.pages.length, 0),
  slotMappings: report.mapping.reduce((n, m) => n + m.pages.length * 9, 0),
  mutations: report.mutations.length,
  readerPositions: Object.keys(report.readers).length,
  routeCases: report.routes.length,
  portalViews: report.visibility.length,
  portalInkRays: report.visibility.length * 9,
  wholePlatePickRays: report.visibility.length * 9,
  headerViews: report.headers.length,
  headerInkRays: report.headers.length * 21,
  attachedSaddles: report.attachments.length,
  labelStateTransitions: report.labels.length,
  invalidNormals,
  nonfinite,
  passed: !report.failedVisibility.length && !report.failedHeaders.length,
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
      failedHeaders: report.failedHeaders.map((v) => ({
        layout: v.layout,
        section: v.section,
        view: v.view,
        blocks: v.blocked.length,
        first: v.blocked[0],
      })),
      failedVisibility: report.failedVisibility.map((v) => ({
        layout: v.layout,
        portal: v.portal,
        view: v.view,
        blocks: v.blocked.length,
        pick: v.pickAtLabel,
        first: v.blocked[0],
      })),
    },
    null,
    2,
  ),
);

assert(
  report.summary.passed,
  'Portal/header visibility regression; inspect the JSON report.',
);
