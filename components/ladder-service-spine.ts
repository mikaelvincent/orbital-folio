/** Shared apertures keep the service inserts flush with the pressure lining. */
export function getServiceSpineRecesses(THREE: any) {
  const rounded = (x: number, y: number, w: number, h: number, r: number) => {
    const s = new THREE.Shape(),
      l = x - w / 2,
      b = y - h / 2;
    s.moveTo(l + r, b);
    s.lineTo(l + w - r, b);
    s.quadraticCurveTo(l + w, b, l + w, b + r);
    s.lineTo(l + w, b + h - r);
    s.quadraticCurveTo(l + w, b + h, l + w - r, b + h);
    s.lineTo(l + r, b + h);
    s.quadraticCurveTo(l, b + h, l, b + h - r);
    s.lineTo(l, b + r);
    s.quadraticCurveTo(l, b, l + r, b);
    s.closePath();
    return s;
  };
  const upper = new THREE.Shape();
  upper.moveTo(-0.505, 1.15);
  upper.lineTo(-0.225, 1.15);
  upper.quadraticCurveTo(-0.2, 1.15, -0.2, 1.175);
  upper.lineTo(-0.2, 2.225);
  upper.quadraticCurveTo(-0.2, 2.25, -0.225, 2.25);
  upper.lineTo(-0.295, 2.25);
  upper.bezierCurveTo(-0.405, 2.055, -0.52, 1.52, -0.53, 1.19);
  upper.quadraticCurveTo(-0.531, 1.15, -0.505, 1.15);
  upper.closePath();
  const lower = new THREE.Shape();
  const mirrored = upper
    .getPoints(32)
    .map((p: any) => new THREE.Vector2(p.x, 0.02 - p.y));
  lower.setFromPoints(mirrored);
  lower.closePath();
  return [
    { id: 'upper-conduits', kind: 'conduits', shape: upper, side: 1 },
    { id: 'lower-conduits', kind: 'conduits', shape: lower, side: -1 },
    {
      id: 'isolation-controls',
      kind: 'controls',
      shape: rounded(-0.37, 0.01, 0.32, 0.98, 0.035),
      side: 0,
    },
    {
      id: 'upper-vent',
      kind: 'vent',
      shape: rounded(-0.37, 0.83, 0.31, 0.24, 0.03),
      side: 1,
    },
    {
      id: 'lower-vent',
      kind: 'vent',
      shape: rounded(-0.37, -0.81, 0.31, 0.24, 0.03),
      side: -1,
    },
  ];
}

