// Usage: node audit.mjs [repository] [baseline file OR git:ref:path] [output.json] [camera-state.json]
// Reads and instantiates actual source. No renderer or repository edits.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve, join } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const root = resolve(process.argv[2] || process.cwd()),
  ref = process.argv[3] || 'git:ebde2b8:components/spacecraft-model.ts',
  output = resolve(process.argv[4] || '/tmp/panel-removal-final-audit.json');
const req = createRequire(join(root, 'package.json')),
  T = await import(pathToFileURL(req.resolve('three')).href),
  ts = req('typescript');
const sha = (s) => createHash('sha256').update(s).digest('hex'),
  read = (f) =>
    f.startsWith('git:')
      ? execFileSync('git', ['-C', root, 'show', f.slice(4)], {
          encoding: 'utf8',
          maxBuffer: 8e6,
        })
      : readFileSync(f, 'utf8');
async function build(file) {
  const text = read(file),
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
  }).outputText;
  const { createSpacecraft } = await import(
    'data:text/javascript;base64,' + Buffer.from(js).toString('base64')
  );
  return {
    file,
    sha256: sha(text),
    text,
    source,
    model: createSpacecraft({ ...T, Mesh }, { projects: [], caseStudies: [] }),
  };
}
const old = await build(ref),
  now = await build(join(root, 'components/spacecraft-model.ts'));
const report = {
  baseline: { file: old.file, sha256: old.sha256 },
  candidate: { file: now.file, sha256: now.sha256 },
  limits: [
    'CPU audit of actual generated meshes. GPU captures separately confirm appearance.',
    'About rays use the saved 1280x900 oblique camera. Projects translates this pose +3.4 in Y. Compact camera translates +0.6 X; it is a synthetic geometry probe, not a captured view.',
    'Finite ray samples do not prove every possible camera. Empty content fixtures keep checks focused on chassis and doorway geometry.',
  ],
  geometry: {},
  layouts: [],
  sightlines: [],
  seamCoverage: [],
  failures: [],
};
const assert = (ok, message, data = {}) => {
    if (!ok) report.failures.push({ message, ...data });
  },
  equal = (a, b) => JSON.stringify(a) === JSON.stringify(b),
  individual = (a) => a.source.filter((o) => !o.userData.parts),
  changedName = (n) =>
    n === 'walkway-continuous-rear-liner' ||
    /^walkway-(projects|about)-rear-return-interior$/.test(n);
const signature = (g) =>
  sha(
    JSON.stringify({
      index: g.index ? Array.from(g.index.array) : null,
      attributes: Object.fromEntries(
        Object.entries(g.attributes).map(([k, a]) => [
          k,
          { size: a.itemSize, array: Array.from(a.array) },
        ]),
      ),
    }),
  );
const oldOther = individual(old).filter((o) => !changedName(o.name)),
  newOther = individual(now).filter((o) => !changedName(o.name));
assert(
  oldOther.length === newOther.length,
  'Unrelated mesh counts stay the same',
  { before: oldOther.length, after: newOther.length },
);
let preserved = 0;
for (let i = 0; i < Math.min(oldOther.length, newOther.length); i++) {
  const a = oldOther[i],
    b = newOther[i],
    ok = a.name === b.name && signature(a.geometry) === signature(b.geometry);
  assert(ok, 'Unrelated geometry remains byte-exact', {
    index: i,
    before: a.name,
    after: b.name,
  });
  if (ok) preserved++;
}
report.geometry.unchangedUnrelatedMeshes = preserved;
const rear = individual(now).find(
    (o) => o.name === 'walkway-continuous-rear-liner',
  ),
  returns = individual(now).filter((o) => /rear-return-interior/.test(o.name));
rear.geometry.computeBoundingBox();
const p = rear.geometry.getAttribute('position');
let flatMax = -Infinity;
for (let i = 0; i < p.count; i++)
  if (Math.abs(p.getZ(i) + 0.985) < 1e-6)
    flatMax = Math.max(flatMax, p.getX(i));
report.geometry.rear = {
  box: rear.geometry.boundingBox,
  flatRearPlaneMaxX: flatMax,
  removedReturnMeshes: 2 - returns.length,
  baselineChangedMeshes: individual(old)
    .filter((o) => changedName(o.name))
    .map((o) => ({
      name: o.name,
      vertices: o.geometry.getAttribute('position').count,
    })),
  candidateVertices: p.count,
};
assert(!returns.length, 'Oversized room-owned rear-return meshes are removed');
assert(
  rear.geometry.boundingBox.max.x <= 0.672001,
  'Rear liner stays within ladder wall face',
);
assert(
  flatMax <= 0.585001,
  'Flat rear plane no longer extends across cabin doorway',
);
assert(
  !now.text.includes('splitWallSurface'),
  'Obsolete rear-panel partition builder removed',
);
const matrix = (o) => {
    o.updateMatrix();
    return o.parent
      ? o.matrixWorld
      : o.auditParent.matrixWorld.clone().multiply(o.matrix);
  },
  visible = (o) => {
    for (let q = o; q; q = q.parent || q.auditParent)
      if (!q.visible) return false;
    return true;
  };
