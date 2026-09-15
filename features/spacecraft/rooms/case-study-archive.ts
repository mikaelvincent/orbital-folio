import { ARCHIVE_GRID } from './cabin-composition.ts';

/** Static flight-recorder library. Floor origin, +Y up, +Z toward the visitor. */
export function buildCaseStudyArchive(
  THREE: any,
  h: any,
  floorRoot: any,
  options: { caseCount?: number; accent?: any } = {},
) {
  const prefix = 'case-archive-';
  const material = (
    name: string,
    color: number,
    roughness = 0.65,
    metalness = 0.08,
  ) => {
    const mat = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    mat.name = prefix + name;
    mat.envMapIntensity = 0.08;
    mat.userData.highlightScale = 0.018;
    return mat;
  };
  const m = {
    shell: material('ivory-enamel', 0xdfd6c5, 0.53),
    graphite: material('rack-graphite', 0x283440, 0.63, 0.17),
    edge: material('satin-edge', 0x677780, 0.49, 0.42),
    recess: material('slot-interior', 0x0e171e, 0.91, 0),
    rubber: material('isolators', 0x16212a, 0.88, 0),
    alloy: material('fasteners', 0x9da5a3, 0.45, 0.5),
    amber: material(
      'amber-retainers',
      options.accent?.color?.getHex() ?? 0xe79625,
      0.42,
      0.15,
    ),
    diffuser: material('status-diffuser', 0xe5c993, 0.7, 0),
  };
  m.diffuser.emissive.set(0xf0c97e);
  m.diffuser.emissiveIntensity = 0.22;
  const box = (
    w: number,
    height: number,
    depth: number,
    mat: any,
    x: number,
    y: number,
    z: number,
    into = floorRoot,
    r = 0.018,
    name = 'part',
  ) => h.box(w, height, depth, mat, x, y, z, into, r, prefix + name);
  const rod = (
    a: number[],
    b: number[],
    radius: number,
    mat: any,
    into = floorRoot,
    name = 'rod',
  ) => {
    const part = h.rod(a, b, radius, mat, into);
    part.name = prefix + name;
    return part;
  };
  const cylinder = (
    radius: number,
    depth: number,
    mat: any,
    x: number,
    y: number,
    z: number,
    into = floorRoot,
    axis = 'z',
    name = 'pin',
  ) => {
    const part = h.cylinder(
      radius,
      depth,
      mat,
      x,
      y,
      z,
      into,
      axis,
      radius,
      16,
    );
    part.name = prefix + name;
    return part;
  };
  const screwGeometry = new THREE.CylinderGeometry(0.012, 0.012, 0.005, 12);
  screwGeometry.rotateX(Math.PI / 2);
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  function fasteners(points: number[][], into: any, name: string) {
    h.instances(
      screwGeometry,
      m.alloy,
      points.map((p) => ({ p })),
      into,
      prefix + name + '-screws',
    );
    h.instances(
      unitBox,
      m.recess,
      points.map(([x, y, z]) => ({
        p: [x, y, z + 0.003],
        s: [0.013, 0.0025, 0.0015],
      })),
      into,
      prefix + name + '-screw-slots',
    );
  }
  function roundedPath(
    width: number,
    height: number,
    radius: number,
    hole = false,
  ) {
    const p = hole ? new THREE.Path() : new THREE.Shape();
    const x = -width / 2,
      y = -height / 2,
      r = radius;
    p.moveTo(x + r, y);
    p.lineTo(x + width - r, y);
    p.quadraticCurveTo(x + width, y, x + width, y + r);
    p.lineTo(x + width, y + height - r);
    p.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
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
    insideW: number,
    insideH: number,
    depth: number,
    mat: any,
    into: any,
    name: string,
  ) {
    const shape = roundedPath(w, height, 0.06);
    shape.holes.push(roundedPath(insideW, insideH, 0.039, true));
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelSize: 0.004,
      bevelThickness: 0.004,
      bevelSegments: 2,
      curveSegments: 20,
      steps: 1,
    });
    geometry.translate(0, 0, -depth / 2);
    return h.mesh(geometry, mat, into, prefix + name);
  }
  const icon = (ctx: any, kind: string, x: number, y: number, size: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size / 32, size / 32);
    ctx.lineWidth = 1.7;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    if (kind === 'product') {
      ctx.moveTo(-9, -13);
      ctx.lineTo(5, -13);
      ctx.lineTo(11, -7);
      ctx.lineTo(11, 13);
      ctx.lineTo(-9, 13);
      ctx.closePath();
      ctx.moveTo(5, -13);
      ctx.lineTo(5, -7);
      ctx.lineTo(11, -7);
      for (const yy of [-2, 3, 8]) {
        ctx.moveTo(-5, yy);
        ctx.lineTo(6, yy);
      }
    } else if (kind === 'systems') {
      for (let i = 0; i < 32; i++) {
        const a = (i * Math.PI) / 16,
          r = i % 4 < 2 ? 13 : 10;
        const xx = Math.cos(a) * r,
          yy = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(xx, yy);
        else ctx.lineTo(xx, yy);
      }
      ctx.closePath();
      ctx.moveTo(4.5, 0);
      ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
    } else if (kind === 'research') {
      ctx.moveTo(-5, -13);
      ctx.lineTo(5, -13);
      ctx.moveTo(-3, -13);
      ctx.lineTo(-3, -3);
      ctx.lineTo(-11, 11);
      ctx.quadraticCurveTo(-12, 13, -8, 13);
      ctx.lineTo(8, 13);
      ctx.quadraticCurveTo(12, 13, 11, 11);
      ctx.lineTo(3, -3);
      ctx.lineTo(3, -13);
      ctx.moveTo(-7, 6);
      ctx.lineTo(7, 6);
    } else if (kind === 'interfaces') {
      ctx.roundRect(-13, -11, 26, 22, 2);
      ctx.moveTo(-13, -4);
      ctx.lineTo(13, -4);
      ctx.moveTo(-8, -7.5);
      ctx.lineTo(-7, -7.5);
      ctx.moveTo(-3, -7.5);
      ctx.lineTo(-2, -7.5);
    } else if (kind === 'folder') {
      ctx.moveTo(-14, -6);
      ctx.lineTo(-14, -11);
      ctx.lineTo(-3, -11);
      ctx.lineTo(1, -7);
      ctx.lineTo(14, -7);
      ctx.lineTo(14, 11);
      ctx.lineTo(-14, 11);
      ctx.closePath();
    } else {
      ctx.moveTo(-10, -12);
      ctx.lineTo(9, -12);
      ctx.lineTo(9, 12);
      ctx.lineTo(-10, 12);
      ctx.closePath();
      for (const yy of [-6, 0, 6]) {
        ctx.moveTo(-5, yy);
        ctx.lineTo(5, yy);
      }
    }
    ctx.stroke();
    ctx.restore();
  };
  function graphics(
    w: number,
    height: number,
    into: any,
    name: string,
    draw: (ctx: any, cw: number, ch: number) => void,
    luminous = false,
  ) {
    if (typeof document === 'undefined') return { repaint: () => {} };
    const canvas = document.createElement('canvas');
    canvas.width = 1536;
    canvas.height = Math.max(96, Math.round((1536 * height) / w));
    const ctx = canvas.getContext('2d');
    if (!ctx) return { repaint: () => {} };
    const texture = new THREE.CanvasTexture(canvas);
    texture.name = prefix + name + '-texture';
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = 8;
    const mat = material(name + '-ink', 0xffffff, 1, 0);
    mat.map = texture;
    mat.transparent = !luminous;
    mat.depthWrite = luminous;
    mat.envMapIntensity = 0;
    mat.userData.archiveInk = true;
    if (luminous) {
      mat.emissive.set(0xb4d7e6);
      mat.emissiveMap = texture;
      mat.emissiveIntensity = 0.36;
    }
    const shape = roundedPath(w, height, Math.min(0.031, height * 0.1));
    const geometry = new THREE.ShapeGeometry(shape, 16);
    const pos = geometry.attributes.position,
      uv = geometry.attributes.uv;
    for (let i = 0; i < pos.count; i++)
      uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / height + 0.5);
    const plane = h.mesh(geometry, mat, into, prefix + name);
    plane.castShadow = false;
    plane.receiveShadow = false;
    const repaint = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      draw(ctx, canvas.width, canvas.height);
      texture.needsUpdate = true;
    };
    repaint();
    return { plane, repaint };
  }

  // Floor-bolted rack: grounded rails, captive splice plates and closed slot backs.
  const structuralScrews: number[][] = [];
  for (const side of [-1, 1]) {
    const x = side * 1.32;
    box(
      0.19,
      0.035,
      0.43,
      m.rubber,
      x,
      0.017,
      -0.8,
      floorRoot,
      0.014,
      'rack-isolator',
    );
    box(
      0.17,
      0.07,
      0.38,
      m.edge,
      x,
      0.063,
      -0.8,
      floorRoot,
      0.018,
      'rack-anchored-foot',
    );
    box(
      0.115,
      2.11,
      0.19,
      m.graphite,
      x,
      1.1325,
      -0.83,
      floorRoot,
      0.018,
      'rack-upright',
    );
    box(
      0.021,
      1.99,
      0.021,
      m.edge,
      x - side * 0.032,
      1.12,
      -0.724,
      floorRoot,
      0.004,
      'upright-edge-insert',
    );
    for (const y of [0.19, 0.7, 1.42, 2.1]) {
      box(
        0.145,
        0.095,
        0.035,
        m.graphite,
        x,
        y,
        -0.719,
        floorRoot,
        0.008,
        'upright-splice-plate',
      );
      structuralScrews.push([x, y, -0.699]);
    }
    for (const dx of [-0.052, 0.052])
      for (const dz of [-0.12, 0.12])
        cylinder(
          0.011,
          0.016,
          m.alloy,
          x + dx,
          0.097,
          -0.8 + dz,
          floorRoot,
          'y',
          'floor-anchor-bolt',
        );
    const slots = Array.from({ length: 15 }, (_, i) => ({
      p: [x + side * 0.014, 0.96 + i * 0.077, -0.728],
      s: [0.029, 0.036, 0.014],
    }));
    h.instances(
      unitBox,
      m.recess,
      slots,
      floorRoot,
      prefix + 'rack-index-perforations',
    );
  }
  for (const y of [0.665, 2.16]) {
    box(
      2.77,
      0.105,
      0.2,
      m.graphite,
      0,
      y,
      -0.83,
      floorRoot,
      0.022,
      'rack-crossmember',
    );
    box(
      2.48,
      0.018,
      0.032,
      m.edge,
      0,
      y - 0.035,
      -0.714,
      floorRoot,
      0.006,
      'crossmember-edge',
    );
    for (const x of [-1.24, 1.24]) structuralScrews.push([x, y, -0.7275]);
  }
  box(
    2.5,
    1.44,
    0.065,
    m.recess,
    0,
    1.42,
    -0.901,
    floorRoot,
    0.015,
    'closed-rack-backplane',
  );
  // Compact identification strip is part of the rack, separate from the room title.
  const rackMark = graphics(
    1.7,
    0.041,
    floorRoot,
    'rack-mark',
    (ctx, cw, ch) => {
      ctx.fillStyle = '#a9b9c0';
      ctx.font = `600 ${ch * 0.7}px monospace`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.fillText('FLIGHT RECORDER LIBRARY', cw / 2, ch / 2, cw * 0.94);
    },
  );
  if (rackMark.plane) rackMark.plane.position.set(0, 2.161, -0.727);

  // Physical category cartridges. The last two use archive-dark jackets, as in the reference.
  const categories = [
    {
      title: 'Product engineering',
      kind: 'product',
      code: 'FR–01',
      active: true,
    },
    {
      title: 'Systems & reliability',
      kind: 'systems',
      code: 'FR–02',
      active: true,
    },
    {
      title: 'Research & experiments',
      kind: 'research',
      code: 'FR–03',
      active: true,
    },
    {
      title: 'Design & interfaces',
      kind: 'interfaces',
      code: 'FR–04',
      active: false,
    },
    { title: 'Field notes', kind: 'notes', code: 'FR–05', active: false },
  ];
  categories.forEach((category, index) => {
    const y = ARCHIVE_GRID.centerY + (2 - index) * ARCHIVE_GRID.rowPitch;
    const cartridge = new THREE.Group();
    cartridge.name = prefix + 'cartridge-' + index;
    cartridge.position.set(0, y, -0.65);
    floorRoot.add(cartridge);
    // Load-bearing runners continue behind each solid cassette into the uprights.
    box(
      2.54,
      0.037,
      0.28,
      m.graphite,
      0,
      y - 0.126,
      -0.779,
      floorRoot,
      0.009,
      'slot-support-rail',
    );
    box(
      2.41,
      0.012,
      0.085,
      m.alloy,
      0,
      y - 0.101,
      -0.682,
      floorRoot,
      0.004,
      'slot-sliding-track',
    );
    box(
      2.5,
      0.265,
      0.028,
      m.rubber,
      0,
      0,
      -0.095,
      cartridge,
      0.03,
      'cartridge-isolation-seat',
    );
    box(
      2.44,
      0.246,
      0.18,
      m.graphite,
      0,
      0,
      -0.013,
      cartridge,
      0.042,
      'cartridge-closed-shell',
    );
    box(
      2.22,
      0.21,
      0.06,
      m.edge,
      0,
      0,
      0.063,
      cartridge,
      0.029,
      'cartridge-edge-lip',
    );
    box(
      2.175,
      0.19,
      0.032,
      category.active ? m.shell : m.graphite,
      0,
      0,
      0.102,
      cartridge,
      0.025,
      'cartridge-label-jacket',
    );
    // End retainers are separate latch mechanisms, not orange paint on the label.
    for (const side of [-1, 1]) {
      const xx = side * 1.171;
      box(
        0.126,
        0.204,
        0.063,
        m.amber,
        xx,
        0,
        0.081,
        cartridge,
        0.017,
        'end-lock-body',
      );
      box(
        0.029,
        0.14,
        0.022,
        m.edge,
        xx - side * 0.042,
        0,
        0.125,
        cartridge,
        0.006,
        'lock-captive-pin',
      );
      box(
        0.067,
        0.13,
        0.023,
        m.amber,
        xx + side * 0.012,
        0,
        0.122,
        cartridge,
        0.011,
        'lock-lever',
      );
      box(
        0.026,
        0.015,
        0.007,
        m.recess,
        xx,
        0.061,
        0.136,
        cartridge,
        0.003,
        'lock-witness-mark',
      );
      box(
        0.032,
        0.073,
        0.029,
        m.graphite,
        side * 1.275,
        -0.003,
        -0.067,
        cartridge,
        0.007,
        'rail-catch',
      );
      fasteners(
        [
          [side * 1.047, 0.066, 0.121],
          [side * 1.047, -0.066, 0.121],
        ],
        cartridge,
        'jacket-' + index + '-' + side,
      );
    }
    // A recessed folding pull and metal hinge give the label end a serviceable construction.
    box(
      0.052,
      0.111,
      0.012,
      m.recess,
      0.973,
      0,
      0.124,
      cartridge,
      0.009,
      'folding-pull-rebate',
    );
    rod(
      [0.973, -0.039, 0.14],
      [0.973, 0.039, 0.14],
      0.008,
      m.edge,
      cartridge,
      'folding-pull',
    );
    cylinder(
      0.011,
      0.024,
      m.alloy,
      0.973,
      -0.042,
      0.133,
      cartridge,
      'x',
      'pull-pivot',
    );
    const print = graphics(
      1.94,
      0.145,
      cartridge,
      'cartridge-print-' + index,
      (ctx, cw, ch) => {
        ctx.strokeStyle = ctx.fillStyle = category.active
          ? '#20303e'
          : '#b0c0c7';
        icon(ctx, category.kind, 45, ch / 2, ch * 0.7);
        ctx.font = `600 ${ch * 0.53}px Arial, sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(category.title, 105, ch / 2, cw - 230);
        ctx.save();
        ctx.translate(cw - 29, ch / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.font = `500 ${ch * 0.18}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(category.code, 0, 0);
        ctx.restore();
      },
    );
    if (print.plane) print.plane.position.set(-0.022, 0, 0.124);
  });
  fasteners(structuralScrews, floorRoot, 'structural');

  // A separate raked terminal on paired hinged struts; all components share the tilt.
  const terminalRig = new THREE.Group();
  terminalRig.name = prefix + 'terminal-floor-rig';
  terminalRig.scale.setScalar(0.85);
  floorRoot.add(terminalRig);
  const terminal = new THREE.Group();
  terminal.name = prefix + 'raked-terminal';
  terminal.position.set(0, 0.435, 0.04);
  terminal.rotation.x = -0.55;
  terminalRig.add(terminal);
  box(
    2.64,
    0.735,
    0.16,
    m.graphite,
    0,
    0,
    0,
    terminal,
    0.059,
    'terminal-solid-enclosure',
  );
  box(
    2.53,
    0.635,
    0.026,
    m.recess,
    0,
    0,
    0.085,
    terminal,
    0.038,
    'terminal-rebate',
  );
  const bezel = ring(
    2.57,
    0.668,
    2.397,
    0.51,
    0.039,
    m.edge,
    terminal,
    'terminal-machined-bezel',
  );
  bezel.position.z = 0.091;
  box(
    2.421,
    0.535,
    0.025,
    m.rubber,
    0,
    0,
    0.105,
    terminal,
    0.039,
    'terminal-glass-seal',
  );
  let caseCount = Math.max(0, Math.floor(options.caseCount || 0));
  const display = graphics(
    2.37,
    0.49,
    terminal,
    'terminal-screen',
    (ctx, cw, ch) => {
      const bg = ctx.createLinearGradient(0, 0, cw, ch);
      bg.addColorStop(0, '#102b43');
      bg.addColorStop(1, '#041321');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, cw, ch);
      ctx.strokeStyle = '#b9d7e7';
      icon(ctx, 'folder', 90, 110, 77);
      ctx.fillStyle = '#e2ebed';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.font = '600 70px Arial, sans-serif';
      ctx.fillText('All case studies', 170, 114, 1030);
      ctx.textAlign = 'right';
      ctx.font = '500 65px Arial, sans-serif';
      ctx.fillText(String(caseCount).padStart(2, '0'), cw - 65, 114, 220);
      ctx.strokeStyle = '#38596d';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(67, 175);
      ctx.lineTo(cw - 67, 175);
      ctx.stroke();
      ctx.textAlign = 'left';
      ctx.fillStyle = '#a8becb';
      ctx.font = '400 32px Arial, sans-serif';
      ctx.fillText('Ideas. Systems. People. Progress.', 170, 224, 1100);
      ctx.fillStyle = '#7a98a9';
      ctx.font = '500 17px monospace';
      ctx.fillText('ARCHIVE INDEX  /  FLIGHT RECORDS', 67, ch - 30);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#d6b271';
      ctx.fillText('LIBRARY ONLINE', cw - 67, ch - 30);
    },
    true,
  );
  if (display.plane) display.plane.position.z = 0.121;
  fasteners(
    [
      [-1.247, -0.299, 0.11],
      [1.247, -0.299, 0.11],
      [-1.247, 0.299, 0.11],
      [1.247, 0.299, 0.11],
    ],
    terminal,
    'terminal-bezel',
  );
  for (const side of [-1, 1]) {
    // Side handles stand proud of the screen; their shoes are fastened into the chassis.
    for (const yy of [-0.238, 0.238]) {
      box(
        0.079,
        0.078,
        0.12,
        m.graphite,
        side * 1.289,
        yy,
        0.098,
        terminal,
        0.018,
        'terminal-handle-shoe',
      );
      cylinder(
        0.024,
        0.027,
        m.alloy,
        side * 1.289,
        yy,
        0.159,
        terminal,
        'z',
        'handle-pin',
      );
    }
    rod(
      [side * 1.289, -0.24, 0.163],
      [side * 1.289, 0.24, 0.163],
      0.021,
      m.amber,
      terminal,
      'terminal-amber-handle',
    );
    // At the floor, solid feet overlap both the knee and the two support members.
    const x = side * 1.24;
    box(
      0.22,
      0.033,
      0.43,
      m.rubber,
      x,
      0.016,
      0.011,
      terminalRig,
      0.013,
      'terminal-isolator',
    );
    box(
      0.19,
      0.072,
      0.34,
      m.edge,
      x,
      0.061,
      0.012,
      terminalRig,
      0.019,
      'terminal-foot',
    );
    rod(
      [x, 0.071, 0.12],
      [x, 0.287, 0.178],
      0.042,
      m.graphite,
      terminalRig,
      'terminal-front-strut',
    );
    rod(
      [x, 0.074, -0.1],
      [x, 0.569, -0.094],
      0.034,
      m.edge,
      terminalRig,
      'terminal-rear-strut',
    );
    cylinder(
      0.065,
      0.135,
      m.graphite,
      x,
      0.285,
      0.172,
      terminalRig,
      'x',
      'terminal-hinge-housing',
    );
    cylinder(
      0.043,
      0.145,
      m.alloy,
      x,
      0.285,
      0.172,
      terminalRig,
      'x',
      'terminal-hinge-pin',
    );
    cylinder(
      0.024,
      0.149,
      m.amber,
      x,
      0.285,
      0.172,
      terminalRig,
      'x',
      'terminal-hinge-cap',
    );
    box(
      0.13,
      0.12,
      0.2,
      m.graphite,
      x,
      0.574,
      -0.078,
      terminalRig,
      0.022,
      'terminal-rear-saddle',
    );
  }
  // A solid satin edge guard protects the tilted terminal's lower casing.
  box(
    2.25,
    0.054,
    0.115,
    m.edge,
    0,
    -0.363,
    -0.018,
    terminal,
    0.015,
    'terminal-lower-edge-guard',
  );
  const cable = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.96 * 0.85, 0.38 * 0.85, -0.035 * 0.85),
    new THREE.Vector3(0.97 * 0.85, 0.31 * 0.85, -0.34 * 0.85),
    new THREE.Vector3(1.04, 0.43, -0.7),
    new THREE.Vector3(1.12, 0.69, -0.87),
    new THREE.Vector3(1.12, 0.84, -0.87),
  ]);
  h.mesh(
    new THREE.TubeGeometry(cable, 32, 0.026, 10, false),
    m.rubber,
    floorRoot,
    prefix + 'terminal-service-loom',
  );
  box(
    0.15,
    0.15,
    0.1,
    m.graphite,
    1.12,
    0.77,
    -0.877,
    floorRoot,
    0.02,
    'loom-rack-junction',
  );
  cylinder(
    0.039,
    0.082,
    m.edge,
    1.12,
    0.697,
    -0.87,
    floorRoot,
    'y',
    'loom-coupling',
  );
  for (const yy of [0.7])
    box(
      0.068,
      0.04,
      0.077,
      m.edge,
      1.1,
      yy,
      -0.842,
      floorRoot,
      0.01,
      'loom-clip',
    );

  floorRoot.userData.archive = {
    cartridgeCount: 5,
    terminalTilt: -0.55,
    static: true,
    categoryLabels: categories.map((c) => c.title),
  };
  return {
    setCaseCount: (count: number) => {
      caseCount = Math.max(0, Math.floor(Number.isFinite(count) ? count : 0));
      display.repaint();
    },
  };
}