/** Fixed equipment only; local coordinates match the existing ladder bay. */
export function buildLadderServiceSpine(
  THREE: any,
  h: any,
  parent: any,
  recesses: any[],
  accent: any,
) {
  const prefix = 'service-spine-';
  const material = (
    name: string,
    color: number,
    roughness = 0.65,
    metalness = 0.08,
  ) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    m.name = prefix + name;
    m.envMapIntensity = 0.1;
    m.userData.highlightScale = 0.018;
    return m;
  };
  const m = {
    ivory: material('ivory-enamel', 0xd8cebb, 0.68),
    graphite: material('graphite-casings', 0x303a42, 0.67, 0.14),
    panel: material('removable-closeouts', 0x45505a, 0.79, 0.08),
    rubber: material('retaining-rubber', 0x141f28, 0.92, 0),
    pocket: material('recess-interior', 0x29343d, 0.85, 0),
    hose: material('insulated-harness', 0x414950, 0.72, 0.08),
    tread: material('brushed-tread-alloy', 0xd8dddc, 0.5, 0.25),
    alloy: material('satin-alloy', 0x9ca8ad, 0.47, 0.55),
    amber: material(
      'anodized-grips',
      accent?.color?.getHex() ?? 0xe69a28,
      0.46,
      0.23,
    ),
    lamp: material('protected-diffuser', 0xffebc4, 0.6, 0),
    ink: material('control-index-paint', 0xabb8bd, 1, 0),
  };
  m.lamp.emissive.set(0xffdca1);
  m.lamp.emissiveIntensity = 1.7;
  const root = new THREE.Group();
  root.name = 'engineering-service-spine';
  root.userData = {
    section: 'walkway',
    roomSurface: true,
    surfaceOnly: true,
    batchRoot: true,
    excludePick: true,
  };
  parent.add(root);
  const box = (
    w: number,
    ht: number,
    d: number,
    mat: any,
    x: number,
    y: number,
    z: number,
    name: string,
    r = 0.008,
    into = root,
  ) => {
    const object = h.box(w, ht, d, mat, x, y, z, into, r, prefix + name);
    // Only actual diffusers emit. The bay's wall/doorway surfaces keep their
    // established non-emitting finish and every fixture follows its dimmer.
    if (mat === m.lamp) object.material = h.fixtureMaterial(mat);
    return object;
  };
  const rod = (
    a: number[],
    b: number[],
    radius: number,
    mat: any,
    name: string,
    into = root,
  ) => {
    const o = h.rod(a, b, radius, mat, into);
    o.name = prefix + name;
    return o;
  };
  const cylinder = (
    radius: number,
    length: number,
    mat: any,
    x: number,
    y: number,
    z: number,
    axis: string,
    name: string,
    into = root,
  ) => {
    const o = h.cylinder(radius, length, mat, x, y, z, into, axis);
    o.name = prefix + name;
    return o;
  };
  const screws: number[][] = [];
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const pointsOf = (shape: any) => {
    const points = shape.getPoints(32);
    if (points[0].distanceToSquared(points[points.length - 1]) < 1e-12)
      points.pop();
    return points;
  };
  // Every pocket shares the lining aperture exactly. A closed back and deep
  // side returns fill the cut, leaving the pressure shell behind it intact.
  for (const recess of recesses) {
    const outer = pointsOf(recess.shape);
    const center = new THREE.Box2()
      .setFromPoints(outer)
      .getCenter(new THREE.Vector2());
    const inner = outer.map(
      (p: any) =>
        new THREE.Vector2(
          center.x + (p.x - center.x) * 0.84,
          center.y +
            (p.y - center.y) * (recess.kind === 'conduits' ? 0.956 : 0.84),
        ),
    );
    const frame = new THREE.Shape(outer);
    frame.holes.push(new THREE.Path(inner));
    const rim = new THREE.ExtrudeGeometry(frame, {
      depth: 0.018,
      bevelEnabled: false,
      curveSegments: 24,
      steps: 1,
    });
    rim.translate(0, 0, -0.99);
    h.mesh(rim, m.ivory, root, prefix + recess.id + '-flush-rim');
    const wallPositions: number[] = [],
      wallIndices: number[] = [];
    for (const p of inner)
      wallPositions.push(p.x, p.y, -0.973, p.x, p.y, -1.154);
    for (let i = 0; i < inner.length; i++) {
      const a = 2 * i,
        b = 2 * ((i + 1) % inner.length);
      wallIndices.push(a, a + 1, b + 1, a, b + 1, b);
    }
    const walls = new THREE.BufferGeometry();
    walls.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(wallPositions, 3),
    );
    walls.setAttribute(
      'uv',
      new THREE.Float32BufferAttribute(
        new Float32Array((wallPositions.length / 3) * 2),
        2,
      ),
    );
    walls.setIndex(wallIndices);
    walls.computeVertexNormals();
    const wallMat = m.graphite.clone();
    wallMat.side = THREE.DoubleSide;
    h.mesh(walls, wallMat, root, prefix + recess.id + '-closed-returns');
    const back = new THREE.ExtrudeGeometry(recess.shape, {
      depth: 0.026,
      bevelEnabled: false,
      curveSegments: 32,
      steps: 1,
    });
    back.translate(0, 0, -1.175);
    h.mesh(back, m.pocket, root, prefix + recess.id + '-closed-back');
  }

  // Closeouts seat on a continuous narrow gasket; seams do not expose space.
  box(0.64, 4.82, 0.035, m.rubber, 0.15, 0.01, -0.976, 'backing-gasket', 0.022);
  for (let i = 0; i < 5; i++) {
    const y = 0.01 + (i - 2) * 0.96;
    box(
      0.616,
      0.935,
      0.031,
      m.panel,
      0.15,
      y,
      -0.9515,
      'fitted-closeout-panel',
      0.016,
    );
    for (const x of [-0.12, 0.42])
      for (const dy of [-0.403, 0.403]) screws.push([x, y + dy, -0.933]);
  }
  // Rails stay at the established ladder datums. Brackets span continuously
  // from the closeout to the rails; collars capture every joint.
  for (const x of [-0.08, 0.38]) {
    rod(
      [x, -2.61, -0.69],
      [x, 2.55, -0.69],
      0.032,
      m.graphite,
      'continuous-rail',
    );
    for (const y of [-2.18, -0.72, 0.74, 2.18]) {
      box(
        0.132,
        0.17,
        0.027,
        m.graphite,
        x,
        y,
        -0.939,
        'rail-anchor-plate',
        0.015,
      );
      cylinder(
        0.036,
        0.231,
        m.alloy,
        x,
        y,
        -0.8235,
        'z',
        'rail-rigid-stand-off',
      );
      box(
        0.091,
        0.11,
        0.089,
        m.graphite,
        x,
        y,
        -0.688,
        'rail-split-clamp',
        0.018,
      );
      for (const dx of [-0.044, 0.044])
        for (const dy of [-0.055, 0.055])
          screws.push([x + dx, y + dy, -0.9225]);
      cylinder(0.011, 0.016, m.alloy, x, y, -0.636, 'z', 'rail-clamp-bolt');
    }
    for (const y of [-2.585, 2.525])
      cylinder(0.044, 0.13, m.graphite, x, y, -0.69, 'y', 'rail-end-cap');
    for (const y of [-1.75, -1.22, -0.26, 0.27, 1.23, 1.76]) {
      cylinder(0.035, 0.44, m.amber, x, y, -0.69, 'y', 'amber-grip-sleeve');
      for (const dy of [-0.224, 0.224])
        cylinder(
          0.04,
          0.029,
          m.graphite,
          x,
          y + dy,
          -0.69,
          'y',
          'grip-retaining-collar',
        );
    }
  }
  for (let i = 0; i < 13; i++) {
    const y = -2.47 + i * 0.405;
    // A vertical socket sleeve hides the raw cylinder intersection and gives
    // each rung a continuous, mechanically legible connection to its rail.
    for (const x of [-0.08, 0.38])
      cylinder(0.044, 0.095, m.graphite, x, y, -0.69, 'y', 'rung-rail-sleeve');
    cylinder(0.024, 0.46, m.tread, 0.15, y, -0.69, 'x', 'satin-rung');
    cylinder(0.027, 0.27, m.tread, 0.15, y, -0.69, 'x', 'rung-grip-insert');
    for (const x of [0.08, 0.15, 0.22])
      cylinder(
        0.0277,
        0.004,
        m.alloy,
        x,
        y,
        -0.69,
        'x',
        'tread-machining-ring',
      );
    for (const x of [-0.055, 0.355])
      cylinder(0.036, 0.05, m.graphite, x, y, -0.69, 'x', 'rung-end-socket');
    for (const x of [0.02, 0.28])
      cylinder(0.028, 0.024, m.alloy, x, y, -0.69, 'x', 'rung-grip-ferrule');
  }

  // Each three-line harness follows the shoulder taper and turns into its
  // own backing at both ends. No loose cable or open tube terminates in air.
  for (const side of [-1, 1]) {
    const sy = (y: number) => (side > 0 ? y : 0.02 - y);
    const px = (y: number, index: number) => {
      const t = (y - 1.27) / 0.83;
      const left = -0.505 + 0.18 * t * t;
      return left + (-0.225 - left) * [0.22, 0.5, 0.78][index];
    };
    for (let i = 0; i < 3; i++) {
      const path = [
        [px(1.28, i), sy(1.245), -1.158],
        [px(1.28, i), sy(1.28), -1.083],
        [px(1.51, i), sy(1.51), -1.083],
        [px(1.78, i), sy(1.78), -1.083],
        [px(2.06, i), sy(2.06), -1.083],
        [px(2.06, i), sy(2.115), -1.158],
      ].map((p) => new THREE.Vector3(...p));
      const curve = new THREE.CatmullRomCurve3(path, false, 'centripetal');
      h.mesh(
        new THREE.TubeGeometry(curve, 40, i === 2 ? 0.019 : 0.013, 10, false),
        i === 2 ? m.tread : m.hose,
        root,
        prefix + 'captured-conduit',
      );
      for (const y of [1.31, 2.045])
        cylinder(
          0.022,
          0.072,
          m.graphite,
          px(y, i),
          sy(y),
          -1.083,
          'y',
          'conduit-termination-collar',
        );
      for (const y of [1.49, 1.85]) {
        const x = px(y, i);
        box(
          0.038,
          0.052,
          0.084,
          m.amber,
          x,
          sy(y),
          -1.11,
          'conduit-backing-clamp',
          0.008,
        );
        screws.push([x, sy(y), -1.066]);
      }
      // Short insulation bands give hoses scale without noisy procedural grain.
      if (i < 2)
        for (const y of [1.58, 1.65, 1.72])
          cylinder(
            0.0145,
            0.009,
            m.graphite,
            px(y, i),
            sy(y),
            -1.083,
            'y',
            'hose-insulation-band',
          );
    }
    const y = sy(1.205);
    box(
      0.203,
      0.047,
      0.136,
      m.graphite,
      -0.365,
      y,
      -1.088,
      'channel-light-housing',
      0.01,
    );
    box(
      0.159,
      0.018,
      0.016,
      m.lamp,
      -0.365,
      y,
      -1.013,
      'channel-light-diffuser',
      0.005,
    );
    // Fitted louvres sit inside a closed recess, never over a false hole.
    const ventY = side > 0 ? 0.83 : -0.81;
    for (let i = 0; i < 5; i++) {
      const blade = box(
        0.271,
        0.016,
        0.06,
        m.alloy,
        -0.37,
        ventY + (i - 2) * 0.036,
        -1.01,
        'vent-louvre',
        0.002,
      );
      blade.rotation.x = -0.34;
    }
  }
  // Three guarded isolation levers, with a small engraved position scale.
  for (let i = 0; i < 3; i++) {
    const y = 0.01 + (i - 1) * 0.27;
    box(
      0.192,
      0.214,
      0.064,
      m.graphite,
      -0.37,
      y,
      -1.12,
      'switch-mount',
      0.015,
    );
    box(0.134, 0.14, 0.055, m.rubber, -0.37, y, -1.074, 'switch-recess', 0.01);
    cylinder(
      0.029,
      0.136,
      m.alloy,
      -0.37,
      y - 0.035,
      -1.042,
      'x',
      'switch-pivot',
    );
    box(
      0.07,
      0.098,
      0.056,
      m.amber,
      -0.37,
      y - 0.008,
      -1.017,
      'guarded-switch-paddle',
      0.012,
    );
    for (const x of [-0.458, -0.282]) {
      rod(
        [x, y - 0.065, -1.095],
        [x, y - 0.065, -0.98],
        0.009,
        m.alloy,
        'switch-guard-return',
      );
      rod(
        [x, y + 0.065, -1.095],
        [x, y + 0.065, -0.98],
        0.009,
        m.alloy,
        'switch-guard-return',
      );
      rod(
        [x, y - 0.065, -0.98],
        [x, y + 0.065, -0.98],
        0.009,
        m.alloy,
        'switch-guard-rail',
      );
    }
    box(
      0.034,
      0.006,
      0.002,
      m.ink,
      -0.37,
      y + 0.083,
      -1.0875,
      'switch-index-mark',
      0.0005,
    );
  }
  // Contoured end fittings tie the rail ends and closeouts into the actual
  // lining. These are shallow wall anchors, leaving the curved passage clear.
  const header = new THREE.Shape();
  header.moveTo(-0.16, 2.415);
  header.lineTo(0.5, 2.415);
  header.quadraticCurveTo(0.52, 2.415, 0.52, 2.435);
  header.lineTo(0.52, 2.62);
  header.quadraticCurveTo(0.52, 2.64, 0.5, 2.64);
  header.lineTo(0, 2.64);
  header.quadraticCurveTo(-0.11, 2.6, -0.16, 2.435);
  header.closePath();
  for (const side of [-1, 1]) {
    const shape = new THREE.Shape(
      header
        .getPoints(24)
        .map((p: any) => new THREE.Vector2(p.x, side > 0 ? p.y : 0.02 - p.y)),
    );
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.36,
      bevelEnabled: true,
      bevelSize: 0.004,
      bevelThickness: 0.004,
      bevelSegments: 2,
      curveSegments: 24,
    });
    geo.translate(0, 0, -0.992);
    h.mesh(
      geo,
      m.graphite,
      root,
      prefix + (side > 0 ? 'upper-header-anchor' : 'lower-rail-anchor'),
    );
    const y = side > 0 ? 2.47 : -2.45;
    for (const x of [-0.07, 0.46]) screws.push([x, y, -0.629]);
  }
  box(
    0.452,
    0.097,
    0.024,
    m.rubber,
    0.235,
    2.535,
    -0.624,
    'header-light-bezel',
    0.017,
  );
  box(
    0.398,
    0.058,
    0.016,
    m.lamp,
    0.235,
    2.535,
    -0.606,
    'header-light-diffuser',
    0.014,
  );
  box(
    0.39,
    0.016,
    0.018,
    m.amber,
    0.23,
    -2.555,
    -0.634,
    'lower-anchor-index-strip',
    0.005,
  );
  const screwGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.007, 12);
  screwGeo.rotateX(Math.PI / 2);
  h.instances(
    screwGeo,
    m.alloy,
    screws.map((p) => ({ p })),
    root,
    prefix + 'captive-fasteners',
  );
  h.instances(
    unitBox,
    m.rubber,
    screws.map(([x, y, z]) => ({
      p: [x, y, z + 0.003],
      s: [0.012, 0.002, 0.0015],
    })),
    root,
    prefix + 'fastener-slots',
  );
  root.userData.serviceSpine = {
    static: true,
    recesses: recesses.map((r) => r.id),
    backingFront: -0.936,
    railCenters: [-0.08, 0.38],
    railZ: -0.69,
    rungCount: 13,
  };
  return root;
}
