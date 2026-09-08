/**
 * Orbital cutaway, v4. Self-contained procedural Three.js asset.
 * +Y up, +Z open viewing face, -X docking nose. Rooms remain at X -3 / 0 / 3.
 * Every visible mesh carries userData.section and is returned as a pick target.
 * Static parts are batched per room/material; repeated fittings use instancing.
 */
export function createSpacecraft(
  THREE: any,
  options: { accent?: string; labels?: Record<string, string> } = {},
): {
  group: any;
  targets: Array<{ object: any; section: string }>;
  update: (time: number, active: string, instantHighlight?: boolean) => void;
} {
  const group = new THREE.Group();
  group.name = 'orbital-pressure-vessel';
  const targets: Array<{ object: any; section: string }> = [];
  const cache = new Map<string, any>();
  const materials = new Map<string, any>();
  const roomMaterials: Record<string, any[]> = {};
  const roomLights: Record<string, any> = {};
  const strengths: Record<string, number> = {};
  const palette = {
    ivory: 0xdcd6c6, chalk: 0xe9e3d4, edge: 0x919e99,
    navy: 0x1c2c35, deep: 0x111f29, slate: 0x586d6a,
    amber: options.accent ? new THREE.Color(options.accent).getHex() : 0xe6a34c,
    linen: 0xbab5a3, blue: 0x8ec5cf, green: 0x77907c,
  };
  const mat = (name: string, color: number, roughness = 0.5, metalness = 0.12, extra = {}) => {
    const result = new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
    result.name = name;
    result.userData.highlightScale = name === 'signal-amber' ? 0.45 : name.includes('light') ? 0.07 : 0.14;
    return result;
  };
  const m = {
    shell: mat('ceramic-hull', palette.ivory, 0.43, 0.09),
    chalk: mat('interior-enamel', palette.chalk, 0.54, 0.04),
    liner: mat('warm-insulation', 0xbabdaf, 0.76, 0.01),
    gasket: mat('graphite-gasket', 0x182a2d, 0.82, 0.02),
    navy: mat('graphite-enamel', palette.navy, 0.37, 0.28),
    deep: mat('recess', palette.deep, 0.69, 0.12),
    metal: mat('brushed-titanium', palette.edge, 0.34, 0.63),
    slate: mat('sage-utility', palette.slate, 0.44, 0.25),
    amber: mat('signal-amber', palette.amber, 0.34, 0.26),
    linen: mat('woven-linen', palette.linen, 0.94, 0.0),
    blanket: mat('woven-ochre', 0xc89253, 0.96, 0.0, { side: THREE.DoubleSide }),
    glass: mat('blue-optical-glass', 0x244d5c, 0.18, 0.46, { emissive: 0x285362, emissiveIntensity: 0.14 }),
    display: mat('display-light', palette.blue, 0.38, 0.12, { emissive: palette.blue, emissiveIntensity: 0.38 }),
    screen: mat('screen', 0x163844, 0.3, 0.12, { emissive: 0x193b47, emissiveIntensity: 0.28 }),
    light: mat('warm-light', 0xfde5b1, 0.3, 0.0, { emissive: 0xffc574, emissiveIntensity: 1.1 }),
    green: mat('sage-leaves', palette.green, 0.87, 0.0),
    leaf: mat('deep-leaves', 0x4d725c, 0.88, 0.0),
    solar: mat('solar-cells', 0x071827, 0.56, 0.20),
    solarAlt: mat('solar-cells-alt', 0x0e2336, 0.58, 0.19),
    solarLine: mat('solar-conductors', 0x405c6b, 0.56, 0.30),
  };

  // A tiny deterministic weave adds close-up material variation without assets.
  const weaveData = new Uint8Array(64 * 64 * 4);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const i = (y * 64 + x) * 4;
    const value = 178 + ((x % 4 < 2) !== (y % 4 < 2) ? 45 : 0) + ((x * 17 + y * 31) % 11);
    weaveData[i] = weaveData[i + 1] = weaveData[i + 2] = value;
    weaveData[i + 3] = 255;
  }
  const weave = new THREE.DataTexture(weaveData, 64, 64);
  weave.wrapS = weave.wrapT = THREE.RepeatWrapping;
  weave.magFilter = weave.minFilter = THREE.LinearFilter;
  weave.repeat.set(7, 7);
  weave.needsUpdate = true;
  for (const fabric of [m.linen, m.blanket]) { fabric.bumpMap = weave; fabric.bumpScale = 0.004; }

  const rooms: Record<string, any> = {};
  for (const section of ['projects', 'experience', 'about', 'contact']) {
    const room = new THREE.Group();
    room.name = section + '-assembly';
    room.userData.section = section;
    group.add(room);
    rooms[section] = room;
    strengths[section] = 0;
    roomMaterials[section] = [];
  }
  function sectionOf(parent: any): string {
    return parent.userData.section || (parent.parent ? sectionOf(parent.parent) : 'about');
  }
  function roomMat(original: any, section: string) {
    const key = original.uuid + ':' + section;
    if (!materials.has(key)) {
      const clone = original.clone();
      clone.userData.baseEmissive = original.emissive.clone();
      clone.userData.baseIntensity = original.emissiveIntensity;
      clone.userData.highlightScale = original.userData.highlightScale ?? 0.035;
      roomMaterials[section].push(clone);
      materials.set(key, clone);
    }
    return materials.get(key);
  }
  function cached(key: string, make: () => any) {
    if (!cache.has(key)) cache.set(key, make());
    return cache.get(key);
  }
  // Segment placement is concentrated on the radiused edges of the cuboid.
  function roundedGeometry(w: number, h: number, d: number, radius = 0.04) {
    const r = Math.min(radius, w * 0.495, h * 0.495, d * 0.495);
    return cached(`rounded:${w}:${h}:${d}:${r}`, () => {
      const segments = Math.max(w, h, d) > 0.4 ? 10 : 6;
      const geometry = new THREE.BoxGeometry(w, h, d, segments, segments, segments);
      const positions = geometry.attributes.position, normals = geometry.attributes.normal, uv = geometry.attributes.uv;
      const half = [w / 2, h / 2, d / 2], core = half.map((v: number) => v - r);
      const steps = segments === 10 ? [-1, -0.8, -0.45, -0.18, 0, 0, 0, 0.18, 0.45, 0.8, 1] : [-1, -0.45, 0, 0, 0, 0.45, 1];
      for (let i = 0; i < positions.count; i++) {
        const original = [positions.getX(i), positions.getY(i), positions.getZ(i)];
        const originalNormal = [normals.getX(i), normals.getY(i), normals.getZ(i)];
        const p = original.map((v: number, a: number) => {
          const index = Math.round((v / half[a] + 1) * segments / 2);
          return index === segments / 2 ? 0 : Math.sign(index - segments / 2) * (core[a] + Math.abs(steps[index]) * r);
        });
        const c = p.map((v: number, a: number) => Math.max(-core[a], Math.min(core[a], v)));
        const n = new THREE.Vector3(p[0] - c[0], p[1] - c[1], p[2] - c[2]).normalize();
        const px = c[0] + n.x * r, py = c[1] + n.y * r, pz = c[2] + n.z * r;
        positions.setXYZ(i, px, py, pz);
        // Face UVs follow the remapped physical position, so screens and fabric
        // occupy the whole face instead of a magnified central texture crop.
        if (originalNormal[0]) uv.setXY(i, 0.5 - Math.sign(originalNormal[0]) * pz / d, py / h + 0.5);
        else if (originalNormal[1]) uv.setXY(i, px / w + 0.5, 0.5 - Math.sign(originalNormal[1]) * pz / d);
        else uv.setXY(i, 0.5 + Math.sign(originalNormal[2]) * px / w, py / h + 0.5);
        normals.setXYZ(i, n.x, n.y, n.z);
      }
      geometry.computeBoundingSphere();
      return geometry;
    });
  }
  function mesh(geometry: any, material: any, parent: any, name = '') {
    const section = sectionOf(parent);
    const object = new THREE.Mesh(geometry, roomMat(material, section));
    object.name = name || material.name;
    object.userData.section = section;
    object.castShadow = object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  function box(w: number, h: number, d: number, material: any, x: number, y: number, z: number, parent: any, radius = 0.035, name = '') {
    const result = mesh(roundedGeometry(w, h, d, radius), material, parent, name);
    result.position.set(x, y, z);
    return result;
  }
  function cylinder(radius: number, length: number, material: any, x: number, y: number, z: number, parent: any, axis = 'y', radiusTop = radius, segments = 40) {
    const geometry = cached(`cylinder:${radius}:${radiusTop}:${length}:${segments}`, () => new THREE.CylinderGeometry(radiusTop, radius, length, segments, 1));
    const result = mesh(geometry, material, parent);
    result.position.set(x, y, z);
    if (axis === 'x') result.rotation.z = -Math.PI / 2;
    if (axis === 'z') result.rotation.x = Math.PI / 2;
    return result;
  }
  function torus(radius: number, tube: number, material: any, x: number, y: number, z: number, parent: any, axis = 'z') {
    const geometry = cached(`torus:${radius}:${tube}`, () => new THREE.TorusGeometry(radius, tube, 10, 56));
    const result = mesh(geometry, material, parent);
    result.position.set(x, y, z);
    if (axis === 'x') result.rotation.y = Math.PI / 2;
    if (axis === 'y') result.rotation.x = Math.PI / 2;
    return result;
  }
  function sphere(radius: number, material: any, x: number, y: number, z: number, parent: any) {
    const geometry = cached(`sphere:${radius}`, () => new THREE.SphereGeometry(radius, 24, 16));
    const result = mesh(geometry, material, parent);
    result.position.set(x, y, z);
    return result;
  }
  function rod(from: number[], to: number[], radius: number, material: any, parent: any) {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
    const object = cylinder(radius, a.distanceTo(b), material, 0, 0, 0, parent);
    object.position.copy(a).add(b).multiplyScalar(0.5);
    object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
    return object;
  }
  type Transform = { p: number[]; s?: number[]; r?: number[] };
  function instances(geometry: any, material: any, transforms: Transform[], parent: any, name: string) {
    if (!transforms.length) return;
    const section = sectionOf(parent);
    const object = new THREE.InstancedMesh(geometry, roomMat(material, section), transforms.length);
    const dummy = new THREE.Object3D();
    transforms.forEach((t, i) => {
      dummy.position.set(...t.p);
      dummy.rotation.set(...(t.r || [0, 0, 0]));
      dummy.scale.set(...(t.s || [1, 1, 1]));
      dummy.updateMatrix();
      object.setMatrixAt(i, dummy.matrix);
    });
    object.instanceMatrix.needsUpdate = true;
    object.castShadow = object.receiveShadow = true;
    object.userData.section = section;
    object.name = name;
    parent.add(object);
    return object;
  }
  function roundedPath(path: any, w: number, h: number, r: number) {
    const x = -w / 2, y = -h / 2;
    path.moveTo(x + r, y);
    path.lineTo(x + w - r, y); path.quadraticCurveTo(x + w, y, x + w, y + r);
    path.lineTo(x + w, y + h - r); path.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    path.lineTo(x + r, y + h); path.quadraticCurveTo(x, y + h, x, y + h - r);
    path.lineTo(x, y + r); path.quadraticCurveTo(x, y, x + r, y);
    return path;
  }
  function frameGeometry(w: number, h: number, r: number, thickness: number, depth: number) {
    return cached(`frame:${w}:${h}:${r}:${thickness}:${depth}`, () => {
      const shape = roundedPath(new THREE.Shape(), w, h, r);
      shape.holes.push(roundedPath(new THREE.Path(), w - thickness * 2, h - thickness * 2, Math.max(0.02, r - thickness)));
      const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: 0.018, bevelThickness: 0.018, bevelSegments: 3, steps: 1, curveSegments: 16 });
      geometry.translate(0, 0, -depth / 2);
      return geometry;
    });
  }
  function plaque(text: string, subtext: string, w: number, h: number, x: number, y: number, z: number, parent: any, dark = false) {
    if (typeof document === 'undefined') return;
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = Math.round(1024 * h / w);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = dark ? '#223640' : '#e6e5db'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = dark ? '#bad1cf' : '#2b4047';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = '600 58px Arial, sans-serif';
    ctx.fillText(text.toUpperCase().slice(0, 36), 55, canvas.height * 0.41, 915);
    ctx.fillStyle = dark ? '#809a9e' : '#778782';
    ctx.font = '400 23px monospace';
    ctx.fillText(subtext.toUpperCase().slice(0, 65), 58, canvas.height * 0.77, 900);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const material = mat('identification-label', 0xffffff, 0.58, 0.08, { map: texture });
    const face = mesh(new THREE.PlaneGeometry(w, h), material, parent, 'label-' + text);
    face.position.set(x, y, z);
  }

  // One continuous, rounded pressure skin per bay: floor, rear wall and roof lip.
  const shellShape = new THREE.Shape();
  shellShape.moveTo(-1.27, -1.26);
  shellShape.lineTo(0.69, -1.26);
  shellShape.quadraticCurveTo(1.34, -1.26, 1.34, -0.61);
  shellShape.lineTo(1.34, 0.83);
  shellShape.quadraticCurveTo(1.34, 1.49, 0.69, 1.49);
  shellShape.lineTo(0.25, 1.49); shellShape.lineTo(0.25, 1.26);
  shellShape.lineTo(0.69, 1.26);
  shellShape.quadraticCurveTo(1.12, 1.26, 1.12, 0.82);
  shellShape.lineTo(1.12, -0.61);
  shellShape.quadraticCurveTo(1.12, -1.04, 0.69, -1.04);
  shellShape.lineTo(-1.27, -1.04); shellShape.closePath();
  const shellGeometry = new THREE.ExtrudeGeometry(shellShape, { depth: 2.82, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 3, curveSegments: 18, steps: 1 });
  shellGeometry.rotateY(Math.PI / 2);
  shellGeometry.translate(-1.41, 0, 0);
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const boltGeometry = new THREE.CylinderGeometry(0.026, 0.026, 0.015, 6);
  boltGeometry.rotateX(Math.PI / 2);
  const structuralFrame = frameGeometry(2.76, 2.96, 0.67, 0.205, 0.26);
  // Only the thin center band projects beyond the ivory bulkhead. Its axial
  // depth must remain below the frame's 0.26 depth, or it encloses that frame.
  const outerJoint = frameGeometry(2.785, 2.99, 0.68, 0.223, 0.055);
  const pressureGasket = frameGeometry(2.328, 2.528, 0.456, 0.051, 0.243);
  for (const [index, x] of [-3, 0, 3].entries()) {
    const section = ['projects', 'experience', 'about'][index], room = rooms[section];
    const shell = mesh(shellGeometry, m.shell, room, section + '-pressure-hull');
    shell.position.x = x;
    // Subdeck and individually removable tread plates create a visible floor build-up.
    box(2.81, 0.095, 2.30, m.gasket, x, -1.017, 0.05, room, 0.045, 'deck-isolation');
    for (let col = 0; col < 3; col++) for (let row = 0; row < 3; row++) {
      box(0.866, 0.035, 0.671, (row + col) % 3 === 0 ? m.liner : m.linen, x - 0.889 + col * 0.889, -0.951, -0.68 + row * 0.7, room, 0.012, 'floor-access-panel');
    }
    // Thin dark joints and broad convex padding behind the furniture.
    box(2.62, 1.66, 0.055, m.gasket, x, 0.0, -1.075, room, 0.19, 'liner-underlay');
    for (let col = 0; col < 3; col++) {
      box(0.84, 1.59, 0.076, m.liner, x - 0.875 + col * 0.875, 0.0, -1.037, room, 0.115, 'insulation-panel');
    }
    box(2.49, 0.08, 0.14, m.navy, x, -0.83, -0.96, room, 0.035, 'lower-service-raceway');
    box(2.52, 0.06, 0.065, m.metal, x, 1.068, -0.82, room, 0.025, 'overhead-track');
    // The connected canopy is a substantial curved pressure skin, with an
    // exposed dark gasket along the sawn-away front edge of the roof.
    box(2.842, 0.22, 0.995, m.shell, x, 1.46, 0.279, room, 0.106, 'rounded-canopy-pressure-skin');
    box(2.731, 0.079, 0.846, m.gasket, x, 1.336, 0.269, room, 0.038, 'canopy-insulation-gutter');
    box(2.65, 0.037, 0.711, m.liner, x, 1.284, 0.208, room, 0.018, 'canopy-inner-liner');
    box(2.68, 0.073, 0.07, m.navy, x, 1.345, 0.785, room, 0.033, 'front-cutaway-pressure-seal');
    box(2.41, 0.071, 0.154, m.gasket, x, 1.275, 0.547, room, 0.031, 'lighting-rail-housing');
    box(2.29, 0.029, 0.095, m.light, x, 1.224, 0.567, room, 0.014, 'lighting-rail-diffuser');
    const light = new THREE.PointLight(0xffd199, 0.52, 3.1, 2);
    light.position.set(x, 0.80, 0.30); room.add(light); roomLights[section] = light;
    // Recessed fascia sits behind the rolled white outer rim.
    box(2.83, 0.337, 0.266, m.shell, x, -1.235, 1.126, room, 0.129, 'rounded-lower-hull-fairing');
    box(2.70, 0.162, 0.06, m.navy, x, -1.15, 1.286, room, 0.04, 'front-service-strip');
    box(2.59, 0.072, 0.13, m.shell, x, -1.038, 1.288, room, 0.034, 'rolled-deck-rim');
    box(2.22, 0.325, 0.095, m.gasket, x, -1.297, 1.31, room, 0.055, 'room-label-bezel');
    box(2.08, 0.262, 0.026, m.liner, x, -1.291, 1.372, room, 0.024, 'room-label-insert');
    plaque(options.labels?.[section] || `MOD-0${index + 1}`, `0${index + 1} / MOD-0${index + 1}`, 1.89, 0.239, x + 0.018, -1.29, 1.392, room);
    const bolts: Transform[] = [], slots: Transform[] = [], marks: Transform[] = [], clamps: Transform[] = [];
    for (const dx of [-1.23, 1.23]) {
      bolts.push({ p: [x + dx, -1.15, 1.327] });
      box(0.081, 0.129, 0.034, m.amber, x + dx, -1.143, 1.344, room, 0.016, 'bay-status-marker');
    }
    for (let i = 0; i < 10; i++) slots.push({ p: [x - 1.0 + i * 0.22, -0.924, 0.982], s: [0.13, 0.008, 0.024] });
    for (let i = 0; i < 5; i++) marks.push({ p: [x - 0.72 + i * 0.36, -0.924, 0.867], s: [0.135, 0.009, 0.035] });
    for (const dx of [-1.02, 0, 1.02]) clamps.push({ p: [x + dx, 1.266, 0.547], s: [0.039, 0.083, 0.175] });
    instances(boltGeometry, m.metal, bolts, room, 'fascia-fasteners');
    instances(unitBox, m.gasket, slots, room, 'non-slip-tread-inlays');
    instances(unitBox, m.amber, marks, room, 'threshold-wayfinding');
    instances(unitBox, m.metal, clamps, room, 'lighting-rail-clips');
    // Framed end bulkheads read as thick engineered pressure rings in perspective.
    const framePositions = index === 0 ? [-4.5, -1.5] : [x + 1.5];
    for (const fx of framePositions) {
      const joint = mesh(outerJoint, m.gasket, room, 'outer-hull-expansion-joint');
      joint.rotation.y = Math.PI / 2; joint.position.set(fx, 0.10, 0);
      const outer = mesh(structuralFrame, m.shell, room, 'rounded-pressure-bulkhead');
      outer.rotation.y = Math.PI / 2; outer.position.set(fx, 0.10, 0);
      const inner = mesh(pressureGasket, m.gasket, room, 'continuous-pressure-gasket');
      inner.rotation.y = Math.PI / 2; inner.position.set(fx, 0.10, 0);
      box(0.22, 0.095, 1.98, m.metal, fx, -0.952, 0.04, room, 0.033, 'doorway-sill');
      box(0.10, 0.47, 0.057, m.amber, fx, 0.27, 1.426, room, 0.028, 'bulkhead-grip-insert');
      box(0.12, 0.086, 0.074, m.navy, fx, 0.55, 1.415, room, 0.025, 'grip-endcap');
      box(0.12, 0.086, 0.074, m.navy, fx, -0.01, 1.415, room, 0.025, 'grip-endcap');
      const ribBolts: Transform[] = [];
      for (const yy of [-0.83, -0.55, 0.79, 0.99]) ribBolts.push({ p: [fx, yy, yy > 0.9 ? 1.406 : 1.421] });
      instances(boltGeometry, m.metal, ribBolts, room, 'bulkhead-fasteners');
    }
    box(2.92, 0.22, 1.40, m.navy, x, -1.40, -0.10, room, 0.095, 'structural-keel');
    cylinder(0.067, 2.93, m.amber, x, -1.433, 0.68, room, 'x');
    cylinder(0.055, 2.91, m.metal, x, -1.47, -0.69, room, 'x');
  }

  // PROJECTS — sealed archive lockers, hard cargo, and a modular equipment rack.
  const project = rooms.projects;
  box(1.85, 1.69, 0.61, m.navy, -3.48, -0.07, -0.71, project, 0.14, 'locker-carcass');
  box(1.87, 0.10, 0.64, m.metal, -3.48, -0.865, -0.70, project, 0.033, 'locker-plinth');
  box(1.82, 0.062, 0.56, m.amber, -3.48, 0.803, -0.72, project, 0.03, 'locker-top-rail');
  const lockerBolts: Transform[] = [], ventSlots: Transform[] = [], hinges: Transform[] = [];
  for (const [i, x] of [-3.93, -3.03].entries()) {
    box(0.852, 1.55, 0.105, m.gasket, x, -0.064, -0.368, project, 0.092, 'locker-door-seal');
    box(0.794, 1.49, 0.113, m.chalk, x, -0.052, -0.295, project, 0.078, 'project-locker-door');
    box(0.58, 0.18, 0.019, m.slate, x, 0.47, -0.229, project, 0.025, 'locker-label-recess');
    plaque(`ST-0${i + 1}`, `S/N 0${i + 1}-024`, 0.525, 0.142, x, 0.471, -0.216, project, true);
    box(0.63, 0.68, 0.018, m.shell, x, -0.162, -0.227, project, 0.056, 'locker-raised-panel');
    box(0.14, 0.373, 0.06, m.gasket, x + 0.21, -0.008, -0.177, project, 0.05, 'latch-pocket');
    box(0.064, 0.273, 0.064, m.amber, x + 0.21, -0.012, -0.128, project, 0.031, 'locker-latch');
    cylinder(0.03, 0.012, m.metal, x + 0.209, 0.127, -0.113, project, 'z', 0.03, 12);
    for (const yy of [-0.48, 0.42]) hinges.push({ p: [x - 0.364, yy, -0.202], s: [0.04, 0.14, 0.066] });
    for (let j = 0; j < 5; j++) ventSlots.push({ p: [x - 0.21 + j * 0.087, -0.64, -0.221], s: [0.048, 0.019, 0.012] });
    for (const dx of [-0.325, 0.325]) for (const yy of [-0.715, 0.608]) lockerBolts.push({ p: [x + dx, yy, -0.226] });
  }
  instances(roundedGeometry(1, 1, 1, 0.12), m.metal, hinges, project, 'locker-hinges');
  instances(unitBox, m.gasket, ventSlots, project, 'locker-vent-slots');
  instances(boltGeometry, m.metal, lockerBolts, project, 'locker-captive-fasteners');
  const cargo = new THREE.Group(); cargo.position.set(-3.85, -0.665, 0.49); cargo.rotation.y = -0.13; project.add(cargo);
  box(0.77, 0.49, 0.66, m.slate, 0, 0, 0, cargo, 0.10, 'sealed-project-case');
  box(0.79, 0.06, 0.679, m.gasket, 0, 0.215, 0, cargo, 0.027, 'case-lid-gasket');
  box(0.795, 0.10, 0.68, m.liner, 0, 0.272, 0, cargo, 0.045, 'case-lid');
  box(0.52, 0.019, 0.39, m.slate, 0, 0.33, 0, cargo, 0.027, 'case-lid-inset');
  for (const xx of [-0.24, 0.24]) {
    box(0.075, 0.54, 0.697, m.navy, xx, 0.012, 0, cargo, 0.03, 'case-retaining-band');
    box(0.11, 0.16, 0.069, m.amber, xx, 0.088, 0.377, cargo, 0.026, 'case-over-center-latch');
    box(0.058, 0.063, 0.018, m.metal, xx, 0.104, 0.42, cargo, 0.012, 'case-latch-tab');
  }
  box(0.27, 0.106, 0.068, m.deep, 0, -0.018, 0.362, cargo, 0.028, 'case-handle-recess');
  box(0.18, 0.03, 0.04, m.metal, 0, 0.012, 0.408, cargo, 0.013, 'case-folding-handle');
  // Rack at the aisle side preserves the doorway between bays.
  box(0.64, 1.29, 0.50, m.navy, -2.08, -0.236, -0.735, project, 0.065, 'equipment-rack-frame');
  box(0.52, 1.16, 0.475, m.deep, -2.08, -0.233, -0.695, project, 0.044, 'equipment-rack-interior');
  for (const yy of [-0.814, -0.10, 0.36]) box(0.63, 0.057, 0.53, m.metal, -2.08, yy, -0.665, project, 0.021, 'rack-shelf');
  for (let i = 0; i < 3; i++) {
    box(0.136, 0.55 - i * 0.028, 0.36, i === 1 ? m.amber : m.liner, -2.257 + i * 0.175, -0.512 - i * 0.014, -0.628, project, 0.031, 'project-data-cartridge');
    box(0.07, 0.12, 0.014, m.navy, -2.257 + i * 0.175, -0.36, -0.439, project, 0.012, 'cartridge-index-label');
  }
  box(0.43, 0.266, 0.37, m.shell, -2.08, 0.078, -0.647, project, 0.048, 'navigation-instrument');
  box(0.30, 0.105, 0.035, m.navy, -2.08, 0.096, -0.442, project, 0.021, 'instrument-front');
  box(0.15, 0.025, 0.012, m.display, -2.12, 0.096, -0.418, project, 0.009, 'instrument-status');
  box(0.59, 0.09, 0.35, m.slate, -2.63, -0.881, 0.48, project, 0.037, 'equipment-docking-pad');
  cylinder(0.125, 0.31, m.metal, -2.64, -0.677, 0.48, project);
  cylinder(0.128, 0.064, m.amber, -2.64, -0.503, 0.48, project);
  torus(0.097, 0.018, m.navy, -2.64, -0.455, 0.48, project, 'y');

  // EXPERIENCE — illuminated instrument console with tactile controls and a seat.
  const mission = rooms.experience;
  box(1.97, 0.145, 0.84, m.chalk, -0.02, -0.235, -0.35, mission, 0.071, 'mission-worktop');
  box(1.76, 0.075, 0.73, m.navy, -0.02, -0.342, -0.36, mission, 0.03, 'console-undertray');
  box(1.84, 0.036, 0.047, m.amber, -0.02, -0.228, 0.081, mission, 0.017, 'console-front-inlay');
  box(0.41, 0.50, 0.44, m.navy, -0.10, -0.621, -0.48, mission, 0.085, 'console-pedestal');
  box(0.86, 0.081, 0.63, m.metal, -0.10, -0.892, -0.45, mission, 0.035, 'console-baseplate');
  const screenGroup = new THREE.Group(); screenGroup.position.set(-0.04, 0.414, -0.802); screenGroup.rotation.x = -0.08; mission.add(screenGroup);
  box(1.98, 1.09, 0.19, m.gasket, 0, 0, 0, screenGroup, 0.116, 'monitor-soft-housing');
  box(1.89, 1.015, 0.041, m.metal, 0, 0.0, 0.1, screenGroup, 0.078, 'monitor-machined-bezel');
  box(1.79, 0.9, 0.025, m.deep, 0, 0.012, 0.132, screenGroup, 0.058, 'monitor-optical-seal');
  const displayMaterial = m.screen.clone(); displayMaterial.name = 'mission-screen';
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas'); canvas.width = 1536; canvas.height = 768;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createLinearGradient(0, 0, 1536, 768); gradient.addColorStop(0, '#14313c'); gradient.addColorStop(1, '#1e414c');
      ctx.fillStyle = gradient; ctx.fillRect(0, 0, 1536, 768);
      ctx.strokeStyle = '#345661'; ctx.lineWidth = 1.25;
      for (let x = 55; x < 1490; x += 67) { ctx.beginPath(); ctx.moveTo(x, 136); ctx.lineTo(x, 690); ctx.stroke(); }
      for (let y = 136; y < 710; y += 67) { ctx.beginPath(); ctx.moveTo(55, y); ctx.lineTo(1480, y); ctx.stroke(); }
      ctx.fillStyle = '#bdd5d2'; ctx.font = '500 38px Arial'; ctx.fillText((options.labels?.experience || 'SYS-02').toUpperCase().slice(0, 36), 60, 77, 985);
      ctx.font = '22px monospace'; ctx.fillStyle = '#82b2bb'; ctx.fillText('02 / 024', 1240, 73);
      ctx.strokeStyle = '#78adb8'; ctx.lineWidth = 3;
      for (const r of [89, 159, 227]) { ctx.beginPath(); ctx.arc(362, 410, r, 0, Math.PI * 2); ctx.stroke(); }
      ctx.strokeStyle = '#cda05d'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(362, 410, 245, 109, -0.45, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#afd4d6'; ctx.beginPath(); ctx.arc(362, 410, 49, 0, Math.PI * 2); ctx.fill();
      for (const [x, y] of [[196, 515], [497, 341], [400, 189]]) { ctx.fillStyle = '#f1bd73'; ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#abc9cb'; ctx.font = '30px monospace'; ctx.fillText('02 / 024 / 004', 715, 190);
      const serials = ['024.001', '024.002', '024.003'];
      for (let i = 0; i < 3; i++) {
        const y = 282 + i * 110;
        ctx.fillStyle = '#7d9fa8'; ctx.font = '21px monospace'; ctx.fillText('0' + (i + 1), 718, y);
        ctx.fillStyle = '#b5cece'; ctx.font = '23px monospace'; ctx.fillText(serials[i], 777, y);
        ctx.fillStyle = '#395d66'; ctx.fillRect(778, y + 24, 601, 8);
        ctx.fillStyle = i === 1 ? '#d4a561' : '#82b5bf'; ctx.fillRect(778, y + 24, [457, 518, 387][i], 8);
      }
      ctx.strokeStyle = '#88b6bf'; ctx.lineWidth = 3; ctx.beginPath();
      for (let i = 0; i <= 30; i++) { const x = 720 + i * 22, y = 663 - Math.sin(i * 0.69) * 11 - i * 1.9; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke();
      ctx.fillStyle = '#748f96'; ctx.font = '18px monospace'; ctx.fillText('SYS-02 / 024', 67, 710);
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      displayMaterial.map = texture; displayMaterial.emissiveMap = texture;
      displayMaterial.color.set(0xffffff); displayMaterial.emissive.set(0xaec4c8); displayMaterial.emissiveIntensity = 0.28;
    }
  }
  box(1.714, 0.83, 0.024, displayMaterial, 0, 0.014, 0.151, screenGroup, 0.034, 'mission-display');
  const monitorScrews: Transform[] = [];
  for (const xx of [-0.908, 0.908]) for (const yy of [-0.436, 0.437]) monitorScrews.push({ p: [xx, yy, 0.132] });
  instances(boltGeometry, m.navy, monitorScrews, screenGroup, 'monitor-bezel-fasteners');
  box(0.89, 0.023, 0.022, m.amber, 0, -0.479, 0.129, screenGroup, 0.01, 'monitor-activity-strip');
  const sweep = new THREE.Group(); sweep.position.set(-0.452, 0.0, 0.173); screenGroup.add(sweep);
  sweep.userData.animated = true;
  const sweepMaterial = m.display.clone(); sweepMaterial.transparent = true; sweepMaterial.opacity = 0.42;
  box(0.221, 0.007, 0.003, sweepMaterial, 0.101, 0, 0, sweep, 0.0015, 'radar-sweep');
  box(0.97, 0.037, 0.34, m.navy, -0.255, -0.14, -0.228, mission, 0.033, 'keyboard-well');
  const keys: Transform[] = [], hotkeys: Transform[] = [];
  for (let row = 0; row < 3; row++) for (let col = 0; col < 10; col++) {
    const t = { p: [-0.655 + col * 0.089, -0.11, -0.332 + row * 0.094], s: [0.067, 0.022, 0.063] };
    (col > 7 ? hotkeys : keys).push(t);
  }
  instances(roundedGeometry(1, 0.32, 1, 0.14), m.metal, keys.map(t => ({ ...t, s: [t.s![0], t.s![1] / 0.32, t.s![2]] })), mission, 'console-keycaps');
  instances(unitBox, m.amber, hotkeys, mission, 'console-function-keys');
  box(0.38, 0.035, 0.29, m.gasket, 0.552, -0.128, -0.24, mission, 0.042, 'touch-controller-body');
  box(0.293, 0.014, 0.20, m.glass, 0.552, -0.101, -0.24, mission, 0.025, 'mission-touchpad');
  for (const xx of [-0.64, -0.34, -0.04, 0.26]) {
    cylinder(0.047, 0.038, m.navy, xx, -0.139, -0.657, mission);
    cylinder(0.031, 0.016, m.amber, xx, -0.11, -0.657, mission, 'y', 0.031, 24);
  }
  // Swivel chair, with a padded shell, lumbar insert, arms, and a five-spoke base.
  const chair = new THREE.Group(); chair.position.set(0.31, 0, 0.645); chair.rotation.y = 0.17; mission.add(chair);
  cylinder(0.096, 0.38, m.metal, 0, -0.702, 0, chair);
  cylinder(0.153, 0.074, m.navy, 0, -0.875, 0, chair);
  for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; rod([0, -0.847, 0], [Math.sin(a) * 0.327, -0.901, Math.cos(a) * 0.327], 0.032, m.navy, chair); sphere(0.057, m.gasket, Math.sin(a) * 0.323, -0.902, Math.cos(a) * 0.323, chair).scale.y = 0.45; }
  box(0.68, 0.148, 0.59, m.navy, 0, -0.503, 0, chair, 0.073, 'seat-pan');
  box(0.564, 0.107, 0.492, m.linen, 0, -0.408, -0.025, chair, 0.051, 'seat-cushion');
  box(0.64, 0.554, 0.158, m.navy, 0, -0.217, 0.279, chair, 0.077, 'seat-back-shell').rotation.x = 0.10;
  box(0.512, 0.39, 0.058, m.linen, 0, -0.201, 0.174, chair, 0.028, 'seat-back-padding').rotation.x = 0.10;
  box(0.4, 0.072, 0.035, m.amber, 0, -0.17, 0.388, chair, 0.017, 'seat-back-identity-inlay');
  for (const sign of [-1, 1]) { rod([sign * 0.278, -0.47, 0.09], [sign * 0.36, -0.245, 0.075], 0.029, m.metal, chair); box(0.095, 0.055, 0.35, m.navy, sign * 0.35, -0.208, -0.015, chair, 0.026, 'chair-armrest'); }
  // Task lamp and an aisle-side equipment panel.
  cylinder(0.099, 0.037, m.navy, -1.04, -0.917, -0.21, mission);
  rod([-1.04, -0.904, -0.21], [-1.04, 0.08, -0.21], 0.023, m.metal, mission);
  sphere(0.059, m.amber, -1.04, 0.08, -0.21, mission);
  rod([-1.04, 0.08, -0.21], [-0.94, 0.43, -0.25], 0.023, m.navy, mission);
  box(0.27, 0.081, 0.17, m.shell, -0.91, 0.434, -0.22, mission, 0.038, 'task-light-head').rotation.z = -0.18;
  box(0.19, 0.017, 0.115, m.light, -0.91, 0.386, -0.21, mission, 0.008, 'task-light-lens');
  box(0.30, 0.69, 0.18, m.navy, 1.121, 0.185, -0.895, mission, 0.056, 'auxiliary-instrument');
  box(0.209, 0.29, 0.024, m.glass, 1.121, 0.325, -0.792, mission, 0.026, 'auxiliary-display');
  const status: Transform[] = [];
  for (let i = 0; i < 3; i++) status.push({ p: [1.121, 0.054 - i * 0.09, -0.792], s: [0.11, 0.025, 0.013] });
  instances(unitBox, m.amber, status, mission, 'auxiliary-status-indicators');

  // ABOUT — a soft berth, stowage drawers, porthole, books, and a living plant.
  const cabin = rooms.about;
  box(2.085, 0.321, 0.967, m.navy, 3.065, -0.751, -0.526, cabin, 0.117, 'berth-stowage-base');
  for (const xx of [2.585, 3.537]) {
    box(0.887, 0.23, 0.039, m.gasket, xx, -0.746, -0.019, cabin, 0.037, 'berth-drawer-seal');
    box(0.835, 0.19, 0.054, m.shell, xx, -0.746, 0.014, cabin, 0.039, 'berth-storage-drawer');
    box(0.211, 0.035, 0.029, m.navy, xx, -0.709, 0.054, cabin, 0.015, 'drawer-recessed-pull');
  }
  box(0.095, 0.56, 0.98, m.metal, 2.028, -0.583, -0.53, cabin, 0.046, 'berth-head-support');
  box(1.973, 0.246, 0.875, m.chalk, 3.081, -0.487, -0.533, cabin, 0.121, 'personal-berth');
  box(1.848, 0.023, 0.824, m.liner, 3.08, -0.362, -0.533, cabin, 0.010, 'mattress-piping');
  box(0.521, 0.172, 0.626, m.linen, 2.4, -0.31, -0.54, cabin, 0.085, 'soft-pillow').rotation.y = -0.065;
  // Cloth follows the mattress and rolls over the front edge, with shallow folds.
  const clothPositions: number[] = [], clothUV: number[] = [], clothIndices: number[] = [];
  const clothProfile = [[-0.979, -0.343], [-0.82, -0.332], [-0.58, -0.329], [-0.34, -0.331], [-0.163, -0.339], [-0.102, -0.365], [-0.079, -0.41], [-0.073, -0.485], [-0.069, -0.573]];
  for (let i = 0; i <= 28; i++) {
    const u = i / 28;
    for (let j = 0; j < clothProfile.length; j++) {
      const [z, y] = clothProfile[j];
      const fold = Math.sin(u * Math.PI * 10) * 0.006 + Math.sin(u * Math.PI * 18 + j * 0.2) * 0.003;
      clothPositions.push(2.804 + u * 1.206, y + fold, z + (j > 5 ? fold * 0.7 : 0));
      clothUV.push(u, j / (clothProfile.length - 1));
      if (i < 28 && j < clothProfile.length - 1) { const a = i * clothProfile.length + j, b = a + clothProfile.length; clothIndices.push(a, b, a + 1, b, b + 1, a + 1); }
    }
  }
  const cloth = new THREE.BufferGeometry(); cloth.setAttribute('position', new THREE.Float32BufferAttribute(clothPositions, 3)); cloth.setAttribute('uv', new THREE.Float32BufferAttribute(clothUV, 2)); cloth.setIndex(clothIndices); cloth.computeVertexNormals();
  mesh(cloth, m.blanket, cabin, 'draped-woven-blanket');
  box(0.116, 0.017, 0.80, m.linen, 2.946, -0.312, -0.546, cabin, 0.008, 'blanket-woven-border');
  box(0.114, 0.191, 0.016, m.linen, 2.946, -0.472, -0.061, cabin, 0.007, 'blanket-border-drape');
  // Machined porthole with captive bolts, double gasket and a softly lit lens.
  cylinder(0.464, 0.11, m.navy, 3.663, 0.436, -0.988, cabin, 'z');
  torus(0.421, 0.055, m.metal, 3.663, 0.436, -0.92, cabin);
  torus(0.36, 0.024, m.gasket, 3.663, 0.436, -0.891, cabin);
  cylinder(0.34, 0.023, m.glass, 3.663, 0.436, -0.895, cabin, 'z');
  torus(0.346, 0.009, m.amber, 3.663, 0.436, -0.877, cabin);
  const windowGlint = sphere(0.25, m.display, 3.591, 0.5, -0.879, cabin); windowGlint.scale.set(0.24, 0.76, 0.014); windowGlint.rotation.z = -0.38;
  const portBolts: Transform[] = [];
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; portBolts.push({ p: [3.663 + Math.cos(a) * 0.421, 0.436 + Math.sin(a) * 0.421, -0.856], r: [0, 0, a] }); }
  instances(boltGeometry, m.navy, portBolts, cabin, 'porthole-captive-fasteners');
  box(1.028, 0.07, 0.427, m.chalk, 2.41, 0.301, -0.788, cabin, 0.033, 'personal-shelf');
  for (const xx of [2.07, 2.74]) box(0.049, 0.17, 0.22, m.metal, xx, 0.187, -0.90, cabin, 0.022, 'shelf-bracket');
  cylinder(0.112, 0.205, m.blanket, 2.16, 0.443, -0.79, cabin, 'y', 0.143);
  torus(0.14, 0.017, m.blanket, 2.16, 0.552, -0.79, cabin, 'y');
  cylinder(0.125, 0.017, m.deep, 2.16, 0.548, -0.79, cabin);
  rod([2.16, 0.55, -0.79], [2.175, 0.944, -0.785], 0.009, m.leaf, cabin);
  const leaves: Transform[] = [];
  for (const [dx, yy, zz, angle, size] of [[-0.081, 0.659, -0.773, -0.75, 1.05], [0.082, 0.738, -0.775, 0.75, 1.0], [-0.096, 0.808, -0.8, -0.68, 0.94], [0.075, 0.889, -0.777, 0.67, 0.83], [0.021, 0.976, -0.785, 0.14, 0.73], [-0.017, 0.744, -0.706, -0.3, 0.77]]) {
    rod([2.168, yy - 0.034, -0.79], [2.16 + dx, yy + 0.005, zz], 0.006, m.leaf, cabin);
    leaves.push({ p: [2.16 + dx, yy + 0.033, zz], s: [0.051 * size, 0.104 * size, 0.02 * size], r: [0, 0, angle] });
  }
  instances(new THREE.SphereGeometry(1, 16, 12), m.green, leaves, cabin, 'plant-leaves');
  for (const [i, x] of [2.48, 2.601, 2.72].entries()) {
    const book = box(0.093, 0.273 + i * 0.02, 0.222, [m.slate, m.amber, m.navy][i], x, 0.476 + i * 0.01, -0.8, cabin, 0.018, 'personal-book');
    book.rotation.z = i === 0 ? -0.1 : 0;
    box(0.06, 0.023, 0.012, m.liner, x, 0.531, -0.683, cabin, 0.005, 'book-spine-band');
  }
  box(0.59, 0.029, 0.61, m.linen, 3.714, -0.918, 0.535, cabin, 0.014, 'stool-floor-mat');
  cylinder(0.226, 0.269, m.navy, 3.714, -0.76, 0.535, cabin);
  torus(0.236, 0.026, m.metal, 3.714, -0.677, 0.535, cabin, 'y');
  cylinder(0.286, 0.118, m.linen, 3.714, -0.551, 0.535, cabin);
  torus(0.255, 0.03, m.linen, 3.714, -0.511, 0.535, cabin, 'y');
  cylinder(0.244, 0.018, m.linen, 3.714, -0.488, 0.535, cabin);

  // CONTACT — rounded docking sleeve, pressure hatch and articulated dish.
  const contact = rooms.contact;
  function axialHull(profile: number[][], material: any, x: number, y: number, z: number, parent: any, name: string) {
    const geometry = new THREE.LatheGeometry(profile.map(([r, offset]) => new THREE.Vector2(r, offset)), 64);
    geometry.rotateZ(-Math.PI / 2);
    const object = mesh(geometry, material, parent, name); object.position.set(x, y, z); return object;
  }
  axialHull([[0.81, -0.91], [0.845, -0.89], [0.91, -0.8], [0.967, -0.61], [0.986, -0.47], [0.989, 0.35], [0.979, 0.48], [0.928, 0.57]], m.shell, -5.065, 0.03, 0, contact, 'rounded-docking-pressure-sleeve');
  torus(0.986, 0.027, m.metal, -4.805, 0.03, 0, contact, 'x');
  torus(0.965, 0.026, m.gasket, -5.50, 0.03, 0, contact, 'x');
  cylinder(0.808, 0.273, m.navy, -6.103, 0.03, 0, contact, 'x');
  torus(0.796, 0.067, m.amber, -6.215, 0.03, 0, contact, 'x');
  cylinder(0.726, 0.11, m.metal, -6.292, 0.03, 0, contact, 'x');
  cylinder(0.629, 0.045, m.gasket, -6.36, 0.03, 0, contact, 'x');
  cylinder(0.575, 0.058, m.chalk, -6.396, 0.03, 0, contact, 'x');
  torus(0.543, 0.023, m.shell, -6.428, 0.03, 0, contact, 'x');
  cylinder(0.173, 0.035, m.navy, -6.437, 0.03, 0, contact, 'x');
  cylinder(0.088, 0.055, m.amber, -6.479, 0.03, 0, contact, 'x');
  for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3; rod([-6.5, 0.03 + Math.sin(a) * 0.07, Math.cos(a) * 0.07], [-6.5, 0.03 + Math.sin(a) * 0.26, Math.cos(a) * 0.26], 0.019, m.metal, contact); }
  const dockingBolts: Transform[] = [];
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; dockingBolts.push({ p: [-6.361, 0.03 + Math.sin(a) * 0.688, Math.cos(a) * 0.688], r: [0, Math.PI / 2, 0] }); }
  instances(boltGeometry, m.navy, dockingBolts, contact, 'docking-collar-fasteners');
  box(0.657, 0.295, 0.084, m.gasket, -5.137, 0.208, 0.971, contact, 0.089, 'docking-control-bezel');
  box(0.521, 0.191, 0.049, m.glass, -5.137, 0.208, 1.031, contact, 0.067, 'docking-control-display');
  box(0.30, 0.024, 0.014, m.display, -5.143, 0.212, 1.064, contact, 0.007, 'comms-status');
  box(0.48, 0.142, 0.05, m.navy, -5.18, -0.219, 0.964, contact, 0.034, 'docking-access-panel');
  box(0.26, 0.056, 0.024, m.amber, -5.18, -0.219, 1.002, contact, 0.017, 'docking-panel-latch');
  for (const yy of [-0.37, 0.43]) {
    rod([-6.435, yy, -0.407], [-6.505, yy, -0.407], 0.025, m.navy, contact);
    rod([-6.505, yy, -0.407], [-6.505, yy, -0.167], 0.025, m.amber, contact);
    rod([-6.505, yy, -0.167], [-6.435, yy, -0.167], 0.025, m.navy, contact);
  }
  cylinder(0.171, 0.141, m.navy, -5.13, 1.032, 0.0, contact);
  rod([-5.13, 1.041, 0.0], [-5.22, 1.485, 0.105], 0.048, m.metal, contact);
  sphere(0.103, m.amber, -5.219, 1.473, 0.1, contact);
  const dishAssembly = new THREE.Group(); dishAssembly.position.set(-5.22, 1.635, 0.139); dishAssembly.rotation.set(-0.23, -0.19, 0.06); contact.add(dishAssembly);
  const dishProfile = [[0.025, -0.016], [0.115, -0.004], [0.25, 0.047], [0.386, 0.127], [0.505, 0.222], [0.511, 0.245], [0.49, 0.254], [0.379, 0.161], [0.242, 0.083], [0.11, 0.033], [0.025, 0.023]];
  const dishGeometry = new THREE.LatheGeometry(dishProfile.map(([r, yy]) => new THREE.Vector2(r, yy)), 64); dishGeometry.rotateX(Math.PI / 2);
  const dishMat = m.chalk.clone(); dishMat.side = THREE.DoubleSide;
  mesh(dishGeometry, dishMat, dishAssembly, 'double-skin-communications-dish');
  torus(0.50, 0.02, m.metal, 0, 0, 0.243, dishAssembly);
  cylinder(0.081, 0.083, m.navy, 0, 0, -0.047, dishAssembly, 'z');
  rod([0, 0, 0.024], [0, 0, 0.463], 0.02, m.navy, dishAssembly);
  sphere(0.063, m.amber, 0, 0, 0.466, dishAssembly);
  for (const a of [Math.PI / 6, Math.PI * 5 / 6, Math.PI * 3 / 2]) rod([Math.cos(a) * 0.44, Math.sin(a) * 0.44, 0.204], [0, 0, 0.429], 0.008, m.metal, dishAssembly);

  // AFT — rounded service module, layered nozzle, and framed solar wings.
  axialHull([[0.81, -0.43], [0.89, -0.39], [0.93, -0.24], [0.937, 0.12], [0.89, 0.28], [0.75, 0.38]], m.shell, 4.916, 0.03, 0, cabin, 'aft-service-pressure-hull');
  torus(0.911, 0.033, m.metal, 4.95, 0.03, 0, cabin, 'x');
  cylinder(0.733, 0.17, m.gasket, 5.268, 0.03, 0, cabin, 'x');
  cylinder(0.631, 0.274, m.navy, 5.462, 0.03, 0, cabin, 'x');
  axialHull([[0.481, -0.235], [0.482, -0.12], [0.523, 0.055], [0.618, 0.263], [0.62, 0.287], [0.571, 0.304], [0.547, 0.269], [0.459, 0.06], [0.421, -0.135]], m.metal, 5.717, 0.03, 0, cabin, 'radiused-main-engine-nozzle');
  cylinder(0.419, 0.031, m.deep, 5.674, 0.03, 0, cabin, 'x');
  torus(0.574, 0.022, m.navy, 6.011, 0.03, 0, cabin, 'x');
  torus(0.465, 0.019, m.amber, 5.82, 0.03, 0, cabin, 'x');
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    const p = box(0.27, 0.113, 0.211, i % 2 ? m.navy : m.amber, 5.411, 0.03 + Math.cos(a) * 0.619, Math.sin(a) * 0.619, cabin, 0.035, 'engine-jacket-panel'); p.rotation.x = a;
  }
  for (const sign of [-1, 1]) {
    rod([5.018, 0.057, sign * 0.665], [5.531, 0.085, sign * 1.027], 0.058, m.navy, cabin);
    cylinder(0.123, 0.228, m.amber, 5.526, 0.085, sign * 1.019, cabin, 'x');
    const wing = new THREE.Group(); wing.position.set(5.588, 0.106, sign * 1.842); wing.rotation.x = sign * 0.075; cabin.add(wing);
    box(1.894, 0.075, 1.609, m.navy, 0, 0, 0, wing, 0.035, 'solar-sandwich-panel');
    const cells: Transform[] = [], altCells: Transform[] = [], conductors: Transform[] = [], rails: Transform[] = [];
    for (let col = 0; col < 4; col++) for (let row = 0; row < 6; row++) {
      const t = { p: [-0.66 + col * 0.441, 0.05, -0.632 + row * 0.252], s: [0.414, 0.016, 0.228] };
      ((col + row) % 3 === 0 ? altCells : cells).push(t);
      for (let j = 0; j < 4; j++) conductors.push({ p: [t.p[0] - 0.153 + j * 0.102, 0.061, t.p[2]], s: [0.003, 0.002, 0.213] });
    }
    for (const xx of [-0.932, 0.932]) rails.push({ p: [xx, 0.011, 0], s: [0.037, 0.103, 1.654] });
    for (const zz of [-0.796, 0.796]) rails.push({ p: [0, 0.011, zz], s: [1.83, 0.103, 0.037] });
    instances(unitBox, m.solar, cells, wing, 'photovoltaic-cells');
    instances(unitBox, m.solarAlt, altCells, wing, 'photovoltaic-cells-alternate');
    instances(unitBox, m.solarLine, conductors, wing, 'photovoltaic-conductor-grid');
    instances(roundedGeometry(1, 1, 1, 0.18), m.metal, rails, wing, 'solar-frame-rails');
    box(0.19, 0.042, 0.089, m.amber, -0.927, 0.074, -sign * 0.591, wing, 0.016, 'solar-hinge-lock');
  }
  box(0.402, 0.133, 0.41, m.navy, 4.087, 1.43, -0.568, cabin, 0.051, 'antenna-base');
  rod([4.087, 1.484, -0.568], [4.087, 2.04, -0.568], 0.016, m.metal, cabin);
  sphere(0.036, m.amber, 4.087, 2.061, -0.568, cabin);

  // Freeze and batch static furniture/skins without an external merge dependency.
  // Instances and the animated radar remain distinct, while each resulting batch
  // is a single directly raycastable mesh carrying the whole-room section tag.
  group.updateMatrixWorld(true);
  let sourceParts = 0;
  const buckets = new Map<string, { parent: any; material: any; objects: any[] }>();
  group.traverse((object: any) => {
    if (!object.isMesh || object.isInstancedMesh) return;
    sourceParts++;
    let ancestor = object.parent, animated = false;
    while (ancestor && ancestor !== group) { if (ancestor.userData.animated) animated = true; ancestor = ancestor.parent; }
    if (animated) return;
    const section = object.userData.section;
    const key = section + ':' + object.material.uuid;
    if (!buckets.has(key)) buckets.set(key, { parent: rooms[section], material: object.material, objects: [] });
    buckets.get(key)!.objects.push(object);
  });
  for (const bucket of buckets.values()) {
    const positions: number[] = [], normals: number[] = [], uv: number[] = [], indices: number[] = [];
    const names: string[] = [];
    const inverse = bucket.parent.matrixWorld.clone().invert();
    for (const object of bucket.objects) {
      const geometry = object.geometry, position = geometry.attributes.position, normal = geometry.attributes.normal, texcoord = geometry.attributes.uv;
      const transform = inverse.clone().multiply(object.matrixWorld), normalTransform = new THREE.Matrix3().getNormalMatrix(transform);
      const offset = positions.length / 3, p = new THREE.Vector3(), n = new THREE.Vector3();
      for (let i = 0; i < position.count; i++) {
        p.fromBufferAttribute(position, i).applyMatrix4(transform); positions.push(p.x, p.y, p.z);
        if (normal) n.fromBufferAttribute(normal, i).applyMatrix3(normalTransform).normalize(); else n.set(0, 1, 0);
        normals.push(n.x, n.y, n.z); uv.push(texcoord ? texcoord.getX(i) : 0, texcoord ? texcoord.getY(i) : 0);
      }
      if (geometry.index) for (let i = 0; i < geometry.index.count; i++) indices.push(offset + geometry.index.getX(i));
      else for (let i = 0; i < position.count; i++) indices.push(offset + i);
      names.push(object.name); object.removeFromParent();
    }
    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    merged.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    merged.setIndex(indices); merged.computeBoundingSphere();
    const result = new THREE.Mesh(merged, bucket.material);
    result.name = bucket.parent.userData.section + '-' + bucket.material.name;
    result.castShadow = result.receiveShadow = true;
    result.userData.section = bucket.parent.userData.section;
    result.userData.parts = names;
    bucket.parent.add(result);
  }
  group.traverse((object: any) => {
    if (object.isMesh) targets.push({ object, section: object.userData.section });
  });
  group.userData.roomAnchors = {
    projects: [-3.0, -0.05, 0.2], experience: [0.0, 0.15, 0.18],
    about: [3.0, -0.05, 0.18], contact: [-5.35, 1.6, 0.28],
  };
  group.userData.roomBounds = {
    projects: { center: [-3, 0.10, 0.05], size: [3, 3.1, 2.8] },
    experience: { center: [0, 0.10, 0.05], size: [3, 3.1, 2.8] },
    about: { center: [3, 0.10, 0.05], size: [3, 3.1, 2.8] },
    contact: { center: [-5.45, 0.48, 0.12], size: [2.3, 3.4, 2.2] },
  };
  group.userData.palette = palette;
  group.userData.description = 'Ivory ceramic three-room spacecraft with rounded pressure hull, archive lockers, flight console, soft cabin, docking dish and solar wings';
  group.userData.detailStats = { staticSourceParts: sourceParts, drawCalls: targets.length, instancedDrawCalls: targets.filter(t => t.object.isInstancedMesh).length };
  group.updateMatrixWorld(true);
  const highlight = new THREE.Color(palette.amber);
  function update(time: number, active: string, instantHighlight = false) {
    const seconds = Number.isFinite(time) ? time : 0;
    sweep.rotation.z = -seconds * 0.34;
    for (const section of Object.keys(roomMaterials)) {
      const goal = active === section ? 1 : 0;
      strengths[section] = instantHighlight ? goal : strengths[section] + (goal - strengths[section]) * 0.12;
      const amount = strengths[section];
      for (const material of roomMaterials[section]) {
        const base = material.userData.baseEmissive;
        // Add a gentle warm lift to every visible surface of the selected bay.
        material.emissive.copy(base).multiplyScalar(material.userData.baseIntensity);
        const lift = amount * material.userData.highlightScale;
        material.emissive.r += highlight.r * lift;
        material.emissive.g += highlight.g * lift;
        material.emissive.b += highlight.b * lift;
        material.emissiveIntensity = 1;
      }
      if (roomLights[section]) roomLights[section].intensity = 0.52 + amount * 0.13;
    }
  }
  return { group, targets, update };
}
