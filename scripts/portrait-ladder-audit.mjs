import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
const root = resolve(process.argv[2] || process.cwd()),
  modelPath = resolve(
    process.argv[3] || join(root, 'components/spacecraft-model.ts'),
  ),
  output = resolve(process.argv[4] || '/tmp/spacecraft-v13-audit.json');
const req = createRequire(pathToFileURL(join(root, 'package.json'))),
  THREE = await import(pathToFileURL(req.resolve('three')).href),
  { createSpacecraft } = await import(pathToFileURL(modelPath).href);
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
const data = (n, p) =>
  Array.from({ length: n }, (_, i) => ({
    title: p + ' ' + (i + 1),
    slug: p + '-' + i,
    sample: true,
  }));
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
    vesselName: 'portfolio.example',
  },
);
delete globalThis.document;
const report = {
    modelPath,
    lighting: [],
    signs: [],
    portrait: [],
    passages: [],
    visibility: [],
    geometry: {},
  },
  near = (a, b) => Math.abs(a - b) < 1e-5,
  vec = (a) => new THREE.Vector3(...a),
  sections = ['projects', 'experience', 'about', 'contact'];
const defaultState = {
  activeRoom: 'home',
  travelling: false,
  transitRoom: null,
  hoveredWalkway: false,
  transitWalkway: false,
  hoveredPortal: null,
  reading: false,
  labelPortrait: false,
};
function update(s = {}, hover = '', instant = true) {
  m.update(0, hover, instant, { ...defaultState, ...s });
}
const materials = new Map();
m.group.traverse((o) => {
  if (o.material) materials.set(o.material.uuid, o.material);
});
const exterior = [...materials.values()].filter((mat) => mat.userData.exterior),
  walkwayInterior = [...materials.values()].filter(
    (mat) =>
      mat.userData.baseColor &&
      !mat.userData.exterior &&
      sources.some(
        (o) => o.material === mat && o.userData.section === 'walkway',
      ) &&
      !mat.userData.linkedRooms,
  );
assert(
  walkwayInterior.length >= 5,
  'Ladder bay requires independently dimming interior surfaces',
);
update();
const snapshot = () =>
  exterior.map((mat) => [
    mat.uuid,
    ...mat.color.toArray(),
    ...mat.emissive.toArray(),
    mat.emissiveIntensity,
  ]);
const normalExterior = snapshot();
for (const activeRoom of ['home', ...sections])
  for (const hoveredWalkway of [false, true])
    for (const travelling of [false, true])
      for (const transitWalkway of [false, true]) {
        const state = {
          activeRoom,
          hoveredWalkway,
          travelling,
          transitWalkway,
          transitRoom: travelling && !transitWalkway ? 'contact' : null,
        };
        update(state, 'about');
        const expected = transitWalkway
            ? 1
            : hoveredWalkway && activeRoom !== 'home' && !travelling
              ? 1
              : 0.5,
          actual = m.group.userData.lightingState.walkway;
        assert(near(actual.level, expected));
        assert(near(actual.targetLevel, expected));
        assert.deepEqual(snapshot(), normalExterior);
        for (const material of walkwayInterior) {
          const want = material.userData.baseColor
            .clone()
            .multiplyScalar(expected);
          assert(
            material.color.distanceTo
              ? material.color.distanceTo(want) < 1e-5
              : material.color
                  .toArray()
                  .every((v, i) => near(v, want.toArray()[i])),
          );
          assert.equal(
            material.emissive.r + material.emissive.g + material.emissive.b,
            0,
          );
        }
        assert.equal(actual.pointIntensities.length, 0);
        report.lighting.push({
          ...state,
          expected,
          actual: actual.level,
          exteriorInvariant: true,
        });
      }
update();
m.update(1, '', false, {
  ...defaultState,
  activeRoom: 'projects',
  hoveredWalkway: true,
  delta: 1 / 60,
});
const mid = m.group.userData.lightingState.walkway;
assert(mid.level > 0.5 && mid.level < 1 && mid.targetLevel === 1);
report.interpolation = { level: mid.level, target: mid.targetLevel };
function objects() {
  const result = [];
  m.group.traverseVisible((o) => {
    if (
      o.isMesh &&
      o.material.visible !== false &&
      !o.userData.isInteractionProxy &&
      !['identification-label', 'portal-destination-label'].includes(
        o.material.name,
      )
    )
      result.push(o);
  });
  return result;
}
const sourceMatrix = (o) =>
  o.auditParent
    ? o.auditParent.matrixWorld.clone().multiply(o.matrix)
    : o.matrixWorld.clone();
