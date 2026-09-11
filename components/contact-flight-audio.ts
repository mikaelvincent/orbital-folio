/** Static, helper-built audio hardware for the Contact flight console. */
export function buildContactAudio(THREE: any, h: any, parent: any, m: any) {
  const prefix = 'contact-flight-audio-';
  const group = (name: string, into: any, x = 0, y = 0, z = 0) => {
    const result = new THREE.Group();
    result.name = prefix + name;
    result.position.set(x, y, z);
    into.add(result);
    return result;
  };
  const solid = (geometry: any, material: any, into: any, name: string) =>
    h.mesh(geometry, material, into, prefix + name);
  const block = (
    w: number,
    height: number,
    d: number,
    material: any,
    x: number,
    y: number,
    z: number,
    into: any,
    radius: number,
    name: string,
  ) => h.box(w, height, d, material, x, y, z, into, radius, prefix + name);
  const cylinder = (
    radius: number,
    length: number,
    material: any,
    x: number,
    y: number,
    z: number,
    into: any,
    axis: string,
    name: string,
    top = radius,
    segments = 16,
  ) => {
    const result = h.cylinder(
      radius,
      length,
      material,
      x,
      y,
      z,
      into,
      axis,
      top,
      segments,
    );
    result.name = prefix + name;
    return result;
  };
  const lead = (
    points: number[][],
    radius: number,
    material: any,
    into: any,
    name: string,
    segments = 32,
  ) => {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
    );
    return solid(
      new THREE.TubeGeometry(curve, segments, radius, 6, false),
      material,
      into,
      name,
    );
  };
  const fasteners = (points: number[][], into: any, name: string) => {
    h.instances(
      new THREE.CylinderGeometry(0.005, 0.005, 0.003, 8),
      m.metal,
      points.map((p) => ({ p })),
      into,
      prefix + name,
    );
  };

  const microphone = group('microphone-assembly', parent, -1.2, 0.965, 0.06);
  // The feet, mounting shell, switch, and neck socket are fitted layers.
  block(
    0.173,
    0.01,
    0.129,
    m.rubber,
    0,
    -0.001,
    0,
    microphone,
    0.005,
    'microphone-isolation-foot',
  );
  block(
    0.184,
    0.034,
    0.145,
    m.dark,
    0,
    0.019,
    0,
    microphone,
    0.012,
    'microphone-base-shell',
  );
  block(
    0.152,
    0.005,
    0.113,
    m.face,
    0,
    0.038,
    0,
    microphone,
    0.007,
    'microphone-base-inset',
  );
  block(
    0.077,
    0.009,
    0.043,
    m.rubber,
    0.018,
    0.043,
    0.027,
    microphone,
    0.004,
    'microphone-talk-switch-recess',
  );
  block(
    0.063,
    0.012,
    0.032,
    m.accent,
    0.018,
    0.05,
    0.027,
    microphone,
    0.004,
    'microphone-talk-switch',
  );
  const switchMark = solid(
    new THREE.BoxGeometry(0.024, 0.0015, 0.0025),
    m.ink,
    microphone,
    'microphone-talk-switch-mark',
  );
  switchMark.position.set(0.018, 0.0565, 0.027);
  fasteners(
    [
      [-0.065, 0.042, -0.04],
      [0.063, 0.042, -0.04],
    ],
    microphone,
    'microphone-base-captive-screws',
  );
  cylinder(
    0.019,
    0.022,
    m.metal,
    -0.037,
    0.048,
    -0.034,
    microphone,
    'y',
    'microphone-neck-socket',
  );
  cylinder(
    0.014,
    0.026,
    m.rubber,
    -0.037,
    0.069,
    -0.034,
    microphone,
    'y',
    'microphone-neck-boot',
  );
  lead(
    [
      [-0.037, 0.078, -0.034],
      [-0.068, 0.21, -0.019],
      [-0.14, 0.38, 0.019],
      [-0.187, 0.475, 0.042],
      [-0.208, 0.53, 0.043],
    ],
    0.0085,
    m.dark,
    microphone,
    'microphone-flexible-neck',
    40,
  );
  cylinder(
    0.012,
    0.022,
    m.metal,
    -0.208,
    0.535,
    0.043,
    microphone,
    'y',
    'microphone-capsule-collar',
  );
  const capsule = group('microphone-capsule', microphone, -0.208, 0.586, 0.043);
  capsule.rotation.x = -0.14;
  const capsuleBack = solid(
    new THREE.SphereGeometry(1, 24, 16),
    m.dark,
    capsule,
    'microphone-capsule-rear-housing',
  );
  capsuleBack.scale.set(0.04, 0.054, 0.033);
  // A separate front grille with a regular physical perforation pattern.
  const grille = solid(
    new THREE.SphereGeometry(1, 24, 16, 0, Math.PI),
    m.metal,
    capsule,
    'microphone-capsule-grille',
  );
  grille.scale.set(0.0405, 0.0545, 0.0335);
  const holes: { p: number[]; r: number[] }[] = [];
  const normal = new THREE.Vector3(),
    quaternion = new THREE.Quaternion(),
    euler = new THREE.Euler();
  for (let row = -5; row <= 5; row++) {
    for (let column = -4; column <= 4; column++) {
      const x = column * 0.0075 + (Math.abs(row) % 2) * 0.00375;
      const y = row * 0.0082;
      const normalized = (x / 0.0405) ** 2 + (y / 0.0545) ** 2;
      if (normalized > 0.77) continue;
      const z = 0.0335 * Math.sqrt(1 - normalized);
      normal.set(x / 0.0405 ** 2, y / 0.0545 ** 2, z / 0.0335 ** 2).normalize();
      quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
      euler.setFromQuaternion(quaternion);
      holes.push({
        p: [
          x + normal.x * 0.0008,
          y + normal.y * 0.0008,
          z + normal.z * 0.0008,
        ],
        r: [euler.x, euler.y, euler.z],
      });
    }
  }
  h.instances(
    new THREE.CircleGeometry(0.0018, 6),
    m.dark,
    holes,
    capsule,
    prefix + 'microphone-grille-perforations',
  );
  // The short fixed lead has two real endpoints and stays against the deck.
  cylinder(
    0.0075,
    0.015,
    m.rubber,
    -0.077,
    0.017,
    -0.052,
    microphone,
    'x',
    'microphone-base-cable-boot',
  );
  lead(
    [
      [-0.082, 0.017, -0.052],
      [-0.116, 0.002, -0.056],
      [-0.134, 0.001, -0.088],
      [-0.124, 0.014, -0.112],
    ],
    0.0045,
    m.rubber,
    microphone,
    'microphone-restrained-cable',
    16,
  );
  cylinder(
    0.01,
    0.02,
    m.metal,
    -0.124,
    0.008,
    -0.112,
    microphone,
    'y',
    'microphone-deck-connector',
  );
  cylinder(
    0.012,
    0.006,
    m.rubber,
    -0.124,
    -0.002,
    -0.112,
    microphone,
    'y',
    'microphone-deck-connector-gasket',
  );

  const headset = group('headset-assembly', parent, 1.17, 0.965, 0.035);
  block(
    0.294,
    0.008,
    0.172,
    m.rubber,
    0,
    -0.001,
    0.007,
    headset,
    0.004,
    'headset-dock-foot',
  );
  block(
    0.307,
    0.04,
    0.182,
    m.shell,
    0,
    0.021,
    0.007,
    headset,
    0.012,
    'headset-dock-shell',
  );
  block(
    0.264,
    0.005,
    0.145,
    m.face,
    0,
    0.044,
    0.006,
    headset,
    0.006,
    'headset-dock-inset',
  );
  block(
    0.07,
    0.012,
    0.104,
    m.dark,
    0,
    0.052,
    -0.007,
    headset,
    0.005,
    'headset-dock-column-foot',
  );
  block(
    0.041,
    0.486,
    0.034,
    m.metal,
    0,
    0.293,
    -0.027,
    headset,
    0.005,
    'headset-dock-column',
  );
  block(
    0.054,
    0.067,
    0.048,
    m.dark,
    0,
    0.54,
    -0.017,
    headset,
    0.008,
    'headset-dock-saddle-base',
  );
  block(
    0.111,
    0.025,
    0.099,
    m.rubber,
    0,
    0.5705,
    0.006,
    headset,
    0.01,
    'headset-dock-padded-saddle',
  );
  block(
    0.084,
    0.042,
    0.013,
    m.dark,
    0,
    0.583,
    -0.044,
    headset,
    0.004,
    'headset-dock-retaining-back',
  );
  block(
    0.025,
    0.012,
    0.012,
    m.accent,
    0,
    0.589,
    0.054,
    headset,
    0.003,
    'headset-dock-release-tab',
  );
  block(
    0.019,
    0.004,
    0.002,
    m.led,
    0,
    0.021,
    0.099,
    headset,
    0.001,
    'headset-dock-indicator',
  );
  fasteners(
    [
      [-0.107, 0.048, -0.037],
      [0.107, 0.048, -0.037],
    ],
    headset,
    'headset-dock-captive-screws',
  );
  const phones = group('headset-hardware', headset, 0.015, 0.01, 0.022);
  phones.rotation.y = -0.23;

  // Extruded annular strips give the band a flat padded cross-section.
  const archedStrip = (
    rx: number,
    ry: number,
    thickness: number,
    depth: number,
    material: any,
    name: string,
  ) => {
    const shape = new THREE.Shape();
    const count = 32;
    for (let i = 0; i <= count; i++) {
      const angle = (Math.PI * i) / count;
      const x = rx * Math.cos(angle),
        y = 0.397 + ry * Math.sin(angle);
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    for (let i = count; i >= 0; i--) {
      const angle = (Math.PI * i) / count;
      shape.lineTo(
        (rx - thickness) * Math.cos(angle),
        0.397 + (ry - thickness) * Math.sin(angle),
      );
    }
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelSize: 0.002,
      bevelThickness: 0.002,
      bevelSegments: 1,
      steps: 1,
      curveSegments: 1,
    });
    geometry.translate(0, 0, -depth / 2);
    return solid(geometry, material, phones, name);
  };
  archedStrip(
    0.184,
    0.212,
    0.015,
    0.057,
    m.dark,
    'headset-arched-structural-band',
  );
  archedStrip(
    0.169,
    0.197,
    0.024,
    0.074,
    m.rubber,
    'headset-arched-padded-band',
  );
  // Two silver slider rails continue into separate yokes and swivel pivots.
  for (const side of [-1, 1]) {
    const id = side < 0 ? 'left' : 'right';
    block(
      0.01,
      0.113,
      0.027,
      m.metal,
      side * 0.178,
      0.362,
      0,
      phones,
      0.003,
      `headset-${id}-extension-rail`,
    );
    block(
      0.026,
      0.043,
      0.04,
      m.dark,
      side * 0.176,
      0.407,
      0,
      phones,
      0.005,
      `headset-${id}-slider-housing`,
    );
    const cup = group(
      `headset-${id}-earcup`,
      phones,
      side * 0.175,
      0.244,
      0.002,
    );
    cup.rotation.z = side * -0.055;
    const cupBack = solid(
      new THREE.SphereGeometry(1, 24, 16),
      m.dark,
      cup,
      `headset-${id}-earcup-outer-shell`,
    );
    cupBack.scale.set(0.045, 0.11, 0.08);
    cupBack.position.x = side * 0.012;
    const backing = solid(
      new THREE.SphereGeometry(1, 20, 12),
      m.face,
      cup,
      `headset-${id}-earcup-recessed-disc`,
    );
    backing.scale.set(0.006, 0.072, 0.054);
    backing.position.x = side * 0.055;
    const pad = solid(
      new THREE.TorusGeometry(0.069, 0.02, 8, 24),
      m.rubber,
      cup,
      `headset-${id}-ear-cushion`,
    );
    pad.rotation.y = Math.PI / 2;
    pad.scale.set(0.89, 1.24, 1);
    pad.position.x = side * -0.025;
    const fabric = solid(
      new THREE.SphereGeometry(1, 16, 10),
      m.ink,
      cup,
      `headset-${id}-inner-acoustic-liner`,
    );
    fabric.scale.set(0.009, 0.076, 0.052);
    fabric.position.x = side * -0.023;
    for (const face of [-1, 1]) {
      const arm = h.rod(
        [side * 0.181, 0.341, face * 0.029],
        [side * 0.19, 0.259, face * 0.068],
        0.007,
        m.dark,
        phones,
      );
      arm.name = prefix + `headset-${id}-yoke-${face}`;
    }
    cylinder(
      0.015,
      0.012,
      m.metal,
      side * 0.189,
      0.259,
      0.073,
      phones,
      'z',
      `headset-${id}-swivel-pivot`,
    );
    cylinder(
      0.007,
      0.015,
      m.dark,
      side * 0.189,
      0.259,
      0.075,
      phones,
      'z',
      `headset-${id}-pivot-cap`,
      0.007,
      10,
    );
    cylinder(
      0.014,
      0.007,
      m.accent,
      side * 0.064,
      0.0,
      0.0,
      cup,
      'x',
      `headset-${id}-identification-disc`,
      0.014,
      16,
    );
    // Horizontal seams mark the replaceable cushion rather than a decorative ring.
    const seam = solid(
      new THREE.TorusGeometry(0.087, 0.0022, 4, 32),
      m.dark,
      cup,
      `headset-${id}-cup-service-seam`,
    );
    seam.rotation.y = Math.PI / 2;
    seam.scale.set(0.82, 1.24, 1);
    seam.position.x = side * -0.006;
  }
  cylinder(
    0.009,
    0.035,
    m.rubber,
    0.183,
    0.137,
    0.016,
    phones,
    'y',
    'headset-cup-strain-relief',
  );
  lead(
    [
      [0.183, 0.122, 0.016],
      [0.207, 0.08, 0.055],
      [0.242, 0.049, 0.095],
      [0.233, -0.004, 0.161],
      [0.178, -0.004, 0.18],
      [0.131, 0.013, 0.145],
      [0.128, 0.072, 0.108],
    ],
    0.005,
    m.rubber,
    phones,
    'headset-secured-cable',
    36,
  );
  cylinder(
    0.009,
    0.022,
    m.dark,
    0.128,
    0.08,
    0.108,
    phones,
    'y',
    'headset-plug-strain-relief',
  );
  cylinder(
    0.012,
    0.015,
    m.metal,
    0.128,
    0.096,
    0.108,
    phones,
    'y',
    'headset-deck-plug',
  );
  block(
    0.035,
    0.106,
    0.036,
    m.face,
    0.128,
    0.041,
    0.108,
    phones,
    0.004,
    'headset-connector-pedestal',
  );
  // Record explicit design envelopes without depending on traversal or animation.
  microphone.userData.staticHardware = true;
  headset.userData.staticHardware = true;
  return { microphone, headset };
}
