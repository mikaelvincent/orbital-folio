// Usage: node audit.mjs [repository] [baseline file OR git:ref:path] [output.json]
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve, join } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const root = resolve(process.argv[2] || process.cwd()),
  ref = process.argv[3] || 'git:9363cc6:components/spacecraft-model.ts',
  output = resolve(
    process.argv[4] || '/tmp/doorway-lighting-actual-audit.json',
  ),
  req = createRequire(join(root, 'package.json')),
  T = await import(pathToFileURL(req.resolve('three')).href),
  ts = req('typescript');
const read = (f) =>
    f.startsWith('git:')
      ? execFileSync('git', ['-C', root, 'show', f.slice(4)], {
          encoding: 'utf8',
          maxBuffer: 8e6,
        })
      : readFileSync(f, 'utf8'),
  sha = (s) => createHash('sha256').update(s).digest('hex');
async function build(file) {
  const text = read(file),
    source = [];
  class Mesh extends T.Mesh {
    constructor(...a) {
      super(...a);
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
  const model = createSpacecraft(
    { ...T, Mesh },
    { projects: [], caseStudies: [] },
  );
  return { file, sha256: sha(text), source, model };
}
const old = await build(ref),
  now = await build(join(root, 'components/spacecraft-model.ts')),
  report = {
    baseline: { file: old.file, sha256: old.sha256 },
    candidate: { file: now.file, sha256: now.sha256 },
    limits: [
      'CPU actual geometry and material checks; GPU captures separately validate appearance.',
      'Point rays use a recorded About oblique camera and a +3.4 Y translation for Projects. Finite samples do not prove every possible view.',
      'No canvas text or real content is necessary for these wall/sleeve ownership checks.',
      'Clipped surface containment uses physical closest-point distance rather than relative barycentric bounds, which become ill-conditioned on tiny corner triangles.',
    ],
    geometry: {},
    scenarios: [],
    sightlines: [],
    failures: [],
  };
const fail = (ok, msg, data) => {
    if (!ok) report.failures.push({ msg, ...data });
  },
  eq = (a, b) => JSON.stringify(a) === JSON.stringify(b),
  names = (a, n) => a.source.filter((o) => o.name === n),
  individual = (a) => a.source.filter((o) => !o.userData.parts);
function geom(g) {
  return {
    index: g.index ? Array.from(g.index.array) : null,
    attributes: Object.fromEntries(
      Object.entries(g.attributes).map(([k, a]) => [
        k,
        { itemSize: a.itemSize, array: Array.from(a.array) },
      ]),
    ),
  };
}
function triangles(g) {
  const p = g.getAttribute('position'),
    ix = g.index,
    rows = [];
  for (let i = 0; i < (ix ? ix.count : p.count); i += 3) {
    const ids = [0, 1, 2].map((j) => (ix ? ix.getX(i + j) : i + j)),
      v = ids.map((id) => new T.Vector3().fromBufferAttribute(p, id));
    rows.push({
      v,
      ids,
      g,
      normal: v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])).normalize(),
      area: v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])).length() / 2,
    });
  }
  return rows;
}
const triangleKey = (t) =>
  JSON.stringify(
    Object.keys(t.g.attributes)
      .sort()
      .flatMap((k) => {
        const a = t.g.getAttribute(k);
        return t.ids.flatMap((i) =>
          Array.from(a.array.slice(i * a.itemSize, (i + 1) * a.itemSize)),
        );
      }),
  );
const wall = 'walkway-twin-open-room-wall-interior',
  oldWall = names(old, wall)[0],
  newWall = names(now, wall)[0],
  reveals = now.source.filter((o) =>
    /walkway-(projects|about)-doorway-reveal-interior/.test(o.name),
  );
const oldWallKeys = triangles(oldWall.geometry).map(triangleKey).sort(),
  newWallKeys = [newWall, ...reveals]
    .flatMap((o) => triangles(o.geometry).map(triangleKey))
    .sort();
report.geometry.revealPartition = {
  before: oldWallKeys.length,
  retained: triangles(newWall.geometry).length,
  reveals: reveals.map((o) => ({
    name: o.name,
    count: triangles(o.geometry).length,
    linkedRooms: o.material.userData.linkedRooms,
  })),
  allAttributesAndTrianglesPreserved: eq(oldWallKeys, newWallKeys),
};
fail(
  eq(oldWallKeys, newWallKeys),
  'Doorway split preserves every original triangle and attribute exactly',
  {},
);
fail(
  reveals.length === 2 &&
    reveals.every((o) => triangles(o.geometry).length === 544),
  'Both exact544 triangle doorway reveal partitions exist',
  {},
);
const rearName = 'walkway-continuous-rear-liner',
  rearOld = names(old, rearName)[0],
  rearNow = now.source.filter(
    (o) =>
      o.name === rearName ||
      (/walkway-/.test(o.name) &&
        /rear/.test(o.name) &&
        o.material.userData.linkedRooms),
  );
