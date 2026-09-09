import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve, join } from 'node:path';
// Usage: node audit.mjs [repo] [candidate-model.ts] [output.json] [baseline-model.ts]
const root = resolve(process.argv[2] || process.cwd());
const candidatePath = resolve(
  process.argv[3] || join(root, 'components/spacecraft-model.ts'),
);
const outputPath = resolve(
  process.argv[4] || '/tmp/ladder-docking-geometry-audit.json',
);
const baselinePath = process.argv[5]
  ? resolve(process.argv[5])
  : 'git:bb326e6:components/spacecraft-model.ts';
const req = createRequire(pathToFileURL(join(root, 'package.json'))),
  THREE = await import(pathToFileURL(req.resolve('three')).href),
  ts = req('typescript');
const sha = (s) => createHash('sha256').update(s).digest('hex'),
  failures = [];
let checks = 0;
const check = (ok, msg, detail) => {
    checks++;
    if (!ok) failures.push({ msg, detail });
  },
  near = (a, b, t = 1e-6) => Math.abs(a - b) < t;
function stub() {
  globalThis.document = {
    // oxlint-disable-next-line typescript/no-deprecated -- Scoped CPU canvas stub.
    createElement() {
      const context = new Proxy(
        {},
        {
          get(o, k) {
            if (k in o) return o[k];
            if (k === 'measureText')
              return (s) => ({
                width:
                  s.length *
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
          return context;
        },
      };
    },
  };
}
async function load(path, providedSource) {
  const source = providedSource ?? readFileSync(path, 'utf8'),
    output = ts.transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ES2022,
      },
    }).outputText;
  return {
    path,
    sha256: sha(source),
    create: (
      await import(
        'data:text/javascript;base64,' + Buffer.from(output).toString('base64')
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
          ['-C', root, 'show', 'bb326e6:components/spacecraft-model.ts'],
          { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 },
        ),
  ),
  candidate = await load(candidatePath);
const report = {
  outputPath,
  fixture: {
    layoutModes: ['wide', 'compact'],
    state: 'home overview, no hover, no reading',
    projects: 9,
    caseStudies: 3,
    canvas: 'CPU text stub',
  },
  baseline: { path: baseline.path, sha256: baseline.sha256 },
  candidate: { path: candidate.path, sha256: candidate.sha256 },
  limits: [
    'CPU geometry/material execution; no browser or image-quality claim.',
    'Closed-volume edge proof welds vertices to 1e-6 world units. Contact/clearance checks use triangle samples, known construction contours and/or explicitly named AABB bounds as recorded.',
    'Cabin preservation is owned by the separate root audit; no whole-cabin equality assertion is made here.',
    'Visibility counts follow Object3D ancestor visibility, material visibility, geometry groups and draw range. They are eligible submissions before camera frustum/layer filtering, render overrides, shadow passes or driver accounting; no renderer.info values are claimed.',
  ],
  layouts: [],
};
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
  stub();
  const records = (n) =>
    Array.from({ length: n }, (_, i) => ({
      title: 'Sample ' + i,
      slug: 'sample-' + i,
      sample: true,
    }));
  const model = factory.create(
    { ...THREE, Mesh },
    {
      layout,
      projects: records(9),
      caseStudies: records(3),
      labels: {
        projects: 'Projects',
        experience: 'Case studies',
        about: 'About',
        contact: 'Contact',
      },
      vesselName: 'portfolio.example',
    },
  );
  delete globalThis.document;
  model.update(0, '', true, { activeRoom: 'home', travelling: false });
  model.group.updateMatrixWorld(true);
  const sourceMatrix = (o) => {
    o.updateMatrix();
    return o.auditParent
      ? o.auditParent.matrixWorld.clone().multiply(o.matrix)
      : o.matrixWorld.clone();
  };
  const bounds = (o) => {
    o.geometry.computeBoundingBox();
    return o.geometry.boundingBox.clone().applyMatrix4(sourceMatrix(o));
  };
  const find = (name) => sources.find((o) => o.name === name),
    all = (name) => sources.filter((o) => o.name === name);
  const stats = {
    meshObjects: 0,
    interactionProxyObjects: 0,
    hiddenByAncestorOrObject: 0,
    visibleObjectsWithDisabledMaterial: 0,
    eligibleVisibleMeshObjects: 0,
    eligibleRenderSubmissionsBeforeFrustum: 0,
    eligibleTrianglesBeforeFrustum: 0,
    allSceneTrianglesIncludingHidden: 0,
    allSceneVertexInstancesIncludingHidden: 0,
    lights: [],
  };
  const inheritedVisible = (o) => {
    for (let p = o; p; p = p.parent) if (!p.visible) return false;
    return true;
  };
  model.group.traverse((o) => {
    if (o.isLight) stats.lights.push({ type: o.type, intensity: o.intensity });
    if (!o.isMesh) return;
    stats.meshObjects++;
    if (o.userData.isInteractionProxy) stats.interactionProxyObjects++;
    const geometry = o.geometry,
      available =
        geometry.index?.count || geometry.getAttribute('position')?.count || 0,
      instances = o.isInstancedMesh ? o.count : 1;
    stats.allSceneTrianglesIncludingHidden += (available / 3) * instances;
    stats.allSceneVertexInstancesIncludingHidden +=
      (geometry.getAttribute('position')?.count || 0) * instances;
    if (!inheritedVisible(o)) {
      stats.hiddenByAncestorOrObject++;
      return;
    }
    const array = Array.isArray(o.material),
      groups = array
        ? geometry.groups
        : [{ start: 0, count: available, materialIndex: 0 }],
      materials = array ? o.material : [o.material];
    let submitted = false;
    for (const group of groups) {
      const material = materials[group.materialIndex || 0];
      if (!material || !material.visible) continue;
      const start = Math.max(0, group.start, geometry.drawRange.start),
        end = Math.min(
          available,
          group.start + group.count,
          geometry.drawRange.start + geometry.drawRange.count,
        ),
        count = Math.max(0, end - start);
      if (count < 3 || instances < 1) continue;
      submitted = true;
      const passes =
        material.transparent &&
        material.side === THREE.DoubleSide &&
        !material.forceSinglePass
          ? 2
          : 1;
      stats.eligibleRenderSubmissionsBeforeFrustum += passes;
      stats.eligibleTrianglesBeforeFrustum +=
        Math.floor(count / 3) * instances * passes;
    }
    if (submitted) stats.eligibleVisibleMeshObjects++;
    else stats.visibleObjectsWithDisabledMaterial++;
  });
  return { model, sources, bounds, sourceMatrix, find, all, stats };
}
for (const layout of ['wide', 'compact']) {
  const before = build(baseline, layout),
    after = build(candidate, layout),
    s = layout === 'wide' ? 1.4 : 1,
    row = { layout, before: before.stats, after: after.stats };
  report.layouts.push(row);
  check(
    JSON.stringify(before.stats.lights) === JSON.stringify(after.stats.lights),
    'No light changes',
    layout,
  );
  const metadata = after.model.group.userData,
    wall = metadata.dockingAnchors.wall,
    walkway = metadata.walkwayAnchor;
  check(
    near(wall[0], walkway[0] - 0.75 * s) &&
      near(wall[1], 0.03) &&
      near(wall[2], 0),
    'Dock mount derives from actual ladder wall',
    { layout, wall, walkway },
  );
  const mount = after.find('coaxial-docking-load-bearing-mount'),
    sleeve = after.find('rounded-docking-pressure-sleeve'),
    innerLeaf = after.find('inner-docking-closed-pressure-leaf'),
    innerBacking = after.find('inner-docking-sealed-bulkhead-backing'),
    diaphragm = after.find('docking-mount-pressure-diaphragm');
  const center = (o) =>
    new THREE.Vector3().setFromMatrixPosition(after.sourceMatrix(o)).toArray();
  row.axes = {
    mount: center(mount),
    sleeve: center(sleeve),
    innerLeaf: center(innerLeaf),
    innerBacking: center(innerBacking),
    diaphragm: center(diaphragm),
    wall,
  };
  check(
    Object.values(row.axes).every((v) => near(v[1], 0.03) && near(v[2], 0)),
    'All dock assembly centers have identical Y/Z axis',
    row.axes,
  );
  check(
    near(center(mount)[0], metadata.dockingAnchors.mount[0]),
    'Mount metadata matches real mesh origin',
  );
  check(
    near(center(sleeve)[0], metadata.dockingAnchors.sleeve[0]),
    'Sleeve metadata matches real mesh origin',
  );
  check(
    near(
      center(innerBacking)[0] + 0.025,
      metadata.dockingAnchors.innerHatch[0],
    ),
    'Inner-hatch metadata matches actual assembly',
  );
  const bm = after.bounds(mount),
    bs = after.bounds(sleeve),
    bd = after.bounds(diaphragm);
  row.mountContact = {
    mountX: [bm.min.x, bm.max.x],
    wallX: wall[0],
    wallThickness: 0.156 * s,
    sleeveX: [bs.min.x, bs.max.x],
    diaphragmX: [bd.min.x, bd.max.x],
    sleeveInboardFromWall: bs.max.x - wall[0],
    mountWallOverlap:
      Math.min(bm.max.x, wall[0] + 0.078 * s) -
      Math.max(bm.min.x, wall[0] - 0.078 * s),
  };
  check(
    row.mountContact.mountWallOverlap > 0.1,
    'Coaxial mount is seated through wall thickness',
    row.mountContact,
  );
  check(
    bs.max.x > bm.min.x && bs.max.x < bm.max.x && bd.max.x > bm.min.x,
    'Sleeve end and sealed diaphragm overlap mounted flange',
    row.mountContact,
  );
  // Ray-test the sealed doorway from the passage along its true axis.
  const rayMesh = innerLeaf.clone();
  rayMesh.matrix.copy(after.sourceMatrix(innerLeaf));
  rayMesh.matrixAutoUpdate = false;
  rayMesh.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(
    new THREE.Vector3(wall[0] + 0.8, 0.03, 0),
    new THREE.Vector3(-1, 0, 0),
  );
  row.sealedLeafAxisHits = ray.intersectObject(rayMesh, false).length;
  check(
    row.sealedLeafAxisHits > 0,
    'Actual inner-leaf triangles seal docking centerline',
    layout,
  );
  const sealParts = [
    mount,
    diaphragm,
    after.find('docking-mount-seated-retaining-ring'),
  ].map((o) => {
    const m = o.clone();
    m.matrix.copy(after.sourceMatrix(o));
    m.matrixAutoUpdate = false;
    m.updateMatrixWorld(true);
    return m;
  });
  const missed = [],
    boundaryRetries = [];
  let sealRays = 0;
  for (const radius of [0, 0.4, 0.85, 0.9, 0.92, 0.94, 0.96, 1.02])
    for (let i = 0; i < 24; i++) {
      const angle = (i * Math.PI) / 12,
        origin = new THREE.Vector3(
          wall[0] + 0.5,
          0.03 + Math.cos(angle) * radius,
          Math.sin(angle) * radius,
        );
      const hit = new THREE.Raycaster(
        origin,
        new THREE.Vector3(-1, 0, 0),
        0,
        1,
      ).intersectObjects(sealParts, false);
      sealRays++;
      if (!hit.length) {
        const retry = new THREE.Raycaster(
          origin.clone().add(new THREE.Vector3(0, 1e-7, -1e-7)),
          new THREE.Vector3(-1, 0, 0),
          0,
          1,
        ).intersectObjects(sealParts, false);
        boundaryRetries.push({ radius, angle, recovered: retry.length > 0 });
        if (!retry.length) missed.push({ radius, angle });
      }
    }
  row.pressureSealSampling = {
    rays: sealRays,
    boundaryRetries,
    missed,
    radialOverlap: 0.948 - 0.915,
  };
  check(
    missed.length === 0,
    'Mounted ring and diaphragm seal the whole sampled circular cross-section',
    row.pressureSealSampling,
  );

  function landingRecord(asset) {
    const top = asset
        .all('walkway-room-landing')
        .find((o) => asset.bounds(o).getCenter(new THREE.Vector3()).y > 0),
      leaf = asset.find('inner-docking-closed-pressure-leaf'),
      a = asset.bounds(top),
      b = asset.bounds(leaf),
      size = a.clone().intersect(b).getSize(new THREE.Vector3());
    return {
      landingX: [a.min.x, a.max.x],
      leafX: [b.min.x, b.max.x],
      overlapXYZ: size.toArray(),
      xClearance: a.min.x - b.max.x,
    };
  }
  row.landing = { before: landingRecord(before), after: landingRecord(after) };
  check(
    row.landing.before.overlapXYZ.every((v) => v > 0),
    'Baseline top landing intersects inner leaf bounds',
    row.landing.before,
  );
  check(
    row.landing.after.xClearance > 0.14,
    'Candidate landing completely clears leaf in X',
    row.landing.after,
  );
  const rightWallX = walkway[0] + 0.75 * s,
    cleats = after.all('walkway-landing-wall-cleat');
  check(cleats.length === 2, 'Both ladder landings have attached cleats');
  row.cleatContacts = cleats.map((o) => {
    const b = after.bounds(o);
    return {
      wallOverlap:
        Math.min(b.max.x, rightWallX + 0.078 * s) -
        Math.max(b.min.x, rightWallX - 0.078 * s),
      boundsX: [b.min.x, b.max.x],
    };
  });
  check(
    row.cleatContacts.every((c) => c.wallOverlap > 0.04 * s),
    'Landing cleats meet actual right wall',
    row.cleatContacts,
  );
  const stands = after.all('walkway-ladder-rigid-stand-off');
  row.ladderSupports = stands.map((o) => {
    const b = after.bounds(o);
    return {
      rearPenetration: -0.965 - b.min.z,
      railOverlap: b.max.z - -0.719,
      center: center(o),
    };
  });
  check(
    stands.length === 8 &&
      row.ladderSupports.every(
        (r) => r.rearPenetration >= 0.0049 && r.railOverlap >= 0.0189,
      ),
    'All ladder stand-offs penetrate liner and rail bounds',
    row.ladderSupports,
  );
  // A closed manifold must have exactly two directed-opposite incidences per welded edge.
  const liner = after.find('walkway-continuous-rear-liner'),
    back = after.find('walkway-rear-pressure-shell-exterior'),
    edges = new Map();
  let faceCount = 0,
    degenerate = 0,
    finite = true;
  const frontNormals = [];
  const key = (v) => [v.x, v.y, v.z].map((n) => Math.round(n * 1e6)).join(',');
  for (const mesh of [liner, back]) {
    const p = mesh.geometry.getAttribute('position'),
      ix = mesh.geometry.index;
    for (let i = 0; i < ix.count; i += 3) {
      const v = [0, 1, 2].map((j) =>
        new THREE.Vector3().fromBufferAttribute(p, ix.getX(i + j)),
      );
      finite &&= v.every((q) => q.toArray().every(Number.isFinite));
      const cross = v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0]));
      if (cross.lengthSq() < 1e-20) degenerate++;
      if (v.every((q) => near(q.z, -0.965)) && cross.lengthSq() > 1e-20)
        frontNormals.push(cross.z);
      faceCount++;
      for (let j = 0; j < 3; j++) {
        const a = key(v[j]),
          b = key(v[(j + 1) % 3]),
          k = [a, b].sort().join('|');
        const list = edges.get(k) || [];
        list.push(a + '>' + b);
        edges.set(k, list);
      }
    }
  }
  const badEdges = [...edges].filter(
    ([_k, v]) => v.length !== 2 || v[0] === v[1],
  );
  row.rearLiner = {
    triangles: faceCount,
    weldedEdges: edges.size,
    unpairedOrSameDirectionEdges: badEdges.length,
    degenerateTriangles: degenerate,
    finiteVertices: finite,
    frontFacingTriangles: frontNormals.filter((n) => n > 0).length,
    totalFrontTriangles: frontNormals.length,
  };
  check(
    finite && degenerate === 0 && badEdges.length === 0,
    'Rear liner and return form a closed, consistently wound solid',
    row.rearLiner,
  );
  check(
    frontNormals.length > 0 && frontNormals.every((n) => n > 0),
    'Visible rear liner faces the opening',
    row.rearLiner,
  );
  // Cubic shoulder samples are shared by cap and rear return at their outer seam.
  const lp = liner.geometry.getAttribute('position'),
    cap = after.sources.filter((o) =>
      o.name.startsWith('walkway-curved-end-pressure-cap'),
    );
  row.sharedContour = {
    shellOuterLeft: -0.75 * s,
    shellTop: 3.2,
    shellDepth: 2.42,
    linerOuterBackZ: -1.21,
    sideWallLeft: wall[0],
    innerFrontZ: -0.965,
  };
  const localBackPoints = Array.from({ length: lp.count }, (_, i) =>
    new THREE.Vector3().fromBufferAttribute(lp, i),
  ).filter((v) => near(v.z, -1.21));
  const contains = (x, y) =>
    localBackPoints.some((v) => near(v.x, x, 1e-5) && near(v.y, y, 1e-5));
  check(
    contains(-0.75, 1.06) &&
      contains(-0.75, -1.06) &&
      contains(0.6, 3.2) &&
      contains(0.6, -3.2),
    'Rear return shares all four exact shoulder endpoints',
  );
  check(
    cap.length === 4,
    'Existing hollow top/bottom shell pressure caps preserved',
  );
}
report.checks = checks;
report.failures = failures;
report.passed = failures.length === 0;
report.candidateSourceStillCurrent =
  sha(readFileSync(candidatePath, 'utf8')) === report.candidate.sha256;
writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
assert(report.passed, 'Inspect geometry audit failures');
