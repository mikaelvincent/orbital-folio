/** CPU-only Earth footprint audit. No browser, rendering, texture decode or timing claim.
 * node scripts/benchmarks/earth-visible-coverage.mjs [--revision REV] [--out PATH]
 *   [--tile-width 4096] [--crop-y 128] [--crop-height 3072]
 * Uses production Earth placement, spacecraft supports, camera-fit helpers and
 * world-camera registration. UI insets use the documented public seed fixture.
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { dirname, resolve, relative } from 'node:path';
import { build } from 'esbuild';
import * as THREE from 'three';
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';
import { createVesselCameraFrame } from '../../features/spacecraft/navigation/vessel-camera.ts';
import {
  overviewCameraDirection,
  overviewCalloutGutter,
  fitPerspectiveFrame,
  fitPerspectiveDistance,
  fitRoomCameraFrame,
  cursorViewSamples,
  CAMERA_RANGES,
} from '../../features/spacecraft/navigation/scene-controls.ts';

const argument = (name) => {
  const index = process.argv.indexOf(name);
  return index < 0 ? null : process.argv[index + 1];
};
const revision = argument('--revision');
const tileWidth = Number(argument('--tile-width') ?? 4096);
const cropY = Number(argument('--crop-y') ?? 128);
const cropHeight = Number(argument('--crop-height') ?? 3072);
if (
  ![tileWidth, cropY, cropHeight].every(Number.isInteger) ||
  tileWidth < 1 ||
  tileWidth > 8192 ||
  cropY < 0 ||
  cropHeight < 1 ||
  cropY + cropHeight > 4096
)
  throw new RangeError(
    'Expected integer tile width 1..8192 and crop within 4096 source rows.',
  );
const cropLatitude = [
  90 - ((cropY + cropHeight) / 4096) * 180,
  90 - (cropY / 4096) * 180,
];
const textureRepeat = [8192 / tileWidth, 4096 / cropHeight];
const textureOffset = [
  -3712 / tileWidth,
  -(4096 - cropY - cropHeight) / cropHeight,
];
const moduloOne = (value) => ((value % 1) + 1) % 1;
const uSeamPhaseDifference = Math.abs(
  moduloOne(textureOffset[0]) - moduloOne(textureRepeat[0] + textureOffset[0]),
);
const output = resolve(
  argument('--out') ?? 'docs/evidence/europe-regional-loop/coverage.json',
);
const root = process.cwd();
const sourcePaths = [
  'features/orbit/orbital-environment.ts',
  'features/orbit/earth-view-transform.ts',
  'features/orbit/earth-satellite.ts',
  'features/orbit/night-atmosphere.ts',
  'features/spacecraft/navigation/scene-controls.ts',
  'features/spacecraft/navigation/vessel-camera.ts',
  'features/spacecraft/spacecraft-runtime.ts',
  'features/spacecraft/spacecraft-model.ts',
  'scripts/benchmarks/earth-visible-coverage.mjs',
];
const sources = Object.fromEntries(
  await Promise.all(
    sourcePaths.map(async (path) => [
      path,
      revision && path.startsWith('features/orbit/')
        ? execFileSync('git', ['show', `${revision}:${path}`], {
            encoding: 'utf8',
          })
        : await readFile(path, 'utf8'),
    ]),
  ),
);
const bundle = await build({
  entryPoints: ['features/orbit/orbital-environment.ts'],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
  logLevel: 'silent',
  plugins: [
    {
      name: 'audited-earth-sources',
      setup(builder) {
        builder.onLoad({ filter: /features\/orbit\/.*\.ts$/ }, (args) => {
          const path = relative(root, args.path);
          return sources[path]
            ? {
                contents: sources[path],
                loader: 'ts',
                resolveDir: dirname(args.path),
              }
            : null;
        });
      },
    },
  ],
});
const { createOrbitalEnvironment } = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`
);
const model = createSpacecraft(THREE, { layout: 'wide' });
const data = model.group.userData;
const axis = new THREE.Vector3(0, 0, 1);
const rig = createVesselCameraFrame(THREE);
const referenceRig = createVesselCameraFrame(THREE);
const environment = createOrbitalEnvironment(THREE, () => {}, {
  cameraFov: 38,
  earthTexture: new THREE.Texture({ width: 8192, height: 4096 }),
});
await environment.ready;
const surface = environment.scene.getObjectByName('satellite-earth-surface');
const earth = surface.parent;
const rounded = (value) => Math.round(value * 1e6) / 1e6;
function overviewPose(width, height) {
  const portrait = height > width,
    roll = portrait ? Math.PI / 2 : 0;
  const direction = new THREE.Vector3(
    ...overviewCameraDirection(width / height),
  ).normalize();
  const topInset = portrait ? 118 : 98,
    bottomInset = 80;
  const gutter = overviewCalloutGutter(height, topInset, bottomInset, portrait);
  const safe = {
    left: -1 + (2 * (portrait ? 36 : width < 700 ? 12 : 18)) / width,
    right: 1 - (2 * (portrait ? 36 : width < 700 ? 12 : 18)) / width,
    top: 1 - (2 * (topInset + gutter)) / height,
    bottom: -1 + (2 * (bottomInset + gutter)) / height,
  };
  const points = data.overviewSupportPoints.map((p) =>
    new THREE.Vector3(...p).applyAxisAngle(axis, roll).toArray(),
  );
  const target = new THREE.Vector3(
    ...data.overviewBounds.center,
  ).applyAxisAngle(axis, roll);
  target.fromArray(
    fitPerspectiveFrame(
      points,
      { target: target.toArray(), direction: direction.toArray() },
      38,
      width / height,
      safe,
    ).target,
  );
  const anchors = Object.values(data.roomAnchors).map((a) =>
    new THREE.Vector3(...a).applyAxisAngle(axis, roll),
  );
  const hover = [
    Math.max(...anchors.map((a) => Math.abs(a.x - target.x))) * 0.022,
    Math.max(...anchors.map((a) => Math.abs(a.y - target.y))) * 0.022,
  ];
  const distance =
    Math.max(
      ...cursorViewSamples(
        { target: target.toArray(), direction: direction.toArray() },
        4,
        CAMERA_RANGES.overview,
      ).flatMap((view) =>
        [-1, 1].flatMap((sx) =>
          [-1, 1].map((sy) =>
            fitPerspectiveDistance(
              points,
              {
                ...view,
                target: [
                  view.target[0] + sx * hover[0],
                  view.target[1] + sy * hover[1],
                  view.target[2],
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
  return { target, direction, distance, roll, hover, safe };
}
function roomPose(room, width, height) {
  const inset = width < 700 ? 12 : 18;
  const safe = {
    left: -1 + (2 * inset) / width,
    right: 1 - (2 * inset) / width,
    top: 1 - 48 / height,
    bottom: -1 + 160 / height,
  };
  const fit = fitRoomCameraFrame(
    data.roomCameraFrame,
    38,
    width / height,
    safe,
  );
  return {
    target: new THREE.Vector3(
      data.roomAnchors[room][0],
      data.innerApertureBounds[room].center[1],
      data.roomAnchors[room][2],
    ),
    direction: new THREE.Vector3(0, 0, 1),
    distance: fit.chosenDistance,
    roll: 0,
    safe,
  };
}
const samples = [];
function circularBounds(angles) {
  if (!angles.length) return null;
  angles.sort((a, b) => a - b);
  let gap = -1,
    gapIndex = -1;
  for (let i = 0; i < angles.length; i++) {
    const next = i + 1 === angles.length ? angles[0] + 360 : angles[i + 1];
    if (next - angles[i] > gap) {
      gap = next - angles[i];
      gapIndex = i;
    }
  }
  const start = angles[(gapIndex + 1) % angles.length];
  return {
    start: rounded(start),
    endUnwrapped: rounded(start + 360 - gap),
    span: rounded(360 - gap),
  };
}
function footprint(camera, longitudeShift = 0, columns = 128, rows = 80) {
  const point = new THREE.Vector3(),
    direction = new THREE.Vector3();
  const ray = new THREE.Ray();
  const sphere = new THREE.Sphere(earth.position, 180);
  const inverse = earth.quaternion.clone().invert();
  const origin = camera.position.clone();
  ray.origin.copy(origin);
  const longitudes = [];
  let minLatitude = Infinity,
    maxLatitude = -Infinity,
    hitCount = 0;
  const includePoint = () => {
    point.sub(earth.position).normalize().applyQuaternion(inverse);
    const latitude = THREE.MathUtils.radToDeg(
      Math.asin(THREE.MathUtils.clamp(point.y, -1, 1)),
    );
    const longitude =
      THREE.MathUtils.euclideanModulo(
        THREE.MathUtils.radToDeg(Math.atan2(-point.z, point.x)) +
          longitudeShift +
          180,
        360,
      ) - 180;
    minLatitude = Math.min(minLatitude, latitude);
    maxLatitude = Math.max(maxLatitude, latitude);
    longitudes.push(longitude);
  };
  for (let iy = 0; iy <= rows; iy++)
    for (let ix = 0; ix <= columns; ix++) {
      direction
        .set((ix / columns) * 2 - 1, (iy / rows) * 2 - 1, 0.5)
        .unproject(camera)
        .sub(origin)
        .normalize();
      ray.direction.copy(direction);
      if (!ray.intersectSphere(sphere, point)) continue;
      includePoint();
      hitCount++;
    }
  // Pixel-grid rays under-sample the grazing limb, where longitude grows quickly.
  // Include a dense analytic tangent circle clipped to the actual perspective.
  const viewNormal = origin.clone().sub(earth.position).normalize();
  const distance = origin.distanceTo(earth.position);
  const limbCenter = earth.position
    .clone()
    .addScaledVector(viewNormal, (180 * 180) / distance);
  const limbRadius = 180 * Math.sqrt(1 - (180 * 180) / (distance * distance));
  const tangentX = new THREE.Vector3(1, 0, 0)
    .addScaledVector(viewNormal, -viewNormal.x)
    .normalize();
  const tangentY = new THREE.Vector3().crossVectors(viewNormal, tangentX);
  const projected = new THREE.Vector3();
  let limbSamples = 0;
  for (let i = 0; i < 4096; i++) {
    const angle = (i / 4096) * Math.PI * 2;
    point
      .copy(limbCenter)
      .addScaledVector(tangentX, limbRadius * Math.cos(angle))
      .addScaledVector(tangentY, limbRadius * Math.sin(angle));
    projected.copy(point).project(camera);
    if (
      Math.abs(projected.x) > 1 ||
      Math.abs(projected.y) > 1 ||
      projected.z > 1 ||
      projected.z < -1
    )
      continue;
    includePoint();
    limbSamples++;
  }
  const longitude = circularBounds(longitudes);
  return {
    hitCount,
    screenRayFraction: rounded(hitCount / ((columns + 1) * (rows + 1))),
    latitude: longitudes.length
      ? [rounded(minLatitude), rounded(maxLatitude)]
      : null,
    longitude,
    fixedLongitudeRange: longitudes.length
      ? [rounded(longitudes[0]), rounded(longitudes.at(-1))]
      : null,
    fixedAntimeridianClearanceDegrees: longitudes.length
      ? rounded(
          180 - Math.max(Math.abs(longitudes[0]), Math.abs(longitudes.at(-1))),
        )
      : null,
    rayGrid: [columns + 1, rows + 1],
    limbSamples,
  };
}
for (const [width, height] of [
  [1280, 720],
  [1440, 900],
  [1920, 1080],
  [2560, 1080],
  [2560, 600],
  [1024, 768],
  [768, 1024],
  [390, 844],
  [360, 800],
  [844, 390],
  [768, 4096],
]) {
  const home = overviewPose(width, height);
  environment.resize(width, height, 1);
  const physical = new THREE.PerspectiveCamera(38, width / height, 0.5, 500);
  const reference = physical.clone();
  referenceRig.apply(
    reference,
    home.target,
    home.direction,
    home.distance,
    home.roll,
  );
  function sample(name, pose, pitch = 0, yaw = 0, hover = null) {
    const direction = pose.direction
      .clone()
      .applyEuler(new THREE.Euler(pitch, yaw, 0));
    const target = pose.target.clone();
    if (hover) target.add(new THREE.Vector3(hover[0], hover[1], 0));
    rig.apply(
      physical,
      target,
      direction,
      pose.distance * (hover ? 0.975 : 1),
      pose.roll,
    );
    environment.followCamera(physical, reference);
    samples.push({
      viewport: [width, height],
      state: name,
      angles: [pitch, yaw],
      camera: {
        position: environment.camera.position.toArray(),
        quaternion: environment.camera.quaternion.toArray(),
      },
      ...footprint(environment.camera),
    });
  }
  for (const { name, pose, range } of [
    { name: 'overview', pose: home, range: CAMERA_RANGES.overview },
    ...['projects', 'experience', 'about', 'contact'].map((room) => ({
      name: room,
      pose: roomPose(room, width, height),
      range: CAMERA_RANGES.room,
    })),
  ]) {
    sample(`${name}/neutral`, pose);
    for (const pitch of [-1, 0, 1])
      for (const yaw of [-1, 0, 1]) {
        if (pitch || yaw)
          sample(`${name}/drag`, pose, pitch * range.pitch, yaw * range.yaw);
      }
    for (const pitch of [-1, 1])
      for (const yaw of [-1, 1]) {
        sample(
          `${name}/hover`,
          pose,
          pitch * CAMERA_RANGES.hover.pitch,
          yaw * CAMERA_RANGES.hover.yaw,
        );
      }
  }
  // Include physical translation/dolly caused by hovering every overview room.
  for (const [room, anchor] of Object.entries(data.roomAnchors)) {
    const target = new THREE.Vector3(...anchor).applyAxisAngle(axis, home.roll);
    const hover = [
      (target.x - home.target.x) * 0.022,
      (target.y - home.target.y) * 0.022,
    ];
    for (const sx of [-1, 1])
      for (const sy of [-1, 1])
        sample(
          `overview/hover-${room}-with-drag`,
          home,
          sy * CAMERA_RANGES.overview.pitch,
          sx * CAMERA_RANGES.overview.yaw,
          hover,
        );
  }
  // Conservative interpolation envelope, including the portrait-to-room roll.
  // This is not a frame-for-frame spring or clearance-route replay.
  for (const room of ['projects', 'experience', 'about', 'contact']) {
    const destination = roomPose(room, width, height);
    for (let step = 1; step < 12; step++) {
      const t = step / 12;
      const pose = {
        target: home.target.clone().lerp(destination.target, t),
        direction: home.direction
          .clone()
          .lerp(destination.direction, t)
          .normalize(),
        distance: home.distance * (1 - t) + destination.distance * t,
        roll: home.roll * (1 - t),
      };
      sample(`travel-${room}/${step}`, pose);
      if (height > width) {
        for (const pitch of [-1, 1])
          for (const yaw of [-1, 1])
            sample(
              `travel-${room}/${step}/drag`,
              pose,
              CAMERA_RANGES.overview.pitch * pitch,
              CAMERA_RANGES.overview.yaw * yaw,
            );
      }
    }
  }
}
const visible = samples.filter((sample) => sample.latitude);
const minLatitude = Math.min(...visible.map((sample) => sample.latitude[0]));
const maxLatitude = Math.max(...visible.map((sample) => sample.latitude[1]));
const fixedAntimeridianClearance = Math.min(
  ...visible.map((sample) => sample.fixedAntimeridianClearanceDegrees),
);
if (!(fixedAntimeridianClearance > 0))
  throw new Error('Fixed sphere UV seam enters a sampled viewport.');
const widest = [...visible]
  .sort((a, b) => b.longitude.span - a.longitude.span)
  .slice(0, 12);
const report = {
  createdAt: new Date().toISOString(),
  revision:
    revision ??
    execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  sourceSha256: Object.fromEntries(
    Object.entries(sources).map(([path, text]) => [
      path,
      createHash('sha256').update(text).digest('hex'),
    ]),
  ),
  assumptions: [
    'CPU sphere-ray intersections; no spacecraft occlusion. Conservative for rays hidden by the vessel.',
    'Uses actual production Earth position/orientation, camera registration and camera-fit math with generated spacecraft supports.',
    'Model remains wide as production; current source imports supply spacecraft and navigation helpers. --revision snapshots Earth modules only, and hashes identify both source groups.',
    'Public seed fixture UI inset assumptions: overview top118px portrait/top98px landscape, bottom80px; rooms top24px/bottom80px. Custom identity/header wrapping can change camera translation slightly.',
    'Drag/hover settled extremes sampled. Travel uses finite linear interpolations, not exact timed springs or portrait-clearance itineraries. This is coverage evidence, not a mathematical proof of every possible viewport or trajectory.',
    'Dedicated close reader/Contact-computer poses are not sampled; their narrower input range should be checked in the live visual sweep. There is no configured maximum browser aspect ratio, so finite coverage cannot prove arbitrary aspect ratios safe.',
    'Analytic radius180 sphere slightly overestimates low-poly silhouette. Grid includes all viewport edges plus4096 points on the analytic tangent circle clipped to the frustum; a crop must add latitude safety margins.',
    'A local-Y rotation changes sampled longitude only. Full rotation visits every longitude within these latitude bounds.',
    'The final4096px/180degree period divides360 exactly: RepeatWrapping with repeatU2 makes U0/U1 differ by exactly two texture periods. Existing physical local-Y rotation can continue, including passage of the sphere antimeridian. This is an algebraic UV-phase check, not proof of image-edge or mipmap continuity.',
    'Earlier3072px/135degree and3584px/157.5degree trials have noninteger repeats. They would need fixed-sphere texture scrolling or another mapping to prevent mismatched U0/U1 phase. The recorded fixed-antimeridian clearance describes that rejected alternative, not a requirement for the final integer-repeat solution.',
    'Longitude spans use the shortest circular arc covering sampled hits, not a naive minimum/maximum at the dateline.',
  ],
  summary: {
    scenarios: samples.length,
    visibleScenarios: visible.length,
    latitudeRange: [minLatitude, maxLatitude],
    original8192x4096PixelRows: [
      Math.floor(((90 - maxLatitude) / 180) * 4096),
      Math.ceil(((90 - minLatitude) / 180) * 4096),
    ],
    maxSimultaneousLongitudeSpan: widest[0].longitude.span,
    fixedLongitudeRange: [
      Math.min(...visible.map((sample) => sample.fixedLongitudeRange[0])),
      Math.max(...visible.map((sample) => sample.fixedLongitudeRange[1])),
    ],
    minimumFixedAntimeridianClearanceDegrees: fixedAntimeridianClearance,
    proposedOriginalPixelCrop: {
      x: 3712,
      y: cropY,
      width: tileWidth,
      height: cropHeight,
      longitudePeriodDegrees: (tileWidth / 8192) * 360,
      repeatPeriodSecondsAt0045RadSec:
        ((tileWidth / 8192) * Math.PI * 2) / 0.0045,
      latitudeRange: cropLatitude,
      textureRepeat,
      textureOffset,
      rotatingSphereUvSeam: {
        integerLongitudinalRepeat: Number.isInteger(textureRepeat[0]),
        u0WrappedPhase: moduloOne(textureOffset[0]),
        u1WrappedPhase: moduloOne(textureRepeat[0] + textureOffset[0]),
        phaseDifference: uSeamPhaseDifference,
        completeTurnTexturePeriods: textureRepeat[0],
        preservesPhysicalRotation:
          Number.isInteger(textureRepeat[0]) && uSeamPhaseDifference < 1e-12,
        remainingCheck:
          'Authored first/last columns and filtered mip levels must be visually continuous; this audit does not decode or sample image pixels.',
      },
      sampledLongitudeSpanMarginDegrees: rounded(
        (tileWidth / 8192) * 360 - widest[0].longitude.span,
      ),
      sampledLatitudeMarginDegrees: {
        north: rounded(cropLatitude[1] - maxLatitude),
        south: rounded(minLatitude - cropLatitude[0]),
      },
      caveat:
        'Finite sampled coverage, not a proof for arbitrary browser aspect ratios or every spring trajectory. Crop retains original texel density; source/repaint quality and visual continuity require image checks.',
    },
    tileCandidates: [1536, 2048, 3072, 3584, 4096].map((width) => ({
      width,
      longitudePeriodDegrees: (width / 8192) * 360,
      periodSeconds: ((width / 8192) * Math.PI * 2) / 0.0045,
      sampledSpanMarginDegrees: rounded(
        (width / 8192) * 360 - widest[0].longitude.span,
      ),
    })),
    byViewport: [
      ...new Set(samples.map(({ viewport }) => viewport.join('x'))),
    ].map((key) => {
      const matching = visible.filter(
        ({ viewport }) => viewport.join('x') === key,
      );
      return {
        viewport: matching[0].viewport,
        longitudeMaxSpan: Math.max(
          ...matching.map((sample) => sample.longitude.span),
        ),
        latitudeRange: [
          Math.min(...matching.map((sample) => sample.latitude[0])),
          Math.max(...matching.map((sample) => sample.latitude[1])),
        ],
        fixedAntimeridianClearance: Math.min(
          ...matching.map((sample) => sample.fixedAntimeridianClearanceDegrees),
        ),
      };
    }),
    maximumSpanScenarios: widest.map(
      ({
        viewport,
        state,
        angles,
        longitude,
        latitude,
        screenRayFraction,
      }) => ({
        viewport,
        state,
        angles,
        longitude,
        latitude,
        screenRayFraction,
      }),
    ),
  },
  samples,
};
await mkdir(dirname(output), { recursive: true });
await writeFile(output, JSON.stringify(report, null, 2) + '\n');
environment.dispose();
console.log(JSON.stringify({ output, ...report.summary }, null, 2));
