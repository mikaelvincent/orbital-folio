import { buildProjectPayloadModule } from './projects-payload-module.ts';
import { PROJECTS_GRID, PROJECTS_UNDERBENCH } from './cabin-composition.ts';

/** Static category workshop. Origin is the cabin floor; +Z faces the visitor. */
export function buildProjectsWorkshop(
  THREE: any,
  h: any,
  floorRoot: any,
  options: {
    projectCount?: number;
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
    color: number,
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
    shell: material('bench-enamel', 0xe0d8c7, 0.46, 0.08),
    top: material('worktop-enamel', 0xe8e0d0, 0.43, 0.1),
    graphite: material('structural-graphite', 0x263342, 0.63, 0.12),
    recess: material('service-recess', 0x111d27, 0.84),
    rubber: material('isolator', 0x182129, 0.89),
    metal: material('satin-fasteners', 0x929d9f, 0.42, 0.65),
    amber: material(
      'bench-amber',
      options.accent?.color?.getHex() ?? 0xe79625,
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

  // Narrow rails and shoes terminate on the existing pressure wall. No new wall sheet.
  for (const sign of [-1, 1]) {
    const x = sign * 1.245;
    box(
      0.067,
      2.08 - lowering,
      0.084,
      m.graphite,
      x,
      1.09 + lowering / 2,
      -0.943,
      parent,
      0.021,
      'wall-upright',
    );
    for (const y of [0.15 + lowering, 0.72, 1.48, 2.08]) {
      box(
        0.127,
        0.143,
        0.049,
        m.graphite,
        x,
        y,
        -0.956,
        parent,
        0.023,
        'wall-anchor-shoe',
      );
      screws.push([x, y, -0.897]);
    }
    box(
      0.031,
      1.91 - lowering,
      0.012,
      m.metal,
      x,
      1.085 + lowering / 2,
      -0.897,
      parent,
      0.006,
      'upright-insert',
    );
  }
  for (const y of [0.875, 1.45, 2.025]) {
    box(
      2.51,
      0.065,
      0.094,
      m.graphite,
      0,
      y,
      -0.938,
      parent,
      0.021,
      'mounting-crossrail',
    );
    for (const x of [-1.11, 0, 1.11]) screws.push([x, y, -0.888]);
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
      m.amber,
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
    // Braces run from stanchion to the wall shoe, leaving the knee space open.
    rod(
      [x, 0.13 + lowering, -0.51],
      [x, 0.545, -0.913],
      0.032,
      m.graphite,
      'wall-brace',
    );
    box(
      0.13,
      0.18,
      0.064,
      m.graphite,
      x,
      0.54,
      -0.952,
      parent,
      0.022,
      'brace-wall-shoe',
    );
    screws.push([x, 0.54, -0.916]);
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

  // The worktop and apron have an intentional narrow gasket seam and solid edges.
  box(
    3.13,
    0.188,
    1.11,
    m.shell,
    0,
    0.596,
    -0.353,
    parent,
    0.062,
    'continuous-bench-apron',
  );
  box(
    3.045,
    0.016,
    1.035,
    m.rubber,
    0,
    0.69,
    -0.353,
    parent,
    0.007,
    'worktop-seal',
  );
  box(
    3.1,
    0.039,
    1.08,
    m.top,
    0,
    0.715,
    -0.353,
    parent,
    0.018,
    'solid-worktop',
  );

  // Service blocks are seated in the apron; inset pulls have real pocket depth.
  for (const sign of [-1, 1]) {
    const x = sign * 1.3;
    box(
      0.3,
      0.132,
      0.022,
      m.metal,
      x,
      0.592,
      0.202,
      parent,
      0.024,
      'service-block-surround',
    );
    box(
      0.28,
      0.112,
      0.024,
      m.shell,
      x,
      0.594,
      0.217,
      parent,
      0.022,
      'service-block-face',
    );
    box(
      0.16,
      0.043,
      0.006,
      m.recess,
      x,
      0.589,
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
      0.6,
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
      for (const dy of [-0.04, 0.04]) screws.push([x + dx, 0.594 + dy, 0.234]);
    // Two restrained tooling clamps sit on the top; no loose set dressing.
    box(
      0.22,
      0.025,
      0.13,
      m.graphite,
      x,
      0.748,
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

  // A continuous amber handhold curves into two fitted circular saddles.
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
    m.amber,
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
    [1.313, 0.476, -0.797],
    [1.313, 2.02, -0.797],
    0.018,
    m.rubber,
    'protected-power-trunk',
  );
  for (const y of [0.59, 1.38, 1.96]) {
    box(
      0.061,
      0.04,
      0.06,
      m.metal,
      1.313,
      y,
      -0.797,
      parent,
      0.014,
      'trunk-retaining-clip',
    );
  }
  rod(
    [0.99, 0.49, -0.81],
    [1.313, 0.49, -0.797],
    0.018,
    m.rubber,
    'junction-lead',
  );
  // Luminous diffusers are static materials, not new sources of room lighting.
  for (const x of [-PROJECTS_UNDERBENCH.columnX, PROJECTS_UNDERBENCH.columnX]) {
    box(
      0.39,
      0.044,
      0.075,
      m.graphite,
      x,
      0.118 + PROJECTS_UNDERBENCH.lift,
      -0.924,
      floorRoot,
      0.018,
      'underbench-task-housing',
    );
    box(
      0.315,
      0.022,
      0.009,
      m.diffuser,
      x,
      0.118 + PROJECTS_UNDERBENCH.lift,
      -0.882,
      floorRoot,
      0.01,
      'underbench-task-diffuser',
    );
  }

  // Uniformly smaller enclosures retain round hardware and graphic proportions.
  const moduleScale = 0.78;
  const configs = [
    {
      label: 'All projects',
      kind: 'all' as const,
      x: -PROJECTS_GRID.columnX,
      y: PROJECTS_GRID.topY,
      count: options.projectCount,
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
        -0.938,
        parent,
        0.018,
        'module-rear-rail',
      );
      for (const dy of [-0.145 * moduleScale, 0.145 * moduleScale]) {
        box(
          0.113,
          0.092,
          0.287,
          m.graphite,
          config.x + dx,
          config.y + dy,
          -0.795,
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
      count: config.count,
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
    setProjectCount: (count: number) => modules[0].setCount(count),
  };
}
