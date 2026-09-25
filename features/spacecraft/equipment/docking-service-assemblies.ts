import { buildSmoothDockingRing } from '../geometry/smooth-docking-ring.ts';
import { clipGeometryPlane } from '../geometry/clip-geometry-plane.ts';
import { PRESSURE_WALL } from '../geometry/spacecraft-wall-layout.ts';
import type {
  ModelPrimitives,
  Transform,
} from '../geometry/model-primitives.ts';

// A short two-axis scan reads from overview without a hard reversal. The
// home hold gives the dish a clear resting pose between deliberate sweeps.
const DISH_TRIM_KEYFRAMES = [
  [0, 0],
  [0.75, 0],
  [3.25, 18],
  [4.5, 18],
  [9, -18],
  [10.25, -18],
  [12.75, 0],
  [18, 0],
] as const;
const DISH_TRIM_PERIOD = 18;

function dishTrimAt(time: number) {
  const phase =
    Math.max(0, Number.isFinite(time) ? time : 0) % DISH_TRIM_PERIOD;
  for (let i = 1; i < DISH_TRIM_KEYFRAMES.length; i++) {
    const [end, target] = DISH_TRIM_KEYFRAMES[i];
    if (phase > end) continue;
    const [start, from] = DISH_TRIM_KEYFRAMES[i - 1];
    if (from === target) return (target * Math.PI) / 180;
    const t = (phase - start) / (end - start);
    const eased = t * t * (3 - 2 * t);
    return ((from + (target - from) * eased) * Math.PI) / 180;
  }
  return 0;
}

