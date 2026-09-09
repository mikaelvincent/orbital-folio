import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
const root = resolve(process.argv[2] || process.cwd()),
  modelPath = resolve(
    process.argv[3] || join(root, 'components/spacecraft-model.ts'),
  ),
  output = resolve(
    process.argv[4] || '/tmp/spacecraft-walkway-shape-audit.json',
  );
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
  constructor(...args) {
    super(...args);
    sources.push(this);
  }
  removeFromParent() {
    if (this.parent && !this.auditParent) this.auditParent = this.parent;
    return super.removeFromParent();
  }
}
const model = createSpacecraft(
  { ...THREE, Mesh },
  {
    labels: {
      projects: 'Projects',
      experience: 'Case studies',
      about: 'About',
      contact: 'Contact',
    },
    projects: [{ title: 'Audit entry', slug: 'audit' }],
    vesselName: 'portfolio.example',
  },
);
delete globalThis.document;
const report = {
  modelPath,
  layouts: [],
  passages: [],
  dockRays: [],
  profileSamples: [],
  furniture: [],
  normals: { vertices: 0, invalid: 0 },
  bounds: [],
};
const near = (a, b, tol = 1e-5) => Math.abs(a - b) < tol;
const partMatrix = (o) =>
  o.auditParent
    ? o.auditParent.matrixWorld.clone().multiply(o.matrix)
    : o.matrixWorld.clone();
