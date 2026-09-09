import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const root = resolve(process.argv[2] || process.cwd());
const phoneWidth = Number(process.argv[5] || 390);
assert.ok([320, 390].includes(phoneWidth), 'Phone width must be 320 or 390');
const phoneReferenceDistance =
  phoneWidth === 320 ? 12.464306 : 9.707012534740858;
// Usage: node spacecraft-render-audit.mjs <repo> [model.ts] [report.json] [phone-width: 320|390]
// Defaults to the current checkout model; Node 22.18+ is required for TypeScript.
const modelPath = resolve(
  process.argv[3] || join(root, 'components/spacecraft-model.ts'),
);
const outputPath = resolve(
  process.argv[4] || '/tmp/spacecraft-render-audit.json',
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
  phoneViewport: [phoneWidth, 844],
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
globalThis.document = {
  // oxlint-disable-next-line typescript/no-deprecated -- A scoped CPU canvas stub, not a browser DOM API call.
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
    vesselName: 'portfolio.example',
  },
);
delete globalThis.document;
const sections = ['projects', 'experience', 'about', 'contact'];
const sourceMatrix = (o) =>
  o.auditParent
    ? o.auditParent.matrixWorld.clone().multiply(o.matrix)
    : o.matrixWorld.clone();
const sourceBounds = (o) => {
  o.geometry.computeBoundingBox();
  return o.geometry.boundingBox.clone().applyMatrix4(sourceMatrix(o));
};
const {
  CAMERA_RANGES,
  cursorViewSamples,
  fitPerspectiveDistance,
  solveApertureFraming,
} = await import(pathToFileURL(join(root, 'lib/scene-controls.ts')).href);
const vec = (a) => new THREE.Vector3(...a);
const pointAt = (p, sx, sy) =>
  vec(p.labelPosition)
    .addScaledVector(vec(p.labelRight), (sx * p.labelSize[0]) / 2)
    .addScaledVector(vec(p.labelUp), (sy * p.labelSize[1]) / 2);
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
  return new THREE.Raycaster(camera, d, 0.001, n - 0.003).intersectObjects(
    targets,
    false,
  );
}
report.diagnostics = [];
report.docking = [];
report.branding = [];
for (const layout of ['compact', 'wide']) {
  const meta = m.setLayout(layout),
    scale = layout === 'wide' ? 1.4 : 1;
  assert(
    meta.roomAnchors.projects[0] > 0 &&
      meta.roomAnchors.experience[0] < 0 &&
      meta.roomAnchors.about[0] < 0 &&
      meta.roomAnchors.contact[0] > 0,
  );
  assert(
    meta.roomAnchors.projects[1] > 0 &&
      meta.roomAnchors.experience[1] > 0 &&
      meta.roomAnchors.about[1] < 0 &&
      meta.roomAnchors.contact[1] < 0,
  );
  report.layouts[layout] = {
    anchors: structuredClone(meta.roomAnchors),
    aperture: structuredClone(meta.innerApertureBounds),
    bounds: structuredClone(meta.overviewBounds),
    walkway: structuredClone(m.group.userData.walkwayBounds),
    drawCalls: countDraws(m),
  };
  for (const section of sections) {
    const reader = m.readerSurfaces[section];
    m.update(0, '', true, {
      activeRoom: section,
      reading: true,
      selectedProject: section === 'projects' ? 'audit-1' : null,
      hoveredPortal: null,
    });
    assert(
      reader
        .getWorldPosition(new THREE.Vector3())
        .toArray()
        .every((v, i) => near(v, m.group.userData.readerAnchors[section][i])),
    );
    report.readers[layout + '/' + section] =
      m.group.userData.readerAnchors[section];
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
    assert(
      near(portal.labelRotation[0], 0) &&
        near(portal.labelRotation[2], 0) &&
        near(Math.abs(portal.labelRotation[1]), Math.PI / 2),
    );
    assert(near(portal.labelNormal[0], portal.edge === 'left' ? 1 : -1));
    assert.equal(
      portal.via,
      (portal.from === 'experience' && portal.to === 'about') ||
        (portal.from === 'about' && portal.to === 'experience')
        ? 'walkway'
        : null,
    );
    const target = m.portalTargets.find((t) => t.id === portal.id);
    assert.equal(target.object.parent.userData.section, portal.from);
    assert.equal(target.object.userData.portalDestination, portal.to);
    const ink = sources.find(
      (o) =>
        o.name === 'portal-destination-ink' &&
        o.auditParent?.parent?.userData.portalId === portal.id,
    );
    if (ink)
      assert(
        sourceBounds(ink)
          .getCenter(new THREE.Vector3())
          .toArray()
          .every((v, i) => near(v, portal.labelPosition[i])),
      );
    const room = m.group.userData.roomAnchors[portal.from],
      targetPoint = [room[0], room[1] + 0.17, 0.16],
      cameraViews = cursorViewSamples(
        {
          target: targetPoint,
          direction: [0, 0, 1],
        },
        4,
        CAMERA_RANGES.room,
      );
    const required = m.group.userData.requiredFramingPoints[portal.from].map(
        (p) => p.position,
      ),
      aperture = m.group.userData.innerApertureBounds[portal.from],
      viewport = layout === 'wide' ? [1440, 1000] : [phoneWidth, 844];
    const safe =
      layout === 'wide'
        ? {
            left: -1 + 48 / 1440,
            right: 1 - 48 / 1440,
            top: 1 - 48 / 1000,
            bottom: -1 + 160 / 1000,
          }
        : {
            left: -1 + 28 / phoneWidth,
            right: 1 - 28 / phoneWidth,
            top: 1 - 48 / 844,
            bottom: -1 + 160 / 844,
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
            ['current-fit', fitted],
            ['reference-phone', phoneReferenceDistance],
          ]
        : [
            ['current-fit', fitted],
            ['historical-close', 3.5204],
          ];
    for (const [pose, distance] of distances)
      for (const py of [-1, 0, 1])
        for (const px of [-1, 0, 1]) {
          const camera = new THREE.PerspectiveCamera(
              38,
              viewport[0] / viewport[1],
              0.01,
              100,
            ),
            targetv = vec(targetPoint);
          camera.position
            .copy(targetv)
            .addScaledVector(
              new THREE.Vector3(0, 0, 1).applyEuler(
                new THREE.Euler(py * 0.025, px * 0.045, 0),
              ),
              distance,
            );
          camera.lookAt(targetv);
          camera.updateMatrixWorld();
          const blocked = [],
            pickMisses = [],
            projected = [],
            targets = visibleTargets();
          for (const sx of [-0.94, -0.47, 0, 0.47, 0.94])
            for (const sy of [-0.6, 0, 0.6]) {
              const point = pointAt(portal, sx, sy),
                hits = blockers(camera.position, point, targets);
              if (hits.length)
                blocked.push({
                  sx,
                  sy,
                  object: hits[0].object.name,
                  parts: hits[0].object.userData.parts,
                  point: hits[0].point.toArray(),
                });
              const p = point.clone().project(camera);
              projected.push([
                ((p.x + 1) * viewport[0]) / 2,
                ((1 - p.y) * viewport[1]) / 2,
              ]);
            }
          for (const sx of [-0.9, 0, 0.9])
            for (const sy of [-0.9, 0, 0.9]) {
              const point = pointAt(
                  { ...portal, labelSize: portal.plateSize },
                  sx,
                  sy,
                ),
                d = point.clone().sub(camera.position),
                len = d.length();
              d.normalize();
              if (
                !new THREE.Raycaster(
                  camera.position,
                  d,
                  0.001,
                  len + 0.1,
                ).intersectObject(target.object, false).length
              )
                pickMisses.push({ sx, sy });
            }
          const angleCos = vec(portal.labelNormal).dot(
            camera.position.clone().sub(vec(portal.labelPosition)).normalize(),
          );
          const width =
              Math.max(...projected.map((p) => p[0])) -
              Math.min(...projected.map((p) => p[0])),
            height =
              Math.max(...projected.map((p) => p[1])) -
              Math.min(...projected.map((p) => p[1]));
          report.visibility.push({
            layout,
            portal: portal.id,
            pose,
            distance,
            pointer: [px, py],
            camera: camera.position.toArray(),
            angleCos,
            pixels: [width, height],
            blocked,
            pickMisses,
          });
        }
    const sign = portal.edge === 'right' ? 1 : -1,
      fromX = room[0] + sign * (1.5 * scale - 0.15),
      nextX = portal.via
        ? m.group.userData.walkwayAnchor[0] + 0.75 * scale - 0.15
        : m.group.userData.roomAnchors[portal.to][0] -
          sign * (1.5 * scale - 0.15),
      blocked = [];
    for (const yy of [-0.66, -0.33, 0, 0.33, 0.66])
      for (const zz of [-0.8, -0.4, 0, 0.4, 0.8]) {
        const a = new THREE.Vector3(fromX, room[1] - 0.06 + yy, zz),
          b = new THREE.Vector3(nextX, room[1] - 0.06 + yy, zz),
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
    report.passages.push({ layout, portal: portal.id, blocked });
  }
  const hatch = m.group.getObjectByName('walkway-finished-inner-docking-hatch'),
    hatchcenter = hatch.getWorldPosition(new THREE.Vector3()),
    leaks = [];
  for (const y of [-0.65, -0.325, 0, 0.325, 0.65])
    for (const z of [-0.65, -0.325, 0, 0.325, 0.65]) {
      const origin = hatchcenter.clone().add(new THREE.Vector3(0.5, y, z));
      const hits = new THREE.Raycaster(
        origin,
        new THREE.Vector3(-1, 0, 0),
        0.001,
        0.8,
      ).intersectObject(hatch, true);
      if (!hits.length) leaks.push([y, z]);
    }
  report.docking.push({
    layout,
    center: hatchcenter.toArray(),
    rays: 25,
    leaks,
  });
  assert.equal(m.group.userData.branding.length, 2);
  assert.equal(
    m.group.userData.branding[0].position[1],
    -m.group.userData.branding[1].position[1],
  );
  assert(
    m.group.userData.branding.every((p) => p.text === 'portfolio.example'),
  );
  report.branding.push({ layout, plates: m.group.userData.branding });
}
for (const from of sections)
  for (const to of sections) {
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
assert.deepEqual(m.group.userData.adjacency, {
  projects: ['experience'],
  experience: ['projects', 'about'],
  about: ['experience', 'contact'],
  contact: ['about'],
});
const extMaterials = new Map();
m.group.traverse((o) => {
  if (o.material?.userData.exterior)
    extMaterials.set(o.material.uuid, o.material);
});
const snapshot = () =>
  Object.fromEntries(
    [...extMaterials].map(([key, v]) => [
      key,
      [...v.color.toArray(), ...v.emissive.toArray(), v.emissiveIntensity],
    ]),
  );
m.update(2, '', true, {
  activeRoom: 'home',
  reading: false,
  hoveredPortal: null,
});
const outside = snapshot();
for (const section of ['home', ...sections])
  for (const hover of ['', ...sections]) {
    m.update(2, hover, true, {
      activeRoom: section,
      reading: false,
      hoveredPortal: hover || null,
    });
    const state = structuredClone(m.group.userData.lightingState);
    report.lighting.push({ section, hover, state });
    assert.deepEqual(
      snapshot(),
      outside,
      'all exterior material colors/emissions must stay invariant',
    );
    assert(state.walkway.interiorColor === 1);
    assert(state.walkway.pointIntensities.every((v) => near(v, 0.55)));
    for (const room of sections) {
      const s = state[room],
        lit = room === section || room === hover;
      assert(near(s.interiorColor, lit ? 1 : 0.035));
      assert(s.pointIntensities.every((v) => near(v, 0.35)));
      assert(s.exteriorColor === 1);
    }
  }
// Render-only diagnostics: headers, flush mounting, and optional drag extremes.
report.dragDiagnostics = [];
report.headerVisibility = [];
report.mounting = [];
for (const layout of ['compact', 'wide']) {
  m.setLayout(layout);
  m.update(0, '', true, {
    activeRoom: 'home',
    reading: false,
    selectedProject: null,
    hoveredPortal: null,
  });
  const distance = layout === 'wide' ? 3.9963 : phoneReferenceDistance;
  const renderTargets = visibleTargets();
  for (const section of sections) {
    const room = m.group.userData.roomAnchors[section],
      center = m.group.userData.headerAnchors[section];
    for (const py of [-1, 0, 1])
      for (const px of [-1, 0, 1]) {
        const target = new THREE.Vector3(room[0], room[1] + 0.17, 0.16),
          camera = target
            .clone()
            .addScaledVector(
              new THREE.Vector3(0, 0, 1).applyEuler(
                new THREE.Euler(py * 0.025, px * 0.045, 0),
              ),
              distance,
            ),
          blocked = [];
        for (const sx of [-0.94, -0.47, 0, 0.47, 0.94])
          for (const sy of [-0.6, 0, 0.6]) {
            const p = vec(center).add(
                new THREE.Vector3((sx * 1.26) / 2, (sy * 0.18) / 2, 0),
              ),
              hits = blockers(camera, p, renderTargets);
            if (hits.length)
              blocked.push({ sx, sy, object: hits[0].object.name });
          }
        report.headerVisibility.push({
          layout,
          section,
          pointer: [px, py],
          blocked,
        });
      }
  }
  for (const portal of m.group.userData.portals) {
    const backing = sources.find(
      (o) =>
        o.name === 'above-door-label-backing' &&
        o.auditParent?.parent?.userData.portalId === portal.id,
    );
    assert(backing, 'each plaque must retain source attachment metadata');
    const bb = sourceBounds(backing),
      wall = sources.find(
        (o) =>
          o.name === 'open-side-pressure-bulkhead-interior' &&
          o.userData.section === portal.from &&
          Math.sign(
            sourceBounds(o).getCenter(new THREE.Vector3()).x -
              m.group.userData.roomAnchors[portal.from][0],
          ) === (portal.edge === 'right' ? 1 : -1),
      );
    assert(wall);
    const overlap = bb
      .clone()
      .intersect(sourceBounds(wall))
      .getSize(new THREE.Vector3())
      .toArray();
    assert(
      overlap.every((v) => v > 0),
      'plaque backing must intersect real side wall',
    );
    const frame = sources.find(
      (o) =>
        o.name === 'flush-open-pressure-hatch-frame' &&
        o.auditParent?.parent?.userData.portalId === portal.id,
    );
    assert(frame);
    const frameBounds = sourceBounds(frame),
      verticalGap = bb.min.y - frameBounds.max.y;
    assert(
      verticalGap >= -0.004 && verticalGap < 0.05,
      'caption is immediately above door',
    );
    report.mounting.push({ layout, portal: portal.id, overlap, verticalGap });
    const room = m.group.userData.roomAnchors[portal.from],
      target = new THREE.Vector3(room[0], room[1] + 0.17, 0.16);
    for (const py of [-1, 1])
      for (const px of [-1, 1]) {
        const camera = target
            .clone()
            .addScaledVector(
              new THREE.Vector3(0, 0, 1).applyEuler(
                new THREE.Euler(py * 0.12, px * 0.22, 0),
              ),
              distance,
            ),
          blocked = [];
        for (const sx of [-0.94, 0, 0.94]) {
          const hits = blockers(camera, pointAt(portal, sx, 0), renderTargets);
          if (hits.length) blocked.push({ sx, object: hits[0].object.name });
        }
        report.dragDiagnostics.push({
          layout,
          portal: portal.id,
          drag: [px, py],
          blocked,
        });
      }
  }
  const hatch = m.group.getObjectByName('walkway-finished-inner-docking-hatch'),
    center = hatch.getWorldPosition(new THREE.Vector3()),
    leaks = [];
  let rays = 0;
  // Sample the entire original rounded opening, including its curved perimeter.
  for (let iy = -10; iy <= 10; iy++)
    for (let iz = -10; iz <= 10; iz++) {
      const y = iy * 0.094,
        z = iz * 0.09,
        dx = Math.max(0, Math.abs(z) - (0.91 - 0.79)),
        dy = Math.max(0, Math.abs(y) - (0.95 - 0.79));
      if (dx * dx + dy * dy > 0.79 * 0.79) continue;
      rays++;
      const origin = new THREE.Vector3(center.x + 0.5, y, z),
        hits = new THREE.Raycaster(
          origin,
          new THREE.Vector3(-1, 0, 0),
          0.001,
          0.8,
        ).intersectObject(hatch, true);
      if (!hits.length) leaks.push([y, z]);
    }
  report.docking.push({ layout, wholeOpening: true, rays, leaks });
  for (const band of sources.filter(
    (o) => o.name === 'vessel-nameplate-integrated-hull-band',
  )) {
    const b = sourceBounds(band),
      sign = Math.sign(b.getCenter(new THREE.Vector3()).y),
      supports = sources.filter(
        (o) =>
          o.name ===
            (sign > 0
              ? 'rounded-front-pressure-collar'
              : 'reinforced-lower-nameplate-collar') &&
          Math.sign(sourceBounds(o).getCenter(new THREE.Vector3()).y) === sign,
      ),
      contacts = supports
        .map((o) => ({
          section: o.userData.section,
          overlap: b
            .clone()
            .intersect(sourceBounds(o))
            .getSize(new THREE.Vector3())
            .toArray(),
        }))
        .filter((o) => o.overlap.every((v) => v > 0));
    assert.equal(contacts.length, 2);
    report.mounting.push({ layout, branding: sign, contacts });
  }
  const intendedExterior = [];
  m.group.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    let external = false;
    for (let a = o.parent; a; a = a.parent)
      if (a.userData.exterior) external = true;
    if (external) {
      assert(
        o.material.userData.exterior,
        'nonroom mesh must have exterior material',
      );
      intendedExterior.push(o.name);
    }
  });
  report.checks.push({
    name: layout + ' nonroom classification',
    pass: true,
    meshes: intendedExterior.length,
  });
}
const spareKinds = Array.from(
  { length: 9 },
  (_, i) =>
    m.group.getObjectByName('spare-equipment-bay-' + i).userData.spareKind,
);
assert.equal(new Set(spareKinds).size, 9);
report.spares = spareKinds;
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
  exteriorMaterials: extMaterials.size,
};
report.failedVisibility = report.visibility.filter(
  (v) => v.blocked.length || v.pickMisses.length,
);
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
  passageRays: report.passages.length * 25,
  lightingStates: report.lighting.length,
  headerInkRays: report.headerVisibility.length * 15,
  wholeDockingOpeningRays: report.docking
    .filter((d) => d.wholeOpening)
    .reduce((n, d) => n + d.rays, 0),
  physicalMounts: report.mounting.length,
  diagnosticDragPoses: report.dragDiagnostics.length,
  diagnosticDragOcclusions: report.dragDiagnostics.filter(
    (d) => d.blocked.length,
  ).length,
  passed:
    !report.failedVisibility.length &&
    !report.failedPassages.length &&
    !report.docking.some((d) => d.leaks.length) &&
    !report.headerVisibility.some((d) => d.blocked.length),
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
        picks: v.pickMisses.length,
        first: v.blocked[0],
      })),
      failedPassages: report.failedPassages,
    },
    null,
    2,
  ),
);

assert(
  report.summary.passed,
  'V10 bounded render/model audit failed; inspect report.',
);
