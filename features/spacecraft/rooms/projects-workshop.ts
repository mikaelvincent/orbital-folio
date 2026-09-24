import { PALETTE } from '../../../lib/palette.ts';
import { buildProjectPayloadModule } from './projects-payload-module.ts';
import { PROJECTS_GRID } from './cabin-composition.ts';

/** Static category workshop. Origin is the cabin floor; +Z faces the visitor. */
export function buildProjectsWorkshop(
  THREE: any,
  h: any,
  floorRoot: any,
  options: {
    accent?: any;
    screenLabels?: boolean;
    desktopMaterial?: any;
  } = {},
) {
  // Match Contact's 0.731-high working surface. Move the bank and worktop
  // together to retain screen clearance; grounded feet and support joints stay fitted.
  const lowering = PROJECTS_GRID.lowering;
  const parent = new THREE.Group();
  parent.name = 'projects-workshop-equipment-mount';
  parent.position.y = -lowering;
  floorRoot.add(parent);
  const material = (
    name: string,
    color: string | number,
    roughness: number,
    metalness = 0,
  ) => {
    const value = new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
    });
    value.name = `projects-workshop-${name}`;
    value.userData.highlightScale = 0.018;
    return value;
  };
  const m = {
    shell: material('bench-enamel', PALETTE.carbon, 0.46, 0.08),
    top: material('worktop-enamel', PALETTE.carbonRaised, 0.43, 0.1),
    graphite: material('structural-graphite', PALETTE.carbon, 0.63, 0.12),
    recess: material('service-recess', PALETTE.carbonDeep, 0.84),
    rubber: material('isolator', PALETTE.carbonDeep, 0.89),
    metal: material('satin-fasteners', PALETTE.alloy, 0.42, 0.65),
    amber: material(
      'bench-amber',
      options.accent?.color?.getHex() ?? PALETTE.bronze,
      0.38,
      0.16,
    ),
    diffuser: material('task-diffuser', 0xffe2a5, 0.55),
  };
  m.diffuser.emissive.set(0xffce85);
  m.diffuser.emissiveIntensity = 0.65;
  const box = (
    w: number,
    height: number,
    depth: number,
    mat: any,
    x: number,
    y: number,
    z: number,
    into = parent,
    radius = 0.018,
    name = 'part',
  ) =>
    h.box(
      w,
      height,
      depth,
      mat,
      x,
      y,
      z,
      into,
      radius,
      `projects-workshop-${name}`,
    );
  const rod = (
    a: number[],
    b: number[],
    radius: number,
    mat: any,
    name: string,
  ) => {
    const object = h.rod(a, b, radius, mat, parent);
    object.name = `projects-workshop-${name}`;
    return object;
  };
  const screws: number[][] = [];
  const screwGeometry = new THREE.CylinderGeometry(0.014, 0.014, 0.005, 12);
  screwGeometry.rotateX(Math.PI / 2);
  const unitBox = new THREE.BoxGeometry(1, 1, 1);

  // A bench-borne instrument bridge gives all four removable monitors one
  // load path. Nothing pretends to attach to the pressure wall behind it.
  for (const sign of [-1, 1]) {
    const x = sign * 1.245;
    box(
      0.22,
      0.022,
      0.19,
      m.rubber,
      x,
      0.7455,
      -0.77,
      parent,
      0.01,
      'gantry-isolation-seat',
    );
    box(
      0.19,
      0.065,
      0.16,
      m.metal,
      x,
      0.771,
      -0.77,
      parent,
      0.02,
      'gantry-foot',
    );
    box(
      0.105,
      1.405,
      0.16,
      m.graphite,
      x,
      1.45,
      -0.77,
      parent,
      0.033,
      'gantry-upright',
    );
    for (const y of [0.8, 2.1]) {
      box(
        0.126,
        0.067,
        0.025,
        m.metal,
        x,
        y,
        -0.679,
        parent,
        0.012,
        'gantry-captive-cap',
      );
      screws.push([x, y, -0.664]);
    }
  }
  for (const y of [PROJECTS_GRID.bottomY, PROJECTS_GRID.topY]) {
    box(
      2.51,
      0.15,
      0.105,
      m.graphite,
      0,
      y,
      -0.79,
      parent,
      0.035,
      'mounting-crossrail',
    );
    // The middle union is an actual crossrail joint, visible between the modules.
    box(
      0.15,
      0.112,
      0.024,
      m.metal,
      0,
      y,
      -0.727,
      parent,
      0.012,
      'crossrail-union',
    );
    screws.push([0, y, -0.712]);
  }

  // Two grounded stanchions, each with a broad sole, collar and continuous apron connection.
  for (const sign of [-1, 1]) {
    const x = sign * 1.3;
    box(
      0.34,
      0.029,
      0.67,
      m.rubber,
      x,
      0.014,
      -0.34,
      floorRoot,
      0.014,
      'floor-isolator',
    );
    box(
      0.32,
      0.047,
      0.63,
      m.graphite,
      x,
      0.043,
      -0.34,
      floorRoot,
      0.022,
      'anchored-sole',
    );
    box(
      0.284,
      0.044,
      0.57,
      m.metal,
      x,
      0.072,
      -0.34,
      floorRoot,
      0.018,
      'foot-retainer',
    );
    box(
      0.27,
      0.433 - lowering,
      0.5,
      m.shell,
      x,
      0.295 - lowering / 2,
      -0.34,
      floorRoot,
      0.037,
      'bench-leg',
    );
    box(
      0.295,
      0.115,
      0.54,
      m.graphite,
      x,
      0.49,
      -0.34,
      parent,
      0.025,
      'leg-apron-collar',
    );
    box(
      0.037,
      0.26 - lowering / 2,
      0.012,
      m.graphite,
      x - sign * 0.075,
      0.29 - lowering / 2,
      -0.083,
      floorRoot,
      0.009,
      'leg-service-insert',
    );
    screws.push([x, 0.11 + lowering, -0.085], [x, 0.415, -0.085]);
  }
  box(
    2.55,
    0.085,
    0.12,
    m.graphite,
    0,
    0.49,
    -0.73,
    parent,
    0.022,
    'underbench-crossmember',
  );

  // A thin inset carbon work surface meets the rounded apron through a fine
  // seated gasket. Its upper plane stays fixed, preserving monitor clearance
  // and the established working height without a separate light-colored slab.
  const apronProfile = new THREE.Shape();
  apronProfile.moveTo(-0.15, 0.686);
  apronProfile.lineTo(0.856, 0.686);
  apronProfile.quadraticCurveTo(0.89, 0.686, 0.89, 0.652);
  apronProfile.lineTo(0.89, 0.55);
  apronProfile.quadraticCurveTo(0.89, 0.52, 0.856, 0.52);
  apronProfile.lineTo(0.02, 0.52);
  apronProfile.quadraticCurveTo(-0.09, 0.52, -0.15, 0.555);
  apronProfile.quadraticCurveTo(-0.184, 0.57, -0.184, 0.602);
  apronProfile.lineTo(-0.184, 0.652);
  apronProfile.quadraticCurveTo(-0.184, 0.686, -0.15, 0.686);
  apronProfile.closePath();
  const apronGeometry = new THREE.ExtrudeGeometry(apronProfile, {
    depth: 3.094,
    bevelEnabled: true,
    bevelSize: 0.018,
    bevelThickness: 0.018,
    bevelSegments: 4,
    curveSegments: 20,
    steps: 1,
  });
  apronGeometry.translate(0, 0, -1.547);
  apronGeometry.rotateY(Math.PI / 2);
  h.mesh(
    apronGeometry,
    m.shell,
    parent,
    'projects-workshop-continuous-bench-apron',
  );
  box(
    3.025,
    0.006,
    1.005,
    m.rubber,
    0,
    0.707,
    -0.353,
    parent,
    0.003,
    'worktop-seal',
  );
  box(
    3.065,
    0.025,
    1.045,
    m.top,
    0,
    0.722,
    -0.353,
    parent,
    0.012,
    'solid-worktop',
  );

  // Service blocks are seated in the apron; inset pulls have real pocket depth.
  for (const sign of [-1, 1]) {
    const x = sign * 1.3;
    box(
      0.3,
      0.09,
      0.022,
      m.graphite,
      x,
      0.632,
      0.202,
      parent,
      0.024,
      'service-block-surround',
    );
    box(
      0.28,
      0.073,
      0.024,
      m.shell,
      x,
      0.632,
      0.217,
      parent,
      0.022,
      'service-block-face',
    );
    box(
      0.16,
      0.03,
      0.006,
      m.recess,
      x,
      0.629,
      0.232,
      parent,
      0.013,
      'recessed-service-pull',
    );
    box(
      0.112,
      0.013,
      0.008,
      m.graphite,
      x,
      0.64,
      0.237,
      parent,
      0.005,
      'pull-upper-edge',
    );
    box(
      0.028,
      0.036,
      0.012,
      m.amber,
      x + sign * 0.19,
      0.628,
      0.206,
      parent,
      0.009,
      'captive-service-latch',
    );
    for (const dx of [-0.11, 0.11])
      for (const dy of [-0.022, 0.022])
        screws.push([x + dx, 0.632 + dy, 0.234]);
    // Two restrained tooling clamps sit on the top; no loose set dressing.
    box(
      0.22,
      0.025,
      0.13,
      m.graphite,
      x,
      0.747,
      -0.645,
      parent,
      0.014,
      'worktop-retaining-base',
    );
    box(
      0.075,
      0.038,
      0.11,
      m.metal,
      x - sign * 0.056,
      0.777,
      -0.645,
      parent,
      0.014,
      'worktop-clamp-jaw',
    );
    box(
      0.1,
      0.016,
      0.052,
      m.amber,
      x + sign * 0.024,
      0.775,
      -0.645,
      parent,
      0.007,
      'worktop-clamp-lever',
    );
  }

  // A carbon handhold curves into fitted satin-alloy collars.
  const handholdPoints = [
    new THREE.Vector3(-0.5, 0.611, 0.214),
    new THREE.Vector3(-0.5, 0.611, 0.263),
    new THREE.Vector3(-0.47, 0.611, 0.288),
    new THREE.Vector3(0.47, 0.611, 0.288),
    new THREE.Vector3(0.5, 0.611, 0.263),
    new THREE.Vector3(0.5, 0.611, 0.214),
  ];
  const handhold = new THREE.CatmullRomCurve3(
    handholdPoints,
    false,
    'centripetal',
  );
  h.mesh(
    new THREE.TubeGeometry(handhold, 36, 0.024, 12, false),
    m.graphite,
    parent,
    'projects-workshop-front-handhold',
  );
  for (const x of [-0.5, 0.5]) {
    h.cylinder(0.039, 0.021, m.graphite, x, 0.611, 0.21, parent, 'z').name =
      'projects-workshop-handhold-saddle';
    h.cylinder(0.032, 0.014, m.metal, x, 0.611, 0.225, parent, 'z').name =
      'projects-workshop-handhold-collar';
  }

  // A single protected trunk feeds the bank and terminates in an underbench junction.
  box(
    0.34,
    0.16,
    0.13,
    m.graphite,
    0.91,
    0.445,
    -0.81,
    parent,
    0.024,
    'power-junction',
  );
  box(
    0.26,
    0.107,
    0.021,
    m.shell,
    0.91,
    0.445,
    -0.736,
    parent,
    0.018,
    'junction-cover',
  );
  for (const x of [0.81, 1.01]) screws.push([x, 0.445, -0.722]);
  rod(
    [1.245, 0.476, -0.664],
    [1.245, 2.02, -0.664],
    0.018,
    m.rubber,
    'protected-power-trunk',
  );
  for (const y of [0.79, 1.45, 1.96]) {
    box(
      0.061,
      0.04,
      0.06,
      m.metal,
      1.245,
      y,
      -0.681,
      parent,
      0.014,
      'trunk-retaining-clip',
    );
  }
  rod(
    [0.99, 0.49, -0.81],
    [1.245, 0.49, -0.664],
    0.018,
    m.rubber,
    'junction-lead',
  );
  // One captured downward diffuser serves the working plane. It is an emissive
  // fitting, not an additional scene light or an interactive strip.
  box(
    2.57,
    0.057,
    0.12,
    m.graphite,
    0,
    0.804,
    -0.73,
    parent,
    0.018,
    'bridge-task-hood',
  );
  box(
    2.28,
    0.009,
    0.045,
    m.diffuser,
    0,
    0.7775,
    -0.714,
    parent,
    0.004,
    'bridge-task-diffuser',
  );

  // Uniformly smaller enclosures retain round hardware and graphic proportions.
  const moduleScale = 0.83;
  const configs = [
    {
      label: 'All projects',
      kind: 'all' as const,
      x: -PROJECTS_GRID.columnX,
      y: PROJECTS_GRID.topY,
    },
    {
      label: 'Systems',
      kind: 'systems' as const,
      x: PROJECTS_GRID.columnX,
      y: PROJECTS_GRID.topY,
    },
    {
      label: 'Interfaces',
      kind: 'interfaces' as const,
      x: -PROJECTS_GRID.columnX,
      y: PROJECTS_GRID.bottomY,
    },
    {
      label: 'Experiments',
      kind: 'experiments' as const,
      x: PROJECTS_GRID.columnX,
      y: PROJECTS_GRID.bottomY,
    },
  ];
  const moduleMaterials = new Map<string, any>();
  const modules = configs.map((config) => {
    // Small standoffs touch both the rear shell and the rack; no hovering displays.
    for (const dx of [-0.44 * moduleScale, 0.44 * moduleScale]) {
      box(
        0.095,
        0.5 * moduleScale,
        0.08,
        m.graphite,
        config.x + dx,
        config.y,
        -0.79,
        parent,
        0.018,
        'module-rear-rail',
      );
      for (const dy of [-0.145 * moduleScale, 0.145 * moduleScale]) {
        box(
          0.113,
          0.092,
          0.108,
          m.graphite,
          config.x + dx,
          config.y + dy,
          -0.709,
          parent,
          0.014,
          'module-stand-off',
        );
      }
    }
    const carrier = new THREE.Group();
    carrier.name = `projects-workshop-module-${config.kind}`;
    carrier.position.set(config.x, config.y, -0.58);
    carrier.scale.setScalar(moduleScale);
    parent.add(carrier);
    return buildProjectPayloadModule(THREE, h, carrier, {
      label: config.label,
      kind: config.kind,
      accent: options.accent,
      screenLabels: options.screenLabels,
      sharedMaterials: moduleMaterials,
      desktopMaterial: options.desktopMaterial,
    });
  });

  h.instances(
    screwGeometry,
    m.metal,
    screws.map((p) => ({ p })),
    parent,
    'projects-workshop-structural-fasteners',
  );
  h.instances(
    unitBox,
    m.recess,
    screws.map(([x, y, z]) => ({
      p: [x, y, z + 0.003],
      s: [0.016, 0.0035, 0.0015],
    })),
    parent,
    'projects-workshop-fastener-slots',
  );
  return {
    screens: modules,
    root: parent,
  };
}