function visibleMeshes() {
  const a = [];
  model.group.traverseVisible((o) => {
    if (
      o.isMesh &&
      !o.userData.isInteractionProxy &&
      o.material.visible !== false &&
      !o.material.transparent
    )
      a.push(o);
  });
  return a;
}
const profile = sources.find(
  (o) => o.name === 'walkway-rounded-pressure-collar',
);
assert(profile);
const pressureSamplesMaterial = new THREE.MeshBasicMaterial({
  side: THREE.DoubleSide,
});
for (const layout of ['wide', 'compact']) {
  model.setLayout(layout);
  model.update(0, '', true, {
    activeRoom: 'home',
    travelling: false,
    transitRoom: null,
    transitWalkway: false,
    hoveredWalkway: false,
    reading: false,
  });
  const ud = model.group.userData,
    scale = layout === 'wide' ? 1.4 : 1,
    walkway = model.group.getObjectByName('left-vertical-walkway');
  assert.equal(ud.walkwayProfile.leftShoulderHeight, 2.14);
  assert(ud.walkwayProfile.shoulderFraction > 0.66);
  assert.deepEqual(ud.walkwayProfile.clearDockingOpening, [1.82, 1.9]);
  assert.equal(ud.walkwayProfile.shellDepth, 2.42);
  report.layouts.push({
    layout,
    profile: structuredClone(ud.walkwayProfile),
    roomAnchors: structuredClone(ud.roomAnchors),
    dockingAnchors: structuredClone(ud.dockingAnchors),
    walkway: structuredClone(ud.walkwayBounds),
  });
  const visible = visibleMeshes(),
    inverse = walkway.matrixWorld.clone().invert();
  // Sample actual front-collar geometry, not only its declared dimensions.
  const rim = new THREE.Mesh(profile.geometry, pressureSamplesMaterial);
  rim.matrixAutoUpdate = false;
  rim.matrix.copy(partMatrix(profile));
  rim.updateMatrixWorld(true);
  for (const y of [0, 0.95, 1.5, 2, 2.5, 2.9, 3.15])
    for (const sign of [-1, 1]) {
      const from = walkway.localToWorld(
        new THREE.Vector3(-2 * scale, sign * y, 1.17),
      );
      const hit = new THREE.Raycaster(
        from,
        new THREE.Vector3(1, 0, 0),
        0,
        4 * scale,
      ).intersectObject(rim, false)[0];
      assert(hit, 'Front pressure rim must form a continuous contour');
      const p = hit.point.clone().applyMatrix4(inverse);
      report.profileSamples.push({ layout, y: sign * y, x: p.x / scale });
    }
  const mid = report.profileSamples.find(
      (p) => p.layout === layout && p.y === 0,
    ).x,
    tip = report.profileSamples.find(
      (p) => p.layout === layout && p.y === 2.9,
    ).x;
  assert(tip - mid > 0.6, 'Long shoulders must visibly taper the bay');
  for (const portal of ud.portals.filter((p) => p.via === 'walkway')) {
    const a = ud.roomAnchors[portal.from],
      fromX = a[0] - (1.5 * scale - 0.15),
      toX = ud.walkwayAnchor[0] + 0.75 * scale - 0.15;
    for (const yy of [-0.6, 0, 0.6])
      for (const z of [-0.7, 0, 0.7]) {
        const from = new THREE.Vector3(fromX, a[1] - 0.06 + yy, z),
          to = new THREE.Vector3(toX, from.y, z),
          d = to.clone().sub(from),
          length = d.length();
        d.normalize();
        const hit = new THREE.Raycaster(
          from,
          d,
          0.001,
          length - 0.001,
        ).intersectObjects(visible, false)[0];
        assert(!hit, `Passage ${portal.id} blocked by ${hit?.object.name}`);
        report.passages.push({
          layout,
          portal: portal.id,
          y: yy,
          z,
          open: true,
        });
      }
  }
  // The finished center docking hatch stays opaque inside the existing opening.
  for (const y of [-0.6, 0, 0.6])
    for (const z of [-0.55, 0, 0.55]) {
      const from = walkway.localToWorld(
          new THREE.Vector3(0.1 * scale, y + 0.03, z),
        ),
        hit = new THREE.Raycaster(
          from,
          new THREE.Vector3(-1, 0, 0),
          0.001,
          1.25 * scale,
        ).intersectObjects(visible, false)[0];
      assert(hit, 'Central docking hatch must stay sealed');
      report.dockRays.push({ layout, y, z, hit: hit.object.name });
    }
  // Source-level vertices prove the landing/ladder/service props remain inside
  // the curved shell. Door assemblies intentionally bridge its central aperture.
  const furnitureSources = sources.filter(
    (o) =>
      o.auditParent?.userData.roomSurface &&
      o.userData.section === 'walkway' &&
      !o.auditParent.name.includes('docking') &&
      !o.auditParent.name.includes('sign'),
  );
  let minShellClearance = Infinity,
    examined = 0;
  for (const object of furnitureSources) {
    const position = object.geometry.attributes.position,
      transform = inverse.clone().multiply(partMatrix(object));
    for (let i = 0; i < position.count; i++) {
      const p = new THREE.Vector3()
        .fromBufferAttribute(position, i)
        .applyMatrix4(transform);
      p.x /= scale;
      const yy = Math.abs(p.y),
        left =
          yy <= 1.06
            ? -0.75
            : 0.6 -
              1.35 * Math.sqrt(Math.max(0, 1 - ((yy - 1.06) / 2.14) ** 2));
      const clearance = p.x - left;
      minShellClearance = Math.min(minShellClearance, clearance);
      assert(
        clearance > -0.025,
        `${object.name} protrudes through tapered hull at ${p.toArray()} by ${-clearance}`,
      );
      assert(yy < 3.22);
      examined++;
    }
  }
  report.furniture.push({
    layout,
    examinedVertices: examined,
    minShellClearance,
  });
  for (const roll of [0, Math.PI / 2]) {
    model.group.rotation.z = roll;
    model.group.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(walkway);
    assert(Number.isFinite(box.min.x + box.min.y + box.max.x + box.max.y));
    report.bounds.push({
      layout,
      roll,
      min: box.min.toArray(),
      max: box.max.toArray(),
      size: box.getSize(new THREE.Vector3()).toArray(),
    });
  }
  model.group.rotation.z = 0;
  model.group.updateMatrixWorld(true);
}
model.group.traverse((o) => {
  if (!o.isMesh || o.userData.section !== 'walkway') return;
  const p = o.geometry.attributes.position,
    n = o.geometry.attributes.normal;
  report.normals.vertices += p.count;
  for (let i = 0; i < p.count; i++) {
    assert(Number.isFinite(p.getX(i) + p.getY(i) + p.getZ(i)));
    if (n && !near(Math.hypot(n.getX(i), n.getY(i), n.getZ(i)), 1, 0.003))
      report.normals.invalid++;
  }
});
assert.equal(report.normals.invalid, 0);
report.summary = {
  layouts: 2,
  openSideEntryRays: report.passages.length,
  sealedDockRays: report.dockRays.length,
  actualContourSamples: report.profileSamples.length,
  furnitureVertices: report.furniture.reduce(
    (a, b) => a + b.examinedVertices,
    0,
  ),
  validNormals: true,
  passed: true,
};
writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(
  JSON.stringify(
    {
      output,
      summary: report.summary,
      furniture: report.furniture,
      profileSamples: report.profileSamples.filter(
        (p) => p.layout === 'compact' && p.y >= 0,
      ),
    },
    null,
    2,
  ),
);
