/**
 * Orbital toybox, v6. Self-contained procedural Three.js asset.
 * +Y up and +Z front. Four independent pressure cabins use metadata anchors.
 * Every visible mesh carries userData.section and is returned as a pick target.
 * Static parts are batched per room/material; repeated fittings use instancing.
 */
export type SpacecraftProject = {
  title: string;
  slug: string;
  category?: string | null;
  sample?: boolean;
};
export type SpacecraftState = {
  activeRoom?: string;
  room?: string;
  selectedProject?: string | null;
  hoveredProject?: string | null;
  slug?: string | null;
  projectPage?: number;
  reading?: boolean;
  delta?: number;
};
export function createSpacecraft(
  THREE: any,
  options: {
    accent?: string;
    labels?: Record<string, string>;
    projects?: SpacecraftProject[];
    sampleLabel?: string;
    projectPageSize?: number;
    screenLabels?: boolean;
  } = {},
): {
  group: any;
  targets: Array<{ object: any; section: string }>;
  update: (
    time: number,
    active: string,
    instantHighlight?: boolean,
    state?: SpacecraftState,
  ) => void;
  setProjectPage: (page: number) => {
    page: number;
    pageCount: number;
    slots: Array<SpacecraftProject | null>;
  };
  setProjects: (projects: SpacecraftProject[]) => {
    page: number;
    pageCount: number;
    slots: Array<SpacecraftProject | null>;
  };
  setReading: (section: string, reading: boolean, instant?: boolean) => void;
  readerSurfaces: Record<string, any>;
  interactionTargets: Array<{ object: any; section: string }>;
} {
  const group = new THREE.Group();
  group.name = 'orbital-pressure-vessel';
  const targets: Array<{ object: any; section: string }> = [];
  const interactionTargets: Array<{ object: any; section: string }> = [];
  const cache = new Map<string, any>();
  const materials = new Map<string, any>();
  const roomMaterials: Record<string, any[]> = {};
  const roomLights: Record<string, any> = {};
  const strengths: Record<string, number> = {};
  const roomDimmers: Record<string, number> = {};
  const roomCenters: Record<string, [number, number]> = {
    projects: [-1.65, 1.7],
    experience: [1.65, 1.7],
    about: [-1.65, -1.7],
    contact: [1.65, -1.7],
  };
  const legacyCenters: Record<string, number> = {
    projects: -3,
    experience: 0,
    about: 3,
    contact: 0,
  };
  const projectPageSize = Math.min(
    9,
    Math.max(1, Math.floor(options.projectPageSize || 9)),
  );
  let projectData = (options.projects || []).slice();
  let currentProjectPage = 0;
  let currentState: SpacecraftState = {
    activeRoom: '',
    reading: false,
    selectedProject: null,
  };
  let previousTime = -1,
    lastActive = '';
  const doorSlots: Array<{
    group: any;
    progress: number;
    hover: number;
    baseZ: number;
    glow: any;
    draw: (project: SpacecraftProject | null, index: number) => void;
    project: SpacecraftProject | null;
  }> = [];
  const readerSurfaces: Record<string, any> = {};
  const readerTrays: Record<string, { group: any; progress: number }> = {};
  // Preserve the owner's hue while making the material a rich painted accent
  // under filmic lighting rather than a pale yellow reflective finish.
  const configuredAccent = new THREE.Color(options.accent || '#e6a34c');
  const accentHSL = { h: 0, s: 0, l: 0 };
  configuredAccent.getHSL(accentHSL, THREE.SRGBColorSpace);
  const paintedAccent = new THREE.Color().setHSL(
    accentHSL.h,
    Math.min(1, accentHSL.s * 1.18 + 0.045),
    Math.min(0.47, accentHSL.l * 0.79),
    THREE.SRGBColorSpace,
  );
  const palette = {
    ivory: 0xe1d6c2,
    chalk: 0xeadfc9,
    edge: 0x9daba6,
    navy: 0x29394a,
    deep: 0x172635,
    slate: 0x6e7f80,
    amber: paintedAccent.getHex(),
    linen: 0xbab5a3,
    blue: 0x8ec5cf,
    green: 0x77907c,
  };
  const mat = (
    name: string,
    color: number,
    roughness = 0.5,
    metalness = 0.12,
    extra = {},
  ) => {
    const result = new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
      ...extra,
    });
    result.name = name;
    result.userData.highlightScale =
      name === 'signal-amber' ? 0.3 : name.includes('light') ? 0.05 : 0.018;
    return result;
  };
  const m = {
    shell: mat('ceramic-hull', palette.ivory, 0.38, 0.07),
    chalk: mat('interior-enamel', palette.chalk, 0.54, 0.04),
    liner: mat('warm-insulation', 0xc7bba2, 0.67, 0.01),
    gasket: mat('graphite-gasket', 0x2b3948, 0.63, 0.04),
    navy: mat('graphite-enamel', palette.navy, 0.37, 0.28),
    deep: mat('recess', palette.deep, 0.69, 0.12),
    metal: mat('brushed-titanium', palette.edge, 0.34, 0.63),
    slate: mat('sage-utility', palette.slate, 0.44, 0.25),
    amber: mat('signal-amber', palette.amber, 0.25, 0.055),
    linen: mat('woven-linen', palette.linen, 0.94, 0.0),
    blanket: mat('woven-ochre', 0xc89253, 0.96, 0.0, {
      side: THREE.DoubleSide,
    }),
    upholstery: mat('woven-blue', 0x354d69, 0.93, 0.0),
    paper: mat('warm-paper', 0xf0dfbc, 0.88, 0.0),
    glass: mat('blue-optical-glass', 0x244d5c, 0.18, 0.46, {
      emissive: 0x285362,
      emissiveIntensity: 0.14,
    }),
    display: mat('display-light', palette.blue, 0.38, 0.12, {
      emissive: palette.blue,
      emissiveIntensity: 0.38,
    }),
    screen: mat('screen', 0x163844, 0.3, 0.12, {
      emissive: 0x193b47,
      emissiveIntensity: 0.28,
    }),
    light: mat('warm-light', 0xfde5b1, 0.3, 0.0, {
      emissive: 0xffc574,
      emissiveIntensity: 1.1,
    }),
    hoverRail: mat('perimeter-signal-light', palette.amber, 0.55, 0.0, {
      emissive: palette.amber,
      emissiveIntensity: 0.13,
    }),
    green: mat('sage-leaves', palette.green, 0.87, 0.0),
    leaf: mat('deep-leaves', 0x4d725c, 0.88, 0.0),
    solar: mat('solar-cells', 0x143966, 0.49, 0.16),
    solarAlt: mat('solar-cells-alt', 0x204d7c, 0.52, 0.16),
    solarLine: mat('solar-conductors', 0x405c6b, 0.56, 0.3),
  };
  m.hoverRail.color.multiplyScalar(0.17);
  m.hoverRail.userData.highlightScale = 1.5;

  // A tiny deterministic weave adds close-up material variation without assets.
  const weaveData = new Uint8Array(64 * 64 * 4);
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++) {
      const i = (y * 64 + x) * 4;
      const value =
        178 + (x % 4 < 2 !== y % 4 < 2 ? 45 : 0) + ((x * 17 + y * 31) % 11);
      weaveData[i] = weaveData[i + 1] = weaveData[i + 2] = value;
      weaveData[i + 3] = 255;
    }
  const weave = new THREE.DataTexture(weaveData, 64, 64);
  weave.wrapS = weave.wrapT = THREE.RepeatWrapping;
  weave.magFilter = THREE.LinearFilter;
  weave.minFilter = THREE.LinearMipmapLinearFilter;
  weave.generateMipmaps = true;
  weave.anisotropy = 4;
  weave.repeat.set(7, 7);
  weave.needsUpdate = true;
  for (const fabric of [m.linen, m.blanket, m.upholstery]) {
    fabric.bumpMap = weave;
    fabric.bumpScale = 0.002;
  }

  const rooms: Record<string, any> = {};
  for (const section of ['projects', 'experience', 'about', 'contact']) {
    const room = new THREE.Group();
    room.name = section + '-assembly';
    room.userData.section = section;
    room.position.set(
      roomCenters[section][0] - legacyCenters[section],
      roomCenters[section][1],
      0,
    );
    group.add(room);
    rooms[section] = room;
    strengths[section] = 0;
    roomDimmers[section] = 0;
    roomMaterials[section] = [];
  }
  function sectionOf(parent: any): string {
    return (
      parent.userData.section ||
      (parent.parent ? sectionOf(parent.parent) : 'about')
    );
  }
  function roomMat(original: any, section: string) {
    const key = original.uuid + ':' + section;
    if (!materials.has(key)) {
      const clone = original.clone();
      clone.userData.baseEmissive = original.emissive.clone();
      clone.userData.baseColor = original.color.clone();
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
      const geometry = new THREE.BoxGeometry(
        w,
        h,
        d,
        segments,
        segments,
        segments,
      );
      const positions = geometry.attributes.position,
        normals = geometry.attributes.normal,
        uv = geometry.attributes.uv;
      const half = [w / 2, h / 2, d / 2],
        core = half.map((v: number) => v - r);
      const steps =
        segments === 10
          ? [-1, -0.8, -0.45, -0.18, 0, 0, 0, 0.18, 0.45, 0.8, 1]
          : [-1, -0.45, 0, 0, 0, 0.45, 1];
      for (let i = 0; i < positions.count; i++) {
        const original = [
          positions.getX(i),
          positions.getY(i),
          positions.getZ(i),
        ];
        const originalNormal = [
          normals.getX(i),
          normals.getY(i),
          normals.getZ(i),
        ];
        const p = original.map((v: number, a: number) => {
          const index = Math.round(((v / half[a] + 1) * segments) / 2);
          return index === segments / 2
            ? 0
            : Math.sign(index - segments / 2) *
                (core[a] + Math.abs(steps[index]) * r);
        });
        const c = p.map((v: number, a: number) =>
          Math.max(-core[a], Math.min(core[a], v)),
        );
        const n = new THREE.Vector3(
          p[0] - c[0],
          p[1] - c[1],
          p[2] - c[2],
        ).normalize();
        const px = c[0] + n.x * r,
          py = c[1] + n.y * r,
          pz = c[2] + n.z * r;
        positions.setXYZ(i, px, py, pz);
        // Face UVs follow the remapped physical position, so screens and fabric
        // occupy the whole face instead of a magnified central texture crop.
        if (originalNormal[0])
          uv.setXY(
            i,
            0.5 - (Math.sign(originalNormal[0]) * pz) / d,
            py / h + 0.5,
          );
        else if (originalNormal[1])
          uv.setXY(
            i,
            px / w + 0.5,
            0.5 - (Math.sign(originalNormal[1]) * pz) / d,
          );
        else
          uv.setXY(
            i,
            0.5 + (Math.sign(originalNormal[2]) * px) / w,
            py / h + 0.5,
          );
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
    for (let scope = parent; scope && scope !== group; scope = scope.parent) {
      if (scope.userData.openReader) object.userData.openReader = true;
      if (scope.userData.excludePick) object.userData.excludePick = true;
    }
    object.castShadow = object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  function box(
    w: number,
    h: number,
    d: number,
    material: any,
    x: number,
    y: number,
    z: number,
    parent: any,
    radius = 0.035,
    name = '',
  ) {
    const result = mesh(
      roundedGeometry(w, h, d, radius),
      material,
      parent,
      name,
    );
    result.position.set(x, y, z);
    return result;
  }
  function cylinder(
    radius: number,
    length: number,
    material: any,
    x: number,
    y: number,
    z: number,
    parent: any,
    axis = 'y',
    radiusTop = radius,
    segments = 40,
  ) {
    const geometry = cached(
      `cylinder:${radius}:${radiusTop}:${length}:${segments}`,
      () => new THREE.CylinderGeometry(radiusTop, radius, length, segments, 1),
    );
    const result = mesh(geometry, material, parent);
    result.position.set(x, y, z);
    if (axis === 'x') result.rotation.z = -Math.PI / 2;
    if (axis === 'z') result.rotation.x = Math.PI / 2;
    return result;
  }
  function torus(
    radius: number,
    tube: number,
    material: any,
    x: number,
    y: number,
    z: number,
    parent: any,
    axis = 'z',
  ) {
    const geometry = cached(
      `torus:${radius}:${tube}`,
      () => new THREE.TorusGeometry(radius, tube, 10, 56),
    );
    const result = mesh(geometry, material, parent);
    result.position.set(x, y, z);
    if (axis === 'x') result.rotation.y = Math.PI / 2;
    if (axis === 'y') result.rotation.x = Math.PI / 2;
    return result;
  }
  function sphere(
    radius: number,
    material: any,
    x: number,
    y: number,
    z: number,
    parent: any,
  ) {
    const geometry = cached(
      `sphere:${radius}`,
      () => new THREE.SphereGeometry(radius, 24, 16),
    );
    const result = mesh(geometry, material, parent);
    result.position.set(x, y, z);
    return result;
  }
  function rod(
    from: number[],
    to: number[],
    radius: number,
    material: any,
    parent: any,
  ) {
    const a = new THREE.Vector3(...from),
      b = new THREE.Vector3(...to);
    const object = cylinder(radius, a.distanceTo(b), material, 0, 0, 0, parent);
    object.position.copy(a).add(b).multiplyScalar(0.5);
    object.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      b.sub(a).normalize(),
    );
    return object;
  }
  type Transform = { p: number[]; s?: number[]; r?: number[] };
  function instances(
    geometry: any,
    material: any,
    transforms: Transform[],
    parent: any,
    name: string,
  ) {
    if (!transforms.length) return;
    const section = sectionOf(parent);
    const object = new THREE.InstancedMesh(
      geometry,
      roomMat(material, section),
      transforms.length,
    );
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
  function frameGeometry(
    w: number,
    h: number,
    r: number,
    thickness: number,
    depth: number,
    bevel = 0.018,
  ) {
    return cached(`frame:${w}:${h}:${r}:${thickness}:${depth}:${bevel}`, () => {
      const shape = roundedPath(new THREE.Shape(), w, h, r);
      shape.holes.push(
        roundedPath(
          new THREE.Path(),
          w - thickness * 2,
          h - thickness * 2,
          Math.max(0.02, r - thickness),
        ),
      );
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: true,
        bevelSize: bevel,
        bevelThickness: bevel,
        bevelSegments: 4,
        steps: 1,
        curveSegments: 16,
      });
      geometry.translate(0, 0, -depth / 2);
      return geometry;
    });
  }
  function panelGeometry(
    w: number,
    h: number,
    r: number,
    depth: number,
    bevel = 0.025,
  ) {
    return cached(`panel:${w}:${h}:${r}:${depth}:${bevel}`, () => {
      const shape = roundedPath(new THREE.Shape(), w, h, r);
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: true,
        bevelSize: bevel,
        bevelThickness: bevel,
        bevelSegments: 4,
        steps: 1,
        curveSegments: 16,
      });
      geometry.translate(0, 0, -depth / 2);
      return geometry;
    });
  }
  function plaque(
    text: string,
    subtext: string,
    w: number,
    h: number,
    x: number,
    y: number,
    z: number,
    parent: any,
    dark = false,
  ) {
    if (typeof document === 'undefined') return;
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = Math.round((1024 * h) / w);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = dark ? '#223640' : '#e6e5db';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = dark ? '#bad1cf' : '#2b4047';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = '600 58px Arial, sans-serif';
    ctx.fillText(
      text.toUpperCase().slice(0, 36),
      55,
      canvas.height * 0.41,
      915,
    );
    ctx.fillStyle = dark ? '#809a9e' : '#778782';
    ctx.font = '400 23px monospace';
    ctx.fillText(
      subtext.toUpperCase().slice(0, 65),
      58,
      canvas.height * 0.77,
      900,
    );
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = mat('identification-label', 0xffffff, 0.58, 0.08, {
      map: texture,
    });
    const face = mesh(
      new THREE.PlaneGeometry(w, h),
      material,
      parent,
      'label-' + text,
    );
    face.position.set(x, y, z);
  }

  // Three complete pressure modules. The rounded front cutout is built in XY;
  // actual side bulkheads are in YZ. Adjacent front skins retain a 20 mm gap
  // including bevels, avoiding coplanar overlap and black seam flickering.
  const shellShape = new THREE.Shape();
  shellShape.moveTo(-1.19, -1.34);
  shellShape.lineTo(0.67, -1.34);
  shellShape.quadraticCurveTo(1.36, -1.34, 1.36, -0.65);
  shellShape.lineTo(1.36, 0.91);
  shellShape.quadraticCurveTo(1.36, 1.58, 0.69, 1.58);
  shellShape.lineTo(-0.77, 1.58);
  shellShape.lineTo(-0.77, 1.32);
  shellShape.lineTo(0.67, 1.32);
  shellShape.quadraticCurveTo(1.1, 1.32, 1.1, 0.89);
  shellShape.lineTo(1.1, -0.61);
  shellShape.quadraticCurveTo(1.1, -1.04, 0.67, -1.04);
  shellShape.lineTo(-1.19, -1.04);
  shellShape.closePath();
  const shellGeometry = new THREE.ExtrudeGeometry(shellShape, {
    depth: 2.86,
    bevelEnabled: true,
    bevelSize: 0.025,
    bevelThickness: 0.025,
    bevelSegments: 4,
    curveSegments: 18,
    steps: 1,
  });
  shellGeometry.rotateY(Math.PI / 2);
  shellGeometry.translate(-1.43, 0, 0);
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const boltGeometry = new THREE.CylinderGeometry(0.021, 0.021, 0.013, 6);
  boltGeometry.rotateX(Math.PI / 2);
  const frontSkin = frameGeometry(2.91, 3.12, 0.48, 0.15, 0.22, 0.035);
  const frontSeal = frameGeometry(2.58, 2.79, 0.32, 0.069, 0.078, 0.01);
  const passageShape = roundedPath(new THREE.Shape(), 2.5, 2.88, 0.48);
  passageShape.holes.push(roundedPath(new THREE.Path(), 1.18, 2.03, 0.56));
  const passageWall = new THREE.ExtrudeGeometry(passageShape, {
    depth: 0.17,
    bevelEnabled: true,
    bevelSize: 0.022,
    bevelThickness: 0.022,
    bevelSegments: 4,
    curveSegments: 18,
  });
  passageWall.translate(0, 0, -0.085);
  passageWall.rotateY(Math.PI / 2);
  const endWallGeometry = panelGeometry(2.5, 2.88, 0.48, 0.18, 0.03).clone();
  endWallGeometry.rotateY(Math.PI / 2);
  for (const [index, section] of [
    'projects',
    'experience',
    'about',
    'contact',
  ].entries()) {
    const x = legacyCenters[section],
      room = rooms[section];
    const skin = mesh(
      shellGeometry,
      m.shell,
      room,
      section + '-continuous-pressure-skin',
    );
    skin.position.set(x, 0, 0);
    const front = mesh(
      frontSkin,
      m.shell,
      room,
      'rounded-front-pressure-collar',
    );
    front.position.set(x, 0.06, 1.19);
    const seal = mesh(
      frontSeal,
      m.gasket,
      room,
      'recessed-front-pressure-seal',
    );
    seal.position.set(x, 0.06, 1.145);
    const hoverPerimeter = mesh(
      frameGeometry(2.392, 2.605, 0.24, 0.017, 0.014, 0.004),
      m.hoverRail,
      room,
      'hover-perimeter-light-guide',
    );
    hoverPerimeter.position.set(x, 0.06, 1.215);
    // A broad floor and warm continuous rear liner replace the noisy black grid.
    box(
      2.65,
      0.105,
      2.12,
      m.liner,
      x,
      -1.006,
      0.05,
      room,
      0.05,
      'warm-deck-foundation',
    );
    box(
      2.22,
      0.034,
      1.62,
      m.slate,
      x,
      -0.932,
      0.09,
      room,
      0.016,
      'recessed-non-slip-deck',
    );
    box(
      2.22,
      0.009,
      0.011,
      m.metal,
      x,
      -0.91,
      0.04,
      room,
      0.004,
      'deck-service-joint',
    );
    box(
      2.61,
      1.93,
      0.087,
      m.liner,
      x,
      0.105,
      -1.006,
      room,
      0.042,
      'rounded-warm-cabin-liner',
    );
    box(
      2.48,
      0.085,
      0.15,
      m.liner,
      x,
      -0.841,
      -0.94,
      room,
      0.039,
      'lower-wall-cove',
    );
    // Two generous warm fixtures, sunk into individual rounded ceiling bezels.
    for (const dx of [-0.66, 0.66]) {
      box(
        1.015,
        0.117,
        0.213,
        m.liner,
        x + dx,
        1.239,
        0.548,
        room,
        0.055,
        'ceiling-light-bezel',
      );
      box(
        0.86,
        0.035,
        0.127,
        m.light,
        x + dx,
        1.16,
        0.58,
        room,
        0.017,
        'warm-ceiling-light',
      );
      box(
        0.15,
        0.045,
        0.2,
        m.amber,
        x + dx * 1.48,
        1.628,
        0.34,
        room,
        0.022,
        'external-amber-lifting-tab',
      );
    }
    const light = new THREE.PointLight(0xffb86c, 2.1, 3.4, 2);
    light.position.set(x, 0.8, 0.15);
    room.add(light);
    roomLights[section] = light;
    box(
      2.25,
      0.018,
      0.032,
      m.hoverRail,
      x,
      -0.9445,
      -0.743,
      room,
      0.008,
      'warm-floor-routing-line',
    );
    for (const sign of [-1, 1]) {
      box(
        0.027,
        0.018,
        1.55,
        m.hoverRail,
        x + sign * 1.155,
        -0.9445,
        0.03,
        room,
        0.008,
        'threshold-edge-marker',
      );
      box(
        0.077,
        0.14,
        0.23,
        m.gasket,
        x + sign * 1.319,
        1.39,
        0.5,
        room,
        0.033,
        'roof-latch',
      );
      rod(
        [x + sign * 1.29, -0.47, 1.355],
        [x + sign * 1.29, 0.36, 1.355],
        0.036,
        m.amber,
        room,
      );
      sphere(0.049, m.amber, x + sign * 1.29, -0.47, 1.354, room);
      sphere(0.049, m.amber, x + sign * 1.29, 0.36, 1.354, room);
    }
    // Flush nameplates are part of the lower shell, rather than hanging shelves.
    box(
      2.24,
      0.34,
      0.118,
      m.gasket,
      x,
      -1.382,
      1.291,
      room,
      0.056,
      'room-label-backing',
    );
    box(
      2.1,
      0.282,
      0.071,
      m.chalk,
      x,
      -1.382,
      1.379,
      room,
      0.034,
      'room-label-ceramic-insert',
    );
    if (!options.screenLabels)
      plaque(
        options.labels?.[section] || `MOD-0${index + 1}`,
        `0${index + 1} / MOD-0${index + 1}`,
        1.84,
        0.225,
        x + 0.018,
        -1.371,
        1.425,
        room,
      );
    for (const sign of [-1, 1])
      box(
        0.133,
        0.358,
        0.135,
        m.amber,
        x + sign * 1.12,
        -1.366,
        1.36,
        room,
        0.044,
        'nameplate-amber-clasp',
      );
    box(
      2.77,
      0.15,
      1.61,
      m.navy,
      x,
      -1.389,
      -0.06,
      room,
      0.071,
      'underside-service-keel',
    );
    const fasteners: Transform[] = [];
    for (const sign of [-1, 1])
      for (const yy of [-0.75, 0.77])
        fasteners.push({ p: [x + sign * 1.374, yy, 1.346] });
    instances(
      boltGeometry,
      m.metal,
      fasteners,
      room,
      'captive-collar-fasteners',
    );
  }
  // Each module owns both side walls. Opposing oval doors meet through a
  // short pressure sleeve; outside walls are sealed instead of empty hoops.
  for (const section of Object.keys(roomCenters)) {
    const room = rooms[section],
      origin = legacyCenters[section];
    const leftColumn = section === 'projects' || section === 'about';
    for (const sign of [-1, 1]) {
      const x = origin + sign * 1.5;
      const passage = leftColumn ? sign === 1 : sign === -1;
      const wall = mesh(
        passage ? passageWall : endWallGeometry,
        m.shell,
        room,
        passage
          ? 'inter-room-pressure-bulkhead'
          : section + '-sealed-outboard-wall',
      );
      wall.position.set(x, 0.04, 0);
      if (passage) {
        const inward = -sign;
        const trim = mesh(
          frameGeometry(1.33, 2.18, 0.63, 0.079, 0.061, 0.016),
          m.liner,
          room,
          'oval-passage-collar',
        );
        trim.rotation.y = Math.PI / 2;
        trim.position.set(x + inward * 0.139, 0.04, 0);
        const gasket = mesh(
          frameGeometry(1.158, 2.01, 0.547, 0.03, 0.043, 0.006),
          m.gasket,
          room,
          'oval-passage-gasket',
        );
        gasket.rotation.y = Math.PI / 2;
        gasket.position.set(x + inward * 0.143, 0.04, 0);
        box(
          0.27,
          0.075,
          1.15,
          m.liner,
          x,
          -0.93,
          0,
          room,
          0.033,
          'inter-room-threshold',
        );
      }
    }
  }
  const utility = new THREE.Group();
  utility.userData.section = 'contact';
  group.add(utility);
  const sleeveMat = m.gasket.clone();
  sleeveMat.side = THREE.DoubleSide;
  for (const y of [1.74, -1.66]) {
    const sleeveGeometry = new THREE.CylinderGeometry(
      1.018,
      1.018,
      0.34,
      40,
      1,
      true,
    );
    sleeveGeometry.rotateZ(-Math.PI / 2);
    const sleeve = mesh(
      sleeveGeometry,
      sleeveMat,
      utility,
      'horizontal-pressure-coupling',
    );
    sleeve.position.set(0, y, 0);
    sleeve.scale.z = 0.581;
  }
  for (const x of [-1.65, 1.65])
    box(
      0.63,
      0.4,
      1.55,
      m.navy,
      x,
      0.08,
      -0.34,
      utility,
      0.17,
      'between-deck-structural-connector',
    );
  // A sealed service door in the new communications cabin faces its equipment.
  const aftDoor = mesh(
    panelGeometry(1.4, 2.19, 0.41, 0.045, 0.02),
    m.gasket,
    rooms.contact,
    'contact-service-door-recess',
  );
  aftDoor.rotation.y = Math.PI / 2;
  aftDoor.position.set(1.354, 0.03, 0.01);
  const aftInsert = mesh(
    panelGeometry(1.285, 2.055, 0.36, 0.071, 0.025),
    m.chalk,
    rooms.contact,
    'closed-service-pressure-door',
  );
  aftInsert.rotation.y = Math.PI / 2;
  aftInsert.position.set(1.276, 0.03, 0.01);
  cylinder(0.248, 0.025, m.navy, 1.203, 0.53, 0.01, rooms.contact, 'x');
  cylinder(0.188, 0.023, m.glass, 1.179, 0.53, 0.01, rooms.contact, 'x');
  torus(0.209, 0.025, m.metal, 1.158, 0.53, 0.01, rooms.contact, 'x');
  rod([1.184, -0.48, 0.37], [1.184, 0.04, 0.37], 0.033, m.amber, rooms.contact);

  // Nine physical compartments, arranged as three columns by three rows.
  // Each hinge, title texture and signal rail remains independent after batching.
  const project = rooms.projects;
  box(
    2.66,
    1.985,
    0.318,
    m.gasket,
    -3,
    -0.038,
    -0.839,
    project,
    0.145,
    'nine-slot-project-payload-rack',
  );
  box(
    2.5,
    0.204,
    0.114,
    m.chalk,
    -3,
    1.006,
    -0.766,
    project,
    0.055,
    'payload-rack-header',
  );
  plaque(
    options.labels?.projects || 'ST-01',
    '',
    2.24,
    0.158,
    -3,
    1.006,
    -0.696,
    project,
  );
  for (let slotIndex = 0; slotIndex < 9; slotIndex++) {
    const col = slotIndex % 3,
      row = Math.floor(slotIndex / 3);
    const x = -3.85 + col * 0.85,
      y = 0.595 - row * 0.607;
    box(
      0.792,
      0.565,
      0.053,
      m.deep,
      x,
      y,
      -0.646,
      project,
      0.025,
      'project-compartment-shadow-recess',
    );
    box(
      0.693,
      0.477,
      0.051,
      m.slate,
      x,
      y,
      -0.593,
      project,
      0.025,
      'project-compartment-back',
    );
    box(
      0.561,
      0.12,
      0.166,
      m.navy,
      x,
      y - 0.115,
      -0.504,
      project,
      0.037,
      'stowed-project-cartridge',
    );
    for (const yy of [-0.16, 0.16])
      cylinder(0.022, 0.078, m.metal, x - 0.383, y + yy, -0.379, project);
    const door = new THREE.Group();
    door.name = `project-compartment-hinge-${slotIndex}`;
    door.position.set(x - 0.371, y, -0.362);
    door.userData.animated = true;
    door.userData.projectSlot = slotIndex;
    project.add(door);
    box(
      0.754,
      0.523,
      0.124,
      m.chalk,
      0.371,
      0,
      0,
      door,
      0.059,
      'project-compartment-door',
    );
    box(
      0.093,
      0.094,
      0.044,
      m.amber,
      0.624,
      -0.159,
      0.093,
      door,
      0.021,
      'compartment-amber-latch',
    );
    const signalSource = m.hoverRail.clone();
    signalSource.name = 'project-slot-light-' + slotIndex;
    const signal = mesh(
      frameGeometry(0.697, 0.466, 0.06, 0.012, 0.011, 0.003),
      signalSource,
      door,
      'individual-project-hover-light',
    );
    signal.position.set(0.371, 0, 0.077);
    let paint = (_item: SpacecraftProject | null, _index: number) => {};
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 560;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        const labelMaterial = mat(
          'project-data-label-' + slotIndex,
          0xffffff,
          0.79,
          0.0,
          { map: texture, transparent: true, depthWrite: false },
        );
        const label = mesh(
          new THREE.PlaneGeometry(0.61, 0.334),
          labelMaterial,
          door,
          'live-project-compartment-title',
        );
        label.position.set(0.366, 0.055, 0.091);
        paint = (item: SpacecraftProject | null, index: number) => {
          ctx.clearRect(0, 0, 1024, 560);
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillStyle = '#667070';
          ctx.font = '500 70px monospace';
          ctx.fillText(String(index + 1).padStart(2, '0'), 38, 12);
          if (!item) {
            texture.needsUpdate = true;
            return;
          }
          ctx.fillStyle = '#233549';
          ctx.font = '600 147px Arial, sans-serif';
          const words = item.title.split(/\s+/);
          let line = '',
            lineIndex = 0;
          for (const word of words) {
            const candidate = line ? line + ' ' + word : word;
            if (
              lineIndex === 0 &&
              line &&
              ctx.measureText(candidate).width > 948
            ) {
              ctx.fillText(line, 38, 124, 948);
              line = word;
              lineIndex = 1;
            } else line = candidate;
          }
          if (lineIndex && ctx.measureText(line).width > 948) {
            while (line.length > 1 && ctx.measureText(line + '…').width > 948)
              line = line.slice(0, -1);
            line = line.trimEnd() + '…';
          }
          ctx.fillText(line, 38, 124 + lineIndex * 168, 948);
          if (item.sample && options.sampleLabel) {
            ctx.fillStyle = '#8c714b';
            ctx.font = '500 48px Arial';
            ctx.fillText(options.sampleLabel, 39, 486, 720);
          }
          texture.needsUpdate = true;
        };
      }
    }
    doorSlots.push({
      group: door,
      progress: 0,
      hover: 0,
      baseZ: -0.362,
      glow: signal.material,
      draw: paint,
      project: null,
    });
  }
  // A small collapsed dock leaves every compartment visible and accessible.
  const projectDock = new THREE.Group();
  projectDock.userData.openReader = true;
  project.add(projectDock);
  box(
    0.54,
    0.073,
    0.331,
    m.navy,
    -3,
    -0.873,
    0.72,
    projectDock,
    0.035,
    'collapsed-project-reader-dock',
  );
  box(
    0.472,
    0.037,
    0.286,
    m.chalk,
    -3,
    -0.811,
    0.72,
    projectDock,
    0.018,
    'clipboard-dock-cover',
  );
  box(
    0.137,
    0.039,
    0.099,
    m.amber,
    -3,
    -0.775,
    0.675,
    projectDock,
    0.018,
    'clipboard-dock-clasp',
  );

  // EXPERIENCE — a wall-mounted mission console with large, tactile controls.
  const mission = rooms.experience;
  const console = new THREE.Group();
  console.userData.openReader = true;
  mission.add(console);
  box(
    2.5,
    1.91,
    0.185,
    m.chalk,
    0,
    0.005,
    -0.81,
    console,
    0.089,
    'mission-console-pressure-panel',
  );
  box(
    1.95,
    1.086,
    0.128,
    m.gasket,
    -0.13,
    0.244,
    -0.624,
    console,
    0.063,
    'mission-display-bezel',
  );
  box(
    1.815,
    0.953,
    0.031,
    m.metal,
    -0.13,
    0.244,
    -0.534,
    console,
    0.015,
    'mission-display-rim',
  );
  const displayMaterial = m.screen.clone();
  displayMaterial.name = 'mission-screen';
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = 1536;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createLinearGradient(0, 0, 0, 800);
      gradient.addColorStop(0, '#163450');
      gradient.addColorStop(1, '#0c253e');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1536, 800);
      ctx.fillStyle = '#dbe5df';
      ctx.font = '500 65px Arial';
      ctx.fillText(
        (options.labels?.experience || 'SYS-02').toUpperCase().slice(0, 32),
        89,
        113,
        1320,
      );
      ctx.strokeStyle = '#456681';
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(88, 237 + i * 100);
        ctx.lineTo(1450, 237 + i * 100);
        ctx.stroke();
      }
      ctx.strokeStyle = '#9ed5ed';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(283, 412);
      ctx.lineTo(771, 362);
      ctx.lineTo(1256, 318);
      ctx.stroke();
      for (const [i, x] of [283, 771, 1256].entries()) {
        const y = [412, 362, 318][i];
        ctx.fillStyle = '#0b273d';
        ctx.beginPath();
        ctx.arc(x, y, 23, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#cbdedc';
        ctx.font = '47px monospace';
        ctx.fillText('0' + (i + 1), x - 33, 529);
      }
      ctx.fillStyle = '#839fad';
      ctx.font = '30px monospace';
      ctx.fillText('02 / 024 / 003', 89, 725);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      displayMaterial.map = texture;
      displayMaterial.emissiveMap = texture;
      displayMaterial.color.set(0xffffff);
      displayMaterial.emissive.set(0x97b4c8);
      displayMaterial.emissiveIntensity = 0.28;
    }
  }
  box(
    1.749,
    0.884,
    0.027,
    displayMaterial,
    -0.13,
    0.244,
    -0.499,
    console,
    0.013,
    'mission-display',
  );
  // The rotary controller is deliberately large enough to read in the overview.
  cylinder(0.246, 0.071, m.gasket, -0.12, -0.504, -0.607, console, 'z');
  torus(0.19, 0.027, m.amber, -0.12, -0.504, -0.546, console);
  cylinder(0.175, 0.127, m.navy, -0.12, -0.504, -0.471, console, 'z');
  box(
    0.016,
    0.083,
    0.019,
    m.liner,
    -0.12,
    -0.394,
    -0.396,
    console,
    0.007,
    'rotary-controller-index',
  );
  for (const [i, x] of [-0.786, 0.578].entries()) {
    box(
      0.47,
      0.367,
      0.06,
      m.navy,
      x,
      -0.52,
      -0.643,
      console,
      0.028,
      'auxiliary-console-bezel',
    );
    box(
      0.377,
      0.264,
      0.025,
      m.glass,
      x,
      -0.52,
      -0.591,
      console,
      0.012,
      'auxiliary-console-lens',
    );
    if (i === 0) {
      torus(0.083, 0.007, m.display, x, -0.52, -0.571, console);
      rod(
        [x - 0.11, -0.52, -0.569],
        [x + 0.11, -0.52, -0.569],
        0.005,
        m.display,
        console,
      );
    } else {
      const pts = [
        [x - 0.14, -0.54, -0.568],
        [x - 0.052, -0.49, -0.568],
        [x + 0.03, -0.57, -0.568],
        [x + 0.14, -0.465, -0.568],
      ];
      for (let j = 0; j < pts.length - 1; j++)
        rod(pts[j], pts[j + 1], 0.007, m.display, console);
    }
  }
  box(
    0.274,
    1.265,
    0.135,
    m.liner,
    1.066,
    0.186,
    -0.639,
    console,
    0.06,
    'console-side-instrument',
  );
  box(
    0.162,
    0.33,
    0.053,
    m.navy,
    1.066,
    0.105,
    -0.525,
    console,
    0.025,
    'console-contact-control',
  );
  box(
    0.055,
    0.144,
    0.042,
    m.amber,
    1.066,
    -0.185,
    -0.51,
    console,
    0.021,
    'console-side-control',
  );
  const sweep = new THREE.Group();
  sweep.userData.animated = true;
  mission.add(sweep);

  // ABOUT — a vertical quilted berth, curtain, journal desk and storage cupboard.
  const cabin = rooms.about;
  box(
    0.79,
    2.02,
    0.329,
    m.gasket,
    2.1,
    0.034,
    -0.808,
    cabin,
    0.16,
    'vertical-berth-recess',
  );
  box(
    0.658,
    1.864,
    0.277,
    m.upholstery,
    2.1,
    0.026,
    -0.576,
    cabin,
    0.13,
    'padded-sleeping-berth',
  );
  for (let i = 0; i < 6; i++)
    box(
      0.594,
      0.256,
      0.088,
      m.upholstery,
      2.1,
      -0.71 + i * 0.278,
      -0.4,
      cabin,
      0.043,
      'soft-berth-quilting',
    );
  for (const yy of [-0.594, 0.059, 0.646]) {
    box(
      0.696,
      0.103,
      0.059,
      m.amber,
      2.1,
      yy,
      -0.329,
      cabin,
      0.028,
      'berth-retaining-strap',
    );
    box(
      0.117,
      0.13,
      0.056,
      m.metal,
      2.215,
      yy,
      -0.28,
      cabin,
      0.026,
      'berth-strap-buckle',
    );
    box(
      0.059,
      0.068,
      0.018,
      m.navy,
      2.215,
      yy,
      -0.237,
      cabin,
      0.008,
      'berth-buckle-insert',
    );
  }
  const curtain: Transform[] = [];
  for (let i = 0; i < 4; i++)
    curtain.push({
      p: [2.508 + i * 0.072, 0.027, -0.46 + (i % 2) * 0.014],
      s: [0.047, 0.966, 0.059],
    });
  instances(
    new THREE.CylinderGeometry(1, 1, 2, 16, 1),
    m.upholstery,
    curtain,
    cabin,
    'soft-privacy-curtain',
  );
  rod([2.467, 1.011, -0.45], [2.782, 1.011, -0.45], 0.019, m.metal, cabin);
  // Small physical art is abstract geometry, with no person or content baked in.
  box(
    0.522,
    0.689,
    0.066,
    m.chalk,
    3.204,
    0.571,
    -0.836,
    cabin,
    0.032,
    'cabin-picture-frame',
  );
  box(
    0.408,
    0.567,
    0.022,
    m.paper,
    3.204,
    0.571,
    -0.783,
    cabin,
    0.011,
    'picture-mat',
  );
  const mountain = new THREE.Shape();
  mountain.moveTo(-0.182, -0.228);
  mountain.lineTo(-0.022, 0.112);
  mountain.lineTo(0.182, -0.228);
  mountain.closePath();
  const mountainMesh = mesh(
    new THREE.ShapeGeometry(mountain),
    m.upholstery,
    cabin,
    'abstract-cabin-art',
  );
  mountainMesh.position.set(3.204, 0.556, -0.764);
  const mountain2 = new THREE.Shape();
  mountain2.moveTo(-0.06, -0.226);
  mountain2.lineTo(0.095, 0.017);
  mountain2.lineTo(0.182, -0.226);
  mountain2.closePath();
  const ridge = mesh(
    new THREE.ShapeGeometry(mountain2),
    m.navy,
    cabin,
    'abstract-cabin-art-ridge',
  );
  ridge.position.set(3.204, 0.556, -0.758);
  const sun = sphere(0.035, m.amber, 3.108, 0.741, -0.754, cabin);
  sun.scale.z = 0.12;
  box(
    0.091,
    0.131,
    0.045,
    m.amber,
    3.204,
    0.926,
    -0.774,
    cabin,
    0.021,
    'picture-retaining-clip',
  );
  const journal = new THREE.Group();
  journal.userData.openReader = true;
  cabin.add(journal);
  box(
    0.895,
    0.162,
    0.707,
    m.chalk,
    3.246,
    -0.521,
    -0.543,
    journal,
    0.078,
    'journal-desk-tray',
  );
  box(
    0.527,
    0.322,
    0.269,
    m.liner,
    3.246,
    -0.752,
    -0.745,
    journal,
    0.087,
    'journal-desk-mount',
  );
  const book = new THREE.Group();
  book.position.set(3.246, -0.368, -0.554);
  book.rotation.x = -0.11;
  journal.add(book);
  box(
    0.649,
    0.096,
    0.455,
    m.navy,
    0,
    0,
    0,
    book,
    0.046,
    'personal-journal-cover',
  );
  box(
    0.565,
    0.055,
    0.393,
    m.paper,
    -0.006,
    -0.005,
    0.016,
    book,
    0.025,
    'journal-page-block',
  );
  box(
    0.649,
    0.039,
    0.455,
    m.upholstery,
    0,
    0.062,
    0,
    book,
    0.019,
    'closed-journal-front-cover',
  );
  box(
    0.072,
    0.038,
    0.467,
    m.amber,
    0.214,
    0.097,
    0,
    book,
    0.018,
    'journal-retaining-band',
  );
  for (const sign of [-1, 1])
    box(
      0.088,
      0.134,
      0.638,
      m.amber,
      3.246 + sign * 0.46,
      -0.487,
      -0.543,
      journal,
      0.037,
      'journal-tray-bumper',
    );
  box(
    0.441,
    1.953,
    0.248,
    m.chalk,
    3.993,
    0.037,
    -0.79,
    cabin,
    0.118,
    'cabin-utility-cupboard',
  );
  box(
    0.345,
    1.767,
    0.035,
    m.shell,
    3.993,
    0.037,
    -0.633,
    cabin,
    0.017,
    'cabin-cupboard-insert',
  );
  rod([4.067, -0.46, -0.548], [4.067, 0.028, -0.548], 0.029, m.amber, cabin);
  box(
    0.268,
    0.347,
    0.063,
    m.upholstery,
    3.568,
    0.375,
    -0.807,
    cabin,
    0.031,
    'cabin-soft-stowage-pouch',
  );
  box(
    0.077,
    0.103,
    0.041,
    m.amber,
    3.568,
    0.407,
    -0.748,
    cabin,
    0.02,
    'pouch-latch',
  );

  // CONTACT — a dedicated communications cabin, separate from the docking nose.
  const contact = rooms.contact;
  const contactConsole = new THREE.Group();
  contactConsole.userData.openReader = true;
  contact.add(contactConsole);
  box(
    2.46,
    1.94,
    0.243,
    m.navy,
    0,
    0.022,
    -0.828,
    contactConsole,
    0.115,
    'communications-console-housing',
  );
  box(
    1.56,
    1.1,
    0.106,
    m.chalk,
    -0.1,
    0.258,
    -0.636,
    contactConsole,
    0.051,
    'communications-screen-ceramic-frame',
  );
  box(
    1.436,
    0.976,
    0.041,
    m.deep,
    -0.1,
    0.258,
    -0.549,
    contactConsole,
    0.02,
    'communications-display-gasket',
  );
  const commsMaterial = m.screen.clone();
  commsMaterial.name = 'communications-screen';
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 780;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const g = ctx.createLinearGradient(0, 0, 0, 780);
      g.addColorStop(0, '#214565');
      g.addColorStop(1, '#102b42');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 1200, 780);
      ctx.fillStyle = '#dbe7df';
      ctx.font = '600 84px Arial';
      ctx.fillText(
        (options.labels?.contact || 'COM-04').toUpperCase(),
        77,
        128,
        1040,
      );
      ctx.strokeStyle = '#9dcee3';
      ctx.lineWidth = 7;
      for (const radius of [92, 150, 211]) {
        ctx.beginPath();
        ctx.arc(600, 424, radius, -Math.PI * 0.83, -Math.PI * 0.17);
        ctx.stroke();
      }
      ctx.fillStyle = '#eab26c';
      ctx.beginPath();
      ctx.arc(600, 431, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#83b6cf';
      ctx.lineWidth = 5;
      ctx.beginPath();
      for (let i = 0; i < 57; i++) {
        const x = 90 + i * 18,
          y = 617 + Math.sin(i * 0.6) * (18 + Math.sin(i * 0.18) * 14);
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.stroke();
      ctx.fillStyle = '#9cbbc7';
      ctx.font = '34px monospace';
      ctx.fillText('04 / 024', 80, 726);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      commsMaterial.map = texture;
      commsMaterial.emissiveMap = texture;
      commsMaterial.color.set(0xffffff);
      commsMaterial.emissive.set(0xa0bfd0);
      commsMaterial.emissiveIntensity = 0.3;
    }
  }
  box(
    1.374,
    0.914,
    0.025,
    commsMaterial,
    -0.1,
    0.258,
    -0.502,
    contactConsole,
    0.012,
    'actionable-contact-display',
  );
  // A large amber receiver, coiled lead, speaker and radio controls read at overview scale.
  box(
    0.239,
    1.04,
    0.117,
    m.gasket,
    -1.028,
    0.213,
    -0.613,
    contactConsole,
    0.055,
    'receiver-wall-cradle',
  );
  rod(
    [-1.028, -0.101, -0.446],
    [-1.028, 0.492, -0.446],
    0.049,
    m.amber,
    contactConsole,
  );
  for (const yy of [-0.091, 0.483])
    box(
      0.198,
      0.185,
      0.16,
      m.amber,
      -1.028,
      yy,
      -0.422,
      contactConsole,
      0.073,
      'amber-radio-receiver',
    );
  const leadPoints = [
    [-1.03, -0.14, -0.46],
    [-1.07, -0.37, -0.37],
    [-0.97, -0.66, -0.36],
    [-0.71, -0.68, -0.4],
    [-0.66, -0.49, -0.58],
  ].map((p) => new THREE.Vector3(...p));
  mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(leadPoints),
      30,
      0.018,
      8,
      false,
    ),
    m.gasket,
    contactConsole,
    'radio-receiver-lead',
  );
  box(
    0.399,
    1.586,
    0.079,
    m.gasket,
    0.978,
    0.094,
    -0.595,
    contactConsole,
    0.038,
    'radio-speaker-column',
  );
  cylinder(0.147, 0.045, m.metal, 0.978, 0.568, -0.523, contactConsole, 'z');
  cylinder(0.112, 0.039, m.deep, 0.978, 0.568, -0.475, contactConsole, 'z');
  sphere(0.07, m.navy, 0.978, 0.568, -0.445, contactConsole).scale.z = 0.41;
  const speakerSlots: Transform[] = [];
  for (let i = 0; i < 7; i++)
    speakerSlots.push({
      p: [0.978, 0.26 - i * 0.084, -0.539],
      s: [0.217, 0.028, 0.017],
    });
  instances(
    unitBox,
    m.deep,
    speakerSlots,
    contactConsole,
    'coarse-radio-speaker-grille',
  );
  cylinder(0.176, 0.051, m.gasket, -0.144, -0.556, -0.617, contactConsole, 'z');
  torus(0.142, 0.021, m.amber, -0.144, -0.556, -0.571, contactConsole);
  cylinder(0.122, 0.123, m.navy, -0.144, -0.556, -0.489, contactConsole, 'z');
  box(
    0.315,
    0.207,
    0.059,
    m.glass,
    0.383,
    -0.564,
    -0.611,
    contactConsole,
    0.028,
    'radio-channel-indicator',
  );
  box(
    0.164,
    0.018,
    0.013,
    m.display,
    0.383,
    -0.561,
    -0.57,
    contactConsole,
    0.006,
    'channel-signal-line',
  );
  box(
    0.994,
    0.16,
    0.47,
    m.chalk,
    -0.01,
    -0.771,
    -0.365,
    contactConsole,
    0.073,
    'communications-control-shelf',
  );

  // DOCKING — rounded docking sleeve, pressure hatch and articulated dish.
  const docking = new THREE.Group();
  docking.userData.section = 'contact';
  docking.position.set(1.35, 1.7, 0);
  group.add(docking);
  function axialHull(
    profile: number[][],
    material: any,
    x: number,
    y: number,
    z: number,
    parent: any,
    name: string,
  ) {
    const geometry = new THREE.LatheGeometry(
      profile.map(([r, offset]) => new THREE.Vector2(r, offset)),
      64,
    );
    geometry.rotateZ(-Math.PI / 2);
    const object = mesh(geometry, material, parent, name);
    object.position.set(x, y, z);
    return object;
  }
  axialHull(
    [
      [0.81, -0.91],
      [0.845, -0.89],
      [0.91, -0.8],
      [0.967, -0.61],
      [0.986, -0.47],
      [0.989, 0.35],
      [0.979, 0.48],
      [0.928, 0.57],
    ],
    m.shell,
    -5.065,
    0.03,
    0,
    docking,
    'rounded-docking-pressure-sleeve',
  );
  axialHull(
    [
      [0.976, -0.045],
      [1.009, -0.045],
      [1.025, -0.025],
      [1.025, 0.025],
      [1.009, 0.045],
      [0.976, 0.045],
    ],
    m.metal,
    -4.805,
    0.03,
    0,
    docking,
    'raised-docking-metal-band',
  );
  // Broad outer surface stands clear of the sleeve; no tangent ring intersections.
  axialHull(
    [
      [0.976, -0.055],
      [1.008, -0.055],
      [1.028, -0.03],
      [1.028, 0.03],
      [1.008, 0.055],
      [0.976, 0.055],
    ],
    m.gasket,
    -5.5,
    0.03,
    0,
    docking,
    'raised-docking-expansion-band',
  );
  cylinder(0.808, 0.273, m.navy, -6.103, 0.03, 0, docking, 'x');
  torus(0.796, 0.067, m.amber, -6.215, 0.03, 0, docking, 'x');
  cylinder(0.726, 0.11, m.metal, -6.292, 0.03, 0, docking, 'x');
  cylinder(0.629, 0.045, m.gasket, -6.36, 0.03, 0, docking, 'x');
  cylinder(0.575, 0.058, m.chalk, -6.396, 0.03, 0, docking, 'x');
  torus(0.543, 0.023, m.shell, -6.428, 0.03, 0, docking, 'x');
  cylinder(0.173, 0.035, m.navy, -6.437, 0.03, 0, docking, 'x');
  cylinder(0.088, 0.055, m.amber, -6.479, 0.03, 0, docking, 'x');
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3;
    rod(
      [-6.5, 0.03 + Math.sin(a) * 0.07, Math.cos(a) * 0.07],
      [-6.5, 0.03 + Math.sin(a) * 0.26, Math.cos(a) * 0.26],
      0.019,
      m.metal,
      docking,
    );
  }
  const dockingBolts: Transform[] = [];
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    dockingBolts.push({
      p: [-6.361, 0.03 + Math.sin(a) * 0.688, Math.cos(a) * 0.688],
      r: [0, Math.PI / 2, 0],
    });
  }
  instances(
    boltGeometry,
    m.navy,
    dockingBolts,
    docking,
    'docking-collar-fasteners',
  );
  box(
    0.657,
    0.295,
    0.084,
    m.gasket,
    -5.137,
    0.208,
    0.971,
    docking,
    0.089,
    'docking-control-bezel',
  );
  box(
    0.521,
    0.191,
    0.049,
    m.glass,
    -5.137,
    0.208,
    1.031,
    docking,
    0.067,
    'docking-control-display',
  );
  box(
    0.3,
    0.024,
    0.014,
    m.display,
    -5.143,
    0.212,
    1.064,
    docking,
    0.007,
    'comms-status',
  );
  box(
    0.48,
    0.142,
    0.05,
    m.navy,
    -5.18,
    -0.219,
    0.964,
    docking,
    0.034,
    'docking-access-panel',
  );
  box(
    0.26,
    0.056,
    0.024,
    m.amber,
    -5.18,
    -0.219,
    1.002,
    docking,
    0.017,
    'docking-panel-latch',
  );
  for (const yy of [-0.37, 0.43]) {
    rod([-6.435, yy, -0.407], [-6.505, yy, -0.407], 0.025, m.navy, docking);
    rod([-6.505, yy, -0.407], [-6.505, yy, -0.167], 0.025, m.amber, docking);
    rod([-6.505, yy, -0.167], [-6.435, yy, -0.167], 0.025, m.navy, docking);
  }
  cylinder(0.171, 0.141, m.navy, -5.13, 1.032, 0.0, docking);
  rod([-5.13, 1.041, 0.0], [-5.22, 1.485, 0.105], 0.048, m.metal, docking);
  sphere(0.103, m.amber, -5.219, 1.473, 0.1, docking);
  const dishAssembly = new THREE.Group();
  dishAssembly.position.set(-5.22, 1.635, 0.139);
  dishAssembly.rotation.set(-0.23, -0.19, 0.06);
  docking.add(dishAssembly);
  const dishProfile = [
    [0.025, -0.016],
    [0.115, -0.004],
    [0.25, 0.047],
    [0.386, 0.127],
    [0.505, 0.222],
    [0.511, 0.245],
    [0.49, 0.254],
    [0.379, 0.161],
    [0.242, 0.083],
    [0.11, 0.033],
    [0.025, 0.023],
  ];
  const dishGeometry = new THREE.LatheGeometry(
    dishProfile.map(([r, yy]) => new THREE.Vector2(r, yy)),
    64,
  );
  dishGeometry.rotateX(Math.PI / 2);
  const dishMat = m.chalk.clone();
  dishMat.side = THREE.DoubleSide;
  mesh(dishGeometry, dishMat, dishAssembly, 'double-skin-communications-dish');
  torus(0.5, 0.02, m.metal, 0, 0, 0.243, dishAssembly);
  cylinder(0.081, 0.083, m.navy, 0, 0, -0.047, dishAssembly, 'z');
  rod([0, 0, 0.024], [0, 0, 0.463], 0.02, m.navy, dishAssembly);
  sphere(0.063, m.amber, 0, 0, 0.466, dishAssembly);
  for (const a of [Math.PI / 6, (Math.PI * 5) / 6, (Math.PI * 3) / 2])
    rod(
      [Math.cos(a) * 0.44, Math.sin(a) * 0.44, 0.204],
      [0, 0, 0.429],
      0.008,
      m.metal,
      dishAssembly,
    );

  // AFT — a shared service bus to the right of both cabins.
  const service = new THREE.Group();
  service.userData.section = 'contact';
  service.position.set(-1.5, 0, 0);
  group.add(service);
  axialHull(
    [
      [0.81, -0.43],
      [0.89, -0.39],
      [0.93, -0.24],
      [0.937, 0.12],
      [0.89, 0.28],
      [0.75, 0.38],
    ],
    m.shell,
    4.916,
    0.03,
    0,
    service,
    'aft-service-pressure-hull',
  );
  torus(0.911, 0.033, m.metal, 4.95, 0.03, 0, service, 'x');
  cylinder(0.733, 0.17, m.gasket, 5.268, 0.03, 0, service, 'x');
  cylinder(0.631, 0.274, m.navy, 5.462, 0.03, 0, service, 'x');
  axialHull(
    [
      [0.481, -0.235],
      [0.482, -0.12],
      [0.523, 0.055],
      [0.618, 0.263],
      [0.62, 0.287],
      [0.571, 0.304],
      [0.547, 0.269],
      [0.459, 0.06],
      [0.421, -0.135],
    ],
    m.metal,
    5.717,
    0.03,
    0,
    service,
    'radiused-main-engine-nozzle',
  );
  cylinder(0.419, 0.031, m.deep, 5.674, 0.03, 0, service, 'x');
  torus(0.574, 0.022, m.navy, 6.011, 0.03, 0, service, 'x');
  torus(0.465, 0.019, m.amber, 5.82, 0.03, 0, service, 'x');
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const p = box(
      0.27,
      0.113,
      0.211,
      i % 2 ? m.navy : m.amber,
      5.411,
      0.03 + Math.cos(a) * 0.619,
      Math.sin(a) * 0.619,
      service,
      0.035,
      'engine-jacket-panel',
    );
    p.rotation.x = a;
  }
  // Paired upright solar wings read clearly above and below the service module.
  // Their broad blue cells face +Z, with only a few structural grid divisions.
  for (const sign of [-1, 1]) {
    rod(
      [4.98, 0.03 + sign * 0.63, 0.02],
      [6.1, sign * 1.66, 0.055],
      0.073,
      m.navy,
      service,
    );
    cylinder(0.143, 0.223, m.metal, 5.61, sign * 1.242, 0.046, service);
    cylinder(0.126, 0.106, m.amber, 6.094, sign * 1.598, 0.057, service);
    const wing = new THREE.Group();
    wing.position.set(6.1, sign * 2.685, 0.069);
    wing.rotation.z = sign * -0.035;
    service.add(wing);
    box(
      1.227,
      2.1,
      0.097,
      m.navy,
      0,
      0,
      0,
      wing,
      0.046,
      'upright-solar-panel-chassis',
    );
    const cells: Transform[] = [],
      alternateCells: Transform[] = [],
      rails: Transform[] = [],
      conductors: Transform[] = [],
      bumpers: Transform[] = [];
    for (let col = 0; col < 4; col++)
      for (let row = 0; row < 6; row++) {
        const t = {
          p: [-0.4125 + col * 0.275, -0.755 + row * 0.302, 0.061],
          s: [0.257, 0.282, 0.017],
        };
        ((col + row) % 4 === 0 ? alternateCells : cells).push(t);
      }
    for (let col = 1; col < 4; col++)
      conductors.push({
        p: [-0.55 + col * 0.275, 0, 0.075],
        s: [0.007, 1.799, 0.005],
      });
    for (let row = 1; row < 6; row++)
      conductors.push({
        p: [0, -0.906 + row * 0.302, 0.075],
        s: [1.06, 0.007, 0.005],
      });
    for (const xx of [-0.588, 0.588])
      rails.push({ p: [xx, 0, 0.035], s: [0.045, 2.03, 0.088] });
    for (const yy of [-1.022, 1.022])
      rails.push({ p: [0, yy, 0.035], s: [1.143, 0.049, 0.088] });
    for (const xx of [-0.574, 0.574])
      for (const yy of [-1.014, 1.014])
        bumpers.push({ p: [xx, yy, 0.038], s: [0.108, 0.157, 0.123] });
    instances(unitBox, m.solar, cells, wing, 'large-blue-photovoltaic-cells');
    instances(
      unitBox,
      m.solarAlt,
      alternateCells,
      wing,
      'alternate-blue-photovoltaic-cells',
    );
    instances(
      unitBox,
      m.solarLine,
      conductors,
      wing,
      'coarse-solar-conductor-grid',
    );
    instances(
      roundedGeometry(1, 1, 1, 0.18),
      m.shell,
      rails,
      wing,
      'cream-solar-panel-frame',
    );
    instances(
      roundedGeometry(1, 1, 1, 0.22),
      m.amber,
      bumpers,
      wing,
      'solar-panel-amber-corner-caps',
    );
  }
  box(
    0.3,
    0.12,
    0.39,
    m.navy,
    5.16,
    0.995,
    -0.35,
    service,
    0.052,
    'service-antenna-base',
  );
  rod([5.16, 1.045, -0.35], [5.16, 1.62, -0.35], 0.018, m.metal, service);
  sphere(0.038, m.amber, 5.16, 1.642, -0.35, service);

  // Deployable reading stations. HTML attaches to the anchor in readerSurfaces:
  // Final centers are [roomCenter.x, roomCenter.y, 1.72], width 2.4, height 2.7.
  // All moving parts receive light but do not cast into the static shadow map.
  for (const [section, x] of Object.entries({
    projects: -3,
    experience: 0,
    about: 3,
    contact: 0,
  })) {
    const tray = new THREE.Group();
    tray.name = section + '-deployable-reader';
    tray.userData.animated = true;
    tray.userData.excludePick = true;
    tray.position.set(x, 0, 1.61);
    rooms[section].add(tray);
    box(
      2.57,
      2.87,
      0.092,
      section === 'about' ? m.upholstery : m.navy,
      0,
      0,
      -0.021,
      tray,
      0.045,
      'reader-rigid-backboard',
    );
    box(
      2.467,
      2.777,
      0.043,
      m.chalk,
      0,
      0,
      0.06,
      tray,
      0.021,
      'reader-paper-retainer',
    );
    box(
      2.4,
      2.7,
      0.016,
      section === 'experience' || section === 'contact' ? m.navy : m.paper,
      0,
      0,
      0.094,
      tray,
      0.007,
      'blank-reader-surface',
    );
    if (section === 'projects') {
      box(
        0.39,
        0.106,
        0.136,
        m.metal,
        0,
        1.397,
        0.121,
        tray,
        0.047,
        'reader-top-clip',
      );
      box(
        0.225,
        0.121,
        0.072,
        m.amber,
        0,
        1.426,
        0.217,
        tray,
        0.033,
        'reader-amber-clip-cap',
      );
    } else if (section === 'about') {
      box(
        0.125,
        2.829,
        0.093,
        m.upholstery,
        -1.247,
        0,
        0.13,
        tray,
        0.045,
        'journal-bound-spine',
      );
      for (const yy of [-0.84, 0, 0.84]) {
        const ring = torus(0.084, 0.013, m.metal, -1.238, yy, 0.189, tray);
        ring.scale.x = 0.58;
      }
      box(
        0.049,
        2.576,
        0.073,
        m.paper,
        1.217,
        0,
        0.049,
        tray,
        0.015,
        'journal-visible-page-block',
      );
      for (const zz of [0.031, 0.053, 0.075])
        box(
          0.009,
          2.523,
          0.006,
          m.liner,
          1.246,
          0,
          zz,
          tray,
          0.002,
          'journal-page-edge',
        );
    } else {
      cylinder(0.088, 0.078, m.navy, 0.76, -1.49, 0.21, tray, 'z');
      torus(0.094, 0.013, m.amber, 0.76, -1.49, 0.198, tray);
      box(
        0.314,
        0.077,
        0.034,
        m.amber,
        -0.59,
        -1.49,
        0.182,
        tray,
        0.016,
        'instrument-reader-control',
      );
      box(
        0.145,
        0.077,
        0.034,
        m.gasket,
        -0.23,
        -1.49,
        0.182,
        tray,
        0.016,
        'instrument-reader-control',
      );
    }
    box(
      2.685,
      0.151,
      0.349,
      m.chalk,
      0,
      -1.488,
      -0.013,
      tray,
      0.073,
      'reader-mechanical-tray',
    );
    for (const sign of [-1, 1]) {
      box(
        0.11,
        0.175,
        0.366,
        m.amber,
        sign * 1.29,
        -1.47,
        -0.01,
        tray,
        0.05,
        'reader-tray-bumper',
      );
      rod(
        [sign * 1.115, -1.42, -0.232],
        [sign * 1.08, -0.569, -0.269],
        0.047,
        m.metal,
        tray,
      );
      cylinder(0.087, 0.085, m.navy, sign * 1.1, -0.97, -0.242, tray, 'x');
    }
    const surface = new THREE.Object3D();
    surface.name = section + '-html-reading-surface';
    surface.position.set(0, 0, 0.11);
    surface.userData = {
      width: 2.4,
      height: 2.7,
      section,
      kind:
        section === 'projects'
          ? 'clipboard'
          : section === 'about'
            ? 'journal'
            : 'instrument',
      deployedPosition: [
        roomCenters[section][0],
        roomCenters[section][1],
        1.72,
      ],
    };
    tray.add(surface);
    readerSurfaces[section] = surface;
    readerTrays[section] = { group: tray, progress: 0 };
  }
  // Optional cheap picking surfaces. The renderer can test these before its
  // general room boxes; they stay hidden and are not included in normal targets.
  const proxyMaterial = new THREE.MeshBasicMaterial({ visible: false });
  function interactionBox(
    name: string,
    size: number[],
    p: number[],
    parent: any,
    extra: Record<string, any>,
  ) {
    const object = new THREE.Mesh(
      new THREE.BoxGeometry(...size),
      proxyMaterial,
    );
    object.name = name;
    object.position.set(...p);
    object.visible = false;
    object.userData = {
      ...extra,
      section: sectionOf(parent),
      isInteractionProxy: true,
    };
    parent.add(object);
    interactionTargets.push({ object, section: object.userData.section });
    return object;
  }
  for (const [index, slot] of doorSlots.entries())
    interactionBox(
      'project-door-pick-' + index,
      [0.765, 0.535, 0.194],
      [0.371, 0, 0.032],
      slot.group,
      { projectSlot: index },
    );
  interactionBox(
    'console-reader-pick',
    [1.97, 1.12, 0.16],
    [-0.13, 0.244, -0.506],
    mission,
    { openReader: true },
  );
  interactionBox(
    'journal-reader-pick',
    [0.729, 0.268, 0.58],
    [3.246, -0.345, -0.535],
    cabin,
    { openReader: true },
  );
  interactionBox(
    'clipboard-reader-pick',
    [0.56, 0.14, 0.35],
    [-3, -0.825, 0.72],
    project,
    { openReader: true },
  );
  interactionBox(
    'contact-reader-pick',
    [1.46, 1.0, 0.14],
    [-0.1, 0.258, -0.51],
    contact,
    { openReader: true },
  );
  docking.traverse((object: any) => {
    if (object.isMesh && /docking-control|comms-status/.test(object.name))
      object.userData.openReader = true;
  });

  // Static scenery is batched per room. Moving assemblies are instead batched
  // within their own local space, so each hinge and reader remains independent.
  group.updateMatrixWorld(true);
  let sourceParts = 0;
  const buckets = new Map<
    string,
    {
      parent: any;
      material: any;
      objects: any[];
      moving: boolean;
      section: string;
      openReader: boolean;
      excludePick: boolean;
    }
  >();
  group.traverse((object: any) => {
    if (
      !object.isMesh ||
      object.isInstancedMesh ||
      object.userData.isInteractionProxy
    )
      return;
    sourceParts++;
    let ancestor = object.parent,
      motionRoot: any = null;
    while (ancestor && ancestor !== group) {
      if (ancestor.userData.animated) motionRoot = ancestor;
      ancestor = ancestor.parent;
    }
    const section = object.userData.section;
    const parent = motionRoot || rooms[section];
    const openReader = !!object.userData.openReader,
      excludePick = !!object.userData.excludePick;
    const key =
      parent.uuid +
      ':' +
      object.material.uuid +
      ':' +
      openReader +
      ':' +
      excludePick;
    if (!buckets.has(key))
      buckets.set(key, {
        parent,
        material: object.material,
        objects: [],
        moving: !!motionRoot,
        section,
        openReader,
        excludePick,
      });
    buckets.get(key)!.objects.push(object);
  });
  for (const bucket of buckets.values()) {
    const positions: number[] = [],
      normals: number[] = [],
      uv: number[] = [],
      indices: number[] = [];
    const names: string[] = [];
    const inverse = bucket.parent.matrixWorld.clone().invert();
    for (const object of bucket.objects) {
      const geometry = object.geometry,
        position = geometry.attributes.position,
        normal = geometry.attributes.normal,
        texcoord = geometry.attributes.uv;
      const transform = inverse.clone().multiply(object.matrixWorld),
        normalTransform = new THREE.Matrix3().getNormalMatrix(transform);
      const offset = positions.length / 3,
        p = new THREE.Vector3(),
        n = new THREE.Vector3();
      for (let i = 0; i < position.count; i++) {
        p.fromBufferAttribute(position, i).applyMatrix4(transform);
        positions.push(p.x, p.y, p.z);
        if (normal)
          n.fromBufferAttribute(normal, i)
            .applyMatrix3(normalTransform)
            .normalize();
        else n.set(0, 1, 0);
        normals.push(n.x, n.y, n.z);
        uv.push(
          texcoord ? texcoord.getX(i) : 0,
          texcoord ? texcoord.getY(i) : 0,
        );
      }
      if (geometry.index)
        for (let i = 0; i < geometry.index.count; i++)
          indices.push(offset + geometry.index.getX(i));
      else for (let i = 0; i < position.count; i++) indices.push(offset + i);
      names.push(object.name);
      object.removeFromParent();
    }
    const merged = new THREE.BufferGeometry();
    merged.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3),
    );
    merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    merged.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    merged.setIndex(indices);
    merged.computeBoundingSphere();
    const result = new THREE.Mesh(merged, bucket.material);
    result.name = bucket.section + '-' + bucket.material.name;
    result.castShadow = !bucket.moving && !bucket.material.transparent;
    result.receiveShadow = true;
    result.userData.section = bucket.section;
    result.userData.openReader = bucket.openReader;
    result.userData.excludePick = bucket.excludePick;
    result.userData.parts = names;
    bucket.parent.add(result);
  }
  group.traverse((object: any) => {
    if (
      object.isMesh &&
      !object.userData.isInteractionProxy &&
      !object.userData.excludePick
    )
      targets.push({ object, section: object.userData.section });
  });
  group.userData.roomAnchors = Object.fromEntries(
    Object.entries(roomCenters).map(([section, [x, y]]) => [
      section,
      [x, y, 0.16],
    ]),
  );
  group.userData.roomBounds = Object.fromEntries(
    Object.entries(roomCenters).map(([section, [x, y]]) => [
      section,
      { center: [x, y + 0.045, 0.035], size: [3.0, 3.25, 2.8] },
    ]),
  );
  group.userData.labelAnchors = Object.fromEntries(
    Object.entries(roomCenters).map(([section, [x, y]]) => [
      section,
      [x, y - 1.38, 1.49],
    ]),
  );
  group.userData.labelSizes = { width: 2.22, height: 0.34 };
  group.userData.readerAnchors = Object.fromEntries(
    Object.entries(roomCenters).map(([section, [x, y]]) => [
      section,
      [x, y, 1.72],
    ]),
  );
  group.userData.readerSize = { width: 2.4, height: 2.7 };
  group.userData.projectPageSize = projectPageSize;
  group.userData.projectCapacity = 9;
  group.userData.hotspots = [
    ...doorSlots.map((_, i) => ({
      section: 'projects',
      slot: i,
      position: [
        -2.5 + (i % 3) * 0.85,
        2.295 - Math.floor(i / 3) * 0.607,
        -0.22,
      ],
    })),
    { section: 'experience', position: [1.52, 1.944, -0.4] },
    { section: 'about', position: [-1.404, -2.045, -0.45] },
    { section: 'contact', position: [1.55, -1.442, -0.4] },
  ];
  group.userData.dockingAnchor = [-3.78, 1.91, 1.05];
  group.userData.palette = palette;
  group.userData.description =
    'A two-by-two toybox spacecraft with nine project compartments, mission controls, a personal cabin and a dedicated communications room; a docking nose and right-hand service wings complete the pressure hull';
  group.userData.detailStats = {
    staticSourceParts: sourceParts,
    drawCalls: targets.length,
    instancedDrawCalls: targets.filter((t) => t.object.isInstancedMesh).length,
  };
  group.updateMatrixWorld(true);
  const highlight = new THREE.Color(palette.amber);
  function setProjectPage(requestedPage: number) {
    const pageCount = Math.max(
      1,
      Math.ceil(projectData.length / projectPageSize),
    );
    currentProjectPage = Math.min(
      pageCount - 1,
      Math.max(
        0,
        Math.floor(Number.isFinite(requestedPage) ? requestedPage : 0),
      ),
    );
    for (const [i, slot] of doorSlots.entries()) {
      const index = currentProjectPage * projectPageSize + i;
      slot.project = i < projectPageSize ? projectData[index] || null : null;
      slot.draw(slot.project, index);
      slot.progress = 0;
      slot.hover = 0;
      slot.group.position.z = slot.baseZ;
      slot.group.rotation.y = 0;
      slot.group.traverse((object: any) => {
        object.userData.projectSlot = i;
        object.userData.projectIndex = index;
        if (slot.project) object.userData.projectSlug = slot.project.slug;
        else delete object.userData.projectSlug;
      });
      const hotspot = group.userData.hotspots.find(
        (h: any) => h.section === 'projects' && h.slot === i,
      );
      if (slot.project) hotspot.projectSlug = slot.project.slug;
      else delete hotspot.projectSlug;
    }
    group.userData.projectPage = currentProjectPage;
    group.userData.projectPageCount = pageCount;
    group.updateMatrixWorld(true);
    return {
      page: currentProjectPage,
      pageCount,
      slots: doorSlots.map((slot) => slot.project),
    };
  }
  function setProjects(projects: SpacecraftProject[]) {
    projectData = projects.slice();
    return setProjectPage(currentProjectPage);
  }
  function setReading(section: string, reading: boolean, instant = false) {
    update(Math.max(0, previousTime), lastActive, instant, {
      activeRoom: section,
      reading,
    });
  }
  function update(
    time: number,
    active: string,
    instantHighlight = false,
    state?: SpacecraftState,
  ) {
    const seconds = Number.isFinite(time) ? time : 0;
    if (state) {
      currentState = { ...currentState, ...state };
      if (state.room !== undefined && state.activeRoom === undefined)
        currentState.activeRoom = state.room;
      if (state.slug !== undefined && state.selectedProject === undefined)
        currentState.selectedProject = state.slug;
      if (
        state.projectPage !== undefined &&
        state.projectPage !== currentProjectPage
      )
        setProjectPage(state.projectPage);
    }
    const dt = Math.min(
      0.1,
      Math.max(
        1 / 240,
        state?.delta ||
          (previousTime >= 0 && seconds > previousTime
            ? seconds - previousTime
            : 1 / 60),
      ),
    );
    const blend = instantHighlight ? 1 : 1 - Math.exp(-dt * 13);
    previousTime = seconds;
    lastActive = active;
    let motionActive = false;
    for (const slot of doorSlots) {
      const goal =
        currentState.activeRoom === 'projects' &&
        !!slot.project &&
        currentState.selectedProject === slot.project.slug
          ? 1
          : 0;
      slot.progress += (goal - slot.progress) * blend;
      if (Math.abs(slot.progress - goal) < 0.002) slot.progress = goal;
      slot.group.rotation.y = -slot.progress * 1.32;
      const hoverGoal =
        !!slot.project &&
        (currentState.hoveredProject === slot.project.slug || goal === 1)
          ? 1
          : 0;
      slot.hover += (hoverGoal - slot.hover) * blend;
      if (Math.abs(slot.hover - hoverGoal) < 0.002) slot.hover = hoverGoal;
      slot.group.position.z = slot.baseZ + slot.hover * 0.075;
      slot.group.userData.openProgress = slot.progress;
      slot.group.userData.hoverProgress = slot.hover;
      if (slot.progress !== goal || slot.hover !== hoverGoal)
        motionActive = true;
    }
    for (const [section, tray] of Object.entries(readerTrays)) {
      const goal =
        currentState.reading && currentState.activeRoom === section ? 1 : 0;
      tray.progress += (goal - tray.progress) * blend;
      if (Math.abs(tray.progress - goal) < 0.002) tray.progress = goal;
      const p = tray.progress;
      tray.group.visible = p > 0;
      tray.group.scale.setScalar(p > 0 ? 1 : 0.001);
      tray.group.position.y = -0.94 * (1 - p);
      tray.group.position.z = 0.73 + 0.88 * p;
      tray.group.rotation.x = -0.95 * (1 - p);
      if (p !== goal) motionActive = true;
    }
    group.userData.motionActive = motionActive;
    sweep.rotation.z = -seconds * 0.34;
    for (const section of Object.keys(roomMaterials)) {
      const selected = currentState.activeRoom === section;
      const goal = !selected && active === section ? 1 : 0;
      strengths[section] = instantHighlight
        ? goal
        : strengths[section] + (goal - strengths[section]) * blend;
      const amount = strengths[section];
      const dimmerGoal = selected || active === section ? 1 : 0;
      roomDimmers[section] += (dimmerGoal - roomDimmers[section]) * blend;
      const dimmer = roomDimmers[section];
      for (const material of roomMaterials[section]) {
        const base = material.userData.baseEmissive;
        const label =
          material.name === 'identification-label' ||
          material.name.startsWith('project-data-label-');
        const exterior =
          material.name === 'ceramic-hull' ||
          material.name === 'brushed-titanium' ||
          material.name.startsWith('solar-');
        const idleColor = exterior ? 0.9 : 0.73;
        material.color
          .copy(material.userData.baseColor)
          .multiplyScalar(label ? 1 : idleColor + (1 - idleColor) * dimmer);
        const emissiveScale =
          material.name === 'warm-light'
            ? 0.34 + 0.66 * dimmer
            : material.name.includes('screen')
              ? 0.75 + 0.25 * dimmer
              : 1;
        material.emissive
          .copy(base)
          .multiplyScalar(material.userData.baseIntensity * emissiveScale);
        const lift = label
          ? 0
          : (selected ? 0.16 : amount) * material.userData.highlightScale;
        material.emissive.r += highlight.r * lift;
        material.emissive.g += highlight.g * lift;
        material.emissive.b += highlight.b * lift;
        material.emissiveIntensity = 1;
      }
      if (roomLights[section]) {
        const targetIntensity = selected
          ? 2.1
          : active === section
            ? 2.85
            : 0.48;
        roomLights[section].intensity +=
          (targetIntensity - roomLights[section].intensity) * blend;
      }
    }
    // Slot signals are applied last, independently of whole-room highlighting.
    for (const slot of doorSlots) {
      slot.glow.emissive
        .copy(highlight)
        .multiplyScalar(
          slot.project ? 0.015 + slot.hover * 1.8 + slot.progress * 0.35 : 0,
        );
      slot.glow.emissiveIntensity = 1;
    }
    group.updateMatrixWorld(true);
  }
  setProjectPage(0);
  update(0, '', true);
  const overview = new THREE.Box3().setFromObject(group);
  const overviewCenter = overview.getCenter(new THREE.Vector3());
  const overviewSize = overview.getSize(new THREE.Vector3());
  group.userData.overviewBounds = {
    min: overview.min.toArray(),
    max: overview.max.toArray(),
    center: overviewCenter.toArray(),
    size: overviewSize.toArray(),
  };
  group.userData.recommendedFraming = {
    target: [overviewCenter.x, overviewCenter.y, 0.1],
    direction: [-0.18, 0.12, 1],
    verticalSpan: overviewSize.y * 1.14,
    horizontalSpan: overviewSize.x * 1.14,
    roll: 0,
  };
  return {
    group,
    targets,
    update,
    setProjectPage,
    setProjects,
    setReading,
    readerSurfaces,
    interactionTargets,
  };
}
