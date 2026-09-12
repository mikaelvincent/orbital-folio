import { buildContinuousExteriorSkin } from './continuous-exterior-skin.ts';
import { thinChassisOutline } from './thin-chassis-outline.ts';
import { ladderOpeningOutline } from './ladder-opening-outline.ts';
import { clipGeometryPlane } from './clip-geometry-plane.ts';
import { createObjectHighlight } from './interactable-object-highlight.ts';
import { buildIrisHatch } from './iris-hatch.ts';
import { moveCameraAxis } from '../lib/flight.ts';
import { interlockLadderPortals } from '../lib/iris-navigation.ts';
import {
  PRESSURE_WALL,
  PRESSURE_THROAT_START,
  PRESSURE_FACE_FRONT,
  CABIN_FLOOR,
  CABIN_CEILING,
  CABIN_HALF_WIDTH,
  DECK_HALF_PITCH,
  LADDER_CENTER_Y,
  LADDER_HEIGHT,
  LADDER_HALF_STRAIGHT,
  LADDER_SHOULDER_RISE,
  LADDER_SHOULDER_RUN,
  LADDER_RIGHT_RADIUS,
  LADDER_CONTENT_SCALE,
  LADDER_CONTENT_OFFSET,
  wallLayout,
} from '../lib/spacecraft-wall-layout.ts';
import type { SocialScreenLinks } from '../lib/social-links.ts';
import { buildAboutPersonalStudy } from './about-personal-study.ts';
import { buildCaseStudyArchive } from './case-study-archive.ts';
import { buildContactFlightConsole } from './contact-flight-console.ts';
import { buildProjectsWorkshop } from './projects-workshop.ts';
import { buildOutboardWallEquipment } from './outboard-wall-equipment.ts';
import {
  buildLadderServiceSpine,
  getServiceSpineRecesses,
} from './ladder-service-spine.ts';

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
  hoveredObject?: string | null;
  slug?: string | null;
  projectPage?: number;
  reading?: boolean;
  delta?: number;
  /** Use the fixed side collar plaques for a +PI/2 portrait overview. */
  labelPortrait?: boolean;
  layout?: 'wide' | 'compact';
  /** Directed portal ID or a destination room; nonadjacent rooms use first hop. */
  hoveredPortal?: string | null;
  /** Passage intent from the camera itinerary; hover can also open a hatch. */
  openPortalIds?: string[];
  immediateDoors?: boolean;
};
export function createSpacecraft(
  THREE: any,
  options: {
    accent?: string;
    labels?: Record<string, string>;
    projects?: SpacecraftProject[];
    caseStudies?: SpacecraftProject[];
    socials?: SocialScreenLinks;
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
    projects: [-1.65, DECK_HALF_PITCH],
    experience: [1.65, DECK_HALF_PITCH],
    about: [-1.65, -DECK_HALF_PITCH],
    contact: [1.65, -DECK_HALF_PITCH],
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
  const passageCouplings: Array<{ group: any; walkway: boolean; y: number }> =
    [];
  const roomWallMounts: Array<{ group: any; origin: number; sign: number }> =
    [];
  const ladderWallMounts: Array<{ group: any; side: number }> = [];
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
    section === 'projects' || section === 'contact' || section === 'about';
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
  const headerPosition = (_section: string): [number, number] => [
    wayfinding.centerY,
    -0.427,
  ];
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
      if (original.name === m.wall.name || original.userData.neutralPaint) {
        // Keep diffuse shading and shadows, but suppress the blue rim / amber
        // key's color cast on cabin paint. Opposite faces should read as the
        // same ivory wall or white shutter, rather than different finishes.
        clone.onBeforeCompile = (shader: any) => {
          shader.fragmentShader = shader.fragmentShader.replace(
            'vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;',
            `vec3 paintIrradiance = totalDiffuse / max(diffuseColor.rgb, vec3(0.0001));
             float paintLuminance = dot(paintIrradiance, vec3(0.2126, 0.7152, 0.0722));
             totalDiffuse = mix(totalDiffuse, diffuseColor.rgb * paintLuminance, 0.9);
             vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;`,
          );
        };
        clone.customProgramCacheKey = () => 'neutral-cabin-paint-v1';
      }
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
    return /^(rounded-front-pressure-collar|recessed-front-pressure-seal|hover-perimeter-light-guide|roof-latch|reinforced-|room-label-|side-label-|nameplate-amber-clasp|side-nameplate-amber-clasp|underside-service-keel|captive-collar-fasteners)/.test(
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
        // The continuous chassis owns the exterior. Do not leave old pod
        // roofs, square end caps, or differently lit divider rims under it.
        if (name.endsWith('-continuous-pressure-skin') && outside) continue;
        if (name.endsWith('-sealed-outboard-wall') && normal.x > -0.999)
          continue;
        if (
          /open-side-pressure-bulkhead|walkway-twin-open-room-wall/.test(name)
        ) {
          const centers = name.startsWith('walkway-')
            ? [DECK_HALF_PITCH - 0.06, -DECK_HALF_PITCH - 0.06]
            : [-0.06];
          const passage = centers.some(
            (y) => Math.abs(Math.hypot(center.y - y, center.z) - 0.97) < 0.025,
          );
          if (Math.abs(normal.x) < 0.999 && !passage) continue;
        }
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
    const cabinPartition =
      /open-side-pressure-bulkhead|walkway-twin-open-room-wall/.test(name);
    mesh(
      pair[0],
      cabinPartition
        ? material.userData.cabinPartitionPaint
          ? material
          : m.wall
        : material,
      assembly,
      name + (cabinPartition ? '-other-room-interior' : '-exterior'),
    );
    const insideMaterial =
      /continuous-pressure-skin|sealed-outboard-wall|open-side-pressure-bulkhead|walkway-(twin-open-room|open-docking)-wall/.test(
        name,
      )
        ? material.userData.cabinPartitionPaint
          ? material
          : m.wall
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

  // The interior envelope is fixed. Only its outward offset is reduced.
  const cabinFloorTop = CABIN_FLOOR;
  const previousFloorTop = -0.9535;
  const cabinCeiling = CABIN_CEILING;
  const interiorProfile = new THREE.Path();
  interiorProfile.moveTo(-PRESSURE_THROAT_START, cabinFloorTop);
  interiorProfile.lineTo(0.67, cabinFloorTop);
  interiorProfile.quadraticCurveTo(1.1, cabinFloorTop, 1.1, -0.61);
  interiorProfile.lineTo(1.1, 0.89);
  interiorProfile.quadraticCurveTo(1.1, cabinCeiling, 0.67, cabinCeiling);
  interiorProfile.lineTo(-PRESSURE_THROAT_START, cabinCeiling);
  const interiorPoints = interiorProfile.getPoints(48);
  const exteriorPoints = interiorPoints.map((point: any, i: number) => {
    const before = point
      .clone()
      .sub(interiorPoints[Math.max(0, i - 1)])
      .normalize();
    const after = interiorPoints[Math.min(interiorPoints.length - 1, i + 1)]
      .clone()
      .sub(point)
      .normalize();
    if (!i) before.copy(after);
    if (i === interiorPoints.length - 1) after.copy(before);
    const n0 = new THREE.Vector2(before.y, -before.x);
    const n1 = new THREE.Vector2(after.y, -after.x);
    const normal = n0.clone().add(n1).normalize();
    return point
      .clone()
      .addScaledVector(normal, PRESSURE_WALL / Math.max(0.5, normal.dot(n0)));
  });
  const shellShape = new THREE.Shape();
  shellShape.moveTo(exteriorPoints[0].x, exteriorPoints[0].y);
  for (const p of exteriorPoints.slice(1)) shellShape.lineTo(p.x, p.y);
  for (const p of [...interiorPoints].reverse()) shellShape.lineTo(p.x, p.y);
  shellShape.closePath();
  const shellGeometry = new THREE.ExtrudeGeometry(shellShape, {
    depth: 2 * CABIN_HALF_WIDTH,
    bevelEnabled: false,
    steps: 1,
  });
  smoothShoulderNormals(shellGeometry);
  shellGeometry.rotateY(Math.PI / 2);
  shellGeometry.translate(-CABIN_HALF_WIDTH, 0, 0);
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const boltGeometry = new THREE.CylinderGeometry(0.021, 0.021, 0.013, 6);
  boltGeometry.rotateX(Math.PI / 2);
  const frontSeal = frameGeometry(2.874, 2.789, 0.25, 0.024, 0.035, 0.003);
  const wallOutline = new THREE.Shape();
  wallOutline.moveTo(exteriorPoints[0].x, exteriorPoints[0].y);
  for (const p of exteriorPoints.slice(1)) wallOutline.lineTo(p.x, p.y);
  wallOutline.closePath();
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
    const skinGeometry = shellGeometry.clone();
    const positions = skinGeometry.getAttribute('position');
    const normals = skinGeometry.getAttribute('normal');
    const kept: number[] = [];
    const upper = roomCenters[section][1] > 0;
    for (let i = 0; i < positions.count; i += 3) {
      const hiddenSharedFace = [i, i + 1, i + 2].every((j) =>
        upper
          ? normals.getY(j) < -0.999 &&
            positions.getY(j) < cabinFloorTop - PRESSURE_WALL + 1e-5
          : normals.getY(j) > 0.999 &&
            positions.getY(j) > cabinCeiling + PRESSURE_WALL - 1e-5,
      );
      if (!hiddenSharedFace) kept.push(i, i + 1, i + 2);
    }
    skinGeometry.setIndex(kept);
    const skin = pressureMesh(
      skinGeometry,
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
    seal.position.set(x, (cabinFloorTop + cabinCeiling) / 2, 1.235);
    const hoverPerimeter = mesh(
      frameGeometry(2.814, 2.729, 0.22, 0.012, 0.01, 0.002),
      m.hoverRail,
      room,
      'hover-perimeter-light-guide',
    );
    hoverPerimeter.position.set(x, (cabinFloorTop + cabinCeiling) / 2, 1.267);
    // The single pressure skin now supplies the floor at its unchanged datum;
    // the former thick deck slab is no longer stacked on top of it.

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
    }
    roomLights[section] = [-0.66, 0.66].map((dx) => {
      const light = new THREE.PointLight(0xffc792, 0.35, 3.1, 2);
      light.position.set(x + dx, 0.8, 0.48);
      room.add(light);
      return light;
    });
    for (const sign of [-1, 1]) {
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
      if (sign > 0 || section === 'projects' || section === 'about') {
        const post = new THREE.Group();
        post.userData = {
          section,
          exterior: true,
          batchRoot: true,
          excludePick: true,
        };
        exteriorHardware.add(post);
        roomWallMounts.push({ group: post, origin: x, sign });
        rod([0, -0.47, 1.305], [0, 0.36, 1.305], 0.026, m.amber, post);
        sphere(0.034, m.amber, 0, -0.47, 1.305, post);
        sphere(0.034, m.amber, 0, 0.36, 1.305, post);
        for (const yy of [-0.75, 0.77]) {
          const bolt = mesh(
            boltGeometry,
            m.metal,
            post,
            'captive-collar-fasteners',
          );
          bolt.position.set(0, yy, 1.291);
        }
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
    // Preserve the dark deck finish as paint on the existing floor. The old
    // thick backing block protruded through the rounded outer keel corners.
    const floorFinish = mesh(
      new THREE.PlaneGeometry(2.77, 1.61),
      m.navy,
      room,
      'flush-deck-finish-interior',
    );
    floorFinish.rotation.x = -Math.PI / 2;
    floorFinish.position.set(x, cabinFloorTop + 0.003, -0.06);
    floorFinish.castShadow = false;
  }

  const passageClear = 1.84;
  // A circular aperture is cut directly into each continuous side wall.
  // There is no rectangular insert or second doorway surround.
  const passageWallClear = 1.94;
  const passageCenterZ = 0;
  function passageCircle(x = 0, y = 0, radius = passageWallClear / 2) {
    const path = new THREE.Path();
    path.absarc(x, y, radius, 0, Math.PI * 2, true);
    return path;
  }
  const passageShape = wallOutline.clone();
  const roomOpening = passageCircle(-passageCenterZ, -0.06);
  passageShape.holes.push(roomOpening);
  const openWallGeometry = new THREE.ExtrudeGeometry(passageShape, {
    depth: PRESSURE_WALL,
    bevelEnabled: false,
    curveSegments: 96,
    steps: 1,
  });
  openWallGeometry.translate(0, 0, -PRESSURE_WALL / 2);
  openWallGeometry.rotateY(Math.PI / 2);
  // One physical divider per row. The continuous ladder wall supplies the
  // left entrances; adding another room wall there would double its thickness.
  for (const section of Object.keys(roomCenters)) {
    const origin = legacyCenters[section];
    const leftColumn = section === 'projects' || section === 'about';
    // The shared skin supplies the rounded outboard wall; its inset room
    // faces are created from that same contour for each layout below.
    if (!leftColumn) continue;
    const finish = m.wall.clone();
    if (leftColumn) {
      finish.userData.cabinPartitionPaint = true;
      finish.userData.linkedRooms = [
        section,
        section === 'projects' ? 'experience' : 'contact',
      ];
    }
    const wall = pressureMesh(
      openWallGeometry,
      finish,
      structures[section],
      'open-side-pressure-bulkhead',
      1,
    );
    wall.userData.batchRoot = true;
    roomWallMounts.push({ group: wall, origin, sign: 1 });
  }

  const thresholdLiner = mat(
    'passage-borrowed-light-liner',
    palette.ivory,
    0.82,
    0,
    {
      emissive: 0x000000,
      emissiveIntensity: 0,
    },
  );
  thresholdLiner.userData.surfaceOnly = true;
  thresholdLiner.userData.roomSurface = true;
  thresholdLiner.userData.neutralPaint = true;
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
    return ladderOpeningOutline(path, {
      width: w,
      height: h,
      leftWidth,
      leftHeight,
      rightRadius: right,
      rightEdge,
    });
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
      0.68,
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
          0.68 - thickness,
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
    walkwayProfile(
      1.32,
      LADDER_HEIGHT - 0.02,
      LADDER_SHOULDER_RUN - 0.01,
      LADDER_SHOULDER_RISE - 0.01,
      LADDER_RIGHT_RADIUS - 0.01,
      0.025,
      0.06,
      0.005,
    ),
    m.gasket,
    walkwayStructure,
    'walkway-pressure-collar-seal',
  );
  walkwaySeal.position.set(0, LADDER_CENTER_Y, 1.19);
  // The rear lining is one closed pressure-panel volume. Its curved return
  // shares the shell's shoulder endpoints, rather than stacking a smaller
  // floating slab in front of a differently shaped shell.
  const rawServiceSpineRecesses = getServiceSpineRecesses(THREE);
  // Scale the fixed ladder fittings and their actual pressure-wall apertures
  // together. Sampling is identical to the service builder's pocket rims.
  const serviceSpineRecesses = rawServiceSpineRecesses.map((recess) => ({
    ...recess,
    shape: new THREE.Shape(
      recess.shape
        .getPoints(32)
        .map(
          (point: any) =>
            new THREE.Vector2(
              point.x,
              point.y * LADDER_CONTENT_SCALE + LADDER_CONTENT_OFFSET,
            ),
        ),
    ),
  }));
  function walkwayRearGeometry() {
    // The rear wall rolls into the single aperture contour through a small
    // concave cove. No overlaid skin or triangular end sheet is necessary.
    const inner = walkwayOutline(
      new THREE.Shape(),
      1.17,
      LADDER_HEIGHT - 0.16,
      LADDER_SHOULDER_RUN - 0.08,
      LADDER_SHOULDER_RISE - 0.08,
      LADDER_RIGHT_RADIUS - 0.08,
      0.61,
    )
      .getPoints(16)
      .map((p: any) => p.add(new THREE.Vector2(0, LADDER_CENTER_Y)));
    // Seat the existing cove on the fixed ladder-side wall datum.
    const rim = walkwayOutline(
      new THREE.Shape(),
      1.33,
      LADDER_HEIGHT,
      LADDER_SHOULDER_RUN,
      LADDER_SHOULDER_RISE,
      LADDER_RIGHT_RADIUS,
      0.69,
    )
      .getPoints(16)
      .map((p: any) => p.add(new THREE.Vector2(0, LADDER_CENTER_Y)));
    if (rim[0].distanceToSquared(rim[rim.length - 1]) < 1e-12) rim.pop();
    if (inner[0].distanceToSquared(inner[inner.length - 1]) < 1e-12)
      inner.pop();
    // Keep the rear lining within the ladder bay. Extending this contour
    // through the shared wall creates a folded panel inside the cabin doorway.
    const n = inner.length,
      frontZ = -0.985;
    // The right-hand cove meets the rear jamb at z=-0.975, just behind
    // the opening's z=-0.970 edge. A full-depth return would end inside
    // the open doorway and leave a slit between these existing surfaces.
    const coveDepth = rim.map((p: any) => (p.x > 0.6 ? 0.01 : 0.08));
    const frontPositions: number[] = [],
      frontIndices: number[] = [];
    for (const p of inner) frontPositions.push(p.x, p.y, frontZ);
    // Service pockets alter only the flat rear face. The established cove,
    // shoulder returns and every passage retain their shared datums.
    const serviceHoles = serviceSpineRecesses.map(({ shape }) => {
      const points = shape.getPoints(32);
      if (points[0].distanceToSquared(points[points.length - 1]) < 1e-12)
        points.pop();
      return points;
    });
    for (const hole of serviceHoles)
      for (const p of hole) frontPositions.push(p.x, p.y, frontZ);
    const faces = THREE.ShapeUtils.triangulateShape(inner, serviceHoles);
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
    const shoulderFrontZ = PRESSURE_THROAT_START;
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
      const upper =
        Math.min(rim[i].y, rim[j].y) >=
        LADDER_CENTER_Y + LADDER_HALF_STRAIGHT - 1e-6;
      const lower =
        Math.max(rim[i].y, rim[j].y) <=
        LADDER_CENTER_Y - LADDER_HALF_STRAIGHT + 1e-6;
      if (!upper && !lower) continue; // Keep all three actual passages open.
      for (let step = 0; step < shoulderSteps; step++) {
        const a = shoulderBase + step * n + i,
          b = shoulderBase + (step + 1) * n + i;
        const c = shoulderBase + step * n + j,
          d = shoulderBase + (step + 1) * n + j;
        frontIndices.push(a, b, d, a, d, c);
      }
    }
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
  function shareWalkwayDoorwayLighting(wall: any) {
    // This single partition replaces both former cabin walls. Its cabin-facing
    // surface must inherit the adjacent room, not the ladder's dimmer state.
    const cabinFace = wall.children.find(
      (part: any) =>
        part.name === 'walkway-twin-open-room-wall-other-room-interior',
    );
    const faceGeometry = cabinFace.geometry;
    const attributes = Object.entries(faceGeometry.attributes) as Array<
      [string, any]
    >;
    const dividerY = (CABIN_FLOOR + CABIN_CEILING) / 2;
    for (const [room, sign] of [
      ['projects', 1],
      ['about', -1],
    ] as const) {
      const values = Object.fromEntries(
        attributes.map(([name]) => [name, [] as number[]]),
      );
      const position = faceGeometry.getAttribute('position');
      for (let i = 0; i < position.count; i += 3) {
        const triangle = [i, i + 1, i + 2].map((index) =>
          Object.fromEntries(
            attributes.map(([name, a]) => [
              name,
              Array.from(
                { length: a.itemSize },
                (_, c) => a.array[index * a.itemSize + c],
              ),
            ]),
          ),
        );
        const clipped: typeof triangle = [];
        for (let j = 0; j < 3; j++) {
          const a = triangle[j],
            b = triangle[(j + 1) % 3];
          const da = sign * (a.position[1] - dividerY);
          const db = sign * (b.position[1] - dividerY);
          if (da >= 0) clipped.push(a);
          if (da >= 0 !== db >= 0) {
            const t = da / (da - db);
            clipped.push(
              Object.fromEntries(
                attributes.map(([name]) => [
                  name,
                  a[name].map((v, c) => v + (b[name][c] - v) * t),
                ]),
              ),
            );
          }
        }
        for (let j = 1; j + 1 < clipped.length; j++)
          for (const point of [clipped[0], clipped[j], clipped[j + 1]])
            for (const [name] of attributes) values[name].push(...point[name]);
      }
      const geometry = new THREE.BufferGeometry();
      for (const [name, attribute] of attributes)
        geometry.setAttribute(
          name,
          new THREE.Float32BufferAttribute(values[name], attribute.itemSize),
        );
      geometry.computeBoundingSphere();
      mesh(
        geometry,
        sharedWalkwayWalls[room],
        wall,
        `walkway-${room}-cabin-facing-wall`,
      );
    }
    wall.remove(cabinFace);
    faceGeometry.dispose();

    const interior = wall.children.find(
      (part: any) => part.name === 'walkway-twin-open-room-wall-interior',
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
          ? [DECK_HALF_PITCH - 0.06, -DECK_HALF_PITCH - 0.06].findIndex(
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
      side > 0 ? LADDER_HEIGHT + 0.12 : 2.1,
      side > 0 ? 0.38 : 0,
    );
    offsetPath(outline, 0, LADDER_CENTER_Y);
    if (side > 0) {
      for (const yy of [-DECK_HALF_PITCH, DECK_HALF_PITCH]) {
        const opening = passageCircle(-passageCenterZ, yy - 0.06);
        outline.holes.push(opening);
      }
    } else {
      const dockingOpening = roundedPath(new THREE.Path(), 1.82, 1.9, 0.79);
      // Match both the external sleeve and the inner leaf's shared Y/Z axis.
      for (const curve of dockingOpening.curves)
        for (const key of ['v0', 'v1', 'v2'])
          if (curve[key]) curve[key].y += LADDER_CENTER_Y;
      outline.holes.push(dockingOpening);
    }
    const skin = new THREE.ExtrudeGeometry(outline, {
      depth: PRESSURE_WALL,
      bevelEnabled: false,
      bevelSize: 0.018,
      bevelThickness: 0.018,
      bevelSegments: 3,
      curveSegments: 96,
    });
    skin.translate(0, 0, -PRESSURE_WALL / 2);
    skin.rotateY(Math.PI / 2);
    const fittedSkin =
      side > 0
        ? clipGeometryPlane(THREE, skin, 2, -0.985 - PRESSURE_WALL)
        : skin;
    if (fittedSkin !== skin) skin.dispose();
    const wall = pressureMesh(
      fittedSkin,
      m.shell,
      walkwayStructure,
      side > 0 ? 'walkway-twin-open-room-wall' : 'walkway-open-docking-wall',
      side,
    );
    // The docking wall shares the shoulder outer/inner datums, without a proud plate.
    wall.userData.batchRoot = true;
    ladderWallMounts.push({ group: wall, side });
    if (side > 0) shareWalkwayDoorwayLighting(wall);
    else {
      // The dock wall and curved shoulder returns share one interior finish.
      // The structural exterior keeps its independent hull material.
      for (const part of wall.children)
        if (part.name.endsWith('-interior'))
          part.material = roomMat(m.wall, 'walkway', false, true);
    }
  }
  const serviceSpine = buildLadderServiceSpine(
    THREE,
    {
      box,
      mesh,
      cylinder,
      rod,
      instances,
      fixtureMaterial: (material: any) =>
        roomMat(material, 'walkway', false, false),
    },
    walkwayFurniture,
    rawServiceSpineRecesses,
    m.amber,
  );
  serviceSpine.scale.y = LADDER_CONTENT_SCALE;
  serviceSpine.position.y = LADDER_CONTENT_OFFSET;
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
  for (const yy of [DECK_HALF_PITCH - 0.06, -DECK_HALF_PITCH - 0.06]) {
    const room = yy > 0 ? 'projects' : 'about';
    for (const viaWalkway of [false, true]) {
      const coupling = new THREE.Group();
      coupling.name = `${room}-${viaWalkway ? 'ladder' : 'cabin'}-continuous-passage`;
      coupling.userData = {
        section: room,
        batchRoot: true,
        excludePick: true,
        passageLiner: true,
      };
      utility.add(coupling);
      passageCouplings.push({ group: coupling, walkway: viaWalkway, y: yy });
      // The shared shutter added below includes this passage's full-depth guide.
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
  // Case Studies uses a fixed archive rack with a raked terminal. Its old
  // individual-case doors and hotspots leave with the replaced furnishings.
  const archive = new THREE.Group();
  archive.name = 'case-study-flight-recorder-archive';
  archive.position.set(-0.18, previousFloorTop, 0);
  archive.userData.batchRoot = true;
  rooms.experience.add(archive);
  const caseArchive = buildCaseStudyArchive(
    THREE,
    { box, mesh, cylinder, torus, rod, instances },
    archive,
    { caseCount: caseStudyData.length, accent: m.amber },
  );
  // ABOUT — a static crew study with retained personal belongings and paper tabs.
  const cabin = rooms.about;
  const personalStudy = new THREE.Group();
  personalStudy.name = 'about-personal-study';
  personalStudy.position.set(legacyCenters.about + 0.18, previousFloorTop, 0);
  personalStudy.userData.batchRoot = true;
  cabin.add(personalStudy);
  buildAboutPersonalStudy(
    THREE,
    { box, mesh, cylinder, torus, rod, instances },
    personalStudy,
    { accent: m.amber },
  );

  // CONTACT — static, floor-referenced flight operations console.
  // The existing content transform lowers legacy props to the cabin floor.
  // Cancel its horizontal inset so this wide console stays centered on the wall.
  const contact = rooms.contact;
  const contactConsole = new THREE.Group();
  contactConsole.name = 'contact-flight-console';
  contactConsole.position.set(-0.18, previousFloorTop, 0);
  contactConsole.userData.batchRoot = true;
  contact.add(contactConsole);
  buildContactFlightConsole(
    THREE,
    { box, mesh, cylinder, torus, rod, instances },
    contactConsole,
    {
      title: options.labels?.contact,
      accent: m.amber,
      socials: options.socials,
      rearWallProfile: interiorPoints.map((point: any) => ({
        y: point.y,
        z: -point.x,
      })),
    },
  );

  group.userData.socialScreens = contactConsole.userData.socialScreens;
  // Outboard fixtures follow the actual wall, independently of furniture scale.
  const outboardEquipment = ['contact', 'experience'].map((section) => {
    const root = new THREE.Group();
    root.name = `${section}-outboard-equipment`;
    root.userData = { section, batchRoot: true, excludePick: true };
    root.rotation.y = -Math.PI / 2;
    group.add(root);
    buildOutboardWallEquipment(
      THREE,
      { box, mesh, cylinder, instances },
      root,
      section === 'contact' ? 'communications' : 'recorder',
    );
    return { section, root };
  });
  const objectHighlights = group.userData.socialScreens
    .filter((screen: any) => screen.link)
    .map((screen: any) => {
      screen.interactableId = `contact-social-${screen.side}`;
      return createObjectHighlight(THREE, screen.root, screen.interactableId, {
        width: screen.width,
        height: screen.height,
        radius: 0.055,
        z: 0.096,
      });
    });

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

  const servicePressureHull = axialHull(
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
  // The service assembly's X=4.75 datum follows the outside of the pressure
  // wall in both layouts. Terminate its inboard shell inside that wall, so the
  // circular housing cannot emerge into Contact or Case Studies above it.
  const serviceHullSource = servicePressureHull.geometry;
  servicePressureHull.geometry = clipGeometryPlane(
    THREE,
    serviceHullSource,
    0,
    4.75 - PRESSURE_WALL + 0.005 - servicePressureHull.position.x,
  );
  serviceHullSource.dispose();
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
  // Furnishings are currently display-only. Room and portal navigation remain
  // active; the two configured social monitors use their native scene anchors.

  const proxyMaterial = new THREE.MeshBasicMaterial({ visible: false });
  function portalPickBox(
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
      (canvas.width * wayfinding.inkWidthRatio) /
        Math.max(1, ctx.measureText(title).width),
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
  // Portfolio identity is rendered by the page heading, not the spacecraft.
  group.userData.branding = [];
  group.userData.circulation = ['experience', 'projects', 'about', 'contact'];

  // Six navigation directions refer to four physical mechanisms. Reciprocal
  // room routes share a shutter; the ladder's upper/lower entrances stay separate.
  const physicalHatches = new Map<string, any>();
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
    visual.name = id + '-iris-passage';
    visual.userData = {
      section: from,
      portal: true,
      surfaceOnly: true,
      batchRoot: true,
      portalId: id,
      portalDestination: to,
    };
    rooms[from].add(visual);
    const physicalId = viaWalkway ? id : [from, to].sort().join(':');
    let hatch = physicalHatches.get(physicalId);
    if (!hatch) {
      const signalSource = m.amber.clone();
      signalSource.userData.surfaceOnly = true;
      signalSource.name = 'route-paint-' + id;
      signalSource.userData.highlightScale = 0;
      const bladeSource = m.chalk.clone();
      // Neutral white paint on every cap and edge, with shared passage lighting
      // on the two visible faces. The surrounding partition stays cabin ivory.
      bladeSource.color.set(0xffffff);
      bladeSource.roughness = 0.72;
      bladeSource.metalness = 0;
      bladeSource.userData.neutralPaint = true;
      bladeSource.userData.linkedRooms = viaWalkway
        ? [from, 'walkway']
        : [from, to];
      signalSource.userData.linkedRooms = bladeSource.userData.linkedRooms;
      const rimSource = m.gasket.clone();
      rimSource.roughness = 0.82;
      rimSource.metalness = 0;
      rimSource.userData.neutralPaint = true;
      rimSource.userData.linkedRooms = bladeSource.userData.linkedRooms;
      bladeSource.name = 'iris-enamel-' + id;
      rimSource.name = 'iris-guide-' + id;
      const irisOptions = {
        radius: passageClear / 2,
        guideDepth: PRESSURE_WALL + 0.004,
        bladeMaterial: roomMat(bladeSource, from, false, true),
        rimMaterial: roomMat(rimSource, from, false, true),
        accentMaterial: roomMat(signalSource, from, false, true),
      };
      const iris = buildIrisHatch(THREE, irisOptions);
      iris.group.userData.irisHatch = true;
      iris.group.userData.physicalHatch = physicalId;
      iris.group.traverse((part: any) => {
        part.userData.section = from;
        part.userData.excludePick = true;
      });
      const coupling = passageCouplings.find(
        (entry) =>
          entry.walkway === viaWalkway &&
          Math.abs(entry.y - (roomCenters[from][1] - 0.06)) < 0.001,
      )!;
      coupling.group.add(iris.group);
      iris.group.rotation.y = Math.PI / 2;
      roomMaterials[from].push(...iris.materials);
      hatch = { iris, doorMotion: { value: 0, velocity: 0 }, portals: [] };
      physicalHatches.set(physicalId, hatch);
    }
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
    const pick = portalPickBox(
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
      sealed: true,
      open: false,
      openProgress: 0,
      doorType: 'integrated-iris',
      raisedDoorFrame: false,
      bladeSetCount: 1,
      physicalHatch: physicalId,
      label: options.labels?.[to] || to,
      waypoints: [],
    };
    const portal = {
      id,
      from,
      to,
      edge,
      visual,
      caption,
      pick,
      metadata,
      iris: hatch.iris,
      strength: 0,
    };
    portals.push(portal);
    hatch.portals.push(portal);
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
    const s = variant === 'wide' ? 1.4 : 1;
    const layout = wallLayout(s);
    const { halfPitch: pitch, ladderX, rightX } = layout;
    const jointX = layout.ladderRightWall;
    const outline = thinChassisOutline(THREE, {
      scale: s,
      thickness: PRESSURE_WALL,
    });
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
    const faceGeometry = new THREE.ExtrudeGeometry(
      outline.outer,
      outline.extrusion,
    );
    faceGeometry.translate(0, 0, PRESSURE_THROAT_START);
    mesh(faceGeometry, m.shell, frame, 'one-piece-five-aperture-pressure-face');
    const apertures = Object.keys(rooms).map((section) => ({
      section,
      center: [
        (section === 'projects' || section === 'about' ? -1 : 1) * pitch,
        roomCenters[section][1] + (cabinFloorTop + cabinCeiling) / 2,
        1.24,
      ],
      size: [2 * CABIN_HALF_WIDTH * s, cabinCeiling - cabinFloorTop],
      radius: [0.35 * s, 0.35],
    }));
    // The symmetric bow and cabins now share the same roof and keel datum.
    // The outer shell is a single thin offset from that fitted inner contour.
    const bowOutline = thinChassisOutline(THREE, {
      scale: s,
      thickness: PRESSURE_WALL,
      bevel: 0,
    });
    // Use the very same contour as the front frame. Offsetting separately
    // sampled inner curves leaves slivers where their two approximations meet.
    const outerBow = bowOutline.bowEnvelope.getPoints(64);
    if (outerBow[0].distanceTo(outerBow[outerBow.length - 1]) < 1e-8)
      outerBow.pop();
    // Match the actual bevel join, not an independently approximated offset
    // ellipse. Even a subpixel mismatch here produces a dotted overlap seam.
    const facePositions = faceGeometry.getAttribute('position');
    const join = new Map<string, any>();
    for (let i = 0; i < facePositions.count; i++) {
      if (Math.abs(facePositions.getZ(i) - PRESSURE_THROAT_START) > 1e-6)
        continue;
      const point = new THREE.Vector2(
        facePositions.getX(i),
        facePositions.getY(i),
      );
      join.set(`${point.x}:${point.y}`, point);
    }
    for (const point of outerBow) {
      if (point.x > bowOutline.datums.bowTangentX + 1e-6) continue;
      let nearest = point,
        distance = 0.0001;
      for (const candidate of join.values()) {
        const d = candidate.distanceToSquared(point);
        if (d < distance) {
          nearest = candidate;
          distance = d;
        }
      }
      point.copy(nearest);
    }
    const closures = buildContinuousExteriorSkin(THREE, {
      datums: thinChassisOutline(THREE, {
        scale: s,
        thickness: PRESSURE_WALL,
        bevel: 0,
      }).datums,
      cabinExteriorProfile: exteriorPoints,
      outerBow,
      frontZ: PRESSURE_THROAT_START,
    });
    for (const part of closures.surfaces)
      mesh(part.geometry, m.shell, frame, part.name);
    // The inward side faces terminate on the same rounded outer envelope,
    // removing the old square cap protrusions without moving a cabin datum.
    const innerSide = closures.profiles
      .sideOutlineAtX(rightX - PRESSURE_WALL)
      .getPoints(1);
    for (const [section, sign] of [
      ['experience', 1],
      ['contact', -1],
    ] as const) {
      const points: any[] = [];
      for (let i = 0; i < innerSide.length; i++) {
        const a = innerSide[i],
          b = innerSide[(i + 1) % innerSide.length];
        const da = sign * (a.y - LADDER_CENTER_Y);
        const db = sign * (b.y - LADDER_CENTER_Y);
        if (da >= 0) points.push(a.clone());
        if (da >= 0 !== db >= 0) points.push(a.clone().lerp(b, da / (da - db)));
      }
      const geometry = new THREE.ShapeGeometry(new THREE.Shape(points));
      const indices = geometry.index;
      for (let i = 0; i < indices.count; i += 3) {
        const v = indices.getX(i + 1);
        indices.setX(i + 1, indices.getX(i + 2));
        indices.setX(i + 2, v);
      }
      geometry.computeVertexNormals();
      geometry.rotateY(Math.PI / 2);
      geometry.translate(rightX - PRESSURE_WALL, 0, 0);
      const roomFace = new THREE.Group();
      roomFace.userData = {
        section,
        roomSurface: true,
        surfaceOnly: true,
        batchRoot: true,
      };
      frame.add(roomFace);
      mesh(
        geometry,
        m.wall,
        roomFace,
        section + '-sealed-outboard-wall-interior',
      );
    }
    const bowVertices: number[] = [],
      bowIndices: number[] = [];
    for (const p of outerBow)
      bowVertices.push(
        p.x,
        p.y,
        -0.985 - PRESSURE_WALL,
        p.x,
        p.y,
        PRESSURE_THROAT_START,
      );
    for (let i = 0; i < outerBow.length; i++) {
      const j = (i + 1) % outerBow.length;
      // The flat docking and shared cabin walls are already real thin panels.
      // Keep the outer shell only along the two curved shoulder portions.
      if (
        Math.max(outerBow[i].y, outerBow[j].y) <
          LADDER_CENTER_Y + LADDER_HALF_STRAIGHT &&
        Math.min(outerBow[i].y, outerBow[j].y) >
          LADDER_CENTER_Y - LADDER_HALF_STRAIGHT
      )
        continue;
      if (Math.min(outerBow[i].x, outerBow[j].x) >= closures.replaceBowAfterX)
        continue;
      // The outline runs counterclockwise; back-to-front quads must face
      // outward so the pressure skin stays visible from exterior tilt angles.
      bowIndices.push(2 * i, 2 * j, 2 * j + 1, 2 * i, 2 * j + 1, 2 * i + 1);
    }
    const bowGeometry = new THREE.BufferGeometry();
    bowGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(bowVertices, 3),
    );
    bowGeometry.setIndex(bowIndices);
    bowGeometry.computeVertexNormals();
    mesh(bowGeometry, m.shell, frame, 'thin-continuous-bow-outer-skin');
    const rearShape = new THREE.Shape();
    rearShape.moveTo(outerBow[0].x, outerBow[0].y);
    for (const p of outerBow.slice(1)) rearShape.lineTo(p.x, p.y);
    rearShape.closePath();
    for (const recess of serviceSpineRecesses)
      rearShape.holes.push(offsetPath(recess.shape.clone(), ladderX, 0, s));
    const rearGeometry = new THREE.ShapeGeometry(rearShape, 48);
    const rearNormal = rearGeometry.getAttribute('normal');
    for (let i = 0; i < rearNormal.count; i++) rearNormal.setXYZ(i, 0, 0, -1);
    const rearIndex = rearGeometry.index;
    for (let i = 0; i < rearIndex.count; i += 3) {
      const temp = rearIndex.getX(i + 1);
      rearIndex.setX(i + 1, rearIndex.getX(i + 2));
      rearIndex.setX(i + 2, temp);
    }
    rearGeometry.translate(0, 0, -0.985 - PRESSURE_WALL);
    mesh(rearGeometry, m.shell, frame, 'thin-ladder-rear-pressure-wall');
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
        center: [ladderX, LADDER_CENTER_Y, 1.17],
        size: [1.33 * s, LADDER_HEIGHT],
        leftRadii: [LADDER_SHOULDER_RUN * s, LADDER_SHOULDER_RISE],
        rightRadii: [LADDER_RIGHT_RADIUS * s, LADDER_RIGHT_RADIUS],
      },
      frontFace: {
        minZ: PRESSURE_FACE_FRONT - PRESSURE_WALL,
        maxZ: PRESSURE_FACE_FRONT,
        holeCount: 5,
        blindRecessCount: 0,
      },
      serviceMount: {
        position: [rightX - 0.015, 0.03, 0],
        size: [0.21, 2.48, 2.24],
        axis: [1, 0, 0],
        fairingEndX: rightX + 0.175,
      },
      jointX,
      exteriorOnly: true,
      roomInteriorDatumsPreserved: true,
      wallThickness: PRESSURE_WALL,
      exteriorClosures: closures.metadata,
      replacedParts: [
        'rounded-front-pressure-collar',
        'walkway-rounded-pressure-collar',
        'coherent-cabin-deck',
        'continuous-chassis-envelope',
        'interdeck-crossmember',
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
    // Retain the iris meshes' aperture shader callbacks and rigid transforms.
    for (let owner = object.parent; owner; owner = owner.parent)
      if (owner.userData.irisHatch) return;
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
  // Keep printed archive labels and backlit screens free of self-shadows after batching.
  for (const equipment of [workshop, archive, personalStudy])
    equipment.traverse((object: any) => {
      if (
        object.isMesh &&
        (object.material?.userData.displaySize ||
          object.material?.userData.archiveInk ||
          object.material?.userData.studyInk)
      ) {
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
  group.userData.caseStudyCategoryCapacity = 5;
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
    'A two-by-two toybox spacecraft with a four-module project workshop, five flight-recorder category cartridges and a raked archive terminal, a retained personal study and a dedicated communications room; a docking nose and right-hand service wings complete the pressure hull';
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
      walkway,
      chassisVariants[currentLayout],
    ])
      box.union(vesselBounds(part));
    const passageBounds = new THREE.Box3();
    for (const hatch of physicalHatches.values())
      passageBounds.union(vesselBounds(hatch.iris.rim));
    box.union(passageBounds);
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
    ] as Array<[string, any]>)
      supportBounds.push({ name, bounds: vesselBounds(part) });
    supportBounds.push({ name: 'passage-couplings', bounds: passageBounds });
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
    const layoutWalls = wallLayout(layoutScale);
    const { halfPitch } = layoutWalls;
    const propScale = currentLayout === 'wide' ? 1 : 0.84;
    // Preserve the study's rear mounting plane when its furniture scales down.
    personalStudy.position.z = -1.1 * (1 / propScale - 1);
    contactConsole.userData.setPropScale(propScale);
    for (const { section, root } of outboardEquipment) {
      root.position.set(
        halfPitch + CABIN_HALF_WIDTH * layoutScale,
        roomCenters[section][1] + 0.08,
        0.18,
      );
      root.scale.setScalar(propScale);
    }
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
    const outward = layoutWalls.rightX - 3.25;
    const walkwayX = layoutWalls.ladderX;
    walkway.position.set(walkwayX, 0, 0);
    // Both hatch assemblies derive their position from the actual sidewall.
    const dockingWallX = layoutWalls.dockingOuterWall;
    const dockingInnerFace = PRESSURE_WALL;
    const dockingInset = dockingInnerFace - 0.008;
    dockingInterior.position.set(
      -0.665 * layoutScale - 0.008,
      LADDER_CENTER_Y,
      0,
    );
    walkwayStructure.scale.set(layoutScale, 1, 1);
    walkwayFurniture.scale.set(layoutScale, 1, 1);
    for (const wall of roomWallMounts) {
      wall.group.position.set(
        wall.origin +
          wall.sign * (CABIN_HALF_WIDTH + PRESSURE_WALL / (2 * layoutScale)),
        0,
        0,
      );
      wall.group.scale.x = 1 / layoutScale;
    }
    for (const wall of ladderWallMounts) {
      wall.group.position.x =
        wall.side > 0
          ? 0.69 + PRESSURE_WALL / (2 * layoutScale)
          : -0.665 - PRESSURE_WALL / (2 * layoutScale);
      wall.group.scale.x = 1 / layoutScale;
    }
    const roomHatchPlane = -halfPitch - 1.43 * layoutScale + 0.002;
    const ladderHatchPlane = walkwayX + 0.69 * layoutScale - 0.002;
    for (const entry of passageCouplings) {
      const near = entry.walkway
        ? roomHatchPlane
        : halfPitch - 1.43 * layoutScale + 0.002;
      const far = entry.walkway ? ladderHatchPlane : -near;
      entry.group.position.set((near + far) / 2, entry.y, passageCenterZ);
      // The guide and blade stock already have real dimensions. Never stretch
      // the shutter along the wall thickness when switching cabin layouts.
      entry.group.scale.set(1, 1, 1);
    }
    docking.position.set(dockingWallX + 4.5, LADDER_CENTER_Y - 0.03, 0);
    service.position.x = -1.5 + outward;
    group.userData.dockingAnchor = [
      docking.position.x - 5.137,
      0.208 + LADDER_CENTER_Y - 0.03,
      1.05,
    ];
    group.userData.dockingAnchors = {
      sleeve: [docking.position.x - 5.065, LADDER_CENTER_Y, 0],
      hatch: [docking.position.x - 6.396, LADDER_CENTER_Y, 0],
      mount: [docking.position.x - 4.58, LADDER_CENTER_Y, 0],
      wall: [dockingWallX, LADDER_CENTER_Y, 0],
      innerHatch: [dockingWallX + dockingInset, LADDER_CENTER_Y, 0],
    };
    group.userData.communicationsAnchor = [4.14 + outward, 0.23, 1.16];
    group.userData.walkwayAnchor = [walkwayX, 0, 0.16];
    group.userData.walkwayProfile = {
      centerY: LADDER_CENTER_Y,
      height: LADDER_HEIGHT,
      leftCornerRadius: LADDER_SHOULDER_RUN * layoutScale + PRESSURE_WALL,
      leftShoulderRadii: [
        LADDER_SHOULDER_RUN * layoutScale + PRESSURE_WALL,
        LADDER_SHOULDER_RISE + PRESSURE_WALL,
      ],
      leftShoulderHeight: LADDER_SHOULDER_RISE + PRESSURE_WALL,
      leftStraightHeight: LADDER_HALF_STRAIGHT * 2,
      shoulderFraction:
        (2 * (LADDER_SHOULDER_RISE + PRESSURE_WALL)) /
        (LADDER_HEIGHT + PRESSURE_WALL * 2),
      rightCornerRadius: LADDER_RIGHT_RADIUS * layoutScale,
      shellDepth: 2.42,
      rearLiner: {
        frontZ: -0.985,
        rearZ: -0.985 - PRESSURE_WALL,
        sharedShoulders: [LADDER_SHOULDER_RUN, LADDER_SHOULDER_RISE],
        innerShoulders: [
          LADDER_SHOULDER_RUN - 0.08,
          LADDER_SHOULDER_RISE - 0.08,
        ],
        continuousReturn: true,
      },
      landings: [],
      clearDockingOpening: [1.82, 1.9],
      ladderBounds: {
        min: [
          -0.133 * layoutScale,
          -2.555 * LADDER_CONTENT_SCALE + LADDER_CONTENT_OFFSET,
          -0.96,
        ],
        max: [
          0.433 * layoutScale,
          2.575 * LADDER_CONTENT_SCALE + LADDER_CONTENT_OFFSET,
          -0.647,
        ],
      },
      endShoulderContinuity: true,
    };
    walkway.updateMatrixWorld(true);
    group.userData.walkwaySigns = [];
    group.userData.walkwayBounds = {
      center: [walkwayX, LADDER_CENTER_Y, 0.1],
      size: [1.75 * layoutScale, LADDER_HEIGHT + PRESSURE_WALL * 2, 2.65],
    };
    for (const portal of portals) {
      const origin = legacyCenters[portal.from],
        sign = portal.edge === 'right' ? 1 : -1;
      portal.visual.position.set(origin, 0, 0);
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
      const main = new THREE.CylinderGeometry(
        passageClear / 2,
        passageClear / 2,
        portal.metadata.size[0],
        48,
      ).toNonIndexed();
      main.rotateZ(Math.PI / 2);
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
    // All cabins share the same architecture and camera frame. Fitting each
    // furniture bounding box made Contact pull back farther than the other rooms.
    // Keep the reference local to the cabin focus and symmetric at both doors.
    const roomFocusZ = 0.16;
    const halfHeight = (cabinCeiling - cabinFloorTop) / 2;
    const framingPoints = new Map<string, number[]>();
    const addFramingPoint = (point: number[]) => {
      framingPoints.set(point.map((v) => v.toFixed(6)).join(','), point);
    };
    for (const sx of [-1, 1])
      for (const sy of [-1, 1])
        addFramingPoint([
          sx * CABIN_HALF_WIDTH * layoutScale,
          sy * halfHeight,
          -1.1 - roomFocusZ,
        ]);
    for (const [section, roomPoints] of Object.entries(points)) {
      const [x, y] = group.userData.innerApertureBounds[section].center;
      for (const point of roomPoints) {
        if (point.kind !== 'header' && point.kind !== 'portal-plate') continue;
        const local = [
          point.position[0] - x,
          point.position[1] - y,
          point.position[2] - roomFocusZ,
        ];
        addFramingPoint(local);
        addFramingPoint([-local[0], local[1], local[2]]);
      }
    }
    group.userData.roomCameraFrame = {
      aperture: {
        center: [0, 0, 1.2 - roomFocusZ],
        right: [1, 0, 0],
        up: [0, 1, 0],
        width: 2.44 * layoutScale,
        height: 2 * halfHeight,
      },
      requiredPoints: [...framingPoints.values()],
    };
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
    caseArchive.setCaseCount(caseStudyData.length);
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
    for (const highlight of objectHighlights) {
      if (
        highlight.update(
          currentState.hoveredObject === highlight.id,
          currentState.activeRoom === 'contact' &&
            !currentState.travelling &&
            !currentState.reading,
          dt,
          instantHighlight,
        )
      )
        group.userData.motionActive = true;
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
    const hoveredHatch =
      !currentState.reading && !currentState.travelling && route.length > 1
        ? portals.find((p) => p.from === route[0] && p.to === route[1])?.iris
            .group.userData.physicalHatch
        : null;
    const requestedDoors = new Set(currentState.openPortalIds || []);
    if (hoveredHatch)
      for (const portal of portals)
        if (portal.iris.group.userData.physicalHatch === hoveredHatch)
          requestedDoors.add(portal.id);
    // Hover and travel share one physical mechanism from either direction,
    // while the ladder's separate upper/lower entrances stay mutually exclusive.
    const { openPortalIds } = interlockLadderPortals(
      portals.map((p) => p.metadata),
      [...requestedDoors],
    );
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
      portal.metadata.highlight = portal.strength;
      if (portal.strength !== wanted) group.userData.motionActive = true;
      portal.pick.userData.highlighted = portal.strength > 0.01;
    }
    for (const hatch of physicalHatches.values()) {
      const { iris, doorMotion } = hatch;
      const highlight = Math.max(...hatch.portals.map((p: any) => p.strength));
      // Only the recessed indicator lenses respond; the graphite surround and
      // white shutter retain their finish from both rooms.
      iris.setHighlight(highlight);
      const doorGoal = hatch.portals.some((p: any) =>
        openPortalIds.includes(p.id),
      )
        ? 1
        : 0;
      if (currentState.immediateDoors || instantHighlight) {
        doorMotion.value = doorGoal;
        doorMotion.velocity = 0;
      } else {
        // Double the original opening rate: frequency/speed scale by two,
        // acceleration by four. Keep the established closing motion.
        moveCameraAxis(doorMotion, doorGoal, dt, {
          frequency: doorGoal ? 24 : 12,
          speed: doorGoal ? 5.6 : 2.8,
          acceleration: doorGoal ? 56 : 14,
        });
        if (
          Math.abs(doorMotion.value - doorGoal) < 0.001 &&
          Math.abs(doorMotion.velocity) < 0.015
        ) {
          doorMotion.value = doorGoal;
          doorMotion.velocity = 0;
        }
      }
      const openingProgress = Math.max(0, Math.min(1, doorMotion.value));
      iris.setOpen(openingProgress);
      for (const portal of hatch.portals) {
        portal.metadata.openProgress = openingProgress;
        portal.metadata.open = openingProgress >= 0.999;
        portal.metadata.sealed = openingProgress <= 0.001;
      }
      if (openingProgress !== doorGoal) group.userData.motionActive = true;
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
  group.userData.irisHatches = [...physicalHatches.values()].map(
    (h) => h.iris.group,
  );
  group.userData.passageLinings = [...physicalHatches.values()].map(
    (h) => h.iris.rim,
  );
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
