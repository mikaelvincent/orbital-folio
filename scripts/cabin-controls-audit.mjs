/** node /tmp/audit-current-cabin-controls.mjs /absolute/path/to/orbital-folio [report.json]
 * Imports actual checkout model, scene controls, flight spring, and itinerary helper.
 * Canvas is a non-rendering stub: metadata geometry is real; this is not browser QA.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const root = path.resolve(process.argv[2] ?? process.cwd());
const output = process.argv[3] ?? '/tmp/current-cabin-controls-audit.json';
const require = createRequire(path.join(root, 'package.json'));
const THREE = await import(pathToFileURL(require.resolve('three')));
const files = [
  'components/spacecraft-model.ts',
  'components/spacecraft.tsx',
  'lib/scene-controls.ts',
  'lib/flight.ts',
  'lib/cabin-itinerary.ts',
  'app/globals.css',
];
const sources = Object.fromEntries(
  files.map((file) => [file, fs.readFileSync(path.join(root, file), 'utf8')]),
);
const hashes = Object.fromEntries(
  files.map((file) => [
    file,
    crypto.createHash('sha256').update(sources[file]).digest('hex'),
  ]),
);
globalThis.document = {
  // oxlint-disable-next-line typescript/no-deprecated
  createElement(tag) {
    assert.equal(tag, 'canvas');
    const context = new Proxy(
      {
        measureText(text) {
          return {
            width: String(text).length * 50,
            actualBoundingBoxAscent: 60,
            actualBoundingBoxDescent: 12,
          };
        },
        createLinearGradient() {
          return { addColorStop() {} };
        },
      },
      {
        get(t, k) {
          return k in t ? t[k] : () => {};
        },
      },
    );
    return {
      width: 1,
      height: 1,
      getContext() {
        return context;
      },
    };
  },
};
const { createSpacecraft } = await import(
  pathToFileURL(path.join(root, 'components/spacecraft-model.ts'))
);
const { planCabinItinerary } = await import(
  pathToFileURL(path.join(root, 'lib/cabin-itinerary.ts'))
);
const { moveCameraAxis } = await import(
  pathToFileURL(path.join(root, 'lib/flight.ts'))
);
const {
  fitPerspectiveDistance,
  solveApertureFraming,
  cursorViewSamples,
  beginBoundedDrag,
  updateBoundedDrag,
  endBoundedDrag,
} = await import(pathToFileURL(path.join(root, 'lib/scene-controls.ts')));
const model = createSpacecraft(THREE, {
  layout: 'wide',
  screenLabels: false,
  projects: Array.from({ length: 9 }, (_, i) => ({
    title: `Project ${i + 1}`,
    slug: `project-${i + 1}`,
  })),
  projectPageSize: 9,
  labels: {
    projects: 'Projects',
    experience: 'Experience',
    about: 'About',
    contact: 'Contact',
  },
});
const rooms = ['experience', 'projects', 'about', 'contact'];
const bottomMatch = sources['components/spacecraft.tsx'].match(
  /let bottomReservation = mobile\(\) \? (\d+) : (\d+)/,
);
const mobileBottom = bottomMatch ? Number(bottomMatch[1]) : 132,
  desktopBottom = bottomMatch ? Number(bottomMatch[2]) : 76;
const report = {
  minimumBottomReservation: { mobile: mobileBottom, desktop: desktopBottom },
  at: new Date().toISOString(),
  sourceHashes: hashes,
  method:
    'Current Three model and camera helpers, safe insets top24 and current source minimum bottom reservation; zero device safe-area for numeric framing, actual metadata, nine cursor views, fov38, overscan1.015. Non-rendering canvas stub does not claim pixel correctness.',
  layouts: [],
  input: {},
};
const near = (a, b) => Math.hypot(...a.map((v, i) => v - b[i])) < 1e-9;
const boxPoints = ({ center, size }) =>
  [-1, 1].flatMap((x) =>
    [-1, 1].flatMap((y) =>
      [-1, 1].map((z) => [
        center[0] + (x * size[0]) / 2,
        center[1] + (y * size[1]) / 2,
        center[2] + (z * size[2]) / 2,
      ]),
    ),
  );
for (const layout of ['wide', 'compact']) {
  model.setLayout(layout);
  const data = model.group.userData;
  const point = (room) => [
    data.roomAnchors[room][0],
    data.innerApertureBounds[room].center[1],
    data.roomAnchors[room][2],
  ];
  const via = data.portals.find(
    (p) => p.from === 'projects' && p.to === 'about',
  ).waypoints;
  assert.equal(via.length, 3);
  const nodes = [
    { room: 'experience', position: point('experience') },
    { room: 'projects', position: point('projects') },
    ...via.map((p, i) => ({
      position: [
        p[0],
        i === 0
          ? point('projects')[1]
          : i === via.length - 1
            ? point('about')[1]
            : p[1],
        p[2],
      ],
    })),
    { room: 'about', position: point('about') },
    { room: 'contact', position: point('contact') },
  ];
  const summary = {
    layout,
    nodes,
    roomPairChecks: 0,
    retargetChecks: 0,
    offCorridorChecks: 0,
    retargetExamples: [],
    framing: [],
    overview: [],
  };
  for (const from of rooms)
    for (const to of rooms) {
      const a = nodes.findIndex((n) => n.room === from),
        b = nodes.findIndex((n) => n.room === to),
        result = planCabinItinerary(nodes, nodes[a].position, to);
      assert.ok(near(result.points.at(-1), nodes[b].position));
      const expected = [];
      if (a === b) expected.push(nodes[b].position);
      for (
        let i = a + Math.sign(b - a);
        a !== b && (b > a ? i <= b : i >= b);
        i += Math.sign(b - a)
      )
        expected.push(nodes[i].position);
      assert.deepEqual(result.points, expected);
      summary.roomPairChecks++;
    }
  for (let segment = 0; segment < nodes.length - 1; segment++)
    for (const fraction of [0.1, 0.49, 0.9])
      for (const to of rooms) {
        const start = nodes[segment].position.map(
            (v, i) => v + (nodes[segment + 1].position[i] - v) * fraction,
          ),
          route = planCabinItinerary(nodes, start, to),
          end = nodes.findIndex((n) => n.room === to);
        assert.ok(Math.abs(route.station - segment - fraction) < 1e-9);
        assert.ok(near(route.projection, start));
        assert.ok(
          near(
            route.points[0],
            end > route.station
              ? nodes[segment + 1].position
              : nodes[segment].position,
          ),
        );
        assert.ok(near(route.points.at(-1), nodes[end].position));
        summary.retargetChecks++;
        if (segment >= 2 && segment <= 3 && fraction === 0.49)
          summary.retargetExamples.push({ start, to, points: route.points });
      }
  for (const to of rooms) {
    const start = [via[1][0] + 0.2, 0.1, 0.16],
      route = planCabinItinerary(nodes, start, to);
    assert.ok(Math.abs(route.projection[0] - via[1][0]) < 1e-12);
    assert.ok(near(route.points[0], route.projection));
    const axes = start.map((value) => ({ value, velocity: 0.4 })),
      before = structuredClone(axes);
    planCabinItinerary(nodes, start, to);
    assert.deepEqual(axes, before);
    axes.forEach((axis, i) => moveCameraAxis(axis, route.points[0][i], 1 / 60));
    axes.forEach((axis, i) =>
      assert.ok(
        Math.abs(axis.velocity - before[i].velocity) <= 40 / 60 + 1e-12,
      ),
    );
    summary.offCorridorChecks++;
  }
  for (const [width, height] of [
    [1440, 1000],
    [1920, 1080],
    [768, 1024],
    [390, 844],
    [700, 900],
  ]) {
    const mobile = width < 700,
      aspect = width / height,
      activeLayout = width < 900 || aspect < 1.05 ? 'compact' : 'wide';
    if (layout !== activeLayout) continue;
    const safe = {
      left: -1 + (2 * (mobile ? 14 : 24)) / width,
      right: 1 - (2 * (mobile ? 14 : 24)) / width,
      top: 1 - 48 / height,
      bottom: -1 + (2 * (mobile ? mobileBottom : desktopBottom)) / height,
    };
    for (const room of rooms) {
      const aperture = data.innerApertureBounds[room],
        required = data.requiredFramingPoints[room],
        views = cursorViewSamples({
          target: point(room),
          direction: [0, 0, 1],
        });
      const solved = solveApertureFraming({
        aperture: {
          center: aperture.center,
          right: [1, 0, 0],
          up: [0, 1, 0],
          width: aperture.size[0],
          height: aperture.size[1],
        },
        views,
        requiredPoints: required.map((p) => p.position),
        fovDegrees: 38,
        aspect,
        overscan: 1.015,
        portalBounds: safe,
      });
      const byPoint = required
        .map((p) => ({
          kind: p.kind,
          position: p.position,
          minimum: Math.max(
            ...views.map((v) =>
              fitPerspectiveDistance([p.position], v, 38, aspect, safe),
            ),
          ),
        }))
        .sort((a, b) => b.minimum - a.minimum);
      summary.framing.push({
        viewport: [width, height],
        room,
        safe,
        ...solved,
        chosen: solved.feasible
          ? solved.minimumDistance +
            (solved.maximumDistance - solved.minimumDistance) * 0.16
          : solved.minimumDistance + 0.05,
        drivers: byPoint.slice(0, 2),
      });
    }
    const b = data.overviewBounds,
      target = b.min.map((v, i) => (v + b.max[i]) / 2),
      views = cursorViewSamples({
        target,
        direction: new THREE.Vector3(-0.18, 0.14, 1).normalize().toArray(),
      }),
      all = boxPoints(b),
      cabins = Object.values(data.roomBounds).flatMap(boxPoints),
      walkway = boxPoints(data.walkwayBounds);
    const fit = (points, bounds = safe) =>
      Math.max(
        ...views.map((v) =>
          fitPerspectiveDistance(points, v, 38, aspect, bounds),
        ),
      );
    const peripheral = fit(all, { ...safe, left: -1.3, right: 1.3 });
    summary.overview.push({
      viewport: [width, height],
      target,
      safe,
      allHardwareDistance: fit(all),
      cabinsOnlyPriorityDistance: mobile
        ? Math.max(fit(cabins), peripheral)
        : fit(all),
      cabinsAndWalkwayPriorityDistance: mobile
        ? Math.max(fit([...cabins, ...walkway]), peripheral)
        : fit(all),
      walkwayIncludedByCurrentSource:
        sources['components/spacecraft.tsx'].includes(
          '...model.group.userData.walkwayBounds',
        ) || /walkwayBounds/.test(sources['components/spacecraft.tsx']),
      note: 'Includes no extra hover-dolly margin; current overview hover can reduce distance by 2.5%.',
    });
  }
  report.layouts.push(summary);
}
let drag = beginBoundedDrag({
  pointerId: 1,
  x: 100,
  y: 100,
  response: [0, 0],
  width: 390,
  height: 844,
  targetKey: 'portal:p-a',
});
assert.equal(updateBoundedDrag(drag, 2, 1000, 1000), drag);
drag = updateBoundedDrag(drag, 1, 109, 100);
drag = updateBoundedDrag(drag, 1, 100, 100);
assert.equal(drag.dragging, true);
assert.equal(endBoundedDrag(drag, 1, 100, 100, 'portal:p-a').activate, false);
const fresh = beginBoundedDrag({
  pointerId: 1,
  x: 100,
  y: 100,
  response: [0, 0],
  width: 390,
  height: 844,
  targetKey: 'a',
});
assert.equal(updateBoundedDrag(fresh, 1, 107.999, 100).dragging, false);
assert.equal(updateBoundedDrag(fresh, 1, 108, 100).dragging, true);
report.input = {
  stickyOutAndBack: true,
  secondaryPointerIgnored: true,
  thresholdExactly8CssPixels: true,
  responseWithinBounds: drag.response.every((v) => Math.abs(v) <= 1),
};
// Execute the actual flight-update block with deterministic Three vectors and
// spring states to detect a one-frame intermediate snap on reduced-motion change.
report.initialSettledRoomIsHome = /let lastSettledSection = 'home'/.test(
  sources['components/spacecraft.tsx'],
);
const integration = sources['components/spacecraft.tsx'],
  draw = integration.indexOf('const draw ='),
  start = integration.indexOf('if (travelling) {', draw),
  end = integration.indexOf('const motionDelta', start);
assert.ok(start > draw && end > start);
const ts = require('typescript');
const block = ts.transpileModule(integration.slice(start, end), {
  compilerOptions: { target: ts.ScriptTarget.ES2020 },
}).outputText;
// Execute the inspected local source in an isolated, deterministic test harness.
// oxlint-disable-next-line typescript/no-implied-eval
const harness = new Function(
  'THREE',
  'moveCameraAxis',
  `
 let stop=true,flightImmediate=true,travelling=true,notifyArrival=true,arrivals=0,active='contact',lastSettledSection='projects';
 let currentTarget=new THREE.Vector3(-2,1.8,.16),nextTarget=new THREE.Vector3(-5,0,.16),viewDirection=new THREE.Vector3(0,0,1),nextDirection=viewDirection.clone();
 const el={dataset:{}};
 let distance=4,nextDistance=4,roll=0,nextRoll=0;
 const axis=(value)=>({value,velocity:0});const targetMotion=currentTarget.toArray().map(axis),directionMotion=viewDirection.toArray().map(axis),distanceMotion=axis(4),rollMotion=axis(0);
 const resetAxis=(state,value)=>{state.value=value;state.velocity=0;};const renderer={shadowMap:{needsUpdate:false}},latest={current:{onSettled(){arrivals++}}};
 const final={target:new THREE.Vector3(2,-1.3,.16),direction:new THREE.Vector3(0,0,1),distance:3.8,roll:0};let itinerary=[final];
 const aim=(pose)=>{nextTarget.copy(pose.target);nextDirection.copy(pose.direction);nextDistance=pose.distance;nextRoll=pose.roll;};
 function step(){const delta=1/60;${block};return{target:currentTarget.toArray(),travelling,arrivals,remaining:itinerary.length};}
 return{first:step(),second:step(),final:final.target.toArray()};
`,
);
const immediate = harness(THREE, moveCameraAxis);
report.reducedMotion = {
  ...immediate,
  finalOnFirstFrame: near(immediate.first.target, immediate.final),
};
report.safeAreaStaticReview = {
  measuresCollapsedNavigation:
    /querySelector\('\.flight-navigation'\)/.test(integration) &&
    integration.includes('rect.bottom - dock.top + 14'),
  readerUsesSameReservation: integration.includes('bottom: bottomReservation'),
  breakpointAligned:
    /@media \(max-width: 699px\) \{\s*\.flight-navigation/.test(
      sources['app/globals.css'],
    ),
  zeroInset: { phone: mobileBottom, desktop: desktopBottom },
  phoneInset34Reservation: Math.max(mobileBottom, 74 + 34 + 44 + 14),
  note: 'Source review, plus collapsed44px control CSS arithmetic. Real device geometry still requires browser QA.',
};
fs.writeFileSync(output, JSON.stringify(report, null, 2));
console.log(
  JSON.stringify(
    {
      output,
      sourceHashes: hashes,
      layouts: report.layouts.map((l) => ({
        layout: l.layout,
        roomPairs: l.roomPairChecks,
        midSegmentRetargets: l.retargetChecks,
        offCorridorChecks: l.offCorridorChecks,
        framing: l.framing.map((r) => ({
          viewport: r.viewport,
          room: r.room,
          feasible: r.feasible,
          min: r.minimumDistance,
          max: r.maximumDistance,
          chosen: r.chosen,
        })),
        overview: l.overview,
      })),
      reducedMotion: report.reducedMotion,
    },
    null,
    2,
  ),
);
