import fs from 'node:fs';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import * as THREE from 'three';
import { meshUvCoverage } from '../../../scripts/benchmarks/mesh-uv-coverage.mjs';
import { responsiveCameraFov } from '../../../features/spacecraft/navigation/scene-controls.ts';
const directory = new URL('.', import.meta.url);
const hash = (text) => createHash('sha256').update(text).digest('hex');
const b = await build({
  stdin: {
    contents:
      "export {createOrbitalEnvironment} from './features/orbit/orbital-environment.ts'; export {createOrbitalWorldReference} from './features/orbit/earth-view-transform.ts';",
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
  logLevel: 'silent',
});
const { createOrbitalEnvironment, createOrbitalWorldReference } = await import(
  `data:text/javascript;base64,${Buffer.from(b.outputFiles[0].text).toString('base64')}`
);
const fixtureReport = JSON.parse(
  fs.readFileSync(new URL('coverage-desktop.json', directory)),
);
const sourceSha256 = Object.fromEntries(
  Object.keys(fixtureReport.sourceSha256).map((path) => [
    path,
    hash(fs.readFileSync(path)),
  ]),
);
const traces = Object.fromEntries(
  ['entry-trace.json', 'return-trace.json', 'history-trace.json'].map(
    (name) => {
      const text = fs.readFileSync(new URL(name, directory));
      return [name, { sha256: hash(text), samples: JSON.parse(text) }];
    },
  ),
);
const records = [];
for (const mobile of [false, true]) {
  const environment = createOrbitalEnvironment(THREE, () => {}, {
    cameraFov: 38,
    mobile,
    earthTexture: new THREE.Texture({ width: 8192, height: 4096 }),
  });
  await environment.ready;
  environment.resize(390, 844, 1, responsiveCameraFov(390 / 844));
  environment.setViewportComposition(
    true,
    createOrbitalWorldReference(THREE),
    true,
  );
  const surface = environment.scene.getObjectByName('satellite-earth-surface');
  for (const [name, trace] of Object.entries(traces)) {
    for (const [index, pose] of trace.samples.entries()) {
      environment.camera.position.fromArray(pose.backgroundPosition);
      environment.camera.quaternion.fromArray(pose.backgroundQuaternion);
      environment.camera.updateMatrixWorld(true);
      const exact = meshUvCoverage(surface, environment.camera, {
        sameLatitude: false,
      });
      const guarded = meshUvCoverage(surface, environment.camera, {
        positionTolerance: 0.25,
        angularTolerance: THREE.MathUtils.degToRad(5.5),
        sameLatitude: false,
      });
      records.push({
        mesh: mobile ? 'mobile' : 'desktop',
        trace: name,
        index,
        time: pose.time,
        exactRows: exact?.sourcePixelRows ?? null,
        guardedRows: guarded?.sourcePixelRows ?? null,
        exactSeamClearanceDegrees: exact?.fixedSeamClearanceDegrees ?? null,
        guardedSeamClearanceDegrees: guarded?.fixedSeamClearanceDegrees ?? null,
      });
    }
  }
  environment.dispose();
}
const range = (records, key) => {
  const rows = records.map((r) => r[key]).filter(Boolean);
  return rows.length
    ? [Math.min(...rows.map((r) => r[0])), Math.max(...rows.map((r) => r[1]))]
    : null;
};
const fails = (rows) => rows && (rows[0] < 448 || rows[1] > 1856);
const summary = [];
for (const mesh of ['desktop', 'mobile'])
  for (const trace of Object.keys(traces)) {
    const rows = records.filter((r) => r.mesh === mesh && r.trace === trace);
    summary.push({
      mesh,
      trace,
      frames: rows.length,
      exactSourceRows: range(rows, 'exactRows'),
      guardedSourceRows: range(rows, 'guardedRows'),
      exact64RowMarginFailures: rows.filter((r) => fails(r.exactRows)).length,
      guarded64RowMarginFailures: rows.filter((r) => fails(r.guardedRows))
        .length,
      guardedSeamClearanceDegrees: Math.min(
        ...rows
          .map((r) => r.guardedSeamClearanceDegrees)
          .filter((v) => v !== null),
      ),
    });
  }
fs.writeFileSync(
  new URL('coverage-live-traces-rows.json.gz', directory),
  gzipSync(JSON.stringify(records)),
);
fs.writeFileSync(
  new URL('coverage-live-traces.json', directory),
  JSON.stringify(
    {
      createdAt: new Date().toISOString(),
      generatorSha256: hash(fs.readFileSync(new URL(import.meta.url))),
      sourceSha256,
      traces: Object.fromEntries(
        Object.entries(traces).map(([name, t]) => [
          name,
          { sha256: t.sha256, frames: t.samples.length },
        ]),
      ),
      assumptions: [
        'Parent task captured these final built-in Chromium traces at actual 390x844 CSS pixels, DPR1, with a settled portrait Earth composition anchor. Replay uses recorded background camera transforms directly; no inferred camera path.',
        'Entry and return are full final normal Contact transitions; history is the retained 1200-frame window including a Back interruption. This is finite evidence for those exact recorded frames, not every interruption or browser.',
        'Both production sphere meshes are audited against the recorded cameras. This does not mean the browser rendered both meshes or that Safari was tested.',
        'Exact triangle clipping plus unchanged 0.25-unit/5.5-degree local bounds; ship/atmosphere/HTML occlusion omitted conservatively. Same-latitude longitude sweep omitted because this supplemental check certifies crop rows and geometric seam only.',
        'No texture decode, image comparison or performance timing. Main reports retain full fixture coverage and the known resize guard exceptions.',
      ],
      summary,
      rawSamples: 'coverage-live-traces-rows.json.gz',
    },
    null,
    2,
  ) + '\n',
);
console.log(JSON.stringify(summary, null, 2));
