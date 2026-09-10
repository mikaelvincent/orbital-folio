// Usage: node audit.mjs [repository] [baseline-model.ts OR git:ref:path] [output.json] [candidate-model.ts]
// Default baseline: git:b6cd2c1:components/spacecraft-model.ts. Default candidate: repository file.
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
const root = resolve(process.argv[2] || process.cwd()),
  baselineSpec =
    process.argv[3] || 'git:b6cd2c1:components/spacecraft-model.ts',
  baseline = baselineSpec.startsWith('git:')
    ? baselineSpec
    : resolve(baselineSpec),
  output = resolve(process.argv[4] || '/tmp/shoulder-lip-actual-audit.json'),
  file = resolve(
    process.argv[5] || join(root, 'components/spacecraft-model.ts'),
  ),
  req = createRequire(join(root, 'package.json')),
  T = await import(pathToFileURL(req.resolve('three')).href);
const readSource = (f) =>
  f.startsWith('git:')
    ? execFileSync('git', ['-C', root, 'show', f.slice(4)], {
        encoding: 'utf8',
        maxBuffer: 8 * 1024 * 1024,
      })
    : readFileSync(f, 'utf8');
const hash = (f) => createHash('sha256').update(readSource(f)).digest('hex');
async function load(file) {
  const source = [];
  class Mesh extends T.Mesh {
    constructor(...a) {
      super(...a);
      source.push(this);
    }
    removeFromParent() {
      if (this.parent && !this.auditParent) this.auditParent = this.parent;
      return super.removeFromParent();
    }
  }
  const moduleURL = file.startsWith('git:')
    ? 'data:text/javascript;base64,' +
      Buffer.from(
        req('typescript').transpileModule(readSource(file), {
          compilerOptions: {
            target: req('typescript').ScriptTarget.ES2022,
            module: req('typescript').ModuleKind.ES2022,
          },
        }).outputText,
      ).toString('base64')
    : pathToFileURL(file).href;
  const { createSpacecraft } = await import(moduleURL);
  const model = createSpacecraft(
    { ...T, Mesh },
    {
      projects: Array.from({ length: 9 }, (_, i) => ({
        title: 'Sample ' + i,
        slug: 'sample-' + i,
        sample: true,
      })),
      caseStudies: Array.from({ length: 3 }, (_, i) => ({
        title: 'Study ' + i,
        slug: 'study-' + i,
        sample: true,
      })),
    },
  );
  return { source, model };
}
const before = await load(baseline),
  after = await load(file),
  report = {
    baseline: {
      path: baseline,
      revision: baseline.startsWith('git:')
        ? baseline.slice(4).split(':')[0]
        : undefined,
      sha256: hash(baseline),
    },
    candidate: { path: file, sha256: hash(file) },
    comparison:
      'Actual independently constructed baseline and edited-candidate meshes; no in-memory candidate substitution.',
    limits: [
      'CPU geometry attributes and finite ray samples; GPU appearance is separate evidence.',
      'No browser canvas is used. The same nine project / three case-study fixture inputs are supplied to both models.',
      'Outside-silhouette grid rays can miss both models. New uncovered rays are baseline hits with candidate misses.',
      'Non-cap preservation compares every constructed individual Mesh before batching, plus live instance data, transforms and material fields. Derived batch buffers are excluded from individual-mesh equality because their source cap changes.',
    ],
    geometry: {},
    layouts: [],
    failures: [],
  };
function check(ok, msg, data) {
  if (!ok) report.failures.push({ msg, ...data });
}
function visible(o) {
  for (let p = o; p; p = p.parent || p.auditParent)
    if (!p.visible) return false;
  return true;
}
function matrix(o) {
  o.updateMatrix();
  return o.auditParent
    ? o.auditParent.matrixWorld.clone().multiply(o.matrix)
    : o.matrixWorld.clone();
}
function clone(o) {
  const c = new T.Mesh(o.geometry, o.material);
  c.name = o.name;
  c.matrixAutoUpdate = false;
  c.matrix.copy(matrix(o));
  c.updateMatrixWorld(true);
  return c;
}
function attributeRecord(g) {
  return Object.fromEntries(
    Object.entries(g.attributes).map(([k, a]) => [
      k,
      { itemSize: a.itemSize, array: Array.from(a.array) },
    ]),
  );
}
function geometryRecord(g) {
  return {
    attributes: attributeRecord(g),
    index: g.index ? Array.from(g.index.array) : null,
    groups: g.groups,
    drawRange: g.drawRange,
  };
}
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const individual = (a) => a.source.filter((o) => !o.userData.parts);
const a = individual(before),
  b = individual(after);
check(a.length === b.length, 'Same individual mesh count', {
  before: a.length,
  after: b.length,
});
const capName = 'walkway-curved-end-pressure-cap-exterior';
const geometryRows = [],
  removedCaps = [];
