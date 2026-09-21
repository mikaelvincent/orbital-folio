import { createModelPrimitives } from './geometry/model-primitives.ts';
import { projectCategoryCount } from '../../lib/content/project-content.ts';
import { createComputerDesktopMaterial } from './rooms/computer-desktop.ts';
import { indexedCylinderType } from './geometry/indexed-cylinder.generated.js';
import { buildDockingAndServiceAssemblies } from './equipment/docking-service-assemblies.ts';
import { buildContinuousExteriorSkin } from './geometry/continuous-exterior-skin.ts';
import { buildExteriorServiceEquipment } from './equipment/exterior-service-equipment.ts';
import { finishWindowReveals } from './geometry/flush-window-reveals.ts';
import { buildDockingShoulderEquipment } from './equipment/docking-shoulder-equipment.ts';
import { buildLadderEndcapEquipment } from './equipment/ladder-endcap-equipment.ts';
import {
  buildRoundedCabinInterior,
  trimCabinSideWall,
} from './geometry/rounded-cabin-interior.ts';
import { coalesceStaticInstances } from './geometry/coalesce-static-instances.ts';
import { thinChassisOutline } from './geometry/thin-chassis-outline.ts';
import { ladderOpeningOutline } from './geometry/ladder-opening-outline.ts';
import { clipGeometryPlane } from './geometry/clip-geometry-plane.ts';
import { createObjectHighlight } from './navigation/interactable-object-highlight.ts';
import { buildIrisHatch } from './navigation/iris-hatch.ts';
import { moveCameraAxis } from './navigation/flight.ts';
import { interlockLadderPortals } from './navigation/iris-navigation.ts';
import { canUseDoorDuringTravel } from './navigation/door-navigation.ts';
import {
  PRESSURE_WALL,
  PRESSURE_THROAT_START,
  PRESSURE_FACE_FRONT,
  CABIN_FLOOR,
  CABIN_CEILING,
  CABIN_HALF_WIDTH,
  PASSAGE_RADIUS,
  PASSAGE_GUIDE_WIDTH,
  PASSAGE_WALL_RADIUS,
  CABIN_RETURN_RADIUS,
  PASSAGE_CENTER_Y,
  PORTAL_SIGN_CENTER_Y,
  PORTAL_SIGN_STANDOFF,
  PASSAGE_CABIN_Z,
  PASSAGE_LADDER_Z,
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
} from './geometry/spacecraft-wall-layout.ts';
import type { SocialScreenLinks } from '../../lib/content/social-links.ts';
import { buildAboutPersonalStudy } from './rooms/about-personal-study.ts';
import { buildCaseStudyArchive } from './rooms/case-study-archive.ts';
import { buildContactFlightConsole } from './rooms/contact-flight-console.ts';
import { buildProjectsWorkshop } from './rooms/projects-workshop.ts';
import { CABIN_WAYFINDING } from './rooms/cabin-composition.ts';
import { buildOutboardWallEquipment } from './equipment/outboard-wall-equipment.ts';
import {
  buildCabinUtilityFittings,
  buildLadderWebFittings,
} from './equipment/cabin-utility-fittings.ts';
import {
  buildLadderServiceSpine,
  getServiceSpineRecesses,
} from './equipment/ladder-service-spine.ts';

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
  categories?: string[];
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
  /** Ladder hatches reserved by the remaining journey, including future legs. */
  routeLadderPortalIds?: readonly string[];
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
  projectScreen?: string;
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
    /** Keep an exact uncoalesced reference available for equivalence tests. */
    coalesceInstances?: boolean;
    /** Exact direct-indexed prototype; reference remains available to the lab. */
    geometryCompaction?: boolean;
  } = {},
): {
  group: any;
  targets: Array<{ object: any; section: string }>;
  update: (
    time: number,
    active: string,
    instantHighlight?: boolean,
    state?: SpacecraftState,
    deferWorldMatrices?: boolean,
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
  if (options.geometryCompaction !== false)
    THREE = { ...THREE, CylinderGeometry: indexedCylinderType(THREE) };
  const group = new THREE.Group();
  group.name = 'orbital-pressure-vessel';
  // AO consumes geometry/visibility, not the material feedback included in
  // motionActive. A revision survives standalone setters and catches immediate
  // changes and final animation snaps even when no motion remains afterward.
  group.userData.geometryRevision = 0;
  group.userData.geometryChanged = false;
  const geometryChanged = () => {
    group.userData.geometryRevision++;
    group.userData.geometryChanged = true;
  };
  const targets: Array<{ object: any; section: string }> = [];
  const interactionTargets: Array<{ object: any; section: string }> = [];
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
    section === 'projects' ||
    section === 'contact' ||
    section === 'about' ||
    section === 'experience';
  // Shared physical scale and elevation for room headings and doorway signs.
  const wayfinding = CABIN_WAYFINDING;
  const headerPosition = (_section: string): [number, number] => [
    wayfinding.centerY,
    wayfinding.roomSignFaceZ,
  ];
  const readerTrays: Record<string, { group: any; progress: number }> = {};
  const primitives = createModelPrimitives(
    THREE,
    group,
    options.accent,
    roomMaterials,
  );
  const {
    palette,
    mat,
    m,
    sectionOf,
    roomMat,
    cached,
    mesh,
    pressureMesh,
    box,
    cylinder,
    torus,
    sphere,
    rod,
    instances,
    roundedPath,
    frameGeometry,
    panelGeometry,
    axialHull,
  } = primitives;

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
  const cabinLining = buildRoundedCabinInterior(
    THREE,
    interiorPoints,
    CABIN_HALF_WIDTH,
    CABIN_RETURN_RADIUS,
    12,
  );
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const boltGeometry = new THREE.CylinderGeometry(0.021, 0.021, 0.013, 6);
  boltGeometry.rotateX(Math.PI / 2);
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
    const skin = mesh(
      cabinLining.geometry,
      m.wall,
      room,
      section + '-continuous-pressure-skin-interior',
    );
    skin.position.set(x, 0, 0);
    if (section === 'contact') skin.material.userData.contactRoomWall = true;
    if (section === 'contact' || section === 'projects')
      skin.material.userData.applicationRoomWall = section;
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
      // A shallow, wall-fitted heading shares the air returns' visible plane.
      const header = new THREE.Group();
      header.name = `cabin-identification-${section}`;
      header.userData = {
        section,
        physicalLabel: true,
        batchRoot: true,
        excludePick: true,
      };
      header.position.set(x, headerPosition(section)[0], 0);
      rooms[section].add(header);
      const headerHalfHeight = wayfinding.plateHeight / 2;
      const headerBottom = wayfinding.centerY - headerHalfHeight;
      const headerTop = wayfinding.centerY + headerHalfHeight;
      const rearAt = (y: number) => {
        for (let i = 1; i < interiorPoints.length; i++) {
          const a = interiorPoints[i - 1],
            b = interiorPoints[i];
          if (b.y <= a.y || y < a.y || y > b.y) continue;
          return -(a.x + ((b.x - a.x) * (y - a.y)) / (b.y - a.y));
        }
        return -1.1;
      };
      const mountProfile = new THREE.Shape();
      mountProfile.moveTo(1.031, -headerHalfHeight);
      mountProfile.lineTo(1.031, headerHalfHeight);
      const mountYs = [
        headerBottom,
        headerTop,
        ...interiorPoints.map((p: any) => p.y),
      ]
        .filter((y) => y >= headerBottom && y <= headerTop)
        .sort((a, b) => b - a);
      for (const y of mountYs)
        mountProfile.lineTo(-rearAt(y) + 0.0005, y - wayfinding.centerY);
      mountProfile.closePath();
      const mountGeometry = new THREE.ExtrudeGeometry(mountProfile, {
        depth: wayfinding.roomSignWidth,
        bevelEnabled: false,
        steps: 1,
      });
      mountGeometry.rotateY(Math.PI / 2);
      mountGeometry.translate(-wayfinding.roomSignWidth / 2, 0, 0);
      mesh(
        mountGeometry,
        m.gasket,
        header,
        'cabin-identification-contoured-mount',
      );
      box(
        wayfinding.roomSignWidth,
        wayfinding.plateHeight,
        0.016,
        m.gasket,
        0,
        0,
        -1.024,
        header,
        0.008,
        'cabin-identification-rim',
      );
      box(
        1.64,
        wayfinding.enamelHeight,
        0.018,
        m.chalk,
        0,
        0,
        -1.008,
        header,
        0.015,
        'cabin-identification-inset',
      );
      for (const side of [-1, 1]) {
        box(
          0.024,
          0.12,
          0.01,
          m.amber,
          side * 0.765,
          0,
          -0.998,
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
          -1.0125,
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
          -1.007,
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
      new THREE.ShapeGeometry(
        roundedPath(
          new THREE.Shape(),
          2 * (CABIN_HALF_WIDTH - cabinLining.radius),
          1.61,
          0.12,
        ),
        32,
      ),
      m.navy,
      room,
      'flush-deck-finish-interior',
    );
    floorFinish.rotation.x = -Math.PI / 2;
    floorFinish.position.set(x, cabinFloorTop + 0.003, -0.06);
    floorFinish.castShadow = false;
  }

  const passageClear = 2 * PASSAGE_RADIUS;
  // A circular aperture is cut directly into each continuous side wall.
  // There is no rectangular insert or second doorway surround.
  const passageWallClear = 2 * PASSAGE_WALL_RADIUS;
  function passageCircle(x = 0, y = 0, radius = passageWallClear / 2) {
    const path = new THREE.Path();
    path.absarc(x, y, radius, 0, Math.PI * 2, true);
    return path;
  }
  const passageShape = wallOutline.clone();
  const roomOpening = passageCircle(-PASSAGE_CABIN_Z, PASSAGE_CENTER_Y);
  passageShape.holes.push(roomOpening);
  const untrimmedOpenWall = new THREE.ExtrudeGeometry(passageShape, {
    depth: PRESSURE_WALL,
    bevelEnabled: false,
    curveSegments: 96,
    steps: 1,
  });
  untrimmedOpenWall.translate(0, 0, -PRESSURE_WALL / 2);
  untrimmedOpenWall.rotateY(Math.PI / 2);
  const openWallGeometry = trimCabinSideWall(
    THREE,
    untrimmedOpenWall,
    cabinLining.sideProfile,
  );
  untrimmedOpenWall.dispose();
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
    wall.traverse((part: any) => {
      if (!part.isMesh) return;
      if (section === 'about') part.material.userData.contactRoomWall = true;
      part.material.userData.applicationRoomWall =
        section === 'about' ? 'contact' : 'projects';
    });
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
      const liner = box(
        0.3,
        2.06,
        0.0375,
        thresholdLiner,
        origin + sign * 1.365,
        0.04,
        -1.24625,
        structures[section],
        0.019,
        'visible-neighbor-rear-corner-liner',
      );
      // Preserve the front bevel exactly. The concealed backing previously
      // crossed the curved rear crown at its top/bottom corners even though
      // its center was inside the flat rear face. Trim only the hidden stock.
      liner.geometry = cached('rear-corner-backing-trim', () =>
        clipGeometryPlane(THREE, liner.geometry, 2, -1.24 - liner.position.z),
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
      .getPoints(64)
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
      .getPoints(64)
      .map((p: any) => p.add(new THREE.Vector2(0, LADDER_CENTER_Y)));
    if (rim[0].distanceToSquared(rim[rim.length - 1]) < 1e-12) rim.pop();
    if (inner[0].distanceToSquared(inner[inner.length - 1]) < 1e-12)
      inner.pop();
    // Keep the rear lining within the ladder bay. Extending this contour
    // through the shared wall creates a folded panel inside the cabin doorway.
    const n = inner.length,
      frontZ = -0.985;
    // The right-hand cove meets the rear jamb at z=-0.975, just behind
    // the opening's shifted rear edge. A full-depth return would end inside
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
      const roundedFace = trimCabinSideWall(
        THREE,
        geometry,
        cabinLining.sideProfile,
        sign * DECK_HALF_PITCH,
      );
      geometry.dispose();
      mesh(
        roundedFace,
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
        !ladderPlane && Math.abs(z - PASSAGE_LADDER_Z) <= openingHalf
          ? [
              DECK_HALF_PITCH + PASSAGE_CENTER_Y,
              -DECK_HALF_PITCH + PASSAGE_CENTER_Y,
            ].findIndex((center) => Math.abs(y - center) <= openingHalf)
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
      side > 0 ? 2.5 : PRESSURE_THROAT_START + 1.1 + PRESSURE_WALL,
      side > 0 ? LADDER_HEIGHT + 0.12 : 2.1,
      side > 0 ? 0.38 : 0,
    );
    offsetPath(
      outline,
      side > 0 ? 0 : (1.1 + PRESSURE_WALL - PRESSURE_THROAT_START) / 2,
      LADDER_CENTER_Y,
    );
    if (side > 0) {
      for (const yy of [-DECK_HALF_PITCH, DECK_HALF_PITCH]) {
        const opening = passageCircle(-PASSAGE_LADDER_Z, yy + PASSAGE_CENTER_Y);
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
    // The pressure face owns the reveal forward of this shared throat.
    // The former wall reached Z=1.25, overlapping its dark reveal at grazing
    // angles. Trim the actual side-wall triangles so the two owners only meet.
    let fittedSkin = clipGeometryPlane(
      THREE,
      skin,
      2,
      PRESSURE_THROAT_START,
      -1,
    );
    skin.dispose();
    if (side > 0) {
      const rearTrim = clipGeometryPlane(
        THREE,
        fittedSkin,
        2,
        -0.985 - PRESSURE_WALL,
      );
      fittedSkin.dispose();
      fittedSkin = rearTrim;
    }
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
  const ladderEquipmentContour = walkwayOutline(
    new THREE.Shape(),
    1.33,
    LADDER_HEIGHT,
    LADDER_SHOULDER_RUN,
    LADDER_SHOULDER_RISE,
    LADDER_RIGHT_RADIUS,
    0.69,
  )
    .getPoints(64)
    .map((point: any) => point.add(new THREE.Vector2(0, LADDER_CENTER_Y)));
  buildDockingShoulderEquipment(
    THREE,
    { box, mesh },
    walkwayFurniture,
    ladderEquipmentContour,
    LADDER_CENTER_Y,
  );
  buildLadderEndcapEquipment(
    THREE,
    { mesh },
    walkwayFurniture,
    ladderEquipmentContour,
    LADDER_CENTER_Y,
    m,
  );
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
  for (const yy of [
    DECK_HALF_PITCH + PASSAGE_CENTER_Y,
    -DECK_HALF_PITCH + PASSAGE_CENTER_Y,
  ]) {
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
  // Projects category monitors share a single library application. The previous individual-project
  // lockers and their pick surfaces disappear with the replaced furnishings.
  const workshop = new THREE.Group();
  workshop.name = 'projects-workshop';
  workshop.position.set(legacyCenters.projects + 0.18, previousFloorTop, 0);
  workshop.userData.batchRoot = true;
  rooms.projects.add(workshop);
  const computerDesktopMaterial = createComputerDesktopMaterial(THREE);
  const projectWorkshop = buildProjectsWorkshop(
    THREE,
    { box, mesh, cylinder, torus, rod, instances },
    workshop,
    {
      accent: m.amber,
      desktopMaterial: computerDesktopMaterial,
    },
  );
  group.userData.projectScreens = projectWorkshop.screens;
  for (const screen of projectWorkshop.screens)
    screen.setAvailable(projectCategoryCount(projectData, screen.category) > 0);
  const projectScreensById = new Map(
    projectWorkshop.screens.map((screen) => [screen.interactableId, screen]),
  );
  group.userData.projectWorkshop = workshop;
  readerSurfaces.projects = projectWorkshop.screens[0].anchor;
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
    {
      accent: m.amber,
    },
  );

  // CONTACT — fixed flight console, with a live monitor and physical keyboard.
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
      accent: m.amber,
      socials: options.socials,
      desktopMaterial: computerDesktopMaterial,
      rearWallProfile: interiorPoints.map((point: any) => ({
        y: point.y,
        z: -point.x,
      })),
    },
  );

  group.userData.socialScreens = contactConsole.userData.socialScreens;
  const contactComputer = contactConsole.userData.contactComputer;
  group.userData.contactComputer = contactComputer;
  contactComputer.anchor.userData = {
    width: contactComputer.width,
    height: contactComputer.height,
    section: 'contact',
    kind: 'computer',
  };
  readerSurfaces.contact = contactComputer.anchor;
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
  // These additions are mounted to the pressure shell rather than the legacy
  // furniture transform. Neither layout changes nor furniture scale detach them.
  const cabinUtilities = (
    ['projects', 'experience', 'about', 'contact'] as const
  ).map((section) => {
    const root = new THREE.Group();
    root.name = `${section}-cabin-utilities`;
    root.userData = { section, excludePick: true };
    group.add(root);
    const fittings = buildCabinUtilityFittings(
      THREE,
      { box, mesh, cylinder, instances },
      root,
      section,
      interiorPoints.map((point: any) => ({ y: point.y, z: -point.x })),
      cabinLining.radius,
    );
    return { section, root, fittings };
  });
  const ladderWebFittings = new THREE.Group();
  ladderWebFittings.name = 'ladder-wall-isolation-cassette';
  ladderWebFittings.userData = {
    section: 'walkway',
    batchRoot: true,
    excludePick: true,
  };
  ladderWebFittings.rotation.y = -Math.PI / 2;
  group.add(ladderWebFittings);
  buildLadderWebFittings(THREE, { box, cylinder }, ladderWebFittings);
  const objectHighlights = group.userData.socialScreens
    .filter((screen: any) => screen.link)
    .map((screen: any) => {
      screen.interactableId = `contact-social-${screen.side}`;
      return createObjectHighlight(THREE, screen.root, screen.interactableId, {
        width: screen.glassWidth,
        height: screen.glassHeight,
        radius: 0.035,
        z: screen.anchor.position.z,
      });
    });
  objectHighlights.push(
    createObjectHighlight(THREE, contactComputer.root, 'contact-computer', {
      width: contactComputer.width,
      height: contactComputer.height,
      radius: 0.035,
      z: contactComputer.anchor.position.z,
    }),
  );

  for (const screen of projectWorkshop.screens)
    objectHighlights.push(
      createObjectHighlight(THREE, screen.root, screen.interactableId, {
        width: screen.width,
        height: screen.height,
        radius: 0.026,
        z: 0.118,
      }),
    );

  const { docking, service, solarWings, dishAssembly } =
    buildDockingAndServiceAssemblies(
      THREE,
      primitives,
      group,
      unitBox,
      boltGeometry,
    );

  // Deployable reading stations. HTML attaches to the anchor in readerSurfaces:
  // Final centers are [roomCenter.x, roomCenter.y, 1.72], width 2.4, height 2.7.
  // All moving parts receive light but do not cast into the static shadow map.
  for (const [section, x] of Object.entries({
    experience: 0,
    about: 3,
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
    if (section === 'about') {
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
      kind: section === 'about' ? 'journal' : 'instrument',
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
  // Computer and social controls use native screen-face anchors. Room and
  // portal navigation retain their separate geometry-based pick targets.

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
          Math.abs(entry.y - (roomCenters[from][1] + PASSAGE_CENTER_Y)) < 0.001,
      )!;
      coupling.group.add(iris.group);
      iris.group.rotation.y = Math.PI / 2;
      roomMaterials[from].push(...iris.materials);
      hatch = { iris, doorMotion: { value: 0, velocity: 0 }, portals: [] };
      physicalHatches.set(physicalId, hatch);
    }
    // Wall-mounted enamel signs retain their wayfinding scale. A shallow
    // carrier seats directly against the wall so mounting parallax does not
    // make the sign appear displaced toward the curved rear edge.
    const caption = new THREE.Group();
    caption.name = id + '-above-door-wall-nameplate';
    caption.userData = { section: from, batchRoot: true, excludePick: true };
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
      0.014,
      m.gasket,
      0,
      0,
      -0.025,
      caption,
      0.006,
      'above-door-label-backing',
    );
    box(
      enamelWidth,
      wayfinding.enamelHeight,
      0.015,
      m.chalk,
      0,
      0,
      -0.0105,
      caption,
      0.011,
      'above-door-label-enamel',
    );
    for (const side of [-1, 1]) {
      // Narrow captive amber keepers and flush screws sit beyond the symbols.
      box(
        0.012,
        0.066,
        0.005,
        m.amber,
        side * 0.713,
        0,
        -0.0005,
        caption,
        0.002,
        'above-door-label-retainer',
      );
      for (const y of [-0.083, 0.083]) {
        const screw = cylinder(
          0.008,
          0.003,
          m.metal,
          side * 0.713,
          y,
          -0.001,
          caption,
          'z',
          undefined,
          12,
        );
        screw.name = 'above-door-label-captive-screw';
        screw.castShadow = false;
        box(
          0.009,
          0.0018,
          0.001,
          m.gasket,
          side * 0.713,
          y,
          0.001,
          caption,
          0,
          'above-door-label-screw-slot',
        );
      }
    }
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
      backingFront: -0.018,
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
        child === readerTrays[section]?.group ||
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
    const windowFinishes = finishWindowReveals(
      THREE,
      faceGeometry,
      [
        ...outline.roomHoles.map((path: any, index: number) => ({
          section: ['about', 'projects', 'contact', 'experience'][index],
          path,
        })),
        { section: 'walkway', path: outline.ladderHole },
      ],
      {
        // The signal band is a finish within the existing reveal depth. It
        // follows the actual curved opening, including its recessed bevel.
        bandStartZ: PRESSURE_FACE_FRONT - 0.036,
        bandEndZ: PRESSURE_FACE_FRONT - 0.014,
      },
    );
    mesh(
      windowFinishes.shell,
      m.shell,
      frame,
      'one-piece-five-aperture-pressure-face',
    );
    mesh(
      windowFinishes.dark,
      m.windowReveal,
      frame,
      'flush-window-reveal-finish',
    );
    for (const { section, geometry } of windowFinishes.bands) {
      const signal = new THREE.Group();
      signal.name = `${section}-flush-window-signal`;
      signal.userData = {
        section,
        exterior: true,
        excludePick: true,
        batchRoot: true,
      };
      frame.add(signal);
      mesh(geometry, m.windowSignal, signal, 'flush-window-inset-amber-band');
    }
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
    buildExteriorServiceEquipment(THREE, { mesh }, frame, m, {
      datums: bowOutline.datums,
      profiles: closures.profiles,
      bowContour: outerBow,
      variant,
    });
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
      const roundedFace = trimCabinSideWall(
        THREE,
        geometry,
        cabinLining.sideProfile,
        sign * DECK_HALF_PITCH,
      );
      geometry.dispose();
      const roomFace = new THREE.Group();
      roomFace.userData = {
        section,
        roomSurface: true,
        surfaceOnly: true,
        batchRoot: true,
      };
      frame.add(roomFace);
      const face = mesh(
        roundedFace,
        m.wall,
        roomFace,
        section + '-sealed-outboard-wall-interior',
      );
      if (section === 'contact') face.material.userData.contactRoomWall = true;
    }
    const bowVertices: number[] = [],
      bowIndices: number[] = [];
    const bowDepths = closures.profiles.depthFractions.map(
      (fraction: number) =>
        PRESSURE_THROAT_START +
        (closures.metadata.ladderRearZ - PRESSURE_THROAT_START) * fraction,
    );
    for (const z of bowDepths)
      for (const point of outerBow) {
        const p = closures.profiles.bowPointAtZ(point, z);
        bowVertices.push(p.x, p.y, z);
      }
    for (let i = 0; i < outerBow.length; i++) {
      const j = (i + 1) % outerBow.length;
      // Keep the flat docking wall open and stop exactly at the common crown.
      if (
        Math.max(outerBow[i].y, outerBow[j].y) <
          LADDER_CENTER_Y + LADDER_HALF_STRAIGHT &&
        Math.min(outerBow[i].y, outerBow[j].y) >
          LADDER_CENTER_Y - LADDER_HALF_STRAIGHT
      )
        continue;
      if (Math.min(outerBow[i].x, outerBow[j].x) >= closures.replaceBowAfterX)
        continue;
      for (let depth = 0; depth + 1 < bowDepths.length; depth++) {
        const a = depth * outerBow.length + i,
          b = depth * outerBow.length + j;
        const c = a + outerBow.length,
          d = b + outerBow.length;
        bowIndices.push(c, d, b, c, b, a);
      }
    }
    const bowGeometry = new THREE.BufferGeometry();
    bowGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(bowVertices, 3),
    );
    bowGeometry.setIndex(bowIndices);
    bowGeometry.computeVertexNormals();
    mesh(bowGeometry, m.shell, frame, 'thin-continuous-bow-outer-skin');
    // Finish the docking-side rear corner with the same quarter-round as
    // the outboard wall. Its old exterior rectangle is cut at this tangent,
    // so this strip replaces the sharp edge instead of covering another sheet.
    const dockReturnPositions: number[] = [],
      dockReturnNormals: number[] = [],
      dockReturnIndices: number[] = [];
    const dockReturnDepths = bowDepths.filter((z: number) => z <= -1.1 + 1e-9);
    for (let i = 0; i < dockReturnDepths.length; i++) {
      const z = dockReturnDepths[i];
      const u = Math.max(0, Math.min(1, (-1.1 - z) / PRESSURE_WALL));
      const cosine = Math.sqrt(1 - u * u);
      const x = layout.dockingOuterWall + PRESSURE_WALL * (1 - cosine);
      for (const side of [-1, 1]) {
        dockReturnPositions.push(
          x,
          LADDER_CENTER_Y + side * LADDER_HALF_STRAIGHT,
          z,
        );
        dockReturnNormals.push(-cosine, 0, -u);
      }
      if (i + 1 < dockReturnDepths.length) {
        const a = 2 * i;
        dockReturnIndices.push(a, a + 1, a + 3, a, a + 3, a + 2);
      }
    }
    const dockReturnGeometry = new THREE.BufferGeometry();
    dockReturnGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(dockReturnPositions, 3),
    );
    dockReturnGeometry.setAttribute(
      'normal',
      new THREE.Float32BufferAttribute(dockReturnNormals, 3),
    );
    dockReturnGeometry.setIndex(dockReturnIndices);
    mesh(
      dockReturnGeometry,
      m.shell,
      frame,
      'docking-wall-rounded-rear-return',
    );
    const rearShape = new THREE.Shape(closures.profiles.rearBow);
    // The blind service pockets terminate ahead of this continuous rear
    // pressure skin; their existing inset backs remain unchanged.

    const rearGeometry = new THREE.ShapeGeometry(rearShape, 48);
    const rearNormal = rearGeometry.getAttribute('normal');
    for (let i = 0; i < rearNormal.count; i++) rearNormal.setXYZ(i, 0, 0, -1);
    const rearIndex = rearGeometry.index;
    for (let i = 0; i < rearIndex.count; i += 3) {
      const temp = rearIndex.getX(i + 1);
      rearIndex.setX(i + 1, rearIndex.getX(i + 2));
      rearIndex.setX(i + 2, temp);
    }
    rearGeometry.translate(0, 0, closures.metadata.ladderRearZ);
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
  // Sibling hardware retains its exact geometry/material/instance matrices;
  // compatible static submissions can share a draw without changing a part.
  const instanceBatching =
    options.coalesceInstances === false
      ? null
      : coalesceStaticInstances(THREE, group);
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
    'A two-by-two toybox spacecraft with a four-module project workshop, four flight-recorder category cartridges and a raked archive terminal, a retained personal study and a dedicated communications room; a docking nose and right-hand service wings complete the pressure hull';
  group.userData.detailStats = {
    staticSourceParts: sourceParts,
    drawCalls: targets.length,
    instancedDrawCalls: targets.filter((t) => t.object.isInstancedMesh).length,
    coalescedInstanceDraws: instanceBatching?.drawsRemoved ?? 0,
  };
  group.updateMatrixWorld(true);
  const paintedHover = new THREE.Color(palette.chalk);
  let contactWallHover = 0;
  let contactWallFocus = 0;
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
    const previousLayout = group.userData.layout;
    currentLayout = layout === 'compact' ? 'compact' : 'wide';
    for (const [name, variant] of Object.entries(chassisVariants))
      variant.visible = name === currentLayout;
    group.userData.chassis = chassisMetadata[currentLayout];
    layoutScale = currentLayout === 'wide' ? 1.4 : 1;
    const layoutWalls = wallLayout(layoutScale);
    const { halfPitch } = layoutWalls;
    const propScale = currentLayout === 'wide' ? 1 : 0.84;
    for (const { section, root, fittings } of cabinUtilities) {
      const left = section === 'projects' || section === 'about';
      root.position.set(
        (left ? -1 : 1) * halfPitch,
        roomCenters[section][1] + cabinFloorTop,
        0,
      );
      fittings.setLayout(currentLayout);
    }
    ladderWebFittings.position.set(
      layoutWalls.ladderRightWall,
      (layoutWalls.upperPassageY + layoutWalls.lowerPassageY) / 2,
      PASSAGE_LADDER_Z,
    );
    // Preserve the study's rear mounting plane when its furniture scales down.
    personalStudy.position.z = -1.1 * (1 / propScale - 1);
    const studyRightEdge = 1.2287;
    const lockerCenter =
      (CABIN_HALF_WIDTH * layoutScale + studyRightEdge * propScale) / 2;
    personalStudy.userData.setLockerX(lockerCenter / propScale);
    contactConsole.userData.setPropScale(propScale);
    for (const { section, root } of outboardEquipment) {
      // Each complete wall rack is centered in its own floor-to-ceiling area.
      // The rails/feet footprint spans local Y=-.84..+.86.
      const equipmentCenterY =
        (CABIN_CEILING - CABIN_FLOOR) / 2 - 0.01 * propScale;
      root.position.set(
        halfPitch + CABIN_HALF_WIDTH * layoutScale,
        roomCenters[section][1] + cabinFloorTop + equipmentCenterY,
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
        // Cancel the furniture's legacy origin in the same scale as its meshes.
        // A separate compact offset shifted the whole assembly off the room grid.
        (left ? -1 : 1) * 0.18 * propScale;
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
        // Midpoints of the actual front opening, rather than floating points
        // inside the cabin. Anchor to the inset signal band in both orientations.
        top: [x, y + cabinCeiling, PRESSURE_FACE_FRONT - 0.025],
        bottom: [x, y + cabinFloorTop, PRESSURE_FACE_FRONT - 0.025],
        left: [
          x - CABIN_HALF_WIDTH * layoutScale,
          y + (cabinFloorTop + cabinCeiling) / 2,
          PRESSURE_FACE_FRONT - 0.025,
        ],
        right: [
          x + CABIN_HALF_WIDTH * layoutScale,
          y + (cabinFloorTop + cabinCeiling) / 2,
          PRESSURE_FACE_FRONT - 0.025,
        ],
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
      entry.group.position.set(
        (near + far) / 2,
        entry.y,
        entry.walkway ? PASSAGE_LADDER_Z : PASSAGE_CABIN_Z,
      );
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
      const passageZ = portal.metadata.via ? PASSAGE_LADDER_Z : PASSAGE_CABIN_Z;
      portal.visual.position.set(origin, 0, 0);
      portal.caption.rotation.set(0, sign > 0 ? -Math.PI / 2 : Math.PI / 2, 0);
      portal.caption.position.set(
        sign * (CABIN_HALF_WIDTH * layoutScale - PORTAL_SIGN_STANDOFF),
        PORTAL_SIGN_CENTER_Y,
        passageZ,
      );
      portal.pick.position.set(
        origin + sign * (1.5 * layoutScale - 0.04),
        PASSAGE_CENTER_Y,
        passageZ,
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
      // Keep the directed pick object and navigation metadata stable. Targets
      // lie on the visible wall/sign faces: thick volumes project beyond the
      // circular guide onto solid wall when viewed at an oblique angle.
      const captionLocal = vesselPosition(portal.caption).applyMatrix4(
        vesselMatrix(portal.pick.parent).invert(),
      );
      captionLocal.sub(portal.pick.position);
      const sign = portal.edge === 'right' ? 1 : -1;
      const main = new THREE.CircleGeometry(
        PASSAGE_RADIUS + PASSAGE_GUIDE_WIDTH,
        64,
      ).toNonIndexed();
      main.rotateY((-sign * Math.PI) / 2);
      main.translate(captionLocal.x + sign * PORTAL_SIGN_STANDOFF, 0, 0);
      const plate = new THREE.PlaneGeometry(
        ...portal.metadata.plateSize,
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
    if (previousLayout !== currentLayout) geometryChanged();
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
      if (
        slot.group.visible !== !!slot.project ||
        slot.cartridge.visible !== !!slot.project ||
        slot.spare.visible !== !slot.project ||
        slot.group.position.z !== slot.baseZ ||
        slot.group.rotation.y !== 0
      )
        geometryChanged();
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
    for (const screen of projectWorkshop.screens)
      screen.setAvailable(
        projectCategoryCount(projectData, screen.category) > 0,
      );
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
    deferWorldMatrices = false,
  ) {
    group.userData.geometryChanged = false;
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
        const previousProgress = slot.progress;
        const previousHover = slot.hover;
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
        if (previousProgress !== slot.progress || previousHover !== slot.hover)
          geometryChanged();
        if (slot.progress !== goal || slot.hover !== hoverGoal)
          motionActive = true;
      }
    for (const [section, tray] of Object.entries(readerTrays)) {
      const previousProgress = tray.progress;
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
      if (previousProgress !== p) geometryChanged();
      if (p !== goal) motionActive = true;
    }
    const projectApplicationActive =
      currentState.reading && currentState.activeRoom === 'projects';
    for (const screen of projectWorkshop.screens) {
      const selected =
        screen.available &&
        projectApplicationActive &&
        screen.category === (currentState.projectScreen || 'all');
      if (screen.idleDisplay.visible === !!selected) geometryChanged();
      screen.setActive(!!selected);
      if (selected) readerSurfaces.projects = screen.anchor;
    }
    const computerActive =
      currentState.reading && currentState.activeRoom === 'contact';
    if (contactComputer.idleDisplay.visible === !!computerActive)
      geometryChanged();
    contactComputer.setActive(!!computerActive);
    if (!computerActive) contactComputer.keyboard.clear();
    if (contactComputer.keyboard.update(dt, instantHighlight)) {
      geometryChanged();
      motionActive = true;
    }
    group.userData.motionActive = motionActive;
    const wallFocusGoal = computerActive || projectApplicationActive ? 1 : 0;
    contactWallFocus += (wallFocusGoal - contactWallFocus) * blend;
    if (Math.abs(contactWallFocus - wallFocusGoal) < 0.002)
      contactWallFocus = wallFocusGoal;
    if (contactWallFocus !== wallFocusGoal) group.userData.motionActive = true;
    const wallHoverGoal =
      (computerActive || projectApplicationActive) &&
      !currentState.travelling &&
      currentState.hoveredObject === `${currentState.activeRoom}-room-dismiss`
        ? 1
        : 0;
    contactWallHover += (wallHoverGoal - contactWallHover) * blend;
    if (Math.abs(contactWallHover - wallHoverGoal) < 0.002)
      contactWallHover = wallHoverGoal;
    if (contactWallHover !== wallHoverGoal) group.userData.motionActive = true;
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
        if (
          (material.userData.contactRoomWall &&
            currentState.activeRoom === 'contact') ||
          material.userData.applicationRoomWall === currentState.activeRoom
        )
          material.color
            .multiplyScalar(
              1 - 0.24 * contactWallFocus * (1 - contactWallHover),
            )
            .lerp(paintedHover, contactWallHover * 0.6)
            .multiplyScalar(1 + contactWallHover * 0.07);
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
          !currentState.travelling &&
            ((currentState.activeRoom === 'contact' &&
              highlight.id.startsWith('contact-') &&
              (!currentState.reading ||
                highlight.id.startsWith('contact-social-'))) ||
              (currentState.activeRoom === 'projects' &&
                highlight.id.startsWith('projects-screen-') &&
                projectScreensById.get(highlight.id)?.available &&
                (!currentState.reading ||
                  highlight.id !==
                    `projects-screen-${currentState.projectScreen || 'all'}`))),
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
    const travelHover =
      currentState.travelling &&
      requestedPortal &&
      canUseDoorDuringTravel(
        requestedPortal.metadata,
        currentState.activeRoom || '',
        currentState.transitWalkway,
        currentState.routeLadderPortalIds,
      )
        ? requestedPortal
        : null;
    const route = currentState.travelling
      ? travelHover
        ? [travelHover.from, travelHover.to]
        : []
      : routeTo(currentState.activeRoom || '', destination);
    group.userData.activeRoute = route;
    const hoveredHatch =
      !currentState.reading &&
      (!currentState.travelling || travelHover) &&
      route.length > 1
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
        // Seal a crossed ladder entrance at the opening rate so its interlocked
        // exit can open during the center-to-landing approach. Ordinary cabin
        // doors and idle hover retain their established closing motion.
        const fast =
          doorGoal ||
          (currentState.travelling &&
            hatch.portals.some((p: any) => p.metadata.via === 'walkway'));
        moveCameraAxis(doorMotion, doorGoal, dt, {
          frequency: fast ? 24 : 12,
          speed: fast ? 5.6 : 2.8,
          acceleration: fast ? 56 : 14,
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
      if (iris.group.userData.openProgress !== openingProgress)
        geometryChanged();
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
    // The browser render loop adds reader scaling before its one scene sync.
    // Standalone model consumers retain the immediate world-matrix contract.
    if (!deferWorldMatrices) group.updateMatrixWorld(true);
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