function meshes(a, layout, room) {
  a.model.setLayout(layout);
  a.model.update(1, '', true, {
    activeRoom: room,
    hoveredWalkway: false,
    hoveredPortal: '',
    travelling: false,
  });
  a.model.group.updateMatrixWorld(true);
  const result = individual(a)
    .filter(
      (o) =>
        visible(o) &&
        o.name !== 'walkway-curved-end-pressure-cap-interior' &&
        !o.userData.isInteractionProxy,
    )
    .map((o) => {
      o.geometry.computeBoundingBox();
      const m = new T.Mesh(o.geometry, o.material);
      m.name = o.name;
      m.matrixAutoUpdate = false;
      m.matrix.copy(matrix(o));
      m.updateMatrixWorld(true);
      return m;
    });
  a.model.group.traverse((o) => {
    if (o.isInstancedMesh && visible(o)) result.push(o);
  });
  return result;
}
const posePath = resolve(
  process.argv[5] ||
    join(root, 'docs/evidence/panel-removal/ray-camera-state.json'),
);
const pose = JSON.parse(readFileSync(posePath, 'utf8'));
report.cameraInput = {
  file: posePath,
  sha256: sha(readFileSync(posePath, 'utf8')),
  note: 'This file supplies a repeatable camera only; its renderer ID is not candidate render evidence.',
};
for (const layout of ['wide', 'compact'])
  for (const room of ['about', 'projects']) {
    const models = [old, now].map((a) => meshes(a, layout, room));
    let transforms = 0;
    for (let i = 0; i < oldOther.length; i++) {
      const ok = equal(
        matrix(oldOther[i]).toArray(),
        matrix(newOther[i]).toArray(),
      );
      assert(ok, 'Unrelated mesh transforms preserved', {
        layout,
        room,
        index: i,
        name: oldOther[i].name,
      });
      if (ok) transforms++;
    }
    report.layouts.push({ layout, room, preservedTransforms: transforms });
    const cam = new T.PerspectiveCamera(38, 1280 / 900, 0.01, 80);
    cam.position.fromArray(pose.cameraPosition.split(',').map(Number));
    cam.quaternion
      .fromArray(pose.cameraQuaternion.split(',').map(Number))
      .normalize();
    if (room === 'projects') cam.position.y += 3.4;
    if (layout === 'compact') cam.position.x += 0.6;
    cam.updateMatrixWorld(true);
    const ray = new T.Raycaster(),
      row = {
        layout,
        room,
        rays: 0,
        newMisses: [],
        removedPanelHits: 0,
        replacements: {},
        seamSamples: [],
      };
    report.sightlines.push(row);
    for (let y = 280; y <= 720; y += 5)
      for (let x = 170; x <= 340; x += 2) {
        ray.setFromCamera(
          new T.Vector2((x / 1280) * 2 - 1, 1 - (y / 900) * 2),
          cam,
        );
        const h = models.map((m) => ray.intersectObjects(m, false)[0]);
        row.rays++;
        if (h[0] && !h[1]) row.newMisses.push([x, y]);
        if (h[0] && h[1] && /rear-return-interior/.test(h[0].object.name)) {
          row.removedPanelHits++;
          row.replacements[h[1].object.name] =
            (row.replacements[h[1].object.name] || 0) + 1;
        }
        if (
          layout === 'wide' &&
          y === 450 &&
          [228, 230, 232, 234, 236].includes(x)
        )
          row.seamSamples.push({
            pixel: [x, y],
            hit: h[1]
              ? { name: h[1].object.name, point: h[1].point.toArray() }
              : null,
          });
      }
    assert(
      !row.newMisses.length,
      'Removing the panel introduces no misses in the cabin sightline grid',
      { layout, room, newMisses: row.newMisses },
    );
    const scale = layout === 'wide' ? 1.4 : 1,
      anchor = now.model.group.userData.walkwayAnchor[0],
      cy = room === 'projects' ? 1.64 : -1.76,
      seam = { layout, room, rays: 0, misses: [], firstHits: {} };
    report.seamCoverage.push(seam);
    // Direct room-to-junction rays target a strip across both sides of the rear join.
    for (let iy = 0; iy <= 40; iy++)
      for (let ix = 0; ix <= 32; ix++) {
        const x = 0.5 + ix * 0.01,
          y = cy - 0.82 + iy * 0.041,
          target = new T.Vector3(anchor + x * scale, y, -0.985);
        ray.set(cam.position, target.sub(cam.position).normalize());
        const h = ray.intersectObjects(models[1], false)[0];
        seam.rays++;
        if (!h) seam.misses.push({ x, y });
        else
          seam.firstHits[h.object.name] =
            (seam.firstHits[h.object.name] || 0) + 1;
      }
    assert(
      !seam.misses.length,
      'All sampled rear-junction rays reach an actual surface',
      { layout, room, misses: seam.misses },
    );
  }
report.totalPixelRays = report.sightlines.reduce((s, r) => s + r.rays, 0);
report.totalSeamRays = report.seamCoverage.reduce((s, r) => s + r.rays, 0);
writeFileSync(output, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.failures.length ? 1 : 0;
