import fs from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
const root = process.cwd();
const mesh = process.argv.includes('--desktop') ? 'desktop' : 'mobile';
const { build } = await import(`${root}/node_modules/esbuild/lib/main.js`);
const THREE = await import(`${root}/node_modules/three/build/three.module.js`);
const { meshUvCoverage } = await import(
  `${root}/scripts/benchmarks/mesh-uv-coverage.mjs`
);
const b = await build({
  stdin: {
    contents:
      "export {createOrbitalEnvironment} from './features/orbit/orbital-environment.ts'; export {createOrbitalWorldReference} from './features/orbit/earth-view-transform.ts';",
    resolveDir: root,
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
const report = JSON.parse(
  fs.readFileSync(
    `docs/evidence/earth-stable-navigation/coverage-${mesh}.json`,
  ),
);
for (const [path, expected] of Object.entries(report.sourceSha256)) {
  const actual = createHash('sha256')
    .update(fs.readFileSync(path))
    .digest('hex');
  if (actual !== expected) throw new Error(`Coverage input changed: ${path}`);
}
const samples = JSON.parse(
  gunzipSync(
    fs.readFileSync(
      `docs/evidence/earth-stable-navigation/coverage-${mesh}-poses.json.gz`,
    ),
  ),
).samples;
const base = samples.filter((s) => s.guarded?.sourcePixelRows[1] > 1856);
const environment = createOrbitalEnvironment(THREE, () => {}, {
  cameraFov: 38,
  mobile: mesh === 'mobile',
  earthTexture: new THREE.Texture({ width: 8192, height: 4096 }),
});
await environment.ready;
const reference = createOrbitalWorldReference(THREE);
const surface = environment.scene.getObjectByName('satellite-earth-surface');
const directions = [];
for (const x of [-1, 0, 1])
  for (const y of [-1, 0, 1])
    for (const z of [-1, 0, 1])
      if (x || y || z) directions.push(new THREE.Vector3(x, y, z).normalize());
const translations = [
  new THREE.Vector3(),
  ...directions.map((d) => d.clone().multiplyScalar(0.25)),
];
const rotations = [
  new THREE.Quaternion(),
  ...directions.map((d) =>
    new THREE.Quaternion().setFromAxisAngle(d, THREE.MathUtils.degToRad(5.5)),
  ),
];
const cases = [];
let clock = 0;
for (const sample of base) {
  environment.resize(...sample.viewport, 1, sample.verticalFieldOfView);
  environment.setViewportComposition(false, reference, true);
  if (sample.viewportCompositionRadians > 0) {
    environment.setViewportComposition(true, reference);
    clock +=
      -Math.log(1 - sample.viewportCompositionRadians / (Math.PI / 2)) / 8;
    environment.update(clock, true, 0, 0);
  }
  let min = Infinity,
    max = -Infinity,
    worst = null,
    visible = 0,
    textureOverflow = 0,
    filteringFailure = 0;
  for (let p = 0; p < translations.length; p++)
    for (let q = 0; q < rotations.length; q++) {
      environment.camera.position
        .fromArray(sample.camera.position)
        .add(translations[p]);
      environment.camera.quaternion
        .fromArray(sample.camera.quaternion)
        .multiply(rotations[q]);
      environment.camera.updateMatrixWorld(true);
      const result = meshUvCoverage(surface, environment.camera, {
        sameLatitude: false,
      });
      if (!result) continue;
      visible++;
      min = Math.min(min, result.sourcePixelRows[0]);
      if (result.sourcePixelRows[1] > max) {
        max = result.sourcePixelRows[1];
        worst = {
          translation: translations[p].toArray(),
          rotationQuaternion: rotations[q].toArray(),
          sourcePixelRows: result.sourcePixelRows,
        };
      }
      if (result.sourcePixelRows[0] < 384 || result.sourcePixelRows[1] > 1920)
        textureOverflow++;
      if (result.sourcePixelRows[0] < 448 || result.sourcePixelRows[1] > 1856)
        filteringFailure++;
    }
  cases.push({
    viewport: sample.viewport,
    state: sample.state,
    angles: sample.angles,
    layoutRollRadians: sample.layoutRollRadians,
    viewportCompositionRadians: sample.viewportCompositionRadians,
    expandedHalfSpaceRows: sample.guarded.sourcePixelRows,
    exactUnperturbedRows: sample.sourcePixelRows,
    perturbedFrusta: translations.length * rotations.length,
    visiblePerturbedFrusta: visible,
    exactPerturbedRows: [min, max],
    textureOverflow,
    filteringFailure,
    worst,
  });
}
environment.dispose();
const output = {
  createdAt: new Date().toISOString(),
  generatorSha256: createHash('sha256')
    .update(fs.readFileSync(new URL(import.meta.url)))
    .digest('hex'),
  sourceSha256: report.sourceSha256,
  assumptions: [
    `${mesh === 'mobile' ? 'Mobile96x64' : 'Desktop128x96'} sphere; four orientation-resize cross-product samples whose expanded half-space bound exceeds64-row margin.`,
    'Each sample tests neutral plus26 normalized[-1,0,1]^3 translation directions at radius.25 orbitalunits, crossed with neutral plus26 local-camera rotation axes at angle5.5degrees:729 exactfrusta per case.',
    'This finite perturbation sampling is not an exhaustive optimization or mathematical proof for every point in the bounded neighborhood. Extreme drags are already at configuredlimit; additional rotations may exceed reachable productiondrag.',
    'No texturedecode/render/GPUtiming.',
  ],
  cases,
};
fs.writeFileSync(
  `docs/evidence/earth-stable-navigation/coverage-perturbations-${mesh}.json`,
  JSON.stringify(output, null, 2) + '\n',
);
console.log(JSON.stringify(cases, null, 2));
