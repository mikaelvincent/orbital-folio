/**
 * CPU-only shoulder audit against the original bb326e6 model.
 * node audit.mjs [repo] [candidate-model.ts] [output.json] [optional-baseline-model.ts]
 * No checkout writes, browser launch, or whole-model equality assertion.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const root = resolve(process.argv[2] || process.cwd());
const candidatePath = resolve(
  process.argv[3] || join(root, 'components/spacecraft-model.ts'),
);
const outputPath = resolve(
  process.argv[4] || '/tmp/shoulder-normals-final-audit.json',
);
const baselinePath = process.argv[5]
  ? resolve(process.argv[5])
  : 'git:bb326e6:components/spacecraft-model.ts';
const req = createRequire(pathToFileURL(join(root, 'package.json')));
const THREE = await import(pathToFileURL(req.resolve('three')).href);
const ts = req('typescript');
const sha = (x) => createHash('sha256').update(x).digest('hex');
const hashAttribute = (a) =>
  a
    ? sha(Buffer.from(a.array.buffer, a.array.byteOffset, a.array.byteLength))
    : null;
const checkFailures = [];
let checks = 0;
function check(condition, message, detail) {
  checks++;
  if (!condition) checkFailures.push({ message, detail });
}
const capNames = [
  'walkway-curved-end-pressure-cap-exterior',
  'walkway-curved-end-pressure-cap-interior',
];
async function build(path, source) {
  const code = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
  }).outputText;
  const { createSpacecraft } = await import(
    'data:text/javascript;base64,' + Buffer.from(code).toString('base64')
  );
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
  createSpacecraft({ ...THREE, Mesh }, { layout: 'wide' });
  return {
    path,
    sha256: sha(source),
    sources: sources.filter((o) => capNames.includes(o.name)),
  };
}
// Capture bytes before execution, so source hashing is robust to concurrent formatting.
const baselineSource = process.argv[5]
  ? readFileSync(baselinePath, 'utf8')
  : execFileSync(
      'git',
      ['-C', root, 'show', 'bb326e6:components/spacecraft-model.ts'],
      { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 },
    );
const candidateSource = readFileSync(candidatePath, 'utf8');
const before = await build(baselinePath, baselineSource);
const after = await build(candidatePath, candidateSource);
const report = {
  baseline: { path: before.path, sha256: before.sha256 },
  candidate: { path: after.path, sha256: after.sha256 },
  threeRevision: THREE.REVISION,
  scope:
    'All four pre-batch outer/inner shoulder-cap source meshes: longitudinal normal smoothing is intentional on both sides. Other model geometry may intentionally differ.',
  caps: [],
  limits: [
    'CPU geometry and normal-vector proof; actual browser evidence verifies the resulting shading.',
    'No global geometry equality, cabin-preservation, draw-call, GPU-memory or frame-time assertion.',
    'Shared-vertex grouping rounds local positions to 1e-6. Eligible longitudinal normals have |z| <= 1e-5; smooth comparisons exclude deliberate >=45 degree creases.',
  ],
};
for (const name of capNames) {
  const a = before.sources.filter((o) => o.name === name);
  const b = after.sources.filter((o) => o.name === name);
  check(
    a.length === 2 && b.length === 2,
    'Both upper/lower cap sources exist',
    { name, baseline: a.length, candidate: b.length },
  );
  for (let part = 0; part < Math.min(a.length, b.length); part++) {
    const original = a[part],
      updated = b[part];
    const p = original.geometry.getAttribute('position');
    const q = updated.geometry.getAttribute('position');
    const n = original.geometry.getAttribute('normal');
    const next = updated.geometry.getAttribute('normal');
    const row = {
      name,
      part: part === 0 ? 'lower' : 'upper',
      vertices: p.count,
      indices: original.geometry.index?.count ?? null,
      positionsUnchanged: hashAttribute(p) === hashAttribute(q),
      indicesUnchanged:
        hashAttribute(original.geometry.index) ===
        hashAttribute(updated.geometry.index),
      uvsUnchanged:
        hashAttribute(original.geometry.getAttribute('uv')) ===
        hashAttribute(updated.geometry.getAttribute('uv')),
      normalCountUnchanged: n.count === next.count,
    };
    report.caps.push(row);
    check(row.positionsUnchanged, 'Exact cap positions unchanged', {
      name,
      part,
    });
    check(row.indicesUnchanged, 'Exact cap indices unchanged', { name, part });
    check(row.uvsUnchanged, 'Exact cap UVs unchanged', { name, part });
    check(row.normalCountUnchanged, 'Cap normal count unchanged', {
      name,
      part,
    });
    check(
      original.material.userData.exterior ===
        updated.material.userData.exterior,
      'Pressure lighting classification unchanged',
      { name, part },
    );
    if (!row.positionsUnchanged || !row.normalCountUnchanged) continue;
    Object.assign(row, {
      changedEligibleVertices: 0,
      ineligibleBevelOrEndNormals: 0,
      ineligibleNormalChanges: 0,
      maxUnitLengthError: 0,
      maxNormalJumpBeforeDeg: 0,
      maxNormalJumpAfterDeg: 0,
      smoothEdgeComparisons: 0,
    });
    const buckets = new Map();
    for (let i = 0; i < p.count; i++) {
      const oldNormal = new THREE.Vector3().fromBufferAttribute(n, i);
      const newNormal = new THREE.Vector3().fromBufferAttribute(next, i);
      row.maxUnitLengthError = Math.max(
        row.maxUnitLengthError,
        Math.abs(newNormal.length() - 1),
      );
      check(
        newNormal.toArray().every(Number.isFinite),
        'Normal components finite',
        { name, part, vertex: i },
      );
      if (Math.abs(oldNormal.z) > 1e-5) {
        row.ineligibleBevelOrEndNormals++;
        if (oldNormal.distanceToSquared(newNormal) > 0)
          row.ineligibleNormalChanges++;
        continue;
      }
      if (oldNormal.distanceTo(newNormal) > 1e-6) row.changedEligibleVertices++;
      const key = [p.getX(i), p.getY(i), p.getZ(i)]
        .map((v) => Math.round(v * 1e6))
        .join(',');
      const group = buckets.get(key) || [];
      group.push({ oldNormal, newNormal });
      buckets.set(key, group);
    }
    for (const group of buckets.values())
      for (let i = 0; i < group.length; i++)
        for (let j = i + 1; j < group.length; j++) {
          const x = group[i],
            y = group[j],
            angle = x.oldNormal.angleTo(y.oldNormal);
          if (angle < 1e-5 || angle >= Math.PI / 4) continue;
          row.smoothEdgeComparisons++;
          row.maxNormalJumpBeforeDeg = Math.max(
            row.maxNormalJumpBeforeDeg,
            (angle * 180) / Math.PI,
          );
          row.maxNormalJumpAfterDeg = Math.max(
            row.maxNormalJumpAfterDeg,
            (x.newNormal.angleTo(y.newNormal) * 180) / Math.PI,
          );
        }
    check(
      row.changedEligibleVertices > 0,
      'Eligible longitudinal normals changed',
      { name, part },
    );
    check(
      row.ineligibleNormalChanges === 0,
      'Exact bevel/end normals unchanged',
      { name, part },
    );
    check(row.maxUnitLengthError < 1e-6, 'Normals retain unit length', {
      name,
      part,
    });
    check(
      row.smoothEdgeComparisons > 0 && row.maxNormalJumpAfterDeg < 0.001,
      'Eligible curved-face joins are smooth',
      { name, part, residualDegrees: row.maxNormalJumpAfterDeg },
    );
  }
}
report.checks = checks;
report.failures = checkFailures;
report.passed = checkFailures.length === 0;
report.candidateSourceStillCurrent =
  sha(readFileSync(candidatePath, 'utf8')) === report.candidate.sha256;
writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
console.log(
  JSON.stringify(
    {
      outputPath,
      passed: report.passed,
      sourceSha256: report.candidate.sha256,
      candidateSourceStillCurrent: report.candidateSourceStillCurrent,
      caps: report.caps,
      failures: report.failures,
    },
    null,
    2,
  ),
);
assert(report.passed, 'Shoulder-cap audit failed; inspect output JSON');
