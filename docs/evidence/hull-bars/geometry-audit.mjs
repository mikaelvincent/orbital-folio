// Usage: node audit.mjs [repository] [baseline file OR git:ref:path] [output.json]
// Small, actual-source geometry and front-threshold audit. No repository edits.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve, join } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const root = resolve(process.argv[2] || process.cwd()),
  ref = process.argv[3] || 'git:641a70f:components/spacecraft-model.ts',
  output = resolve(process.argv[4] || '/tmp/deck-trim-actual-audit.json');
const req = createRequire(join(root, 'package.json')),
  T = await import(pathToFileURL(req.resolve('three')).href),
  ts = req('typescript'),
  sha = (s) => createHash('sha256').update(s).digest('hex');
async function build(file) {
  const text = file.startsWith('git:')
      ? execFileSync('git', ['-C', root, 'show', file.slice(4)], {
          encoding: 'utf8',
          maxBuffer: 8e6,
        })
      : readFileSync(file, 'utf8'),
    source = [];
  class Mesh extends T.Mesh {
    constructor(...args) {
      super(...args);
      source.push(this);
    }
    removeFromParent() {
      if (this.parent) this.auditParent = this.parent;
      return super.removeFromParent();
    }
  }
  const js = ts.transpileModule(text, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ES2022,
      },
    }).outputText,
    { createSpacecraft } = await import(
      'data:text/javascript;base64,' + Buffer.from(js).toString('base64')
    );
  return {
    file,
    sha256: sha(text),
    source,
    model: createSpacecraft({ ...T, Mesh }, { projects: [], caseStudies: [] }),
  };
}
const before = await build(ref),
  after = await build(join(root, 'components/spacecraft-model.ts')),
  report = {
    baseline: { file: before.file, sha256: before.sha256 },
    candidate: { file: after.file, sha256: after.sha256 },
    limits: [
      'CPU evidence uses actual generated meshes. Appearance is checked separately in fresh GPU captures.',
      'Finite targeted rays cover the annotated exterior bar and front threshold; this is not a complete camera sweep.',
      'Empty content fixtures keep this audit focused on cabin decks, pressure faces, and exterior channels.',
    ],
    removedChannels: {},
    preservation: {},
    layouts: [],
    rays: [],
    failures: [],
  };
const assert = (ok, message, data = {}) => {
    if (!ok) report.failures.push({ message, ...data });
  },
  eq = (a, b) => JSON.stringify(a) === JSON.stringify(b),
  individual = (a) => a.source.filter((o) => !o.userData.parts),
  deck = 'coherent-cabin-deck',
  channel = 'continuous-hull-edge-channel',
  unrelated = (a) =>
    individual(a).filter((o) => ![deck, channel].includes(o.name));
const geometrySignature = (g) =>
  sha(
    JSON.stringify({
      index: g.index ? Array.from(g.index.array) : null,
      attributes: Object.fromEntries(
        Object.entries(g.attributes).map(([k, a]) => [
          k,
          { itemSize: a.itemSize, array: Array.from(a.array) },
        ]),
      ),
    }),
  );
const oldOther = unrelated(before),
  newOther = unrelated(after);
let preserved = 0;
assert(
  oldOther.length === newOther.length,
  'Unrelated source mesh counts preserved',
  { before: oldOther.length, after: newOther.length },
);
for (let i = 0; i < Math.min(oldOther.length, newOther.length); i++) {
  const a = oldOther[i],
    b = newOther[i],
    ok =
      a.name === b.name &&
      geometrySignature(a.geometry) === geometrySignature(b.geometry);
  assert(ok, 'Unrelated geometry and attributes unchanged', {
    i,
    before: a.name,
    after: b.name,
  });
  if (ok) preserved++;
}
report.preservation.unchangedUnrelatedMeshes = preserved;
report.removedChannels = {
  before: individual(before).filter((o) => o.name === channel).length,
  after: individual(after).filter((o) => o.name === channel).length,
};
assert(
  report.removedChannels.before === 4 && report.removedChannels.after === 0,
  'Two decorative edge channels per layout removed',
);
const visible = (o) => {
    for (let p = o; p; p = p.parent || p.auditParent)
      if (!p.visible) return false;
    return true;
  },
  matrix = (o) => {
    o.updateMatrix();
    return o.parent
      ? o.matrixWorld
      : o.auditParent.matrixWorld.clone().multiply(o.matrix);
  };
