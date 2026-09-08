#!/usr/bin/env node
/**
 * Portable, read-only numeric spacecraft audit. Requires Node >=22.18 and the
 * repository's installed `three` dependency; no DOM, GPU, server, or browser.
 *
 * From the repository: node scripts/spacecraft-model-audit.mjs
 * From anywhere: node /path/to/audit.mjs --root /path/to/repo --output /tmp/audit.json
 * With no --output, the JSON report is written only to stdout. This script never
 * changes the model or project data. Browser label appearance/picking and GPU
 * draw calls remain the responsibility of the browser verification suite.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

function parseArgs(args) {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (key === '--help' || key === '-h') {
      console.log(
        'Usage: node spacecraft-model-audit.mjs [--root REPO] [--output FILE]',
      );
      process.exit(0);
    }
    assert(['--root', '--output'].includes(key), `Unknown argument ${key}`);
    assert(
      args[i + 1] && !args[i + 1].startsWith('--'),
      `${key} needs a value`,
    );
    options[key.slice(2)] = args[++i];
  }
  return options;
}
function findRoot(start) {
  let candidate = resolve(start);
  for (;;) {
    if (existsSync(join(candidate, 'components/spacecraft-model.ts')))
      return candidate;
    const parent = dirname(candidate);
    if (parent === candidate) return null;
    candidate = parent;
  }
}
const options = parseArgs(process.argv.slice(2));
const root = options.root
  ? resolve(options.root)
  : findRoot(process.cwd()) ||
    findRoot(dirname(fileURLToPath(import.meta.url)));
assert(root, 'Cannot find components/spacecraft-model.ts; pass --root REPO');
const modelPath = join(root, 'components/spacecraft-model.ts');
assert(existsSync(modelPath), `Missing model: ${modelPath}`);
const sourceHash = () =>
  createHash('sha256').update(readFileSync(modelPath)).digest('hex');
const auditedHash = sourceHash();
const requireFromRoot = createRequire(
  pathToFileURL(join(root, 'package.json')),
);
const THREE = await import(
  pathToFileURL(requireFromRoot.resolve('three')).href
);
const { createSpacecraft } = await import(pathToFileURL(modelPath).href);

const counts = [0, 1, 8, 9, 10, 18, 19];
const PAGE_SIZE = 9;
const centers = {
  projects: [-1.65, 1.7],
  experience: [1.65, 1.7],
  about: [-1.65, -1.7],
  contact: [1.65, -1.7],
};
const kinds = {
  projects: 'clipboard',
  experience: 'instrument',
  about: 'journal',
  contact: 'instrument',
};
const report = {
  status: 'passed',
  node: process.version,
  threeRevision: THREE.REVISION,
  model: 'components/spacecraft-model.ts',
  modelSha256: auditedHash,
  mappingCases: [],
  mutationCases: [],
  readers: {},
  limits: [
    'Headless: CanvasTexture label pixels and CSS3D layout are not inspected.',
    'Mesh counts exclude GPU shadow passes and browser-only canvas label meshes.',
    'Enclosure rays check representative cabin boundaries, not manifold topology.',
  ],
};
const approx = (a, b, message) =>
  assert(Math.abs(a - b) < 1e-5, `${message}: ${a} != ${b}`);
const sameVector = (actual, expected, message) => {
  assert.equal(actual.length, expected.length, message);
  actual.forEach((v, i) => approx(v, expected[i], `${message}[${i}]`));
};
const fixtures = (count, prefix = 'audit') =>
  Array.from({ length: count }, (_, i) => ({
    title: `${prefix} project ${i + 1}`,
    slug: `${prefix}-${i + 1}`,
    category: i % 3 === 0 ? null : `Category ${i % 3}`,
    sample: i % 2 === 0,
  }));
const reset = (model) =>
  model.update(0, '', true, {
    activeRoom: 'home',
    selectedProject: null,
    hoveredProject: null,
    reading: false,
  });
const proxies = (model) =>
  model.interactionTargets
    .filter((t) => Number.isInteger(t.object.userData.projectSlot))
    .sort(
      (a, b) => a.object.userData.projectSlot - b.object.userData.projectSlot,
    );
const visibleMeshCount = (model) => {
  let count = 0;
  model.group.traverseVisible((o) => {
    if (
      o.isMesh &&
      (Array.isArray(o.material)
        ? o.material.some((m) => m.visible !== false)
        : o.material.visible !== false)
    )
      count++;
  });
  return count;
};
function dispose(model) {
  const geometries = new Set(),
    materials = new Set(),
    textures = new Set();
  model.group.traverse((o) => {
    if (o.geometry) geometries.add(o.geometry);
    if (o.material)
      for (const material of Array.isArray(o.material)
        ? o.material
        : [o.material]) {
        materials.add(material);
        for (const value of Object.values(material))
          if (value?.isTexture) textures.add(value);
      }
  });
  for (const texture of textures) texture.dispose();
  for (const material of materials) material.dispose();
  for (const geometry of geometries) geometry.dispose();
}
function assertMapping(
  model,
  data,
  page,
  result,
  context,
  pageSize = PAGE_SIZE,
) {
  const pageCount = Math.max(1, Math.ceil(data.length / pageSize));
  assert.equal(result.page, page, `${context}: page`);
  assert.equal(result.pageCount, pageCount, `${context}: pageCount`);
  assert.equal(
    model.group.userData.projectPage,
    page,
    `${context}: page metadata`,
  );
  assert.equal(
    model.group.userData.projectPageCount,
    pageCount,
    `${context}: pageCount metadata`,
  );
  assert.equal(
    model.group.userData.projectPageSize,
    pageSize,
    `${context}: pageSize metadata`,
  );
  assert.equal(
    model.group.userData.projectCapacity,
    9,
    `${context}: capacity metadata`,
  );
  const expected = Array.from({ length: 9 }, (_, slot) =>
    slot < pageSize ? data[page * pageSize + slot] || null : null,
  );
  assert.deepEqual(
    result.slots,
    expected,
    `${context}: returned titles/slugs/category/sample`,
  );
  const doors = proxies(model);
  assert.equal(doors.length, 9, `${context}: exactly nine proxy slots`);
  assert.equal(
    new Set(doors.map((t) => t.object.userData.projectSlot)).size,
    9,
    `${context}: unique proxy slots`,
  );
  for (let slot = 0; slot < 9; slot++) {
    const expectedSlug = expected[slot]?.slug || null;
    const doorTargets = model.targets.filter(
      (t) => t.object.userData.projectSlot === slot,
    );
    assert(
      doorTargets.length > 0,
      `${context}: slot ${slot} has precise targets`,
    );
    const hotspot = model.group.userData.hotspots.filter(
      (h) => h.section === 'projects' && h.slot === slot,
    );
    assert.equal(hotspot.length, 1, `${context}: unique slot ${slot} hotspot`);
    for (const target of [doors[slot], ...doorTargets]) {
      const info = target.object.userData;
      assert.equal(target.section, 'projects', `${context}: target section`);
      assert.equal(info.section, 'projects', `${context}: mesh section`);
      assert.equal(info.projectSlot, slot, `${context}: physical slot`);
      assert.equal(
        info.projectIndex,
        page * pageSize + slot,
        `${context}: data index`,
      );
      assert.equal(
        info.projectSlug || null,
        expectedSlug,
        `${context}: target slug ${slot}`,
      );
      if (!expectedSlug)
        assert(
          !Object.hasOwn(info, 'projectSlug'),
          `${context}: empty target retains stale slug`,
        );
    }
    assert.equal(
      hotspot[0].projectSlug || null,
      expectedSlug,
      `${context}: hotspot slug ${slot}`,
    );
    if (!expectedSlug)
      assert(
        !Object.hasOwn(hotspot[0], 'projectSlug'),
        `${context}: empty hotspot retains stale slug`,
      );
    // Paging must physically reset a previously open/extended assembly immediately.
    approx(
      doors[slot].object.parent.rotation.y,
      0,
      `${context}: reset door ${slot} rotation`,
    );
    approx(
      doors[slot].object.parent.position.z,
      -0.362,
      `${context}: reset door ${slot} extension`,
    );
  }
  return expected.map((project) => project?.slug || null);
}
function assertInteraction(model, slug, slot, context) {
  reset(model);
  model.update(0, 'projects', true, {
    activeRoom: 'home',
    hoveredProject: slug,
  });
  const doors = proxies(model);
  for (let i = 0; i < doors.length; i++) {
    const door = doors[i].object.parent;
    assert.equal(
      door.userData.hoverProgress,
      i === slot ? 1 : 0,
      `${context}: isolated hover ${i}`,
    );
    approx(
      door.position.z,
      -0.362 + (i === slot ? 0.075 : 0),
      `${context}: extension ${i}`,
    );
    assert.equal(
      door.userData.openProgress,
      0,
      `${context}: hover must not open door ${i}`,
    );
  }
  model.update(0, 'projects', true, {
    activeRoom: 'projects',
    selectedProject: slug,
    hoveredProject: null,
    reading: true,
  });
  for (let i = 0; i < doors.length; i++) {
    const door = doors[i].object.parent;
    assert.equal(
      door.userData.openProgress,
      i === slot ? 1 : 0,
      `${context}: isolated opening ${i}`,
    );
    approx(
      door.rotation.y,
      i === slot ? -1.32 : 0,
      `${context}: hinge angle ${i}`,
    );
  }
  reset(model);
}

for (const count of counts) {
  const data = fixtures(count);
  const model = createSpacecraft(THREE, {
    projects: data,
    projectPageSize: PAGE_SIZE,
    sampleLabel: 'Audit sample',
    screenLabels: true,
  });
  const pages = [];
  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE));
  for (let page = 0; page < pageCount; page++) {
    const result = model.setProjectPage(page);
    pages.push(
      assertMapping(model, data, page, result, `count ${count}, page ${page}`),
    );
    const filled = Math.min(9, count - page * 9);
    for (const slot of new Set(filled > 0 ? [0, filled - 1] : []))
      assertInteraction(
        model,
        data[page * 9 + slot].slug,
        slot,
        `count ${count}, page ${page}, slot ${slot}`,
      );
  }
  for (let page = pageCount - 1; page >= 0; page--)
    assertMapping(
      model,
      data,
      page,
      model.setProjectPage(page),
      `count ${count}, reverse page ${page}`,
    );
  const clampCases = [
    [-2, 0],
    [999, pageCount - 1],
    [NaN, 0],
    [Infinity, 0],
    [0.9, 0],
  ];
  for (const [request, expected] of clampCases)
    assertMapping(
      model,
      data,
      expected,
      model.setProjectPage(request),
      `count ${count}, clamp ${request}`,
    );
  model.setProjectPage(0);
  assertInteraction(
    model,
    'missing-project',
    -1,
    `count ${count}, nonexistent project`,
  );
  report.mappingCases.push({
    count,
    pageCount,
    pages,
    checkedForwardAndReverse: true,
    clampCases: clampCases.length,
  });
  dispose(model);
}

const model = createSpacecraft(THREE, {
  projects: fixtures(19),
  projectPageSize: PAGE_SIZE,
});
const originalTargets = model.targets.map((t) => t.object);
const originalProxies = model.interactionTargets.map((t) => t.object);
const originalReaders = { ...model.readerSurfaces };
let mutationData = fixtures(19);
for (const [fromPage, nextData, label] of [
  [2, fixtures(10), 'shrink 19 to 10 while page 2 is active'],
  [1, fixtures(1), 'shrink 10 to 1 while page 1 is active'],
  [0, [], 'shrink 1 to 0'],
  [0, fixtures(19, 'fresh'), 'replace empty data with 19 new slugs'],
  [
    2,
    fixtures(19, 'fresh').reverse(),
    'reverse ordering while page 2 is active',
  ],
  [
    1,
    fixtures(19, 'fresh').slice(5).concat(fixtures(19, 'fresh').slice(0, 5)),
    'rotate ordering while page 1 is active',
  ],
  [
    0,
    fixtures(8, 'renamed').map((p) => ({
      ...p,
      title: `Revised ${p.title}`,
      sample: !p.sample,
    })),
    'replace all data and update visible titles',
  ],
]) {
  if (typeof label !== 'string')
    throw new TypeError('Audit scenario label must be text');
  model.setProjectPage(fromPage);
  const oldSlot = model.setProjectPage(fromPage).slots.find(Boolean);
  if (oldSlot)
    model.update(0, 'projects', true, {
      activeRoom: 'projects',
      selectedProject: oldSlot.slug,
      hoveredProject: oldSlot.slug,
    });
  const result = model.setProjects(nextData);
  const expectedPage = Math.min(
    fromPage,
    Math.max(0, Math.ceil(nextData.length / 9) - 1),
  );
  const slots = assertMapping(model, nextData, expectedPage, result, label);
  assert.deepEqual(
    model.targets.map((t) => t.object),
    originalTargets,
    `${label}: target identities changed`,
  );
  assert.deepEqual(
    model.interactionTargets.map((t) => t.object),
    originalProxies,
    `${label}: proxy identities changed`,
  );
  for (const section of Object.keys(centers))
    assert.equal(
      model.readerSurfaces[section],
      originalReaders[section],
      `${label}: reader was replaced`,
    );
  if (oldSlot && !nextData.some((p) => p.slug === oldSlot.slug)) {
    model.update(0, '', true, {
      activeRoom: 'projects',
      selectedProject: oldSlot.slug,
      hoveredProject: oldSlot.slug,
      reading: false,
    });
    assert(
      proxies(model).every(
        (t) =>
          t.object.parent.userData.openProgress === 0 &&
          t.object.parent.userData.hoverProgress === 0,
      ),
      `${label}: removed slug still activates a door`,
    );
  }
  reset(model);
  const allPages = [];
  for (let page = 0; page < result.pageCount; page++)
    allPages.push(
      assertMapping(
        model,
        nextData,
        page,
        model.setProjectPage(page),
        `${label}, subsequent page ${page}`,
      ),
    );
  report.mutationCases.push({
    label,
    fromCount: mutationData.length,
    toCount: nextData.length,
    retainedPage: expectedPage,
    slots,
    allPages,
  });
  mutationData = nextData;
}
// Selection follows a slug after reorder, rather than remaining attached to its old slot.
let reordered = fixtures(9, 'reorder');
model.setProjects(reordered);
model.setProjectPage(0);
assertInteraction(model, 'reorder-2', 1, 'before reorder');
reordered = [reordered[1], ...reordered.filter((p) => p.slug !== 'reorder-2')];
assertMapping(
  model,
  reordered,
  0,
  model.setProjects(reordered),
  'selected slug reorder',
);
assertInteraction(model, 'reorder-2', 0, 'after reorder');
report.reorderedSelection = { slug: 'reorder-2', previousSlot: 1, newSlot: 0 };

// Four independent portrait reader anchors and all public metadata agree.
assert.deepEqual(
  Object.keys(model.readerSurfaces).sort(),
  Object.keys(centers).sort(),
  'four reader sections',
);
for (const [section, [x, y]] of Object.entries(centers)) {
  reset(model);
  model.setReading(section, true, true);
  const surface = model.readerSurfaces[section];
  const position = surface.getWorldPosition(new THREE.Vector3()).toArray();
  sameVector(position, [x, y, 1.72], `${section} reader deployed position`);
  sameVector(
    model.group.userData.readerAnchors[section],
    position,
    `${section} reader metadata`,
  );
  sameVector(
    model.group.userData.roomAnchors[section],
    [x, y, 0.16],
    `${section} room anchor`,
  );
  assert.equal(surface.userData.width, 2.4, `${section} portrait width`);
  assert.equal(surface.userData.height, 2.7, `${section} portrait height`);
  assert.equal(
    surface.userData.kind,
    kinds[section],
    `${section} physical reader type`,
  );
  assert.equal(
    surface.parent.visible,
    true,
    `${section} active reader visible`,
  );
  for (const other of Object.keys(centers))
    if (other !== section)
      assert.equal(
        model.readerSurfaces[other].parent.visible,
        false,
        `${section}: inactive ${other} reader hidden`,
      );
  report.readers[section] = {
    position,
    size: [2.4, 2.7],
    kind: kinds[section],
    headlessVisibleMeshes: visibleMeshCount(model),
  };
  model.setReading(section, false, true);
  assert(
    Object.values(model.readerSurfaces).every(
      (reader) => !reader.parent.visible,
    ),
    `${section}: readers close`,
  );
}
reset(model);
// Legacy two- and three-argument calls remain safe and maintain finite transforms.
model.update(1, 'projects');
model.update(1, 'contact', true);
reset(model);

let vertices = 0,
  invalidNormals = 0,
  missingNormals = 0,
  nonfiniteCoordinates = 0,
  movingShadowCasters = 0,
  nonfiniteMatrices = 0;
const seenGeometry = new Set();
model.group.traverse((o) => {
  if (!o.matrixWorld.elements.every(Number.isFinite)) nonfiniteMatrices++;
  if (!o.isMesh) return;
  let ancestor = o,
    moving = false;
  while (ancestor) {
    if (ancestor.userData.animated) moving = true;
    ancestor = ancestor.parent;
  }
  if (moving && o.castShadow) movingShadowCasters++;
  if (
    o.isInstancedMesh &&
    !Array.from(o.instanceMatrix.array).every(Number.isFinite)
  )
    nonfiniteMatrices++;
  if (seenGeometry.has(o.geometry)) return;
  seenGeometry.add(o.geometry);
  const p = o.geometry.attributes.position,
    n = o.geometry.attributes.normal;
  if (!n || n.count !== p.count) missingNormals++;
  for (let i = 0; i < p.count; i++) {
    vertices++;
    if (![p.getX(i), p.getY(i), p.getZ(i)].every(Number.isFinite))
      nonfiniteCoordinates++;
    if (n) {
      const length = Math.hypot(n.getX(i), n.getY(i), n.getZ(i));
      if (!Number.isFinite(length) || Math.abs(length - 1) > 0.002)
        invalidNormals++;
    }
  }
});
assert.equal(
  invalidNormals +
    missingNormals +
    nonfiniteCoordinates +
    movingShadowCasters +
    nonfiniteMatrices,
  0,
  'geometry/transforms/moving shadows',
);
const hit = (section, origin, direction, far) =>
  new THREE.Raycaster(
    new THREE.Vector3(...origin),
    new THREE.Vector3(...direction),
    0.001,
    far,
  ).intersectObjects(
    model.targets.filter((t) => t.section === section).map((t) => t.object),
    false,
  )[0];
const containment = Object.fromEntries(
  Object.entries(centers).map(([section, [x, y]]) => {
    const checks = {
      roof: !!hit(section, [x, y, 0.1], [0, 1, 0], 1.65),
      floor: !!hit(section, [x, y, 0.1], [0, -1, 0], 1.65),
      back: !!hit(section, [x, y + 0.02, 0], [0, 0, -1], 1.5),
      outsideWall: !!hit(section, [x, y, 0], [x < 0 ? -1 : 1, 0, 0], 1.67),
    };
    assert(
      Object.values(checks).every(Boolean),
      `${section}: representative enclosure rays`,
    );
    return [section, checks];
  }),
);
const actualBounds = new THREE.Box3().setFromObject(model.group);
const bounds = model.group.userData.overviewBounds;
for (const key of ['min', 'max', 'center', 'size'])
  assert(
    bounds[key].every(Number.isFinite),
    `${key}: finite overview metadata`,
  );
sameVector(bounds.min, actualBounds.min.toArray(), 'overview minimum');
sameVector(bounds.max, actualBounds.max.toArray(), 'overview maximum');
assert(
  bounds.size.every((n) => n > 0),
  'positive overview dimensions',
);
const lights = {};
for (const [section] of Object.entries(centers)) {
  lights[section] = {};
  for (const [mode, active, activeRoom] of [
    ['idle', '', 'home'],
    ['hover', section, 'home'],
    ['active', section, section],
  ]) {
    model.update(1, active, true, {
      activeRoom,
      reading: false,
      selectedProject: null,
      hoveredProject: null,
    });
    const sectionLights = [];
    model.group.traverse((o) => {
      if (o.isPointLight && o.parent.userData.section === section)
        sectionLights.push(o.intensity);
    });
    assert.equal(sectionLights.length, 1, `${section} point light`);
    lights[section][mode] = sectionLights[0];
  }
  assert(
    lights[section].idle < lights[section].active &&
      lights[section].active < lights[section].hover,
    `${section}: light ordering`,
  );
}
reset(model);
report.geometry = {
  vertices,
  uniqueGeometries: seenGeometry.size,
  invalidNormals,
  missingNormals,
  nonfiniteCoordinates,
  nonfiniteMatrices,
  movingShadowCasters,
  containment,
};
report.lightLevels = lights;
report.overviewBounds = bounds;
report.headlessOverviewVisibleMeshes = visibleMeshCount(model);
report.interactionTargets = model.interactionTargets.length;
report.legacyUpdateCalls = 'passed';
assert.equal(
  sourceHash(),
  auditedHash,
  'Model changed while audit ran; rerun against a stable source',
);
dispose(model);
const json = JSON.stringify(report, null, 2) + '\n';
if (options.output) {
  const output = isAbsolute(options.output)
    ? options.output
    : resolve(options.output);
  assert.notEqual(output, modelPath, 'Output must not overwrite the model');
  writeFileSync(output, json);
  console.log(
    JSON.stringify(
      {
        status: report.status,
        modelSha256: auditedHash,
        counts,
        mutations: report.mutationCases.length,
        readers: Object.keys(report.readers),
        output,
      },
      null,
      2,
    ),
  );
} else process.stdout.write(json);