const bounds = (o) => {
  o.geometry.computeBoundingBox();
  return o.geometry.boundingBox.clone().applyMatrix4(sourceMatrix(o));
};
const {
  CAMERA_RANGES,
  cursorViewSamples,
  fitPerspectiveDistance,
  solveApertureFraming,
} = await import(pathToFileURL(join(root, 'lib/scene-controls.ts')).href);
for (const [layout, vp] of [
  ['wide', [1440, 1000]],
  ['compact', [390, 844]],
  ['compact', [320, 844]],
]) {
  m.setLayout(layout);
  update();
  const anchors = structuredClone(m.group.userData.readerAnchors),
    a = m.group.userData.roomAnchors,
    scale = layout === 'wide' ? 1.4 : 1;
  assert.deepEqual(m.group.userData.adjacency, {
    experience: ['projects'],
    projects: ['experience', 'about'],
    about: ['projects', 'contact'],
    contact: ['about'],
  });
  m.setLabelOrientation(true);
  assert.equal(
    m.group.userData.labelPlaques.filter((p) => p.visible).length,
    8,
  );
  for (const label of m.group.userData.labelPlaques.filter(
    (p) => p.role === 'side',
  )) {
    assert(label.visible);
    assert(near(label.rotation + Math.PI / 2, 0));
    assert.deepEqual(label.size, [2.18, 0.35]);
    assert(near(label.position[0], a[label.section][0] - 1.565 * scale));
    const collar = sources.find(
      (o) =>
        o.name === 'reinforced-side-nameplate-collar' &&
        o.userData.section === label.section,
    );
    assert(collar);
    const b = bounds(collar);
    assert(near(b.max.x, a[label.section][0] - 1.28 * scale));
    const all = m.group.userData.overviewBounds;
    assert(b.min.x >= all.min[0] - 1e-5 && b.max.x <= all.max[0] + 1e-5);
    report.portrait.push({
      layout,
      viewport: vp,
      section: label.section,
      worldRoll: Math.PI / 2,
      localInkRotation: label.rotation,
      resultingRotation: label.rotation + Math.PI / 2,
      collarWidth: b.max.x - b.min.x,
      innerCollarEdge: b.max.x - a[label.section][0],
      inkPosition: label.position,
    });
  }
  for (const section of sections) {
    update({ activeRoom: section, labelPortrait: true });
    assert.equal(
      m.group.userData.labelPlaques.filter((p) => p.visible).length,
      4,
    );
    assert.deepEqual(m.group.userData.readerAnchors, anchors);
  }
  update();
  for (const p of m.group.userData.portals) {
    const caption = sources.find(
        (o) =>
          o.name === 'portal-destination-ink' &&
          o.auditParent?.parent?.userData.portalId === p.id,
      ),
      back = sources.find(
        (o) =>
          o.name === 'above-door-label-backing' &&
          o.auditParent?.parent?.userData.portalId === p.id,
      ),
      enamel = sources.find(
        (o) =>
          o.name === 'above-door-label-enamel' &&
          o.auditParent?.parent?.userData.portalId === p.id,
      );
    assert(caption && back && enamel);
    back.geometry.computeBoundingBox();
    enamel.geometry.computeBoundingBox();
    const backFront = back.position.z + back.geometry.boundingBox.max.z,
      enamelFront = enamel.position.z + enamel.geometry.boundingBox.max.z;
    assert(enamelFront - backFront > 0.009);
    assert(caption.position.z - enamelFront > 0.0029);
    assert(
      caption.material.isMeshLambertMaterial && caption.material.polygonOffset,
    );
    assert.equal(
      caption.material.map.minFilter,
      THREE.LinearMipmapLinearFilter,
    );
    assert.equal(caption.material.map.anisotropy, 8);
    assert(p.directionSymbol);
    assert(
      near(p.labelRotation[2], 0) &&
        near(Math.abs(p.labelRotation[1]), Math.PI / 2),
    );
    const wall = sources.find(
      (o) =>
        o.name === 'open-side-pressure-bulkhead-interior' &&
        o.userData.section === p.from &&
        Math.sign(bounds(o).getCenter(new THREE.Vector3()).x - a[p.from][0]) ===
          (p.edge === 'right' ? 1 : -1),
    );
    assert(wall);
    const overlap = bounds(back)
      .intersect(bounds(wall))
      .getSize(new THREE.Vector3())
      .toArray();
    assert(overlap.every((v) => v > 0.005));
    report.signs.push({
      layout,
      portal: p.id,
      wallOverlap: overlap,
      backFront,
      enamelFront,
      inkFront: caption.position.z,
      backingSeparation: enamelFront - backFront,
      inkGap: caption.position.z - enamelFront,
      symbol: p.directionSymbol,
      plateSize: p.plateSize,
    });
    const sign = p.edge === 'right' ? 1 : -1,
      fromX = a[p.from][0] + sign * (1.5 * scale - 0.15),
      toX = p.via
        ? m.group.userData.walkwayAnchor[0] + 0.75 * scale - 0.15
        : a[p.to][0] - sign * (1.5 * scale - 0.15),
      blocked = [];
    for (const y of [-0.6, 0, 0.6])
      for (const z of [-0.7, 0, 0.7]) {
        const from = new THREE.Vector3(fromX, a[p.from][1] - 0.06 + y, z),
          to = new THREE.Vector3(toX, from.y, z),
          ray = to.clone().sub(from),
          len = ray.length();
        ray.normalize();
        const hit = new THREE.Raycaster(
          from,
          ray,
          0.001,
          len - 0.001,
        ).intersectObjects(objects(), false)[0];
        if (hit) blocked.push(hit.object.name);
      }
    assert(!blocked.length);
    report.passages.push({ layout, portal: p.id, rays: 9, blocked });
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
            ).intersectObjects(objects(), false)[0];
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
  }
  assert.equal(m.group.userData.walkwayProfile.leftCornerRadius, 1.36 * scale);
  assert.equal(m.group.userData.walkwaySigns.length, 2);
  for (const section of ['projects', 'experience']) {
    const key = section === 'projects' ? 'project' : 'caseStudy',
      expected = section === 'projects' ? 9 : 3;
    assert.equal(
      m.interactionTargets.filter(
        (t) => t.section === section && t.object.userData[key + 'Slug'],
      ).length,
      expected,
    );
  }
}
update();
report.walkwaySurfaces = sources
  .filter((o) =>
    [
      'walkway-room-landing',
      'walkway-rear-pressure-liner',
      'walkway-continuous-rear-liner',
      'inner-docking-closed-pressure-leaf',
    ].includes(o.name),
  )
  .map((o) => {
    assert(!o.material.userData.exterior);
    const base = o.material.userData.baseColor.toArray(),
      color = o.material.color.toArray();
    assert(color.every((v, i) => near(v, base[i] * 0.5)));
    return {
      name: o.name,
      exterior: o.material.userData.exterior,
      baseLinearColor: base,
      idleLinearColor: color,
      ratio: 0.5,
    };
  });
