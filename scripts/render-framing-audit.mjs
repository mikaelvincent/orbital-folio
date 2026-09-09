import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const root = resolve(process.argv[2] || process.cwd());
const require = createRequire(join(root, 'package.json'));
const T = await import(pathToFileURL(require.resolve('three')).href);
const { createSpacecraft } = await import(
  pathToFileURL(join(root, 'components/spacecraft-model.ts')).href
);
const {
  CAMERA_RANGES,
  cursorViewSamples,
  fitPerspectiveDistance,
  solveApertureFraming,
} = await import(pathToFileURL(join(root, 'lib/scene-controls.ts')).href);
import { writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const model = createSpacecraft(T, {
  projects: Array.from({ length: 9 }, (_, i) => ({
    title: 'Project ' + i,
    slug: 'project-' + i,
    sample: true,
  })),
  labels: {
    projects: 'Projects',
    experience: 'Experience',
    about: 'About',
    contact: 'Contact',
  },
  vesselName: 'portfolio.example',
});
const out = {
  scope:
    'Source-equivalent numeric framing without DOM labels, browser, WebGL, database or reading UI',
  hashes: Object.fromEntries(
    [
      'components/spacecraft-model.ts',
      'components/spacecraft.tsx',
      'lib/scene-controls.ts',
    ].map((p) => [
      p,
      createHash('sha256')
        .update(readFileSync(root + '/' + p))
        .digest('hex'),
    ]),
  ),
  rooms: [],
  home: [],
};
const corners = (min, max) => {
  const p = [];
  for (const x of [min[0], max[0]])
    for (const y of [min[1], max[1]])
      for (const z of [min[2], max[2]]) p.push([x, y, z]);
  return p;
};
function project(points, views, distance, bounds) {
  let worst = 0,
    example = null;
  for (const v of views) {
    const camera = new T.PerspectiveCamera(38, currentAspect, 0.5, 1000);
    camera.position
      .fromArray(v.target)
      .addScaledVector(new T.Vector3(...v.direction).normalize(), distance);
    camera.lookAt(new T.Vector3(...v.target));
    camera.updateMatrixWorld(true);
    for (const p of points) {
      const n = new T.Vector3(...p).project(camera);
      const excess = Math.max(
        bounds.left - n.x,
        n.x - bounds.right,
        bounds.bottom - n.y,
        n.y - bounds.top,
      );
      if (excess > worst) {
        worst = excess;
        example = {
          p,
          ndc: n.toArray(),
          direction: v.direction,
          target: v.target,
        };
      }
    }
  }
  return { worstNdcOutsideSafe: worst, example };
}
let currentAspect = 1;
for (const [width, height] of [
  [320, 844],
  [390, 844],
  [768, 1024],
  [1440, 1000],
]) {
  const mobile = width < 700,
    layout = width < 900 || width / height < 1.05 ? 'compact' : 'wide';
  model.setLayout(layout);
  currentAspect = width / height;
  const safe = {
    left: -1 + (2 * (mobile ? 14 : 24)) / width,
    right: 1 - (2 * (mobile ? 14 : 24)) / width,
    top: 1 - 48 / height,
    bottom: -1 + 160 / height,
  };
  for (const room of ['projects', 'experience', 'about', 'contact']) {
    const data = model.group.userData,
      ap = data.innerApertureBounds[room],
      target = [
        data.roomAnchors[room][0],
        ap.center[1],
        data.roomAnchors[room][2],
      ],
      base = { target, direction: [0, 0, 1] },
      req = data.requiredFramingPoints[room].map((p) => p.position),
      views = cursorViewSamples(base, 4, CAMERA_RANGES.room);
    const solution = solveApertureFraming({
      aperture: {
        center: ap.center,
        right: [1, 0, 0],
        up: [0, 1, 0],
        width: ap.size[0],
        height: ap.size[1],
      },
      views,
      requiredPoints: req,
      fovDegrees: 38,
      aspect: currentAspect,
      overscan: 1.015,
      portalBounds: safe,
    });
    const distance = solution.feasible
      ? solution.minimumDistance +
        (solution.maximumDistance - solution.minimumDistance) * 0.16
      : Math.max(
          ...views.map((v) =>
            fitPerspectiveDistance(req, v, 38, currentAspect, safe),
          ),
        ) + 0.05;
    out.rooms.push({
      width,
      height,
      layout,
      room,
      safe,
      distance,
      feasible: solution.feasible,
      requiredPoints: req.length,
      denseProbe: project(
        req,
        cursorViewSamples(base, 40, CAMERA_RANGES.room),
        distance,
        safe,
      ),
    });
  }
  const data = model.group.userData,
    b = data.overviewBounds,
    target = b.min.map((v, i) => (v + b.max[i]) / 2),
    base = {
      target,
      direction: new T.Vector3(-0.18, 0.14, 1).normalize().toArray(),
    },
    all = corners(b.min, b.max),
    views = cursorViewSamples(base, 4, CAMERA_RANGES.overview);
  let distance = Math.max(
    ...views.map((v) =>
      fitPerspectiveDistance(all, v, 38, currentAspect, safe),
    ),
  );
  let required = all;
  if (mobile) {
    required = [];
    for (const box of [...Object.values(data.roomBounds), data.walkwayBounds])
      required.push(
        ...corners(
          box.center.map((v, i) => v - box.size[i] / 2),
          box.center.map((v, i) => v + box.size[i] / 2),
        ),
      );
    distance = Math.max(
      ...views.map((v) =>
        fitPerspectiveDistance(required, v, 38, currentAspect, safe),
      ),
      ...views.map((v) =>
        fitPerspectiveDistance(all, v, 38, currentAspect, {
          ...safe,
          left: -1.3,
          right: 1.3,
        }),
      ),
    );
  }
  const normal = project(
      required,
      cursorViewSamples(base, 40, CAMERA_RANGES.overview),
      distance,
      safe,
    ),
    hover = [];
  for (const room of ['projects', 'experience', 'about', 'contact']) {
    const a = data.roomAnchors[room],
      shift = [
        target[0] + (a[0] - target[0]) * 0.022,
        target[1] + (a[1] - target[1]) * 0.022,
        target[2],
      ];
    hover.push({
      room,
      ...project(
        required,
        cursorViewSamples(
          { ...base, target: shift },
          20,
          CAMERA_RANGES.overview,
        ),
        distance * 0.975,
        safe,
      ),
    });
  }
  out.home.push({ width, height, layout, distance, safe, normal, hover });
}
writeFileSync(
  process.argv[3] || '/tmp/render-framing-audit.json',
  JSON.stringify(out, null, 2) + '\n',
);
console.log(
  JSON.stringify(
    {
      rooms: out.rooms.map(
        ({ width, room, distance, feasible, denseProbe }) => ({
          width,
          room,
          distance,
          feasible,
          excess: denseProbe.worstNdcOutsideSafe,
        }),
      ),
      home: out.home.map(({ width, distance, normal, hover }) => ({
        width,
        distance,
        rest: normal.worstNdcOutsideSafe,
        hover: Math.max(...hover.map((h) => h.worstNdcOutsideSafe)),
      })),
    },
    null,
    2,
  ),
);
