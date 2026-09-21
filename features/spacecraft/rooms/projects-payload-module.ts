import {
  attachComputerDesktop,
  createComputerDesktopMaterial,
} from './computer-desktop.ts';

/** Static removable Projects category display; local front is +Z and up is +Y. */
export function buildProjectPayloadModule(
  THREE: any,
  h: any,
  parent: any,
  options: {
    label: string;
    kind: 'all' | 'systems' | 'interfaces' | 'experiments';
    accent?: any;
    screenLabels?: boolean;
    sharedMaterials?: Map<string, any>;
    desktopMaterial?: any;
  },
) {
  const prefix = 'projects-workshop-';
  const material = (
    name: string,
    color: number,
    roughness: number,
    metalness = 0,
  ) => {
    const shared = options.sharedMaterials?.get(name);
    if (shared) return shared;
    const mat = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    mat.name = prefix + name;
    mat.envMapIntensity = 0.06;
    mat.userData.highlightScale = 0.018;
    options.sharedMaterials?.set(name, mat);
    return mat;
  };
  const m = {
    ivory: material('ivory-enamel', 0xe0d8c7, 0.54, 0.08),
    edge: material('enamel-edge', 0xa49f90, 0.62, 0.14),
    graphite: material('graphite-enclosure', 0x263342, 0.69, 0.12),
    dark: material('recess', 0x101a23, 0.8, 0.04),
    gasket: material('gasket', 0x172128, 0.88),
    alloy: material('satin-fasteners', 0x929b9c, 0.47, 0.6),
    amber: material(
      'amber-latches',
      options.accent?.color?.getHex() ?? 0xe79625,
      0.47,
      0.15,
    ),
    diffuser: material('diffused-task-strip', 0xffe4b8, 0.63),
    ink: material('hardware-index', 0xd2cbbb, 0.78),
  };
  m.diffuser.emissive.set(0xffd6a0);
  m.diffuser.emissiveIntensity = 0.46;
  const group = new THREE.Group();
  group.name = prefix + options.kind + '-payload-module';
  parent.add(group);
  const box = (
    w: number,
    height: number,
    depth: number,
    mat: any,
    x: number,
    y: number,
    z: number,
    radius: number,
    name: string,
  ) => h.box(w, height, depth, mat, x, y, z, group, radius, prefix + name);
  const mesh = (geometry: any, mat: any, name: string) =>
    h.mesh(geometry, mat, group, prefix + name);
  const cylinder = (
    radius: number,
    length: number,
    mat: any,
    x: number,
    y: number,
    z: number,
    axis: string,
    name: string,
    segments = 24,
  ) => {
    const part = h.cylinder(
      radius,
      length,
      mat,
      x,
      y,
      z,
      group,
      axis,
      radius,
      segments,
    );
    part.name = prefix + name;
    return part;
  };

  // Shapes and holes have opposite winding. Extrusions are closed solids with real rebates.
  const rounded = (
    width: number,
    height: number,
    radius: number,
    hole = false,
    curveSegments = 32,
  ) => {
    const path = hole ? new THREE.Path() : new THREE.Shape();
    const x = -width / 2,
      y = -height / 2,
      r = radius;
    path.moveTo(x + r, y);
    path.lineTo(x + width - r, y);
    path.quadraticCurveTo(x + width, y, x + width, y + r);
    path.lineTo(x + width, y + height - r);
    path.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    path.lineTo(x + r, y + height);
    path.quadraticCurveTo(x, y + height, x, y + height - r);
    path.lineTo(x, y + r);
    path.quadraticCurveTo(x, y, x + r, y);
    path.closePath();
    if (hole) {
      const points = path.getPoints(curveSegments).reverse();
      const reversePath = new THREE.Path(points);
      reversePath.closePath();
      return reversePath;
    }
    return path;
  };
  const ring = (
    width: number,
    height: number,
    radius: number,
    insideWidth: number,
    insideHeight: number,
    insideRadius: number,
    depth: number,
    z: number,
    mat: any,
    bevel: number,
    name: string,
    curveSegments = 12,
    bevelSegments = 2,
  ) => {
    const outline = rounded(width, height, radius);
    outline.holes.push(
      rounded(insideWidth, insideHeight, insideRadius, true, curveSegments),
    );
    // Reserve dense curvature for the readable screen. The surrounding hardware
    // needs far fewer corner samples while retaining its closed rebates and bevels.
    const geometry = new THREE.ExtrudeGeometry(outline, {
      depth,
      steps: 1,
      curveSegments,
      bevelEnabled: bevel > 0,
      bevelSegments,
      bevelThickness: bevel,
      bevelSize: bevel,
    });
    const part = mesh(geometry, mat, name);
    part.position.z = z;
    return part;
  };
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const instances = (
    geometry: any,
    mat: any,
    transforms: any[],
    name: string,
    castShadow = false,
  ) => {
    const batch = h.instances(geometry, mat, transforms, group, prefix + name);
    if (batch) batch.castShadow = castShadow;
    return batch;
  };

  // Rear enclosure terminates at Z=-.095 for the parent's mounting shoes to meet.
  box(
    1.22,
    0.746,
    0.17,
    m.graphite,
    0,
    0,
    -0.01,
    0.045,
    'closed-rear-enclosure',
  );
  box(1.166, 0.686, 0.012, m.dark, 0, 0, -0.089, 0.038, 'rear-cover-seam');
  for (const side of [-1, 1]) {
    box(
      0.05,
      0.474,
      0.166,
      m.dark,
      side * 0.593,
      0,
      -0.003,
      0.011,
      'side-service-rebate',
    );
    // Broad corner reinforcement remains visible outside the ivory face.
    for (const row of [-1, 1]) {
      box(
        0.141,
        0.126,
        0.172,
        m.dark,
        side * 0.544,
        row * 0.317,
        -0.002,
        0.027,
        'corner-isolator',
      );
      box(
        0.113,
        0.099,
        0.048,
        m.graphite,
        side * 0.554,
        row * 0.327,
        0.063,
        0.02,
        'corner-reinforcement',
      );
    }
  }
  ring(
    1.174,
    0.722,
    0.068,
    1.044,
    0.602,
    0.039,
    0.021,
    0.066,
    m.edge,
    0.003,
    'bezel-edge-ring',
  );
  ring(
    1.16,
    0.708,
    0.06,
    1.044,
    0.602,
    0.04,
    0.047,
    0.08,
    m.ivory,
    0.006,
    'ivory-bezel-ring',
  );
  ring(
    1.046,
    0.604,
    0.041,
    1.007,
    0.567,
    0.024,
    0.026,
    0.082,
    m.gasket,
    0.0015,
    'recessed-screen-gasket',
  );

  // Captive heads sit within dark counterbores; the shallow slot insert is separate geometry.
  const bezelFixings = [-1, 1].flatMap((side) =>
    [-1, 1].map((row) => ({ p: [side * 0.548, row * 0.318, 0.131] })),
  );
  const rearFixings = [-1, 1].flatMap((side) =>
    [-1, 1].map((row) => ({ p: [side * 0.59, row * 0.349, 0.09] })),
  );
  const bores = new THREE.CylinderGeometry(0.021, 0.021, 0.003, 24);
  bores.rotateX(Math.PI / 2);
  instances(bores, m.dark, bezelFixings, 'bezel-counterbores');
  const washerShape = new THREE.Shape();
  washerShape.absarc(0, 0, 0.019, 0, Math.PI * 2, false);
  const washerHole = new THREE.Path();
  washerHole.absarc(0, 0, 0.0148, 0, Math.PI * 2, true);
  washerShape.holes.push(washerHole);
  const washer = new THREE.ExtrudeGeometry(washerShape, {
    depth: 0.004,
    steps: 1,
    bevelEnabled: false,
    curveSegments: 24,
  });
  instances(washer, m.edge, bezelFixings, 'captive-fastener-rims');
  const head = new THREE.CylinderGeometry(0.0135, 0.0135, 0.004, 24);
  head.rotateX(Math.PI / 2);
  instances(
    head,
    m.alloy,
    bezelFixings.map(({ p }) => ({ p: [p[0], p[1], p[2] + 0.0035] })),
    'satin-captive-heads',
  );
  instances(
    unitBox,
    m.dark,
    bezelFixings.map(({ p }) => ({
      p: [p[0], p[1], p[2] + 0.0058],
      s: [0.017, 0.003, 0.001],
      r: [0, 0, -Math.PI / 5],
    })),
    'captive-screw-slots',
  );
  const smallHead = new THREE.CylinderGeometry(0.011, 0.011, 0.004, 16);
  smallHead.rotateX(Math.PI / 2);
  instances(smallHead, m.alloy, rearFixings, 'corner-fasteners');
  instances(
    unitBox,
    m.dark,
    rearFixings.map(({ p }) => ({
      p: [p[0], p[1], p[2] + 0.0025],
      s: [0.013, 0.0025, 0.001],
    })),
    'corner-fastener-slots',
  );

  for (const side of [-1, 1]) {
    // Side pull loops use a continuous closed rounded solid around an open center.
    const handle = ring(
      0.075,
      0.294,
      0.033,
      0.043,
      0.258,
      0.018,
      0.031,
      0.038,
      m.dark,
      0.002,
      'side-grab-loop',
      8,
      1,
    );
    handle.position.x = side * 0.617;
    for (const y of [-0.123, 0.123]) {
      box(
        0.061,
        0.047,
        0.084,
        m.graphite,
        side * 0.604,
        y,
        0.024,
        0.01,
        'grab-loop-saddle',
      );
      cylinder(
        0.009,
        0.004,
        m.alloy,
        side * 0.624,
        y,
        0.072,
        'z',
        'grab-loop-anchor',
        16,
      ).castShadow = false;
    }
    box(
      0.067,
      0.257,
      0.073,
      m.dark,
      side * 0.596,
      0,
      0.065,
      0.012,
      'quick-release-socket',
    );
    box(
      0.048,
      0.216,
      0.053,
      m.amber,
      side * 0.604,
      0,
      0.108,
      0.012,
      'amber-quick-release-latch',
    );
    box(
      0.023,
      0.267,
      0.033,
      m.ivory,
      side * 0.568,
      0,
      0.13,
      0.007,
      'latch-retaining-bridge',
    );
    box(
      0.017,
      0.083,
      0.005,
      m.edge,
      side * 0.603,
      0,
      0.137,
      0.004,
      'latch-thumb-recess',
    );
    for (const y of [-0.08, 0.08])
      box(
        0.024,
        0.004,
        0.002,
        m.ink,
        side * 0.604,
        y,
        0.137,
        0.001,
        'latch-index',
      ).castShadow = false;
    // Visible, capped edge connectors: no loose wires and no intrusion into adjacent modules.
    cylinder(
      0.03,
      0.035,
      m.graphite,
      side * 0.621,
      -0.258,
      -0.014,
      'x',
      'edge-connector-socket',
    );
    cylinder(
      0.024,
      0.021,
      m.alloy,
      side * 0.64,
      -0.258,
      -0.014,
      'x',
      'edge-connector-collar',
    );
    cylinder(
      0.021,
      0.009,
      m.dark,
      side * 0.652,
      -0.258,
      -0.014,
      'x',
      'edge-connector-dust-cap',
    );
    cylinder(
      0.015,
      0.003,
      m.amber,
      side * 0.657,
      -0.258,
      -0.014,
      'x',
      'connector-identification-ring',
    );
  }
  for (const row of [-1, 1]) {
    box(
      0.454,
      0.051,
      0.067,
      m.dark,
      0,
      row * 0.376,
      0.045,
      0.015,
      'task-strip-socket',
    );
    box(
      0.403,
      0.036,
      0.037,
      m.amber,
      0,
      row * 0.377,
      0.083,
      0.01,
      'task-strip-amber-trim',
    );
    box(
      0.358,
      0.023,
      0.024,
      m.diffuser,
      0,
      row * 0.378,
      0.105,
      0.008,
      'task-strip-diffuser',
    ).castShadow = false;
    for (const side of [-1, 1])
      box(
        0.021,
        0.038,
        0.035,
        m.alloy,
        side * 0.216,
        row * 0.376,
        0.081,
        0.005,
        'task-strip-end-cap',
      );
  }
  // Smooth wear pads protect the removable display's lower docking edge.
  for (const side of [-1, 1])
    box(
      0.205,
      0.02,
      0.012,
      m.graphite,
      side * 0.386,
      -0.354,
      0.077,
      0.006,
      'lower-docking-wear-pad',
    );

  const sw = 1.01,
    sh = 0.57;
  const screenMat = material(options.kind + '-screen', 0x0a1d31, 0.76, 0.015);
  screenMat.emissive.set(0xffffff);
  screenMat.emissiveIntensity = 0.85;
  screenMat.envMapIntensity = 0;
  screenMat.metalness = 1;
  screenMat.roughness = 1;
  screenMat.toneMapped = false;
  screenMat.userData.displaySize = [sw, sh];
  const screenGeometry = new THREE.ShapeGeometry(rounded(sw, sh, 0.026), 32);
  const positions = screenGeometry.attributes.position,
    uvs = screenGeometry.attributes.uv;
  for (let i = 0; i < positions.count; i++)
    uvs.setXY(i, positions.getX(i) / sw + 0.5, positions.getY(i) / sh + 0.5);
  let canvas: HTMLCanvasElement | null = null;
  let context: CanvasRenderingContext2D | null = null;
  let available = true;
  if (typeof document !== 'undefined') {
    canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 640;
    context = canvas.getContext('2d');
  }
  const drawScreen = () => {
    if (!canvas || !context) return;
    const ctx = context;
    if (!available) {
      // An unused module stays installed, but has no readable/interactive face.
      ctx.fillStyle = '#050b12';
      ctx.fillRect(0, 0, 1024, 640);
      return;
    }
    const background = ctx.createLinearGradient(0, 0, 850, 640);
    background.addColorStop(0, '#112b43');
    background.addColorStop(1, '#061526');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, 1024, 640);
    if (options.screenLabels !== false) {
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#f3f6f8';
      ctx.font =
        '600 84px Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillText(options.label, 80, 113, 870);
    }
    ctx.save();
    ctx.translate(461, 368);
    ctx.strokeStyle = '#d8e5f0';
    ctx.fillStyle = '#d8e5f0';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const rect = (
      x: number,
      y: number,
      width: number,
      height: number,
      radius: number,
    ) => {
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, radius);
      ctx.stroke();
    };
    if (options.kind === 'all') {
      rect(-66, -50, 114, 137, 7);
      rect(-50, -66, 114, 137, 7);
      rect(-34, -82, 114, 137, 7);
      ctx.lineWidth = 5;
      for (const y of [-44, -21, 2, 25]) {
        ctx.beginPath();
        ctx.moveTo(-12, y);
        ctx.lineTo(56, y);
        ctx.stroke();
      }
    } else if (options.kind === 'systems') {
      ctx.beginPath();
      for (let tooth = 0; tooth < 8; tooth++) {
        const step = Math.PI / 4;
        for (const [fraction, radius] of [
          [-0.5, 63],
          [-0.3, 63],
          [-0.21, 82],
          [0.21, 82],
          [0.3, 63],
          [0.5, 63],
        ]) {
          const angle = tooth * step + fraction * step;
          const x = Math.cos(angle) * radius,
            y = Math.sin(angle) * radius;
          if (tooth === 0 && fraction === -0.5) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 29, 0, Math.PI * 2);
      ctx.stroke();
    } else if (options.kind === 'interfaces') {
      rect(-85, -73, 170, 147, 10);
      ctx.beginPath();
      ctx.moveTo(-85, -35);
      ctx.lineTo(85, -35);
      ctx.stroke();
      for (const x of [-62, -44, -26]) {
        ctx.beginPath();
        ctx.arc(x, -54, 2.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#7896ad';
      ctx.beginPath();
      ctx.moveTo(-56, -10);
      ctx.lineTo(-2, -10);
      ctx.stroke();
      for (const x of [52, 68]) {
        ctx.beginPath();
        ctx.arc(x, 57, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.beginPath();
      ctx.moveTo(-25, -86);
      ctx.lineTo(25, -86);
      ctx.lineTo(25, -71);
      ctx.lineTo(17, -71);
      ctx.lineTo(17, -25);
      ctx.lineTo(76, 73);
      ctx.quadraticCurveTo(82, 88, 65, 88);
      ctx.lineTo(-65, 88);
      ctx.quadraticCurveTo(-82, 88, -76, 73);
      ctx.lineTo(-17, -25);
      ctx.lineTo(-17, -71);
      ctx.lineTo(-25, -71);
      ctx.closePath();
      ctx.stroke();
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-46, 26);
      ctx.quadraticCurveTo(-22, 13, 1, 26);
      ctx.quadraticCurveTo(20, 36, 45, 25);
      ctx.stroke();
      for (const [x, y, radius] of [
        [-12, 48, 3.5],
        [19, 62, 3],
        [3, -1, 3],
      ]) {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  };
  drawScreen();
  if (canvas && context) {
    const texture = new THREE.CanvasTexture(canvas);
    texture.name = prefix + options.kind + '-display-texture';
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    screenMat.map = texture;
    screenMat.emissiveMap = texture;
    // Backlit content retains its navy tone under the room's warm task lighting.
    screenMat.color.set(0x000000);
    screenMat.emissive.set(0xffffff);
  }
  // Complete material before h.mesh captures its room-dimming base color and maps.
  const screen = mesh(screenGeometry, screenMat, options.kind + '-screen');
  screen.position.z = 0.111;
  screen.castShadow = false;
  screen.receiveShadow = false;
  // Dynamic display contents and the DOM application share the real glass plane.
  // Keep the screen separate from static batches so opening the app can hide it.
  const idleDisplay = new THREE.Group();
  idleDisplay.name = prefix + options.kind + '-idle-display';
  idleDisplay.userData.animated = true;
  group.add(idleDisplay);
  idleDisplay.add(screen);
  const desktopDisplay = attachComputerDesktop(
    THREE,
    screen,
    group,
    options.desktopMaterial ?? createComputerDesktopMaterial(THREE),
  );
  const anchor = new THREE.Object3D();
  anchor.name = prefix + options.kind + '-application-anchor';
  anchor.position.z = screen.position.z;
  anchor.userData = {
    width: sw,
    height: sh,
    section: 'projects',
    kind: 'computer',
  };
  group.add(anchor);
  return {
    root: group,
    anchor,
    screen,
    idleDisplay,
    desktopDisplay,
    width: sw,
    height: sh,
    category: options.kind,
    label: options.label,
    interactableId: `projects-screen-${options.kind}`,
    get available() {
      return available;
    },
    setAvailable(value: boolean) {
      if (available === value) return;
      available = value;
      drawScreen();
      if (screenMat.map) screenMat.map.needsUpdate = true;
      if (!available) {
        idleDisplay.visible = true;
        desktopDisplay.visible = false;
      }
    },
    setActive(active: boolean) {
      active = active && available;
      idleDisplay.visible = !active;
      desktopDisplay.visible = active;
    },
  };
}
