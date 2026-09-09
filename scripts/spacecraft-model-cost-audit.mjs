import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
// Usage: node spacecraft-model-cost-audit.mjs <repo> <before.ts> <after.ts> [report.json]
const root = resolve(process.argv[2] || process.cwd()),
  beforePath = resolve(process.argv[3]),
  afterPath = resolve(process.argv[4]),
  output = resolve(process.argv[5] || '/tmp/spacecraft-model-cost-audit.json');
const req = createRequire(pathToFileURL(join(root, 'package.json'))),
  THREE = await import(pathToFileURL(req.resolve('three')).href);
const fixtures = (n) =>
  Array.from({ length: n }, (_, i) => ({
    title: 'Project ' + i,
    slug: 'audit-' + i,
  }));
globalThis.document = {
  // oxlint-disable-next-line typescript/no-deprecated -- Scoped CPU canvas stub.
  createElement() {
    const ctx = new Proxy(
      {},
      {
        get(t, k) {
          if (k in t) return t[k];
          if (k === 'measureText')
            return (text) => ({
              width:
                text.length *
                Number((t.font || '10px').match(/[\d.]+(?=px)/)?.[0] || 10) *
                0.58,
            });
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
async function make(path) {
  const { createSpacecraft } = await import(pathToFileURL(path).href),
    sources = [];
  class Mesh extends THREE.Mesh {
    constructor(...a) {
      super(...a);
      sources.push(this);
    }
  }
  const m = createSpacecraft(
    { ...THREE, Mesh },
    {
      projects: fixtures(9),
      labels: {
        projects: 'Projects',
        experience: 'Experience',
        about: 'About',
        contact: 'Contact',
      },
      vesselName: 'portfolio.example',
      sampleLabel: 'Concept',
    },
  );
  return { model: m, sources };
}
const before = await make(beforePath),
  after = await make(afterPath);
delete globalThis.document;
const tri = (o) =>
  ((o.geometry.index
    ? o.geometry.index.count
    : o.geometry.attributes.position.count) /
    3) *
  (o.isInstancedMesh ? o.count : 1);
function costs(m) {
  let colorCalls = 0,
    colorTriangles = 0,
    shadowCasterTriangles = 0,
    visibleVertices = 0;
  const geometries = new Set();
  let allocatedVertices = 0,
    attributeBytes = 0,
    indexBytes = 0;
  m.group.traverse((o) => {
    if (o.isMesh && !geometries.has(o.geometry)) {
      geometries.add(o.geometry);
      const g = o.geometry;
      allocatedVertices += g.attributes.position.count;
      for (const a of Object.values(g.attributes))
        attributeBytes += a.array.byteLength;
      if (g.index) indexBytes += g.index.array.byteLength;
    }
  });
  m.group.traverseVisible((o) => {
    if (!o.isMesh || o.material.visible === false) return;
    colorCalls++;
    colorTriangles += tri(o);
    visibleVertices +=
      o.geometry.attributes.position.count * (o.isInstancedMesh ? o.count : 1);
    if (o.castShadow) shadowCasterTriangles += tri(o);
  });
  return {
    colorCalls,
    colorTriangles,
    shadowCasterTriangles,
    visibleVertices,
    allocatedVertices,
    attributeBytes,
    indexBytes,
  };
}
const report = {
  before: {
    path: beforePath,
    sha256: createHash('sha256').update(readFileSync(beforePath)).digest('hex'),
  },
  after: {
    path: afterPath,
    sha256: createHash('sha256').update(readFileSync(afterPath)).digest('hex'),
  },
  states: [],
  roundedBoxes: {
    geometries: 0,
    sourceMeshes: 0,
    originalVertices: 0,
    candidateVertices: 0,
    allCurvedSamplesRetained: true,
    newSamplesAbsentFromOriginal: 0,
    removedStraightSpanSamples: 0,
    removedCurvedSamples: 0,
  },
  smallParts: [],
};
for (const layout of ['wide', 'compact'])
  for (const count of [9, 0])
    for (const activeRoom of ['home', 'projects', 'about']) {
      const values = [];
      for (const v of [before, after]) {
        v.model.setProjects(fixtures(count));
        v.model.setLayout(layout);
        v.model.update(0, '', true, {
          activeRoom,
          reading: false,
          hoveredPortal: null,
          selectedProject: null,
        });
        values.push(costs(v.model));
      }
      const boundsDelta = Math.max(
        ...['min', 'max'].flatMap((k) =>
          before.model.group.userData.overviewBounds[k].map((v, i) =>
            Math.abs(v - after.model.group.userData.overviewBounds[k][i]),
          ),
        ),
      );
      assert(
        boundsDelta < 0.001,
        'overall sampled bounds may change by less than 1 mm only',
      );
      const delta = {};
      for (const key of Object.keys(values[0]))
        delta[key] = {
          saved: values[0][key] - values[1][key],
          percent: ((values[0][key] - values[1][key]) / values[0][key]) * 100,
        };
      report.states.push({
        layout,
        count,
        activeRoom,
        boundsDelta,
        before: values[0],
        after: values[1],
        delta,
      });
    }
assert.equal(before.sources.length, after.sources.length);
const seen = new Set();
function sample(g, i) {
  return ['position', 'normal', 'uv']
    .flatMap((name) => {
      const a = g.attributes[name];
      return a
        ? Array.from({ length: a.itemSize }, (_, j) =>
            Number(a.array[i * a.itemSize + j]).toFixed(6),
          )
        : [];
    })
    .join(',');
}
for (let i = 0; i < before.sources.length; i++) {
  const a = before.sources[i],
    b = after.sources[i];
  assert.equal(a.name, b.name);
  const g = a.geometry,
    h = b.geometry;
  if (
    g.type === 'BoxGeometry' &&
    h.type === 'BoxGeometry' &&
    [6, 10].includes(g.parameters.widthSegments) &&
    [5, 9].includes(h.parameters.widthSegments)
  ) {
    report.roundedBoxes.sourceMeshes++;
    if (seen.has(g.uuid)) continue;
    seen.add(g.uuid);
    const old = new Set(
        Array.from({ length: g.attributes.position.count }, (_, j) =>
          sample(g, j),
        ),
      ),
      retained = new Set(
        Array.from({ length: h.attributes.position.count }, (_, j) =>
          sample(h, j),
        ),
      );
    for (let j = 0; j < g.attributes.position.count; j++)
      if (!retained.has(sample(g, j))) {
        const p = g.attributes.position,
          n = g.attributes.normal,
          straight = [0, 1, 2].some(
            (axis) =>
              Math.abs(p.array[j * 3 + axis]) < 1e-7 &&
              Math.abs(n.array[j * 3 + axis]) < 1e-7,
          );
        assert(straight, 'only straight-core midpoint samples may be removed');
        report.roundedBoxes.removedStraightSpanSamples++;
        if (!straight) report.roundedBoxes.removedCurvedSamples++;
      }
    let missing = 0;
    for (let j = 0; j < h.attributes.position.count; j++)
      if (!old.has(sample(h, j))) missing++;
    report.roundedBoxes.newSamplesAbsentFromOriginal += missing;
    report.roundedBoxes.geometries++;
    report.roundedBoxes.originalVertices += g.attributes.position.count;
    report.roundedBoxes.candidateVertices += h.attributes.position.count;
    assert.equal(
      missing,
      0,
      'coarsened box must only remove existing straight-span midpoint samples',
    );
  } else if (
    g.type === h.type &&
    ['TorusGeometry', 'SphereGeometry', 'CylinderGeometry'].includes(g.type) &&
    tri(a) !== tri(b)
  )
    report.smallParts.push({
      name: a.name,
      type: g.type,
      before: tri(a),
      after: tri(b),
      parametersBefore: g.parameters,
      parametersAfter: h.parameters,
    });
}
report.summary = {
  passed: true,
  sourceMeshes: before.sources.length,
  roundedBoxGeometries: report.roundedBoxes.geometries,
  boxSamplesAbsentFromOriginal:
    report.roundedBoxes.newSamplesAbsentFromOriginal,
  reducedSmallPartMeshes: report.smallParts.length,
  home9: report.states.find(
    (s) => s.layout === 'wide' && s.count === 9 && s.activeRoom === 'home',
  ),
};
writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ output, summary: report.summary }, null, 2));
