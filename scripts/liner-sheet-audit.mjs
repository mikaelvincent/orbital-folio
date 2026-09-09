import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve, join } from 'node:path';
const root = resolve(process.argv[2] || process.cwd()),
  candidatePath = resolve(
    process.argv[3] || join(root, 'components/spacecraft-model.ts'),
  ),
  out = resolve(process.argv[4] || '/tmp/liner-sheet-audit.json'),
  baselinePath = process.argv[5]
    ? resolve(process.argv[5])
    : 'git:ebff2d0:components/spacecraft-model.ts';
const req = createRequire(pathToFileURL(join(root, 'package.json'))),
  THREE = await import(pathToFileURL(req.resolve('three')).href),
  ts = req('typescript'),
  sha = (s) => createHash('sha256').update(s).digest('hex');
// Exact source-name exclusions authorized for the independent exterior-label redesign.
// Headers, portal captions and all other cabin source meshes remain protected.
const roomSections = ['projects', 'experience', 'about', 'contact'];
const exteriorLabelSourceNames = [
  'reinforced-lower-nameplate-collar',
  'reinforced-side-nameplate-collar',
  'room-label-backing',
  'side-label-backing',
  'room-label-ceramic-insert',
  'side-label-ceramic-insert',
  'nameplate-amber-clasp',
  'side-nameplate-amber-clasp',
  ...roomSections.flatMap((section) => [
    'hull-plaque-ink-' + section,
    'side-plaque-ink-' + section,
  ]),
];
const exteriorLabelSourceOmissions = new Set(exteriorLabelSourceNames);
const failures = [];
let checks = 0;
const check = (ok, message, detail) => {
    checks++;
    if (!ok) failures.push({ message, detail });
  },
  near = (a, b, t = 1e-6) => Math.abs(a - b) <= t;
async function load(path, providedSource) {
  const source = providedSource ?? readFileSync(path, 'utf8'),
    code = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText;
  return {
    path,
    sha256: sha(source),
    create: (
      await import(
        'data:text/javascript;base64,' + Buffer.from(code).toString('base64')
      )
    ).createSpacecraft,
  };
}
const baseline = await load(
    baselinePath,
    process.argv[5]
      ? undefined
      : execFileSync(
          'git',
          ['-C', root, 'show', 'ebff2d0:components/spacecraft-model.ts'],
          { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 },
        ),
  ),
  candidate = await load(candidatePath),
  report = {
    baseline: { path: baseline.path, sha256: baseline.sha256 },
    candidate: { path: candidate.path, sha256: candidate.sha256 },
    sourceComparison: {
      exactOmittedNames: exteriorLabelSourceNames,
      reason:
        'Authorized hull/side exterior label redesign only. Header and portal source names are not exempt.',
      derivedBatchPolicy:
        'Derived merged output meshes are not source assets; all retained constituent source meshes are independently hashed.',
    },
    layouts: [],
    limits: [
      'CPU geometry/contact/raycast audit; browser verifies appearance.',
      'Source hashes protect four cabin assemblies except the exact exterior-label names reported. Derived batch outputs are excluded to avoid duplicating constituent source geometry; this does not audit events or content changes.',
      'Ray probes use actual generated mesh triangles. Boundary retries use 1e-6 displacement when needed.',
    ],
  };
