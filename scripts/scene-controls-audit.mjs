/** node scripts/scene-controls-audit.mjs [PROJECT_ROOT] */
import assert from 'node:assert/strict';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import {
  fitPerspectiveDistance,
  solveApertureFraming,
  cursorViewSamples,
  pointerResponse,
  beginBoundedDrag,
  updateBoundedDrag,
  endBoundedDrag,
} from '../features/spacecraft/navigation/scene-controls.ts';
const project = path.resolve(process.argv[2] ?? process.cwd()),
  require = createRequire(path.join(project, 'package.json'));
const THREE = await import(pathToFileURL(require.resolve('three')).href);
const { cursorRotation } = await import(
  pathToFileURL(path.join(project, 'features/spacecraft/navigation/flight.ts')).href
);
const vec = (a) => new THREE.Vector3(...a);
const view = { target: [0, 0.1, 0.15], direction: [-0.025, 0.018, 1] };
const portalBounds = { left: -0.91, right: 0.91, bottom: -0.9, top: 0.85 };
const cameraFor = (v, d, aspect) => {
  const camera = new THREE.PerspectiveCamera(38, aspect, 0.5, 80);
  camera.position
    .copy(vec(v.target))
    .addScaledVector(vec(v.direction).normalize(), d);
  camera.lookAt(vec(v.target));
  camera.updateMatrixWorld(true);
  return camera;
};
function portalPoints(width) {
  const points = [];
  for (const [x, y] of [
    [0, 1.02],
    [0, -0.96],
    [-width * 0.34, 0.05],
    [width * 0.34, 0.05],
  ])
    for (const dx of [-0.1, 0.1])
      for (const dy of [-0.08, 0.08]) points.push([x + dx, y + dy, 0.3]);
  return points;
}
const framing = [];
let rayChecks = 0,
  portalChecks = 0;
for (const [width, height, openingWidth, openingHeight] of [
  [1440, 900, 4.8, 3.0],
  [793, 836, 2.85, 3.0],
  [390, 844, 1.55, 3.0],
]) {
  const aspect = width / height,
    aperture = {
      center: [0, 0, 1.5],
      right: [1, 0, 0],
      up: [0, 1, 0],
      width: openingWidth,
      height: openingHeight,
    },
    points = portalPoints(openingWidth);
  const result = solveApertureFraming({
    aperture,
    views: cursorViewSamples(view, 2),
    requiredPoints: points,
    fovDegrees: 38,
    aspect,
    portalBounds,
  });
  assert.equal(
    result.feasible,
    true,
    JSON.stringify({ width, height, result }),
  );
  let maxApertureFraction = 0,
    maxPortalNdcFraction = 0;
  // Independent Three.js projection: 441 cursor poses, not merely the 9 solver views.
  for (let iy = 0; iy <= 20; iy++)
    for (let ix = 0; ix <= 20; ix++) {
      const pitch = (iy / 10 - 1) * 0.025,
        yaw = (ix / 10 - 1) * 0.045,
        direction = vec(view.direction).applyEuler(
          new THREE.Euler(pitch, yaw, 0),
        );
      const camera = cameraFor(
        { ...view, direction: direction.toArray() },
        result.distance,
        aspect,
      );
      for (const x of [-1, 1])
        for (const y of [-1, 1]) {
          const direction = new THREE.Vector3(x, y, 0)
            .unproject(camera)
            .sub(camera.position)
            .normalize();
          const hit = new THREE.Ray(camera.position, direction).intersectPlane(
            new THREE.Plane(new THREE.Vector3(0, 0, 1), -1.5),
            new THREE.Vector3(),
          );
          assert.ok(hit);
          const fraction = Math.max(
            Math.abs(hit.x) / (openingWidth / 2),
            Math.abs(hit.y) / (openingHeight / 2),
          );
          maxApertureFraction = Math.max(maxApertureFraction, fraction);
          assert.ok(fraction < 1);
          rayChecks++;
        }
      for (const point of points) {
        const p = vec(point).project(camera);
        assert.ok(p.z > -1 && p.z < 1);
        assert.ok(
          p.x >= portalBounds.left - 1e-9 &&
            p.x <= portalBounds.right + 1e-9 &&
            p.y >= portalBounds.bottom - 1e-9 &&
            p.y <= portalBounds.top + 1e-9,
        );
        maxPortalNdcFraction = Math.max(
          maxPortalNdcFraction,
          p.x / (p.x < 0 ? portalBounds.left : portalBounds.right),
          p.y / (p.y < 0 ? portalBounds.bottom : portalBounds.top),
        );
        portalChecks++;
      }
    }
  framing.push({
    viewport: [width, height],
    opening: [openingWidth, openingHeight],
    ...result,
    maxApertureFraction,
    maxPortalNdcFraction,
  });
}
const impossible = solveApertureFraming({
  aperture: {
    center: [0, 0, 1.5],
    right: [1, 0, 0],
    up: [0, 1, 0],
    width: 4.8,
    height: 3,
  },
  views: cursorViewSamples(view),
  requiredPoints: portalPoints(4.8),
  fovDegrees: 38,
  aspect: 390 / 844,
  portalBounds,
});
assert.equal(impossible.feasible, false);
assert.equal(impossible.distance, null);
const overviewPoints = [];
for (const x of [-5, 5])
  for (const y of [-4, 4])
    for (const z of [-1.3, 1.8]) overviewPoints.push([x, y, z]);
