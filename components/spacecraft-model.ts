import { buildContactFlightConsole } from './contact-flight-console.ts';
import { buildProjectsWorkshop } from './projects-workshop.ts';

/**
 * Orbital toybox, v14. Self-contained procedural Three.js asset.
 * +Y up and +Z front. One continuous chassis surrounds four cabins with stable metadata anchors.
 * Room meshes carry userData.section; the shared outer chassis is excluded from picking.
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
  travelling?: boolean;
  transitRoom?: string | null;
  /** Preview the ladder bay only from a cabin; overview hover stays dim. */
  hoveredWalkway?: boolean;
  /** True only while the camera is physically passing through the ladder bay. */
  transitWalkway?: boolean;
  selectedCaseStudy?: string | null;
  hoveredCaseStudy?: string | null;
  caseStudyPage?: number;
  room?: string;
  selectedProject?: string | null;
  hoveredProject?: string | null;
  slug?: string | null;
  projectPage?: number;
  reading?: boolean;
  delta?: number;
  /** Use the fixed side collar plaques for a +PI/2 portrait overview. */
  labelPortrait?: boolean;
  layout?: 'wide' | 'compact';
  /** Directed portal ID or a destination room; nonadjacent rooms use first hop. */
  hoveredPortal?: string | null;
};
export function createSpacecraft(
  THREE: any,
  options: {
    accent?: string;
    labels?: Record<string, string>;
    projects?: SpacecraftProject[];
    caseStudies?: SpacecraftProject[];
    sampleLabel?: string;
    projectPageSize?: number;
    screenLabels?: boolean;
    layout?: 'wide' | 'compact';
    vesselName?: string;
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
  setCaseStudyPage: (page: number) => {
    page: number;
    pageCount: number;
    slots: Array<SpacecraftProject | null>;
  };
  setCaseStudies: (items: SpacecraftProject[]) => {
    page: number;
    pageCount: number;
    slots: Array<SpacecraftProject | null>;
  };
  setReading: (section: string, reading: boolean, instant?: boolean) => void;
  setLabelOrientation: (portrait: boolean) => void;
  setLayout: (layout: 'wide' | 'compact') => any;
  portalTargets: Array<{
    object: any;
    section: string;
    from: string;
    to: string;
    edge: string;
    id: string;
  }>;
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
  let caseStudyData = (options.caseStudies || []).slice();
  let currentCaseStudyPage = 0;
  let currentState: SpacecraftState = {
    activeRoom: 'home',
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
    cartridge: any;
    spare: any;
  }> = [];
  const caseStudySlots: typeof doorSlots = [];
  const rackSlots: Record<string, typeof doorSlots> = {
    projects: doorSlots,
    experience: caseStudySlots,
  };
  const readerSurfaces: Record<string, any> = {};
  const structures: Record<string, any> = {};
  const contents: Record<string, any> = {};
  const labelMounts = new Map<any, any>();
  const walkwayCouplings: any[] = [];
  const portalTargets: Array<{
    object: any;
    section: string;
    from: string;
    to: string;
    edge: string;
    id: string;
  }> = [];
  const portals: Array<any> = [];
  // One continuous C-shaped circulation route; there are no deck openings.
  const adjacency: Record<string, string[]> = {
    experience: ['projects'],
    projects: ['experience', 'about'],
    about: ['projects', 'contact'],
    contact: ['about'],
  };
  let currentLayout: 'wide' | 'compact' = 'compact';
  let layoutScale = 1;
  const labelPlaques: Array<{
    section: string;
    role: 'header';
    text: string;
    position: number[];
    size: number[];
    attached: boolean;
    rotation: number;
    fontSize?: number;
    canvasSize?: number[];
    inkBounds?: number[];
    visible: boolean;
  }> = [];
  let labelPortrait = false;
  const hasEquipmentHeader = (section: string) =>
    section === 'projects' || section === 'contact';
  // Shared physical scale and elevation for room headings and doorway signs.
  const wayfinding = {
    textHeight: 0.18,
    textWidth: 0.96,
    inkWidthRatio: 940 / 1024,
    fontRatio: 0.7,
    plateHeight: 0.25,
    enamelHeight: 0.22,
    centerY: 1.11,
  };
  const headerPosition = (_section: string): [number, number] =>
    [wayfinding.centerY, -0.427];
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
    wall: mat('plain-cabin-enamel', palette.ivory, 0.82, 0),
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
    const structure = new THREE.Group();
    structure.name = section + '-pressure-structure';
    structure.userData = { section, batchRoot: true, structureRoot: true };
    room.add(structure);
    structures[section] = structure;
    const content = new THREE.Group();
    content.name = section + '-cabin-contents';
    content.userData = { section, batchRoot: true };
    room.add(content);
    contents[section] = content;
    strengths[section] = 0;
    roomDimmers[section] = 0;
    roomMaterials[section] = [];
  }
  roomMaterials.walkway = [];
  strengths.walkway = 0;
  roomDimmers.walkway = 0;
  function sectionOf(parent: any): string {
    return (
      parent.userData.section ||
      (parent.parent ? sectionOf(parent.parent) : 'about')
    );
  }
  function roomMat(
    original: any,
    section: string,
    exterior = false,
    surfaceOnly = false,
  ) {
    surfaceOnly ||= !!original.userData.surfaceOnly;
    const key =
      original.uuid + ':' + section + ':' + exterior + ':' + surfaceOnly;
    if (!materials.has(key)) {
      const clone = original.clone();
      clone.userData.exterior = exterior;
      clone.userData.surfaceOnly = surfaceOnly;
      clone.userData.baseEmissive = original.emissive.clone();
      clone.userData.baseColor = original.color.clone();
      clone.userData.baseIntensity = original.emissiveIntensity;
      clone.userData.highlightScale = original.userData.highlightScale ?? 0.035;
      roomMaterials[section].push(clone);
      materials.set(key, clone);
    }
    return materials.get(key);
  }
  function surfaceOnlyScope(parent: any) {
    for (let p = parent; p; p = p.parent)
      if (p.userData.surfaceOnly) return true;
    return false;
  }
  function exteriorScope(parent: any, name = '', original?: any) {
    if (original?.userData.roomSurface || name.endsWith('-interior'))
      return false;
    for (let p = parent; p; p = p.parent)
      if (p.userData.roomSurface) return false;
    if (original?.userData.exterior || name.endsWith('-exterior')) return true;
    for (let p = parent; p; p = p.parent) if (p.userData.exterior) return true;
    return /^(rounded-front-pressure-collar|recessed-front-pressure-seal|hover-perimeter-light-guide|external-amber-lifting-tab|roof-latch|reinforced-|room-label-|side-label-|nameplate-amber-clasp|side-nameplate-amber-clasp|underside-service-keel|captive-collar-fasteners)/.test(
      name,
    );
  }
  function cached(key: string, make: () => any) {
    if (!cache.has(key)) cache.set(key, make());
    return cache.get(key);
  }
  // Segment placement is concentrated on the radiused edges of the cuboid.
  function roundedGeometry(w: number, h: number, d: number, radius = 0.04) {
    const r = Math.min(radius, w * 0.495, h * 0.495, d * 0.495);
    return cached(`rounded:${w}:${h}:${d}:${r}`, () => {
      // Keep every curved bevel sample; omit the redundant midpoint along
      // each straight core span. Odd segment counts connect -core to +core.
      const segments = Math.max(w, h, d) > 0.4 ? 9 : 5;
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
        segments === 9
          ? [-1, -0.8, -0.45, -0.18, 0, 0, 0.18, 0.45, 0.8, 1]
          : [-1, -0.45, 0, 0, 0.45, 1];
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
          return (
            Math.sign(index - segments / 2) *
            (core[a] + Math.abs(steps[index]) * r)
          );
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
    const object = new THREE.Mesh(
      geometry,
      roomMat(
        material,
        section,
        exteriorScope(parent, name, material),
        surfaceOnlyScope(parent),
      ),
    );
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
  function pressureMesh(
    geometry: any,
    material: any,
    parent: any,
    name: string,
    side: number,
  ) {
    const key = `pressure-surfaces:${geometry.uuid}:${side}`;
    const pair = cached(key, () => {
      const source = geometry.index ? geometry.toNonIndexed() : geometry;
      const p = source.getAttribute('position'),
        n = source.getAttribute('normal'),
        uv = source.getAttribute('uv');
      const buckets = [
        { p: [] as number[], n: [] as number[], uv: [] as number[] },
        { p: [] as number[], n: [] as number[], uv: [] as number[] },
      ];
      for (let i = 0; i < p.count; i += 3) {
        const center = new THREE.Vector3(),
          normal = new THREE.Vector3();
        for (let j = 0; j < 3; j++) {
          center.add(new THREE.Vector3().fromBufferAttribute(p, i + j));
          normal.add(new THREE.Vector3().fromBufferAttribute(n, i + j));
        }
        center.multiplyScalar(1 / 3);
        normal.normalize();
        const outside = side
          ? normal.x * side > 0.1
          : normal.dot(center.sub(new THREE.Vector3(0, 0.05, 0))) >= -0.015;
        const frontClosure =
          name.endsWith('-continuous-pressure-skin') &&
          center.z > 1.2 &&
          normal.z > 0.5;
        const bucket = buckets[outside && !frontClosure ? 0 : 1];
        for (let j = 0; j < 3; j++) {
          bucket.p.push(p.getX(i + j), p.getY(i + j), p.getZ(i + j));
          bucket.n.push(n.getX(i + j), n.getY(i + j), n.getZ(i + j));
          bucket.uv.push(uv ? uv.getX(i + j) : 0, uv ? uv.getY(i + j) : 0);
        }
      }
      return buckets.map((bucket) => {
        const g = new THREE.BufferGeometry();
        g.setAttribute(
          'position',
          new THREE.Float32BufferAttribute(bucket.p, 3),
        );
        g.setAttribute('normal', new THREE.Float32BufferAttribute(bucket.n, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(bucket.uv, 2));
        g.computeBoundingSphere();
        return g;
      });
    });
    const assembly = new THREE.Group();
    assembly.userData.section = sectionOf(parent);
    parent.add(assembly);
    // The common chassis replaces only the external faces of the former pods.
    // Their interior triangles retain their original geometry and materials.
    if (
      !name.endsWith('-continuous-pressure-skin') &&
      !name.endsWith('-sealed-outboard-wall')
    )
      mesh(pair[0], material, assembly, name + '-exterior');
    const insideMaterial =
      /continuous-pressure-skin|sealed-outboard-wall|open-side-pressure-bulkhead|walkway-(twin-open-room|open-docking)-wall/.test(
        name,
      )
        ? m.wall
        : material;
    mesh(pair[1], insideMaterial, assembly, name + '-interior');
    return assembly;
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
    segments = Math.max(radius, radiusTop) <= 0.06
      ? 16
      : Math.max(radius, radiusTop) <= 0.18
        ? 24
        : Math.max(radius, radiusTop) <= 0.3
          ? 32
          : 40,
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
      () =>
        new THREE.TorusGeometry(
          radius,
          tube,
          radius <= 0.25 ? (tube < 0.01 ? 6 : 8) : 10,
          radius <= 0.1 ? 24 : radius <= 0.25 ? 32 : 56,
        ),
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
      () => new THREE.SphereGeometry(radius, 16, 12),
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
      roomMat(
        material,
        section,
        exteriorScope(parent, name, material),
        surfaceOnlyScope(parent),
      ),
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
  // Header plaques remain permanently attached inside their original cabins.
  // Exterior room identification is supplied by renderer-owned callouts.
  function plaque(
    text: string,
    w: number,
    h: number,
    x: number,
    y: number,
    z: number,
    parent: any,
    role: 'header',
    inkColor = '#233549',
  ) {
    const section = sectionOf(parent);
    const entry: (typeof labelPlaques)[number] = {
      section,
      role,
      text,
      position: [
        x + roomCenters[section][0] - legacyCenters[section],
        y + roomCenters[section][1],
        z,
      ],
      size: [w, h],
      attached: true,
      rotation: 0,
      visible: true,
    };
    labelPlaques.push(entry);
    if (typeof document === 'undefined') return;
    const canvas = document.createElement('canvas');
    canvas.width = 1536;
    canvas.height = Math.max(128, Math.round((1536 * h) / w));
    const context = canvas.getContext('2d');
    if (!context) return;
    const ctx = context;
    let texture: any = null;
    function drawLabel(width = w) {
      canvas.width = Math.round((1536 * width) / w);
      canvas.height = Math.max(128, Math.round((1536 * h) / w));
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = inkColor;
      const title = text.trim().toUpperCase();
      const baseSize = canvas.height * wayfinding.fontRatio;
      ctx.font = `800 ${baseSize}px Arial, sans-serif`;
      const measured = ctx.measureText(title);
      const glyphHeight =
        (measured.actualBoundingBoxAscent || baseSize * 0.73) +
        (measured.actualBoundingBoxDescent || baseSize * 0.08);
      const fit = Math.min(
        1,
        (canvas.width * 0.94) / Math.max(1, measured.width),
        // Long room names use the doorway's width-fit too, even on a wider plaque.
        (wayfinding.textWidth * wayfinding.inkWidthRatio * canvas.height) /
          (h * Math.max(1, measured.width)),
        (canvas.height * 0.88) / Math.max(1, glyphHeight),
      );
      const fontSize = baseSize * fit;
      ctx.font = `800 ${fontSize}px Arial, sans-serif`;
      if (hasEquipmentHeader(section)) {
        ctx.textBaseline = 'alphabetic';
        const ink = ctx.measureText(title);
        const ascent = ink.actualBoundingBoxAscent || fontSize * 0.73;
        const descent = ink.actualBoundingBoxDescent || 0;
        ctx.fillText(
          title,
          canvas.width / 2,
          (canvas.height + ascent - descent) / 2,
        );
      } else {
        ctx.fillText(title, canvas.width / 2, canvas.height / 2);
      }
      entry.canvasSize = [canvas.width, canvas.height];
      entry.fontSize = fontSize;
      entry.inkBounds = [measured.width * fit, glyphHeight * fit];
      entry.size[0] = width;
      if (texture) {
        texture.dispose();
        texture.needsUpdate = true;
      }
    }
    drawLabel();
    texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = hasEquipmentHeader(section) ? 8 : 4;
    const material = mat('identification-label', 0xffffff, 0.7, 0, {
      map: texture,
      transparent: true,
      depthWrite: false,
      emissiveMap: texture,
      emissive: 0xffffff,
      emissiveIntensity: 0.12,
    });
    material.userData.exterior = false;
    if (hasEquipmentHeader(section)) {
      material.roughness = 1;
      material.envMapIntensity = 0;
      material.userData.cabinHeaderInk = true;
    }
    const mount = new THREE.Group();
    mount.name = role + '-label-mount-' + section;
    mount.userData = { section, batchRoot: true, physicalLabel: true };
    if (hasEquipmentHeader(section)) mount.userData.excludePick = true;
    mount.position.set(x, y, z);
    rooms[section].add(mount);
    labelMounts.set(entry, mount);
    const face = mesh(
      new THREE.PlaneGeometry(w, h),
      material,
      mount,
      role + '-plaque-ink-' + section,
    );
    face.position.set(0, 0, 0);
    face.rotation.z = 0;
    face.material.visible = entry.visible;
    face.castShadow = false;
  }
  function setLabelOrientation(portrait: boolean) {
    // Kept for renderer compatibility; no exterior label geometry remains.
    labelPortrait = !!portrait;
    group.userData.brandInkVisible = false;
    group.userData.labelPortrait = labelPortrait;
  }

  // Four complete pressure modules. The rounded front cutout is built in XY;
  // actual side bulkheads are in YZ. Adjacent front skins retain a 20 mm gap
  // including bevels, avoiding coplanar overlap and black seam flickering.
  const cabinFloorTop = -1.32;
  const previousFloorTop = -0.9535;
  const cabinCeiling = 1.455;
  const shellShape = new THREE.Shape();
  // The original C-section itself meets the cutaway: no second roof slab.
  // Profile X becomes -Z after rotation, so -1.245 seats inside the front frame.
  shellShape.moveTo(-1.245, -1.52);
  shellShape.lineTo(0.67, -1.52);
  shellShape.quadraticCurveTo(1.36, -1.52, 1.36, -0.65);
  shellShape.lineTo(1.36, 0.91);
  shellShape.quadraticCurveTo(1.36, 1.58, 0.69, 1.58);
  shellShape.lineTo(-1.245, 1.58);
  shellShape.lineTo(-1.245, cabinCeiling);
  shellShape.lineTo(0.67, cabinCeiling);
  shellShape.quadraticCurveTo(1.1, cabinCeiling, 1.1, 0.89);
  shellShape.lineTo(1.1, -0.61);
  shellShape.quadraticCurveTo(1.1, -1.405, 0.67, -1.405);
  shellShape.lineTo(-1.245, -1.405);
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
  const frontSeal = frameGeometry(2.74, 2.79, 0.32, 0.069, 0.078, 0.01);
  // At 1.4× width, opposing bulkhead skins retain a 20 mm gap.
  const endWallGeometry = panelGeometry(2.5, 2.88, 0.48, 0.14, 0.03).clone();
  endWallGeometry.rotateY(Math.PI / 2);
  for (const [index, section] of [
    'projects',
    'experience',
    'about',
    'contact',
  ].entries()) {
    const x = legacyCenters[section],
      room = structures[section];
    const exteriorHardware = new THREE.Group();
    exteriorHardware.userData = { section, exterior: true };
    room.add(exteriorHardware);
    const skin = pressureMesh(
      shellGeometry,
      m.shell,
      room,
      section + '-continuous-pressure-skin',
      0,
    );
    skin.position.set(x, 0, 0);
    const seal = mesh(
      frontSeal,
      m.gasket,
      room,
      'recessed-front-pressure-seal',
    );
    seal.position.set(x, 0.06, 1.145);
    const hoverPerimeter = mesh(
      frameGeometry(2.58, 2.605, 0.24, 0.017, 0.014, 0.004),
      m.hoverRail,
      room,
      'hover-perimeter-light-guide',
    );
    hoverPerimeter.position.set(x, 0.06, 1.215);
    // Keep the deck's front edge inside the chassis face, rather than
    // projecting through it as an exterior bar. Rear edge and height stay fixed.
    box(
      2.65,
      0.105,
      2.39,
      m.liner,
      x,
      cabinFloorTop - 0.0525,
      0.075,
      room,
      0.025,
      'coherent-cabin-deck',
    );

    // The pressure skin itself is the plain rear wall; no raised panels or cove trim.
    // Two generous warm fixtures, sunk into individual rounded ceiling bezels.
    for (const dx of [-0.66, 0.66]) {
      box(
        1.015,
        0.117,
        0.213,
        m.liner,
        x + dx,
        cabinCeiling - 0.0585,
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
        cabinCeiling - 0.1375,
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
    roomLights[section] = [-0.66, 0.66].map((dx) => {
      const light = new THREE.PointLight(0xffc792, 0.35, 3.1, 2);
      light.position.set(x + dx, 0.8, 0.48);
      room.add(light);
      return light;
    });
    box(
      2.25,
      0.018,
      0.032,
      m.hoverRail,
      x,
      cabinFloorTop + 0.009,
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
        cabinFloorTop + 0.009,
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
      {
        rod(
          [x + sign * 1.29, -0.47, 1.355],
          [x + sign * 1.29, 0.36, 1.355],
          0.036,
          m.amber,
          exteriorHardware,
        );
        sphere(0.049, m.amber, x + sign * 1.29, -0.47, 1.354, exteriorHardware);
        sphere(0.049, m.amber, x + sign * 1.29, 0.36, 1.354, exteriorHardware);
      }
    }
    if (hasEquipmentHeader(section)) {
      // Rear-mounted enamel heading, at the same elevation as the door signs.
      const header = new THREE.Group();
      header.name = `cabin-identification-${section}`;
      header.userData = {
        section,
        physicalLabel: true,
        batchRoot: true,
        excludePick: true,
      };
      header.position.set(x, headerPosition(section)[0], -0.5);
      rooms[section].add(header);
      box(
        1.76,
        wayfinding.plateHeight,
        0.1,
        m.gasket,
        0,
        0,
        0,
        header,
        0.025,
        'cabin-identification-rim',
      );
      box(
        1.64,
        wayfinding.enamelHeight,
        0.022,
        m.chalk,
        0,
        0,
        0.046,
        header,
        0.015,
        'cabin-identification-inset',
      );
      for (const side of [-1, 1]) {
        // Two rear standoffs seat in the pressure wall, away from the lights.
        box(
          0.082,
          0.13,
          0.6,
          m.gasket,
          side * 0.62,
          0,
          -0.34,
          header,
          0.01,
          'cabin-identification-standoff',
        );
        box(
          0.024,
          0.12,
          0.01,
          m.amber,
          side * 0.765,
          0,
          0.061,
          header,
          0.004,
          'cabin-identification-index',
        );
        cylinder(
          0.018,
          0.009,
          m.chalk,
          side * 0.845,
          0,
          0.052,
          header,
          'z',
          undefined,
          12,
        );
        box(
          0.017,
          0.003,
          0.003,
          m.gasket,
          side * 0.845,
          0,
          0.058,
          header,
          0.001,
          'cabin-identification-fastener-slot',
        );
      }
      plaque(
        options.labels?.[section] || section,
        1.42,
        wayfinding.textHeight,
        x,
        ...headerPosition(section),
        room,
        'header',
        '#152333',
      );
    } else {
      box(
        1.52,
        wayfinding.plateHeight,
        0.65,
        m.gasket,
        x,
        wayfinding.centerY,
        -0.82,
        room,
        0.055,
        'upper-header-wall-saddle',
      );
      box(
        1.48,
        wayfinding.enamelHeight,
        0.13,
        m.chalk,
        x,
        wayfinding.centerY,
        -0.504,
        room,
        0.055,
        'upper-room-enamel-header',
      );
      plaque(
        options.labels?.[section] || `MOD-0${index + 1}`,
        1.26,
        wayfinding.textHeight,
        x,
        ...headerPosition(section),
        room,
        'header',
      );
    }
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
  const passageClear = 1.84;
  // Nested rebates keep the frame, sleeve and structural opening from sharing
  // coplanar inner faces. The finished frame defines the usable clear opening.
  const passageWallClear = 1.94;
  const passageCorner = 0.255;
  const passageCenterZ = 0;
  const passageShape = roundedPath(new THREE.Shape(), 2.5, 2.88, 0.48);
  const roomOpening = offsetPath(
    roundedPath(
      new THREE.Path(),
      passageWallClear,
      passageWallClear,
      passageCorner,
    ),
    -passageCenterZ,
    -0.1,
  );
  passageShape.holes.push(roomOpening);
  const openWallGeometry = new THREE.ExtrudeGeometry(passageShape, {
    depth: 0.14,
    bevelEnabled: true,
    bevelSize: 0.02,
    bevelThickness: 0.02,
    bevelSegments: 3,
    curveSegments: 16,
  });
  openWallGeometry.translate(0, 0, -0.07);
  openWallGeometry.rotateY(Math.PI / 2);
  // Projects/About open on both sides; right-column cabins open only left.
  for (const section of Object.keys(roomCenters)) {
    const room = structures[section],
      origin = legacyCenters[section];
    const leftColumn = section === 'projects' || section === 'about';
    for (const sign of [-1, 1]) {
      const passage = leftColumn || sign === -1;
      const wall = pressureMesh(
        passage ? openWallGeometry : endWallGeometry,
        m.shell,
        room,
        passage
          ? 'open-side-pressure-bulkhead'
          : section + '-sealed-outboard-wall',
        sign,
      );
      wall.position.set(origin + sign * 1.5, 0.04, 0);
    }
  }

  const thresholdLiner = mat(
    'passage-borrowed-light-liner',
    palette.chalk,
    0.82,
    0,
    {
      emissive: 0x000000,
      emissiveIntensity: 0,
    },
  );
  thresholdLiner.userData.surfaceOnly = true;
  thresholdLiner.userData.roomSurface = true;
  for (const section of Object.keys(roomCenters)) {
    const origin = legacyCenters[section];
    for (const sign of [-1, 1]) {
      if ((section === 'experience' || section === 'contact') && sign > 0)
        continue;
      box(
        0.3,
        2.06,
        0.045,
        thresholdLiner,
        origin + sign * 1.365,
        0.04,
        -1.25,
        structures[section],
        0.019,
        'visible-neighbor-rear-corner-liner',
      );
    }
  }
  // Tall cutaway walkway connects the two left hatches with an actual interior.
  // Its right wall has two matching openings; the docking sleeve enters left
  // at mid-height. A zero-gravity handrail/ladder gives the vertical run scale.
  const walkwayTrim = mat('painted-walkway-rail', palette.amber, 1, 0);
  walkwayTrim.userData.surfaceOnly = true;
  const walkway = new THREE.Group();
  walkway.name = 'left-vertical-walkway';
  walkway.userData = {
    section: 'walkway',
    batchRoot: true,
    excludePick: true,
    exterior: true,
  };
  group.add(walkway);
  const walkwayStructure = new THREE.Group();
  walkwayStructure.userData = {
    section: 'walkway',
    batchRoot: true,
    excludePick: true,
  };
  walkway.add(walkwayStructure);
  const walkwayFurniture = new THREE.Group();
  walkwayFurniture.userData = {
    roomSurface: true,
    surfaceOnly: true,
    section: 'walkway',
    batchRoot: true,
    excludePick: true,
  };
  walkway.add(walkwayFurniture);
  // Long elliptical shoulders taper most of the ladder bay's left edge. The
  // short central straight section retains the full-height docking aperture.
  function walkwayOutline(
    path: any,
    w: number,
    h: number,
    leftWidth: number,
    leftHeight: number,
    right: number,
    rightEdge = w / 2,
  ) {
    const x = -w / 2,
      y = -h / 2,
      k = 0.5522847498;
    path.moveTo(x + leftWidth, y);
    path.lineTo(rightEdge - right, y);
    path.quadraticCurveTo(rightEdge, y, rightEdge, y + right);
    path.lineTo(rightEdge, y + h - right);
    path.quadraticCurveTo(rightEdge, y + h, rightEdge - right, y + h);
    path.lineTo(x + leftWidth, y + h);
    path.bezierCurveTo(
      x + leftWidth * (1 - k),
      y + h,
      x,
      y + h - leftHeight * (1 - k),
      x,
      y + h - leftHeight,
    );
    path.lineTo(x, y + leftHeight);
    path.bezierCurveTo(
      x,
      y + leftHeight * (1 - k),
      x + leftWidth * (1 - k),
      y,
      x + leftWidth,
      y,
    );
    path.closePath();
    return path;
  }
  function walkwayProfile(
    w: number,
    h: number,
    leftWidth: number,
    leftHeight: number,
    right: number,
    thickness: number,
    depth: number,
    bevel: number,
  ) {
    const shape = walkwayOutline(
      new THREE.Shape(),
      w,
      h,
      leftWidth,
      leftHeight,
      right,
    );
    if (thickness)
      shape.holes.push(
        walkwayOutline(
          new THREE.Path(),
          w - thickness * 2,
          h - thickness * 2,
          leftWidth - thickness,
          leftHeight - thickness,
          right - thickness,
        ),
      );
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelSize: bevel,
      bevelThickness: bevel,
      bevelSegments: 3,
      curveSegments: 16,
      steps: 1,
    });
    geometry.translate(0, 0, -depth / 2);
    return geometry;
  }
  const walkwaySeal = mesh(
    walkwayProfile(1.32, 6.1, 1.22, 2.0, 0.035, 0.025, 0.06, 0.005),
    m.gasket,
    walkwayStructure,
    'walkway-pressure-collar-seal',
  );
  walkwaySeal.position.set(0, 0.01, 1.19);
  // The rear lining is one closed pressure-panel volume. Its curved return
  // shares the shell's shoulder endpoints, rather than stacking a smaller
  // floating slab in front of a differently shaped shell.
  function walkwayRearGeometry() {
    const outer = walkwayOutline(
      new THREE.Shape(),
      1.5,
      6.4,
      1.35,
      2.14,
      0.1,
    ).getPoints(16);
    // The rear wall rolls into the single aperture contour through a small
    // concave cove. No overlaid skin or triangular end sheet is necessary.
    const inner = walkwayOutline(
      new THREE.Shape(),
      1.17,
      5.96,
      1.15,
      1.93,
      0.04,
    )
      .getPoints(16)
      .map((p: any) => p.add(new THREE.Vector2(0, 0.01)));
    // Seat the existing cove directly on the twin wall's inner face:
    // 0.75 wall center - 0.06 half-depth - 0.018 bevel. No bridging sheet.
    const rim = walkwayOutline(
      new THREE.Shape(),
      1.33,
      6.12,
      1.23,
      2.01,
      0.04,
      0.672,
    )
      .getPoints(16)
      .map((p: any) => p.add(new THREE.Vector2(0, 0.01)));
    if (rim[0].distanceToSquared(rim[rim.length - 1]) < 1e-12) rim.pop();
    if (outer[0].distanceToSquared(outer[outer.length - 1]) < 1e-12)
      outer.pop();
    if (inner[0].distanceToSquared(inner[inner.length - 1]) < 1e-12)
      inner.pop();
    // Keep the rear lining within the ladder bay. Extending this contour
    // through the shared wall creates a folded panel inside the cabin doorway.
    const n = inner.length,
      frontZ = -0.985,
      rearZ = -1.21;
    // The right-hand cove meets the rear jamb at z=-0.975, just behind
    // the opening's z=-0.970 edge. A full-depth return would end inside
    // the open doorway and leave a slit between these existing surfaces.
    const coveDepth = rim.map((p: any) => (p.x > 0.6 ? 0.01 : 0.08));
    const frontPositions: number[] = [],
      frontIndices: number[] = [];
    const rearPositions: number[] = [],
      rearIndices: number[] = [];
    for (const p of inner) frontPositions.push(p.x, p.y, frontZ);
    const faces = THREE.ShapeUtils.triangulateShape(inner, []);
    for (const face of faces) frontIndices.push(...face);
    // Quarter-round cove: tangential to the flat back at the start, then to
    // the axial wall at the end. Separate back vertices retain a flat normal.
    const ringBase = frontPositions.length / 3,
      steps = 8;
    for (let step = 0; step <= steps; step++) {
      const a = ((step / steps) * Math.PI) / 2;
      const radial = Math.sin(a),
        depth = 1 - Math.cos(a);
      for (let i = 0; i < n; i++)
        frontPositions.push(
          inner[i].x + (rim[i].x - inner[i].x) * radial,
          inner[i].y + (rim[i].y - inner[i].y) * radial,
          frontZ + coveDepth[i] * depth,
        );
    }
    for (let step = 0; step < steps; step++)
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const a = ringBase + step * n + i,
          b = ringBase + step * n + j;
        const c = ringBase + (step + 1) * n + i,
          d = ringBase + (step + 1) * n + j;
        frontIndices.push(a, c, d, a, d, b);
      }
    // The shoulder lining continues from this rear wall to the shared front
    // aperture. It replaces the separate inner shell skin, so no second sheet
    // edge remains visible where the rear lining meets the curved shoulders.
    const shoulderBase = frontPositions.length / 3,
      shoulderSteps = 2;
    const shoulderFrontZ = 1.12;
    for (let step = 0; step <= shoulderSteps; step++) {
      const t = step / shoulderSteps;
      for (let i = 0; i < n; i++)
        frontPositions.push(
          rim[i].x,
          rim[i].y,
          frontZ + coveDepth[i] + (shoulderFrontZ - frontZ - coveDepth[i]) * t,
        );
    }
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const upper = Math.min(rim[i].y, rim[j].y) >= 1.06 - 1e-6;
      const lower = Math.max(rim[i].y, rim[j].y) <= -1.04 + 1e-6;
      if (!upper && !lower) continue; // Keep all three actual passages open.
      for (let step = 0; step < shoulderSteps; step++) {
        const a = shoulderBase + step * n + i,
          b = shoulderBase + (step + 1) * n + i;
        const c = shoulderBase + step * n + j,
          d = shoulderBase + (step + 1) * n + j;
        frontIndices.push(a, b, d, a, d, c);
      }
    }
    // The shoulder ends seat inside the docking wall bevel. There is no
    // separate fan-shaped end patch protruding into the passage.
    for (const p of outer) rearPositions.push(p.x, p.y, rearZ);
    for (const face of THREE.ShapeUtils.triangulateShape(outer, []))
      rearIndices.push(face[2], face[1], face[0]);
    const make = (positions: number[], indices: number[]) => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(positions, 3),
      );
      geometry.setAttribute(
        'uv',
        new THREE.Float32BufferAttribute(
          new Float32Array((positions.length / 3) * 2),
          2,
        ),
      );
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      geometry.computeBoundingSphere();
      return geometry;
    };
    return {
      inside: make(frontPositions, frontIndices),
      outside: make(rearPositions, rearIndices),
    };
  }
  const sharedWalkwayWalls: Record<string, any> = {};
  for (const room of ['projects', 'about']) {
    const material = m.wall.clone();
    material.userData.linkedRooms = [room, 'walkway'];
    material.userData.surfaceOnly = true;
    sharedWalkwayWalls[room] = material;
  }
  const walkwayRear = walkwayRearGeometry();
  mesh(
    walkwayRear.inside,
    m.wall,
    walkwayFurniture,
    'walkway-continuous-rear-liner',
  );
  mesh(
    walkwayRear.outside,
    m.shell,
    walkwayStructure,
    'walkway-rear-pressure-shell-exterior',
  );
  // These hollow shoulder bands continue the same ellipse through the full
  // pressure-shell depth, rather than merely rounding its front trim.
  const capShape = new THREE.Shape();
  const shoulderK = 0.5522847498;
  capShape.moveTo(-0.75, 1.06);
  capShape.bezierCurveTo(
    -0.75,
    1.06 + 2.14 * shoulderK,
    0.6 - 1.35 * shoulderK,
    3.2,
    0.6,
    3.2,
  );
  capShape.lineTo(0.75, 3.2);
  capShape.lineTo(0.75, 3.06);
  capShape.lineTo(0.6, 3.06);
  capShape.bezierCurveTo(
    0.6 - 1.21 * shoulderK,
    3.06,
    -0.61,
    1.06 + 2.0 * shoulderK,
    -0.61,
    1.06,
  );
  capShape.closePath();
  const capGeometry = new THREE.ExtrudeGeometry(capShape, {
    depth: 2.42,
    bevelEnabled: true,
    bevelSize: 0.018,
    bevelThickness: 0.018,
    bevelSegments: 3,
    curveSegments: 16,
    steps: 1,
  });
  capGeometry.translate(0, 0, -1.21);
  // Extruded curve faces duplicate their vertices and otherwise retain one
  // normal per segment. Smooth the longitudinal inner and outer shoulder faces;
  // keep the bevels, planar end faces and deliberate hard creases unchanged.
  function smoothShoulderNormals(geometry: any) {
    const positions = geometry.getAttribute('position');
    const normals = geometry.getAttribute('normal');
    const neighbors = new Map<string, Array<{ normal: any; weight: number }>>();
    const key = (p: any) =>
      `${Math.round(p.x * 1e6)}:${Math.round(p.y * 1e6)}:${Math.round(p.z * 1e6)}`;
    const points = [
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
    ];
    for (let i = 0; i < positions.count; i += 3) {
      for (let j = 0; j < 3; j++)
        points[j].fromBufferAttribute(positions, i + j);
      const normal = points[1]
        .clone()
        .sub(points[0])
        .cross(points[2].clone().sub(points[0]))
        .normalize();
      if (Math.abs(normal.z) > 1e-5 || normal.lengthSq() < 0.5) continue;
      for (let j = 0; j < 3; j++) {
        const a = points[(j + 1) % 3].clone().sub(points[j]).normalize();
        const b = points[(j + 2) % 3].clone().sub(points[j]).normalize();
        const weight = Math.acos(Math.max(-1, Math.min(1, a.dot(b))));
        const k = key(points[j]),
          list = neighbors.get(k) || [];
        list.push({ normal, weight });
        neighbors.set(k, list);
      }
    }
    const point = new THREE.Vector3(),
      original = new THREE.Vector3();
    const average = new THREE.Vector3(),
      crease = Math.cos(Math.PI / 4);
    for (let i = 0; i < positions.count; i++) {
      original.fromBufferAttribute(normals, i);
      if (Math.abs(original.z) > 1e-5) continue;
      point.fromBufferAttribute(positions, i);
      average.set(0, 0, 0);
      for (const neighbor of neighbors.get(key(point)) || [])
        if (original.dot(neighbor.normal) > crease)
          average.addScaledVector(neighbor.normal, neighbor.weight);
      if (average.lengthSq() > 1e-12) {
        average.normalize();
        normals.setXYZ(i, average.x, average.y, average.z);
      }
    }
    normals.needsUpdate = true;
  }
  function withoutForwardShoulderCap(geometry: any) {
    // The common chassis already closes this end. The legacy cap follows a
    // smaller aperture and leaves a raised strip inside the ladder opening.
    // Remove its forward face and bevel, retaining the longitudinal hull skin.
    const p = geometry.getAttribute('position');
    const keep: number[] = [];
    const a = new THREE.Vector3(),
      b = new THREE.Vector3(),
      c = new THREE.Vector3();
    for (let i = 0; i < p.count; i += 3) {
      a.fromBufferAttribute(p, i);
      b.fromBufferAttribute(p, i + 1);
      c.fromBufferAttribute(p, i + 2);
      const forward =
        Math.min(a.z, b.z, c.z) >= 1.21 - 1e-6 &&
        b.sub(a).cross(c.sub(a)).normalize().z > 0.0001;
      if (!forward) keep.push(i, i + 1, i + 2);
    }
    const result = new THREE.BufferGeometry();
    for (const name of Object.keys(geometry.attributes)) {
      const attribute = geometry.getAttribute(name);
      const values = new Float32Array(keep.length * attribute.itemSize);
      keep.forEach((index, offset) => {
        for (let component = 0; component < attribute.itemSize; component++)
          values[offset * attribute.itemSize + component] =
            attribute.array[index * attribute.itemSize + component];
      });
      result.setAttribute(
        name,
        new THREE.Float32BufferAttribute(values, attribute.itemSize),
      );
    }
    result.computeBoundingSphere();
    return result;
  }
  for (const sign of [-1, 1]) {
    const shape = capGeometry.clone();
    if (sign < 0) shape.rotateX(Math.PI);
    const capPositions = shape.getAttribute('position');
    for (let i = 0; i < capPositions.count; i++) {
      const y = capPositions.getY(i);
      const t = Math.max(0, Math.min(1, (Math.abs(y) - 1.06) / 2.14));
      capPositions.setY(
        i,
        y + sign * (sign > 0 ? 0.12 : 0.07) * t * t * (3 - 2 * t),
      );
    }
    shape.computeVertexNormals();
    const cap = pressureMesh(
      shape,
      m.shell,
      walkwayStructure,
      'walkway-curved-end-pressure-cap',
      0,
    );
    // The unified rear/shoulder liner supplies the inside face. Keep only
    // this structural shell's exterior, avoiding a second skin over that liner.
    for (const part of cap.children.slice()) {
      if (part.name.endsWith('-interior')) {
        part.removeFromParent();
        part.geometry.dispose();
      } else {
        const oldGeometry = part.geometry;
        part.geometry = withoutForwardShoulderCap(oldGeometry);
        oldGeometry.dispose();
        smoothShoulderNormals(part.geometry);
      }
    }
  }
  function shareWalkwayDoorwayLighting(wall: any) {
    const interior = wall.children.find((part: any) =>
      part.name.endsWith('-interior'),
    );
    const original = interior.geometry;
    const p = original.getAttribute('position');
    const n = original.getAttribute('normal');
    const buckets: number[][] = [[], [], []];
    const openingHalf = passageWallClear / 2 + 0.025;
    for (let i = 0; i < p.count; i += 3) {
      let y = 0,
        z = 0,
        ladderPlane = true;
      for (let j = i; j < i + 3; j++) {
        y += p.getY(j) / 3;
        z += p.getZ(j) / 3;
        ladderPlane &&=
          n.getX(j) < -0.999 &&
          Math.abs(n.getY(j)) < 0.0001 &&
          Math.abs(n.getZ(j)) < 0.0001;
      }
      // The flat stairwell wall stays ladder-owned. Only the tunnel and its
      // inner bevel borrow light from the adjoining cabin, like the coupling.
      const opening =
        !ladderPlane && Math.abs(z - passageCenterZ) <= openingHalf
          ? [1.64, -1.76].findIndex(
              (center) => Math.abs(y - center) <= openingHalf,
            )
          : -1;
      buckets[opening + 1].push(i, i + 1, i + 2);
    }
    buckets.forEach((vertices, index) => {
      const geometry = new THREE.BufferGeometry();
      for (const name of Object.keys(original.attributes)) {
        const attribute = original.getAttribute(name);
        const values = new Float32Array(vertices.length * attribute.itemSize);
        vertices.forEach((vertex, offset) => {
          for (let c = 0; c < attribute.itemSize; c++)
            values[offset * attribute.itemSize + c] =
              attribute.array[vertex * attribute.itemSize + c];
        });
        geometry.setAttribute(
          name,
          new THREE.Float32BufferAttribute(values, attribute.itemSize),
        );
      }
      geometry.computeBoundingSphere();
      if (index === 0) interior.geometry = geometry;
      else {
        const room = index === 1 ? 'projects' : 'about';
        mesh(
          geometry,
          sharedWalkwayWalls[room],
          wall,
          `walkway-${room}-doorway-reveal-interior`,
        );
      }
    });
    original.dispose();
  }
  for (const side of [-1, 1]) {
    const outline = roundedPath(
      new THREE.Shape(),
      side > 0 ? 2.5 : 2.42,
      side > 0 ? 6.24 : 2.12,
      side > 0 ? 0.38 : 0,
    );
    if (side > 0) {
      for (const yy of [-1.7, 1.7]) {
        const opening = offsetPath(
          roundedPath(
            new THREE.Path(),
            passageWallClear,
            passageWallClear,
            passageCorner,
          ),
          -passageCenterZ,
          yy - 0.06,
        );
        outline.holes.push(opening);
      }
    } else {
      const dockingOpening = roundedPath(new THREE.Path(), 1.82, 1.9, 0.79);
      // Match both the external sleeve and the inner leaf's shared Y/Z axis.
      for (const curve of dockingOpening.curves)
        for (const key of ['v0', 'v1', 'v2'])
          if (curve[key]) curve[key].y += 0.03;
      outline.holes.push(dockingOpening);
    }
    const skin = new THREE.ExtrudeGeometry(outline, {
      depth: side > 0 ? 0.12 : 0.085,
      bevelEnabled: side > 0,
      bevelSize: 0.018,
      bevelThickness: 0.018,
      bevelSegments: 3,
      curveSegments: 16,
    });
    skin.translate(0, 0, side > 0 ? -0.06 : -0.0425);
    skin.rotateY(Math.PI / 2);
    const wall = pressureMesh(
      skin,
      m.shell,
      walkwayStructure,
      side > 0 ? 'walkway-twin-open-room-wall' : 'walkway-open-docking-wall',
      side,
    );
    // The docking wall shares the shoulder outer/inner datums, without a proud plate.
    wall.position.x = side > 0 ? 0.75 : -0.7075;
    if (side > 0) shareWalkwayDoorwayLighting(wall);
    else {
      // The dock wall and curved shoulder returns share one interior finish.
      // The structural exterior keeps its independent hull material.
      for (const part of wall.children)
        if (part.name.endsWith('-interior'))
          part.material = roomMat(m.wall, 'walkway', false, true);
    }
  }
  // Zero-gravity transfer bay: no projecting decks, sills or landing cleats.
  // Ladder stand-offs overlap both the liner and the rail; there is no
  // unsupported quarter-unit gap behind the ladder assembly.
  for (const xx of [-0.08, 0.38])
    for (const yy of [-2.16, -0.56, 1.04, 2.3]) {
      const support = cylinder(
        0.026,
        0.27,
        m.metal,
        xx,
        yy,
        -0.835,
        walkwayFurniture,
        'z',
      );
      support.name = 'walkway-ladder-rigid-stand-off';
    }
  for (const xx of [-0.08, 0.38])
    rod(
      [xx, -2.61, -0.69],
      [xx, 2.55, -0.69],
      0.029,
      m.amber,
      walkwayFurniture,
    );
  for (let yy = -2.51; yy <= 2.51; yy += 0.418)
    rod(
      [-0.08, yy, -0.69],
      [0.38, yy, -0.69],
      0.025,
      m.metal,
      walkwayFurniture,
    );
  for (const yy of [-1.7, 1.7]) {
    box(
      0.16,
      1.31,
      0.1,
      m.navy,
      -0.23,
      yy,
      -0.925,
      walkwayFurniture,
      0.04,
      'walkway-service-channel',
    );
    box(
      0.044,
      0.97,
      0.038,
      walkwayTrim,
      -0.23,
      yy,
      -0.854,
      walkwayFurniture,
      0.017,
      'walkway-route-light-guide',
    );
  }
  roomLights.walkway = [];
  const dockingInterior = new THREE.Group();
  dockingInterior.name = 'walkway-finished-inner-docking-hatch';
  dockingInterior.userData = {
    section: 'walkway',
    batchRoot: true,
    roomSurface: true,
    surfaceOnly: true,
    excludePick: true,
  };
  walkway.add(dockingInterior);
  dockingInterior.rotation.y = Math.PI / 2;
  const entryGasket = mesh(
    frameGeometry(1.9, 1.98, 0.82, 0.12, 0.045, 0.008),
    m.gasket,
    dockingInterior,
    'inner-docking-continuous-gasket',
  );
  entryGasket.position.z = -0.028;
  const entryLeaf = mesh(
    panelGeometry(1.67, 1.75, 0.68, 0.082, 0.012),
    m.liner,
    dockingInterior,
    'inner-docking-closed-pressure-leaf',
  );
  entryLeaf.position.z = -0.014;
  torus(0.39, 0.032, m.metal, 0, 0, 0.07, dockingInterior);
  cylinder(0.1, 0.1, m.navy, 0, 0, 0.075, dockingInterior, 'z');
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3;
    rod(
      [Math.cos(a) * 0.095, Math.sin(a) * 0.095, 0.111],
      [Math.cos(a) * 0.34, Math.sin(a) * 0.34, 0.111],
      0.025,
      m.amber,
      dockingInterior,
    );
  }
  for (const side of [-1, 1]) {
    box(
      0.07,
      0.37,
      0.1,
      m.navy,
      side * 0.69,
      0,
      0.044,
      dockingInterior,
      0.032,
      'inner-hatch-locking-dog',
    );
    box(
      0.058,
      0.2,
      0.07,
      m.amber,
      side * 0.69,
      0,
      0.106,
      dockingInterior,
      0.027,
      'inner-hatch-lock-tab',
    );
  }
  const utility = new THREE.Group();
  utility.userData = {
    section: 'contact',
    batchRoot: true,
    exterior: true,
    excludePick: true,
  };
  group.add(utility);
  for (const yy of [1.64, -1.76]) {
    const coupledLiner = thresholdLiner.clone();
    coupledLiner.userData.linkedRooms =
      yy > 0 ? ['projects', 'experience'] : ['about', 'contact'];
    const walkwayLiner = thresholdLiner.clone();
    walkwayLiner.userData.linkedRooms = [
      yy > 0 ? 'projects' : 'about',
      'walkway',
    ];
    const sleeve = mesh(
      frameGeometry(2.0, 2.0, 0.285, 0.05, 0.35, 0.01),
      coupledLiner,
      utility,
      'open-horizontal-pressure-coupling',
    );
    sleeve.rotation.y = Math.PI / 2;
    sleeve.position.set(0, yy, passageCenterZ);
    const coupling = new THREE.Group();
    coupling.userData = {
      section: 'walkway',
      batchRoot: true,
      excludePick: true,
    };
    utility.add(coupling);
    walkwayCouplings.push(coupling);
    const tube = mesh(
      frameGeometry(2.0, 2.0, 0.285, 0.05, 0.3, 0.01),
      walkwayLiner,
      coupling,
      'open-walkway-room-coupling',
    );
    tube.rotation.y = Math.PI / 2;
    tube.position.set(0, yy, passageCenterZ);
  }
  // Nine physical compartments, arranged as three columns by three rows.
  // Each hinge, title texture and signal rail remains independent after batching.
  function buildPayloadRack(
    section: 'projects' | 'experience',
    slots: typeof doorSlots,
  ) {
    const project = rooms[section],
      origin = legacyCenters[section];
    const prefix = section === 'projects' ? 'project' : 'case-study';
    const rackFrame = mesh(
      frameGeometry(2.66, 1.985, 0.145, 0.075, 0.46, 0.014),
      m.gasket,
      project,
      'nine-slot-' + prefix + '-payload-rack',
    );
    rackFrame.position.set(origin, -0.038, -0.75);
    for (let slotIndex = 0; slotIndex < 9; slotIndex++) {
      const col = slotIndex % 3,
        row = Math.floor(slotIndex / 3);
      const x = origin - 0.85 + col * 0.85,
        y = 0.595 - row * 0.607;
      const bay = mesh(
        frameGeometry(0.792, 0.565, 0.064, 0.036, 0.39, 0.008),
        m.navy,
        project,
        'deep-empty-compartment-liner',
      );
      bay.position.set(x, y, -0.705);
      box(
        0.693,
        0.477,
        0.051,
        m.deep,
        x,
        y,
        -0.925,
        project,
        0.025,
        'project-compartment-back',
      );
      const spare = new THREE.Group();
      spare.name =
        (section === 'projects'
          ? 'spare-equipment-bay-'
          : 'case-study-spare-equipment-bay-') + slotIndex;
      spare.userData = {
        section,
        animated: true,
        excludePick: true,
        spareEquipment: true,
      };
      project.add(spare);
      const spareKinds = [
        'thermal-blanket',
        'service-hose',
        'inspection-torch',
        'tool-roll',
        'filter-canister',
        'headset',
        'cooling-fan',
        'safety-tether',
        'folded-tripod',
      ];
      spare.userData.spareKind = spareKinds[slotIndex];
      box(
        0.49,
        0.025,
        0.23,
        m.navy,
        x,
        y - 0.18,
        -0.66,
        spare,
        0.012,
        'equipment-retaining-cradle',
      );
      if (slotIndex === 0) {
        for (const yy of [-0.09, 0.045])
          cylinder(0.069, 0.39, m.blanket, x, y + yy, -0.67, spare, 'x').name =
            'stowed-thermal-blanket';
        for (const dx of [-0.12, 0.12])
          box(
            0.036,
            0.24,
            0.15,
            m.amber,
            x + dx,
            y - 0.02,
            -0.67,
            spare,
            0.017,
            'blanket-retaining-webbing',
          );
      } else if (slotIndex === 1) {
        for (const r of [0.068, 0.106, 0.145])
          torus(r, 0.02, m.metal, x - 0.045, y - 0.02, -0.63, spare).name =
            'coiled-service-hose';
        box(
          0.055,
          0.29,
          0.06,
          m.navy,
          x - 0.045,
          y - 0.02,
          -0.59,
          spare,
          0.018,
          'hose-retaining-strap',
        );
        box(
          0.09,
          0.09,
          0.15,
          m.amber,
          x + 0.19,
          y - 0.12,
          -0.65,
          spare,
          0.024,
          'hose-quick-coupling',
        );
      } else if (slotIndex === 2) {
        cylinder(0.065, 0.4, m.navy, x, y - 0.05, -0.65, spare, 'x').name =
          'stowed-inspection-torch';
        for (const dx of [-0.19, 0.19])
          cylinder(0.079, 0.06, m.metal, x + dx, y - 0.05, -0.65, spare, 'x');
        box(
          0.12,
          0.065,
          0.12,
          m.amber,
          x,
          y + 0.05,
          -0.65,
          spare,
          0.025,
          'torch-retaining-clip',
        );
      } else if (slotIndex === 3) {
        box(
          0.43,
          0.23,
          0.17,
          m.linen,
          x,
          y - 0.04,
          -0.69,
          spare,
          0.065,
          'secured-canvas-tool-roll',
        );
        for (const dx of [-0.14, 0, 0.14])
          box(
            0.048,
            0.21,
            0.035,
            m.navy,
            x + dx,
            y - 0.02,
            -0.585,
            spare,
            0.019,
            'tool-roll-pockets',
          );
        box(
          0.46,
          0.035,
          0.035,
          m.amber,
          x,
          y - 0.11,
          -0.558,
          spare,
          0.016,
          'tool-roll-buckle-strap',
        );
      } else if (slotIndex === 4) {
        cylinder(0.095, 0.25, m.chalk, x, y - 0.015, -0.69, spare, 'y').name =
          'spare-filter-canister';
        for (const yy of [-0.145, 0.115])
          cylinder(0.107, 0.042, m.metal, x, y + yy, -0.69, spare, 'y');
        box(
          0.045,
          0.25,
          0.055,
          m.amber,
          x,
          y - 0.01,
          -0.574,
          spare,
          0.021,
          'canister-retaining-strap',
        );
      } else if (slotIndex === 5) {
        const band = mesh(
          new THREE.TorusGeometry(0.15, 0.025, 8, 24, Math.PI),
          m.navy,
          spare,
          'spare-headset-band',
        );
        band.position.set(x, y - 0.04, -0.66);
        for (const dx of [-0.145, 0.145])
          box(
            0.085,
            0.12,
            0.13,
            m.upholstery,
            x + dx,
            y - 0.07,
            -0.66,
            spare,
            0.04,
            'headset-earcup',
          );
        box(
          0.3,
          0.032,
          0.055,
          m.amber,
          x,
          y - 0.13,
          -0.572,
          spare,
          0.014,
          'headset-securing-loop',
        );
      } else if (slotIndex === 6) {
        cylinder(0.145, 0.07, m.navy, x, y - 0.02, -0.67, spare, 'z').name =
          'spare-cooling-fan-housing';
        torus(0.142, 0.02, m.metal, x, y - 0.02, -0.62, spare);
        for (let k = 0; k < 5; k++) {
          const a = (k * Math.PI * 2) / 5;
          const blade = box(
            0.13,
            0.045,
            0.028,
            m.slate,
            x + Math.cos(a) * 0.06,
            y - 0.02 + Math.sin(a) * 0.06,
            -0.615,
            spare,
            0.018,
            'spare-fan-blade',
          );
          blade.rotation.z = a;
        }
        box(
          0.035,
          0.32,
          0.048,
          m.amber,
          x,
          y - 0.02,
          -0.578,
          spare,
          0.017,
          'fan-retaining-strap',
        );
      } else if (slotIndex === 7) {
        for (const dx of [-0.12, 0, 0.12]) {
          const loop = torus(
            0.075,
            0.022,
            m.amber,
            x + dx,
            y - 0.01,
            -0.65,
            spare,
          );
          loop.scale.y = 1.42;
          loop.name = 'coiled-safety-tether';
        }
        torus(0.045, 0.012, m.metal, x + 0.215, y - 0.1, -0.625, spare).name =
          'tether-locking-carabiner';
        box(
          0.4,
          0.028,
          0.045,
          m.navy,
          x,
          y - 0.11,
          -0.585,
          spare,
          0.013,
          'tether-securing-strap',
        );
      } else {
        for (const dx of [-0.1, 0, 0.1])
          rod(
            [x + dx - 0.035, y - 0.14, -0.68],
            [x + dx + 0.035, y + 0.14, -0.68],
            0.023,
            m.metal,
            spare,
          ).name = 'folded-tripod-leg';
        box(
          0.26,
          0.07,
          0.1,
          m.navy,
          x,
          y + 0.125,
          -0.66,
          spare,
          0.032,
          'tripod-head',
        );
        box(
          0.34,
          0.035,
          0.052,
          m.amber,
          x,
          y - 0.045,
          -0.6,
          spare,
          0.016,
          'tripod-retaining-band',
        );
      }
      const cartridge = new THREE.Group();
      cartridge.name =
        (section === 'projects'
          ? 'occupied-cartridge-'
          : 'occupied-case-study-cartridge-') + slotIndex;
      cartridge.userData = {
        section,
        animated: true,
        projectSlot: slotIndex,
      };
      project.add(cartridge);
      box(
        0.561,
        0.12,
        0.166,
        m.navy,
        x,
        y - 0.115,
        -0.62,
        cartridge,
        0.037,
        'stowed-project-cartridge',
      );
      for (const yy of [-0.16, 0.16])
        cylinder(0.022, 0.078, m.metal, x - 0.383, y + yy, -0.379, project);
      const door = new THREE.Group();
      door.name = `${prefix}-compartment-hinge-${slotIndex}`;
      door.position.set(x - 0.371, y, -0.362);
      door.userData.animated = true;
      door.userData.surfaceOnly = true;
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
      const signalSource = m.amber.clone();
      signalSource.userData.surfaceOnly = true;
      signalSource.userData.highlightScale = 0;
      signalSource.name = prefix + '-slot-trim-' + slotIndex;
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
            prefix + '-data-label-' + slotIndex,
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
      slots.push({
        group: door,
        progress: 0,
        hover: 0,
        baseZ: -0.362,
        glow: signal.material,
        draw: paint,
        project: null,
        cartridge,
        spare,
      });
    }
  }
  // Projects is a static category workshop. The previous individual-project
  // lockers and their pick surfaces disappear with the replaced furnishings.
  // Catalog interaction is intentionally deferred; keep the public reader APIs.
  const workshop = new THREE.Group();
  workshop.name = 'projects-workshop';
  workshop.position.set(legacyCenters.projects + 0.18, previousFloorTop, 0);
  workshop.userData.batchRoot = true;
  rooms.projects.add(workshop);
  const projectWorkshop = buildProjectsWorkshop(
    THREE,
    { box, mesh, cylinder, torus, rod, instances },
    workshop,
    {
      projectCount: projectData.length,
      accent: m.amber,
    },
  );
  buildPayloadRack('experience', caseStudySlots);
  // The dossier reader is stowed flush until reading=true; no center table.

  // The experience key is now a second data-backed payload cabinet.
  // Its public display name comes from options.labels.experience.
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

  // CONTACT — static, floor-referenced flight operations console.
  // The existing content transform lowers legacy props to the cabin floor.
  // Cancel its horizontal inset so this wide console stays centered on the wall.
  const contact = rooms.contact;
  const contactConsole = new THREE.Group();
  contactConsole.name = 'contact-flight-console';
  contactConsole.position.set(-0.18, previousFloorTop, 0);
  contactConsole.userData.openReader = true;
  contactConsole.userData.batchRoot = true;
  contact.add(contactConsole);
  buildContactFlightConsole(
    THREE,
    { box, mesh, cylinder, torus, rod, instances },
    contactConsole,
    { title: options.labels?.contact, accent: m.amber },
  );

  // DOCKING — rounded docking sleeve, pressure hatch and articulated dish.
  const docking = new THREE.Group();
  docking.name = 'central-docking-assembly';
  docking.userData = { section: 'contact', batchRoot: true, exterior: true };
  docking.position.set(1.35, 0, 0);
  group.add(docking);
  // A compact coaxial pressure mount seats directly in the ladder sidewall.
  // Its central bore is aligned with the sleeve and the inner hatch; a tall
  // offset block must not appear as an independent panel behind the barrel.
  function dockingRing(
    outerRadius: number,
    innerRadius: number,
    depth: number,
  ) {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);
    const bore = new THREE.Path();
    bore.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
    shape.holes.push(bore);
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelSize: 0.008,
      bevelThickness: 0.008,
      bevelSegments: 2,
      curveSegments: 24,
      steps: 1,
    });
    geometry.translate(0, 0, -depth / 2);
    geometry.rotateY(Math.PI / 2);
    return geometry;
  }
  const dockingMount = mesh(
    dockingRing(1.06, 0.915, 0.3),
    m.shell,
    docking,
    'coaxial-docking-load-bearing-mount',
  );
  dockingMount.position.set(-4.58, 0.03, 0);
  const dockingRetainer = mesh(
    dockingRing(1.011, 0.91, 0.06),
    m.navy,
    docking,
    'docking-mount-seated-retaining-ring',
  );
  dockingRetainer.position.set(-4.728, 0.03, 0);
  const diaphragm = cylinder(0.948, 0.22, m.navy, -4.6, 0.03, 0, docking, 'x');
  diaphragm.name = 'docking-mount-pressure-diaphragm';
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
  // AFT — a shared service bus to the right of both cabins.
  const service = new THREE.Group();
  service.name = 'aft-service-assembly';
  service.userData = { section: 'contact', batchRoot: true, exterior: true };
  service.position.set(-1.5, 0, 0);
  group.add(service);
  // Placement follows the service-module organization documented for ESA ATV:
  // solar drives, communications and the KURS antenna share the service bus.
  // This toybox uses a small forward-offset dish with a triangulated bracket,
  // leaving both solar hinge envelopes and the left docking approach clear.
  // https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/ATV/ATV_Service_Module
  // https://www.esa.int/ESA_Multimedia/Images/2013/06/ATV-4_docking
  box(
    0.44,
    0.32,
    0.16,
    m.navy,
    5.26,
    0.2,
    0.8,
    service,
    0.06,
    'communications-mast-service-foot',
  );
  rod([5.18, 0.11, 0.68], [5.63, 0.22, 1.04], 0.052, m.metal, service);
  rod([5.49, 0.36, 0.6], [5.63, 0.22, 1.04], 0.043, m.navy, service);
  sphere(0.1, m.amber, 5.63, 0.22, 1.04, service);
  const dishAssembly = new THREE.Group();
  dishAssembly.name = 'service-mounted-communications-dish';
  dishAssembly.position.set(5.64, 0.23, 1.16);
  dishAssembly.rotation.set(-0.1, 0.18, -0.03);
  service.add(dishAssembly);
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
  const solarWings: any[] = [];
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
    solarWings.push(wing);
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
  for (const [section, slots] of Object.entries(rackSlots))
    for (const [index, slot] of slots.entries()) {
      const key = section === 'projects' ? 'project' : 'caseStudy';
      interactionBox(
        key + '-door-pick-' + index,
        [0.765, 0.535, 0.194],
        [0.371, 0, 0.032],
        slot.group,
        {
          [key + 'Slot']: index,
          ...(section === 'experience' ? { openReader: true } : {}),
        },
      );
    }
  interactionBox(
    'journal-reader-pick',
    [0.729, 0.268, 0.58],
    [3.246, -0.345, -0.535],
    cabin,
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

  function portalLabel(
    text: string,
    parent: any,
    width: number,
    height: number,
    preserveCase = false,
  ) {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = Math.round((1024 * height) / width);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#203448';
    const title = preserveCase ? text.trim() : text.trim().toUpperCase();
    let font = canvas.height * (preserveCase ? 0.9 : wayfinding.fontRatio);
    ctx.font = `800 ${font}px Arial, sans-serif`;
    font *= Math.min(
      1,
      (canvas.width * wayfinding.inkWidthRatio) / Math.max(1, ctx.measureText(title).width),
    );
    ctx.font = `800 ${font}px Arial, sans-serif`;
    ctx.fillText(title, 512, canvas.height * 0.51);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = 8;
    const material = new THREE.MeshLambertMaterial({
      name: 'portal-destination-label',
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
      color: 0xffffff,
      map: texture,
      transparent: true,
      depthWrite: false,
      emissive: 0x000000,
    });
    material.userData.surfaceOnly = true;
    const face = mesh(
      new THREE.PlaneGeometry(width, height),
      material,
      parent,
      'portal-destination-ink',
    );
    face.castShadow = false;
    return face;
  }
  const navigationPaint = mat('painted-navigation-symbol', palette.navy, 1, 0);
  navigationPaint.userData.surfaceOnly = true;
  function routeSymbol(
    parent: any,
    x: number,
    y: number,
    z: number,
    ladder: boolean,
    up: boolean,
    size = 1,
  ) {
    const symbol = new THREE.Group();
    symbol.userData.section = sectionOf(parent);
    symbol.position.set(x, y, z);
    symbol.scale.setScalar(size);
    parent.add(symbol);
    const shape = new THREE.Shape();
    const direction = up ? 1 : -1;
    shape.moveTo(-0.012, -direction * 0.059);
    shape.lineTo(0.012, -direction * 0.059);
    shape.lineTo(0.012, direction * 0.012);
    shape.lineTo(0.037, direction * 0.012);
    shape.lineTo(0, direction * 0.059);
    shape.lineTo(-0.037, direction * 0.012);
    shape.lineTo(-0.012, direction * 0.012);
    shape.closePath();
    const arrow = mesh(
      new THREE.ShapeGeometry(shape),
      navigationPaint,
      symbol,
      'painted-direction-arrow',
    );
    arrow.position.x = ladder ? 0.032 : 0;
    if (ladder) {
      const rail = new THREE.PlaneGeometry(0.007, 0.11);
      for (const dx of [-0.045, -0.007]) {
        const r = mesh(rail, navigationPaint, symbol, 'painted-ladder-side');
        r.position.x = dx;
      }
      for (const dy of [-0.045, -0.015, 0.015, 0.045]) {
        const rung = mesh(
          new THREE.PlaneGeometry(0.031, 0.007),
          navigationPaint,
          symbol,
          'painted-ladder-rung',
        );
        rung.position.set(-0.026, dy, 0);
      }
      // Center the combined ladder/arrow silhouette, so paired marks balance.
      for (const part of symbol.children) part.position.x -= 0.01;
    }
    return symbol;
  }
  const walkwaySigns: any[] = [];
  for (const yy of [-1.7, 1.7]) {
    const sign = new THREE.Group();
    sign.name = 'walkway-entrance-ladder-sign';
    sign.userData = {
      section: 'walkway',
      roomSurface: true,
      surfaceOnly: true,
      batchRoot: true,
    };
    sign.position.set(0.4, yy + 0.66, -0.948);
    walkwayFurniture.add(sign);
    box(
      0.27,
      0.3,
      0.052,
      m.chalk,
      0,
      0,
      0,
      sign,
      0.032,
      'walkway-ladder-sign-enamel',
    );
    routeSymbol(sign, 0, 0, 0.03, true, yy < 0, 1.65);
    walkwaySigns.push(sign);
  }
  // Portfolio identity is rendered by the page heading, not the spacecraft.
  group.userData.branding = [];
  group.userData.circulation = ['experience', 'projects', 'about', 'contact'];

  // Six open side passages form the C route. Their frames are exactly in the
  // side-wall plane; no angled leaf or coaming projects into the aperture.
  const portalConnections = [
    ['experience', 'projects', 'left'],
    ['projects', 'experience', 'right'],
    ['projects', 'about', 'left'],
    ['about', 'projects', 'left'],
    ['about', 'contact', 'right'],
    ['contact', 'about', 'left'],
  ];
  for (const [from, to, edge] of portalConnections) {
    const id = `${from}:${to}`,
      viaWalkway =
        (from === 'projects' && to === 'about') ||
        (from === 'about' && to === 'projects');
    const visual = new THREE.Group();
    visual.name = id + '-open-side-passage';
    visual.userData = {
      section: from,
      portal: true,
      surfaceOnly: true,
      batchRoot: true,
      portalId: id,
      portalDestination: to,
    };
    rooms[from].add(visual);
    const signalSource = m.amber.clone();
    signalSource.userData.surfaceOnly = true;
    signalSource.name = 'route-paint-' + id;
    signalSource.userData.highlightScale = 0;
    const opening = new THREE.Group();
    opening.userData = { section: from, batchRoot: true };
    visual.add(opening);
    const gasket = mesh(
      frameGeometry(2.06, 2.06, 0.315, 0.07, 0.09, 0.012),
      m.gasket,
      opening,
      'open-hatch-wall-gasket',
    );
    gasket.position.z = -0.014;
    const frame = mesh(
      frameGeometry(2.03, 2.03, 0.3, 0.095, 0.07, 0.012),
      m.chalk,
      opening,
      'flush-open-pressure-hatch-frame',
    );
    frame.position.z = 0.012;
    const light = mesh(
      frameGeometry(1.852, 1.852, 0.211, 0.014, 0.012, 0.002),
      signalSource,
      opening,
      'open-hatch-painted-route-trim',
    );
    light.position.z = 0.054;
    // Navigation plaques sit literally above the side door, on the same
    // inward-facing wall plane. They are distinct from the frontal room title.
    const caption = new THREE.Group();
    caption.name = id + '-above-door-wall-nameplate';
    caption.userData = { section: from, batchRoot: true };
    visual.add(caption);
    const captionSize = [wayfinding.textWidth, wayfinding.textHeight],
      plateSize = [1.52, wayfinding.plateHeight];
    const enamelWidth = plateSize[0] - 0.04;
    const iconHalfWidth = 0.059;
    const iconInset = 0.095;
    const iconCenter = enamelWidth / 2 - iconInset - iconHalfWidth;
    box(
      plateSize[0],
      plateSize[1],
      0.11,
      m.liner,
      0,
      0,
      -0.068,
      caption,
      0.028,
      'above-door-label-backing',
    );
    box(
      enamelWidth,
      wayfinding.enamelHeight,
      0.028,
      m.chalk,
      0,
      0,
      -0.017,
      caption,
      0.013,
      'above-door-label-enamel',
    );
    portalLabel(
      options.labels?.[to] || to,
      caption,
      captionSize[0],
      captionSize[1],
    );
    for (const side of [-1, 1])
      routeSymbol(
        caption,
        side * iconCenter,
        0,
        0.001,
        viaWalkway,
        !viaWalkway || to === 'projects',
      );
    const pick = interactionBox(
      id + '-portal-pick',
      [0.28, passageClear, passageClear],
      [0, 0, 0],
      rooms[from],
      {
        isPortal: true,
        portalId: id,
        portalDestination: to,
        from,
        to,
        edge,
        via: viaWalkway ? 'walkway' : null,
      },
    );
    portalTargets.push({ object: pick, section: from, id, from, to, edge });
    const metadata = {
      id,
      from,
      to,
      edge,
      via: viaWalkway ? 'walkway' : null,
      position: [0, 0, 0],
      size: [0.28, passageClear, passageClear],
      openingSize: [passageClear, passageClear],
      labelPosition: [0, 0, 0],
      labelSize: captionSize,
      plateSize,
      directionSymbol: viaWalkway
        ? to === 'projects'
          ? 'ladder-up'
          : 'ladder-down'
        : 'door-forward-up',
      symbolSides: ['left', 'right'],
      iconInset,
      iconCenter,
      enamelWidth,
      backingFront: -0.013,
      enamelFront: -0.003,
      inkFront: 0,
      sealed: false,
      open: true,
      label: options.labels?.[to] || to,
      waypoints: [],
    };
    portals.push({
      id,
      from,
      to,
      edge,
      visual,
      opening,
      caption,
      pick,
      metadata,
      glow: roomMat(signalSource, from),
      strength: 0,
    });
  }

  // Prop proportions remain uniform in compact mode; hulls resize separately.
  for (const section of Object.keys(rooms)) {
    // Reparenting mutates children; iterate a snapshot so no prop is skipped.
    // oxlint-disable-next-line unicorn/no-useless-spread
    for (const child of [...rooms[section].children]) {
      if (
        child === structures[section] ||
        child === contents[section] ||
        child === readerTrays[section].group ||
        child.userData.physicalLabel ||
        child.userData.portal ||
        (child.userData.isInteractionProxy && child.userData.isPortal)
      )
        continue;
      contents[section].add(child);
    }
  }

  // A common load-bearing chassis encloses the unchanged room modules. The
  // original opening contours and label saddles remain exact; the broad webs
  // between them now belong to one continuous pressure face.
  const chassis = new THREE.Group();
  chassis.name = 'continuous-spacecraft-chassis';
  chassis.userData = { section: 'contact', exterior: true, excludePick: true };
  group.add(chassis);
  const chassisVariants: Record<string, any> = {};
  const chassisMetadata: Record<string, any> = {};
  function offsetPath(path: any, x: number, y: number, scaleX = 1) {
    for (const curve of path.curves)
      for (const key of ['v0', 'v1', 'v2', 'v3'])
        if (curve[key]) {
          curve[key].x = curve[key].x * scaleX + x;
          curve[key].y += y;
        }
    return path;
  }
  for (const variant of ['wide', 'compact']) {
    const s = variant === 'wide' ? 1.4 : 1,
      pitch = 1.5 * s + 0.15,
      ladderX = -pitch - 2.25 * s - 0.2,
      rightX = pitch + 1.6 * s,
      jointX = ladderX + 0.69 * s;
    const frame = new THREE.Group();
    frame.name = variant + '-common-pressure-frame';
    frame.userData = {
      section: 'contact',
      exterior: true,
      excludePick: true,
      batchRoot: true,
    };
    chassis.add(frame);
    chassisVariants[variant] = frame;
    const outer = new THREE.Shape(),
      k = 0.5522847498;
    const left = ladderX - 0.795 * s,
      tangent = ladderX + 0.565 * s;
    // The same long ladder shoulder flows into uninterrupted roof and keel
    // edges; a broad right return joins both cabins to the service bus.
    outer.moveTo(tangent, -3.27);
    outer.lineTo(rightX - 0.43 * s, -3.27);
    outer.quadraticCurveTo(rightX, -3.27, rightX, -2.84);
    outer.lineTo(rightX, 2.89);
    outer.quadraticCurveTo(rightX, 3.32, rightX - 0.43 * s, 3.32);
    outer.lineTo(tangent, 3.32);
    outer.bezierCurveTo(
      tangent - 1.36 * s * k,
      3.32,
      left,
      1.06 + 2.26 * k,
      left,
      1.06,
    );
    outer.lineTo(left, -1.04);
    outer.bezierCurveTo(
      left,
      -1.04 - 2.23 * k,
      tangent - 1.36 * s * k,
      -3.27,
      tangent,
      -3.27,
    );
    outer.closePath();
    const apertures: any[] = [];
    for (const section of Object.keys(rooms)) {
      const cx =
          (section === 'projects' || section === 'about' ? -1 : 1) * pitch,
        cy = roomCenters[section][1];
      const hole = offsetPath(
        roundedPath(new THREE.Path(), 2.65, 2.86, 0.35),
        cx,
        cy + 0.06,
        s,
      );
      outer.holes.push(hole);
      apertures.push({
        section,
        center: [cx, cy + 0.06, 1.19],
        size: [2.65 * s, 2.86],
        radius: [0.35 * s, 0.35],
      });
    }
    const ladderHole = offsetPath(
      walkwayOutline(new THREE.Path(), 1.33, 6.12, 1.23, 2.01, 0.04),
      ladderX,
      0.01,
      s,
    );
    outer.holes.push(ladderHole);
    // Blind, chamfered inspection recesses articulate the shared deck beam.
    // Their closed floors remain behind the face; these are not new openings.
    const recessWidth = 2.85 * s;
    for (const cx of [-pitch, pitch])
      outer.holes.push(
        offsetPath(
          roundedPath(new THREE.Path(), recessWidth, 0.16, 0.065),
          cx,
          -0.015,
        ),
      );
    const faceGeometry = new THREE.ExtrudeGeometry(outer, {
      depth: 0.22,
      bevelEnabled: true,
      bevelSize: 0.035,
      bevelThickness: 0.035,
      bevelSegments: 4,
      curveSegments: 16,
      steps: 1,
    });
    faceGeometry.translate(0, 0, 1.08);
    mesh(faceGeometry, m.shell, frame, 'one-piece-five-aperture-pressure-face');
    // Roof/keel members meet the front face and rear cover in volume. The
    // center beam occupies only the existing inter-deck void, outside cabins.
    const span = rightX - jointX,
      centerX = (rightX + jointX) / 2;
    // One continuous C-section wraps roof, service side and keel. Its corner
    // surfaces meet without overlapping roof/side polygons or squared ends.
    function perimeterSkin() {
      let points = outer.getPoints(32).map((p: any) => p.clone());
      if (points[0].distanceTo(points[points.length - 1]) < 1e-8) points.pop();
      const clipped: any[] = [];
      for (let i = 0; i < points.length; i++) {
        const a = points[i],
          b = points[(i + 1) % points.length],
          insideA = a.x >= jointX,
          insideB = b.x >= jointX;
        if (insideA) clipped.push(a);
        if (insideA !== insideB)
          clipped.push(a.clone().lerp(b, (jointX - a.x) / (b.x - a.x)));
      }
      points = clipped;
      const shape = new THREE.Shape(),
        insideX = rightX - 0.16 * s;
      shape.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++)
        shape.lineTo(points[i].x, points[i].y);
      shape.lineTo(jointX, 3.16);
      shape.lineTo(insideX - 0.1 * s, 3.16);
      shape.quadraticCurveTo(insideX, 3.16, insideX, 3.06);
      shape.lineTo(insideX, -2.99);
      shape.quadraticCurveTo(insideX, -3.09, insideX - 0.1 * s, -3.09);
      shape.lineTo(jointX, -3.09);
      shape.closePath();
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: 2.55,
        bevelEnabled: true,
        bevelSize: 0.025,
        bevelThickness: 0.025,
        bevelSegments: 3,
        steps: 1,
      });
      geometry.translate(0, 0, -1.31);
      return geometry;
    }
    mesh(perimeterSkin(), m.shell, frame, 'continuous-chassis-envelope');
    box(
      span,
      0.48,
      2.52,
      m.shell,
      centerX,
      0.12,
      -0.05,
      frame,
      0.11,
      'continuous-inter-deck-crossmember',
    );
    const rear = mesh(
      panelGeometry(span, 6.48, 0.4, 0.14, 0.025),
      m.shell,
      frame,
      'continuous-chassis-rear-cover',
    );
    rear.position.set(centerX, 0.025, -1.265);
    for (const cx of [-pitch, pitch]) {
      box(
        recessWidth + 0.08,
        0.24,
        0.06,
        m.shell,
        cx,
        -0.015,
        1.235,
        frame,
        0.025,
        'blind-crossmember-recess-floor',
      );
      for (const sign of [-1, 1]) {
        const screw = cylinder(
          0.024,
          0.014,
          m.metal,
          cx + sign * (recessWidth / 2 - 0.14),
          -0.015,
          1.274,
          frame,
          'z',
        );
        screw.name = 'recessed-crossmember-captive-fastener';
      }
    }
    // A broad gasketed mounting foot transfers service-bus loads into both
    // decks. Its tapered throat blends into the existing circular bus hull.
    const mount = new THREE.Group();
    mount.userData = { section: 'contact', exterior: true };
    frame.add(mount);
    mount.position.set(rightX - 0.015, 0.03, 0);
    mount.rotation.y = Math.PI / 2;
    const mountSeal = mesh(
      frameGeometry(2.24, 2.48, 0.58, 0.12, 0.05, 0.008),
      m.gasket,
      mount,
      'service-root-mounting-gasket',
    );
    mountSeal.position.z = -0.055;
    const plateShape = roundedPath(new THREE.Shape(), 2.18, 2.4, 0.55);
    const throat = new THREE.Path();
    throat.absarc(0, 0, 0.87, 0, Math.PI * 2, true);
    plateShape.holes.push(throat);
    const plateGeometry = new THREE.ExtrudeGeometry(plateShape, {
      depth: 0.13,
      bevelEnabled: true,
      bevelSize: 0.025,
      bevelThickness: 0.025,
      bevelSegments: 3,
      curveSegments: 16,
      steps: 1,
    });
    plateGeometry.translate(0, 0, -0.065);
    mesh(plateGeometry, m.shell, mount, 'service-root-pressure-flange');
    axialHull(
      [
        [1.02, -0.075],
        [1.058, -0.045],
        [1.059, 0.005],
        [1.035, 0.06],
        [0.977, 0.13],
        [0.941, 0.175],
      ],
      m.shell,
      rightX,
      0.03,
      0,
      frame,
      'service-root-tapered-load-fairing',
    );
    for (const sy of [-1, 1])
      for (const sz of [-1, 1]) {
        const screw = cylinder(
          0.034,
          0.027,
          m.metal,
          sz * 0.78,
          sy * 0.91,
          0.087,
          mount,
          'z',
        );
        screw.name = 'service-root-captive-fastener';
      }
    chassisMetadata[variant] = {
      apertures,
      ladderAperture: {
        center: [ladderX, 0.01, 1.17],
        size: [1.33 * s, 6.12],
        leftRadii: [1.23 * s, 2.01],
      },
      frontFace: {
        minZ: 1.045,
        maxZ: 1.335,
        holeCount: 5,
        blindRecessCount: 2,
        recessFloorZ: 1.265,
      },
      serviceMount: {
        position: [rightX - 0.015, 0.03, 0],
        size: [0.21, 2.48, 2.24],
        axis: [1, 0, 0],
        fairingEndX: rightX + 0.175,
      },
      jointX,
      exteriorOnly: true,
      originalInteriorTrianglesPreserved: true,
      replacedParts: [
        'rounded-front-pressure-collar',
        'walkway-rounded-pressure-collar',
        'projects-continuous-pressure-skin-exterior',
        'experience-continuous-pressure-skin-exterior',
        'about-continuous-pressure-skin-exterior',
        'contact-continuous-pressure-skin-exterior',
        'experience-sealed-outboard-wall-exterior',
        'contact-sealed-outboard-wall-exterior',
      ],
    };
  }

  // Preserve coarse service subassembly bounds before material batching merges
  // the two wings. This keeps framing support compact without phantom corners
  // spanning from a solar tip to the engine nozzle or communications dish.
  group.updateMatrixWorld(true);
  const serviceOverviewParts = new Map<string, any>();
  const serviceInverse = vesselMatrix(service).invert();
  for (const child of service.children) {
    const bounds = vesselBounds(child).applyMatrix4(serviceInverse);
    if (bounds.isEmpty()) continue;
    const wingIndex = solarWings.indexOf(child);
    const center = bounds.getCenter(new THREE.Vector3());
    const name =
      wingIndex >= 0
        ? `solar-${wingIndex === 0 ? 'lower' : 'upper'}`
        : child === dishAssembly
          ? 'communications-dish'
          : center.y > 0.96
            ? 'service-upper-support'
            : center.y < -0.96
              ? 'service-lower-support'
              : 'service-bus';
    if (!serviceOverviewParts.has(name))
      serviceOverviewParts.set(name, new THREE.Box3());
    serviceOverviewParts.get(name).union(bounds);
  }
  // Static scenery is batched per room. Moving assemblies are instead batched
  // within their own local space, so each hinge and reader remains independent.
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
      motionRoot: any = null,
      batchRoot: any = null;
    while (ancestor && ancestor !== group) {
      if (ancestor.userData.animated && !motionRoot) motionRoot = ancestor;
      if (
        !batchRoot &&
        (ancestor.userData.animated || ancestor.userData.batchRoot)
      )
        batchRoot = ancestor;
      ancestor = ancestor.parent;
    }
    const section = object.userData.section;
    const parent = batchRoot || rooms[section];
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
  // Preserve the four backlit display surfaces after static geometry batching.
  workshop.traverse((object: any) => {
    if (object.isMesh && object.material?.userData.displaySize) {
      object.castShadow = false;
      object.receiveShadow = false;
    }
  });
  group.traverse((object: any) => {
    if (object.isMesh && object.material?.userData.cabinHeaderInk) {
      object.castShadow = false;
      object.receiveShadow = false;
    }
  });
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
      [x, y - 1.279, 1.428],
    ]),
  );
  group.userData.labelSizes = { width: 0, height: 0 };
  group.userData.sideLabelAnchors = Object.fromEntries(
    Object.entries(roomCenters).map(([section, [x, y]]) => [
      section,
      [x - 1.565, y + 0.06, 1.428],
    ]),
  );
  group.userData.sideLabelSizes = {
    width: 0,
    height: 0,
    collarThickness: 0,
    assemblySpan: 0,
    rotation: -Math.PI / 2,
  };
  group.userData.labelAssemblyBounds = {};
  group.userData.sideLabelBounds = {};
  group.userData.calloutAnchors = {};
  group.userData.calloutEdges = {};
  group.userData.labelPlaques = labelPlaques;
  group.userData.labelPortrait = false;
  group.userData.labelOrientation = {
    attached: false,
    portraitModelRoll: Math.PI / 2,
    toggles: [],
    headersAlwaysVisible: true,
    exteriorLabelsRemoved: true,
  };
  group.userData.innerApertureBounds = Object.fromEntries(
    Object.entries(roomCenters).map(([section, [x, y]]) => [
      section,
      {
        center: [x, y + 0.17, 1.2],
        size: [2.44, 2.3, 0.04],
        min: [x - 1.22, y - 0.98, 1.18],
        max: [x + 1.22, y + 1.32, 1.22],
      },
    ]),
  );
  group.userData.headerAnchors = Object.fromEntries(
    Object.entries(roomCenters).map(([section, [x, y]]) => [
      section,
      [x, y + headerPosition(section)[0], headerPosition(section)[1]],
    ]),
  );
  group.userData.readerAnchors = Object.fromEntries(
    Object.entries(roomCenters).map(([section, [x, y]]) => [
      section,
      [x, y, 1.72],
    ]),
  );
  group.userData.readerSize = { width: 2.4, height: 2.7 };
  group.userData.projectPageSize = projectPageSize;
  group.userData.projectCapacity = 9;
  group.userData.projectCategoryCapacity = 4;
  group.userData.caseStudyPageSize = projectPageSize;
  group.userData.caseStudyCapacity = 9;
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
    ...caseStudySlots.map((_, i) => ({
      section: 'experience',
      slot: i,
      position: [0, 0, 0],
    })),
    { section: 'about', position: [-1.404, -2.045, -0.45] },
  ];
  group.userData.dockingAnchor = [-3.78, 0.21, 1.05];
  group.userData.dockingAnchors = {
    sleeve: [-3.715, 0.03, 0],
    hatch: [-5.046, 0.03, 0],
    mount: [-3.24, 0.03, -0.17],
  };
  group.userData.palette = palette;
  group.userData.communicationsAnchor = [4.14, 0.23, 1.16];
  group.userData.mountingReferences = [
    'https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/ATV/ATV_Service_Module',
    'https://www.esa.int/ESA_Multimedia/Images/2013/06/ATV-4_docking',
  ];
  group.userData.description =
    'A two-by-two toybox spacecraft with a four-module project workshop, nine case-study compartments, a personal cabin and a dedicated communications room; a docking nose and right-hand service wings complete the pressure hull';
  group.userData.detailStats = {
    staticSourceParts: sourceParts,
    drawCalls: targets.length,
    instancedDrawCalls: targets.filter((t) => t.object.isInstancedMesh).length,
  };
  group.updateMatrixWorld(true);
  const paintedHover = new THREE.Color(palette.chalk);
  // Public anchors and framing geometry use vessel coordinates, even while
  // the renderer rolls, translates or scales the root for a camera flight.
  // Compose descendant local matrices rather than undoing a world-space AABB.
  function vesselMatrix(object: any) {
    const matrix = new THREE.Matrix4();
    for (let node = object; node && node !== group; node = node.parent)
      matrix.premultiply(node.matrix);
    return matrix;
  }
  function vesselPosition(object: any) {
    return new THREE.Vector3().setFromMatrixPosition(vesselMatrix(object));
  }
  function vesselBounds(object: any, recursive = true) {
    const bounds = new THREE.Box3();
    if (object.isMesh) {
      let localBounds;
      if (object.isInstancedMesh) {
        if (!object.boundingBox) object.computeBoundingBox();
        localBounds = object.boundingBox;
      } else {
        if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
        localBounds = object.geometry.boundingBox;
      }
      if (localBounds)
        bounds.union(localBounds.clone().applyMatrix4(vesselMatrix(object)));
    }
    if (recursive)
      for (const child of object.children) bounds.union(vesselBounds(child));
    return bounds;
  }
  function captureOverviewBounds() {
    const box = new THREE.Box3();
    group.updateMatrixWorld(true);
    // Ignore deployed readers/doors for framing: the pressure shell and service
    // appendages determine overview silhouette, regardless of current selection.
    for (const section of Object.keys(rooms))
      box.union(vesselBounds(structures[section]));
    for (const part of [
      docking,
      service,
      utility,
      walkway,
      chassisVariants[currentLayout],
    ])
      box.union(vesselBounds(part));
    const supportBounds: Array<{ name: string; bounds: any }> = [];
    for (const [section, structure] of Object.entries(structures))
      supportBounds.push({
        name: section + '-body',
        bounds: vesselBounds(structure),
      });
    for (const [name, part] of [
      ['chassis', chassisVariants[currentLayout]],
      ['ladder-bay', walkway],
      ['docking-sleeve', docking],
      ['passage-couplings', utility],
    ] as Array<[string, any]>)
      supportBounds.push({ name, bounds: vesselBounds(part) });
    const serviceMatrix = vesselMatrix(service);
    for (const [name, bounds] of serviceOverviewParts)
      supportBounds.push({
        name,
        bounds: bounds.clone().applyMatrix4(serviceMatrix),
      });
    const supportPoints: number[][] = [];
    group.userData.overviewSupportBounds = supportBounds.map(
      ({ name, bounds }) => {
        for (const x of [bounds.min.x, bounds.max.x])
          for (const y of [bounds.min.y, bounds.max.y])
            for (const z of [bounds.min.z, bounds.max.z])
              supportPoints.push([x, y, z]);
        return { name, min: bounds.min.toArray(), max: bounds.max.toArray() };
      },
    );
    group.userData.overviewSupportPoints = supportPoints;
    const center = box.getCenter(new THREE.Vector3()),
      size = box.getSize(new THREE.Vector3());
    group.userData.overviewBounds = {
      min: box.min.toArray(),
      max: box.max.toArray(),
      center: center.toArray(),
      size: size.toArray(),
    };
    group.userData.recommendedFraming = {
      target: [center.x, center.y, 0.1],
      direction: [-0.18, 0.12, 1],
      horizontalSpan: size.x * 1.12,
      verticalSpan: size.y * 1.12,
      roll: 0,
    };
  }
  function setLayout(layout: 'wide' | 'compact') {
    currentLayout = layout === 'compact' ? 'compact' : 'wide';
    for (const [name, variant] of Object.entries(chassisVariants))
      variant.visible = name === currentLayout;
    group.userData.chassis = chassisMetadata[currentLayout];
    layoutScale = currentLayout === 'wide' ? 1.4 : 1;
    const halfPitch = 1.5 * layoutScale + 0.15;
    const propScale = currentLayout === 'wide' ? 1 : 0.84;
    for (const section of Object.keys(rooms)) {
      const left = section === 'projects' || section === 'about';
      const x = (left ? -1 : 1) * halfPitch,
        y = roomCenters[section][1],
        origin = legacyCenters[section];
      roomCenters[section][0] = x;
      rooms[section].position.set(x - origin, y, 0);
      structures[section].scale.set(layoutScale, 1, 1);
      structures[section].position.x = origin * (1 - layoutScale);
      contents[section].scale.setScalar(propScale);
      // Scale furnishings about the floor datum, not the room origin.
      contents[section].position.y =
        cabinFloorTop - propScale * previousFloorTop;
      contents[section].position.x =
        origin * (1 - propScale) +
        (left ? -1 : 1) * (currentLayout === 'wide' ? 0.18 : 0.1);
      group.userData.roomAnchors[section] = [x, y, 0.16];
      group.userData.roomBounds[section] = {
        center: [x, y + 0.045, 0.035],
        size: [3.3 * layoutScale, 3.25, 2.8],
      };
      group.userData.readerAnchors[section] = [x, y, 1.72];
      readerSurfaces[section].userData.deployedPosition = [x, y, 1.72];
      group.userData.labelAnchors[section] = [x, y - 1.279, 1.428];
      group.userData.sideLabelAnchors[section] = [
        x - 1.565 * layoutScale,
        y + 0.06,
        1.428,
      ];
      group.userData.calloutAnchors[section] = [x, y + 0.17, 1.32];
      group.userData.calloutEdges[section] = {
        top: [x, y + 1.32, 1.32],
        bottom: [x, y + cabinFloorTop + 0.02, 1.32],
        left: [x - 1.22 * layoutScale, y + 0.17, 1.32],
        right: [x + 1.22 * layoutScale, y + 0.17, 1.32],
      };
      group.userData.headerAnchors[section] = [
        x,
        y + headerPosition(section)[0],
        headerPosition(section)[1],
      ];
      group.userData.innerApertureBounds[section] = {
        center: [x, y + (cabinFloorTop + cabinCeiling) / 2, 1.2],
        size: [2.44 * layoutScale, cabinCeiling - cabinFloorTop, 0.04],
        min: [x - 1.22 * layoutScale, y + cabinFloorTop, 1.18],
        max: [x + 1.22 * layoutScale, y + cabinCeiling, 1.22],
      };
    }
    for (const entry of labelPlaques) {
      const origin = legacyCenters[entry.section],
        center = roomCenters[entry.section];
      entry.position[0] = center[0];
      entry.position[1] = center[1] + headerPosition(entry.section)[0];
      const mount = labelMounts.get(entry);
      if (mount) mount.position.x = origin;
    }
    const outward = 3 * (layoutScale - 1);
    const walkwayX = -halfPitch - 2.25 * layoutScale - 0.2;
    walkway.position.set(walkwayX, 0, 0);
    // Both hatch assemblies derive their position from the actual sidewall.
    const dockingWallX = walkwayX - 0.75 * layoutScale;
    const dockingInnerFace = 0.085 * layoutScale;
    const dockingInset = dockingInnerFace - 0.008;
    dockingInterior.position.set(-0.75 * layoutScale + dockingInset, 0.03, 0);
    walkwayStructure.scale.set(layoutScale, 1, 1);
    walkwayFurniture.scale.set(layoutScale, 1, 1);
    walkwayCouplings.forEach(
      (part) => (part.position.x = -halfPitch - 1.5 * layoutScale - 0.1),
    );
    docking.position.x = dockingWallX + 4.5;
    service.position.x = -1.5 + outward;
    group.userData.dockingAnchor = [docking.position.x - 5.137, 0.208, 1.05];
    group.userData.dockingAnchors = {
      sleeve: [docking.position.x - 5.065, 0.03, 0],
      hatch: [docking.position.x - 6.396, 0.03, 0],
      mount: [docking.position.x - 4.58, 0.03, 0],
      wall: [dockingWallX, 0.03, 0],
      innerHatch: [dockingWallX + dockingInset, 0.03, 0],
    };
    group.userData.communicationsAnchor = [4.14 + outward, 0.23, 1.16];
    group.userData.walkwayAnchor = [walkwayX, 0, 0.16];
    group.userData.walkwayProfile = {
      leftCornerRadius: 1.36 * layoutScale,
      leftShoulderRadii: [1.36 * layoutScale, 2.14],
      leftShoulderHeight: 2.14,
      leftStraightHeight: 2.12,
      shoulderFraction: 4.28 / 6.4,
      rightCornerRadius: 0.17 * layoutScale,
      shellDepth: 2.42,
      rearLiner: {
        frontZ: -0.985,
        rearZ: -1.21,
        sharedShoulders: [1.35, 2.14],
        innerShoulders: [1.21, 2.0],
        continuousReturn: true,
      },
      landings: [],
      clearDockingOpening: [1.82, 1.9],
      ladderBounds: {
        min: [-0.109 * layoutScale, -2.639, -0.719],
        max: [0.409 * layoutScale, 2.579, -0.661],
      },
      endShoulderContinuity: true,
    };
    walkway.updateMatrixWorld(true);
    group.userData.walkwaySigns = walkwaySigns.map((sign) => ({
      position: vesselPosition(sign).toArray(),
      symbol: sign.position.y > 0 ? 'ladder-down' : 'ladder-up',
      size: [0.27 * layoutScale, 0.3],
    }));
    group.userData.walkwayBounds = {
      center: [walkwayX, 0, 0.1],
      size: [1.75 * layoutScale, 6.5, 2.65],
    };
    for (const portal of portals) {
      const origin = legacyCenters[portal.from],
        sign = portal.edge === 'right' ? 1 : -1;
      portal.visual.position.set(origin, 0, 0);
      portal.opening.rotation.y = sign > 0 ? -Math.PI / 2 : Math.PI / 2;
      portal.opening.position.set(
        sign * (1.5 * layoutScale - 0.1 * layoutScale - 0.006),
        -0.06,
        passageCenterZ,
      );
      portal.caption.rotation.set(0, sign > 0 ? -Math.PI / 2 : Math.PI / 2, 0);
      portal.caption.position.set(
        sign * (1.4 * layoutScale - 0.085),
        wayfinding.centerY,
        passageCenterZ,
      );
      portal.pick.position.set(
        origin + sign * (1.5 * layoutScale - 0.04),
        -0.06,
        passageCenterZ,
      );
      const fromY = roomCenters[portal.from][1],
        toY = roomCenters[portal.to][1];
      portal.metadata.waypoints = portal.metadata.via
        ? [
            [walkwayX, fromY, 0.16],
            [walkwayX, 0, 0.16],
            [walkwayX, toY, 0.16],
          ]
        : [];
    }
    group.updateMatrixWorld(true);
    for (const portal of portals) {
      portal.metadata.position = vesselPosition(portal.pick).toArray();
      portal.metadata.labelPosition = vesselPosition(portal.caption).toArray();
      const labelQuaternion = new THREE.Quaternion();
      vesselMatrix(portal.caption).decompose(
        new THREE.Vector3(),
        labelQuaternion,
        new THREE.Vector3(),
      );
      portal.metadata.labelRotation = new THREE.Euler()
        .setFromQuaternion(labelQuaternion)
        .toArray()
        .slice(0, 3);
      portal.metadata.labelRight = new THREE.Vector3(1, 0, 0)
        .applyQuaternion(labelQuaternion)
        .toArray();
      portal.metadata.labelUp = new THREE.Vector3(0, 1, 0)
        .applyQuaternion(labelQuaternion)
        .toArray();
      portal.metadata.labelNormal = new THREE.Vector3(0, 0, 1)
        .applyQuaternion(labelQuaternion)
        .toArray();
      portal.pick.userData.portalPosition = portal.metadata.position;
      // Keep one stable pick object per directed portal. Its compound shape
      // covers both the pressure hatch and the physically attached caption.
      const captionLocal = vesselPosition(portal.caption).applyMatrix4(
        vesselMatrix(portal.pick.parent).invert(),
      );
      captionLocal.sub(portal.pick.position);
      const main = new THREE.BoxGeometry(
        ...portal.metadata.size,
      ).toNonIndexed();
      const plate = new THREE.BoxGeometry(
        ...portal.metadata.plateSize,
        0.16,
      ).toNonIndexed();
      plate.rotateY(portal.caption.rotation.y);
      plate.translate(captionLocal.x, captionLocal.y, captionLocal.z);
      const geometry = new THREE.BufferGeometry();
      for (const name of ['position', 'normal', 'uv']) {
        const a = main.getAttribute(name),
          b = plate.getAttribute(name);
        const data = new Float32Array(a.array.length + b.array.length);
        data.set(a.array);
        data.set(b.array, a.array.length);
        geometry.setAttribute(
          name,
          new THREE.BufferAttribute(data, a.itemSize),
        );
      }
      geometry.computeBoundingSphere();
      portal.pick.geometry.dispose();
      portal.pick.geometry = geometry;
      main.dispose();
      plate.dispose();
    }
    for (const hotspot of group.userData.hotspots) {
      let object: any = null;
      if (rackSlots[hotspot.section] && hotspot.slot !== undefined) {
        const i = hotspot.slot;
        hotspot.position = new THREE.Vector3(
          legacyCenters[hotspot.section] - 0.85 + (i % 3) * 0.85,
          0.595 - Math.floor(i / 3) * 0.607,
          -0.33,
        )
          .applyMatrix4(vesselMatrix(contents[hotspot.section]))
          .toArray();
        continue;
      } else
        object = interactionTargets.find(
          (t) => t.section === hotspot.section && t.object.userData.openReader,
        )?.object;
      if (object) hotspot.position = vesselPosition(object).toArray();
    }
    const points: Record<string, any[]> = {};
    for (const section of Object.keys(rooms)) {
      points[section] = [];
      const add = (
        kind: string,
        center: number[],
        width: number,
        height: number,
      ) => {
        for (const sx of [-1, 1])
          for (const sy of [-1, 1])
            points[section].push({
              kind,
              position: [
                center[0] + (sx * width) / 2,
                center[1] + (sy * height) / 2,
                center[2],
              ],
            });
      };
      add(
        'header',
        group.userData.headerAnchors[section],
        hasEquipmentHeader(section) ? 1.42 : 1.26,
        wayfinding.textHeight,
      );
      for (const portal of portals.filter((p) => p.from === section)) {
        const c = new THREE.Vector3(...portal.metadata.labelPosition);
        const right = new THREE.Vector3(...portal.metadata.labelRight),
          up = new THREE.Vector3(...portal.metadata.labelUp);
        for (const sx of [-1, 1])
          for (const sy of [-1, 1]) {
            const corner = c
              .clone()
              .addScaledVector(right, (sx * portal.metadata.plateSize[0]) / 2)
              .addScaledVector(up, (sy * portal.metadata.plateSize[1]) / 2);
            points[section].push({
              kind: 'portal-plate',
              position: corner.toArray(),
            });
          }
      }
      if (rackSlots[section]) {
        const center = legacyCenters[section];
        for (const xx of [center - 1.23, center + 1.23])
          for (const yy of [-0.89, 0.88]) {
            const p = new THREE.Vector3(xx, yy, -0.27).applyMatrix4(
              vesselMatrix(contents[section]),
            );
            points[section].push({
              kind:
                section === 'projects'
                  ? 'closed-project-rack'
                  : 'closed-case-study-rack',
              position: p.toArray(),
            });
          }
      } else {
        const box = vesselBounds(contents[section]);
        for (const xx of [box.min.x, box.max.x])
          for (const yy of [box.min.y, box.max.y])
            points[section].push({
              kind: 'cabin-content',
              position: [xx, yy, box.max.z],
            });
      }
    }
    group.userData.requiredFramingPoints = points;
    group.userData.layout = currentLayout;
    group.userData.layoutScale = layoutScale;
    group.userData.layoutVersion = (group.userData.layoutVersion || 0) + 1;
    group.userData.portalLabelsCoplanarWithDoors = true;
    captureOverviewBounds();
    return {
      layout: currentLayout,
      layoutScale,
      roomAnchors: group.userData.roomAnchors,
      innerApertureBounds: group.userData.innerApertureBounds,
      overviewBounds: group.userData.overviewBounds,
      overviewSupportPoints: group.userData.overviewSupportPoints,
      calloutAnchors: group.userData.calloutAnchors,
      calloutEdges: group.userData.calloutEdges,
      portals: group.userData.portals,
      requiredFramingPoints: points,
      shadowInvalidated: true,
    };
  }
  function routeTo(from: string, destination: string) {
    if (!adjacency[from] || !adjacency[destination] || from === destination)
      return [];
    const queue: string[][] = [[from]],
      seen = new Set([from]);
    while (queue.length) {
      const path = queue.shift()!;
      for (const next of adjacency[path[path.length - 1]]) {
        if (seen.has(next)) continue;
        const candidate = [...path, next];
        if (next === destination) return candidate;
        seen.add(next);
        queue.push(candidate);
      }
    }
    return [];
  }
  function setRackPage(section: string, requestedPage: number) {
    const key = section === 'projects' ? 'project' : 'caseStudy';
    const data = section === 'projects' ? projectData : caseStudyData;
    const slots = rackSlots[section];
    const pageCount = Math.max(1, Math.ceil(data.length / projectPageSize));
    const page = Math.min(
      pageCount - 1,
      Math.max(
        0,
        Math.floor(Number.isFinite(requestedPage) ? requestedPage : 0),
      ),
    );
    if (section === 'projects') currentProjectPage = page;
    else currentCaseStudyPage = page;
    for (const [i, slot] of slots.entries()) {
      const index = page * projectPageSize + i;
      slot.project = i < projectPageSize ? data[index] || null : null;
      slot.draw(slot.project, index);
      slot.group.visible = slot.cartridge.visible = !!slot.project;
      slot.spare.visible = !slot.project;
      slot.group.userData.occupied = slot.cartridge.userData.occupied =
        !!slot.project;
      slot.progress = slot.hover = 0;
      slot.group.position.z = slot.baseZ;
      slot.group.rotation.y = 0;
      for (const root of [slot.group, slot.cartridge])
        root.traverse((object: any) => {
          // Prevent the copied cabinet from inheriting project-only pick keys.
          if (section === 'experience') {
            delete object.userData.projectSlot;
            delete object.userData.projectSlug;
          }
          object.userData[key + 'Slot'] = i;
          object.userData[key + 'Index'] = index;
          object.userData.disabled = !slot.project;
          object.layers.set(slot.project ? 0 : 31);
          if (slot.project) object.userData[key + 'Slug'] = slot.project.slug;
          else delete object.userData[key + 'Slug'];
        });
      const hotspot = group.userData.hotspots.find(
        (h: any) => h.section === section && h.slot === i,
      );
      if (hotspot) {
        if (slot.project) hotspot[key + 'Slug'] = slot.project.slug;
        else delete hotspot[key + 'Slug'];
      }
    }
    group.userData[key + 'Page'] = page;
    group.userData[key + 'PageCount'] = pageCount;
    group.updateMatrixWorld(true);
    return { page, pageCount, slots: slots.map((slot) => slot.project) };
  }
  function setProjectPage(page: number) {
    return setRackPage('projects', page);
  }
  function setCaseStudyPage(page: number) {
    return setRackPage('experience', page);
  }
  function setProjects(items: SpacecraftProject[]) {
    projectData = items.slice();
    projectWorkshop.setProjectCount(projectData.length);
    return setProjectPage(currentProjectPage);
  }
  function setCaseStudies(items: SpacecraftProject[]) {
    caseStudyData = items.slice();
    return setCaseStudyPage(currentCaseStudyPage);
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
      if (state.layout && state.layout !== currentLayout)
        setLayout(state.layout);
      currentState = { ...currentState, ...state };
      if (state.room !== undefined && state.activeRoom === undefined)
        currentState.activeRoom = state.room;
      // Keep the renderer's orientation preference as compatibility metadata.
      setLabelOrientation(state.labelPortrait ?? labelPortrait);
      if (state.slug !== undefined && state.selectedProject === undefined)
        currentState.selectedProject = state.slug;
      if (
        state.projectPage !== undefined &&
        state.projectPage !== currentProjectPage
      )
        setProjectPage(state.projectPage);
      if (
        state.caseStudyPage !== undefined &&
        state.caseStudyPage !== currentCaseStudyPage
      )
        setCaseStudyPage(state.caseStudyPage);
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
    for (const [section, slots] of Object.entries(rackSlots))
      for (const slot of slots) {
        const goal =
          currentState.activeRoom === section &&
          !!slot.project &&
          (section === 'projects'
            ? currentState.selectedProject
            : currentState.selectedCaseStudy) === slot.project.slug
            ? 1
            : 0;
        slot.progress += (goal - slot.progress) * blend;
        if (Math.abs(slot.progress - goal) < 0.002) slot.progress = goal;
        slot.group.rotation.y = -slot.progress * 1.32;
        const hoverGoal =
          !!slot.project &&
          ((section === 'projects'
            ? currentState.hoveredProject
            : currentState.hoveredCaseStudy) === slot.project.slug ||
            goal === 1)
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
      tray.group.position.y = -0.1 * (1 - p);
      tray.group.position.z = -0.63 + 2.24 * p;
      tray.group.rotation.x = -0.1 * (1 - p);
      if (p !== goal) motionActive = true;
    }
    group.userData.motionActive = motionActive;
    const targetLevels: Record<string, number> = {};
    for (const section of Object.keys(roomMaterials)) {
      const selected =
        section !== 'walkway' &&
        !currentState.travelling &&
        currentState.activeRoom === section;
      const preview = currentState.travelling
        ? currentState.transitRoom === section
        : active === section;
      const targetLevel =
        section === 'walkway'
          ? currentState.transitWalkway
            ? 1
            : currentState.hoveredWalkway &&
                !!rooms[currentState.activeRoom || ''] &&
                !currentState.travelling
              ? 1
              : 0.5
          : selected
            ? 1
            : preview
              ? 1
              : 0.5;
      targetLevels[section] = targetLevel;
      roomDimmers[section] += (targetLevel - roomDimmers[section]) * blend;
      if (Math.abs(roomDimmers[section] - targetLevel) < 0.002)
        roomDimmers[section] = targetLevel;
      if (roomDimmers[section] !== targetLevel)
        group.userData.motionActive = true;
    }
    for (const section of Object.keys(roomMaterials)) {
      const level = roomDimmers[section];
      for (const material of roomMaterials[section]) {
        const exterior = !!material.userData.exterior;
        const linked = material.userData.linkedRooms as string[] | undefined;
        const materialLevel = exterior
          ? 1
          : linked
            ? Math.max(...linked.map((key) => roomDimmers[key] ?? 0.5))
            : level;
        material.color
          .copy(material.userData.baseColor)
          .multiplyScalar(materialLevel);
        material.emissive
          .copy(material.userData.baseEmissive)
          .multiplyScalar(
            material.userData.surfaceOnly
              ? 0
              : material.userData.baseIntensity * materialLevel,
          );
        material.emissiveIntensity = 1;
      }
      for (const light of roomLights[section] || []) light.intensity = 0.35;
      group.userData.lightingState ||= {};
      group.userData.lightingState[section] = {
        targetLevel: targetLevels[section],
        level,
        dimmer: level,
        interiorColor: level,
        exteriorColor: 1,
        screenEmission: level,
        fixtureEmission: level,
        labels: level,
        exteriorLabels: 0,
        selected:
          !currentState.travelling && currentState.activeRoom === section,
        transit:
          section === 'walkway'
            ? !!currentState.transitWalkway
            : !!currentState.travelling && currentState.transitRoom === section,
        hoveredWalkway:
          section === 'walkway' &&
          !!currentState.hoveredWalkway &&
          !!rooms[currentState.activeRoom || ''] &&
          !currentState.travelling,
        pointIntensities: (roomLights[section] || []).map(
          (light: any) => light.intensity,
        ),
        emitterPolicy:
          'constant room emitters; medium default, high hover/selected/transit; no pathway emitters',
      };
    }
    for (const [section, slots] of Object.entries(rackSlots))
      for (const slot of slots) {
        slot.glow.color
          .copy(slot.glow.userData.baseColor)
          .lerp(paintedHover, slot.hover * 0.45)
          .multiplyScalar(roomDimmers[section]);
        slot.glow.emissive.set(0x000000);
      }
    const requestedPortal = portals.find(
      (p) => p.id === currentState.hoveredPortal,
    );
    const destination = requestedPortal?.to || currentState.hoveredPortal || '';
    const route = routeTo(
      (currentState.travelling
        ? currentState.transitRoom
        : currentState.activeRoom) || '',
      destination,
    );
    group.userData.activeRoute = route;
    for (const portal of portals) {
      const wanted =
        !currentState.reading &&
        route.length > 1 &&
        portal.from === route[0] &&
        portal.to === route[1]
          ? 1
          : 0;
      portal.strength += (wanted - portal.strength) * blend;
      if (Math.abs(portal.strength - wanted) < 0.002) portal.strength = wanted;
      portal.glow.color
        .copy(portal.glow.userData.baseColor)
        .lerp(paintedHover, portal.strength * 0.55)
        .multiplyScalar(roomDimmers[portal.from]);
      portal.glow.emissive.set(0x000000);
      portal.glow.emissiveIntensity = 0;
      portal.metadata.highlight = portal.strength;
      if (portal.strength !== wanted) group.userData.motionActive = true;
      portal.pick.userData.highlighted = portal.strength > 0.01;
    }
    const walkwayRouteStrength = Math.max(
      0,
      ...portals.filter((p) => p.metadata.via).map((p) => p.strength),
    );
    group.userData.walkwayRouteStrength = walkwayRouteStrength;
    group.updateMatrixWorld(true);
  }
  setProjectPage(0);
  setCaseStudyPage(0);
  update(0, '', true);
  group.userData.portals = portals.map((p) => p.metadata);
  group.userData.adjacency = adjacency;
  group.userData.activeRoute = [];
  setLayout(options.layout || 'wide');
  setLabelOrientation(labelPortrait);
  return {
    group,
    targets,
    update,
    setProjectPage,
    setProjects,
    setCaseStudyPage,
    setCaseStudies,
    setReading,
    setLabelOrientation,
    setLayout,
    portalTargets,
    readerSurfaces,
    interactionTargets,
  };
}
