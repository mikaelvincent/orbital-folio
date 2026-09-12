/** Static wall-mounted equipment. Local XY follows the wall; +Z faces the cabin. */
export function buildOutboardWallEquipment(
  THREE: any,
  h: any,
  root: any,
  kind: 'communications' | 'recorder',
) {
  const prefix = `outboard-${kind}-`;
  const material = (
    name: string,
    color: number,
    roughness = 0.64,
    metalness = 0.1,
  ) => {
    const value = new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
    });
    value.name = prefix + name;
    value.userData.highlightScale = 0.018;
    return value;
  };
  const m = {
    ivory: material('enamel', 0xdfd6c5, 0.5),
    dark: material('graphite', 0x263440),
    rubber: material('elastomer', 0x121e27, 0.9, 0),
    alloy: material('brushed-alloy', 0x879396, 0.44, 0.55),
    amber: material('amber', 0xe79625, 0.43),
    light: material('diffuser', 0xf1d8a6, 0.65, 0),
    glass: material('instrument-glass', 0x0e2533, 0.4, 0),
    cyan: material('instrument-phosphor', 0x95c4cc, 0.8, 0),
  };
  m.light.emissive.set(0xe5b45f);
  m.light.emissiveIntensity = 0.27;
  m.cyan.emissive.set(0x72a9b5);
  m.cyan.emissiveIntensity = 0.15;
  const box = (
    w: number,
    ht: number,
    d: number,
    mat: any,
    x: number,
    y: number,
    z: number,
    name: string,
    radius = 0.014,
  ) => h.box(w, ht, d, mat, x, y, z, root, radius, prefix + name);
  const pin = (
    radius: number,
    depth: number,
    mat: any,
    x: number,
    y: number,
    z: number,
    name: string,
  ) => {
    const part = h.cylinder(radius, depth, mat, x, y, z, root, 'z', radius, 20);
    part.name = prefix + name;
    return part;
  };
  const fasteners: number[][] = [];
  const label = (
    text: string,
    w: number,
    height: number,
    x: number,
    y: number,
    z: number,
    dark = false,
  ) => {
    if (typeof document === 'undefined') return;
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = Math.max(96, Math.round((1024 * height) / w));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = dark ? '#d5dedb' : '#202f39';
    ctx.font = `600 ${canvas.height * 0.66}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      text,
      canvas.width / 2,
      canvas.height * 0.53,
      canvas.width * 0.94,
    );
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    const ink = material('stencil-' + text, 0xffffff, 1, 0);
    ink.map = texture;
    ink.transparent = true;
    ink.depthWrite = false;
    const plane = h.mesh(
      new THREE.PlaneGeometry(w, height),
      ink,
      root,
      prefix + 'stencil-' + text,
    );
    plane.position.set(x, y, z);
    plane.castShadow = false;
  };

  // Four feet touch the pressure wall; separated rails avoid an extra wall skin.
  for (const x of [-0.56, 0.56]) {
    for (const y of [-0.76, 0.78]) {
      box(0.15, 0.16, 0.016, m.rubber, x, y, 0.008, 'wall-foot');
      box(0.12, 0.12, 0.034, m.alloy, x, y, 0.027, 'mounting-shoe');
      fasteners.push([x, y, 0.047]);
    }
    box(0.068, 1.62, 0.045, m.dark, x, 0.01, 0.047, 'equipment-rail');
  }
  if (kind === 'communications') {
    // Two replaceable radio trays, with guarded selectors and captive handles.
    for (const [index, y] of [0.53, 0.12].entries()) {
      box(1.08, 0.36, 0.085, m.rubber, 0, y, 0.062, 'radio-isolation-gasket');
      box(1.04, 0.32, 0.075, m.ivory, 0, y, 0.085, 'radio-chassis');
      box(0.68, 0.21, 0.012, m.dark, -0.09, y, 0.128, 'instrument-bezel');
      box(
        0.625,
        0.16,
        0.006,
        m.glass,
        -0.09,
        y,
        0.137,
        'instrument-face',
        0.009,
      );
      label(
        index === 0 ? 'UPLINK' : 'VOICE',
        0.32,
        0.041,
        -0.2,
        y + 0.04,
        0.141,
        true,
      );
      // Static meter segments convey equipment function without competing CTAs.
      for (let j = 0; j < 12; j++) {
        box(
          0.024,
          0.024 + (j % 4) * 0.008,
          0.003,
          j < 9 ? m.cyan : m.dark,
          -0.348 + j * 0.043,
          y - 0.042,
          0.142,
          'meter-segment',
          0.001,
        );
      }
      pin(0.067, 0.009, m.rubber, 0.378, y - 0.008, 0.127, 'selector-recess');
      pin(0.046, 0.029, m.alloy, 0.378, y - 0.008, 0.147, 'selector');
      box(
        0.01,
        0.04,
        0.004,
        m.amber,
        0.378,
        y + 0.006,
        0.164,
        'selector-index',
        0.002,
      );
      for (const side of [-1, 1]) {
        box(0.024, 0.22, 0.034, m.dark, side * 0.477, y, 0.13, 'tray-pull');
        fasteners.push([side * 0.49, y + 0.133, 0.125]);
      }
    }
    // Clamped cable looms join the radio tray to the lower distribution block.
    box(0.97, 0.29, 0.075, m.dark, 0, -0.55, 0.064, 'distribution-enclosure');
    box(0.88, 0.2, 0.015, m.rubber, 0, -0.55, 0.109, 'connector-panel');
    for (const x of [-0.28, 0, 0.28]) {
      pin(0.065, 0.018, m.alloy, x, -0.55, 0.122, 'bayonet-socket-ring');
      pin(0.049, 0.026, m.dark, x, -0.55, 0.136, 'sealed-connector-cap');
      box(
        0.062,
        0.015,
        0.016,
        m.amber,
        x,
        -0.55,
        0.155,
        'cap-locking-bar',
        0.004,
      );
    }
    for (const y of [-0.11, -0.365])
      box(
        1.09,
        0.041,
        0.045,
        m.dark,
        0,
        y,
        0.047,
        'cable-support-crossmember',
        0.006,
      );
    for (const x of [-0.35, 0, 0.35]) {
      box(
        0.043,
        0.052,
        0.036,
        m.rubber,
        x,
        -0.064,
        0.08,
        'radio-strain-relief',
        0.006,
      );
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(x, -0.06, 0.078),
        new THREE.Vector3(x, -0.16, 0.098),
        new THREE.Vector3(x + 0.045, -0.28, 0.097),
        new THREE.Vector3(x, -0.405, 0.082),
      ]);
      h.mesh(
        new THREE.TubeGeometry(curve, 24, 0.012, 8, false),
        m.rubber,
        root,
        prefix + 'retained-cable-loom',
      );
      for (const y of [-0.11, -0.365]) {
        box(0.048, 0.038, 0.031, m.alloy, x, y, 0.079, 'cable-clamp', 0.006);
        box(0.052, 0.017, 0.014, m.amber, x, y, 0.099, 'clamp-index', 0.002);
      }
    }
    // Ventilation belongs to the enclosure, with a narrow service-light canopy.
    for (let i = 0; i < 9; i++)
      box(
        0.064,
        0.014,
        0.009,
        m.rubber,
        -0.344 + i * 0.086,
        -0.636,
        0.121,
        'return-vent',
        0.002,
      );
  } else {
    // Two individually restrained media sleds; different silhouette from radios.
    box(1.08, 0.91, 0.075, m.dark, 0, 0.3, 0.06, 'storage-cradle');
    for (const [index, x] of [-0.26, 0.26].entries()) {
      box(0.455, 0.79, 0.025, m.rubber, x, 0.31, 0.11, 'sled-isolator');
      box(0.405, 0.73, 0.073, m.ivory, x, 0.31, 0.129, 'media-sled', 0.035);
      box(0.28, 0.21, 0.006, m.dark, x, 0.455, 0.169, 'sled-label');
      label(`0${index + 1}`, 0.2, 0.093, x, 0.469, 0.174, true);
      label(
        index === 0 ? 'FLIGHT LOGS' : 'FIELD DATA',
        0.29,
        0.039,
        x,
        0.29,
        0.17,
      );
      // A rigid bridge with locking buckle captures each cartridge at its waist.
      box(0.434, 0.071, 0.035, m.dark, x, 0.09, 0.18, 'retaining-bridge');
      box(0.089, 0.081, 0.014, m.amber, x, 0.09, 0.201, 'captive-buckle');
      box(0.042, 0.04, 0.01, m.rubber, x, 0.09, 0.214, 'buckle-inset', 0.004);
      for (const sy of [-0.028, 0.657]) {
        box(0.17, 0.039, 0.035, m.alloy, x, sy, 0.175, 'sled-end-stop');
      }
    }
    // Stowed inspection leaf: hinge barrels, rubber stops and a mechanical latch.
    box(1.045, 0.47, 0.051, m.rubber, 0, -0.474, 0.045, 'stowed-tray-stop');
    box(
      1.0,
      0.43,
      0.052,
      m.ivory,
      0,
      -0.474,
      0.086,
      'folded-inspection-leaf',
      0.025,
    );
    box(0.87, 0.3, 0.014, m.dark, 0, -0.474, 0.12, 'inspection-pad');
    // Shallow ribs make a retained tool mat instead of an inactive computer.
    for (const y of [-0.39, -0.435, -0.48, -0.525, -0.57])
      box(0.74, 0.008, 0.004, m.alloy, 0, y, 0.131, 'pad-rib', 0.001);
    for (const x of [-0.37, 0.37]) {
      const hinge = h.cylinder(
        0.026,
        0.17,
        m.alloy,
        x,
        -0.711,
        0.083,
        root,
        'x',
        0.026,
        16,
      );
      hinge.name = prefix + 'tray-hinge';
      box(0.06, 0.064, 0.025, m.dark, x, -0.699, 0.033, 'hinge-wall-shoe');
    }
    box(0.12, 0.045, 0.025, m.amber, 0, -0.25, 0.135, 'tray-lock');
  }

  // Shielded warm service lamp, mounted directly to the same load rails.
  box(1.15, 0.06, 0.1, m.dark, 0, 0.797, 0.075, 'lamp-hood');
  box(0.86, 0.014, 0.027, m.light, 0, 0.766, 0.097, 'lamp-diffuser', 0.005);
  const bolt = new THREE.CylinderGeometry(0.013, 0.013, 0.004, 12);
  bolt.rotateX(Math.PI / 2);
  h.instances(
    bolt,
    m.alloy,
    fasteners.map((p) => ({ p })),
    root,
    prefix + 'captive-fasteners',
  );
  const slot = new THREE.BoxGeometry(0.015, 0.003, 0.0015);
  h.instances(
    slot,
    m.rubber,
    fasteners.map(([x, y, z]) => ({ p: [x, y, z + 0.0025] })),
    root,
    prefix + 'fastener-slots',
  );
  root.userData.equipmentKind = kind;
  // Instanced fittings bypass mesh()'s inherited flags and static batching.
  root.traverse((part: any) => {
    part.userData.excludePick = true;
  });
  return root;
}
