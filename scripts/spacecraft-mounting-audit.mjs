#!/usr/bin/env node
/**
 * Read-only numeric audit of the current spacecraft model's mounts and plaques.
 * Node >=22.18, installed `three`, no server/browser/GPU required.
 *
 * node scripts/spacecraft-mounting-audit.mjs [REPO] [--output REPORT.json]
 * node /any/path/spacecraft-mounting-audit.mjs --root REPO --output /tmp/report.json
 *
 * Source meshes are retained by an instrumented THREE.Mesh before static
 * batching. Their original world matrices allow real geometry/ray measurements.
 * A small Canvas2D recorder checks DB text and material visibility, not rendered
 * font appearance. No project files are written unless an output is requested.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const args = process.argv.slice(2),
  options = {};
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--help' || arg === '-h') {
    console.log(
      'Usage: node spacecraft-mounting-audit.mjs [REPO | --root REPO] [--output FILE]',
    );
    process.exit(0);
  }
  if (arg === '--root' || arg === '--output') {
    assert(
      args[i + 1] && !args[i + 1].startsWith('--'),
      `${arg} requires a value`,
    );
    options[arg.slice(2)] = args[++i];
  } else {
    assert(!arg.startsWith('-') && !options.root, `Unknown argument ${arg}`);
    options.root = arg;
  }
}
function findRoot(start) {
  let at = resolve(start);
  for (;;) {
    if (existsSync(join(at, 'components/spacecraft-model.ts'))) return at;
    const parent = dirname(at);
    if (parent === at) return null;
    at = parent;
  }
}
const root = options.root
  ? resolve(options.root)
  : findRoot(process.cwd()) ||
    findRoot(dirname(fileURLToPath(import.meta.url)));
assert(
  root,
  'Cannot find components/spacecraft-model.ts; pass a repository path',
);
const modelPath = join(root, 'components/spacecraft-model.ts');
const sha = (path) =>
  createHash('sha256').update(readFileSync(path)).digest('hex');
const modelHash = sha(modelPath);
const requireFromRoot = createRequire(
  pathToFileURL(join(root, 'package.json')),
);
const THREE = await import(
  pathToFileURL(requireFromRoot.resolve('three')).href
);
const { createSpacecraft } = await import(pathToFileURL(modelPath).href);
const report = {
  status: 'pending',
  model: 'components/spacecraft-model.ts',
  modelSha256: modelHash,
  node: process.version,
  threeRevision: THREE.REVISION,
  checks: [],
  limitations: [
    'No GPU rendering or browser font rasterization is performed.',
    'Canvas font-fit checks use deterministic synthetic font metrics; visual legibility needs browser screenshots.',
    'Mount overlap checks use source-mesh world bounds. Foot exposure additionally uses actual triangle ray intersections.',
    'The two solar wings are checked in their modeled pose, not through a hypothetical deployment sweep.',
    'Evidence paths identify available screenshots; this script does not certify that their pixels match the audited source hash.',
  ],
};
function check(name, condition, detail = {}) {
  report.checks.push({ name, passed: !!condition, ...detail });
}
const near = (a, b) => Math.abs(a - b) < 1e-5;
function capture(options) {
  const meshes = [];
  class AuditMesh extends THREE.Mesh {
    constructor(...args) {
      super(...args);
      meshes.push(this);
    }
  }
  return {
    model: createSpacecraft({ ...THREE, Mesh: AuditMesh }, options),
    meshes,
  };
}
function bounds(object) {
  assert(object, 'Missing expected source mesh');
  object.geometry.computeBoundingBox();
  return object.geometry.boundingBox.clone().applyMatrix4(object.matrixWorld);
}
function xyz(box) {
  return { min: box.min.toArray(), max: box.max.toArray() };
}
function worldPoint(object) {
  return new THREE.Vector3().setFromMatrixPosition(object.matrixWorld);
}
function finiteVector(v) {
  return v.every(Number.isFinite);
}
const projects = Array.from({ length: 9 }, (_, i) => ({
  title: `Mount audit ${i + 1}`,
  slug: `mount-${i + 1}`,
}));
const scene = capture({ projects, projectPageSize: 9, screenLabels: false });
const { model, meshes } = scene;
const named = (name, section) =>
  meshes.find(
    (m) => m.name === name && (!section || m.userData.section === section),
  );
const roomNames = ['projects', 'experience', 'about', 'contact'];
const roomAnchors = model.group.userData.roomAnchors;

const sleeve = named('rounded-docking-pressure-sleeve');
const sleeveCenter = worldPoint(sleeve);
check(
  'docking sleeve lies on ship vertical center',
  Math.abs(sleeveCenter.y) < 0.1,
  { actual: sleeveCenter.toArray() },
);
const hatch = model.group.userData.dockingAnchors.hatch;
const oldHatchY = roomAnchors.projects[1] + sleeveCenter.y;
const entranceRay = (y) =>
  new THREE.Raycaster(
    new THREE.Vector3(hatch[0] - 0.4, y, 0),
    new THREE.Vector3(1, 0, 0),
    0,
    0.9,
  ).intersectObjects(
    model.targets.map((t) => t.object),
    false,
  );
check(
  'centered docking entrance exists',
  entranceRay(sleeveCenter.y).length > 0,
);
check(
  'old upper-left docking entrance removed',
  entranceRay(oldHatchY).length === 0,
  { previousCenterY: oldHatchY },
);

const saddle = named('central-docking-load-bearing-saddle');
const saddleBox = bounds(saddle);
const clamps = meshes.filter((m) => m.name === 'docking-saddle-load-clamp');
const cap = meshes.find(
  (m) =>
    m.geometry.parameters?.radiusTop === 0.948 &&
    m.geometry.parameters?.height === 0.22,
);
assert(cap, 'Missing rear docking cap');
assert.equal(clamps.length, 2, 'Expected upper and lower load clamps');
const mountParts = [
  { name: 'saddle', object: saddle },
  ...clamps.map((object, i) => ({ name: `load clamp ${i + 1}`, object })),
  { name: 'rear cap', object: cap },
];
report.docking = {
  sleeveCenter: sleeveCenter.toArray(),
  mountBounds: {},
  wallOverlaps: {},
};
for (const section of ['projects', 'about']) {
  const wall = bounds(named(section + '-sealed-outboard-wall'));
  const overlap = saddleBox.clone().intersect(wall);
  const overlapSize = overlap.getSize(new THREE.Vector3()).toArray();
  report.docking.wallOverlaps[section] = {
    wall: xyz(wall),
    overlap: overlapSize,
  };
  check(
    `${section}: saddle engages sealed wall thickness`,
    !overlap.isEmpty() && overlapSize.every((n) => n > 0.005),
    { overlap: overlapSize },
  );
  // The outward half of the wall can accept structural hardware; its inside
  // face must remain clear. All mount parts are on the vessel's left side.
  for (const part of mountParts) {
    const box = bounds(part.object);
    report.docking.mountBounds[part.name] = xyz(box);
    const crossSectionOverlaps =
      box.max.y > wall.min.y &&
      box.min.y < wall.max.y &&
      box.max.z > wall.min.z &&
      box.min.z < wall.max.z;
    const clearance = wall.max.x - box.max.x;
    check(
      `${section}: ${part.name} does not protrude into cabin`,
      !crossSectionOverlaps || clearance >= 0.005,
      { insideWallX: wall.max.x, partMaximumX: box.max.x, clearance },
    );
  }
}
const saddleCenter = worldPoint(saddle).toArray();
check(
  'docking mount metadata matches physical saddle',
  saddleCenter.every((v, i) =>
    near(v, model.group.userData.dockingAnchors.mount[i]),
  ),
  {
    physical: saddleCenter,
    metadata: model.group.userData.dockingAnchors.mount,
  },
);

const dish = bounds(named('double-skin-communications-dish'));
const panelBoxes = meshes
  .filter((m) => m.name === 'upright-solar-panel-chassis')
  .map(bounds);
check('paired solar wings retained', panelBoxes.length === 2);
const panelClearances = panelBoxes.map((box) =>
  box.max.y < 0 ? dish.min.y - box.max.y : box.min.y - dish.max.y,
);
check(
  'dish clears both modeled solar panels',
  panelBoxes.every((box) => !box.intersectsBox(dish)) &&
    panelClearances.every((n) => n > 0.05),
  { yClearances: panelClearances },
);
// These are the two cylindrical pivot meshes returned by the model helper.
const hinges = meshes.filter(
  (m) =>
    near(m.geometry.parameters?.radiusTop ?? -1, 0.143) &&
    near(m.geometry.parameters?.height ?? -1, 0.223),
);
check('two service-bus hinge barrels retained', hinges.length === 2);
check(
  'dish clears hinge barrel bounds',
  hinges.every((hinge) => !bounds(hinge).intersectsBox(dish)),
  { dish: xyz(dish), hinges: hinges.map((h) => xyz(bounds(h))) },
);
check(
  'dish offset from docking approach axis',
  dish.min.z > 0.8 && dish.min.x > 3.2,
  { dishMinimum: dish.min.toArray() },
);
const foot = named('communications-mast-service-foot'),
  footBox = bounds(foot),
  footCenter = worldPoint(foot);
const serviceHull = named('aft-service-pressure-hull');
const surfaceAt = (object) =>
  new THREE.Raycaster(
    new THREE.Vector3(footCenter.x, footCenter.y, 4),
    new THREE.Vector3(0, 0, -1),
    0,
    8,
  ).intersectObject(object, false)[0]?.point.z;
const footFrontZ = surfaceAt(foot),
  serviceFrontZ = surfaceAt(serviceHull);
const footExposure = footFrontZ - serviceFrontZ,
  footEmbed = serviceFrontZ - footBox.min.z;
check(
  'mast foot face is visible above service hull',
  Number.isFinite(footExposure) && footExposure >= 0.01,
  { footFrontZ, serviceFrontZ, exposure: footExposure },
);
check(
  'mast foot rear remains engaged with service hull',
  Number.isFinite(footEmbed) && footEmbed >= 0.005,
  { rearZ: footBox.min.z, serviceFrontZ, embed: footEmbed },
);
report.communications = {
  dishBounds: xyz(dish),
  minimumPanelClearance: Math.min(...panelClearances),
  footBounds: xyz(footBox),
  footExposure,
  footEmbed,
};

const firstDoor = named('project-compartment-door');
const sideCollar = bounds(
  named('reinforced-side-nameplate-collar', 'projects'),
);
const firstDoorBox = bounds(firstDoor);
check(
  'side collar clears first compartment column',
  firstDoorBox.min.x - sideCollar.max.x >= 0.01,
  { clearance: firstDoorBox.min.x - sideCollar.max.x },
);
const proxies = model.interactionTargets
  .filter((t) => Number.isInteger(t.object.userData.projectSlot))
  .sort(
    (a, b) => a.object.userData.projectSlot - b.object.userData.projectSlot,
  );
check('nine project interaction slots preserved', proxies.length === 9);
for (let slot = 0; slot < proxies.length; slot++) {
  const proxy = proxies[slot].object,
    position = proxy.getWorldPosition(new THREE.Vector3());
  const hotspot = model.group.userData.hotspots.find(
    (h) => h.section === 'projects' && h.slot === slot,
  );
  check(
    `slot ${slot}: hotspot and proxy mapping agree`,
    hotspot?.projectSlug === projects[slot].slug &&
      proxy.userData.projectSlug === projects[slot].slug &&
      near(position.x, hotspot.position[0]) &&
      near(position.y, hotspot.position[1]),
  );
}
report.readers = {};
for (const section of roomNames) {
  model.update(0, '', true, {
    activeRoom: section,
    reading: true,
    selectedProject: section === 'projects' ? projects[0].slug : null,
  });
  const reader = model.readerSurfaces[section],
    position = reader.getWorldPosition(new THREE.Vector3()).toArray();
  const expected = [roomAnchors[section][0], roomAnchors[section][1], 1.72];
  check(
    `${section}: reader remains centered`,
    position.every((v, i) => near(v, expected[i])) &&
      reader.userData.width === 2.4 &&
      reader.userData.height === 2.7,
    { position },
  );
  report.readers[section] = position;
  const aperture = model.group.userData.innerApertureBounds[section];
  check(
    `${section}: finite interior framing excludes lower nameplate`,
    finiteVector(aperture.min) &&
      finiteVector(aperture.max) &&
      aperture.size.every((n) => n > 0) &&
      aperture.min[1] >
        bounds(named('room-label-ceramic-insert', section)).max.y,
    { aperture },
  );
}
model.update(0, '', true, {
  activeRoom: 'home',
  reading: false,
  selectedProject: null,
});

// Canvas recorder deliberately does not pretend to rasterize a browser font.
const recordings = [];
const savedDocument = globalThis.document;
const hadDocument = Object.hasOwn(globalThis, 'document');
Reflect.set(globalThis, 'document', {
  createElement() {
    const canvas = { width: 0, height: 0 };
    const record = { canvas, text: [] };
    recordings.push(record);
    const context = new Proxy(
      {},
      {
        get(target, key) {
          if (key in target) return target[key];
          if (key === 'measureText')
            return (text) => {
              const size = Number(
                (target.font || '10px').match(/[\d.]+(?=px)/)?.[0] || 10,
              );
              return {
                width: text.length * size * 0.58,
                actualBoundingBoxAscent: size * 0.72,
                actualBoundingBoxDescent: size * 0.1,
              };
            };
          if (key === 'fillText')
            return (text, x, y) =>
              record.text.push({ text, x, y, font: target.font });
          if (key === 'createLinearGradient')
            return () => ({ addColorStop() {} });
          return () => {};
        },
      },
    );
    canvas.getContext = () => context;
    return canvas;
  },
});
const labels = {
  projects: 'Work Archive',
  experience: 'Professional Experience',
  about: 'About Mika',
  contact: 'Start A Conversation',
};
let labeled;
try {
  labeled = capture({ labels, projects, screenLabels: false });
} finally {
  if (hadDocument) globalThis.document = savedDocument;
  else delete globalThis.document;
}
const plaques = labeled.model.group.userData.labelPlaques;
check(
  'three physically attached plaques per cabin',
  plaques.length === 12 &&
    roomNames.every(
      (section) => plaques.filter((p) => p.section === section).length === 3,
    ),
);
report.labels = { suppliedCopy: labels, plaques: [], visibilityModes: [] };
const mountNames = {
  hull: 'room-label-ceramic-insert',
  side: 'side-label-ceramic-insert',
  header: 'upper-room-enamel-header',
};
for (const plaque of plaques) {
  const face = labeled.meshes.find(
    (m) => m.name === `${plaque.role}-plaque-ink-${plaque.section}`,
  );
  const backing = labeled.meshes.find(
    (m) =>
      m.name === mountNames[plaque.role] &&
      m.userData.section === plaque.section,
  );
  const faceBox = bounds(face),
    backingBox = bounds(backing),
    gap = faceBox.min.z - backingBox.max.z;
  const fitsBacking =
    faceBox.min.x >= backingBox.min.x &&
    faceBox.max.x <= backingBox.max.x &&
    faceBox.min.y >= backingBox.min.y &&
    faceBox.max.y <= backingBox.max.y;
  check(
    `${plaque.section}/${plaque.role}: ink stays attached to enamel face`,
    fitsBacking && gap >= 0.003 && gap <= 0.03,
    { gap },
  );
  const recorded = recordings.find((r) => r.canvas === face.material.map.image);
  check(
    `${plaque.section}/${plaque.role}: DB copy is actually painted`,
    plaque.text === labels[plaque.section] &&
      recorded?.text.some(
        (t) => t.text === labels[plaque.section].toUpperCase(),
      ),
  );
  check(
    `${plaque.section}/${plaque.role}: heavy font and fitted ink`,
    plaque.fontSize > 0 &&
      recorded?.text.some((t) => t.font.startsWith('800 ')) &&
      plaque.inkBounds[0] <= plaque.canvasSize[0] * 0.95 &&
      plaque.inkBounds[1] <= plaque.canvasSize[1] * 0.89,
  );
  check(
    `${plaque.section}/${plaque.role}: no opaque floating label background`,
    face.material.transparent && !face.material.depthWrite && !face.castShadow,
  );
  const baseline = new THREE.Vector3(1, 0, 0).transformDirection(
    face.matrixWorld,
  );
  if (plaque.role === 'side')
    baseline.applyAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);
  check(
    `${plaque.section}/${plaque.role}: upright baseline in intended pose`,
    baseline.x > 0.999 && Math.abs(baseline.y) < 1e-5,
  );
  report.labels.plaques.push({
    section: plaque.section,
    role: plaque.role,
    position: plaque.position,
    size: plaque.size,
    rotation: plaque.rotation,
    attachedGap: gap,
    recordedFontSize: plaque.fontSize,
  });
}
const transforms = new Map(
  labeled.meshes.map((m) => [m, m.matrixWorld.elements.slice()]),
);
for (const portrait of [false, true, false]) {
  labeled.model.setLabelOrientation(portrait);
  let visible = 0;
  for (const plaque of plaques) {
    const face = labeled.meshes.find(
      (m) => m.name === `${plaque.role}-plaque-ink-${plaque.section}`,
    );
    const expected =
      plaque.role === 'header' || plaque.role === (portrait ? 'side' : 'hull');
    check(
      `${portrait ? 'portrait' : 'upright'}: ${plaque.section}/${plaque.role} ink visibility`,
      face.material.visible === expected && plaque.visible === expected,
    );
    if (face.material.visible) visible++;
    check(
      `${portrait ? 'portrait' : 'upright'}: plaque remains physically fixed`,
      face.matrixWorld.elements.every((v, i) =>
        near(v, transforms.get(face)[i]),
      ),
    );
  }
  report.labels.visibilityModes.push({ portrait, visiblePlaques: visible });
  check('eight active plaque faces per pose', visible === 8);
}
labeled.model.update(0, '', true, { labelPortrait: true });
check(
  'update state exposes portrait-label mode',
  labeled.model.group.userData.labelPortrait === true,
);

// Real application transitions must suppress exterior ink in close-up rooms,
// regardless of the remembered portrait mode. The four interior headers remain.
const actualMeshes = [];
labeled.model.group.traverse((object) => {
  if (object.isMesh) actualMeshes.push(object);
});
function geometryHash(geometry) {
  const hash = createHash('sha256');
  for (const name of Object.keys(geometry.attributes).sort()) {
    const array = geometry.attributes[name].array;
    hash.update(name);
    hash.update(
      new Uint8Array(array.buffer, array.byteOffset, array.byteLength),
    );
  }
  if (geometry.index) {
    const array = geometry.index.array;
    hash.update(
      new Uint8Array(array.buffer, array.byteOffset, array.byteLength),
    );
  }
  return hash.digest('hex');
}
const originalGeometry = new Map(
  actualMeshes.map((object) => [
    object.geometry,
    geometryHash(object.geometry),
  ]),
);
const originalTargets = labeled.model.targets.map((t) => t.object);
const originalReaderObjects = { ...labeled.model.readerSurfaces };
const originalRoomAnchors = JSON.stringify(
  labeled.model.group.userData.roomAnchors,
);
const originalHotspots = JSON.stringify(labeled.model.group.userData.hotspots);
const originalCollars = labeled.meshes.filter((object) =>
  /nameplate-collar|label-backing|label-ceramic-insert/.test(object.name),
);
const collarMatrices = new Map(
  originalCollars.map((object) => [
    object,
    object.matrixWorld.elements.slice(),
  ]),
);
report.labels.roomTransitions = [];
function assertLabelStage(name, activeRoom, portrait, reading) {
  let visible = 0;
  const visibleRoles = { header: 0, hull: 0, side: 0 };
  for (const plaque of plaques) {
    const face = labeled.meshes.find(
      (m) => m.name === `${plaque.role}-plaque-ink-${plaque.section}`,
    );
    const expected =
      plaque.role === 'header' ||
      (activeRoom === 'home' && plaque.role === (portrait ? 'side' : 'hull'));
    check(
      `${name}: ${plaque.section}/${plaque.role} visibility`,
      face.material.visible === expected && plaque.visible === expected,
    );
    if (face.material.visible) {
      visible++;
      visibleRoles[plaque.role]++;
    }
  }
  check(
    `${name}: expected total visible ink faces`,
    visible === (activeRoom === 'home' ? 8 : 4),
    { visibleRoles },
  );
  for (const section of roomNames) {
    const reader = labeled.model.readerSurfaces[section];
    const expectedVisible = reading && section === activeRoom;
    check(
      `${name}: ${section} reader visibility unaffected`,
      reader.parent.visible === expectedVisible,
    );
    if (expectedVisible) {
      const position = reader.getWorldPosition(new THREE.Vector3()).toArray();
      const expectedPosition = [
        roomAnchors[section][0],
        roomAnchors[section][1],
        1.72,
      ];
      check(
        `${name}: deployed reader anchor unaffected`,
        position.every((v, i) => near(v, expectedPosition[i])) &&
          reader.userData.width === 2.4 &&
          reader.userData.height === 2.7,
        { position },
      );
    }
  }
  report.labels.roomTransitions.push({
    name,
    activeRoom,
    portrait,
    reading,
    visibleInkFaces: visible,
    visibleRoles,
  });
}
labeled.model.update(1, '', true, {
  activeRoom: 'home',
  labelPortrait: true,
  reading: false,
  selectedProject: null,
});
assertLabelStage('home portrait', 'home', true, false);
for (const section of roomNames) {
  // Change room and orientation in the same call: this catches applying the
  // label rule before activeRoom has been committed to current state.
  labeled.model.update(2, section, true, {
    activeRoom: section,
    labelPortrait: false,
    reading: false,
    selectedProject: null,
  });
  assertLabelStage(`${section} close view`, section, false, false);
  labeled.model.update(3, section, true, {
    activeRoom: section,
    labelPortrait: true,
    reading: true,
    selectedProject: section === 'projects' ? projects[0].slug : null,
  });
  assertLabelStage(`${section} reading`, section, true, true);
  // A direct orientation change must neither show exterior ink nor move or
  // close the active physical reader.
  labeled.model.setLabelOrientation(false);
  assertLabelStage(
    `${section} orientation while reading`,
    section,
    false,
    true,
  );
  labeled.model.update(4, '', true, {
    activeRoom: 'home',
    labelPortrait: true,
    reading: false,
    selectedProject: null,
  });
  assertLabelStage(`return home from ${section}`, 'home', true, false);
}
labeled.model.update(5, '', true, {
  activeRoom: 'home',
  labelPortrait: false,
  reading: false,
  selectedProject: null,
});
assertLabelStage('home upright', 'home', false, false);
check(
  'label transitions preserve all geometry buffers',
  [...originalGeometry].every(
    ([geometry, hash]) => geometryHash(geometry) === hash,
  ),
  { uniqueGeometries: originalGeometry.size },
);
check(
  'label transitions preserve precise target identities',
  labeled.model.targets.length === originalTargets.length &&
    labeled.model.targets.every((t, i) => t.object === originalTargets[i]),
);
check(
  'label transitions preserve physical reader identities',
  roomNames.every(
    (section) =>
      labeled.model.readerSurfaces[section] === originalReaderObjects[section],
  ),
);
check(
  'label transitions preserve physical collars and backing transforms',
  originalCollars.every((object) =>
    object.matrixWorld.elements.every((v, i) =>
      near(v, collarMatrices.get(object)[i]),
    ),
  ),
);
check(
  'label transitions preserve room and hotspot metadata',
  JSON.stringify(labeled.model.group.userData.roomAnchors) ===
    originalRoomAnchors &&
    JSON.stringify(labeled.model.group.userData.hotspots) === originalHotspots,
);

// Trace the whole useful ink width, not just its center: the About curtain
// and berth sit off-center and previously covered the left part of its header.
report.headerVisibility = {};
function visibleTarget(object) {
  if (
    object.material.name === 'identification-label' ||
    object.material.visible === false
  )
    return false;
  for (let parent = object; parent; parent = parent.parent)
    if (!parent.visible) return false;
  return true;
}
const opaqueTargets = model.targets.map((t) => t.object).filter(visibleTarget);
for (const section of roomNames) {
  const header = model.group.userData.labelPlaques.find(
    (p) => p.section === section && p.role === 'header',
  );
  const anchor = header.position;
  const expected = model.group.userData.headerAnchors[section];
  check(
    `${section}: header anchor follows printed face`,
    anchor.every((v, i) => near(v, expected[i])),
  );
  const headerSaddle = bounds(named('upper-header-wall-saddle', section));
  const headerBody = bounds(named('upper-room-enamel-header', section));
  const rearLiner = bounds(named('rounded-warm-cabin-liner', section));
  check(
    `${section}: header bar remains attached to rear liner`,
    headerSaddle.intersectsBox(rearLiner) &&
      headerSaddle.intersectsBox(headerBody),
    { saddle: xyz(headerSaddle) },
  );
  const views = {};
  for (const [view, direction] of [
    ['front', [0, 0, 1]],
    ['selectedRoom', [-0.025, 0.018, 1]],
  ]) {
    const towardCamera = new THREE.Vector3(...direction).normalize();
    const blocked = [];
    let samples = 0;
    for (const dx of [
      -1.05, -1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1, 1.05,
    ]) {
      for (const dy of [-0.045, 0, 0.045]) {
        const point = new THREE.Vector3(
          anchor[0] + dx,
          anchor[1] + dy,
          anchor[2],
        );
        const origin = point.clone().addScaledVector(towardCamera, 3);
        // Exclude the face and its own enamel behind it with a 4 mm endpoint gap.
        const hits = new THREE.Raycaster(
          origin,
          towardCamera.clone().negate(),
          0.001,
          2.996,
        ).intersectObjects(opaqueTargets, false);
        if (hits.length)
          blocked.push({
            dx,
            dy,
            blocker: hits[0].object.name,
            point: hits[0].point.toArray(),
            instanceId: hits[0].instanceId ?? null,
          });
        samples++;
      }
    }
    check(
      `${section}: entire header is visible from ${String(view)}`,
      blocked.length === 0,
      { samples, blocked },
    );
    views[view] = { samples, blocked };
  }
  report.headerVisibility[section] = views;
}

report.evidence = [
  'desktop-overview.png',
  'desktop-projects.png',
  'desktop-about.png',
  'desktop-about-before-header-fix.png',
  'desktop-atlas-reader.png',
  'mobile-390-overview.png',
  'mobile-390-projects.png',
].map((name) => {
  const path = `docs/evidence/physical-labels-revision/${name}`;
  const absolute = join(root, path);
  return {
    path,
    exists: existsSync(absolute),
    ...(existsSync(absolute) ? { sha256: sha(absolute) } : {}),
  };
});
report.references = model.group.userData.mountingReferences;
check('source stable throughout audit', sha(modelPath) === modelHash);
report.failedChecks = report.checks.filter((c) => !c.passed);
report.status = report.failedChecks.length ? 'failed' : 'passed';
report.summary = {
  checks: report.checks.length,
  failed: report.failedChecks.length,
  physicalPlaques: plaques.length,
  readers: Object.keys(report.readers).length,
};
const json = JSON.stringify(report, null, 2) + '\n';
if (options.output) {
  const output = resolve(options.output);
  assert.notEqual(output, modelPath, 'Output cannot overwrite model');
  writeFileSync(output, json);
  console.log(
    JSON.stringify(
      {
        status: report.status,
        ...report.summary,
        modelSha256: modelHash,
        failedChecks: report.failedChecks,
        output,
      },
      null,
      2,
    ),
  );
} else process.stdout.write(json);
process.exitCode = report.status === 'passed' ? 0 : 1;
