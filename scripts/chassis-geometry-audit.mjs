import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve, join } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root = resolve(process.argv[2] || process.cwd());
const modelPath = resolve(
  root,
  process.argv[3] || 'features/spacecraft/spacecraft-model.ts',
);
const output = resolve(process.argv[4] || '/tmp/chassis-critic-geometry.json');
const sourceHash = () =>
  createHash('sha256').update(readFileSync(modelPath)).digest('hex');
const initialHash = sourceHash();
const req = createRequire(pathToFileURL(join(root, 'package.json')));
const THREE = await import(pathToFileURL(req.resolve('three')).href);
const { createSpacecraft } = await import(pathToFileURL(modelPath).href);
const model = createSpacecraft(THREE, { projects: [], caseStudies: [] });
const report = {
  sourceSha256: initialHash,
  scope:
    'Independent current rendered chassis mesh checks: geometry finiteness/normals, front aperture clearance, center-web coverage, roof/keel junction coverage, blind-recess closure, directed side-passage clearance, and declared overview containment. No watertightness, mechanical engineering or GPU quality certification.',
  layouts: [],
  failures: [],
};
const visible = (o) => {
  for (let p = o; p; p = p.parent) if (!p.visible) return false;
  return true;
};
const ray = new THREE.Raycaster();
for (const layout of ['wide', 'compact']) {
  model.setLayout(layout);
  model.update(0, '', true, { activeRoom: 'home' });
  model.group.updateMatrixWorld(true);
  const chassis = model.group.getObjectByName('continuous-spacecraft-chassis');
  assert(chassis, 'chassis group missing');
  const meshes = [];
  chassis.traverse((o) => {
    if (o.isMesh && !o.userData.isInteractionProxy && visible(o))
      meshes.push(o);
  });
  const d = model.group.userData.chassis;
  assert(d?.apertures?.length === 4);
  const result = {
    layout,
    meshes: meshes.length,
    vertices: 0,
    finite: true,
    normalLengthRange: [Infinity, 0],
    apertureSamples: 0,
    webSamples: 0,
    sidePassageSamples: 0,
    roofKeelSamples: 0,
    blindRecessSamples: 0,
    overviewContained: true,
  };
  for (const m of meshes) {
    const p = m.geometry.getAttribute('position'),
      n = m.geometry.getAttribute('normal');
    result.vertices += p.count;
    for (let i = 0; i < p.count; i++) {
      if (!Number.isFinite(p.getX(i) + p.getY(i) + p.getZ(i)))
        result.finite = false;
      if (n) {
        const len = Math.hypot(n.getX(i), n.getY(i), n.getZ(i));
        result.normalLengthRange[0] = Math.min(
          result.normalLengthRange[0],
          len,
        );
        result.normalLengthRange[1] = Math.max(
          result.normalLengthRange[1],
          len,
        );
      }
    }
    const b = new THREE.Box3().setFromObject(m),
      o = model.group.userData.overviewBounds;
    for (let i = 0; i < 3; i++)
      if (
        b.min.getComponent(i) < o.min[i] - 1e-5 ||
        b.max.getComponent(i) > o.max[i] + 1e-5
      )
        result.overviewContained = false;
  }
  const cast = (origin, dir, near, far) => {
    ray.set(new THREE.Vector3(...origin), new THREE.Vector3(...dir));
    ray.near = near;
    ray.far = far;
    return ray.intersectObjects(meshes, false);
  };
  for (const a of d.apertures) {
    const rx = a.radius[0],
      ry = a.radius[1];
    const dx = a.size[0] / 2 - rx - 0.06,
      dy = a.size[1] / 2 - ry - 0.06;
    const samples = [];
    for (const sx of [-1, 0, 1])
      for (const sy of [-1, 0, 1]) samples.push([sx * dx, sy * dy]);
    samples.push(
      [a.size[0] / 2 - 0.08, 0],
      [-a.size[0] / 2 + 0.08, 0],
      [0, a.size[1] / 2 - 0.08],
      [0, -a.size[1] / 2 + 0.08],
    );
    for (const [x, y] of samples) {
      result.apertureSamples++;
      const hits = cast(
        [a.center[0] + x, a.center[1] + y, 3],
        [0, 0, -1],
        0,
        2.1,
      );
      if (hits.length)
        report.failures.push({
          layout,
          kind: 'chassis-in-protected-front-aperture',
          room: a.section,
          offset: [x, y],
          hitPoint: hits[0].point.toArray(),
          parts: hits[0].object.userData.parts,
        });
    }
  }
  const minX = Math.min(...d.apertures.map((a) => a.center[0] - a.size[0] / 2)),
    maxX = Math.max(...d.apertures.map((a) => a.center[0] + a.size[0] / 2));
  for (let i = 0; i <= 20; i++)
    for (const y of [-0.08, 0.08, 0.24]) {
      result.webSamples++;
      const x = minX + ((maxX - minX) * i) / 20;
      const hits = cast([x, y, 3], [0, 0, -1], 0, 2.1);
      if (!hits.length)
        report.failures.push({
          layout,
          kind: 'open-gap-in-common-center-web',
          point: [x, y],
        });
    }
  // Sample through the front/envelope/rear depth joins along the straight
  // roof and keel spans. These are bounded surface-coverage checks, not a
  // proof that every intersection or every curved seam is watertight.
  const scaleX = d.apertures[0].size[0] / 2.65;
  const rightX = d.serviceMount.position[0] + 0.015;
  for (let i = 0; i <= 12; i++) {
    const x =
      d.jointX + 0.25 + ((rightX - 0.6 * scaleX - d.jointX - 0.25) * i) / 12;
    for (const z of [-1.25, -0.9, 0, 0.8, 1.08, 1.17, 1.25, 1.3]) {
      for (const sign of [-1, 1]) {
        result.roofKeelSamples++;
        const hits = cast([x, sign * 4, z], [0, -sign, 0], 0, 1.05);
        if (!hits.length)
          report.failures.push({
            layout,
            kind: 'roof-keel-surface-coverage-gap',
            x,
            z,
            sign,
          });
      }
    }
  }
  for (const a of d.apertures.filter((a) => a.center[1] > 0)) {
    for (const offset of [-0.35, 0, 0.35]) {
      for (const y of [-0.04, -0.015, 0.01]) {
        result.blindRecessSamples++;
        const x = a.center[0] + offset * 2.85 * scaleX;
        const hits = cast([x, y, 3], [0, 0, -1], 0, 2.1);
        const frontZ = hits[0]?.point.z;
        if (
          !hits.length ||
          frontZ < d.frontFace.recessFloorZ - 0.035 ||
          frontZ > d.frontFace.maxZ + 0.001
        )
          report.failures.push({
            layout,
            kind: 'blind-recess-floor-missing-or-outside-chassis',
            x,
            y,
            frontZ,
          });
      }
    }
  }
  for (const p of model.group.userData.portals) {
    const sign = p.edge === 'left' ? -1 : 1;
    for (const y of [-0.55, 0, 0.55])
      for (const z of [-0.55, 0, 0.55]) {
        result.sidePassageSamples++;
        const origin = [
          p.position[0] - sign * 0.3,
          p.position[1] + y,
          p.position[2] + z,
        ];
        const hits = cast(origin, [sign, 0, 0], 0.001, 0.9);
        if (hits.length)
          report.failures.push({
            layout,
            kind: 'chassis-obstructs-side-passage',
            portal: p.id,
            origin,
            hitPoint: hits[0].point.toArray(),
            parts: hits[0].object.userData.parts,
          });
      }
  }
  if (
    !result.finite ||
    !result.overviewContained ||
    result.normalLengthRange[0] < 0.99 ||
    result.normalLengthRange[1] > 1.01
  )
    report.failures.push({ layout, kind: 'geometry-or-bounds', result });
  const hardware = [];
  for (const name of [
    'central-docking-assembly',
    'aft-service-assembly',
    'left-vertical-walkway',
  ]) {
    const part = model.group.getObjectByName(name);
    assert(part, 'assembly missing: ' + name);
    let vertices = 0,
      finite = true;
    const normals = [Infinity, 0];
    part.traverse((m) => {
      if (!m.isMesh || !visible(m) || m.userData.isInteractionProxy) return;
      const p = m.geometry.getAttribute('position'),
        n = m.geometry.getAttribute('normal');
      vertices += p.count;
      for (let i = 0; i < p.count; i++) {
        if (!Number.isFinite(p.getX(i) + p.getY(i) + p.getZ(i))) finite = false;
        if (n) {
          const v = Math.hypot(n.getX(i), n.getY(i), n.getZ(i));
          normals[0] = Math.min(normals[0], v);
          normals[1] = Math.max(normals[1], v);
        }
      }
    });
    const box = new THREE.Box3().setFromObject(part),
      bounds = model.group.userData.overviewBounds;
    const contained = [0, 1, 2].every(
      (i) =>
        box.min.getComponent(i) >= bounds.min[i] - 1e-5 &&
        box.max.getComponent(i) <= bounds.max[i] + 1e-5,
    );
    const record = {
      name,
      vertices,
      finite,
      normals,
      overviewContained: contained,
    };
    hardware.push(record);
    if (!finite || normals[0] < 0.99 || normals[1] > 1.01 || !contained)
      report.failures.push({
        layout,
        kind: 'hardware-geometry-or-bounds',
        record,
      });
  }
  result.hardware = hardware;
  report.layouts.push(result);
}
report.sourceUnchangedDuringAudit = sourceHash() === initialHash;
if (!report.sourceUnchangedDuringAudit)
  report.failures.push({ kind: 'source-changed-during-audit' });
report.passed = report.failures.length === 0;
writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(
  JSON.stringify(
    {
      passed: report.passed,
      layouts: report.layouts,
      failures: report.failures.slice(0, 5),
      totalFailures: report.failures.length,
      output,
    },
    null,
    2,
  ),
);
