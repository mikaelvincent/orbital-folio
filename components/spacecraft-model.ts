/**
 * Editable, self-contained cutaway spacecraft for Three.js.
 * Units are metres-ish; +Y is up, +Z is the open viewing side, -X is the nose.
 * Main rooms: projects x=-3, experience x=0, about x=3. Communications x=-5.5.
 * Pass the application's THREE namespace; this module owns no renderer or loop.
 */
export function createSpacecraft(
  THREE: any,
  options: { accent?: string; labels?: Record<string, string> } = {},
): {
  group: any;
  targets: Array<{ object: any; section: string }>;
  update: (time: number, active: string) => void;
} {
  const group = new THREE.Group();
  group.name = 'orbital-cutaway';
  const targets: Array<{ object: any; section: string }> = [];
  const geometries = new Map<string, any>();
  const animatedAccents: Record<string, any> = {};
  const palette = {
    ivory: 0xeeeadd,
    chalk: 0xfffbeb,
    edge: 0xd3d6cb,
    navy: 0x203248,
    deep: 0x102333,
    slate: 0x59717c,
    amber: options.accent ? new THREE.Color(options.accent).getHex() : 0xeaa344,
    linen: 0xdcd7c7,
    blue: 0x73bfd0,
    green: 0x77a38c,
  };
  const material = (
    color: number,
    roughness = 0.55,
    metalness = 0.04,
    extra = {},
  ) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
  const m = {
    ivory: material(palette.ivory),
    chalk: material(palette.chalk, 0.64),
    edge: material(palette.edge, 0.53, 0.18),
    navy: material(palette.navy, 0.47, 0.2),
    deep: material(palette.deep, 0.7),
    slate: material(palette.slate, 0.61, 0.16),
    amber: material(palette.amber, 0.4, 0.28),
    linen: material(palette.linen, 0.95),
    blanket: material(0xd9a257, 0.94),
    glass: material(0x183e50, 0.28, 0.18, {
      emissive: 0x26596a,
      emissiveIntensity: 0.16,
    }),
    screen: material(0x17384a, 0.5, 0, {
      emissive: 0x173e53,
      emissiveIntensity: 0.4,
    }),
    display: material(palette.blue, 0.51, 0, {
      emissive: palette.blue,
      emissiveIntensity: 0.48,
    }),
    lamp: material(0xffe5ad, 0.55, 0, {
      emissive: 0xffd794,
      emissiveIntensity: 1.0,
    }),
    green: material(palette.green, 0.9),
    leaf: material(0x577d68, 0.88),
    solar: material(0x21405c, 0.45, 0.38),
    solarAlt: material(0x315370, 0.43, 0.35),
    solarLine: material(0x8b9b9f, 0.56, 0.4),
  };
  for (const section of ['projects', 'experience', 'about', 'contact']) {
    animatedAccents[section] = material(palette.amber, 0.4, 0.24, {
      emissive: palette.amber,
      emissiveIntensity: 0.035,
    });
  }

  // A subdivided built-in box remapped onto a rounded cuboid. Edge vertices are
  // concentrated at the fillet instead of wasting subdivisions on flat panels.
  function roundedGeometry(w: number, h: number, d: number, radius: number) {
    const r = Math.max(0.001, Math.min(radius, w * 0.49, h * 0.49, d * 0.49));
    const key = `box:${w}:${h}:${d}:${r}`;
    if (geometries.has(key)) return geometries.get(key);
    const geo = new THREE.BoxGeometry(w, h, d, 6, 6, 6);
    const p = geo.attributes.position;
    const n = geo.attributes.normal;
    const half = [w / 2, h / 2, d / 2];
    const inner = half.map((v: number) => v - r);
    const remap = (value: number, axis: number) => {
      const index = Math.max(
        0,
        Math.min(6, Math.round((value / half[axis] + 1) * 3)),
      );
      const b = inner[axis];
      return [-half[axis], -b - r / 2, -b, 0, b, b + r / 2, half[axis]][index];
    };
    for (let i = 0; i < p.count; i++) {
      const xyz = [
        remap(p.getX(i), 0),
        remap(p.getY(i), 1),
        remap(p.getZ(i), 2),
      ];
      const core = xyz.map((v: number, axis: number) =>
        Math.max(-inner[axis], Math.min(inner[axis], v)),
      );
      const normal = new THREE.Vector3(
        xyz[0] - core[0],
        xyz[1] - core[1],
        xyz[2] - core[2],
      ).normalize();
      p.setXYZ(
        i,
        core[0] + normal.x * r,
        core[1] + normal.y * r,
        core[2] + normal.z * r,
      );
      n.setXYZ(i, normal.x, normal.y, normal.z);
    }
    p.needsUpdate = true;
    n.needsUpdate = true;
    geo.computeBoundingSphere();
    geometries.set(key, geo);
    return geo;
  }
  function mesh(geometry: any, mat: any, parent = group) {
    const object = new THREE.Mesh(geometry, mat);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  function box(
    w: number,
    h: number,
    d: number,
    mat: any,
    x: number,
    y: number,
    z: number,
    r = 0.04,
    parent = group,
  ) {
    const object = mesh(roundedGeometry(w, h, d, r), mat, parent);
    object.position.set(x, y, z);
    return object;
  }
  function cylinder(
    radius: number,
    length: number,
    mat: any,
    x: number,
    y: number,
    z: number,
    axis = 'y',
    parent = group,
    radiusTop = radius,
  ) {
    const key = `cylinder:${radius}:${radiusTop}:${length}`;
    if (!geometries.has(key))
      geometries.set(
        key,
        new THREE.CylinderGeometry(radiusTop, radius, length, 32, 1),
      );
    const object = mesh(geometries.get(key), mat, parent);
    object.position.set(x, y, z);
    if (axis === 'x') object.rotation.z = -Math.PI / 2;
    if (axis === 'z') object.rotation.x = Math.PI / 2;
    return object;
  }
  function sphere(
    radius: number,
    mat: any,
    x: number,
    y: number,
    z: number,
    parent = group,
  ) {
    const key = `sphere:${radius}`;
    if (!geometries.has(key))
      geometries.set(key, new THREE.SphereGeometry(radius, 20, 12));
    const object = mesh(geometries.get(key), mat, parent);
    object.position.set(x, y, z);
    return object;
  }
  function torus(
    radius: number,
    tube: number,
    mat: any,
    x: number,
    y: number,
    z: number,
    axis = 'z',
    parent = group,
  ) {
    const key = `torus:${radius}:${tube}`;
    if (!geometries.has(key))
      geometries.set(key, new THREE.TorusGeometry(radius, tube, 8, 48));
    const object = mesh(geometries.get(key), mat, parent);
    object.position.set(x, y, z);
    if (axis === 'x') object.rotation.y = Math.PI / 2;
    if (axis === 'y') object.rotation.x = Math.PI / 2;
    return object;
  }
  function rod(
    from: number[],
    to: number[],
    radius: number,
    mat: any,
    parent = group,
  ) {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const object = cylinder(radius, a.distanceTo(b), mat, 0, 0, 0, 'y', parent);
    object.position.copy(a).add(b).multiplyScalar(0.5);
    object.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      b.sub(a).normalize(),
    );
    return object;
  }
  function instances(
    geometry: any,
    mat: any,
    transforms: Array<{ p: number[]; s?: number[]; r?: number[] }>,
    parent = group,
  ) {
    const object = new THREE.InstancedMesh(geometry, mat, transforms.length);
    const dummy = new THREE.Object3D();
    transforms.forEach((t, i) => {
      dummy.position.set(...t.p);
      dummy.scale.set(...(t.s || [1, 1, 1]));
      dummy.rotation.set(...(t.r || [0, 0, 0]));
      dummy.updateMatrix();
      object.setMatrixAt(i, dummy.matrix);
    });
    object.castShadow = true;
    object.receiveShadow = true;
    object.instanceMatrix.needsUpdate = true;
    parent.add(object);
    return object;
  }
  function target(object: any, section: string, name: string) {
    object.name = name;
    object.userData.section = section;
    targets.push({ object, section });
    return object;
  }
  function roundedPath(path: any, w: number, h: number, r: number) {
    const x = -w / 2,
      y = -h / 2;
    path.moveTo(x + r, y);
    path.lineTo(x + w - r, y);
    path.quadraticCurveTo(x + w, y, x + w, y + r);
    path.lineTo(x + w, y + h - r);
    path.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    path.lineTo(x + r, y + h);
    path.quadraticCurveTo(x, y + h, x, y + h - r);
    path.lineTo(x, y + r);
    path.quadraticCurveTo(x, y, x + r, y);
    return path;
  }

  // Shared structural spine, insulated pipes, and shallow open shell sections.
  box(9.72, 0.27, 1.48, m.navy, 0, -1.37, -0.13, 0.13);
  cylinder(0.095, 10.05, m.amber, 0, -1.45, 0.7, 'x');
  cylinder(0.075, 10.12, m.slate, 0, -1.47, -0.73, 'x');
  const ring = roundedPath(new THREE.Shape(), 2.68, 2.72, 0.64);
  ring.holes.push(roundedPath(new THREE.Path(), 2.29, 2.33, 0.48));
  const ribGeometry = new THREE.ExtrudeGeometry(ring, {
    depth: 0.16,
    bevelEnabled: true,
    bevelThickness: 0.035,
    bevelSize: 0.035,
    bevelSegments: 2,
    steps: 1,
    curveSegments: 10,
  });
  ribGeometry.translate(0, 0, -0.08);
  const bolts: Array<{ p: number[] }> = [];
  for (const x of [-4.59, -1.5, 1.5, 4.59]) {
    const rib = mesh(ribGeometry, m.ivory);
    rib.rotation.y = Math.PI / 2;
    rib.position.set(x, 0.05, 0);
    // Mechanical collars remain below the clear doorway between adjacent bays.
    box(0.29, 0.29, 2.15, m.navy, x, -1.24, 0, 0.065);
    for (const y of [-0.84, 0.05, 0.89]) bolts.push({ p: [x, y, 1.336] });
  }
  const frontVents: Array<{ p: number[]; s: number[] }> = [];
  const deckMarks: Array<{ p: number[]; s: number[] }> = [];
  for (const [index, x] of [-3, 0, 3].entries()) {
    const section = ['projects', 'experience', 'about'][index];
    // Label textures are generated from database navigation copy, never baked into the asset.
    if (options.labels?.[section] && typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = 768;
      canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#d7dbd4';
      ctx.fillRect(0, 0, 768, 128);
      ctx.fillStyle = '#203248';
      ctx.font = '500 50px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(options.labels[section].slice(0, 40), 384, 65, 650);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const plaqueMaterial = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.65,
      });
      box(1.95, 0.39, 0.08, m.navy, x, -1.3, 1.34, 0.045);
      const plaque = mesh(new THREE.PlaneGeometry(1.89, 0.32), plaqueMaterial);
      plaque.position.set(x, -1.29, 1.39);
      target(plaque, section, section + '-nameplate');
      for (const dx of [-1.03, 1.03])
        box(0.13, 0.38, 0.13, m.amber, x + dx, -1.29, 1.37, 0.035);
    }
    box(2.92, 0.23, 2.48, m.ivory, x, -1.15, 0, 0.105);
    const deck = box(2.66, 0.045, 2.14, m.linen, x, -1.014, 0.02, 0.04);
    target(deck, section, `${section}-deck`);
    box(2.83, 1.85, 0.16, m.ivory, x, -0.04, -1.16, 0.075);
    box(2.73, 0.085, 0.29, m.navy, x, -0.87, -0.98, 0.04);
    box(2.81, 0.18, 0.7, m.ivory, x, 1.25, -0.8, 0.08);
    box(2.76, 0.09, 0.31, m.edge, x, 1.1, -0.96, 0.04);
    // Recessed warm linear cabin light, with a modest local fill light.
    box(1.22, 0.085, 0.16, m.navy, x, 1.105, -0.53, 0.035);
    box(1.05, 0.034, 0.12, m.lamp, x, 1.052, -0.51, 0.017);
    const light = new THREE.PointLight(0xffdcab, 0.42, 3.0, 2);
    light.position.set(x, 0.75, -0.25);
    group.add(light);
    for (let i = 0; i < 5; i++)
      frontVents.push({
        p: [x - 0.3 + i * 0.15, -1.15, 1.247],
        s: [0.064, 0.075, 0.011],
      });
    for (const dx of [-1.22, 1.22]) bolts.push({ p: [x + dx, -1.15, 1.258] });
    for (let i = 0; i < 5; i++)
      deckMarks.push({
        p: [x - 0.9 + i * 0.45, -0.982, 0.89],
        s: [0.21, 0.012, 0.041],
      });
  }
  instances(new THREE.SphereGeometry(0.04, 10, 6), m.amber, bolts);
  instances(new THREE.BoxGeometry(1, 1, 1), m.navy, frontVents);
  instances(new THREE.BoxGeometry(1, 1, 1), m.amber, deckMarks);

  // PROJECT BAY — latched modular storage, a strapped cargo case, and a rack.
  box(1.77, 1.61, 0.54, m.navy, -3.43, -0.12, -0.79, 0.11);
  for (let i = 0; i < 2; i++) {
    const x = -3.88 + i * 0.88;
    target(
      box(0.79, 1.44, 0.105, m.chalk, x, -0.12, -0.47, 0.063),
      'projects',
      'project-locker',
    );
    box(
      0.057,
      0.35,
      0.071,
      animatedAccents.projects,
      x + 0.24,
      -0.1,
      -0.392,
      0.027,
    );
    box(0.24, 0.105, 0.018, m.deep, x - 0.09, 0.39, -0.409, 0.012);
    box(0.14, 0.024, 0.011, m.display, x - 0.115, 0.39, -0.394, 0.006);
    box(0.48, 0.025, 0.018, m.edge, x - 0.015, -0.54, -0.407, 0.009);
  }
  box(1.66, 0.07, 0.46, animatedAccents.projects, -3.43, 0.716, -0.8, 0.023);
  const cargo = new THREE.Group();
  cargo.position.set(-3.8, -0.69, 0.43);
  cargo.rotation.y = -0.1;
  group.add(cargo);
  target(
    box(0.73, 0.53, 0.63, m.slate, 0, 0, 0, 0.085, cargo),
    'projects',
    'project-cargo-case',
  );
  box(0.75, 0.095, 0.65, m.edge, 0, 0.25, 0, 0.036, cargo);
  for (const x of [-0.22, 0.22]) {
    box(0.075, 0.55, 0.66, m.navy, x, 0.015, 0, 0.025, cargo);
    box(
      0.106,
      0.13,
      0.055,
      animatedAccents.projects,
      x,
      0.01,
      0.348,
      0.021,
      cargo,
    );
  }
  box(0.62, 0.075, 0.52, m.navy, -2.05, -0.5, -0.59, 0.026);
  box(0.62, 0.075, 0.52, m.navy, -2.05, 0.21, -0.59, 0.026);
  box(0.057, 1.19, 0.43, m.edge, -2.35, -0.35, -0.6, 0.025);
  box(0.057, 1.19, 0.43, m.edge, -1.75, -0.35, -0.6, 0.025);
  for (let i = 0; i < 3; i++) {
    box(
      0.14,
      0.49 - i * 0.035,
      0.33,
      i === 1 ? m.amber : m.ivory,
      -2.24 + i * 0.19,
      -0.225 - i * 0.018,
      -0.58,
      0.02,
    );
  }
  box(0.36, 0.24, 0.31, m.chalk, -2.02, 0.365, -0.59, 0.042);
  box(0.2, 0.04, 0.015, m.slate, -2.02, 0.37, -0.423, 0.008);

  // MISSION BAY — a forward-facing display, tactile console, and swivel seat.
  box(1.81, 0.16, 0.77, m.chalk, 0, -0.23, -0.39, 0.072);
  box(0.83, 0.11, 0.52, m.navy, 0, -0.348, -0.52, 0.035);
  box(0.27, 0.54, 0.31, m.navy, 0, -0.67, -0.58, 0.038);
  box(0.81, 0.095, 0.6, m.edge, 0, -0.945, -0.55, 0.046);
  const console = new THREE.Group();
  console.position.set(0, 0.39, -0.69);
  console.rotation.x = -0.08;
  group.add(console);
  box(1.81, 1.0, 0.18, m.navy, 0, 0, 0, 0.09, console);
  target(
    box(1.61, 0.79, 0.033, m.screen, 0, 0.025, 0.109, 0.045, console),
    'experience',
    'mission-display',
  );
  box(
    1.32,
    0.035,
    0.021,
    animatedAccents.experience,
    0,
    -0.426,
    0.102,
    0.01,
    console,
  );
  torus(0.225, 0.009, m.display, -0.4, 0.042, 0.139, 'z', console);
  torus(0.13, 0.004, m.slate, -0.4, 0.042, 0.139, 'z', console);
  const sweep = new THREE.Group();
  sweep.position.set(-0.4, 0.042, 0.144);
  console.add(sweep);
  box(0.192, 0.011, 0.008, m.display, 0.089, 0, 0, 0.004, sweep);
  sphere(0.021, m.display, -0.4, 0.042, 0.151, console);
  const glyphs = [
    { p: [0.24, 0.248, 0.142], s: [0.45, 0.035, 0.009] },
    { p: [0.17, 0.157, 0.142], s: [0.31, 0.015, 0.009] },
    { p: [0.27, 0.047, 0.142], s: [0.51, 0.02, 0.009] },
    { p: [0.21, -0.066, 0.142], s: [0.39, 0.02, 0.009] },
    { p: [0.29, -0.177, 0.142], s: [0.55, 0.02, 0.009] },
  ];
  instances(new THREE.BoxGeometry(1, 1, 1), m.display, glyphs, console);
  for (let i = 0; i < 4; i++) {
    cylinder(
      0.035,
      0.028,
      i === 3 ? m.display : animatedAccents.experience,
      -0.43 + i * 0.16,
      -0.13,
      -0.16,
    );
  }
  target(
    box(0.46, 0.022, 0.18, m.glass, 0.46, -0.134, -0.18, 0.025),
    'experience',
    'mission-touchpad',
  );
  cylinder(0.3, 0.085, m.edge, 0, -0.945, 0.63);
  cylinder(0.072, 0.33, m.navy, 0, -0.757, 0.63);
  box(0.66, 0.17, 0.56, m.navy, 0, -0.52, 0.64, 0.079);
  box(0.54, 0.1, 0.47, m.linen, 0, -0.429, 0.615, 0.047);
  box(0.59, 0.48, 0.13, m.navy, 0, -0.22, 0.881, 0.063).rotation.x = 0.1;
  box(0.43, 0.1, 0.04, animatedAccents.experience, 0, -0.21, 0.97, 0.019);
  cylinder(0.11, 0.04, m.navy, -1.01, -0.98, -0.28);
  rod([-1.01, -0.96, -0.28], [-1.01, 0.19, -0.28], 0.025, m.edge);
  rod([-1.01, 0.19, -0.28], [-0.87, 0.42, -0.23], 0.03, m.amber);
  sphere(0.065, m.navy, -1.01, 0.19, -0.28);
  const deskLamp = cylinder(0.1, 0.14, m.ivory, -0.85, 0.405, -0.2);
  deskLamp.rotation.z = -0.58;

  // PERSONAL BAY — a berth, soft goods, storage, a circular window, and a plant.
  box(2.02, 0.32, 0.91, m.navy, 3.04, -0.79, -0.58, 0.088);
  box(0.081, 0.58, 0.94, m.edge, 2.06, -0.6, -0.58, 0.04);
  const mattress = box(1.87, 0.24, 0.81, m.chalk, 3.07, -0.511, -0.565, 0.115);
  target(mattress, 'about', 'personal-berth');
  box(1.23, 0.086, 0.816, m.blanket, 3.36, -0.365, -0.566, 0.041);
  box(0.18, 0.037, 0.817, m.linen, 2.859, -0.312, -0.566, 0.014);
  box(0.48, 0.15, 0.57, m.linen, 2.43, -0.33, -0.56, 0.073).rotation.y = -0.035;
  box(1.53, 0.042, 0.028, m.edge, 3.1, -0.8, -0.11, 0.013);
  box(0.29, 0.048, 0.05, animatedAccents.about, 3.1, -0.75, -0.086, 0.022);
  cylinder(0.431, 0.12, m.navy, 3.69, 0.42, -1.014, 'z');
  target(
    cylinder(0.347, 0.026, m.glass, 3.69, 0.42, -0.936, 'z'),
    'about',
    'cabin-porthole',
  );
  torus(0.39, 0.055, m.edge, 3.69, 0.42, -0.909);
  torus(0.336, 0.016, animatedAccents.about, 3.69, 0.42, -0.897);
  const portBolts: Array<{ p: number[] }> = [];
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    portBolts.push({
      p: [3.69 + Math.cos(a) * 0.395, 0.42 + Math.sin(a) * 0.395, -0.848],
    });
  }
  instances(new THREE.SphereGeometry(0.022, 8, 6), m.navy, portBolts);
  box(0.99, 0.073, 0.4, m.ivory, 2.44, 0.345, -0.86, 0.03);
  cylinder(0.116, 0.19, m.blanket, 2.2, 0.477, -0.83, 'y', group, 0.145);
  cylinder(0.12, 0.016, m.deep, 2.2, 0.576, -0.83);
  rod([2.2, 0.573, -0.83], [2.2, 0.924, -0.83], 0.012, m.leaf);
  for (const [x, y, z, angle, scale] of [
    [2.105, 0.7, -0.82, -0.73, 1],
    [2.283, 0.787, -0.8, 0.66, 0.9],
    [2.135, 0.858, -0.83, -0.54, 0.8],
    [2.245, 0.944, -0.83, 0.37, 0.7],
  ]) {
    const leaf = sphere(0.092, m.green, x, y, z);
    leaf.scale.set(0.58 * scale, 1.18 * scale, 0.28 * scale);
    leaf.rotation.z = angle;
  }
  box(0.11, 0.28, 0.21, m.slate, 2.51, 0.52, -0.87, 0.016).rotation.z = -0.09;
  box(0.11, 0.3, 0.21, m.amber, 2.64, 0.531, -0.87, 0.016);
  box(0.22, 0.28, 0.033, m.navy, 2.85, 0.522, -0.92, 0.019);
  box(0.172, 0.228, 0.009, m.linen, 2.85, 0.522, -0.897, 0.01);
  sphere(0.044, m.amber, 2.88, 0.553, -0.887).scale.z = 0.1;
  cylinder(0.27, 0.24, m.navy, 3.77, -0.825, 0.54);
  target(
    cylinder(0.29, 0.14, m.linen, 3.77, -0.63, 0.54),
    'about',
    'cabin-stool',
  );

  // DOCKING NOSE — pressure sleeve, hatch, grab handles and a communications dish.
  cylinder(0.97, 1.05, m.ivory, -5.08, 0.03, 0, 'x');
  cylinder(0.87, 0.44, m.ivory, -5.81, 0.03, 0, 'x', group, 0.97);
  cylinder(0.75, 0.28, m.navy, -6.14, 0.03, 0, 'x');
  torus(0.78, 0.077, m.amber, -6.2, 0.03, 0, 'x');
  cylinder(0.672, 0.065, m.edge, -6.327, 0.03, 0, 'x');
  target(
    cylinder(0.563, 0.045, m.chalk, -6.373, 0.03, 0, 'x'),
    'contact',
    'docking-hatch',
  );
  cylinder(0.142, 0.05, m.navy, -6.409, 0.03, 0, 'x');
  cylinder(0.065, 0.071, animatedAccents.contact, -6.438, 0.03, 0, 'x');
  torus(0.97, 0.032, m.edge, -4.89, 0.03, 0, 'x');
  box(0.62, 0.075, 0.1, m.navy, -5.24, 0.15, 0.987, 0.033);
  box(0.37, 0.08, 0.034, animatedAccents.contact, -5.24, 0.15, 1.054, 0.017);
  box(0.41, 0.2, 0.05, m.navy, -5.24, -0.26, 0.94, 0.035);
  box(0.25, 0.031, 0.009, m.display, -5.24, -0.26, 0.971, 0.007);
  for (const y of [-0.33, 0.39]) {
    rod([-6.419, y, -0.4], [-6.479, y, -0.4], 0.027, m.navy);
    rod([-6.479, y, -0.4], [-6.479, y, -0.16], 0.027, m.amber);
    rod([-6.479, y, -0.16], [-6.419, y, -0.16], 0.027, m.navy);
  }
  cylinder(0.17, 0.16, m.navy, -5.35, 1.0, 0.0);
  rod([-5.35, 1.04, 0.0], [-5.35, 1.56, 0.1], 0.053, m.edge);
  sphere(0.11, m.amber, -5.35, 1.49, 0.09);
  const dishAssembly = new THREE.Group();
  dishAssembly.position.set(-5.35, 1.63, 0.12);
  dishAssembly.rotation.y = -0.12;
  dishAssembly.rotation.x = -0.16;
  group.add(dishAssembly);
  const dishGeometry = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.0, 0),
      new THREE.Vector2(0.095, 0.01),
      new THREE.Vector2(0.2, 0.034),
      new THREE.Vector2(0.32, 0.088),
      new THREE.Vector2(0.44, 0.164),
      new THREE.Vector2(0.49, 0.21),
    ],
    40,
  );
  const dishMaterial = material(palette.ivory, 0.6, 0.1, {
    side: THREE.DoubleSide,
  });
  const dish = target(
    mesh(dishGeometry, dishMaterial, dishAssembly),
    'contact',
    'communications-dish',
  );
  dish.rotation.x = Math.PI / 2;
  torus(0.49, 0.024, m.edge, 0, 0, 0.21, 'z', dishAssembly);
  rod([0, 0, 0.015], [0, 0, 0.43], 0.021, m.navy, dishAssembly);
  sphere(0.068, animatedAccents.contact, 0, 0, 0.43, dishAssembly);
  for (const angle of [Math.PI / 6, (Math.PI * 5) / 6, (Math.PI * 3) / 2]) {
    rod(
      [Math.cos(angle) * 0.44, Math.sin(angle) * 0.44, 0.18],
      [0, 0, 0.39],
      0.01,
      m.edge,
      dishAssembly,
    );
  }

  // ENGINE AND SOLAR WINGS — hinged cell panels feed the shared central bus.
  cylinder(0.88, 0.74, m.ivory, 4.97, 0.02, 0, 'x');
  torus(0.86, 0.055, m.edge, 5.31, 0.02, 0, 'x');
  cylinder(0.62, 0.61, m.navy, 5.63, 0.02, 0, 'x', group, 0.53);
  cylinder(0.56, 0.08, m.edge, 5.965, 0.02, 0, 'x');
  cylinder(0.447, 0.09, m.deep, 6.004, 0.02, 0, 'x');
  torus(0.382, 0.036, m.amber, 6.055, 0.02, 0, 'x');
  cylinder(0.235, 0.05, m.navy, 6.063, 0.02, 0, 'x');
  for (const sign of [-1, 1]) {
    rod([5.11, 0.07, sign * 0.62], [5.65, 0.08, sign * 1.0], 0.074, m.navy);
    cylinder(0.135, 0.25, m.amber, 5.63, 0.08, sign * 0.94, 'x');
    const wing = new THREE.Group();
    wing.position.set(5.7, 0.1, sign * 1.7);
    wing.rotation.x = sign * 0.075;
    group.add(wing);
    box(1.92, 0.105, 1.6, m.navy, 0, 0, 0, 0.04, wing);
    const tiles: Array<{ p: number[]; s: number[] }> = [];
    const alternateTiles: Array<{ p: number[]; s: number[] }> = [];
    const gridlines: Array<{ p: number[]; s: number[] }> = [];
    for (let col = 0; col < 3; col++) {
      for (let row = 0; row < 5; row++) {
        const placement = {
          p: [-0.57 + col * 0.57, 0.064, -0.56 + row * 0.28],
          s: [0.535, 0.018, 0.246],
        };
        ((col + row) % 3 === 0 ? alternateTiles : tiles).push(placement);
        for (let j = 0; j < 3; j++)
          gridlines.push({
            p: [placement.p[0] - 0.16 + j * 0.16, 0.076, placement.p[2]],
            s: [0.005, 0.003, 0.232],
          });
      }
    }
    instances(new THREE.BoxGeometry(1, 1, 1), m.solar, tiles, wing);
    instances(new THREE.BoxGeometry(1, 1, 1), m.solarAlt, alternateTiles, wing);
    instances(new THREE.BoxGeometry(1, 1, 1), m.solarLine, gridlines, wing);
    for (const x of [-0.93, 0.93])
      box(0.047, 0.13, 1.63, m.edge, x, 0.008, 0, 0.02, wing);
    for (const z of [-0.79, 0.79])
      box(1.87, 0.13, 0.048, m.edge, 0, 0.008, z, 0.02, wing);
    box(0.19, 0.045, 0.096, m.amber, -0.92, 0.1, -sign * 0.62, 0.016, wing);
  }
  box(0.41, 0.11, 0.46, m.navy, 4.18, 1.45, -0.45, 0.045);
  rod([4.18, 1.49, -0.45], [4.18, 2.14, -0.45], 0.019, m.edge);
  sphere(0.045, m.amber, 4.18, 2.15, -0.45);

  // Useful semantic anchors for HTML labels, camera focus, or editing tools.
  group.userData.roomAnchors = {
    projects: [-3.0, -0.05, 0.2],
    experience: [0.0, 0.15, 0.18],
    about: [3.0, -0.05, 0.18],
    contact: [-5.35, 1.6, 0.28],
  };
  group.userData.palette = palette;
  group.userData.description =
    'Open three-room research spacecraft with a docking nose and rear solar wings';
  group.updateMatrixWorld(true);

  function update(time: number, active: string) {
    const seconds = Number.isFinite(time) ? time : 0;
    sweep.rotation.z = -seconds * 0.42;
    for (const section of Object.keys(animatedAccents)) {
      animatedAccents[section].emissiveIntensity =
        active === section ? 0.2 + Math.sin(seconds * 2.4) * 0.045 : 0.035;
    }
  }
  return { group, targets, update };
}