let unchanged = 0;
for (let k = 0; k < Math.min(a.length, b.length); k++) {
  const x = a[k],
    y = b[k];
  check(x.name === y.name, 'Stable mesh sequence', {
    index: k,
    before: x.name,
    after: y.name,
  });
  if (x.name !== capName) {
    const same = equal(geometryRecord(x.geometry), geometryRecord(y.geometry));
    check(same, 'Unrelated geometry changed', { index: k, name: x.name });
    if (same) unchanged++;
    continue;
  }
  const p = x.geometry.getAttribute('position'),
    keep = [],
    removed = [];
  for (let i = 0; i < p.count; i += 3) {
    const vs = [0, 1, 2].map((j) =>
      new T.Vector3().fromBufferAttribute(p, i + j),
    );
    const n = vs[1]
      .clone()
      .sub(vs[0])
      .cross(vs[2].clone().sub(vs[0]))
      .normalize();
    if (vs.every((v) => v.z >= 1.21 - 1e-6) && n.z > 0.0001)
      removed.push({
        firstVertex: i,
        normal: n.toArray(),
        vertices: vs.map((v) => v.toArray()),
      });
    else keep.push(i, i + 1, i + 2);
  }
  const mismatches = [];
  for (const key of Object.keys(x.geometry.attributes)) {
    const old = x.geometry.getAttribute(key),
      now = y.geometry.getAttribute(key);
    if (!now || now.count !== keep.length || now.itemSize !== old.itemSize) {
      mismatches.push({ attribute: key, countMismatch: true });
      continue;
    }
    let count = 0,
      max = 0;
    for (let i = 0; i < keep.length; i++)
      for (let c = 0; c < old.itemSize; c++) {
        const delta = Math.abs(
          old.array[keep[i] * old.itemSize + c] -
            now.array[i * old.itemSize + c],
        );
        if (delta > 1e-6) count++;
        max = Math.max(max, delta);
      }
    if (count) mismatches.push({ attribute: key, count, max });
  }
  check(
    removed.length > 0 && mismatches.length === 0,
    'Candidate equals baseline minus only forward cap/bevel triangles',
    { index: k, removed: removed.length, mismatches },
  );
  geometryRows.push({
    meshIndex: k,
    name: x.name,
    beforeTriangles: p.count / 3,
    afterTriangles: y.geometry.getAttribute('position').count / 3,
    removedTriangles: removed.length,
    remainingAttributesEqualWithin1e6: mismatches.length === 0,
    mismatches,
    removedZRange: [
      Math.min(...removed.flatMap((t) => t.vertices.map((v) => v[2]))),
      Math.max(...removed.flatMap((t) => t.vertices.map((v) => v[2]))),
    ],
  });
  removedCaps.push(...removed);
}
report.geometry = {
  individualMeshCountBefore: a.length,
  individualMeshCountAfter: b.length,
  unchangedNonCapMeshes: unchanged,
  changedCaps: geometryRows,
  totalRemovedTriangles: removedCaps.length,
};
function materialRecord(m) {
  return {
    name: m.name,
    type: m.type,
    color: m.color?.toArray(),
    emissive: m.emissive?.toArray(),
    roughness: m.roughness,
    metalness: m.metalness,
    transparent: m.transparent,
    opacity: m.opacity,
    side: m.side,
    depthWrite: m.depthWrite,
    depthTest: m.depthTest,
    polygonOffset: m.polygonOffset,
    polygonOffsetFactor: m.polygonOffsetFactor,
    polygonOffsetUnits: m.polygonOffsetUnits,
  };
}
const ray = new T.Raycaster();
for (const layout of ['compact', 'wide']) {
  before.model.setLayout(layout);
  after.model.setLayout(layout);
  before.model.group.updateMatrixWorld(true);
  after.model.group.updateMatrixWorld(true);
  const s = layout === 'wide' ? 1.4 : 1,
    wx = after.model.group.userData.walkwayAnchor[0],
    r = {
      layout,
      unchangedIndividualTransforms: 0,
      unchangedIndividualMaterials: 0,
      instancesCompared: 0,
      primaryRays: 0,
      baselineLipHits: 0,
      candidateLipHits: 0,
      removedLipReplacements: {},
      newlyUncoveredPrimary: [],
      centralTangencyRays: 0,
      newlyUncoveredTangency: [],
      obliqueRays: 0,
      newlyUncoveredOblique: [],
    };
  report.layouts.push(r);
  for (let k = 0; k < Math.min(a.length, b.length); k++) {
    const transform = equal(matrix(a[k]).toArray(), matrix(b[k]).toArray());
    check(transform, 'Individual mesh transform changed', {
      layout,
      index: k,
      name: a[k].name,
    });
    if (transform) r.unchangedIndividualTransforms++;
    const mat = equal(
      materialRecord(a[k].material),
      materialRecord(b[k].material),
    );
    check(mat, 'Individual material changed', {
      layout,
      index: k,
      name: a[k].name,
    });
    if (mat) r.unchangedIndividualMaterials++;
  }
  const instA = [],
    instB = [];
  before.model.group.traverse((o) => {
    if (o.isInstancedMesh) instA.push(o);
  });
  after.model.group.traverse((o) => {
    if (o.isInstancedMesh) instB.push(o);
  });
  check(instA.length === instB.length, 'Instance object count unchanged', {
    layout,
  });
  for (let i = 0; i < instA.length; i++) {
    const ia = instA[i],
      ib = instB[i];
    const same =
      ia.name === ib?.name &&
      equal(geometryRecord(ia.geometry), geometryRecord(ib.geometry)) &&
      equal(
        Array.from(ia.instanceMatrix.array),
        Array.from(ib.instanceMatrix.array),
      ) &&
      equal(ia.matrixWorld.toArray(), ib.matrixWorld.toArray());
    check(same, 'Instance geometry or placements changed', {
      layout,
      index: i,
      name: ia.name,
    });
    if (same) r.instancesCompared++;
  }
  const relevant = (n) =>
    /walkway-continuous-rear-liner|walkway-curved-end-pressure-cap-exterior|one-piece-five-aperture-pressure-face|walkway-pressure-collar-seal|walkway-open-docking-wall|inner-docking-|coaxial-docking-|docking-mount-/.test(
      n,
    );
  const old = before.source
      .filter((o) => visible(o) && relevant(o.name))
      .map(clone),
    now = after.source.filter((o) => visible(o) && relevant(o.name)).map(clone);
  const cast = (meshes, origin, direction, far = 10) => {
    ray.set(origin, direction);
    ray.near = 0.00001;
    ray.far = far;
    return ray.intersectObjects(meshes, false)[0];
  };
  for (const side of [-1, 1])
    for (let yi = 0; yi <= 80; yi++)
      for (let xi = 0; xi <= 72; xi++) {
        const y = side * (1.0 + (2.36 * yi) / 80),
          x = -0.84 + (1.64 * xi) / 72,
          origin = new T.Vector3(wx + x * s, y, 5),
          direction = new T.Vector3(0, 0, -1);
        const h = cast(old, origin, direction),
          j = cast(now, origin, direction);
        r.primaryRays++;
        if (h && !j)
          r.newlyUncoveredPrimary.push({
            x,
            y,
            before: h.object.name,
            z: h.point.z,
          });
        if (h?.object.name === capName && h.point.z > 1.209) {
          r.baselineLipHits++;
          const next = j?.object.name || 'miss';
          r.removedLipReplacements[next] =
            (r.removedLipReplacements[next] || 0) + 1;
        }
        if (j?.object.name === capName && j.point.z > 1.209)
          r.candidateLipHits++;
      }
  for (const side of [-1, 1])
    for (let yi = 0; yi <= 32; yi++)
      for (let zi = 0; zi <= 54; zi++) {
        const y = side * (0.91 + (0.32 * yi) / 32),
          z = -1.1 + (2.435 * zi) / 54,
          origin = new T.Vector3(wx + 0.23 * s, y, z),
          direction = new T.Vector3(-1, 0, 0);
        const h = cast(old, origin, direction, 2 * s),
          j = cast(now, origin, direction, 2 * s);
        r.centralTangencyRays++;
        if (h && !j)
          r.newlyUncoveredTangency.push({ y, z, before: h.object.name });
      }
  for (const cameraSide of [-1, 1])
    for (const side of [-1, 1])
      for (let yi = 0; yi <= 40; yi++)
        for (let xi = 0; xi <= 36; xi++) {
          const y = side * (1.0 + (2.36 * yi) / 40),
            x = -0.84 + (1.64 * xi) / 36,
            origin = new T.Vector3(wx + cameraSide * 1.65 * s, 0.08, 5),
            target = new T.Vector3(wx + x * s, y, 0.25),
            direction = target.sub(origin).normalize();
          const h = cast(old, origin, direction),
            j = cast(now, origin, direction);
          r.obliqueRays++;
          if (h && !j)
            r.newlyUncoveredOblique.push({
              cameraSide,
              x,
              y,
              before: h.object.name,
              z: h.point.z,
            });
        }
  check(
    r.baselineLipHits > 0 && r.candidateLipHits === 0,
    'All sampled old front lip removed',
    { layout, before: r.baselineLipHits, after: r.candidateLipHits },
  );
  for (const key of [
    'newlyUncoveredPrimary',
    'newlyUncoveredTangency',
    'newlyUncoveredOblique',
  ])
    check(r[key].length === 0, 'No newly exposed enclosure holes', {
      layout,
      type: key,
      count: r[key].length,
      examples: r[key].slice(0, 4),
    });
}
writeFileSync(output, JSON.stringify(report, null, 2));
console.log(
  JSON.stringify(
    {
      ...report,
      layouts: report.layouts.map((r) => ({
        ...r,
        newlyUncoveredPrimary: r.newlyUncoveredPrimary.slice(0, 4),
        newlyUncoveredTangency: r.newlyUncoveredTangency.slice(0, 4),
        newlyUncoveredOblique: r.newlyUncoveredOblique.slice(0, 4),
      })),
    },
    null,
    2,
  ),
);
process.exitCode = report.failures.length ? 1 : 0;