assert.equal(report.walkwaySurfaces.length, 4);
let vertices = 0,
  triangles = 0,
  calls = 0;
m.group.traverse((o) => {
  if (!o.isMesh) return;
  const p = o.geometry.attributes.position,
    n = o.geometry.attributes.normal;
  vertices += p.count;
  for (let i = 0; i < p.count; i++) {
    assert(Number.isFinite(p.getX(i) + p.getY(i) + p.getZ(i)));
    assert(
      !n || Math.abs(Math.hypot(n.getX(i), n.getY(i), n.getZ(i)) - 1) < 0.003,
    );
  }
});
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
report.geometry = {
  vertices,
  triangles,
  calls,
  walkwayInteriorMaterials: walkwayInterior.length,
  exteriorMaterials: exterior.length,
  finiteGeometry: true,
  unitNormals: true,
};
report.failedVisibility = report.visibility.filter((p) => p.blocked.length);
report.summary = {
  lightingCases: report.lighting.length,
  portalSignChecks: report.signs.length,
  portraitChecks: report.portrait.length,
  openPassageRays: report.passages.length * 9,
  visibilityPoses: report.visibility.length,
  blockedVisibilityPoses: report.failedVisibility.length,
  passed: report.failedVisibility.length === 0,
};
writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(
  JSON.stringify(
    {
      output,
      summary: report.summary,
      geometry: report.geometry,
      failures: report.failedVisibility.map((v) => ({
        portal: v.portal,
        viewport: v.viewport,
        pointer: v.pointer,
        first: v.blocked[0]?.object,
      })),
    },
    null,
    2,
  ),
);
assert.equal(
  report.failedVisibility.length,
  0,
  'Ordinary-hover doorway ink must remain visible',
);