const overviewView = { target: [0, 0, 0.25], direction: [-0.28, 0.22, 1] },
  safe = { left: -0.93, right: 0.93, bottom: -0.83, top: 0.87 };
const overviewDistance = fitPerspectiveDistance(
    overviewPoints,
    overviewView,
    38,
    1440 / 900,
    safe,
    0.5,
  ),
  overviewCamera = cameraFor(overviewView, overviewDistance, 1440 / 900);
let maxBoundaryFraction = 0;
for (const p of overviewPoints) {
  const q = vec(p).project(overviewCamera);
  maxBoundaryFraction = Math.max(
    maxBoundaryFraction,
    q.x / (q.x < 0 ? safe.left : safe.right),
    q.y / (q.y < 0 ? safe.bottom : safe.top),
  );
  assert.ok(
    q.x >= safe.left - 1e-9 &&
      q.x <= safe.right + 1e-9 &&
      q.y >= safe.bottom - 1e-9 &&
      q.y <= safe.top + 1e-9,
  );
}
assert.ok(Math.abs(maxBoundaryFraction - 1) < 1e-9);
const canonical = {
  projects: [-2, 2, 0],
  experience: [2, 2, 0],
  about: [-2, -2, 0],
  contact: [2, -2, 0],
};
for (const aspect of [1440 / 900, 390 / 844])
  for (const v of cursorViewSamples(overviewView)) {
    const camera = cameraFor(v, 18, aspect),
      p = Object.fromEntries(
        Object.entries(canonical).map(([k, a]) => [k, vec(a).project(camera)]),
      );
    assert.ok(
      p.projects.x < p.experience.x &&
        p.about.x < p.contact.x &&
        p.projects.y > p.about.y &&
        p.experience.y > p.contact.y,
    );
  }
const initial = beginBoundedDrag({
  pointerId: 7,
  x: 100,
  y: 100,
  response: [0.2, -0.1],
  width: 400,
  height: 800,
  targetKey: 'projects:test',
});
assert.deepEqual(
  pointerResponse(-1e9, 1e9, { left: 0, top: 0, width: 400, height: 800 }),
  [-1, -1],
);
assert.equal(updateBoundedDrag(initial, 8, 10000, 10000), initial);
const far = updateBoundedDrag(initial, 7, 10000, -10000);
assert.deepEqual(far.response, [1, 1]);
assert.deepEqual(cursorRotation(...far.response, false), [0.025, 0.045]);
const returned = updateBoundedDrag(far, 7, 100, 100);
assert.equal(returned.dragging, true);
assert.deepEqual(returned.response, initial.response);
assert.equal(
  endBoundedDrag(returned, 7, 100, 100, 'projects:test').activate,
  false,
);
assert.equal(
  endBoundedDrag(initial, 7, 107.999, 100, 'projects:test').activate,
  true,
);
assert.equal(
  endBoundedDrag(initial, 7, 108, 100, 'projects:test').activate,
  false,
);
assert.equal(endBoundedDrag(initial, 7, 100, 100, 'about').activate, false);
assert.equal(
  endBoundedDrag(initial, 8, 100, 100, 'projects:test').activate,
  false,
);
const huge = updateBoundedDrag(initial, 7, -1e9, 1e9);
assert.deepEqual(cursorRotation(...huge.response, false), [-0.025, -0.045]);
console.log(
  JSON.stringify(
    {
      framing,
      projectionChecks: {
        rayChecks,
        portalChecks,
        cursorPosesPerViewport: 441,
      },
      incompatiblePortraitRoom: impossible,
      overview: { distance: overviewDistance, maxBoundaryFraction },
      canonicalGridWithoutRoll: true,
      input: {
        sameCursorLimits: true,
        stickyOutAndBackThreshold: true,
        secondPointerIgnored: true,
        exact8pxThreshold: true,
        downUpTargetIdentityRequired: true,
        noCumulativeOrbit: true,
      },
    },
    null,
    2,
  ),
);
