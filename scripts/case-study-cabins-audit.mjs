import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
const root = resolve(process.argv[2] || process.cwd()),
  modelPath = resolve(
    process.argv[3] || join(root, 'components/spacecraft-model.ts'),
  ),
  output = resolve(process.argv[4] || '/tmp/spacecraft-v12-audit.json');
const req = createRequire(pathToFileURL(join(root, 'package.json'))),
  THREE = await import(pathToFileURL(req.resolve('three')).href),
  { createSpacecraft } = await import(pathToFileURL(modelPath).href);
const data = (n, prefix) =>
  Array.from({ length: n }, (_, i) => ({
    title: prefix + ' ' + (i + 1),
    slug: prefix + '-' + i,
    sample: true,
  }));
globalThis.document = {
  // oxlint-disable-next-line typescript/no-deprecated -- Scoped CPU canvas stub.
  createElement() {
    const ctx = new Proxy(
      {},
      {
        get(t, k) {
          if (k in t) return t[k];
          if (k === 'createLinearGradient')
            return () => ({ addColorStop() {} });
          if (k === 'measureText')
            return (text) => ({
              width:
                text.length *
                Number((t.font || '10px').match(/[\d.]+(?=px)/)?.[0] || 10) *
                0.58,
            });
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
class Mesh extends THREE.Mesh {
  constructor(...a) {
    super(...a);
    sources.push(this);
  }
  removeFromParent() {
    if (this.parent && !this.auditParent) this.auditParent = this.parent;
    return super.removeFromParent();
  }
}
const m = createSpacecraft(
  { ...THREE, Mesh },
  {
    projects: data(9, 'Project'),
    caseStudies: data(3, 'Case'),
    labels: {
      projects: 'Projects',
      experience: 'Case studies',
      about: 'About',
      contact: 'Contact',
    },
    sampleLabel: 'Concept',
    vesselName: 'mikaelvincent.dev',
  },
);
delete globalThis.document;
const sections = ['projects', 'experience', 'about', 'contact'],
  report = {
    modelPath,
    mappings: [],
    levels: [],
    routes: [],
    layouts: [],
    visibility: [],
    mounts: [],
    passages: [],
  },
  near = (a, b) => Math.abs(a - b) < 1e-5,
  vec = (a) => new THREE.Vector3(...a);
for (const layout of ['wide', 'compact']) {
  m.setLayout(layout);
  for (const count of [0, 1, 3, 9, 10])
    for (const section of ['projects', 'experience']) {
      const isProject = section === 'projects',
        items = data(count, isProject ? 'Project' : 'Case'),
        set = isProject ? m.setProjects : m.setCaseStudies,
        page = isProject ? m.setProjectPage : m.setCaseStudyPage,
        key = isProject ? 'project' : 'caseStudy';
      set(items);
      for (let p = 0; p < Math.max(1, Math.ceil(count / 9)); p++) {
        const value = page(p);
        for (let i = 0; i < 9; i++) {
          const expected = items[p * 9 + i],
            proxy = m.interactionTargets.find(
              (t) =>
                t.section === section && t.object.userData[key + 'Slot'] === i,
            )?.object;
          assert(proxy);
          assert.equal(proxy.userData[key + 'Slug'], expected?.slug);
          assert.equal(proxy.userData.disabled, !expected);
          if (!isProject) assert.equal(proxy.userData.projectSlug, undefined);
          const hinge = m.group.getObjectByName(
            (isProject ? 'project' : 'case-study') + '-compartment-hinge-' + i,
          );
          assert.equal(hinge.visible, !!expected);
        }
        report.mappings.push({
          layout,
          section,
          count,
          page: p,
          slots: value.slots.map((p) => p?.slug || null),
        });
      }
      const reordered = set(items.toReversed());
      assert.deepEqual(
        reordered.slots,
        items
          .toReversed()
          .slice(reordered.page * 9, reordered.page * 9 + 9)
          .concat(Array(9).fill(null))
          .slice(0, 9),
      );
      set(items.slice(0, 1));
      assert.equal(page(0).slots.filter(Boolean).length, Math.min(count, 1));
    }
}
m.setProjects(data(9, 'Project'));
m.setCaseStudies(data(3, 'Case'));
const expectedAdjacency = {
  experience: ['projects'],
  projects: ['experience', 'about'],
  about: ['projects', 'contact'],
  contact: ['about'],
};
assert.deepEqual(m.group.userData.adjacency, expectedAdjacency);
assert.deepEqual(m.group.userData.circulation, [
  'experience',
  'projects',
  'about',
  'contact',
]);
for (const from of sections)
  for (const to of sections) {
    m.update(0, '', true, {
      activeRoom: from,
      travelling: false,
      transitRoom: null,
      hoveredPortal: to,
      reading: false,
    });
    const route = m.group.userData.activeRoute;
    assert.equal(route.length > 0, from !== to);
    if (route.length) {
      assert.equal(route[0], from);
      assert.equal(route.at(-1), to);
      for (let i = 1; i < route.length; i++)
        assert(expectedAdjacency[route[i - 1]].includes(route[i]));
    }
    report.routes.push({ from, to, route });
  }
const exterior = new Map();
m.group.traverse((o) => {
  if (o.material?.userData.exterior) exterior.set(o.material.uuid, o.material);
});
const snap = () =>
  [...exterior].map(([k, v]) => [
    k,
    ...v.color.toArray(),
    ...v.emissive.toArray(),
    v.emissiveIntensity,
  ]);
m.update(0, '', true, {
  activeRoom: 'home',
  travelling: false,
  transitRoom: null,
  hoveredPortal: null,
});
const outside = snap();
for (const activeRoom of ['home', ...sections])
  for (const hover of ['', ...sections])
    for (const travelling of [false, true]) {
      const transitRoom = travelling ? 'about' : null;
      m.update(0, hover, true, {
        activeRoom,
        travelling,
        transitRoom,
        hoveredPortal: 'contact',
        reading: false,
      });
      const state = structuredClone(m.group.userData.lightingState);
      for (const section of sections) {
        const expected =
          !travelling && activeRoom === section
            ? 1
            : (travelling ? transitRoom === section : hover === section)
              ? 0.5
              : 0.1;
        assert(near(state[section].level, expected));
        assert(near(state[section].targetLevel, expected));
        if (travelling) assert(state[section].level < 1);
      }
      assert.deepEqual(snap(), outside);
      m.group.traverse((o) => {
        if (o.material?.userData.surfaceOnly)
          assert(
            o.material.emissive.r +
              o.material.emissive.g +
              o.material.emissive.b ===
              0,
          );
      });
      report.levels.push({
        activeRoom,
        hover,
        travelling,
        transitRoom,
        levels: Object.fromEntries(sections.map((s) => [s, state[s].level])),
      });
    }
// Interpolation must actually pass through a medium value and expose its target.
m.update(0, '', true, { activeRoom: 'home', travelling: false });
m.update(1, 'projects', false, { activeRoom: 'home', delta: 1 / 60 });
const mid = m.group.userData.lightingState.projects;
assert(mid.level > 0.1 && mid.level < 0.5 && mid.targetLevel === 0.5);
report.interpolation = { level: mid.level, target: mid.targetLevel };
assert.equal(m.group.userData.branding.length, 1);
assert(m.group.userData.branding[0].position[1] > 3);
assert(m.group.userData.branding[0].size[1] > 0.35);
assert.equal(m.group.userData.branding[0].text, 'mikaelvincent.dev');
const {
  CAMERA_RANGES,
  cursorViewSamples,
  fitPerspectiveDistance,
  solveApertureFraming,
} = await import(pathToFileURL(join(root, 'lib/scene-controls.ts')).href);
function targets() {
  const all = [];
  m.group.traverseVisible((o) => {
    if (
      o.isMesh &&
      o.material.visible !== false &&
      !o.userData.isInteractionProxy &&
      !['identification-label', 'portal-destination-label'].includes(
        o.material.name,
      )
    )
      all.push(o);
  });
  return all;
}
const sourceMatrix = (o) =>
  o.auditParent
    ? o.auditParent.matrixWorld.clone().multiply(o.matrix)
    : o.matrixWorld.clone();
const bounds = (o) => {
  o.geometry.computeBoundingBox();
  return o.geometry.boundingBox.clone().applyMatrix4(sourceMatrix(o));
};
for (const [layout, vp] of [
  ['wide', [1440, 1000]],
  ['compact', [390, 844]],
]) {
  m.setLayout(layout);
  m.update(0, '', true, {
    activeRoom: 'home',
    travelling: false,
    transitRoom: null,
    hoveredPortal: null,
    reading: false,
  });
  const a = m.group.userData.roomAnchors;
  assert(a.projects[0] < 0 && a.experience[0] > 0);
  report.layouts.push({
    layout,
    viewport: vp,
    anchors: structuredClone(a),
    branding: structuredClone(m.group.userData.branding),
  });
  for (const p of m.group.userData.portals) {
    assert(['left', 'right'].includes(p.edge));
    assert(near(p.labelPosition[2], p.position[2]));
    assert(near(p.labelRotation[0], 0) && near(p.labelRotation[2], 0));
    assert.equal(
      p.via,
      (p.from === 'projects' && p.to === 'about') ||
        (p.from === 'about' && p.to === 'projects')
        ? 'walkway'
        : null,
    );
    const caption = sources.find(
      (o) =>
        o.name === 'portal-destination-ink' &&
        o.auditParent?.parent?.userData.portalId === p.id,
    );
    assert(caption?.material.isMeshLambertMaterial);
    assert.equal(caption.material.envMap, null);
    const backing = sources.find(
        (o) =>
          o.name === 'above-door-label-backing' &&
          o.auditParent?.parent?.userData.portalId === p.id,
      ),
      wall = sources.find(
        (o) =>
          o.name === 'open-side-pressure-bulkhead-interior' &&
          o.userData.section === p.from &&
          Math.sign(
            bounds(o).getCenter(new THREE.Vector3()).x - a[p.from][0],
          ) === (p.edge === 'right' ? 1 : -1),
      );
    const overlap = bounds(backing)
      .intersect(bounds(wall))
      .getSize(new THREE.Vector3())
      .toArray();
    assert(overlap.every((v) => v > 0));
    report.mounts.push({ layout, portal: p.id, overlap });
    const target = [a[p.from][0], a[p.from][1] + 0.17, 0.16],
      views = cursorViewSamples(
        { target, direction: [0, 0, 1] },
        4,
        CAMERA_RANGES.room,
      ),
      safe = {
        left: -1 + (layout === 'wide' ? 48 : 28) / vp[0],
        right: 1 - (layout === 'wide' ? 48 : 28) / vp[0],
        top: 1 - 48 / vp[1],
        bottom: -1 + 160 / vp[1],
      },
      ap = m.group.userData.innerApertureBounds[p.from],
      required = m.group.userData.requiredFramingPoints[p.from].map(
        (p) => p.position,
      ),
      sol = solveApertureFraming({
        aperture: {
          center: ap.center,
          right: [1, 0, 0],
          up: [0, 1, 0],
          width: ap.size[0],
          height: ap.size[1],
        },
        views,
        requiredPoints: required,
        fovDegrees: 38,
        aspect: vp[0] / vp[1],
        overscan: 1.015,
        portalBounds: safe,
      }),
      distance = sol.feasible
        ? sol.minimumDistance +
          (sol.maximumDistance - sol.minimumDistance) * 0.16
        : Math.max(
            ...views.map((v) =>
              fitPerspectiveDistance(required, v, 38, vp[0] / vp[1], safe),
            ),
          ) + 0.05;
    for (const py of [-1, 0, 1])
      for (const px of [-1, 0, 1]) {
        const camera = vec(target).addScaledVector(
            new THREE.Vector3(0, 0, 1).applyEuler(
              new THREE.Euler(py * 0.025, px * 0.045, 0),
            ),
            distance,
          ),
          blocked = [];
        for (const sx of [-0.94, 0, 0.94])
          for (const sy of [-0.6, 0, 0.6]) {
            const point = vec(p.labelPosition)
                .addScaledVector(vec(p.labelRight), (sx * p.labelSize[0]) / 2)
                .addScaledVector(vec(p.labelUp), (sy * p.labelSize[1]) / 2),
              ray = point.clone().sub(camera),
              len = ray.length();
            ray.normalize();
            const hit = new THREE.Raycaster(
              camera,
              ray,
              0.001,
              len - 0.003,
            ).intersectObjects(targets(), false)[0];
            if (hit)
              blocked.push({
                sx,
                sy,
                object: hit.object.name,
                parts: hit.object.userData.parts,
              });
          }
        report.visibility.push({
          layout,
          viewport: vp,
          portal: p.id,
          distance,
          pointer: [px, py],
          blocked,
        });
      }
    const sign = p.edge === 'right' ? 1 : -1,
      scale = layout === 'wide' ? 1.4 : 1,
      fromX = a[p.from][0] + sign * (1.5 * scale - 0.15),
      toX = p.via
        ? m.group.userData.walkwayAnchor[0] + 0.75 * scale - 0.15
        : a[p.to][0] - sign * (1.5 * scale - 0.15),
      blocked = [];
    for (const y of [-0.6, 0, 0.6])
      for (const z of [-0.7, 0, 0.7]) {
        const from = new THREE.Vector3(fromX, a[p.from][1] - 0.06 + y, z),
          to = new THREE.Vector3(toX, from.y, z),
          d = to.clone().sub(from),
          len = d.length();
        d.normalize();
        const hit = new THREE.Raycaster(
          from,
          d,
          0.001,
          len - 0.001,
        ).intersectObjects(targets(), false)[0];
        if (hit) blocked.push(hit.object.name);
      }
    assert(!blocked.length);
    report.passages.push({ layout, portal: p.id, rays: 9, blocked });
  }
}
let invalidNormals = 0,
  vertices = 0,
  calls = 0,
  triangles = 0;
m.group.traverse((o) => {
  if (!o.isMesh) return;
  const p = o.geometry.attributes.position,
    n = o.geometry.attributes.normal;
  vertices += p.count;
  for (let i = 0; i < p.count; i++) {
    assert(Number.isFinite(p.getX(i) + p.getY(i) + p.getZ(i)));
    if (n && Math.abs(Math.hypot(n.getX(i), n.getY(i), n.getZ(i)) - 1) > 0.003)
      invalidNormals++;
  }
});
assert(!invalidNormals);
m.group.traverseVisible((o) => {
  if (o.isMesh && o.material.visible !== false) {
    calls++;
    triangles +=
      ((o.geometry.index
        ? o.geometry.index.count
        : o.geometry.attributes.position.count) /
        3) *
      (o.isInstancedMesh ? o.count : 1);
  }
});
report.failedVisibility = report.visibility.filter((v) => v.blocked.length);
report.summary = {
  mappingCases: report.mappings.length,
  slotMappings: report.mappings.length * 9,
  lightingCases: report.levels.length,
  routePairs: report.routes.length,
  portalViews: report.visibility.length,
  visibilityFailures: report.failedVisibility.length,
  physicalPortalMounts: report.mounts.length,
  passageRays: report.passages.length * 9,
  invalidNormals,
  vertices,
  calls,
  triangles,
  passedCore: true,
  passedVisibility: report.failedVisibility.length === 0,
};
writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(
  JSON.stringify(
    {
      output,
      summary: report.summary,
      visibilityFailures: report.failedVisibility.map((v) => ({
        portal: v.portal,
        layout: v.layout,
        distance: v.distance,
        pointer: v.pointer,
        first: v.blocked[0],
      })),
    },
    null,
    2,
  ),
);