function canvasStub() {
  globalThis.document = {
    // oxlint-disable-next-line typescript/no-deprecated -- Deterministic CPU canvas stub.
    createElement() {
      const c = new Proxy(
        {},
        {
          get(o, k) {
            if (k in o) return o[k];
            if (k === 'measureText')
              return (text) => ({
                width:
                  text.length *
                  Number((o.font || '10px').match(/[\d.]+(?=px)/)?.[0] || 10) *
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
          return c;
        },
      };
    },
  };
}
function build(factory, layout) {
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
  canvasStub();
  const data = (n) =>
      Array.from({ length: n }, (_, i) => ({
        title: 'Sample ' + i,
        slug: 'item-' + i,
        sample: true,
      })),
    model = factory.create(
      { ...THREE, Mesh },
      {
        layout,
        projects: data(9),
        caseStudies: data(3),
        labels: {
          projects: 'Projects',
          experience: 'Case studies',
          about: 'About',
          contact: 'Contact',
        },
      },
    );
  delete globalThis.document;
  model.update(0, '', true, { activeRoom: 'home', travelling: false });
  model.group.updateMatrixWorld(true);
  const matrix = (o) => {
      o.updateMatrix();
      return o.auditParent
        ? o.auditParent.matrixWorld.clone().multiply(o.matrix)
        : o.matrixWorld.clone();
    },
    bounds = (o) => {
      o.geometry.computeBoundingBox();
      return o.geometry.boundingBox.clone().applyMatrix4(matrix(o));
    },
    find = (name) => sources.find((o) => o.name === name);
  const actualParts = new Set(),
    visible = [];
  model.group.traverse((o) => {
    if (o.isMesh)
      for (const n of o.userData.parts || [o.name]) actualParts.add(n);
  });
  model.group.traverseVisible((o) => {
    if (o.isMesh && o.material.visible) visible.push(o);
  });
  function proxy(o) {
    const p = new THREE.Mesh(o.geometry, o.material);
    p.matrix.copy(matrix(o));
    p.matrixAutoUpdate = false;
    p.updateMatrixWorld(true);
    return p;
  }
  function cabinHash() {
    const omittedCounts = Object.fromEntries(
      exteriorLabelSourceNames.map((name) => [name, 0]),
    );
    let derivedBatchOutputs = 0;
    const roomSources = sources.filter((o) => {
      for (let p = o.auditParent || o.parent; p; p = p.parent)
        if (roomSections.some((section) => p.name === section + '-assembly'))
          return true;
      return false;
    });
    const protectedSources = roomSources.filter((o) => {
      if (o.userData.parts) {
        derivedBatchOutputs++;
        return false;
      }
      if (exteriorLabelSourceOmissions.has(o.name)) {
        check(
          o.material.userData.exterior === true,
          'Exact label omission is exterior material',
          o.name,
        );
        omittedCounts[o.name]++;
        return false;
      }
      return true;
    });
    const protectedHeaderInk = protectedSources
      .filter((o) =>
        roomSections.some(
          (section) => o.name === 'header-plaque-ink-' + section,
        ),
      )
      .map((o) => o.name);
    check(
      protectedHeaderInk.length === 4,
      'All four interior header inks remain protected',
      protectedHeaderInk,
    );
    const rows = protectedSources.map((o) => ({
      name: o.name,
      p: sha(Buffer.from(o.geometry.attributes.position.array.buffer)),
      n: sha(Buffer.from(o.geometry.attributes.normal.array.buffer)),
      index: o.geometry.index
        ? sha(Buffer.from(o.geometry.index.array.buffer))
        : null,
      matrix: matrix(o).toArray(),
      material: o.material.name,
    }));
    return {
      count: rows.length,
      sha256: sha(JSON.stringify(rows)),
      exactOmittedSourceCounts: omittedCounts,
      omittedSourceTotal: Object.values(omittedCounts).reduce(
        (a, b) => a + b,
        0,
      ),
      derivedBatchOutputsNotCompared: derivedBatchOutputs,
      protectedHeaderInk,
    };
  }
  return {
    model,
    sources,
    matrix,
    bounds,
    find,
    actualParts,
    visible,
    proxy,
    cabinHash,
  };
}
function roundedContour(w, h, r) {
  const x = -w / 2,
    y = -h / 2,
    p = new THREE.Shape();
  p.moveTo(x + r, y);
  p.lineTo(x + w - r, y);
  p.quadraticCurveTo(x + w, y, x + w, y + r);
  p.lineTo(x + w, y + h - r);
  p.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  p.lineTo(x + r, y + h);
  p.quadraticCurveTo(x, y + h, x, y + h - r);
  p.lineTo(x, y + r);
  p.quadraticCurveTo(x, y, x + r, y);
  return p.getPoints(16);
}
function insidePolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i],
      b = points[j];
    if (
      a.y > y !== b.y > y &&
      x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside;
  }
  return inside;
}
for (const layout of ['wide', 'compact']) {
  const before = build(baseline, layout),
    after = build(candidate, layout),
    scale = layout === 'wide' ? 1.4 : 1,
    row = { layout };
  report.layouts.push(row);
  row.cabinMeshes = { before: before.cabinHash(), after: after.cabinHash() };
  check(
    row.cabinMeshes.before.sha256 === row.cabinMeshes.after.sha256,
    'Protected cabin source meshes/normals/transforms unchanged after exact exterior-label exclusions',
    layout,
  );
  row.removedLayers = {
    backing: !after.actualParts.has('inner-docking-sealed-bulkhead-backing'),
    innerCap: !after.actualParts.has(
      'walkway-curved-end-pressure-cap-interior',
    ),
  };
  check(
    row.removedLayers.backing && row.removedLayers.innerCap,
    'Redundant layers absent from actual batched model',
    row.removedLayers,
  );
  const extA = before.sources.filter(
      (o) => o.name === 'walkway-curved-end-pressure-cap-exterior',
    ),
    extB = after.sources.filter(
      (o) => o.name === 'walkway-curved-end-pressure-cap-exterior',
    );
  check(
    extA.length === 2 &&
      extB.length === 2 &&
      extA.every((o, i) =>
        ['position', 'normal', 'uv'].every(
          (k) =>
            sha(Buffer.from(o.geometry.attributes[k].array.buffer)) ===
            sha(Buffer.from(extB[i].geometry.attributes[k].array.buffer)),
        ),
      ),
    'Exterior structural cap geometry/normals retained',
  );
  const wall = after.find('walkway-open-docking-wall-interior'),
    gasket = after.find('inner-docking-continuous-gasket'),
    leaf = after.find('inner-docking-closed-pressure-leaf'),
    wallFace = after.bounds(wall).max.x;
  const oldWallFace = before.bounds(
    before.find('walkway-open-docking-wall-interior'),
  ).max.x;
  row.hatchDepth = {
    oldBackingProud:
      before.bounds(before.find('inner-docking-sealed-bulkhead-backing')).max
        .x - oldWallFace,
    gasketFrontRelativeToWall: after.bounds(gasket).max.x - wallFace,
    leafFrontRelativeToWall: after.bounds(leaf).max.x - wallFace,
  };
  check(
    row.hatchDepth.gasketFrontRelativeToWall < -0.005,
    'Gasket rim recessed behind actual wall face',
    row.hatchDepth,
  );
  check(
    row.hatchDepth.leafFrontRelativeToWall < 0.032,
    'Leaf has restrained wall-relative projection',
    row.hatchDepth,
  );
  const sealMeshes = [after.proxy(gasket), after.proxy(leaf)],
    opening = roundedContour(1.82, 1.9, 0.79);
  let rayCount = 0;
  const holes = [],
    retries = [];
  for (let j = 0; j < 31; j++)
    for (let i = 0; i < 31; i++) {
      const u = -0.9 + i * 0.06,
        v = -0.9 + j * 0.06;
      if (!insidePolygon(u, v, opening)) continue;
      const origin = new THREE.Vector3(wallFace + 0.45, v + 0.03, -u),
        ray = new THREE.Raycaster(origin, new THREE.Vector3(-1, 0, 0), 0, 0.75);
      let hits = ray.intersectObjects(sealMeshes, false);
      rayCount++;
      if (!hits.length) {
        hits = new THREE.Raycaster(
          origin.clone().add(new THREE.Vector3(0, 1e-6, -1e-6)),
          new THREE.Vector3(-1, 0, 0),
          0,
          0.75,
        ).intersectObjects(sealMeshes, false);
        retries.push([u, v]);
      }
      if (!hits.length) holes.push([u, v]);
    }
  row.hatchSeal = { rays: rayCount, holes, boundaryRetries: retries };
  check(
    holes.length === 0,
    'Recessed leaf/gasket seal actual opening contour',
    row.hatchSeal,
  );
  // Every shoulder strip rear edge is coincident with the flat rear liner edge.
  const liner = after.find('walkway-continuous-rear-liner');
  check(
    wall.material === liner.material,
    'Dock wall and shoulder lining share the same actual interior material',
  );
  const p = liner.geometry.attributes.position,
    ix = liner.geometry.index,
    flatEdges = new Set(),
    wallEdges = new Set();
  const key = (i) =>
    [p.getX(i), p.getY(i), p.getZ(i)].map((v) => Math.round(v * 1e6)).join(',');
  let finite = true,
    degenerate = 0;
  for (let t = 0; t < ix.count; t += 3) {
    const ids = [0, 1, 2].map((j) => ix.getX(t + j)),
      v = ids.map((i) => new THREE.Vector3().fromBufferAttribute(p, i));
    finite &&= v.every((a) => a.toArray().every(Number.isFinite));
    if (v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])).lengthSq() < 1e-20)
      degenerate++;
    const flat = v.every((a) => near(a.z, -0.965)),
      wall = v.some((a) => a.z > -0.965 + 1e-4);
    for (let j = 0; j < 3; j++) {
      const a = ids[j],
        b = ids[(j + 1) % 3];
      if (near(p.getZ(a), -0.965) && near(p.getZ(b), -0.965)) {
        const edge = [key(a), key(b)].sort().join('|');
        if (flat) flatEdges.add(edge);
        if (wall) wallEdges.add(edge);
      }
    }
  }
  row.liner = {
    triangles: ix.count / 3,
    finiteVertices: finite,
    degenerateTriangles: degenerate,
    rearJoinEdges: wallEdges.size,
    rearJoinsMatched: [...wallEdges].filter((e) => flatEdges.has(e)).length,
  };
  check(
    finite && degenerate === 0,
    'Liner triangles finite and nondegenerate',
    row.liner,
  );
  check(
    wallEdges.size >= 32 && [...wallEdges].every((e) => flatEdges.has(e)),
    'Shoulder returns meet rear lining without any open rear seam',
    row.liner,
  );
  // Probe the exact front wrap points against the visible shared fascia.
  const fascia = after.visible.filter((o) =>
      o.userData.parts?.includes('one-piece-five-aperture-pressure-face'),
    ),
    mat = after.matrix(liner),
    frontPoints = [];
  for (let i = 0; i < p.count; i++)
    if (near(p.getZ(i), 1.12) && Math.abs(p.getY(i)) > 1.039)
      frontPoints.push(
        new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(mat),
      );
  const frontMisses = [];
  for (const point of frontPoints) {
    const hit = new THREE.Raycaster(
      new THREE.Vector3(point.x, point.y, 1.6),
      new THREE.Vector3(0, 0, -1),
      0,
      0.49,
    ).intersectObjects(fascia, false);
    if (!hit.length) frontMisses.push(point.toArray());
  }
  row.frontFasciaContact = {
    frontPoints: frontPoints.length,
    misses: frontMisses.length,
    examples: frontMisses.slice(0, 4),
  };
  check(
    frontMisses.length === 0,
    'Shoulder front ends are buried in shared fascia',
    row.frontFasciaContact,
  );
  const passageObstructions = [];
  let passageRays = 0;
  const linerProxy = after.proxy(liner),
    walkwayX = after.model.group.userData.walkwayAnchor[0];
  for (const centerY of [-1.7, 1.7])
    for (const dy of [-0.55, 0, 0.55])
      for (const z of [-0.55, 0.16, 0.65]) {
        const origin = new THREE.Vector3(
            walkwayX - 0.1 * scale,
            centerY + dy,
            z,
          ),
          hits = new THREE.Raycaster(
            origin,
            new THREE.Vector3(1, 0, 0),
            0,
            1.5 * scale,
          ).intersectObject(linerProxy, false);
        passageRays++;
        if (hits.length) passageObstructions.push({ centerY, dy, z });
      }
  row.cabinPassageClearance = {
    rays: passageRays,
    obstructions: passageObstructions,
  };
  check(
    passageObstructions.length === 0,
    'New lining leaves both cabin passage corridors open',
    row.cabinPassageClearance,
  );

  const newLeaf = after.bounds(leaf),
    landing = after.sources.find(
      (o) =>
        o.name === 'walkway-room-landing' &&
        after.bounds(o).getCenter(new THREE.Vector3()).y > 0,
    );
  row.landingLeafClearance = after.bounds(landing).min.x - newLeaf.max.x;
  check(
    row.landingLeafClearance > 0.15,
    'Landing clears recessed door',
    row.landingLeafClearance,
  );
  const liveTriangles = (x) => {
    let n = 0;
    x.model.group.traverseVisible((o) => {
      if (o.isMesh && o.material.visible)
        n +=
          ((o.geometry.index?.count || o.geometry.attributes.position.count) /
            3) *
          (o.isInstancedMesh ? o.count : 1);
    });
    return n;
  };
  row.visibleTriangleInventory = {
    before: liveTriangles(before),
    after: liveTriangles(after),
  };
}
report.candidateSourceStillCurrent =
  sha(readFileSync(candidatePath, 'utf8')) === report.candidate.sha256;
report.checks = checks;
report.failures = failures;
report.passed = failures.length === 0;
writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
assert(report.passed, 'Inspect sheet-removal audit results');