/** Docking collar and the opposite service bus, communications and solar wings. */
export function buildDockingAndServiceAssemblies(
  THREE: any,
  helpers: ModelPrimitives,
  group: any,
  unitBox: any,
  boltGeometry: any,
) {
  const {
    mesh,
    box,
    cylinder,
    torus,
    sphere,
    rod,
    instances,
    roundedGeometry,
    axialHull,
    m,
  } = helpers;
  // DOCKING — pressure barrel, mating flange and captive service hardware.
  const docking = new THREE.Group();
  docking.name = 'central-docking-assembly';
  docking.userData = { section: 'contact', batchRoot: true, exterior: true };
  docking.position.set(1.35, 0, 0);
  group.add(docking);
  // A compact coaxial pressure mount seats directly in the ladder sidewall.
  // Its central bore is aligned with the sleeve and the inner hatch; a tall
  // offset block must not appear as an independent panel behind the barrel.
  const dockingMount = mesh(
    buildSmoothDockingRing(THREE, 1.06, 0.915, 0.3),
    m.shell,
    docking,
    'coaxial-docking-load-bearing-mount',
  );
  dockingMount.position.set(-4.58, 0.03, 0);
  const dockingRetainer = mesh(
    buildSmoothDockingRing(THREE, 1.011, 0.91, 0.06),
    m.navy,
    docking,
    'docking-mount-seated-retaining-ring',
  );
  dockingRetainer.position.set(-4.728, 0.03, 0);
  const diaphragm = cylinder(0.948, 0.22, m.navy, -4.6, 0.03, 0, docking, 'x');
  diaphragm.name = 'docking-mount-pressure-diaphragm';
  axialHull(
    [
      [0.81, -0.91],
      [0.845, -0.89],
      [0.91, -0.8],
      [0.967, -0.61],
      [0.986, -0.47],
      [0.989, 0.35],
      [0.979, 0.48],
      [0.928, 0.57],
    ],
    m.shell,
    -5.065,
    0.03,
    0,
    docking,
    'rounded-docking-pressure-sleeve',
  );
  axialHull(
    [
      [0.976, -0.045],
      [1.009, -0.045],
      [1.025, -0.025],
      [1.025, 0.025],
      [1.009, 0.045],
      [0.976, 0.045],
    ],
    m.metal,
    -4.805,
    0.03,
    0,
    docking,
    'raised-docking-metal-band',
  );
  // Broad outer surface stands clear of the sleeve; no tangent ring intersections.
  axialHull(
    [
      [0.976, -0.055],
      [1.008, -0.055],
      [1.028, -0.03],
      [1.028, 0.03],
      [1.008, 0.055],
      [0.976, 0.055],
    ],
    m.gasket,
    -5.5,
    0.03,
    0,
    docking,
    'raised-docking-expansion-band',
  );
  cylinder(0.808, 0.273, m.navy, -6.103, 0.03, 0, docking, 'x').name =
    'docking-collar-neck';
  // A broad satin mating face replaces the inflated bronze bumper. Its bore
  // exposes the dark seal around the pressure leaf; three captive shoes bridge
  // its outer edge. The mounting envelope and hatch reach remain unchanged.
  const flange = mesh(
    buildSmoothDockingRing(THREE, 0.826, 0.618, 0.19),
    m.metal,
    docking,
    'docking-collar-mating-flange',
  );
  flange.position.set(-6.244, 0.03, 0);
  cylinder(0.629, 0.045, m.gasket, -6.36, 0.03, 0, docking, 'x').name =
    'docking-hatch-pressure-seal';
  cylinder(0.575, 0.058, m.chalk, -6.396, 0.03, 0, docking, 'x').name =
    'docking-exterior-pressure-leaf';
  cylinder(0.133, 0.058, m.navy, -6.439, 0.03, 0, docking, 'x').name =
    'docking-exterior-wheel-boss';
  cylinder(0.074, 0.055, m.amber, -6.479, 0.03, 0, docking, 'x').name =
    'docking-exterior-wheel-hub';
  torus(0.245, 0.025, m.navy, -6.493, 0.03, 0, docking, 'x').name =
    'docking-exterior-wheel-rim';
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3;
    rod(
      [-6.493, 0.03 + Math.sin(a) * 0.06, Math.cos(a) * 0.06],
      [-6.493, 0.03 + Math.sin(a) * 0.245, Math.cos(a) * 0.245],
      0.019,
      m.metal,
      docking,
    ).name = 'docking-exterior-wheel-spoke';
    const clamp = new THREE.Group();
    clamp.name = 'docking-captive-flange-clamp';
    clamp.position.y = 0.03;
    clamp.rotation.x = a;
    docking.add(clamp);
    box(
      0.06,
      0.1,
      0.18,
      m.navy,
      -6.36,
      0.772,
      0,
      clamp,
      0.018,
      'docking-clamp-seat',
    );
    box(
      0.05,
      0.074,
      0.11,
      m.amber,
      -6.402,
      0.772,
      0,
      clamp,
      0.015,
      'docking-captive-clamp-shoe',
    );
  }
  const dockingBolts: Transform[] = [];
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    dockingBolts.push({
      p: [-6.351, 0.03 + Math.sin(a) * 0.688, Math.cos(a) * 0.688],
      r: [0, Math.PI / 2, 0],
    });
  }
  instances(
    boltGeometry,
    m.navy,
    dockingBolts,
    docking,
    'docking-collar-fasteners',
  );
  // A shallow access hatch with one continuous folding pull. No paired ports
  // or separate status marks: those read as facial features when the craft rolls.
  // Only this service box changes; its saddle still seats between the bands.
  // The ordinary rounded-box helper has no samples across its flat core.
  // This back needs a continuous curve, so retain transverse samples there.
  const saddleGeometry = new THREE.BoxGeometry(0.59, 0.31, 0.085, 9, 32, 9);
  const positions = saddleGeometry.getAttribute('position');
  const half = [0.295, 0.155, 0.0425];
  const core = half.map((value) => value - 0.035);
  const bevelSteps = [-1, -0.8, -0.45, -0.18, 0, 0, 0.18, 0.45, 0.8, 1];
  for (let i = 0; i < positions.count; i++) {
    const point = [positions.getX(i), positions.getY(i), positions.getZ(i)];
    for (const axis of [0, 2]) {
      const step = Math.round(((point[axis] / half[axis] + 1) * 9) / 2);
      point[axis] =
        Math.sign(step - 4.5) *
        (core[axis] + Math.abs(bevelSteps[step]) * 0.035);
    }
    const center = point.map((value, axis) =>
      Math.max(-core[axis], Math.min(core[axis], value)),
    );
    const normal = new THREE.Vector3(...point)
      .sub(new THREE.Vector3(...center))
      .normalize();
    const x = center[0] + normal.x * 0.035;
    const y = center[1] + normal.y * 0.035;
    const z = center[2] + normal.z * 0.035;
    const back = Math.sqrt(0.989 ** 2 - y ** 2) - 0.006;
    const depthFraction = (z + 0.0425) / 0.085;
    positions.setXYZ(i, x, y, back + depthFraction * (1.005 - back));
  }
  saddleGeometry.computeVertexNormals();
  saddleGeometry.computeBoundingBox();
  saddleGeometry.computeBoundingSphere();
  const saddle = mesh(
    saddleGeometry,
    m.metal,
    docking,
    'docking-service-saddle',
  );
  saddle.position.set(-5.137, 0.03, 0);
  box(
    0.53,
    0.25,
    0.04,
    m.navy,
    -5.137,
    0.03,
    1.015,
    docking,
    0.018,
    'docking-service-cassette',
  );
  // The dark grip well, returned alloy bail and small captive keeper form one
  // handling assembly. The pull's front extent retains the existing camera fit.
  box(
    0.38,
    0.078,
    0.012,
    m.deep,
    -5.137,
    0.03,
    1.035,
    docking,
    0.005,
    'docking-service-grip-well',
  );
  for (const x of [-5.287, -4.987]) {
    box(
      0.044,
      0.06,
      0.016,
      m.metal,
      x,
      0.03,
      1.039,
      docking,
      0.006,
      'docking-service-pull-foot',
    );
    rod([x, 0.03, 1.039], [x, 0.03, 1.055], 0.016, m.metal, docking).name =
      'docking-service-pull-return';
  }
  rod(
    [-5.287, 0.03, 1.055],
    [-4.987, 0.03, 1.055],
    0.016,
    m.metal,
    docking,
  ).name = 'docking-service-folded-pull';
  box(
    0.035,
    0.052,
    0.028,
    m.amber,
    -5.28,
    0.03,
    1.052,
    docking,
    0.008,
    'docking-service-pull-keeper',
  );
  for (const yy of [-0.37, 0.43]) {
    for (const z of [-0.38, -0.167]) {
      cylinder(0.043, 0.028, m.metal, -6.432, yy, z, docking, 'x').name =
        'docking-exterior-handle-foot';
      rod([-6.43, yy, z], [-6.505, yy, z], 0.022, m.navy, docking).name =
        'docking-exterior-handle-return';
    }
    rod(
      [-6.505, yy, -0.38],
      [-6.505, yy, -0.167],
      0.025,
      m.amber,
      docking,
    ).name = 'docking-exterior-handle-grasp';
  }
  // AFT — a shared service bus to the right of both cabins.
  const service = new THREE.Group();
  service.name = 'aft-service-assembly';
  service.userData = { section: 'contact', batchRoot: true, exterior: true };
  service.position.set(-1.5, 0, 0);
  group.add(service);
  // A single structural bus carries the radio cradle and two matched power
  // booms. Broad seated feet transfer loads into the pressure housing; the
  // dish keeps its approved position, leaving the two solar roots clear.
  box(
    0.34,
    0.38,
    0.16,
    m.navy,
    5.085,
    0.18,
    0.85,
    service,
    0.035,
    'communications-hull-saddle',
  );
  box(
    0.28,
    0.3,
    0.026,
    m.metal,
    5.085,
    0.18,
    0.938,
    service,
    0.018,
    'communications-saddle-face',
  );
  for (const y of [0.055, 0.305]) {
    rod([5.085, y, 0.94], [5.63, y, 1.065], 0.042, m.navy, service).name =
      'communications-clevis-arm';
    rod([5.085, y, 0.94], [5.44, y, 0.984], 0.022, m.metal, service).name =
      'communications-clevis-inset';
  }
  cylinder(0.091, 0.29, m.metal, 5.63, 0.18, 1.065, service).name =
    'communications-elevation-axle';
  cylinder(0.059, 0.025, m.amber, 5.63, 0.3375, 1.065, service).name =
    'communications-elevation-retainer';
  // The moving root sits on the existing captive axle. The offset carriage
  // preserves the reflector's approved pose at zero trim, while the cradle,
  // axle and their fixed shadows remain stationary.
  const dishAssembly = new THREE.Group();
  dishAssembly.name = 'service-mounted-communications-dish';
  dishAssembly.userData.animated = true;
  dishAssembly.userData.animatedShadowCaster = true;
  dishAssembly.position.set(5.63, 0.18, 1.065);
  service.add(dishAssembly);
  const dishCarriage = new THREE.Group();
  dishCarriage.name = 'communications-reflector-carriage';
  dishCarriage.position.set(0.01, 0.05, 0.095);
  dishCarriage.rotation.set(-0.1, 0.18, -0.03);
  dishAssembly.add(dishCarriage);
  let previousDishTrim = 0;
  const updateDishTrim = (time: number): boolean => {
    const trim = dishTrimAt(time);
    if (trim === previousDishTrim) return false;
    dishAssembly.rotation.y = trim;
    dishAssembly.rotation.x = trim * 0.6;
    previousDishTrim = trim;
    return true;
  };
  const dishProfile = [
    [0.025, -0.016],
    [0.115, -0.004],
    [0.25, 0.047],
    [0.386, 0.127],
    [0.505, 0.222],
    [0.511, 0.245],
    [0.49, 0.254],
    [0.379, 0.161],
    [0.242, 0.083],
    [0.11, 0.033],
    [0.025, 0.023],
  ];
  const dishGeometry = new THREE.LatheGeometry(
    dishProfile.map(([r, yy]) => new THREE.Vector2(r, yy)),
    64,
  );
  dishGeometry.rotateX(Math.PI / 2);
  const dishMat = m.chalk.clone();
  dishMat.side = THREE.DoubleSide;
  mesh(dishGeometry, dishMat, dishCarriage, 'double-skin-communications-dish');
  torus(0.5, 0.02, m.metal, 0, 0, 0.243, dishCarriage).name =
    'communications-reflector-rim';
  cylinder(0.105, 0.1, m.navy, 0, 0, -0.06, dishCarriage, 'z').name =
    'communications-reflector-back-hub';
  cylinder(0.058, 0.09, m.metal, 0, 0, 0.005, dishCarriage, 'z').name =
    'communications-feed-seat';
  rod([0, 0, 0.041], [0, 0, 0.463], 0.02, m.navy, dishCarriage).name =
    'communications-feed-stem';
  cylinder(0.063, 0.078, m.metal, 0, 0, 0.466, dishCarriage, 'z').name =
    'communications-feed-horn';
  cylinder(0.049, 0.016, m.amber, 0, 0, 0.513, dishCarriage, 'z').name =
    'communications-feed-cap';
  for (const a of [Math.PI / 6, (Math.PI * 5) / 6, (Math.PI * 3) / 2])
    rod(
      [Math.cos(a) * 0.44, Math.sin(a) * 0.44, 0.204],
      [0, 0, 0.429],
      0.008,
      m.metal,
      dishCarriage,
    ).name = 'communications-feed-stay';

  const servicePressureHull = axialHull(
    [
      [0.81, -0.43],
      [0.89, -0.39],
      [0.93, -0.24],
      [0.937, 0.12],
      [0.89, 0.28],
      [0.75, 0.38],
    ],
    m.shell,
    4.916,
    0.03,
    0,
    service,
    'aft-service-pressure-hull',
  );
  // The service assembly's X=4.75 datum follows the outside of the pressure
  // wall in both layouts. Terminate its inboard shell inside that wall, so the
  // circular housing cannot emerge into Contact or Case Studies above it.
  const serviceHullSource = servicePressureHull.geometry;
  servicePressureHull.geometry = clipGeometryPlane(
    THREE,
    serviceHullSource,
    0,
    4.75 - PRESSURE_WALL + 0.005 - servicePressureHull.position.x,
  );
  serviceHullSource.dispose();
  torus(0.911, 0.033, m.metal, 4.95, 0.03, 0, service, 'x');
  cylinder(0.733, 0.17, m.gasket, 5.268, 0.03, 0, service, 'x');
  cylinder(0.631, 0.274, m.navy, 5.462, 0.03, 0, service, 'x');
  axialHull(
    [
      [0.481, -0.235],
      [0.482, -0.12],
      [0.523, 0.055],
      [0.618, 0.263],
      [0.62, 0.287],
      [0.571, 0.304],
      [0.547, 0.269],
      [0.459, 0.06],
      [0.421, -0.135],
    ],
    m.metal,
    5.717,
    0.03,
    0,
    service,
    'radiused-main-engine-nozzle',
  );
  cylinder(0.45, 0.031, m.deep, 5.674, 0.03, 0, service, 'x').name =
    'engine-nozzle-seated-throat';
  torus(0.574, 0.022, m.navy, 6.011, 0.03, 0, service, 'x');
  // Keep the bell a clean satin surface. Bronze identifies the drive pins and
  // radio hardware instead of competing as another concentric nozzle stripe.
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const p = box(
      0.27,
      0.113,
      0.211,
      m.navy,
      5.411,
      0.03 + Math.cos(a) * 0.619,
      Math.sin(a) * 0.619,
      service,
      0.035,
      'engine-jacket-panel',
    );
    p.rotation.x = a;
  }
  const solarWings: any[] = [];
  // Closed-section booms meet visible transverse pivots. Both wings use the
  // same joints and panel construction, mirrored about the service center.
  const boom = (
    from: number[],
    to: number[],
    width: number,
    depth: number,
    material: any,
    name: string,
  ) => {
    const start = new THREE.Vector3(...from),
      end = new THREE.Vector3(...to);
    const center = start.clone().add(end).multiplyScalar(0.5);
    const beam = box(
      width,
      start.distanceTo(end),
      depth,
      material,
      center.x,
      center.y,
      center.z,
      service,
      0.022,
      name,
    );
    beam.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      end.sub(start).normalize(),
    );
    return beam;
  };
  for (const sign of [-1, 1]) {
    box(
      0.29,
      0.16,
      0.25,
      m.navy,
      5.03,
      sign * 0.87,
      0.02,
      service,
      0.04,
      'solar-boom-hull-saddle',
    );
    box(
      0.24,
      0.035,
      0.22,
      m.metal,
      5.03,
      sign * 0.953,
      0.02,
      service,
      0.016,
      'solar-boom-root-flange',
    );
    boom(
      [5.03, sign * 0.943, 0.046],
      [5.61, sign * 1.242, 0.046],
      0.13,
      0.14,
      m.navy,
      'solar-inner-box-boom',
    );
    boom(
      [5.61, sign * 1.242, 0.046],
      [6.094, sign * 1.598, 0.046],
      0.115,
      0.13,
      m.navy,
      'solar-outer-box-boom',
    );
    // A secondary tie into the hull resists out-of-plane bending.
    rod(
      [5.1, sign * 0.85, -0.06],
      [5.56, sign * 1.2, -0.018],
      0.028,
      m.metal,
      service,
    ).name = 'solar-boom-root-tie';
    for (const [x, y, radius] of [
      [5.61, 1.242, 0.132],
      [6.094, 1.598, 0.126],
    ]) {
      cylinder(radius, 0.172, m.metal, x, sign * y, 0.046, service, 'z').name =
        'solar-drive-bearing';
      cylinder(
        radius * 0.73,
        0.02,
        m.navy,
        x,
        sign * y,
        0.141,
        service,
        'z',
      ).name = 'solar-drive-cover';
      cylinder(0.034, 0.023, m.amber, x, sign * y, 0.159, service, 'z').name =
        'solar-drive-captive-pin';
    }
    const wing = new THREE.Group();
    solarWings.push(wing);
    wing.name = sign > 0 ? 'upper-solar-wing' : 'lower-solar-wing';
    wing.position.set(6.1, sign * 2.685, 0.069);
    wing.rotation.z = sign * -0.035;
    service.add(wing);
    box(
      1.227,
      2.1,
      0.067,
      m.navy,
      0,
      0,
      0.015,
      wing,
      0.031,
      'upright-solar-panel-chassis',
    );
    // Rear rails and a root tang make the photovoltaic laminate a supported
    // panel instead of an unarticulated black slab. All stay in the old envelope.
    for (const x of [-0.42, 0.42])
      box(
        0.09,
        1.98,
        0.03,
        m.slate,
        x,
        0,
        -0.0335,
        wing,
        0.01,
        'solar-panel-rear-longeron',
      );
    for (const y of [-0.72, 0.72])
      box(
        0.92,
        0.07,
        0.03,
        m.slate,
        0,
        y,
        -0.0335,
        wing,
        0.01,
        'solar-panel-rear-crossmember',
      );
    box(
      0.27,
      0.3,
      0.058,
      m.metal,
      0,
      sign * -0.99,
      -0.015,
      wing,
      0.024,
      'solar-panel-root-tang',
    );
    box(
      0.15,
      1.94,
      0.03,
      m.navy,
      0,
      0,
      -0.0335,
      wing,
      0.012,
      'solar-panel-power-raceway',
    );
    // A continuous thin dielectric sheet seats the cells and conductors.
    box(
      1.09,
      1.82,
      0.012,
      m.deep,
      0,
      0,
      0.051,
      wing,
      0.006,
      'solar-cell-bonding-sheet',
    );
    const cells: Transform[] = [],
      alternateCells: Transform[] = [],
      rails: Transform[] = [],
      conductors: Transform[] = [],
      bumpers: Transform[] = [];
    for (let col = 0; col < 4; col++)
      for (let row = 0; row < 6; row++) {
        const t = {
          p: [-0.4125 + col * 0.275, -0.755 + row * 0.302, 0.061],
          s: [0.257, 0.282, 0.017],
        };
        ((col + row) % 4 === 0 ? alternateCells : cells).push(t);
      }
    for (let col = 1; col < 4; col++)
      conductors.push({
        p: [-0.55 + col * 0.275, 0, 0.058],
        s: [0.007, 1.799, 0.006],
      });
    for (let row = 1; row < 6; row++)
      conductors.push({
        p: [0, -0.906 + row * 0.302, 0.058],
        s: [1.06, 0.007, 0.006],
      });
    for (const xx of [-0.588, 0.588])
      rails.push({ p: [xx, 0, 0.035], s: [0.045, 2.03, 0.088] });
    for (const yy of [-1.022, 1.022])
      rails.push({ p: [0, yy, 0.035], s: [1.143, 0.049, 0.088] });
    for (const xx of [-0.574, 0.574])
      for (const yy of [-1.014, 1.014])
        bumpers.push({ p: [xx, yy, 0.038], s: [0.108, 0.157, 0.123] });
    instances(unitBox, m.solar, cells, wing, 'large-blue-photovoltaic-cells');
    instances(
      unitBox,
      m.solarAlt,
      alternateCells,
      wing,
      'alternate-blue-photovoltaic-cells',
    );
    instances(
      unitBox,
      m.solarLine,
      conductors,
      wing,
      'coarse-solar-conductor-grid',
    );
    instances(
      roundedGeometry(1, 1, 1, 0.18),
      m.metal,
      rails,
      wing,
      'satin-solar-panel-frame',
    );
    instances(
      roundedGeometry(1, 1, 1, 0.22),
      m.navy,
      bumpers,
      wing,
      'solar-panel-carbon-corner-shoes',
    );
  }
  box(
    0.3,
    0.12,
    0.39,
    m.navy,
    5.04,
    0.94,
    -0.25,
    service,
    0.052,
    'service-antenna-base',
  );
  rod([5.04, 0.985, -0.25], [5.04, 1.62, -0.25], 0.018, m.metal, service);
  sphere(0.038, m.amber, 5.04, 1.642, -0.25, service);

  return { docking, service, solarWings, dishAssembly, updateDishTrim };
}