const oldRearTris = triangles(rearOld.geometry),
  newRearTris = rearNow.flatMap((o) =>
    triangles(o.geometry).map((t) => ({ ...t, name: o.name })),
  ),
  oldArea = oldRearTris.reduce((s, t) => s + t.area, 0),
  newArea = newRearTris.reduce((s, t) => s + t.area, 0);
const unsupported = [];
let maxSurfaceDistance = 0;
for (let i = 0; i < newRearTris.length; i++) {
  const t = newRearTris[i];
  if (t.area < 1e-12) continue;
  let bestDistance = Infinity;
  for (const o of oldRearTris) {
    if (o.normal.dot(t.normal) < 0.99999) continue;
    const tri = new T.Triangle(...o.v);
    const distance = Math.max(
      ...t.v.map((v) =>
        tri.closestPointToPoint(v, new T.Vector3()).distanceTo(v),
      ),
    );
    bestDistance = Math.min(bestDistance, distance);
  }
  maxSurfaceDistance = Math.max(maxSurfaceDistance, bestDistance);
  if (bestDistance > 1e-6) unsupported.push(i);
}
report.geometry.rearPartition = {
  parts: rearNow.map((o) => ({
    name: o.name,
    triangles: triangles(o.geometry).length,
    linkedRooms: o.material.userData.linkedRooms,
  })),
  beforeArea: oldArea,
  afterArea: newArea,
  areaDelta: newArea - oldArea,
  maxSurfaceDistance,
  surfaceDistanceTolerance: 1e-6,
  unsupportedCandidateTriangles: unsupported,
};
fail(
  rearNow.length === 3,
  'Rear extension has separate upper/lower borrowed lighting pieces',
  { count: rearNow.length },
);
fail(
  Math.abs(oldArea - newArea) < 1e-5 && unsupported.length === 0,
  'Rear split keeps the same surface footprint',
  { areaDelta: newArea - oldArea, unsupported },
);
const excluded = (n) =>
  n === wall ||
  n === rearName ||
  /walkway-(projects|about)-doorway-reveal-interior/.test(n) ||
  (/walkway-/.test(n) &&
    /rear/.test(n) &&
    n !== 'walkway-rear-pressure-shell-exterior');
const oldOthers = individual(old).filter((o) => !excluded(o.name)),
  newOthers = individual(now).filter((o) => !excluded(o.name));
let preserved = 0;
fail(oldOthers.length === newOthers.length, 'Same unrelated mesh count', {
  before: oldOthers.length,
  after: newOthers.length,
});
for (let i = 0; i < Math.min(oldOthers.length, newOthers.length); i++) {
  const a = oldOthers[i],
    b = newOthers[i],
    ok = a.name === b.name && eq(geom(a.geometry), geom(b.geometry));
  fail(ok, 'Unrelated geometry unchanged', {
    index: i,
    before: a.name,
    after: b.name,
  });
  if (ok) preserved++;
}
report.geometry.unchangedUnrelatedMeshes = preserved;
const rgb = (o) => o.material.color.toArray().join(','),
  m4 = (o) => {
    o.updateMatrix();
    return o.parent
      ? o.matrixWorld
      : o.auditParent.matrixWorld.clone().multiply(o.matrix);
  },
  visible = (o) => {
    for (let p = o; p; p = p.parent || p.auditParent)
      if (!p.visible) return false;
    return true;
  };
for (const layout of ['wide', 'compact'])
  for (const selected of ['projects', 'about']) {
    for (const a of [old, now]) {
      a.model.setLayout(layout);
      a.model.update(1, '', true, {
        activeRoom: selected,
        hoveredWalkway: false,
        hoveredPortal: '',
        travelling: false,
        transitWalkway: false,
      });
      a.model.group.updateMatrixWorld(true);
    }
    const before = new Map(now.source.map((o) => [o, rgb(o)]));
    now.model.update(2, '', true, {
      activeRoom: selected,
      hoveredWalkway: true,
      hoveredPortal: '',
      travelling: false,
    });
    const r = {
      layout,
      selected,
      selectedCabinChanged: [],
      borrowedSelectedChanged: [],
      ladderCoreChanged: false,
      transformsPreserved: 0,
    };
    report.scenarios.push(r);
    for (const o of individual(now)) {
      if (o.userData.section === selected && rgb(o) !== before.get(o))
        r.selectedCabinChanged.push(o.name);
      if (
        o.material.userData.linkedRooms?.includes(selected) &&
        rgb(o) !== before.get(o)
      )
        r.borrowedSelectedChanged.push(o.name);
      if (o.name === rearName) r.ladderCoreChanged = rgb(o) !== before.get(o);
    }
    for (let i = 0; i < oldOthers.length; i++) {
      const ok = eq(m4(oldOthers[i]).toArray(), m4(newOthers[i]).toArray());
      fail(ok, 'Unrelated transform unchanged', {
        layout,
        selected,
        index: i,
        name: oldOthers[i].name,
      });
      if (ok) r.transformsPreserved++;
    }
    fail(
      !r.selectedCabinChanged.length &&
        !r.borrowedSelectedChanged.length &&
        r.ladderCoreChanged,
      'Hover isolates selected cabin from ladder brightening',
      r,
    );
  }
