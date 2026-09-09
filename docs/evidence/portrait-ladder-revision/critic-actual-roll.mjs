import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve, join } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
const root = resolve(process.argv[2] || process.cwd()),
  req = createRequire(pathToFileURL(join(root, 'package.json'))),
  THREE = await import(pathToFileURL(req.resolve('three')).href);
const { createSpacecraft } = await import(
  pathToFileURL(join(root, 'components/spacecraft-model.ts')).href
);
const model = createSpacecraft(THREE, { projects: [], caseStudies: [] });
const z = new THREE.Vector3(0, 0, 1);
const results = [];
for (const name of [
  'phone320-entry-trace.json',
  'phone320-return-trace.json',
  'tall320-entry-trace.json',
]) {
  const a = JSON.parse(
    readFileSync(
      join(root, 'docs/evidence/portrait-ladder-revision', name),
      'utf8',
    ),
  );
  const [w, h] = a.viewport;
  model.setLayout(w <= 699 ? 'compact' : 'wide');
  const b = model.group.userData.overviewBounds;
  const raw = [];
  for (const x of [b.min[0], b.max[0]])
    for (const y of [b.min[1], b.max[1]])
      for (const q of [b.min[2], b.max[2]])
        raw.push(new THREE.Vector3(x, y, q));
  const frames = a.trace.filter(
    (f) => f.roll > 0.01 && f.roll < Math.PI / 2 - 0.01,
  );
  let xr = [Infinity, -Infinity],
    yr = [Infinity, -Infinity],
    zr = [Infinity, -Infinity],
    outside = 0,
    worst = null;
  for (const f of frames) {
    const camera = new THREE.PerspectiveCamera(
      38,
      w / h,
      0.5,
      Number(f.cameraFar) || 80,
    );
    camera.position.set(...f.position);
    camera.quaternion.set(...f.quaternion);
    camera.updateMatrixWorld(true);
    for (const p of raw) {
      const n = p.clone().applyAxisAngle(z, f.roll).project(camera);
      xr = [Math.min(xr[0], n.x), Math.max(xr[1], n.x)];
      yr = [Math.min(yr[0], n.y), Math.max(yr[1], n.y)];
      zr = [Math.min(zr[0], n.z), Math.max(zr[1], n.z)];
      const over = Math.max(
        Math.abs(n.x) - 1,
        Math.abs(n.y) - 1,
        Math.abs(n.z) - 1,
      );
      if (over > 0) {
        outside++;
        if (!worst || over > worst.overflow)
          worst = {
            time: f.time,
            roll: f.roll,
            overflow: over,
            ndc: n.toArray(),
          };
      }
    }
  }
  results.push({
    name,
    viewport: a.viewport,
    totalFrames: a.trace.length,
    rotationFrames: frames.length,
    durationMs: a.trace.at(-1).time - a.trace[0].time,
    rotationDurationMs: frames.at(-1)?.time - frames[0]?.time,
    ndcRanges: { x: xr, y: yr, z: zr },
    allFullBoundsInsideViewport: outside === 0,
    violatingCornerSamples: outside,
    worst,
    walkwayMaxDuringRotation: Math.max(
      ...frames.map((f) => f.roomLevels.walkway),
    ),
  });
}
const output = {
  scope:
    'Independent reprojection of actual recorded rotation-phase frames only; fixed FOV38 and recorded camera pose; conservative model bounds; excludes room approach/departure',
  results,
};
writeFileSync(
  resolve(
    process.argv[3] ||
      join(
        root,
        'docs/evidence/portrait-ladder-revision/critic-actual-roll.json',
      ),
  ),
  JSON.stringify(output, null, 2),
);
console.log(JSON.stringify(output, null, 2));