function snapshot(a, layout) {
  a.model.setLayout(layout);
  a.model.update(1, '', true, { activeRoom: 'projects' });
  a.model.group.updateMatrixWorld(true);
  return individual(a)
    .filter(
      (o) =>
        visible(o) &&
        o.name !== 'walkway-curved-end-pressure-cap-interior' &&
        !o.userData.isInteractionProxy,
    )
    .map((o) => {
      o.geometry.computeBoundingBox();
      const mesh = new T.Mesh(o.geometry, o.material);
      mesh.name = o.name;
      mesh.matrixAutoUpdate = false;
      mesh.matrix.copy(matrix(o));
      mesh.updateMatrixWorld(true);
      return mesh;
    });
}
for (const layout of ['wide', 'compact']) {
  const variants = [before, after].map((a) => snapshot(a, layout)),
    row = { layout, unchangedTransforms: 0, decks: [] };
  report.layouts.push(row);
  for (let i = 0; i < oldOther.length; i++) {
    const ok = eq(matrix(oldOther[i]).toArray(), matrix(newOther[i]).toArray());
    assert(ok, 'Unrelated transforms preserved', {
      layout,
      i,
      name: oldOther[i].name,
    });
    if (ok) row.unchangedTransforms++;
  }
  const decks = variants.map((v) => v.filter((o) => o.name === deck));
  assert(
    decks.every((v) => v.length === 4),
    'All four cabin decks remain',
    { layout },
  );
  for (let i = 0; i < 4; i++) {
    const a = new T.Box3().setFromObject(decks[0][i]),
      b = new T.Box3().setFromObject(decks[1][i]),
      close = (x, y) => Math.abs(x - y) < 1e-6;
    row.decks.push({ before: a, after: b });
    assert(
      close(a.min.x, b.min.x) &&
        close(a.max.x, b.max.x) &&
        close(a.min.y, b.min.y) &&
        close(a.max.y, b.max.y) &&
        close(a.min.z, b.min.z),
      'Deck width, height, floor top and rear edge preserved',
      { layout, i },
    );
    assert(
      close(b.max.z, 1.27),
      'Deck front seats at Z1.27 behind the front face',
      { layout, i, front: b.max.z },
    );
  }
  const s = layout === 'wide' ? 1.4 : 1,
    pitch = 1.5 * s + 0.15,
    ray = new T.Raycaster(),
    r = {
      layout,
      barRays: 0,
      baselineDeckHits: 0,
      replacedBarHits: 0,
      barReplacementNames: {},
      thresholdRays: 0,
      newMisses: [],
      thresholdReplacements: {},
    };
  report.rays.push(r);
  for (const cy of [-1.7, 1.7])
    for (const dy of [-1.4, -1.375, -1.35])
      for (const dx of [-1, -0.5, 0, 0.5, 1])
        for (const tilt of [-0.1, 0, 0.1]) {
          const target = new T.Vector3(-pitch + dx * s, cy + dy, 1.34),
            origin = target.clone().add(new T.Vector3(tilt * 5, 0.08 * 5, 5));
          ray.set(origin, target.sub(origin).normalize());
          const h = variants.map((v) => ray.intersectObjects(v, false)[0]);
          r.barRays++;
          if (h[0]?.object.name === deck) {
            r.baselineDeckHits++;
            if (h[1]?.object.name !== deck) {
              r.replacedBarHits++;
              r.barReplacementNames[h[1]?.object.name || 'MISS'] =
                (r.barReplacementNames[h[1]?.object.name || 'MISS'] || 0) + 1;
            }
          }
          if (h[0] && !h[1])
            r.newMisses.push({ kind: 'bar', cy, dy, dx, tilt });
        }
  // Aim slightly down through the full front-edge region at the unchanged floor datum.
  // Cross both cabin rows, both columns, five horizontal positions, three Z positions,
  // and three oblique directions. Existing decks and pressure shell/frame form the backing.
  for (const cx of [-pitch, pitch])
    for (const cy of [-1.7, 1.7])
      for (const dx of [-1.15, -0.575, 0, 0.575, 1.15])
        for (const z of [1.2, 1.27, 1.34])
          for (const tilt of [-0.25, 0, 0.25]) {
            const target = new T.Vector3(cx + dx * s, cy - 1.325, z),
              origin = target.clone().add(new T.Vector3(tilt * 3, 0.7, 3));
            ray.set(origin, target.sub(origin).normalize());
            const h = variants.map((v) => ray.intersectObjects(v, false)[0]);
            r.thresholdRays++;
            if (h[0] && !h[1])
              r.newMisses.push({ kind: 'threshold', cx, cy, dx, z, tilt });
            if (h[0] && h[1]) {
              const key = h[0].object.name + ' -> ' + h[1].object.name;
              r.thresholdReplacements[key] =
                (r.thresholdReplacements[key] || 0) + 1;
            }
          }
  assert(
    r.baselineDeckHits === 90 && r.replacedBarHits === 90,
    'All 90 annotated-bar samples expose the underlying pressure face instead of the proud deck',
    {
      layout,
      baselineDeckHits: r.baselineDeckHits,
      replaced: r.replacedBarHits,
    },
  );
  assert(
    !r.newMisses.length,
    'No new gap in the bar or downward/oblique threshold samples',
    { layout, newMisses: r.newMisses },
  );
}
writeFileSync(output, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.failures.length ? 1 : 0;
