import { drawStudyArtwork } from './about-study-artwork.ts';
import { createAboutPhotoPrints } from './about-photo-print.ts';
import type { AboutPhotos } from '../../../lib/content/about-photos.ts';

/** Static, floor-referenced crew study. +Z faces the visitor; all props are retained. */
export function buildAboutPersonalStudy(
  THREE: any,
  h: any,
  root: any,
  options: {
    accent?: any;
    photos?: AboutPhotos;
    onPhotoChange?: () => void;
  } = {},
) {
  const photoPrints = createAboutPhotoPrints(THREE, options.onPhotoChange);
  root.userData.aboutSocialCards = [];
  root.userData.aboutPhotoPrints = photoPrints;
  const prefix = 'personal-study-';
  const material = (
    name: string,
    color: number,
    roughness = 0.72,
    metalness = 0,
  ) => {
    const mat = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    mat.name = prefix + name;
    mat.envMapIntensity = 0.07;
    mat.userData.highlightScale = 0.015;
    return mat;
  };
  const m = {
    cream: material('cream-enamel', 0xdfd6c4, 0.52, 0.08),
    edge: material('warm-edge', 0xe8dfcd, 0.48, 0.06),
    navy: material('navy-cloth', 0x26384c, 0.97),
    navySeam: material('navy-stitch', 0x3b4e61, 0.98),
    linen: material('oatmeal-weave', 0xbdb098, 0.99),
    rust: material('stored-quilt', 0x9b6340, 0.99),
    graphite: material('graphite-frame', 0x202d37, 0.62, 0.12),
    rubber: material('webbing-and-seals', 0x14202a, 0.98),
    metal: material('satin-fixings', 0x929b99, 0.47, 0.55),
    amber: material(
      'amber-hardware',
      options.accent?.color?.getHex() ?? 0xe79625,
      0.48,
      0.12,
    ),
    paper: material('page-edges', 0xe1d6be, 0.98),
    paperLine: material('page-edge-shadow', 0xab9c7e, 1),
    ink: material('printed-ink', 0x203147, 1),
    diffuser: material('reading-lamp-lens', 0xffe5b4, 0.68),
    wood: material('warm-composite-writing-insert', 0xae8050, 0.7, 0.02),
  };
  m.diffuser.emissive.set(0xffd697);
  m.diffuser.emissiveIntensity = 0.8;
  const box = (
    w: number,
    height: number,
    depth: number,
    mat: any,
    x: number,
    y: number,
    z: number,
    name: string,
    into = root,
    radius = 0.016,
  ) => h.box(w, height, depth, mat, x, y, z, into, radius, prefix + name);
  const mesh = (geometry: any, mat: any, name: string, into = root) =>
    h.mesh(geometry, mat, into, prefix + name);
  const rod = (
    a: number[],
    b: number[],
    radius: number,
    mat: any,
    name: string,
    into = root,
  ) => {
    const part = h.rod(a, b, radius, mat, into);
    part.name = prefix + name;
    return part;
  };
  const cylinder = (
    r: number,
    length: number,
    mat: any,
    x: number,
    y: number,
    z: number,
    name: string,
    into = root,
    axis = 'z',
    top = r,
  ) => {
    const part = h.cylinder(r, length, mat, x, y, z, into, axis, top, 24);
    part.name = prefix + name;
    return part;
  };
  const group = (name: string, x = 0, y = 0, z = 0, into = root) => {
    const part = new THREE.Group();
    part.name = prefix + name;
    part.position.set(x, y, z);
    into.add(part);
    return part;
  };
  const curve = (
    points: number[][],
    radius: number,
    mat: any,
    name: string,
    into = root,
    steps = 32,
  ) =>
    mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
        steps,
        radius,
        7,
        false,
      ),
      mat,
      name,
      into,
    );
  const screwPoints: number[][] = [];
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  function screwSet(points: number[][], into = root, name = 'fasteners') {
    const geo = new THREE.CylinderGeometry(0.011, 0.011, 0.006, 12);
    geo.rotateX(Math.PI / 2);
    h.instances(
      geo,
      m.metal,
      points.map((p) => ({ p })),
      into,
      prefix + name,
    );
    h.instances(
      unitBox,
      m.rubber,
      points.map(([x, y, z]) => ({
        p: [x, y, z + 0.0035],
        s: [0.012, 0.002, 0.0012],
      })),
      into,
      prefix + name + '-slots',
    );
  }
  function canvasMap(
    name: string,
    width: number,
    height: number,
    draw: (ctx: any) => void,
  ) {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    draw(ctx);
    const tex = new THREE.CanvasTexture(canvas);
    tex.name = prefix + name;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
  }
  // Small, mipmapped fiber variation; geometry supplies the larger quilt folds.
  const fibers = new Uint8Array(128 * 128 * 4);
  for (let y = 0; y < 128; y++)
    for (let x = 0; x < 128; x++) {
      const i = (y * 128 + x) * 4;
      const v =
        166 + (x % 4 < 2 !== y % 4 < 2 ? 32 : 0) + ((x * 19 + y * 37) % 17);
      fibers[i] = fibers[i + 1] = fibers[i + 2] = v;
      fibers[i + 3] = 255;
    }
  const fabric = new THREE.DataTexture(fibers, 128, 128);
  fabric.wrapS = fabric.wrapT = THREE.RepeatWrapping;
  fabric.repeat.set(5, 9);
  fabric.generateMipmaps = true;
  fabric.minFilter = THREE.LinearMipmapLinearFilter;
  fabric.magFilter = THREE.LinearFilter;
  fabric.anisotropy = 4;
  fabric.needsUpdate = true;
  for (const mat of [m.navy, m.navySeam, m.linen, m.rust]) {
    mat.bumpMap = fabric;
    mat.bumpScale = 0.002;
  }
  m.wood.map = canvasMap('writing-composite-grain', 512, 256, (ctx) => {
    ctx.fillStyle = '#b28b60';
    ctx.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 100; i++) {
      ctx.strokeStyle = i % 3 ? 'rgba(75,47,22,.055)' : 'rgba(255,232,188,.08)';
      ctx.lineWidth = 0.5 + (i % 3) * 0.3;
      ctx.beginPath();
      for (let x = 0; x <= 512; x += 8) {
        const y = i * 2.7 + Math.sin(x * 0.014 + i * 0.7) * 2.8;
        if (!x) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  });
  if (m.wood.map) m.wood.color.set(0xffffff);

  function roundedPath(
    w: number,
    height: number,
    radius: number,
    hole = false,
  ) {
    const p = hole ? new THREE.Path() : new THREE.Shape();
    const x = -w / 2,
      y = -height / 2,
      r = radius;
    p.moveTo(x + r, y);
    p.lineTo(x + w - r, y);
    p.quadraticCurveTo(x + w, y, x + w, y + r);
    p.lineTo(x + w, y + height - r);
    p.quadraticCurveTo(x + w, y + height, x + w - r, y + height);
    p.lineTo(x + r, y + height);
    p.quadraticCurveTo(x, y + height, x, y + height - r);
    p.lineTo(x, y + r);
    p.quadraticCurveTo(x, y, x + r, y);
    p.closePath();
    return p;
  }
  function ring(
    w: number,
    height: number,
    thickness: number,
    depth: number,
    mat: any,
    x: number,
    y: number,
    z: number,
    name: string,
    into = root,
  ) {
    const shape = roundedPath(w, height, Math.min(0.035, height * 0.2));
    shape.holes.push(
      roundedPath(
        w - thickness * 2,
        height - thickness * 2,
        Math.min(0.024, (height - thickness * 2) * 0.2),
        true,
      ),
    );
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: false,
      curveSegments: 12,
    });
    geo.translate(0, 0, -depth / 2);
    const part = mesh(geo, mat, name, into);
    part.position.set(x, y, z);
    return part;
  }
  function artwork(
    kind: string,
    w: number,
    height: number,
    x: number,
    y: number,
    z: number,
    into = root,
  ) {
    const mat = material(kind + '-print', 0xffffff, 1);
    mat.map = canvasMap(
      kind + '-texture',
      kind === 'landscape-postcard' ? 1024 : 768,
      kind === 'landscape-postcard' ? 640 : 1024,
      (ctx) => drawStudyArtwork(ctx, kind),
    );
    if (kind === 'landscape-postcard' && mat.map) {
      const visibleWidth = w / height / (512 / 320);
      mat.map.repeat.x = visibleWidth;
      mat.map.offset.x = (1 - visibleWidth) / 2;
    }
    mat.userData.studyInk = true;
    const part = mesh(
      new THREE.PlaneGeometry(w, height),
      mat,
      kind + '-printed-paper',
      into,
    );
    part.position.set(x, y, z);
    return part;
  }
  // The pressure lining is curved below q=.71. Standoffs meet it instead of
  // covering it with another sheet or placing the furniture on a false floor.
  function rearWall(q: number) {
    if (q >= 0.71) return -1.1;
    const t = 1 - Math.sqrt(Math.max(0, 1 - (0.71 - q) / 0.795));
    return -1.1 + 0.43 * t * t;
  }
  function wallAnchor(x: number, y: number, front: number, name: string) {
    const rear = rearWall(y) - 0.006;
    box(
      0.092,
      0.105,
      front - rear,
      m.graphite,
      x,
      y,
      (front + rear) / 2,
      name + '-wall-anchor',
      root,
      0.012,
    );
    screwPoints.push([x, y, front + 0.003]);
  }

  // Berth: fixed backing, quilted sleep restraint, captive headpad and lower stowage.
  // Opening the former divider gap lets the complete berth move inward as one
  // assembly. The retained bedding roll uses this frame's left edge for spacing.
  const bx = -0.9,
    berthFrameWidth = 0.79;
  box(
    berthFrameWidth,
    1.89,
    0.09,
    m.graphite,
    bx,
    1.15,
    -0.94,
    'berth-back-frame',
    root,
    0.04,
  );
  for (const x of [bx - 0.34, bx + 0.34])
    for (const y of [0.26, 2.04]) wallAnchor(x, y, -0.886, 'berth');
  box(
    0.706,
    1.51,
    0.23,
    m.navy,
    bx,
    1.31,
    -0.805,
    'sleep-restraint-body',
    root,
    0.1,
  );
  box(
    0.61,
    0.26,
    0.11,
    m.linen,
    bx,
    1.895,
    -0.687,
    'integrated-headpad',
    root,
    0.053,
  );
  for (const x of [bx - 0.274, bx + 0.274]) {
    box(
      0.037,
      0.22,
      0.026,
      m.rubber,
      x,
      1.905,
      -0.619,
      'headpad-corner-restraint',
      root,
      0.008,
    );
    box(
      0.049,
      0.043,
      0.038,
      m.graphite,
      x,
      2.027,
      -0.636,
      'headpad-anchor',
      root,
      0.009,
    );
  }
  const quilt = new THREE.PlaneGeometry(0.6, 1.2, 36, 66);
  const qp = quilt.attributes.position;
  for (let i = 0; i < qp.count; i++) {
    const x = qp.getX(i),
      y = qp.getY(i);
    const edge = Math.min(
      1,
      (0.3 - Math.abs(x)) / 0.05,
      (0.6 - Math.abs(y)) / 0.06,
    );
    const puff = Math.pow(
      Math.abs(Math.sin((x + y) * 19) * Math.sin((x - y) * 19)),
      0.7,
    );
    qp.setZ(i, Math.max(0, edge) * (0.009 + 0.019 * puff));
  }
  quilt.computeVertexNormals();
  const paddedQuilt = mesh(quilt, m.navy, 'stitched-quilt-surface');
  paddedQuilt.position.set(bx, 1.235, -0.687);
  ring(
    0.636,
    1.238,
    0.009,
    0.01,
    m.navySeam,
    bx,
    1.235,
    -0.681,
    'quilt-sewn-binding',
  );
  // One slim fabric restraint with a genuine open-frame buckle.
  box(
    0.733,
    0.053,
    0.028,
    m.rubber,
    bx,
    1.32,
    -0.641,
    'berth-webbing-restraint',
    root,
    0.01,
  );
  for (const side of [-1, 1]) {
    box(
      0.035,
      0.068,
      0.25,
      m.rubber,
      bx + side * 0.352,
      1.32,
      -0.748,
      'berth-webbing-return',
      root,
      0.008,
    );
    box(
      0.062,
      0.087,
      0.05,
      m.graphite,
      bx + side * 0.36,
      1.32,
      -0.865,
      'berth-restraint-anchor',
      root,
      0.012,
    );
  }
  ring(
    0.104,
    0.084,
    0.016,
    0.024,
    m.metal,
    bx + 0.045,
    1.32,
    -0.612,
    'berth-restraint-buckle',
  );
  box(
    0.042,
    0.041,
    0.012,
    m.amber,
    bx + 0.045,
    1.32,
    -0.596,
    'berth-buckle-release',
    root,
    0.004,
  );

  // The library retains its books behind a physical lattice; folded bedding
  // uses broad captive webbing. Neither needs transparent coplanar overlays.
  function stowage(
    x: number,
    y: number,
    w: number,
    height: number,
    depth: number,
    name: string,
    fill: 'books' | 'quilt',
  ) {
    const front = -0.695;
    const back = front - depth;
    box(
      w,
      height,
      depth,
      m.navy,
      x,
      y,
      (front + back) / 2,
      name + '-pouch-body',
      root,
      0.037,
    );
    for (const xx of [x - w / 2 + 0.045, x + w / 2 - 0.045])
      for (const yy of [y - height / 2 + 0.044, y + height / 2 - 0.044])
        wallAnchor(xx, yy, back + 0.005, name);
    box(
      w - 0.058,
      height - 0.058,
      0.012,
      m.rubber,
      x,
      y,
      front + 0.006,
      name + '-dark-lining',
      root,
      0.018,
    );
    if (fill === 'books') {
      for (let i = 0; i < 3; i++) {
        const xx = x + ((i - 1) * (w - 0.13)) / 3;
        box(
          (w - 0.17) / 3,
          height - 0.105,
          0.06,
          i === 1 ? m.linen : m.navy,
          xx,
          y - 0.006,
          front + 0.034,
          name + '-retained-book-' + i,
          root,
          0.008,
        );
        artwork(
          ['book-one', 'book-two', 'book-three'][i],
          (w - 0.185) / 3,
          height - 0.12,
          xx,
          y - 0.006,
          front + 0.065,
        );
      }
    } else
      box(
        w - 0.092,
        height - 0.105,
        0.06,
        m.rust,
        x,
        y,
        front + 0.034,
        name + '-enclosed-folded-textile',
        root,
        0.025,
      );
    const innerW = w - 0.072,
      innerH = height - 0.072;
    if (fill === 'books') {
      const lattice = [];
      for (let xx = -innerW / 2; xx <= innerW / 2 + 0.001; xx += 0.023)
        lattice.push({
          p: [x + xx, y, front + 0.079],
          s: [0.0024, innerH, 0.0026],
        });
      for (let yy = -innerH / 2; yy <= innerH / 2 + 0.001; yy += 0.023)
        lattice.push({
          p: [x, y + yy, front + 0.08],
          s: [innerW, 0.0024, 0.0026],
        });
      h.instances(
        unitBox,
        m.graphite,
        lattice,
        root,
        prefix + name + '-captive-mesh',
      );
    } else {
      // Broad retained webbing makes the folded textile read as secured luggage,
      // rather than the fine lattice resembling a heater below the berth.
      for (const side of [-1, 1]) {
        box(
          0.044,
          innerH,
          0.014,
          m.rubber,
          x + side * innerW * 0.27,
          y,
          front + 0.079,
          name + '-textile-restraint',
          root,
          0.006,
        );
        box(
          0.065,
          0.043,
          0.008,
          m.metal,
          x + side * innerW * 0.27,
          y,
          front + 0.09,
          name + '-captured-webbing-buckle',
          root,
          0.007,
        );
      }
    }
    ring(
      w - 0.023,
      height - 0.023,
      0.024,
      0.028,
      m.graphite,
      x,
      y,
      front + 0.08,
      name + '-retaining-border',
    );
    const teeth = [];
    for (let xx = x - w / 2 + 0.055; xx < x + w / 2 - 0.045; xx += 0.013)
      teeth.push({
        p: [xx, y + height / 2 - 0.021, front + 0.095],
        s: [0.006, 0.011, 0.008],
      });
    h.instances(
      unitBox,
      m.metal,
      teeth,
      root,
      prefix + name + '-closed-zipper-teeth',
    );
    box(
      0.021,
      0.068,
      0.014,
      m.amber,
      x - w / 2 + 0.038,
      y + height / 2 - 0.07,
      front + 0.1,
      name + '-zipper-pull',
      root,
      0.006,
    );
    for (const xx of [x - w / 2 + 0.025, x + w / 2 - 0.025])
      for (const yy of [y - height / 2 + 0.025, y + height / 2 - 0.025])
        screwPoints.push([xx, yy, front + 0.095]);
  }
  stowage(bx, 0.328, 0.72, 0.325, 0.19, 'blanket-stowage', 'quilt');
  // Keep the reading station rigid while giving its desk and library a clear
  // gap beside the berth access rail. Mounts, retained props and fasteners move with it.
  const readingStation = group('reading-station', 0.085);
  readingStation.userData.batchRoot = true;
  const attachReadingStation = (
    previousParts: Set<any>,
    firstScrew: number,
    name: string,
  ) => {
    // Reparenting removes children from root; iterate a stable snapshot.
    // oxlint-disable-next-line unicorn/no-useless-spread
    for (const part of [...root.children])
      if (!previousParts.has(part)) readingStation.add(part);
    screwSet(screwPoints.splice(firstScrew), readingStation, name);
  };
  const beforeLibrary = new Set(root.children);
  const libraryScrewStart = screwPoints.length;
  const libraryCenterX = 0.12,
    libraryWidth = 0.85,
    journalCenterX = 0.31,
    journalCradleWidth = 1.09;
  stowage(
    libraryCenterX,
    1.98,
    libraryWidth,
    0.38,
    0.16,
    'personal-library',
    'books',
  );
  attachReadingStation(beforeLibrary, libraryScrewStart, 'library-fasteners');

  // A rigid berth service rail replaces the cloth divider. Rounded returns meet
  // the bulkhead at both ends; the small amber grip remains within easy reach of
  // the sleeping restraint. Its narrow profile leaves a clear gap to the desk.
  const berthRightEdge = bx + berthFrameWidth / 2;
  const journalLeftEdge =
    journalCenterX + readingStation.position.x - journalCradleWidth / 2;
  const libraryLeftEdge =
    libraryCenterX + readingStation.position.x - libraryWidth / 2;
  // The rail belongs in the visible gap beside the open notebook cradle.
  // Its wider light cap separately balances the tighter upper library gap.
  const berthRailX = (berthRightEdge + journalLeftEdge) / 2;
  const berthLightX = (berthRightEdge + libraryLeftEdge) / 2;
  for (const y of [0.58, 1.82]) {
    wallAnchor(berthRailX, y, -0.921, 'berth-service');
    box(
      0.104,
      0.104,
      0.069,
      m.graphite,
      berthRailX,
      y,
      -0.889,
      'berth-rail-mount',
      root,
      0.025,
    );
  }
  box(
    0.064,
    1.415,
    0.054,
    m.graphite,
    berthRailX,
    1.25,
    -0.937,
    'berth-service-spine',
    root,
    0.017,
  );
  // Explicit straight and quarter-turn sections keep the grip coaxial with the
  // rail; a spline through long unequal spans would bow away from the sleeve.
  const railPoint = (y: number, z: number) =>
    new THREE.Vector3(berthRailX, y, z);
  const railPath = new THREE.CurvePath();
  railPath.add(
    new THREE.LineCurve3(railPoint(0.58, -0.864), railPoint(0.58, -0.752)),
  );
  railPath.add(
    new THREE.QuadraticBezierCurve3(
      railPoint(0.58, -0.752),
      railPoint(0.58, -0.685),
      railPoint(0.647, -0.685),
    ),
  );
  railPath.add(
    new THREE.LineCurve3(railPoint(0.647, -0.685), railPoint(1.753, -0.685)),
  );
  railPath.add(
    new THREE.QuadraticBezierCurve3(
      railPoint(1.753, -0.685),
      railPoint(1.82, -0.685),
      railPoint(1.82, -0.752),
    ),
  );
  railPath.add(
    new THREE.LineCurve3(railPoint(1.82, -0.752), railPoint(1.82, -0.864)),
  );
  mesh(
    new THREE.TubeGeometry(railPath, 44, 0.017, 8, false),
    m.graphite,
    'rounded-berth-access-rail',
  );
  cylinder(
    0.02,
    0.32,
    m.amber,
    berthRailX,
    1.2,
    -0.685,
    'berth-rail-grip',
    root,
    'y',
  );
  for (const y of [1.035, 1.365])
    cylinder(
      0.022,
      0.016,
      m.rubber,
      berthRailX,
      y,
      -0.685,
      'berth-grip-collar',
      root,
      'y',
    );

  // A fixed, shielded reading lamp terminates the service spine at head height.
  // The lens is emissive only: it adds no light/shadow work or new interaction.
  wallAnchor(berthRailX, 1.967, -0.921, 'berth-light');
  box(
    0.057,
    0.072,
    0.199,
    m.graphite,
    berthRailX,
    1.967,
    -0.832,
    'berth-light-retained-arm',
    root,
    0.015,
  );
  box(
    0.182,
    0.083,
    0.111,
    m.graphite,
    berthLightX,
    1.964,
    -0.716,
    'berth-reading-light-housing',
    root,
    0.025,
  );
  box(
    0.143,
    0.041,
    0.014,
    m.cream,
    berthLightX,
    1.955,
    -0.656,
    'berth-reading-light-recess',
    root,
    0.009,
  );
  box(
    0.123,
    0.022,
    0.006,
    m.diffuser,
    berthLightX,
    1.952,
    -0.646,
    'berth-reading-light-lens',
    root,
    0.005,
  );

  // Narrow sealed personal locker, with seated latches and captured seal keepers.
  const beforeLocker = new Set(root.children);
  const lockerScrewStart = screwPoints.length;
  const lx = 1.337;
  box(
    0.292,
    1.96,
    0.15,
    m.graphite,
    lx,
    1.13,
    -0.971,
    'locker-rear-case',
    root,
    0.03,
  );
  for (const y of [0.36, 1.93]) wallAnchor(lx, y, -0.966, 'locker');
  box(
    0.31,
    1.978,
    0.145,
    m.cream,
    lx,
    1.13,
    -0.865,
    'locker-shell',
    root,
    0.057,
  );
  box(
    0.263,
    1.9,
    0.021,
    m.edge,
    lx,
    1.13,
    -0.783,
    'locker-inset-door',
    root,
    0.035,
  );
  for (const y of [0.305, 1.966]) {
    box(
      0.147,
      0.048,
      0.008,
      m.metal,
      lx,
      y,
      -0.769,
      'locker-captive-seal-keeper',
      root,
      0.009,
    );
    box(
      0.012,
      0.026,
      0.003,
      m.amber,
      lx + 0.048,
      y,
      -0.7635,
      'locker-seal-witness',
      root,
      0.003,
    );
  }
  for (const y of [0.54, 1.72])
    box(
      0.022,
      0.092,
      0.025,
      m.metal,
      lx - 0.125,
      y,
      -0.768,
      'locker-hinge',
      root,
      0.006,
    );
  rod(
    [lx + 0.082, 0.85, -0.731],
    [lx + 0.082, 1.27, -0.731],
    0.014,
    m.amber,
    'locker-handle',
  );
  for (const y of [0.85, 1.27])
    box(
      0.033,
      0.036,
      0.045,
      m.graphite,
      lx + 0.082,
      y,
      -0.748,
      'locker-handle-return',
      root,
      0.008,
    );

  // Keep the complete locker and its mounting hardware together so each layout
  // can center it in the wall gap without stretching or displacing its parts.
  const locker = group('personal-locker');
  locker.userData.batchRoot = true;
  // Reparenting removes children from root; iterate a stable snapshot.
  // oxlint-disable-next-line unicorn/no-useless-spread
  for (const part of [...root.children])
    if (part !== locker && !beforeLocker.has(part)) locker.add(part);
  screwSet(screwPoints.splice(lockerScrewStart), locker, 'locker-fasteners');
  root.userData.setLockerX = (x: number) => {
    locker.position.x = x - lx;
  };

  const beforeWritingStation = new Set(root.children);
  const writingScrewStart = screwPoints.length;
  // Pictures are thin mounted paper with four clips, not loose ornaments.
  function note(
    kind: string,
    x: number,
    y: number,
    w: number,
    height: number,
    slot?: 'left' | 'center' | 'right',
  ) {
    const mounted = group(kind + '-mount', x, y, -1.085);
    const social = slot ? options.photos?.socials[slot] : null;
    box(
      w + 0.024,
      height + 0.025,
      0.025,
      m.paper,
      0,
      0,
      0,
      kind + '-paper-backing',
      mounted,
      0.005,
    );
    const print = artwork(kind, w, height, 0, 0, 0.015, mounted);
    if (social || (kind === 'landscape-postcard' && options.photos?.portrait)) {
      const map = photoPrints.texture(
        kind,
        kind === 'landscape-postcard' ? 1024 : 512,
        kind === 'landscape-postcard' ? 1024 : 512,
        social ? social.photo : options.photos?.portrait,
        social?.link,
      );
      if (map) {
        print.material.map?.dispose();
        print.material.map = map;
      }
    }
    for (const xx of [x - w / 2 + 0.015, x + w / 2 - 0.015])
      for (const yy of [y - height / 2 + 0.014, y + height / 2 - 0.014]) {
        box(
          0.034,
          0.035,
          0.041,
          m.amber,
          xx - x,
          yy - y,
          0.011,
          kind + '-corner-retainer',
          mounted,
          0.006,
        );
        screwPoints.push([xx, yy, -1.05]);
      }
    if (social && slot) {
      const anchor = new THREE.Object3D();
      anchor.name = `about-social-${slot}-anchor`;
      anchor.position.z = 0.034;
      mounted.add(anchor);
      root.userData.aboutSocialCards.push({
        root: mounted,
        anchor,
        width: w,
        height,
        side: slot,
        section: 'about',
        link: social.link,
        interactableId: `about-social-${slot}`,
      });
    }
  }
  // A square photograph, slightly larger than the social prints. Preserve its
  // lower edge and clearance above that row; clips follow the actual frame.
  // The original landscape fallback is cropped, never stretched.
  note('landscape-postcard', 0.918, 2.0275, 0.44, 0.44);
  // One centered row of equal paper sizes, equal gaps, and identical retainers.
  for (const [index, kind] of [
    'mountain-note',
    'personal-note',
    'curiosity-note',
  ].entries())
    note(
      kind,
      0.32 + (index - 1) * 0.434,
      1.575,
      0.38,
      0.38,
      (['left', 'center', 'right'] as const)[index],
    );

  // Fold-down desk, same working elevation as Contact. Supports are continuous
  // from the wall to the underside, leaving open knees and an unobstructed aisle.
  const dx = 0.394,
    topY = 0.785;
  box(
    1.43,
    0.109,
    0.8,
    m.cream,
    dx,
    topY - 0.0545,
    -0.603,
    'folding-desk-body',
    root,
    0.038,
  );
  box(
    1.326,
    0.014,
    0.67,
    m.wood,
    dx,
    topY - 0.002,
    -0.606,
    'flush-writing-insert',
    root,
    0.009,
  );
  for (const x of [dx - 0.54, dx + 0.54]) {
    wallAnchor(x, 0.43, -0.972, 'desk-stay');
    wallAnchor(x, 0.74, -0.972, 'desk-hinge');
    rod(
      [x, 0.436, -0.963],
      [x, 0.677, -0.341],
      0.024,
      m.graphite,
      'desk-triangular-stay',
    );
    box(
      0.071,
      0.04,
      0.078,
      m.graphite,
      x,
      0.69,
      -0.349,
      'desk-stay-top-shoe',
      root,
      0.008,
    );
    cylinder(
      0.036,
      0.115,
      m.graphite,
      x,
      0.728,
      -0.981,
      'desk-hinge-barrel',
      root,
      'x',
    );
    cylinder(
      0.022,
      0.123,
      m.metal,
      x,
      0.728,
      -0.981,
      'desk-hinge-pin',
      root,
      'x',
    );
    box(
      0.097,
      0.058,
      0.086,
      m.graphite,
      x,
      0.68,
      -0.983,
      'desk-hinge-leaf',
      root,
      0.009,
    );
  }
  // Front rail returns into shoes on the apron; no floating bar.
  const railY = 0.723,
    railZ = -0.172;
  rod(
    [dx - 0.57, railY, railZ],
    [dx + 0.57, railY, railZ],
    0.019,
    m.amber,
    'desk-retaining-rail',
  );
  for (const x of [dx - 0.57, dx + 0.57]) {
    box(
      0.068,
      0.067,
      0.047,
      m.graphite,
      x,
      railY,
      -0.216,
      'desk-rail-anchor',
      root,
      0.014,
    );
    rod(
      [x, railY, -0.216],
      [x, railY, railZ],
      0.018,
      m.graphite,
      'desk-rail-return',
    );
  }
  // Fabric foot loop is anchored to the bulkhead, not resting on the deck.
  for (const x of [dx - 0.11, dx + 0.11])
    wallAnchor(x, 0.275, -0.966, 'desk-foot-loop');
  curve(
    [
      [dx - 0.11, 0.275, -0.957],
      [dx - 0.095, 0.215, -0.89],
      [dx + 0.095, 0.215, -0.89],
      [dx + 0.11, 0.275, -0.957],
    ],
    0.014,
    m.rubber,
    'desk-foot-restraint',
    root,
    20,
  );

  // Journal is a shallow open V. Each page block and cover meet a bound spine.
  const journal = group('retained-journal', journalCenterX, 1.1, -0.615);
  journal.rotation.x = -0.64;
  box(
    journalCradleWidth,
    0.65,
    0.041,
    m.graphite,
    0,
    0,
    -0.051,
    'journal-cradle-back',
    journal,
    0.025,
  );
  box(
    1.056,
    0.617,
    0.023,
    m.navy,
    0,
    0,
    -0.019,
    'cloth-bound-cover',
    journal,
    0.019,
  );
  cylinder(0.032, 0.585, m.navySeam, 0, 0, -0.012, 'bound-spine', journal, 'y');
  // The paper bends into the binding; the cloth spine stays beneath the spread.
  const gutter = new THREE.PlaneGeometry(0.044, 0.565, 16, 1);
  const gutterPoints = gutter.attributes.position;
  for (let i = 0; i < gutterPoints.count; i++) {
    const distance = Math.abs(gutterPoints.getX(i)) / 0.022;
    gutterPoints.setZ(i, 0.024 + 0.022 * Math.pow(distance, 0.6));
  }
  gutter.computeVertexNormals();
  mesh(gutter, m.paper, 'continuous-paper-gutter', journal);
  // These hairline page shadows are only .0012 units thick. A closed cuboid
  // retains each paper layer without spending hundreds of triangles on its bevel.
  const lowerPageEdgeGeometry = new THREE.BoxGeometry(0.449, 0.0012, 0.0013);
  const outerPageEdgeGeometry = new THREE.BoxGeometry(0.0012, 0.56, 0.0013);
  for (const side of [-1, 1]) {
    const leaf = group(
      side < 0 ? 'left-paper-section' : 'right-paper-section',
      side * 0.009,
      0,
      0.014,
      journal,
    );
    leaf.rotation.y = side * -0.035;
    const centerX = side * 0.231;
    box(
      0.462,
      0.573,
      0.032,
      m.paper,
      centerX,
      0,
      0,
      'bound-page-block',
      leaf,
      0.007,
    );
    for (let i = 0; i < 5; i++) {
      const z = -0.01 + i * 0.0056;
      mesh(
        lowerPageEdgeGeometry,
        m.paperLine,
        'lower-page-edge',
        leaf,
      ).position.set(centerX, -0.28, z);
      mesh(
        outerPageEdgeGeometry,
        m.paperLine,
        'outer-page-edge',
        leaf,
      ).position.set(centerX + side * 0.226, 0, z);
    }
    const upperLeaf = group('top-paper-leaf', centerX, 0, 0.024, leaf);
    // Slight crown at the binding makes the spread read as paper, not a tablet.
    const pageGeo = new THREE.PlaneGeometry(0.454, 0.566, 24, 4);
    const pp = pageGeo.attributes.position;
    for (let i = 0; i < pp.count; i++) {
      const x = pp.getX(i);
      pp.setZ(i, 0.004 * Math.exp(-Math.pow((x + side * 0.223) / 0.065, 2)));
    }
    pageGeo.computeVertexNormals();
    const pageMat = material(
      side < 0 ? 'left-page-ink' : 'right-page-ink',
      0xffffff,
      1,
    );
    pageMat.map = canvasMap(
      side < 0 ? 'left-page-print' : 'right-page-print',
      1024,
      1280,
      (ctx) =>
        drawStudyArtwork(ctx, side < 0 ? 'journal-left' : 'journal-right'),
    );
    pageMat.userData.studyInk = true;
    mesh(pageGeo, pageMat, 'printed-top-paper-leaf', upperLeaf);
    if (side === 1) {
      // Flags share a profile. Their adhesive region overlaps the actual leaf;
      // their free end extends beyond it, entirely clear of the cover/cradle.
      for (const [i, title] of [
        'My story',
        'How I work',
        'Beyond work',
      ].entries()) {
        const y = 0.172 - i * 0.165;
        const flagRoot = group(
          'tabbed-paper-leaf-' + i,
          0,
          0,
          0.017 + i * 0.002,
          leaf,
        );
        const sheetWidth = 0.482 + i * 0.004,
          sheetCenter = 0.246 + i * 0.002;
        const paperEdge = sheetCenter + sheetWidth / 2;
        box(
          sheetWidth,
          0.554 - i * 0.004,
          0.0011,
          m.paper,
          sheetCenter,
          0,
          0,
          'separate-indexed-paper-sheet-' + i,
          flagRoot,
          0.0004,
        );
        const colors = [0xd9ae61, 0xb6bf8a, 0x9ab6c3];
        const flagMat = material('adhesive-paper-flag-' + i, colors[i], 0.98);
        const flagGeo = new THREE.PlaneGeometry(0.155, 0.062, 12, 1);
        const fp = flagGeo.attributes.position;
        for (let p = 0; p < fp.count; p++) {
          const x = fp.getX(p);
          fp.setZ(p, Math.max(0, x + 0.0475) * 0.06);
        }
        flagGeo.computeVertexNormals();
        flagMat.side = THREE.DoubleSide;
        const flag = mesh(
          flagGeo,
          flagMat,
          'page-attached-flag-' + i,
          flagRoot,
        );
        flag.position.set(paperEdge + 0.0475, y, 0.0009);
        const labelMat = material('flag-print-' + i, 0xffffff, 1);
        labelMat.map = canvasMap('paper-flag-title-' + i, 768, 256, (ctx) => {
          ctx.fillStyle = ['#d9ae61', '#b6bf8a', '#9ab6c3'][i];
          ctx.fillRect(0, 0, 768, 256);
          ctx.fillStyle = '#233747';
          ctx.font = '500 69px "Helvetica Neue", Arial, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(title, 412, 131, 670);
          ctx.fillStyle = 'rgba(239,229,206,.35)';
          ctx.fillRect(0, 0, 171, 256);
        });
        labelMat.side = THREE.DoubleSide;
        labelMat.userData.studyInk = true;
        const label = mesh(
          flagGeo.clone(),
          labelMat,
          'flag-printed-adhesive-face-' + i,
          flagRoot,
        );
        label.position.copy(flag.position);
        label.position.z += 0.0006;
        flagRoot.userData.pageFlag = {
          label: title,
          page: i,
          overlap: 0.03,
          extension: 0.125,
          attachedTo: 'paper',
          button: false,
        };
      }
    }
  }
  // Four clips hold the book and exposed paper; all connect around its edge.
  for (const x of [-0.441, 0.441]) {
    box(
      0.062,
      0.084,
      0.087,
      m.graphite,
      x,
      -0.279,
      -0.012,
      'book-cover-retaining-clip',
      journal,
      0.01,
    );
    box(
      0.047,
      0.056,
      0.093,
      m.amber,
      x,
      0.277,
      -0.008,
      'paper-hold-down-clip',
      journal,
      0.008,
    );
    screwSet(
      [
        [x, 0.301, 0.042],
        [x, -0.307, 0.035],
      ],
      journal,
      'journal-clips',
    );
  }
  // Cradle feet terminate at the desk surface, paired with a rear stand.
  for (const x of [journalCenterX - 0.405, journalCenterX + 0.405]) {
    box(
      0.09,
      0.036,
      0.115,
      m.graphite,
      x,
      0.799,
      -0.441,
      'journal-cradle-front-foot',
      root,
      0.014,
    );
    rod(
      [x, 0.8, -0.8],
      [x, 1.108, -0.706],
      0.018,
      m.graphite,
      'journal-cradle-rear-stay',
    );
  }
  // A cuff holds the pen positively; the tether is a separate safety restraint.
  const pen = group('docked-pen', 0.995, 0.825, -0.564);
  pen.rotation.x = Math.PI / 2;
  cylinder(0.014, 0.258, m.graphite, 0, 0, 0, 'pen-barrel', pen, 'y');
  for (const y of [-0.083, 0.086])
    cylinder(0.016, 0.015, m.amber, 0, y, 0, 'pen-band', pen, 'y');
  cylinder(0.014, 0.047, m.metal, 0, -0.151, 0, 'pen-tip', pen, 'y', 0.002);
  for (const z of [-0.639, -0.483]) {
    box(
      0.059,
      0.038,
      0.035,
      m.graphite,
      0.995,
      0.805,
      z,
      'pen-retaining-clip-base',
      root,
      0.007,
    );
    cylinder(0.023, 0.025, m.metal, 0.995, 0.825, z, 'pen-retaining-cuff');
  }
  box(
    0.065,
    0.028,
    0.048,
    m.graphite,
    1.048,
    0.794,
    -0.82,
    'pen-tether-anchor',
    root,
    0.008,
  );
  curve(
    [
      [0.995, 0.826, -0.694],
      [1.079, 0.812, -0.706],
      [1.098, 0.813, -0.8],
      [1.048, 0.807, -0.82],
    ],
    0.004,
    m.rubber,
    'short-pen-safety-tether',
    root,
    22,
  );

  // Articulated wall lamp. Housing is aligned along its own axis and includes
  // an inset lens, a rolled rim, a hinge, and a cable with restrained terminations.
  wallAnchor(1.078, 1.252, -0.971, 'task-lamp');
  box(
    0.085,
    0.19,
    0.066,
    m.graphite,
    1.078,
    1.252,
    -0.965,
    'task-lamp-wall-base',
    root,
    0.019,
  );
  const a = [1.078, 1.289, -0.919],
    b = [1.093, 1.5, -0.799],
    c = [1.06, 1.49, -0.608];
  rod(a, b, 0.013, m.graphite, 'lamp-lower-arm');
  rod(b, c, 0.014, m.graphite, 'lamp-upper-arm');
  for (const p of [a, b, c]) {
    cylinder(0.03, 0.04, m.graphite, p[0], p[1], p[2], 'lamp-pivot');
    cylinder(0.014, 0.048, m.amber, p[0], p[1], p[2], 'lamp-pivot-pin');
  }
  const lamp = group('shaded-reading-lamp', c[0], c[1], c[2]);
  lamp.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0.12, 0.88, -0.3).normalize(),
  );
  cylinder(
    0.082,
    0.116,
    m.graphite,
    0,
    -0.053,
    0,
    'reading-lamp-shade',
    lamp,
    'y',
    0.037,
  );
  cylinder(
    0.074,
    0.01,
    m.cream,
    0,
    -0.116,
    0,
    'reading-lamp-inner-rim',
    lamp,
    'y',
  );
  cylinder(
    0.062,
    0.012,
    m.diffuser,
    0,
    -0.123,
    0,
    'reading-lamp-diffuser',
    lamp,
    'y',
  );
  curve(
    [
      [1.105, 1.197, -0.948],
      [1.112, 1.399, -0.908],
      [1.12, 1.511, -0.815],
      [1.085, 1.507, -0.627],
    ],
    0.0045,
    m.rubber,
    'lamp-retained-power-cable',
  );
  for (const [x, y, z] of [
    [1.105, 1.33, -0.927],
    [1.118, 1.456, -0.862],
  ])
    box(
      0.021,
      0.032,
      0.014,
      m.graphite,
      x,
      y,
      z,
      'lamp-cable-clip',
      root,
      0.004,
    );
  attachReadingStation(
    beforeWritingStation,
    writingScrewStart,
    'writing-station-fasteners',
  );
  root.userData.aboutPhotosReady = photoPrints.ready();
  screwSet(screwPoints);
  root.userData.personalStudy = {
    floorReferenced: true,
    static: true,
    worktop: topY,
    journalTilt: -0.64,
    pageFlags: ['My story', 'How I work', 'Beyond work'],
    pageFlagsAttachedTo: 'paper-leaves',
    enclosedStowage: true,
    berthCenter: bx,
    berthLeftEdge: bx - 0.395,
    berthFixture: 'rigid-access-rail-with-reading-light',
    readingStationOffset: 0.085,
    noNewInteractions: true,
  };
  return root;
}
