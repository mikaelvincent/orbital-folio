/** CPU-only Earth footprint audit. No browser, rendering, texture decode or timing claim.
 * node scripts/benchmarks/earth-visible-coverage.mjs [--revision REV] [--out PATH]
 *   [--tile-width 2560] [--crop-y 384] [--crop-height 1536]
 *   [--mobile-mesh] [--gzip-samples] [--angular-tolerance 5.5] [--position-tolerance .25]
 *   [--projects-only] limits the audit to Projects room/application/resize poses.
 *   [--case-studies-only] limits it to the Case studies room/terminal/resize poses.
 *   [--about-only] limits it to About room/notebook/entry/exit/resize poses.
 * Uses production Earth placement, spacecraft supports, camera-fit helpers and
 * world-camera registration. UI insets use the documented public seed fixture.
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { dirname, resolve, relative } from 'node:path';
import { build } from 'esbuild';
import * as THREE from 'three';
import { meshUvCoverage } from './mesh-uv-coverage.mjs';
import { contactApplicationLayout } from '../../features/spacecraft/navigation/contact-computer.ts';
import { projectApplicationLayout } from '../../features/spacecraft/navigation/project-application.ts';
import { fitAboutNotebook } from '../../features/spacecraft/navigation/about-notebook.ts';
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';
import {
  createOverviewFlight,
  sampleOverviewFlight,
} from '../../features/spacecraft/navigation/overview-flight.ts';
import { createVesselCameraFrame } from '../../features/spacecraft/navigation/vessel-camera.ts';
import {
  responsiveCameraFov,
  overviewCameraDirection,
  overviewCameraRange,
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
const projectsOnly = process.argv.includes('--projects-only');
const caseStudiesOnly = process.argv.includes('--case-studies-only');
const aboutOnly = process.argv.includes('--about-only');
if ([projectsOnly, caseStudiesOnly, aboutOnly].filter(Boolean).length > 1)
  throw new RangeError('Choose one focused application audit.');
const focused = projectsOnly || caseStudiesOnly || aboutOnly;
const rooms = projectsOnly
  ? ['projects']
  : caseStudiesOnly
    ? ['experience']
    : aboutOnly
      ? ['about']
      : ['projects', 'experience', 'about', 'contact'];
const tileWidth = Number(argument('--tile-width') ?? 2560);
const positionTolerance = Number(argument('--position-tolerance') ?? 0.25);
const angularToleranceDegrees = Number(argument('--angular-tolerance') ?? 5.5);
if (
  ![positionTolerance, angularToleranceDegrees].every(Number.isFinite) ||
  positionTolerance < 0 ||
  angularToleranceDegrees < 0 ||
  angularToleranceDegrees > 45
)
  throw new RangeError('Invalid continuous pose tolerance.');
const cropY = Number(argument('--crop-y') ?? 384);
const cropHeight = Number(argument('--crop-height') ?? 1536);
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
  argument('--out') ?? 'docs/evidence/earth-consistent-loop/coverage.json',
);
const root = process.cwd();
const sourcePaths = [
  'features/orbit/orbital-environment.ts',
  'features/orbit/earth-view-transform.ts',
  'features/orbit/earth-satellite.ts',
  'features/orbit/night-atmosphere.ts',
  'features/spacecraft/navigation/scene-controls.ts',
  'features/spacecraft/navigation/vessel-camera.ts',
  'features/spacecraft/navigation/overview-flight.ts',
  'features/spacecraft/navigation/flight.ts',
  'features/spacecraft/navigation/contact-computer.ts',
  'features/spacecraft/navigation/project-application.ts',
  'features/spacecraft/navigation/about-notebook.ts',
  'features/spacecraft/spacecraft-runtime.ts',
  'features/spacecraft/spacecraft-model.ts',
  'features/spacecraft/rooms/projects-workshop.ts',
  'features/spacecraft/rooms/projects-payload-module.ts',
  'features/spacecraft/rooms/case-study-archive.ts',
  'features/spacecraft/rooms/about-personal-study.ts',
  'features/spacecraft/rooms/about-notebook-layout.ts',
  'features/spacecraft/rooms/cabin-composition.ts',
  'lib/content/case-study-content.ts',
  'scripts/benchmarks/earth-visible-coverage.mjs',
  'scripts/benchmarks/mesh-uv-coverage.mjs',
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
const bundleOptions = {
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
};
const bundle = await build(bundleOptions);
const { createOrbitalEnvironment } = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`
);
const transformBundle = await build({
  ...bundleOptions,
  entryPoints: ['features/orbit/earth-view-transform.ts'],
});
const { createOrbitalWorldReference } = await import(
  `data:text/javascript;base64,${Buffer.from(transformBundle.outputFiles[0].text).toString('base64')}`
);
const model = createSpacecraft(THREE, { layout: 'wide' });
const data = model.group.userData;
const axis = new THREE.Vector3(0, 0, 1);
const rig = createVesselCameraFrame(THREE);
const environment = createOrbitalEnvironment(THREE, () => {}, {
  cameraFov: 38,
  mobile: process.argv.includes('--mobile-mesh'),
  earthTexture: new THREE.Texture({ width: 8192, height: 4096 }),
});
await environment.ready;
const surface = environment.scene.getObjectByName('satellite-earth-surface');
const rounded = (value) => Math.round(value * 1e6) / 1e6;
const signedAngle = (fraction, maximum, minimum = -maximum) =>
  fraction < 0 ? -fraction * minimum : fraction * maximum;
const portraitRange = overviewCameraRange(0.5);
const landscapeRange = overviewCameraRange(2);
const overviewResizeRange = {
  pitch: Math.max(portraitRange.pitch, landscapeRange.pitch),
  yaw: Math.max(portraitRange.yaw, landscapeRange.yaw),
  minPitch: Math.min(
    portraitRange.minPitch ?? -portraitRange.pitch,
    landscapeRange.minPitch ?? -landscapeRange.pitch,
  ),
  minYaw: Math.min(
    portraitRange.minYaw ?? -portraitRange.yaw,
    landscapeRange.minYaw ?? -landscapeRange.yaw,
  ),
};

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
      responsiveCameraFov(width / height),
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
        width < height ? 8 : 4,
        overviewCameraRange(width / height),
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
              responsiveCameraFov(width / height),
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
    responsiveCameraFov(width / height),
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
function readerPose(_room, width, height) {
  model.group.updateMatrixWorld(true);
  const pose = fitAboutNotebook(
    THREE,
    data.aboutNotebook,
    width,
    height,
    responsiveCameraFov(width / height),
  );
  return {
    ...pose,
    target: new THREE.Vector3(...pose.target),
    direction: new THREE.Vector3(...pose.direction),
    roll: 0,
    near: 0.08,
  };
}
function computerPose(width, height) {
  model.group.updateMatrixWorld(true);
  const computer = data.contactComputer;
  const bottom = width < 700 ? 132 : 80;
  const layout = contactApplicationLayout(
    width,
    height,
    computer.width,
    computer.height,
    bottom,
  );
  const target = computer.anchor.getWorldPosition(new THREE.Vector3());
  const direction = new THREE.Vector3(0, 0, 1),
    points = [];
  if (layout.portrait) {
    for (const x of [-layout.width / 2, layout.width / 2])
      for (const y of [-layout.height / 2, layout.height / 2])
        points.push(
          computer.anchor.localToWorld(new THREE.Vector3(x, y, 0)).toArray(),
        );
  } else {
    for (const root of [computer.root, computer.keyboard.root]) {
      const bounds = new THREE.Box3().setFromObject(root);
      for (const x of [bounds.min.x, bounds.max.x])
        for (const y of [bounds.min.y, bounds.max.y])
          for (const z of [bounds.min.z, bounds.max.z]) points.push([x, y, z]);
    }
    direction.set(0, 0.12, 1).normalize();
  }
  const framed = fitPerspectiveFrame(
    points,
    { target: target.toArray(), direction: direction.toArray() },
    responsiveCameraFov(width / height),
    width / height,
    {
      left: -1 + 32 / width,
      right: 1 - 32 / width,
      top: 1 - (2 * (layout.portrait ? 64 : 20)) / height,
      bottom: -1 + (2 * bottom) / height,
    },
  );
  return {
    target: new THREE.Vector3(...framed.target),
    direction,
    distance: framed.distance * (layout.portrait ? 1 : 1.06),
    roll: 0,
  };
}
function projectApplicationPose(
  screen,
  width,
  height,
  useSurfaceNormal = false,
) {
  model.group.updateMatrixWorld(true);
  const bottom = width < 700 ? 132 : 80;
  const layout = projectApplicationLayout(
    width,
    height,
    screen.width,
    screen.height,
    bottom,
  );
  const direction = new THREE.Vector3(0, 0, 1);
  if (useSurfaceNormal)
    direction
      .applyQuaternion(screen.anchor.getWorldQuaternion(new THREE.Quaternion()))
      .normalize();
  const points = [];
  for (const x of [-layout.framing.width / 2, layout.framing.width / 2])
    for (const y of [-layout.framing.height / 2, layout.framing.height / 2])
      points.push(
        screen.anchor.localToWorld(new THREE.Vector3(x, y, 0)).toArray(),
      );
  const framed = fitPerspectiveFrame(
    points,
    {
      target: screen.anchor.getWorldPosition(new THREE.Vector3()).toArray(),
      direction: direction.toArray(),
    },
    responsiveCameraFov(width / height),
    width / height,
    {
      left: -1 + 32 / width,
      right: 1 - 32 / width,
      top: 1 - (2 * (layout.portrait ? 64 : 30)) / height,
      bottom: -1 + (2 * bottom) / height,
    },
    0.1,
  );
  return {
    target: new THREE.Vector3(...framed.target),
    direction,
    distance: framed.distance * (layout.portrait ? 1 : 1.06),
    roll: 0,
    near: 0.08,
  };
}
if (!Array.isArray(data.projectScreens) || data.projectScreens.length !== 4)
  throw new Error(
    'The Projects coverage fixture expects all four physical monitor anchors.',
  );
if (!data.caseStudyComputer?.anchor || data.caseStudyScreens?.length !== 5)
  throw new Error(
    'The Case studies coverage fixture expects one terminal and five category controls.',
  );
if (!data.aboutNotebook?.framingAnchor)
  throw new Error(
    'The About coverage fixture expects the retained notebook anchor.',
  );
const samples = [];
const hasViewportComposition =
  typeof environment.setViewportComposition === 'function';
let compositionClock = 0;
function footprint(camera) {
  const result = meshUvCoverage(surface, camera);
  const guarded = meshUvCoverage(surface, camera, {
    positionTolerance,
    angularTolerance: THREE.MathUtils.degToRad(angularToleranceDegrees),
    sameLatitude: false,
  });
  if (!result) return { latitude: null, guarded };
  return {
    ...result,
    guarded,
    latitude: result.v.map((v) => rounded((v - 0.5) * 180)),
    longitude: {
      start: rounded(result.u[0] * 360 - 180),
      endUnwrapped: rounded(result.u[1] * 360 - 180),
      span: rounded((result.u[1] - result.u[0]) * 360),
    },
    fixedLongitudeRange: result.u.map((u) => rounded(u * 360 - 180)),
    fixedAntimeridianClearanceDegrees: rounded(
      result.fixedSeamClearanceDegrees,
    ),
  };
}
const viewports = [
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
  [320, 568],
  [320, 1200],
  [1080, 1920],
  [4096, 768],
  [700, 701],
  [701, 700],
];
const singleViewport = argument('--viewport')?.split('x').map(Number);
if (
  singleViewport &&
  (singleViewport.length !== 2 ||
    !singleViewport.every((v) => Number.isInteger(v) && v > 0))
)
  throw new RangeError('Expected --viewport WIDTHxHEIGHT.');
for (const [width, height] of singleViewport
  ? [singleViewport]
  : process.argv.includes('--quick')
    ? viewports.slice(0, 1)
    : viewports) {
  const home = overviewPose(width, height);
  const fieldOfView = responsiveCameraFov(width / height);
  environment.resize(width, height, 1, fieldOfView);
  const physical = new THREE.PerspectiveCamera(
    fieldOfView,
    width / height,
    0.5,
    500,
  );
  const reference = createOrbitalWorldReference
    ? createOrbitalWorldReference(THREE)
    : physical.clone();
  if (!createOrbitalWorldReference)
    rig.apply(reference, home.target, home.direction, home.distance, home.roll);
  let sampledCompositionRadians = null;
  if (hasViewportComposition) {
    environment.setViewportComposition(height > width, reference, true);
    sampledCompositionRadians = home.roll;
  }
  const projectPoses = (
    caseStudiesOnly || aboutOnly ? [] : data.projectScreens
  ).map((screen) => ({
    name: `projects-application-${screen.category}`,
    pose: projectApplicationPose(screen, width, height),
    range: CAMERA_RANGES.computer,
  }));
  const caseStudyPoses =
    projectsOnly || aboutOnly
      ? []
      : [
          {
            name: 'case-studies-application-terminal',
            pose: projectApplicationPose(
              data.caseStudyComputer,
              width,
              height,
              true,
            ),
            range: CAMERA_RANGES.computer,
          },
        ];
  const aboutPoses =
    !focused || aboutOnly
      ? [
          {
            name: 'about-notebook',
            pose: readerPose('about', width, height),
            range: CAMERA_RANGES.computer,
          },
        ]
      : [];
  function sample(name, pose, pitch = 0, yaw = 0, hover = null) {
    physical.near = pose.near ?? 0.5;
    physical.updateProjectionMatrix();
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
    if (hasViewportComposition) environment.followCamera(physical, reference);
    else environment.followCamera(physical, reference, pose.roll);
    samples.push({
      viewport: [width, height],
      verticalFieldOfView: fieldOfView,
      layoutRollRadians: pose.roll,
      viewportCompositionRadians: sampledCompositionRadians,
      spacecraftNearPlane: physical.near,
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
    ...(!focused
      ? [
          {
            name: 'overview',
            pose: home,
            range: overviewCameraRange(width / height),
          },
        ]
      : []),
    ...rooms.map((room) => ({
      name: room,
      pose: roomPose(room, width, height),
      range: CAMERA_RANGES.room,
    })),
    ...aboutPoses,
    ...(!focused
      ? [
          {
            name: 'contact-computer',
            pose: computerPose(width, height),
            range: CAMERA_RANGES.computer,
          },
        ]
      : []),
    ...projectPoses,
    ...caseStudyPoses,
  ]) {
    sample(`${name}/neutral`, pose);
    for (const pitch of [-1, -0.5, 0, 0.5, 1])
      for (const yaw of [-1, -0.5, 0, 0.5, 1]) {
        if (pitch || yaw)
          sample(
            `${name}/drag`,
            pose,
            signedAngle(pitch, range.pitch, range.minPitch),
            signedAngle(yaw, range.yaw, range.minYaw),
          );
      }
    for (const pitch of [-1, 1])
      for (const yaw of [-1, 1]) {
        sample(
          `${name}/hover`,
          pose,
          Math.max(
            range.minPitch ?? -range.pitch,
            Math.min(range.pitch, pitch * CAMERA_RANGES.hover.pitch),
          ),
          Math.max(
            range.minYaw ?? -range.yaw,
            Math.min(range.yaw, yaw * CAMERA_RANGES.hover.yaw),
          ),
        );
      }
  }
  // Application entry/exit and monitor switches use the ordinary production
  // spring axes, not the portrait overview-flight curve. Preserve exact fitted
  // endpoints, sample their positional envelope, and cover both angle profiles
  // while those bounds ease. This is not an exact time replay of those springs.
  const projectRoom = roomPose('projects', width, height);
  const projectTransitions = [
    ...projectPoses.map((application) => ({
      name: `room-and-${application.name}`,
      start: projectRoom,
      end: application.pose,
    })),
    ...projectPoses.flatMap((from, index) =>
      projectPoses.slice(index + 1).map((to) => ({
        name: `${from.name}-and-${to.name}`,
        start: from.pose,
        end: to.pose,
      })),
    ),
  ];
  const caseStudyTransitions = caseStudyPoses.map((application) => ({
    name: `room-and-${application.name}`,
    start: roomPose('experience', width, height),
    end: application.pose,
  }));
  const aboutTransitions = aboutPoses.map((application) => ({
    name: `room-and-${application.name}`,
    start: roomPose('about', width, height),
    end: application.pose,
  }));
  const transitionPose = (transition, fraction) => ({
    target: transition.start.target
      .clone()
      .lerp(transition.end.target, fraction),
    direction: transition.start.direction
      .clone()
      .lerp(transition.end.direction, fraction)
      .normalize(),
    distance:
      transition.start.distance * (1 - fraction) +
      transition.end.distance * fraction,
    roll: 0,
    near: 0.08,
  });
  const transitionRange = {
    pitch: Math.max(CAMERA_RANGES.room.pitch, CAMERA_RANGES.computer.pitch),
    yaw: Math.max(CAMERA_RANGES.room.yaw, CAMERA_RANGES.computer.yaw),
  };
  const applicationTransitions = [
    ...projectTransitions.map((transition) => ({
      ...transition,
      scope: 'projects',
    })),
    ...caseStudyTransitions.map((transition) => ({
      ...transition,
      scope: 'case-studies',
    })),
    ...aboutTransitions.map((transition) => ({
      ...transition,
      scope: 'about',
    })),
  ];
  for (const transition of applicationTransitions)
    for (const fraction of [0, 0.25, 0.5, 0.75, 1]) {
      const pose = transitionPose(transition, fraction);
      const label = `${transition.scope}-application-travel/${transition.name}/${fraction}`;
      sample(`${label}/neutral`, pose);
      for (const pitch of [-1, 1])
        for (const yaw of [-1, 1])
          sample(
            `${label}/angle-envelope`,
            pose,
            pitch * transitionRange.pitch,
            yaw * transitionRange.yaw,
          );
    }
  // Include physical translation/dolly caused by hovering every overview room.
  for (const [room, anchor] of focused
    ? []
    : Object.entries(data.roomAnchors)) {
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
          signedAngle(
            sy,
            overviewCameraRange(width / height).pitch,
            overviewCameraRange(width / height).minPitch,
          ),
          signedAngle(
            sx,
            overviewCameraRange(width / height).yaw,
            overviewCameraRange(width / height).minYaw,
          ),
          hover,
        );
  }
  // Portrait flights bake the displayed departure offset into the production
  // eye/focus path; input springs reset, so do not add that drag a second time.
  // Keep landscape's endpoint envelope: its ordinary springs are unchanged.
  const toFlightPose = (pose) => ({
    ...pose,
    target: pose.target.toArray(),
    direction: pose.direction.toArray(),
  });
  const fromFlightPose = (pose) => ({
    ...pose,
    target: new THREE.Vector3(...pose.target),
    direction: new THREE.Vector3(...pose.direction),
  });
  const departurePose = (pose, pitch, yaw, hover = null) => ({
    ...pose,
    target: pose.target.clone().add(new THREE.Vector3(...(hover ?? [0, 0]), 0)),
    direction: pose.direction
      .clone()
      .applyEuler(new THREE.Euler(pitch, yaw, 0)),
    distance: pose.distance * (hover ? 0.975 : 1),
  });
  for (const room of focused
    ? []
    : ['projects', 'experience', 'about', 'contact']) {
    const destination = roomPose(room, width, height);
    if (home.roll) {
      for (const returning of [false, true]) {
        const start = returning ? destination : home;
        const end = returning ? home : destination;
        const range = returning
          ? CAMERA_RANGES.room
          : overviewCameraRange(width / height);
        const departures = [];
        for (const pitch of [-1, -0.5, 0, 0.5, 1])
          for (const yaw of [-1, -0.5, 0, 0.5, 1])
            departures.push({
              name: `drag-${pitch}-${yaw}`,
              pose: departurePose(
                start,
                signedAngle(pitch, range.pitch, range.minPitch),
                signedAngle(yaw, range.yaw, range.minYaw),
              ),
            });
        if (!returning) {
          const anchor = new THREE.Vector3(
            ...data.roomAnchors[room],
          ).applyAxisAngle(axis, home.roll);
          const hover = [
            (anchor.x - home.target.x) * 0.022,
            (anchor.y - home.target.y) * 0.022,
          ];
          for (const pitch of [-1, 1])
            for (const yaw of [-1, 1])
              departures.push({
                name: `hover-dolly-drag-${pitch}-${yaw}`,
                pose: departurePose(
                  start,
                  signedAngle(pitch, range.pitch, range.minPitch),
                  signedAngle(yaw, range.yaw, range.minYaw),
                  hover,
                ),
              });
        }
        for (const departure of departures) {
          const flight = createOverviewFlight(
            toFlightPose(departure.pose),
            toFlightPose(end),
          );
          for (let step = 1; step < 24; step++) {
            sample(
              `travel-${room}/${returning ? 'return' : 'outbound'}/${departure.name}/${step}`,
              fromFlightPose(sampleOverviewFlight(flight, step / 24)),
            );
          }
        }
      }
    } else {
      for (let step = 1; step < 12; step++) {
        const t = step / 12;
        const pose = {
          target: home.target.clone().lerp(destination.target, t),
          direction: home.direction
            .clone()
            .lerp(destination.direction, t)
            .normalize(),
          distance: home.distance * (1 - t) + destination.distance * t,
          roll: 0,
        };
        const label = `travel-${room}/landscape-envelope/${step}`;
        sample(label, pose);
        for (const pitch of [-1, -0.5, 0, 0.5, 1])
          for (const yaw of [-1, -0.5, 0, 0.5, 1])
            sample(
              `${label}/drag`,
              pose,
              CAMERA_RANGES.overview.pitch * pitch,
              CAMERA_RANGES.overview.yaw * yaw,
            );
      }
    }
  }
  if (hasViewportComposition) {
    // Projection changes immediately on resize, while Earth art direction and
    // camera layout roll ease independently. Cross their fractions rather than
    // assuming their clocks or damping are coupled. Exercise the public API.
    const portrait = height > width;
    const startRoll = portrait ? 0 : Math.PI / 2;
    const targetRoll = portrait ? Math.PI / 2 : 0;
    const resizePoses = [
      ...(focused ? [] : [0, 0.25, 0.5, 0.75, 1]).map((fraction) => ({
        name: `overview-camera-roll-${fraction}`,
        pose: {
          ...home,
          roll: startRoll + (targetRoll - startRoll) * fraction,
        },
        // The bounds ease independently when the viewport changes orientation.
        // Cover their union rather than assuming the target limits apply at once.
        range: overviewResizeRange,
      })),
      ...rooms.map((room) => ({
        name: room,
        pose: roomPose(room, width, height),
        range: CAMERA_RANGES.room,
      })),
      ...aboutPoses,
      ...(!focused
        ? [
            {
              name: 'contact-computer',
              pose: computerPose(width, height),
              range: CAMERA_RANGES.computer,
            },
          ]
        : []),
      ...projectPoses,
      ...caseStudyPoses,
      ...caseStudyTransitions.flatMap((transition) =>
        [0.25, 0.5, 0.75].map((fraction) => ({
          name: `case-studies-application-travel-${fraction}`,
          pose: transitionPose(transition, fraction),
          range: transitionRange,
        })),
      ),
      ...aboutTransitions.flatMap((transition) =>
        [0.25, 0.5, 0.75].map((fraction) => ({
          name: `about-notebook-travel-${fraction}`,
          pose: transitionPose(transition, fraction),
          range: transitionRange,
        })),
      ),
    ];
    for (const fraction of [0, 0.25, 0.5, 0.75, 1]) {
      environment.setViewportComposition(!portrait, reference, true);
      if (fraction === 1) {
        environment.setViewportComposition(portrait, reference, true);
      } else if (fraction > 0) {
        environment.setViewportComposition(portrait, reference);
        compositionClock += -Math.log(1 - fraction) / 8;
        environment.update(compositionClock, true, 0, 0);
      }
      sampledCompositionRadians =
        startRoll + (targetRoll - startRoll) * fraction;
      for (const { name, pose, range } of resizePoses) {
        const label = `orientation-resize-${fraction}/${name}`;
        sample(`${label}/neutral`, pose);
        if (range.pitch || range.yaw)
          for (const pitch of [-1, 1])
            for (const yaw of [-1, 1])
              sample(
                `${label}/drag`,
                pose,
                signedAngle(pitch, range.pitch, range.minPitch),
                signedAngle(yaw, range.yaw, range.minYaw),
              );
      }
    }
    environment.setViewportComposition(portrait, reference, true);
  }
}
const visible = samples.filter((sample) => sample.latitude);
const guarded = samples.map((sample) => sample.guarded).filter(Boolean);
const guardedRows = [
  Math.min(...guarded.map((s) => s.sourcePixelRows[0])),
  Math.max(...guarded.map((s) => s.sourcePixelRows[1])),
];
const minLatitude = Math.min(...visible.map((sample) => sample.latitude[0]));
const maxLatitude = Math.max(...visible.map((sample) => sample.latitude[1]));
const fixedAntimeridianClearance = Math.min(
  ...visible.map((sample) => sample.fixedAntimeridianClearanceDegrees),
);

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
    'CPU homogeneous clipping of the actual rendered sphere triangles, including perspective-correct UV extrema at clipped vertices. Double-precision arithmetic; no rendering, image decode or performance claim.',
    'Front-face culling and all six frustum planes are included. Spacecraft/atmosphere/HTML occlusion is ignored, conservatively retaining hidden Earth pixels.',
    `${createOrbitalWorldReference ? 'Authored world placement' : 'Historical responsive Earth placement/orientation'} and ${createOrbitalWorldReference ? 'canonical' : 'viewport'} world reference come from production. ${hasViewportComposition ? 'The production viewport-composition setter selects a fixed Earth anchor once per viewport, retained through ordinary camera poses. Independent orientation-resize samples use the public setter/update API.' : 'Historical API: each camera sample passes its interpolated layout roll to followCamera; orbital revisions that implement roll compensation consume it, older revisions ignore it.'} Current-source spacecraft supports, camera-fit helpers, retained readers and application monitors provide poses. --revision snapshots orbital modules only; all involved source hashes are retained.`,
    'Public-seed fixture UI inset assumptions: overview top118px portrait/top98px landscape, bottom80px; rooms top24px/bottom80px; notebook/Contact/Projects/Case studies application bottom132px mobile, otherwise80px. About uses its shared production fit with top32px and side20px reservations; Projects and Case studies use their actual portrait64px/landscape30px top reservation. Custom identity/header wrapping and safe areas may change framing.',
    'The production responsive lens is used in every Earth projection and spacecraft overview/room/reader/Contact/Projects/Case studies fit: 38° vertical landscape, 38° minimum horizontal portrait, 78° vertical cap. The current viewport composition remains fixed during navigation; the historical fallback preserves the audited orbital revision behavior.',
    ...(hasViewportComposition
      ? [
          'Orientation-resize samples use the new viewport projection immediately and public composition easing at fractions 0,.25,.5,.75,1, crossed independently with overview camera rolls at the same five fractions; the rooms/applications selected by the audit scope plus drag corners are included. Case studies and About also cross their three interior room-to-application position/angle probes with every resize-composition fraction. Overview resize angles use the conservative union of portrait and landscape drag bounds because those limits ease independently. These finite samples and their neighborhoods do not reproduce every interrupted resize, old-camera distance/target or browser visual-viewport sequence.',
        ]
      : []),
    'All scopes use 5x5 signed bounded angle samples and hover extrema (reachable angular positions, not equal raw drag displacements); negative/positive portrait yaw uses its actual asymmetric bounds, while neutral is always included. Resize-only overview samples conservatively use the union of both orientation profiles. Only the full historical scope includes overview and overview-room travel. In that full scope, portrait travel uses production direct eye/focus createOverviewFlight/sampleOverviewFlight curves at 23 interior times for each of 25 departure-angle pairs in both directions and four extra destination-hover/dolly/drag corners on outbound flights. Those offsets are baked into departure, not reapplied during travel. All four rooms are included, with overview ranges on entry and room ranges on return. Endpoints are covered by settled-state samples. These are actual path samples under documented UI fixtures, not a proof for every custom header, interrupted resize, nonzero incoming velocity or unsettled state. Landscape uses the previous eleven-interpolant endpoint envelope; its acceleration-limited springs and ladder routes are not replayed.',
    `Audit scope: ${projectsOnly ? 'Projects room and all four physical application monitor anchors only. Historical overview/other room travel is excluded from this focused extension.' : caseStudiesOnly ? 'Case studies room and its single physical raked application terminal only, including bounded input, room-terminal travel probes and orientation-resize composition. All five category controls, list/detail and Back share this terminal pose. Unchanged overview and other room travel are excluded.' : aboutOnly ? 'About room and its mounted two-page notebook only, including bounded input, entry/exit travel-envelope probes and orientation-resize composition. Every chapter shares the same complete-spread pose. Unchanged overview and other room travel are excluded.' : 'Full historical room/overview envelope plus the Projects, Case studies and About applications. Retired paper-reader cameras are replaced by actual fixed-object cameras.'}`,
    'Where included by scope, Projects application camera fits use projectApplicationLayout and all four production screen anchors/corner transforms, exact room/application endpoint fits, computer 5x5 hover/drag angular samples, and independently eased orientation-resize composition states. Room↔monitor and all six monitor-pair transitions include endpoints and three interior linear-envelope samples, with neutral and union room/computer angle corners. These are conservative finite position/angle probes, not exact ordinary-spring time replays or a proof of arbitrary interrupted trajectories.',
    'Projects and Case studies use the production 0.1 fit minimum and spacecraft near plane 0.08, retained through application closing/switching envelopes; settled ordinary room poses use near0.5. Orbital followCamera retains its own near/far projection as in production: changing the spacecraft near plane does not change Earth clipping, while the closer fitted physical camera position does.',
    'Case studies uses projectApplicationLayout with caseStudyComputer width/height and transformed framing corners. Its view direction is the terminal anchor world quaternion applied to +Z, matching the production raked-glass normal. The room-terminal transition is sampled at fractions 0,.25,.5,.75,1 with neutral and union room/computer angle corners; its three interior probes are also crossed with every orientation-composition fraction. These linear position/direction/distance probes bound selected finite states; they do not replay independently damped axes, spring overshoot, nonzero incoming velocity or arbitrary interrupted trajectories.',
    'About uses the production fitAboutNotebook helper and complete spread framingAnchor/width/height at every viewport, with a 0.08 fit minimum, 0.08 spacecraft near plane and CAMERA_RANGES.computer hover/drag bounds. No page cropping or stretching is introduced. Room↔notebook travel uses the same finite endpoint/interior position-direction-distance envelope as Case studies, including its three interior probes crossed with all five orientation-composition fractions. These probes cover both entry and exit positions but do not reproduce every spring trajectory, interrupted transition or nonzero incoming velocity.',
    'The default full scope includes the mounted About notebook, Contact computer, Projects monitor cameras and Case studies terminal. There is no configured maximum aspect ratio or minimum pixel dimensions; 17 viewports are an explicit finite audited domain, not a restriction on the application.',
    'The continuous-neighborhood certificate expands clipping half-spaces for bounded camera-position and frustum-plane angular changes relative to the Earth transform at each sampled viewport-composition angle (or historical layout roll). It covers those relative neighborhoods, not an independent unbounded change of Earth roll; this audit does not prove their union covers every possible production state.',
    'Scrolling U on a sphere whose only presentation adjustment is the viewport composition (or historical responsive layout roll) means V coverage and the geometric UV seam remain unchanged over the complete playback loop at a given camera/layout pose. RepeatWrapping handles the authored image-edge join; the different U0/U1 phases remain safe only while that geometric seam is hidden.',
    'Maximum same-latitude span compares visible U coordinates at equal V. A larger global longitude envelope across different latitudes alone does not imply simultaneous duplicated landmarks.',
    'Crop preserves native source texel density. Mipmap construction and footprint filtering differ after cropping; row margins do not prove pixel identity at every coarse mip level. Actual-resolution image and seam checks remain necessary.',
  ],
  summary: {
    scope: projectsOnly
      ? 'projects-application-extension'
      : caseStudiesOnly
        ? 'case-studies-application-extension'
        : aboutOnly
          ? 'about-notebook-extension'
          : 'full-camera-envelope',
    projectMonitorCategories: (caseStudiesOnly || aboutOnly
      ? []
      : data.projectScreens
    ).map((screen) => screen.category),
    caseStudyControlCategories: (projectsOnly || aboutOnly
      ? []
      : data.caseStudyScreens
    ).map((screen) => screen.category),
    caseStudyApplicationAnchorCount: projectsOnly || aboutOnly ? 0 : 1,
    aboutNotebookAnchorCount: !focused || aboutOnly ? 1 : 0,
    mesh: process.argv.includes('--mobile-mesh')
      ? 'mobile96x64'
      : 'desktop128x96',
    scenarios: samples.length,
    visibleScenarios: visible.length,
    latitudeRange: [minLatitude, maxLatitude],
    original8192x4096PixelRows: [
      Math.floor(
        Math.min(...visible.map((sample) => sample.sourcePixelRows[0])),
      ),
      Math.ceil(
        Math.max(...visible.map((sample) => sample.sourcePixelRows[1])),
      ),
    ],
    maxSimultaneousLongitudeSpan: widest[0].longitude.span,
    maxSameLatitudeLongitudeSpan: Math.max(
      ...visible.map((sample) => sample.maximumSameLatitudeLongitudeSpan),
    ),
    continuousPoseNeighborhood: {
      positionTolerance,
      planeAngleToleranceDegrees: angularToleranceDegrees,
      sourcePixelRows: guardedRows,
      fixedSeamClearanceDegrees: Math.min(
        ...guarded.map((s) => s.fixedSeamClearanceDegrees),
      ),
      conservativeGlobalLongitudeSpan: Math.max(
        ...guarded.map((s) => (s.u[1] - s.u[0]) * 360),
      ),
      note: 'A mathematical superset for any camera within the stated translation distance and frustum-plane angular difference of an audited pose. This is not a proof that every production trajectory or unbounded viewport is covered by those neighborhoods.',
    },
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
      baseFootprintMinimumHeightRows:
        Math.ceil(guardedRows[1]) - Math.floor(guardedRows[0]),
      guardedCropMarginRows: {
        north: guardedRows[0] - cropY,
        south: cropY + cropHeight - guardedRows[1],
      },
      filteringAllowance: {
        rowsEachEdge: 64,
        includedWithinCrop:
          guardedRows[0] - cropY >= 64 &&
          cropY + cropHeight - guardedRows[1] >= 64,
        recommendedGridMultiple: 128,
        minimumGridAlignedHeightWith64RowAllowance:
          Math.ceil(
            (Math.ceil(guardedRows[1]) +
              64 -
              (Math.floor(guardedRows[0]) - 64)) /
              128,
          ) * 128,
        scope:
          'Practical authored margin; not a guarantee of pixel equality at every mip level. Coarse mip texels can summarize arbitrarily remote rows.',
      },
      textureRepeat,
      textureOffset,
      fixedSphereUvSeam: {
        usesScrollingUv: Boolean(createOrbitalWorldReference),
        sampledSeamClearanceDegrees: fixedAntimeridianClearance,
        guardedSeamClearanceDegrees: Math.min(
          ...guarded.map((s) => s.fixedSeamClearanceDegrees),
        ),
        integerLongitudinalRepeat: Number.isInteger(textureRepeat[0]),
        u0WrappedPhase: moduloOne(textureOffset[0]),
        u1WrappedPhase: moduloOne(textureRepeat[0] + textureOffset[0]),
        phaseDifference: uSeamPhaseDifference,
        completeTurnTexturePeriods: textureRepeat[0],
        wouldRemainContinuousIfSphereRotated:
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
    tileCandidates: [1536, 2048, 2304, 2560, 3072, 3584, 4096].map((width) => ({
      width,
      longitudePeriodDegrees: (width / 8192) * 360,
      periodSeconds: ((width / 8192) * Math.PI * 2) / 0.0045,
      sampledSameLatitudeSpanMarginDegrees: rounded(
        (width / 8192) * 360 -
          Math.max(...visible.map((s) => s.maximumSameLatitudeLongitudeSpan)),
      ),
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
        viewport: key.split('x').map(Number),
        verticalFieldOfView: responsiveCameraFov(
          Number(key.split('x')[0]) / Number(key.split('x')[1]),
        ),
        visibleScenarios: matching.length,
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
        layoutRollRadians,
        longitude,
        latitude,
        sourcePixelRows,
        maximumSameLatitudeLongitudeSpan,
      }) => ({
        viewport,
        state,
        angles,
        layoutRollRadians,
        longitude,
        latitude,
        sourcePixelRows,
        maximumSameLatitudeLongitudeSpan,
      }),
    ),
  },
  samples,
};
await mkdir(dirname(output), { recursive: true });
if (process.argv.includes('--gzip-samples')) {
  const rawOutput = output.replace(/\.json$/, '') + '-poses.json.gz';
  await writeFile(
    rawOutput,
    gzipSync(JSON.stringify({ sourceSha256: report.sourceSha256, samples })),
  );
  const { samples: _omitted, ...summary } = report;
  await writeFile(
    output,
    JSON.stringify(
      { ...summary, rawSamples: relative(dirname(output), rawOutput) },
      null,
      2,
    ) + '\n',
  );
} else await writeFile(output, JSON.stringify(report, null, 2) + '\n');
environment.dispose();
console.log(JSON.stringify({ output, ...report.summary }, null, 2));
