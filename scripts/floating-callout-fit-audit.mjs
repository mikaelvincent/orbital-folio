import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root = resolve(process.argv[2] || process.cwd()),
  req = createRequire(root + '/package.json');
const THREE = await import(pathToFileURL(req.resolve('three')).href);
const { createSpacecraft } = await import(
  pathToFileURL(root + '/components/spacecraft-model.ts').href
);
const {
  fitPerspectiveFrame,
  fitPerspectiveDistance,
  cursorViewSamples,
  CAMERA_RANGES,
} = await import(pathToFileURL(root + '/lib/scene-controls.ts').href);
const model = createSpacecraft(THREE, { projects: [], caseStudies: [] });
const zAxis = new THREE.Vector3(0, 0, 1),
  baseDirection = new THREE.Vector3(-0.18, 0.14, 1).normalize();
const cases = [],
  clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const sections = ['projects', 'experience', 'about', 'contact'];
for (const [width, height, topInset] of [
  [320, 740, 114],
  [390, 844, 114],
  [700, 480, 100],
  [768, 1024, 100],
  [900, 700, 100],
  [1440, 900, 100],
  [1920, 1080, 100],
]) {
  const layout = width < 900 || width / height < 1.05 ? 'compact' : 'wide';
  model.setLayout(layout);
  model.update(0, '', true, { activeRoom: 'home' });
  model.group.updateMatrixWorld(true);
  const roll = height > width ? Math.PI / 2 : 0,
    data = model.group.userData,
    raw = data.overviewSupportPoints,
    points = raw.map((p) =>
      new THREE.Vector3(...p).applyAxisAngle(zAxis, roll).toArray(),
    );
  const safe = {
    left: -1 + (2 * (width < 700 ? 12 : 18)) / width,
    right: 1 - (2 * (width < 700 ? 12 : 18)) / width,
    top: 1 - (2 * (topInset + 48)) / height,
    bottom: -1 + (2 * 128) / height,
  };
  const [min, max] = [data.overviewBounds.min, data.overviewBounds.max];
  const start = new THREE.Vector3(...min)
    .add(new THREE.Vector3(...max))
    .multiplyScalar(0.5)
    .applyAxisAngle(zAxis, roll);
  const centered = fitPerspectiveFrame(
      points,
      { target: start.toArray(), direction: baseDirection.toArray() },
      38,
      width / height,
      safe,
    ),
    target = new THREE.Vector3(...centered.target);
  const anchors = sections.map((s) =>
    new THREE.Vector3(...data.roomAnchors[s]).applyAxisAngle(zAxis, roll),
  );
  const hoverX =
      Math.max(...anchors.map((a) => Math.abs(a.x - target.x))) * 0.022,
    hoverY = Math.max(...anchors.map((a) => Math.abs(a.y - target.y))) * 0.022;
  const fitViews = cursorViewSamples(
    { target: target.toArray(), direction: baseDirection.toArray() },
    4,
    CAMERA_RANGES.overview,
  );
  const distance =
    Math.max(
      ...fitViews.flatMap((v) =>
        [-1, 1].flatMap((x) =>
          [-1, 1].map((y) =>
            fitPerspectiveDistance(
              points,
              {
                ...v,
                target: [
                  v.target[0] + x * hoverX,
                  v.target[1] + y * hoverY,
                  v.target[2],
                ],
              },
              38,
              width / height,
              safe,
            ),
          ),
        ),
      ),
    ) / 0.975;
  const camera = new THREE.PerspectiveCamera(38, width / height, 0.5, 200),
    aim = (t, d, dist) => {
      camera.position.copy(t).addScaledVector(new THREE.Vector3(...d), dist);
      camera.lookAt(t);
      camera.updateMatrixWorld(true);
    };
  const project = (p) => {
    const v = p.clone().project(camera);
    return { x: ((v.x + 1) * width) / 2, y: ((1 - v.y) * height) / 2, z: v.z };
  };
  aim(target, baseDirection.toArray(), distance);
  const projected = points.map((p) => project(new THREE.Vector3(...p))),
    top = Math.min(...projected.map((p) => p.y)),
    bottom = Math.max(...projected.map((p) => p.y));
  const entries = sections
    .map((s, i) => ({
      section: s,
      anchor: project(anchors[i]),
      width: width / 2 - 24,
      height: 36,
    }))
    .sort((a, b) => a.anchor.y - b.anchor.y);
  const pointAtDepth = (x, y) => {
    const dir = new THREE.Vector3(
      (2 * x) / width - 1,
      1 - (2 * y) / height,
      0.5,
    )
      .unproject(camera)
      .sub(camera.position);
    return dir
      .multiplyScalar(
        distance / dir.dot(camera.getWorldDirection(new THREE.Vector3())),
      )
      .add(camera.position);
  };
  for (const row of [entries.slice(0, 2), entries.slice(2)]) {
    row.sort((a, b) => a.anchor.x - b.anchor.x);
    for (const [i, e] of row.entries()) {
      e.lane = i;
      const h = e.width / 2,
        x = clamp(
          e.anchor.x,
          i ? width / 2 + h + 8 : h + 14,
          i ? width - h - 14 : width / 2 - h - 8,
        ),
        y = entries.indexOf(e) < 2 ? top - 30 : bottom + 30;
      e.world = pointAtDepth(x, y);
    }
  }
  let maxSupportOverflow = -Infinity,
    maxLabelOverflow = -Infinity,
    centersOutside = 0,
    worstLabel = null,
    minGap = Infinity;
  const denseViews = cursorViewSamples(
    { target: target.toArray(), direction: baseDirection.toArray() },
    12,
    CAMERA_RANGES.overview,
  );
  for (const v of denseViews)
    for (const hx of [-1, 0, 1])
      for (const hy of [-1, 0, 1]) {
        const t = target
          .clone()
          .add(new THREE.Vector3(hx * hoverX, hy * hoverY, 0));
        aim(t, v.direction, distance * 0.975);
        for (const p of points) {
          const q = new THREE.Vector3(...p).project(camera);
          maxSupportOverflow = Math.max(
            maxSupportOverflow,
            ((safe.left - q.x) * width) / 2,
            ((q.x - safe.right) * width) / 2,
            ((q.y - safe.top) * height) / 2,
            ((safe.bottom - q.y) * height) / 2,
          );
        }
        const labels = entries.map((e) => {
          const p = project(e.world),
            depth = e.world
              .clone()
              .sub(camera.position)
              .dot(camera.getWorldDirection(new THREE.Vector3())),
            scale = Math.min(
              clamp(distance / Math.max(0.1, depth), 0.3, 2.5),
              (width / 2 - 24) / e.width,
            ),
            half = (e.width * scale) / 2;
          p.x = clamp(
            p.x,
            e.lane ? width / 2 + 8 + half : 12 + half,
            e.lane ? width - 12 - half : width / 2 - 8 - half,
          );
          const l = p.x - (e.width * scale) / 2,
            r = p.x + (e.width * scale) / 2,
            t = p.y - (e.height * scale) / 2,
            b = p.y + (e.height * scale) / 2,
            overflow = Math.max(-l, r - width, -t, b - height);
          if (p.x < 0 || p.x > width || p.y < 0 || p.y > height)
            centersOutside++;
          if (overflow > maxLabelOverflow) {
            maxLabelOverflow = overflow;
            worstLabel = {
              section: e.section,
              center: [p.x, p.y],
              rect: [l, t, r, b],
              direction: v.direction,
              hover: [hx, hy],
            };
          }
          return { l, r, t, b };
        });
        for (let i = 0; i < labels.length; i++)
          for (let j = i + 1; j < labels.length; j++) {
            const a = labels[i],
              b = labels[j];
            if (a.t < b.b && b.t < a.b)
              minGap = Math.min(minGap, Math.max(a.l - b.r, b.l - a.r));
          }
      }
  cases.push({
    viewport: [width, height],
    layout,
    roll,
    assumedTopInset: topInset,
    supportPointCount: points.length,
    distance,
    restProjectedHeight: bottom - top,
    maxSupportOverflowPixels: maxSupportOverflow,
    maxEstimatedLabelOverflowPixels: maxLabelOverflow,
    labelCenterOutsideViewportSamples: centersOutside,
    minimumEstimatedHorizontalGap: minGap === Infinity ? null : minGap,
    worstLabel,
  });
}
model.group.traverse((o) => {
  if (o.geometry) o.geometry.dispose();
});
const result = {
  scope:
    'Independent numerical review of candidate support fitting and world-plane label projection. Uses actual model+fit helpers and source-matched camera math, synthetic measured-inset/max-CSS-width button fixtures with current settled-home scale/lane clamp; not actual DOM typography or GPU evidence.',
  sourceHashes: Object.fromEntries(
    [
      'components/spacecraft.tsx',
      'components/spacecraft-model.ts',
      'components/overview-annotations.ts',
      'lib/scene-controls.ts',
    ].map((p) => [
      p,
      createHash('sha256')
        .update(readFileSync(root + '/' + p))
        .digest('hex'),
    ]),
  ),
  cases,
};
result.passed = cases.every(
  (c) =>
    c.maxSupportOverflowPixels < 1e-6 &&
    c.maxEstimatedLabelOverflowPixels <= 0 &&
    c.minimumEstimatedHorizontalGap >= 16 - 1e-6,
);
writeFileSync(
  process.argv[3] || '/tmp/floating-callout-clamped-fit-audit.json',
  JSON.stringify(result, null, 2),
);
console.log(JSON.stringify({ passed: result.passed, cases: cases.length }));
if (!result.passed) process.exitCode = 1;
