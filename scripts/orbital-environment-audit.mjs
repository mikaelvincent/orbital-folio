/** Read-only correctness audit; no GPU benchmark or full-size weather bake.
 * node scripts/orbital-environment-audit.mjs REPO_ROOT [ARTIFACT] [REPORT]
 * ARTIFACT defaults to production; its imports are bundled in memory.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';

const root = resolve(process.argv[2] ?? process.cwd());
const artifact = resolve(
  process.argv[3] ?? join(root, 'components/orbital-environment.ts'),
);
const output = resolve(
  process.argv[4] ?? '/tmp/orbital-environment-audit.json',
);
const sourcePaths = [
  artifact,
  join(root, 'components/earth-satellite.ts'),
  join(root, 'components/cloud-volume.ts'),
  join(root, 'scripts/benchmarks/satellite-volume-reference.ts'),
  join(root, 'tests/earth-environment.test.mjs'),
  join(root, 'tests/earth-satellite.test.mjs'),
  join(root, 'lib/cloud-field.ts'),
  join(root, 'lib/satellite-cloud-field.ts'),
  join(root, 'lib/cloud-field-codec.ts'),
  join(root, 'tests/cloud-environment.test.mjs'),
  join(root, 'tests/cloud-field-codec.test.mjs'),
  join(root, 'tests/satellite-cloud-field.test.mjs'),
];
const sources = sourcePaths.map((path) => ({
  path,
  sha256: createHash('sha256').update(readFileSync(path)).digest('hex'),
}));
const result = spawnSync(
  process.execPath,
  [
    '--test',
    '--test-concurrency=1',
    'tests/earth-environment.test.mjs',
    'tests/earth-satellite.test.mjs',
    'tests/cloud-environment.test.mjs',
    'tests/cloud-field-codec.test.mjs',
    'tests/satellite-cloud-field.test.mjs',
  ],
  {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, ORBITAL_EARTH_AUDIT_ARTIFACT: artifact },
    maxBuffer: 8 * 1024 * 1024,
  },
);
const report = {
  schemaVersion: 2,
  at: new Date().toISOString(),
  scope:
    'CPU correctness: production satellite image loading, color/orientation, cancellation, surface lifetime and transforms; retained reference cloud material/volume, injected atlas, resize/animation, memory accounting, resource disposal, asynchronous delivery/cancellation, small deterministic bakes, satellite-mask conversion, shipped atlas/source hashes and distribution guards, and lossless codec. No full-size field bake, GPU compilation, rendered appearance, thermal or performance claim.',
  passed: result.status === 0,
  exitCode: result.status,
  signal: result.signal,
  sources,
  stdout: result.stdout ?? '',
  stderr: result.stderr ?? '',
  error: result.error?.message ?? null,
};
writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
process.stdout.write(report.stdout);
if (report.stderr) process.stderr.write(report.stderr);
console.log(
  `Cloud correctness audit: ${report.passed ? 'passed' : 'failed'} (${output})`,
);
process.exitCode = report.passed ? 0 : 1;
