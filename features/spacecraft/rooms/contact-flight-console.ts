import type { SocialScreenLinks } from '../../../lib/content/social-links.ts';
import { drawSocialChannel } from './contact-social-display.ts';
import { buildContactAudio } from './contact-flight-audio.ts';
import { buildContactKeyboard } from './contact-keyboard.ts';
import { CABIN_FLOOR } from '../geometry/spacecraft-wall-layout.ts';
import { CONTACT_GRID } from './cabin-composition.ts';

/** Floor-referenced Contact furnishings and physical computer controls. Browser
 * input and camera state remain owned by the spacecraft runtime. */
export function buildContactFlightConsole(
  THREE: any,
  h: any,
  floorRoot: any,
  options: {
    title?: string;
    accent?: any;
    socials?: SocialScreenLinks;
    rearWallProfile?: Array<{ y: number; z: number }>;
  } = {},
) {
  // The console stays a rigid assembly below the room heading. Shorten its
  // stanchions while leaving the feet on the original cabin floor.
  const lowering = CONTACT_GRID.lowering;
  floorRoot.userData.socialScreens = [];
  const rearAnchors: Array<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    frontZ: number;
  }> = [];
  const parent = new THREE.Group();
  parent.name = 'contact-flight-equipment-mount';
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
      floorRoot,
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
      floorRoot,
      0.03,
      'anchored-foot',
    );
    box(
      0.17,
      0.75 - lowering,
      0.33,
      m.face,
      x,
      0.43 - lowering / 2,
      -0.15,
      floorRoot,
      0.022,
      'console-stanchion',
    );
    box(
      0.1,
      0.48 - lowering,
      0.014,
      m.dark,
      x,
      0.43 - lowering / 2,
      0.022,
      floorRoot,
      0.024,
      'stanchion-recess',
    );
    box(0.23, 0.09, 0.4, m.metal, x, 0.773, -0.15, parent, 0.018, 'deck-mount');
    // Rear braces end at a mounting shoe on the plain pressure wall.
    box(0.19, 0.28, 0.07, m.face, x, 0.66, -0.947, parent, 0.025, 'wall-mount');
    rearAnchors.push({
      id: `frame-${side}`,
      x,
      y: 0.66,
      width: 0.14,
      height: 0.23,
      frontZ: -0.98,
    });
    h.rod(
      [x, 0.28 + lowering, -0.27],
      [x, 0.735, -0.92],
      0.035,
      m.face,
      parent,
    ).name = 'contact-flight-diagonal-brace';
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
        [x, 0.15 + lowering, 0.023],
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
  // The captive cover is sealed; its existing two fixings provide access
  // without another ventilation pattern competing with the room's air returns.

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
    canvas.width = kind === 'contact' ? 1024 : 768;
    // Match the resized glass so lettering and signal arcs keep their proportions.
    canvas.height = Math.round((canvas.width * height) / w);
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
      // Static signal diagram with a separate status footer.
      ctx.strokeStyle = '#739fba';
      ctx.lineWidth = 4;
      const cx = 512,
        // The arcs extend above the signal origin; center the whole graphic
        // between the header and footer rules, including the status dot.
        cy = Math.round((304 + (ch - 125) + 157 - 13) / 2);
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
      ctx.moveTo(68, ch - 125);
      ctx.lineTo(955, ch - 125);
      ctx.stroke();
      ctx.fillStyle = '#94b1c1';
      ctx.font = '500 21px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('COM / 04', 69, ch - 89);
      ctx.textAlign = 'right';
      ctx.fillText('STANDBY', 952, ch - 89);
    } else {
      const side = kind === 'link' ? 'left' : 'right';
      drawSocialChannel(ctx, cw, ch, options.socials?.[side] || null, side);
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
    mount.userData.excludePick = kind !== 'contact';
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
    // Preserve this group through static batching so the idle graphics can be
    // hidden behind the active HTML application without swapping cloned materials.
    const idleDisplay = new THREE.Group();
    idleDisplay.name = `contact-flight-${kind}-idle-display`;
    if (kind === 'contact') idleDisplay.userData.animated = true;
    mount.add(idleDisplay);
    const face = h.mesh(
      glassGeometry,
      screen(kind, sw, sh),
      idleDisplay,
      `contact-flight-${kind}-screen-glass`,
    );
    face.position.z = 0.132;
    face.castShadow = false;
    if (kind === 'contact') {
      const anchor = new THREE.Object3D();
      anchor.name = 'contact-computer-application-anchor';
      anchor.position.z = 0.135;
      anchor.userData = {
        width: sw,
        height: sh,
        section: 'contact',
        kind: 'computer',
      };
      mount.add(anchor);
      floorRoot.userData.contactComputer = {
        root: mount,
        consoleRoot: floorRoot,
        anchor,
        width: sw,
        height: sh,
        idleDisplay,
        setActive(active: boolean) {
          idleDisplay.visible = !active;
        },
      };
    } else {
      const side = kind === 'link' ? 'left' : 'right';
      // A geometry-free anchor survives static mesh batching and remains fitted
      // to the actual glass at every room layout and camera angle.
      const anchor = new THREE.Object3D();
      anchor.name = `contact-social-${side}-anchor`;
      anchor.position.z = 0.134;
      mount.add(anchor);
      floorRoot.userData.socialScreens.push({
        side,
        root: mount,
        anchor,
        width: w,
        height,
        glassWidth: sw,
        glassHeight: sh,
        link: options.socials?.[side] || null,
      });
      fasteners(
        [
          [-w / 2 + 0.028, height / 2 - 0.038, 0.096],
          [w / 2 - 0.028, height / 2 - 0.038, 0.096],
          [-w / 2 + 0.028, -height / 2 + 0.038, 0.096],
          [w / 2 - 0.028, -height / 2 + 0.038, 0.096],
        ],
        mount,
        `${kind}-bezel`,
      );
    }
    // Screens have their own opaque, inset plane; bezel faces cannot z-fight with it.
    if (kind === 'contact') {
      for (const side of [-1, 1]) {
        for (let row = 0; row < 5; row++) {
          const yy = (2 - row) * 0.165;
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
        rearAnchors.push({
          id: `${kind}-${side}-${yy}`,
          x: xx,
          y: yy,
          width: 0.1,
          height: 0.13,
          frontZ: -0.988,
        });
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
  // Lift the complete monitor and its wall supports clear of the keyboard's
  // raised function row. The CSS application sits on this glass and cannot use
  // WebGL depth occlusion; genuine clearance keeps every key visible as the
  // camera hovers without shrinking the application or covering the key caps.
  display('contact', 0, CONTACT_GRID.mainY + 0.1, 1.63, 1.16, 0);
  display('link', -1.215, CONTACT_GRID.sideY, 0.72, 0.92, 0.16);
  display('signal', 1.215, CONTACT_GRID.sideY, 0.72, 0.92, -0.16);

  // A full compact keyboard replaces the old decorative keypad and toggles.
  // Its shallower slope and deeper cassette fit square keys on the original desk.
  const halfDepth = 0.375;
  const inclination = 0.22;
  const slopeHeight = 2 * halfDepth * Math.tan(inclination);
  const wedge = new THREE.Shape();
  wedge.moveTo(-halfDepth, -0.007);
  wedge.lineTo(halfDepth, -0.007);
  wedge.lineTo(halfDepth, slopeHeight);
  wedge.lineTo(-halfDepth, 0);
  wedge.closePath();
  const wedgeGeo = new THREE.ExtrudeGeometry(wedge, {
    depth: 2.05,
    bevelEnabled: false,
    curveSegments: 1,
  });
  wedgeGeo.rotateY(Math.PI / 2);
  wedgeGeo.translate(-1.025, 0.97, -0.08);
  h.mesh(wedgeGeo, m.shell, parent, 'contact-flight-solid-control-wedge');
  const deck = new THREE.Group();
  deck.name = 'contact-flight-inclined-control-deck';
  deck.position.set(0, 0.978 + slopeHeight / 2, -0.08);
  deck.rotation.x = -Math.PI / 2 + inclination;
  parent.add(deck);
  box(2.0, 0.75, 0.025, m.dark, 0, 0, 0, deck, 0.012, 'control-panel-gasket');
  box(1.966, 0.718, 0.025, m.face, 0, 0, 0.018, deck, 0.011, 'control-panel');
  fasteners(
    [
      [-0.94, -0.323, 0.034],
      [0.94, -0.323, 0.034],
      [-0.94, 0.323, 0.034],
      [0.94, 0.323, 0.034],
    ],
    deck,
    'control-panel',
  );
  const keyboard = buildContactKeyboard(THREE, h, deck, m);
  floorRoot.userData.contactComputer.keyboard = keyboard;
  floorRoot.userData.contactComputer.keyboardDeck = deck;
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
  // Flush capped attachment points let service tools be restrained to the deck.
  // Smooth concentric caps read as hardware, without a perforated face.
  for (const side of [-1, 1]) {
    const mount = h.cylinder(
      0.048,
      0.006,
      m.metal,
      side * 1.235,
      0.976,
      -0.395,
      parent,
      'y',
      0.048,
      20,
    );
    mount.name = 'contact-flight-deck-restraint-socket-ring';
    const cap = h.cylinder(
      0.033,
      0.006,
      m.face,
      side * 1.235,
      0.981,
      -0.395,
      parent,
      'y',
      0.033,
      20,
    );
    cap.name = 'contact-flight-deck-captive-socket-cap';
  }
  const audio = buildContactAudio(THREE, h, parent, m);
  // Seat the complete microphone base and cable on the working deck. Its
  // bent neck keeps the capsule clear of the left screen without overhanging
  // the desk with an unsupported foot or connector.
  audio.microphone.position.set(-1.3, 0.977, 0.06);
  // Reference the headset dock directly to the floor, independently of the
  // lowered console. It clears the right support foot and the desk underside.
  floorRoot.add(audio.headset);
  audio.headset.position.set(1.47, 0.0036, 0.035);
  audio.headset.scale.setScalar(0.72);
  // Mounting necks bridge from the unchanged equipment shoes to the actual
  // rear pressure surface. Both fixed layout variants are batched once; only
  // their visibility changes when the cabin furnishing scale changes.
  const rearProfile = options.rearWallProfile || [
    { y: -1.32, z: -1.1 },
    { y: 1.455, z: -1.1 },
  ];
  function rearZAt(y: number) {
    const zs: number[] = [];
    for (let i = 0; i + 1 < rearProfile.length; i++) {
      const a = rearProfile[i],
        b = rearProfile[i + 1];
      if (y < Math.min(a.y, b.y) - 1e-8 || y > Math.max(a.y, b.y) + 1e-8)
        continue;
      if (Math.abs(b.y - a.y) < 1e-8) zs.push(a.z, b.z);
      else zs.push(a.z + ((b.z - a.z) * (y - a.y)) / (b.y - a.y));
    }
    if (!zs.length)
      throw new Error(`Contact rear mounting height outside the cabin: ${y}`);
    return Math.min(...zs);
  }
  const rearVariants = [1, 0.84].map((propScale) => {
    const variant = new THREE.Group();
    variant.name = `contact-flight-rear-mounts-${propScale === 1 ? 'wide' : 'compact'}`;
    variant.userData.batchRoot = true;
    variant.userData.propScale = propScale;
    parent.add(variant);
    const anchors = [];
    for (const anchor of rearAnchors) {
      const bottom = anchor.y - anchor.height / 2;
      const top = anchor.y + anchor.height / 2;
      const ys = [
        bottom,
        top,
        ...rearProfile.map((p) => (p.y - CABIN_FLOOR) / propScale + lowering),
      ]
        .filter((y) => y >= bottom && y <= top)
        .sort((a, b) => a - b);
      const sampledY = ys.filter((y, i) => !i || y - ys[i - 1] > 1e-8);
      const points = sampledY.map((y) => ({
        y,
        z: rearZAt(CABIN_FLOOR + propScale * (y - lowering)) / propScale,
      }));
      const shape = new THREE.Shape();
      shape.moveTo(-anchor.frontZ, bottom);
      shape.lineTo(-anchor.frontZ, top);
      for (const point of [...points].reverse())
        shape.lineTo(-point.z, point.y);
      shape.closePath();
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: anchor.width,
        bevelEnabled: false,
        steps: 1,
      });
      geometry.rotateY(Math.PI / 2);
      geometry.translate(anchor.x - anchor.width / 2, 0, 0);
      h.mesh(
        geometry,
        m.face,
        variant,
        `contact-flight-rear-anchor-${anchor.id}`,
      );
      anchors.push({ ...anchor, points });
    }
    variant.userData.anchors = anchors;
    return variant;
  });
  floorRoot.userData.setPropScale = (propScale: number) => {
    const selected = propScale > 0.9 ? 1 : 0.84;
    for (const variant of rearVariants)
      variant.visible = variant.userData.propScale === selected;
    floorRoot.userData.rearMountScale = selected;
  };
  floorRoot.userData.setPropScale(1);
  return m;
}