const pose = JSON.parse(
  readFileSync(
    join(root, 'docs/evidence/aligned-cabins/about-oblique-pose.json'),
    'utf8',
  ),
);
for (const section of ['about', 'projects']) {
  const assets = [old, now].map((a) => {
    a.model.setLayout('wide');
    a.model.update(1, '', true, {
      activeRoom: section,
      hoveredWalkway: false,
      hoveredPortal: '',
      travelling: false,
    });
    a.model.group.updateMatrixWorld(true);
    const meshes = individual(a)
      .filter(
        (o) =>
          visible(o) &&
          o.name !== 'walkway-curved-end-pressure-cap-interior' &&
          !o.userData.isInteractionProxy,
      )
      .map((o) => {
        const c = new T.Mesh(o.geometry, o.material);
        c.name = o.name;
        c.source = o;
        c.matrixAutoUpdate = false;
        c.matrix.copy(m4(o));
        c.updateMatrixWorld(true);
        return c;
      });
    a.model.group.traverse((o) => {
      if (o.isInstancedMesh && visible(o)) meshes.push(o);
    });
    const colors = new Map(meshes.map((o) => [o, rgb(o)]));
    a.model.update(2, '', true, {
      activeRoom: section,
      hoveredWalkway: true,
      hoveredPortal: '',
      travelling: false,
    });
    return { meshes, colors };
  });
  const camera = new T.PerspectiveCamera(
    38,
    pose.viewport[0] / pose.viewport[1],
    0.01,
    80,
  );
  camera.position.fromArray(pose.cameraPosition.split(',').map(Number));
  camera.quaternion
    .fromArray(pose.cameraQuaternion.split(',').map(Number))
    .normalize();
  if (section === 'projects') camera.position.y += 3.4;
  camera.updateMatrixWorld(true);
  const ray = new T.Raycaster(),
    r = {
      section,
      rays: 0,
      changedDoorwayBefore: 0,
      changedDoorwayAfter: 0,
      changedRoomSideRearBefore: 0,
      changedRoomSideRearAfter: 0,
      changedActualLadderAfter: 0,
      newMisses: [],
      pointChanges: [],
    };
  report.sightlines.push(r);
  for (let y = 285; y <= 690; y += 15)
    for (let x = 170; x <= 400; x += 5) {
      ray.setFromCamera(
        new T.Vector2(
          (x / pose.viewport[0]) * 2 - 1,
          1 - (y / pose.viewport[1]) * 2,
        ),
        camera,
      );
      const h = assets.map((a) => ray.intersectObjects(a.meshes, false)[0]);
      r.rays++;
      if (h[0] && !h[1]) r.newMisses.push([x, y]);
      if (h[0] && h[1] && h[0].point.distanceTo(h[1].point) > 1e-4)
        r.pointChanges.push({
          pixel: [x, y],
          distance: h[0].point.distanceTo(h[1].point),
        });
      for (let i = 0; i < 2; i++) {
        const hit = h[i];
        if (!hit || assets[i].colors.get(hit.object) === rgb(hit.object))
          continue;
        const name = hit.object.name,
          suffix = i ? 'After' : 'Before',
          localX =
            (hit.point.x - now.model.group.userData.walkwayAnchor[0]) / 1.4;
        if (name === wall || /doorway-reveal/.test(name))
          r['changedDoorway' + suffix]++;
        if (/rear/.test(name) && localX > 0.672)
          r['changedRoomSideRear' + suffix]++;
        if (i && localX < 0.672) r.changedActualLadderAfter++;
      }
    }
  fail(
    r.changedDoorwayBefore > 0 &&
      r.changedDoorwayAfter === 0 &&
      r.changedRoomSideRearBefore > 0 &&
      r.changedRoomSideRearAfter === 0 &&
      r.changedActualLadderAfter > 0,
    'Selected room first-hit lighting isolated while ladder responds',
    r,
  );
  fail(
    !r.newMisses.length && !r.pointChanges.length,
    'Selected room first-hit geometry unchanged',
    {
      section,
      newMisses: r.newMisses.length,
      pointChanges: r.pointChanges.length,
    },
  );
}
writeFileSync(output, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.failures.length ? 1 : 0;
