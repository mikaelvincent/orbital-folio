import { buildContactAudio } from './contact-flight-audio.ts';

/** Static, floor-referenced Contact furnishings. No camera, input or animation state. */
export function buildContactFlightConsole(
  THREE: any,
  h: any,
  parent: any,
  options: { title?: string; accent?: any } = {},
) {
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
    value.name = `contact-flight-${name}`;
    value.userData.highlightScale = 0.018;
    return value;
  };
  const m = {
    shell: material('enamel', 0xe0d8c7, 0.46, 0.08),
    face: material('graphite', 0x263342, 0.63, 0.12),
    dark: material('recess', 0x101a23, 0.75, 0.05),
    rubber: material('elastomer', 0x172128, 0.88),
    metal: material('satin-alloy', 0x8d989a, 0.4, 0.65),
    accent: material(
      'amber',
      options.accent?.color?.getHex() ?? 0xe79625,
      0.37,
      0.15,
    ),
    ink: material('markings', 0xc3cfcf, 0.85),
    led: material('indicator', 0xeabd65, 0.4),
  };
  m.led.emissive.set(0xe0a344);
  m.led.emissiveIntensity = 0.12;
  const box = (
    w: number,
    height: number,
    d: number,
    mat: any,
    x: number,
    y: number,
    z: number,
    into = parent,
    r = 0.025,
    name = 'part',
  ) => h.box(w, height, d, mat, x, y, z, into, r, `contact-flight-${name}`);
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const screwGeometry = new THREE.CylinderGeometry(0.014, 0.014, 0.005, 12);
  screwGeometry.rotateX(Math.PI / 2);
  const fasteners = (points: number[][], into: any, name: string) => {
    h.instances(
      screwGeometry,
      m.metal,
      points.map((p) => ({ p })),
      into,
      `contact-flight-${name}-fasteners`,
    );
    h.instances(
      unitBox,
      m.dark,
      points.map(([x, y, z]) => ({
        p: [x, y, z + 0.003],
        s: [0.014, 0.0035, 0.0015],
      })),
      into,
      `contact-flight-${name}-screw-slots`,
    );
  };

  // Feet touch the existing cabin floor; no new floor, wall panel or cover slab.
  for (const side of [-1, 1]) {
    const x = side * 1.12;
    box(
      0.29,
      0.035,
      0.52,
      m.rubber,
      x,
      0.017,
      -0.15,
      parent,
      0.015,
      'isolator-foot',
    );
    box(
      0.27,
      0.065,
      0.48,
      m.shell,
      x,
      0.053,
      -0.15,
      parent,
      0.03,
      'anchored-foot',
    );
    box(
      0.17,
      0.75,
      0.33,
      m.face,
      x,
      0.43,
      -0.15,
      parent,
      0.022,
      'console-stanchion',
    );
    box(
      0.1,
      0.48,
      0.014,
      m.dark,
      x,
      0.43,
      0.022,
      parent,
      0.024,
      'stanchion-recess',
    );
    box(0.23, 0.09, 0.4, m.metal, x, 0.773, -0.15, parent, 0.018, 'deck-mount');
    // Rear braces end at a mounting shoe on the plain pressure wall.
    box(0.19, 0.28, 0.07, m.face, x, 0.66, -0.947, parent, 0.025, 'wall-mount');
    h.rod([x, 0.28, -0.27], [x, 0.735, -0.92], 0.035, m.face, parent).name =
      'contact-flight-diagonal-brace';
    box(
      0.18,
      0.15,
      0.13,
      m.face,
      x,
      0.79,
      -0.88,
      parent,
      0.02,
      'rear-deck-bracket',
    );
    fasteners(
      [
        [x, 0.15, 0.023],
        [x, 0.7, 0.023],
        [x, 0.63, -0.908],
      ],
      parent,
      'structural',
    );
  }
  box(2.3, 0.08, 0.16, m.face, 0, 0.7, -0.63, parent, 0.018, 'crossmember');
  box(
    3.12,
    0.2,
    1.28,
    m.shell,
    0,
    0.84,
    -0.23,
    parent,
    0.095,
    'continuous-console-shell',
  );
  box(2.98, 0.025, 1.14, m.dark, 0, 0.938, -0.23, parent, 0.012, 'deck-seal');
  box(2.93, 0.026, 1.1, m.face, 0, 0.958, -0.23, parent, 0.012, 'working-deck');
  // A restrained, attached handhold continues the vessel's amber hardware family.
  h.rod(
    [-1.0, 0.827, 0.478],
    [1.0, 0.827, 0.478],
    0.031,
    m.accent,
    parent,
  ).name = 'contact-flight-front-handhold';
  for (const side of [-1, 1]) {
    box(
      0.125,
      0.2,
      0.22,
      m.face,
      side * 1.02,
      0.842,
      0.397,
      parent,
      0.035,
      'handhold-saddle',
    );
    box(
      0.11,
      0.028,
      0.24,
      m.rubber,
      side * 1.02,
      0.735,
      0.37,
      parent,
      0.013,
      'handhold-isolator',
    );
  }
  // Under-console service enclosure sits on the frame; its socket rail terminates wiring.
  box(
    1.25,
    0.27,
    0.24,
    m.face,
    0,
    0.658,
    -0.73,
    parent,
    0.035,
    'service-enclosure',
  );
  box(
    1.17,
    0.215,
    0.021,
    m.shell,
    0,
    0.658,
    -0.601,
    parent,
    0.024,
    'service-cover',
  );
  fasteners(
    [
      [-0.52, 0.6, -0.586],
      [0.52, 0.6, -0.586],
    ],
    parent,
    'service-cover',
  );
  const vents = Array.from({ length: 9 }, (_, i) => ({
    p: [-0.28 + i * 0.07, 0.697, -0.588],
    s: [0.035, 0.005, 0.003],
  }));
  h.instances(unitBox, m.dark, vents, parent, 'contact-flight-service-vents');

  const screen = (
    kind: 'contact' | 'link' | 'signal',
    w: number,
    height: number,
  ) => {
    const mat = material(`screen-${kind}`, 0x0b2136, 0.57, 0.02);
    mat.emissive.set(0x40759a);
    mat.emissiveIntensity = 0.5;
    mat.envMapIntensity = 0.06;
    mat.roughness = 0.76;
    if (typeof document === 'undefined') return mat;
    const canvas = document.createElement('canvas');
    canvas.width = kind === 'contact' ? 1024 : 512;
    canvas.height = kind === 'contact' ? 1024 : 768;
    const ctx = canvas.getContext('2d');
    if (!ctx) return mat;
    const cw = canvas.width,
      ch = canvas.height;
    const gradient = ctx.createLinearGradient(0, 0, cw, ch);
    gradient.addColorStop(0, '#102b46');
    gradient.addColorStop(1, '#041326');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, cw, ch);
    // Real display graphics, never a rendered photograph standing in for geometry.
    ctx.strokeStyle = '#4d6b80';
    ctx.lineWidth = 2;
    ctx.fillStyle = '#dfe9e9';
    ctx.textBaseline = 'middle';
    if (kind === 'contact') {
      ctx.font = '500 24px sans-serif';
      ctx.fillStyle = '#95b2c1';
      ctx.fillText('COMMUNICATIONS', 67, 61);
      ctx.fillStyle = '#e4eceb';
      ctx.font = '600 92px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText((options.title || 'Contact').toUpperCase(), 512, 180, 870);
      ctx.font = '400 34px sans-serif';
      ctx.fillStyle = '#bacdda';
      ctx.fillText('Start a conversation', 512, 257);
      ctx.beginPath();
      ctx.moveTo(68, 304);
      ctx.lineTo(955, 304);
      ctx.stroke();
      // The existing native action remains in the lower center. No fake form fields.
      ctx.strokeStyle = '#739fba';
      ctx.lineWidth = 4;
      const cx = 512,
        cy = 443;
      for (const radius of [58, 107, 157]) {
        ctx.beginPath();
        ctx.arc(cx, cy, radius, -2.48, -0.66);
        ctx.stroke();
      }
      ctx.fillStyle = '#e8b65f';
      ctx.beginPath();
      ctx.arc(cx, cy, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#4d6b80';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(68, 697);
      ctx.lineTo(955, 697);
      ctx.stroke();
      ctx.fillStyle = '#94b1c1';
      ctx.font = '500 21px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('COM / 04', 69, 733);
      ctx.textAlign = 'right';
      ctx.fillText('STANDBY', 952, 733);
    } else {
      ctx.fillStyle = '#dce5e6';
      ctx.font = '500 40px sans-serif';
      ctx.fillText(kind === 'link' ? 'LINK STATUS' : 'SIGNAL', 40, 75);
      ctx.strokeStyle = '#3e627a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(40, 123);
      ctx.lineTo(472, 123);
      ctx.stroke();
      if (kind === 'link') {
        ctx.strokeStyle = '#6998b6';
        for (const radius of [55, 111, 166]) {
          ctx.beginPath();
          ctx.arc(250, 345, radius, -2.75, 2.75);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(250, 345);
        ctx.lineTo(341, 233);
        ctx.stroke();
        ctx.fillStyle = '#89b9d2';
        ctx.beginPath();
        ctx.arc(250, 345, 20, 0, Math.PI * 2);
        ctx.fill();
        for (const [i, label] of ['UPLINK', 'RELAY', 'STANDBY'].entries()) {
          ctx.fillStyle = i === 0 ? '#a9bfba' : '#6b8496';
          ctx.beginPath();
          ctx.arc(65, 580 + i * 57, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#b4c7d1';
          ctx.font = '24px monospace';
          ctx.fillText(label, 92, 580 + i * 57);
        }
      } else {
        ctx.strokeStyle = '#294b65';
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.moveTo(44, 206 + 59 * i);
          ctx.lineTo(471, 206 + 59 * i);
          ctx.stroke();
        }
        ctx.strokeStyle = '#83bad1';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i <= 200; i++) {
          const x = 45 + i * 2.12,
            y = 325 + Math.sin(i * 0.123) * (28 + 14 * Math.cos(i * 0.07));
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.fillStyle = '#abc5d2';
        ctx.font = '24px monospace';
        ctx.fillText('RECEIVE', 45, 557);
        ctx.fillText('TRANSMIT', 45, 655);
        for (let row = 0; row < 2; row++)
          for (let col = 0; col < 11; col++) {
            ctx.fillStyle = col < (row ? 6 : 9) ? '#7d9caa' : '#2d4558';
            ctx.fillRect(45 + col * 37, 581 + row * 98, 25, 15);
          }
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.name = `contact-flight-${kind}-display`;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    mat.map = texture;
    mat.emissiveMap = texture;
    mat.color.set(0xffffff);
    mat.emissive.set(0xb0d0e6);
    mat.userData.displaySize = [w, height];
    return mat;
  };

  const display = (
    kind: 'contact' | 'link' | 'signal',
    x: number,
    y: number,
    w: number,
    height: number,
    yaw: number,
  ) => {
    const mount = new THREE.Group();
    mount.name = `contact-flight-${kind}-display-assembly`;
    mount.position.set(x, y, kind === 'contact' ? -0.68 : -0.61);
    mount.rotation.y = yaw;
    parent.add(mount);
    box(w, height, 0.18, m.shell, 0, 0, 0, mount, 0.065, `${kind}-bezel`);
    box(
      kind === 'contact' ? w - 0.244 : w - 0.085,
      height - 0.09,
      0.027,
      m.face,
      0,
      0,
      0.095,
      mount,
      0.012,
      `${kind}-display-rebate`,
    );
    const sw = w - (kind === 'contact' ? 0.3 : 0.1),
      sh = height - 0.15;
    box(
      sw + 0.027,
      sh + 0.027,
      0.025,
      m.rubber,
      0,
      0,
      0.117,
      mount,
      0.012,
      `${kind}-display-seal`,
    );
    const glassOutline = new THREE.Shape();
    const gx = -sw / 2,
      gy = -sh / 2,
      gr = 0.035;
    glassOutline.moveTo(gx + gr, gy);
    glassOutline.lineTo(gx + sw - gr, gy);
    glassOutline.quadraticCurveTo(gx + sw, gy, gx + sw, gy + gr);
    glassOutline.lineTo(gx + sw, gy + sh - gr);
    glassOutline.quadraticCurveTo(gx + sw, gy + sh, gx + sw - gr, gy + sh);
    glassOutline.lineTo(gx + gr, gy + sh);
    glassOutline.quadraticCurveTo(gx, gy + sh, gx, gy + sh - gr);
    glassOutline.lineTo(gx, gy + gr);
    glassOutline.quadraticCurveTo(gx, gy, gx + gr, gy);
    const glassGeometry = new THREE.ShapeGeometry(glassOutline, 10);
    const gp = glassGeometry.attributes.position,
      guv = glassGeometry.attributes.uv;
    for (let i = 0; i < gp.count; i++)
      guv.setXY(i, gp.getX(i) / sw + 0.5, gp.getY(i) / sh + 0.5);
    const face = h.mesh(
      glassGeometry,
      screen(kind, sw, sh),
      mount,
      `contact-flight-${kind}-screen-glass`,
    );
    face.position.z = 0.132;
    face.castShadow = false;
    // Screens have their own opaque, inset plane; bezel faces cannot z-fight with it.
    if (kind === 'contact') {
      for (const side of [-1, 1]) {
        for (let row = 0; row < 5; row++) {
          const yy = 0.37 - row * 0.165;
          box(
            0.075,
            0.105,
            0.028,
            row === 2 && side === -1 ? m.accent : m.face,
            side * (w / 2 - 0.083),
            yy,
            0.127,
            mount,
            0.012,
            'display-function-key',
          );
          box(
            0.026,
            0.004,
            0.002,
            m.ink,
            side * (w / 2 - 0.083),
            yy,
            0.143,
            mount,
            0.001,
            'display-key-mark',
          );
        }
      }
      fasteners(
        [
          [-w / 2 + 0.06, -height / 2 + 0.07, 0.094],
          [w / 2 - 0.06, -height / 2 + 0.07, 0.094],
          [-w / 2 + 0.06, height / 2 - 0.07, 0.094],
          [w / 2 - 0.06, height / 2 - 0.07, 0.094],
        ],
        mount,
        'display-bezel',
      );
    }
    // Vertical mounting rails reach both the wall shoe and the enclosure rear.
    const bottom = y - height / 2;
    for (const side of kind === 'contact' ? [-1, 1] : [0]) {
      const xx = x + side * w * 0.3;
      box(
        0.082,
        height + 0.13,
        0.064,
        m.face,
        xx,
        y,
        -0.93,
        parent,
        0.012,
        `${kind}-mounting-rail`,
      );
      for (const yy of [y - height * 0.27, y + height * 0.32]) {
        box(
          0.13,
          0.16,
          0.12,
          m.face,
          xx,
          yy,
          -0.93,
          parent,
          0.015,
          `${kind}-wall-shoe`,
        );
        box(
          0.085,
          0.07,
          kind === 'contact' ? 0.19 : 0.3,
          m.metal,
          xx,
          yy,
          kind === 'contact' ? -0.83 : -0.79,
          parent,
          0.014,
          `${kind}-display-standoff`,
        );
      }
      box(
        0.1,
        Math.max(0.12, bottom - 0.88),
        0.12,
        m.shell,
        xx,
        (bottom + 0.9) / 2,
        -0.68,
        parent,
        0.022,
        `${kind}-display-heel`,
      );
    }
  };
  display('contact', 0, 1.77, 1.63, 1.49, 0);
  display('link', -1.158, 1.49, 0.65, 0.92, 0.12);
  display('signal', 1.158, 1.49, 0.65, 0.92, -0.12);

  // Center controls share a shallow inclined, solid-backed equipment cassette.
  const wedge = new THREE.Shape();
  wedge.moveTo(-0.275, -0.007);
  wedge.lineTo(0.275, -0.007);
  wedge.lineTo(0.275, 0.193);
  wedge.lineTo(-0.275, -0.005);
  wedge.closePath();
  const wedgeGeo = new THREE.ExtrudeGeometry(wedge, {
    depth: 2.05,
    bevelEnabled: false,
    curveSegments: 1,
  });
  wedgeGeo.rotateY(Math.PI / 2);
  wedgeGeo.translate(-1.025, 0.944, 0.03);
  h.mesh(wedgeGeo, m.shell, parent, 'contact-flight-solid-control-wedge');
  const deck = new THREE.Group();
  deck.name = 'contact-flight-inclined-control-deck';
  deck.position.set(0, 1.047, 0.03);
  deck.rotation.x = -Math.PI / 2 + 0.36;
  parent.add(deck);
  box(2.0, 0.525, 0.025, m.dark, 0, 0, 0, deck, 0.012, 'control-panel-gasket');
  box(1.966, 0.493, 0.025, m.face, 0, 0, 0.018, deck, 0.011, 'control-panel');
  fasteners(
    [
      [-0.94, -0.206, 0.034],
      [0.94, -0.206, 0.034],
      [-0.94, 0.206, 0.034],
      [0.94, 0.206, 0.034],
    ],
    deck,
    'control-panel',
  );
  box(0.72, 0.345, 0.02, m.dark, -0.025, 0, 0.037, deck, 0.01, 'keypad-recess');
  const keys: { p: number[]; s: number[] }[] = [];
  const keyMarks: { p: number[]; s: number[] }[] = [];
  for (let row = 0; row < 4; row++)
    for (let col = 0; col < 10; col++) {
      const x = -0.335 + col * 0.069,
        y = 0.126 - row * 0.081;
      if (!(row === 3 && col === 0))
        keys.push({ p: [x, y, 0.061], s: [0.057, 0.062, 0.026] });
      keyMarks.push({ p: [x, y + 0.009, 0.075], s: [0.012, 0.004, 0.0015] });
    }
  h.instances(unitBox, m.face, keys, deck, 'contact-flight-keycaps');
  h.instances(unitBox, m.ink, keyMarks, deck, 'contact-flight-key-legends');
  box(
    0.057,
    0.062,
    0.03,
    m.accent,
    -0.335,
    -0.117,
    0.061,
    deck,
    0.007,
    'keypad-confirm-key',
  );
  box(
    0.46,
    0.345,
    0.018,
    m.dark,
    -0.671,
    0,
    0.036,
    deck,
    0.009,
    'switch-recess',
  );
  // Guarded power rocker and four toggle switches. Each terminates in a threaded collar.
  box(
    0.08,
    0.16,
    0.027,
    m.face,
    -0.804,
    0,
    0.057,
    deck,
    0.009,
    'power-switch-base',
  );
  box(
    0.045,
    0.085,
    0.04,
    m.accent,
    -0.804,
    0,
    0.086,
    deck,
    0.008,
    'power-rocker',
  );
  for (const x of [-0.859, -0.749])
    box(
      0.017,
      0.198,
      0.086,
      m.accent,
      x,
      0,
      0.082,
      deck,
      0.008,
      'switch-guard',
    );
  for (const x of [-0.62, -0.51])
    for (const y of [-0.083, 0.083]) {
      h.cylinder(0.022, 0.012, m.metal, x, y, 0.057, deck, 'z');
      h.rod([x, y, 0.065], [x, y + 0.017, 0.126], 0.006, m.metal, deck).name =
        'contact-flight-toggle';
      box(
        0.016,
        0.02,
        0.023,
        m.rubber,
        x,
        y + 0.017,
        0.127,
        deck,
        0.008,
        'toggle-cap',
      );
    }
  box(
    0.46,
    0.345,
    0.018,
    m.dark,
    0.659,
    0,
    0.036,
    deck,
    0.009,
    'encoder-recess',
  );
  for (const x of [0.54, 0.77]) {
    h.cylinder(0.071, 0.014, m.accent, x, 0.055, 0.056, deck, 'z');
    h.cylinder(0.06, 0.07, m.face, x, 0.055, 0.096, deck, 'z');
    h.cylinder(0.048, 0.006, m.metal, x, 0.055, 0.134, deck, 'z');
    const ribs = Array.from({ length: 20 }, (_, i) => {
      const a = (i * Math.PI) / 10;
      return {
        p: [x + Math.cos(a) * 0.059, 0.055 + Math.sin(a) * 0.059, 0.096],
        s: [0.004, 0.004, 0.054],
      };
    });
    h.instances(unitBox, m.metal, ribs, deck, 'contact-flight-encoder-flutes');
    box(
      0.023,
      0.004,
      0.003,
      m.dark,
      x,
      0.077,
      0.139,
      deck,
      0.001,
      'encoder-index',
    );
    box(
      0.086,
      0.05,
      0.025,
      m.face,
      x,
      -0.103,
      0.056,
      deck,
      0.008,
      'encoder-function-key',
    );
    box(
      0.018,
      0.003,
      0.002,
      m.ink,
      x,
      -0.099,
      0.07,
      deck,
      0.001,
      'encoder-key-mark',
    );
  }
  // Broad deck hardware reads in the overview; small fittings reward a close view.
  const deckFixings = new THREE.Group();
  deckFixings.rotation.x = -Math.PI / 2;
  deckFixings.position.y = 0.975;
  parent.add(deckFixings);
  fasteners(
    [
      [-1.4, -0.26, 0],
      [1.4, -0.26, 0],
      [-1.4, 0.71, 0],
      [1.4, 0.71, 0],
      [-0.99, 0.69, 0],
      [0.99, 0.69, 0],
    ],
    deckFixings,
    'deck',
  );
  const deckVentHoles = [];
  for (const side of [-1, 1])
    for (let row = -2; row <= 2; row++)
      for (let col = -2; col <= 2; col++) {
        if (row * row + col * col > 6) continue;
        deckVentHoles.push({
          p: [side * 1.235 + col * 0.023, 0.974, -0.395 + row * 0.023],
          r: [-Math.PI / 2, 0, 0],
        });
      }
  h.instances(
    new THREE.CircleGeometry(0.005, 8),
    m.dark,
    deckVentHoles,
    parent,
    'contact-flight-deck-vent-perforations',
  );
  const audio = buildContactAudio(THREE, h, parent, m);
  // The outboard dock keeps the upper signal trace visible from the fixed camera.
  audio.headset.position.x += 0.1;
  audio.headset.scale.setScalar(0.9);
  return m;
}
