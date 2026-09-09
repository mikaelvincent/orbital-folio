/** Args: [repo] [baseline-ref-or-model] [candidate-model] [output-json]. Defaults: git ff15f6a and current repo model. */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
const root = resolve(process.argv[2] || process.cwd()),
  baselineArg = process.argv[3] || 'ff15f6a',
  baseline = existsSync(resolve(baselineArg))
    ? resolve(baselineArg)
    : 'git:' + baselineArg,
  candidate = resolve(
    process.argv[4] || join(root, 'components/spacecraft-model.ts'),
  ),
  output = resolve(process.argv[5] || '/tmp/spacecraft-callout-audit.json');
const require = createRequire(pathToFileURL(join(root, 'package.json'))),
  THREE = await import(pathToFileURL(require.resolve('three')).href);
const changedNames = new Set([
  'reinforced-lower-nameplate-collar',
  'room-label-backing',
  'room-label-ceramic-insert',
  'reinforced-side-nameplate-collar',
  'side-label-backing',
  'side-label-ceramic-insert',
  'nameplate-amber-clasp',
  'side-nameplate-amber-clasp',
  'vessel-nameplate-integrated-hull-band',
  'vessel-nameplate-recessed-gasket',
  'vessel-nameplate-enamel',
  'symmetric-nameplate-end-clasp',
  'vessel-nameplate-ink',
  ...['projects', 'experience', 'about', 'contact'].flatMap((s) => [
    'hull-plaque-ink-' + s,
    'side-plaque-ink-' + s,
  ]),
]);
globalThis.document = {
  // oxlint-disable-next-line typescript/no-deprecated -- Minimal canvas recorder.
  createElement() {
    const commands = [],
      values = {};
    const ctx = new Proxy(values, {
      set(t, k, v) {
        t[k] = v;
        commands.push(['set', k, typeof v === 'object' ? 'object' : v]);
        return true;
      },
      get(t, k) {
        if (k in t) return t[k];
        if (k === 'createLinearGradient')
          return (...args) => {
            commands.push([k, ...args]);
            return {
              addColorStop(...a) {
                commands.push(['addColorStop', ...a]);
              },
            };
          };
        if (k === 'measureText')
          return (text) => {
            commands.push([k, text]);
            const font = Number(
              (t.font || '10px').match(/[\d.]+(?=px)/)?.[0] || 10,
            );
            return {
              width: text.length * font * 0.58,
              actualBoundingBoxAscent: font * 0.73,
              actualBoundingBoxDescent: font * 0.08,
            };
          };
        return (...args) =>
          commands.push([
            k,
            ...args.map((v) => (typeof v === 'object' ? 'object' : v)),
          ]);
      },
    });
    return {
      width: 0,
      height: 0,
      commands,
      getContext() {
        return ctx;
      },
    };
  },
};
async function build(path, screenLabels = false) {
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
  class InstancedMesh extends THREE.InstancedMesh {
    constructor(...args) {
      super(...args);
      sources.push(this);
    }
  }
  let url = pathToFileURL(path).href;
  if (path.startsWith('git:')) {
    const source = execFileSync(
      'git',
      ['show', path.slice(4) + ':components/spacecraft-model.ts'],
      { cwd: root, encoding: 'utf8' },
    );
    const ts = require('typescript');
    const code = ts.transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
      },
    }).outputText;
    url = 'data:text/javascript;base64,' + Buffer.from(code).toString('base64');
  }
  const { createSpacecraft } = await import(url);
  const m = createSpacecraft(
    { ...THREE, Mesh, InstancedMesh },
    {
      labels: {
        projects: 'Projects',
        experience: 'Case studies',
        about: 'About',
        contact: 'Contact',
      },
      projects: Array.from({ length: 9 }, (_, i) => ({
        title: 'Project ' + i,
        slug: 'p-' + i,
      })),
      caseStudies: Array.from({ length: 3 }, (_, i) => ({
        title: 'Case ' + i,
        slug: 'c-' + i,
      })),
      vesselName: 'portfolio.example',
      screenLabels,
    },
  );
  return { m, sources };
}
const matrix = (o) =>
  o.auditParent
    ? o.auditParent.matrixWorld.clone().multiply(o.matrix)
    : o.matrixWorld.clone();
