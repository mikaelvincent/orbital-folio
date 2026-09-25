import { buildSmoothDockingRing } from '../geometry/smooth-docking-ring.ts';
import { clipGeometryPlane } from '../geometry/clip-geometry-plane.ts';
import { PRESSURE_WALL } from '../geometry/spacecraft-wall-layout.ts';
import type {
  ModelPrimitives,
  Transform,
} from '../geometry/model-primitives.ts';

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
  // Placement follows the service-module organization documented for ESA ATV:
  // solar drives, communications and the KURS antenna share the service bus.
  // This toybox uses a small forward-offset dish with a triangulated bracket,
  // leaving both solar hinge envelopes and the left docking approach clear.
  // https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/ATV/ATV_Service_Module
  // https://www.esa.int/ESA_Multimedia/Images/2013/06/ATV-4_docking
  box(
    0.44,
    0.32,
    0.16,
    m.navy,
    5.26,
    0.2,
    0.8,
    service,
    0.06,
    'communications-mast-service-foot',
  );
  rod([5.18, 0.11, 0.68], [5.63, 0.22, 1.04], 0.052, m.metal, service);
  rod([5.49, 0.36, 0.6], [5.63, 0.22, 1.04], 0.043, m.navy, service);
  sphere(0.1, m.amber, 5.63, 0.22, 1.04, service);
  const dishAssembly = new THREE.Group();
  dishAssembly.name = 'service-mounted-communications-dish';
  dishAssembly.position.set(5.64, 0.23, 1.16);
  dishAssembly.rotation.set(-0.1, 0.18, -0.03);
  service.add(dishAssembly);
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
  mesh(dishGeometry, dishMat, dishAssembly, 'double-skin-communications-dish');
  torus(0.5, 0.02, m.metal, 0, 0, 0.243, dishAssembly);
  cylinder(0.081, 0.083, m.navy, 0, 0, -0.047, dishAssembly, 'z');
  rod([0, 0, 0.024], [0, 0, 0.463], 0.02, m.navy, dishAssembly);
  sphere(0.063, m.amber, 0, 0, 0.466, dishAssembly);
  for (const a of [Math.PI / 6, (Math.PI * 5) / 6, (Math.PI * 3) / 2])
    rod(
      [Math.cos(a) * 0.44, Math.sin(a) * 0.44, 0.204],
      [0, 0, 0.429],
      0.008,
      m.metal,
      dishAssembly,
    );

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
  cylinder(0.419, 0.031, m.deep, 5.674, 0.03, 0, service, 'x');
  torus(0.574, 0.022, m.navy, 6.011, 0.03, 0, service, 'x');
  torus(0.465, 0.019, m.amber, 5.82, 0.03, 0, service, 'x');
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const p = box(
      0.27,
      0.113,
      0.211,
      i % 2 ? m.navy : m.amber,
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
  // Paired upright solar wings read clearly above and below the service module.
  // Their broad blue cells face +Z, with only a few structural grid divisions.
  for (const sign of [-1, 1]) {
    rod(
      [4.98, 0.03 + sign * 0.63, 0.02],
      [6.1, sign * 1.66, 0.055],
      0.073,
      m.navy,
      service,
    );
    cylinder(0.143, 0.223, m.metal, 5.61, sign * 1.242, 0.046, service);
    cylinder(0.126, 0.106, m.amber, 6.094, sign * 1.598, 0.057, service);
    const wing = new THREE.Group();
    solarWings.push(wing);
    wing.position.set(6.1, sign * 2.685, 0.069);
    wing.rotation.z = sign * -0.035;
    service.add(wing);
    box(
      1.227,
      2.1,
      0.097,
      m.navy,
      0,
      0,
      0,
      wing,
      0.046,
      'upright-solar-panel-chassis',
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
        p: [-0.55 + col * 0.275, 0, 0.075],
        s: [0.007, 1.799, 0.005],
      });
    for (let row = 1; row < 6; row++)
      conductors.push({
        p: [0, -0.906 + row * 0.302, 0.075],
        s: [1.06, 0.007, 0.005],
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
      m.shell,
      rails,
      wing,
      'cream-solar-panel-frame',
    );
    instances(
      roundedGeometry(1, 1, 1, 0.22),
      m.amber,
      bumpers,
      wing,
      'solar-panel-amber-corner-caps',
    );
  }
  box(
    0.3,
    0.12,
    0.39,
    m.navy,
    5.16,
    0.995,
    -0.35,
    service,
    0.052,
    'service-antenna-base',
  );
  rod([5.16, 1.045, -0.35], [5.16, 1.62, -0.35], 0.018, m.metal, service);
  sphere(0.038, m.amber, 5.16, 1.642, -0.35, service);

  return { docking, service, solarWings, dishAssembly };
}