function geometryHash(g) {
  const h = createHash('sha256');
  for (const name of Object.keys(g.attributes).sort()) {
    const a = g.attributes[name];
    h.update(name);
    h.update(
      new Uint8Array(a.array.buffer, a.array.byteOffset, a.array.byteLength),
    );
  }
  if (g.index)
    h.update(
      new Uint8Array(
        g.index.array.buffer,
        g.index.array.byteOffset,
        g.index.array.byteLength,
      ),
    );
  return h.digest('hex');
}
function isCabinSource(object) {
  for (let node = object; node; node = node.auditParent || node.parent)
    if (
      [
        'projects-assembly',
        'experience-assembly',
        'about-assembly',
        'contact-assembly',
      ].includes(node.name)
    )
      return true;
  return false;
}
// Matrix association changes in the vessel-local fix can differ at 1e-15.
function stableMetadata(value) {
  if (typeof value === 'number') return Math.round(value * 1e10) / 1e10;
  if (Array.isArray(value)) return value.map(stableMetadata);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, stableMetadata(entry)]),
    );
  return value;
}
function protectedSnapshot(a) {
  return a.sources
    .filter(
      (o) => !o.userData.parts && isCabinSource(o) && !changedNames.has(o.name),
    )
    .map((o) => ({
      name: o.name,
      section: o.userData.section,
      geometry: geometryHash(o.geometry),
      matrix: matrix(o).elements.map((x) => Number(x.toFixed(10))),
      instances: o.instanceMatrix ? Array.from(o.instanceMatrix.array) : null,
      material: {
        name: o.material.name,
        color: o.material.color.toArray(),
        emissive: o.material.emissive?.toArray(),
        exterior: o.material.userData.exterior,
        transparent: o.material.transparent,
        depthWrite: o.material.depthWrite,
        roughness: o.material.roughness,
        metalness: o.material.metalness,
      },
      canvas: o.material.map?.image?.commands,
      userData: { ...o.userData },
    }));
}

const base = await build(baseline),
  next = await build(candidate);
delete globalThis.document;
const report = {
  baseline,
  candidate,
  states: 0,
  preservedCabinSources: 0,
  removedExteriorSourceMeshes: 0,
  headers: 0,
  landings: [],
  supportParts: [],
  supportPointCount: 0,
  passed: false,
};
const removed = base.sources.filter(
  (o) => !o.userData.parts && changedNames.has(o.name),
);
assert.equal(removed.length, 68);
assert(
  !next.sources.some((o) => !o.userData.parts && changedNames.has(o.name)),
);
report.removedExteriorSourceMeshes = removed.length;
report.removedExteriorCanvasTextures = removed.filter(
  (o) => o.material.map?.isCanvasTexture,
).length;
assert.equal(report.removedExteriorCanvasTextures, 8);
for (const layout of ['wide', 'compact']) {
  base.m.setLayout(layout);
  next.m.setLayout(layout);
  for (const activeRoom of [
    'home',
    'projects',
    'experience',
    'about',
    'contact',
  ]) {
    const state = {
      activeRoom,
      labelPortrait: activeRoom === 'home',
      reading: false,
      travelling: false,
    };
    base.m.update(0, '', true, state);
    next.m.update(0, '', true, state);
    assert.deepEqual(protectedSnapshot(next), protectedSnapshot(base));
    for (const key of [
      'roomAnchors',
      'roomBounds',
      'innerApertureBounds',
      'readerAnchors',
      'headerAnchors',
      'hotspots',
      'portals',
      'adjacency',
    ])
      assert.deepEqual(
        stableMetadata(next.m.group.userData[key]),
        stableMetadata(base.m.group.userData[key]),
      );
    assert.equal(next.m.group.userData.labelPlaques.length, 4);
    assert(
      next.m.group.userData.labelPlaques.every(
        (p) => p.role === 'header' && p.visible,
      ),
    );
    assert.deepEqual(next.m.group.userData.labelAssemblyBounds, {});
    assert.deepEqual(next.m.group.userData.sideLabelBounds, {});
    next.m.group.traverse((o) =>
      assert(!o.userData.exteriorLabelAssembly && !o.userData.labelHardware),
    );
    report.states++;
  }
  const scale = layout === 'wide' ? 1.4 : 1;
  const landingSources = next.sources.filter(
    (o) => o.name === 'walkway-room-landing' && !o.userData.parts,
  );
  const upper = landingSources.find((o) => o.position.y > 0),
    lower = landingSources.find((o) => o.position.y < 0);
  const cleat = next.sources.find(
    (o) =>
      o.name === 'walkway-landing-wall-cleat' &&
      o.position.y > 0 &&
      !o.userData.parts,
  );
  const boxOf = (o) => {
    o.geometry.computeBoundingBox();
    return o.geometry.boundingBox.clone().applyMatrix4(matrix(o));
  };
  const ub = boxOf(upper),
    lb = boxOf(lower),
    cb = boxOf(cleat);
  assert(ub.intersectsBox(cb));
  assert(Math.abs(ub.getCenter(new THREE.Vector3()).y - 0.6915) < 1e-7);
  assert(Math.abs(ub.getSize(new THREE.Vector3()).x - 0.38 * scale) < 1e-6);
  const wallX = next.m.group.userData.walkwayAnchor[0] + 0.672 * scale;
  assert(ub.max.x > wallX && cb.max.x > wallX);
  const railX = next.m.group.userData.walkwayAnchor[0] + 0.38 * scale;
  const landingMesh = new THREE.Mesh(
    upper.geometry,
    new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
  );
  landingMesh.matrixAutoUpdate = false;
  landingMesh.matrix.copy(matrix(upper));
  landingMesh.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(
    new THREE.Vector3(railX, 0.6915, -0.676),
    new THREE.Vector3(1, 0, 0),
    0,
    0.029 * scale,
  );
  const hit = ray.intersectObject(landingMesh, false)[0];
  assert(hit, 'Upper sill must physically reach the right ladder rail');
  const overlap = ub
    .clone()
    .intersect(cb)
    .getSize(new THREE.Vector3())
    .toArray();
  report.landings.push({
    layout,
    upperCenter: ub.getCenter(new THREE.Vector3()).toArray(),
    upperSize: ub.getSize(new THREE.Vector3()).toArray(),
    lowerCenter: lb.getCenter(new THREE.Vector3()).toArray(),
    wallCleatOverlap: overlap,
    ladderContactRayDistance: hit.distance,
    dockingClearance:
      ub.min.x - (next.m.group.userData.walkwayAnchor[0] - 0.75 * scale),
  });
  const ud = next.m.group.userData;
  for (const section of ['projects', 'experience', 'about', 'contact']) {
    const [x, y] = ud.roomAnchors[section];
    assert.deepEqual(ud.calloutAnchors[section], [x, y + 0.17, 1.32]);
    assert.equal(Object.keys(ud.calloutEdges[section]).length, 4);
  }
  const supportMin = [0, 1, 2].map((axis) =>
    Math.min(...ud.overviewSupportPoints.map((p) => p[axis])),
  );
  const supportMax = [0, 1, 2].map((axis) =>
    Math.max(...ud.overviewSupportPoints.map((p) => p[axis])),
  );
  for (let axis = 0; axis < 3; axis++) {
    assert(supportMin[axis] <= ud.overviewBounds.min[axis] + 1e-5);
    assert(supportMax[axis] >= ud.overviewBounds.max[axis] - 1e-5);
  }
  const points = JSON.stringify(ud.overviewSupportPoints),
    anchors = JSON.stringify(ud.calloutAnchors),
    edges = JSON.stringify(ud.calloutEdges);
  assert(
    ud.overviewSupportPoints.length >= 100 &&
      ud.overviewSupportPoints.length <= 400,
  );
  assert(
    ud.overviewSupportPoints.every(
      (p) => p.length === 3 && p.every(Number.isFinite),
    ),
  );
  next.m.group.position.set(3, -4, 2);
  next.m.group.rotation.set(0.2, -0.3, Math.PI / 2);
  next.m.group.scale.set(1.1, 0.9, 1.05);
  next.m.group.updateMatrixWorld(true);
  const transform = next.m.group.matrix.elements.slice();
  next.m.setLayout(layout);
  next.m.setLabelOrientation(true);
  assert.equal(
    JSON.stringify(next.m.group.userData.overviewSupportPoints),
    points,
  );
  assert.equal(JSON.stringify(next.m.group.userData.calloutAnchors), anchors);
  assert.equal(JSON.stringify(next.m.group.userData.calloutEdges), edges);
  assert.deepEqual(next.m.group.matrix.elements, transform);
  next.m.group.position.set(0, 0, 0);
  next.m.group.rotation.set(0, 0, 0);
  next.m.group.scale.set(1, 1, 1);
  next.m.group.updateMatrixWorld(true);
}
report.preservedCabinSources = protectedSnapshot(next).length;
report.headers = 4;
report.supportParts = next.m.group.userData.overviewSupportBounds.map(
  (p) => p.name,
);
report.supportPointCount = next.m.group.userData.overviewSupportPoints.length;
report.passed = true;
writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
