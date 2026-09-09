/** Compare protected cabin assets. Args: [repo] [output] [exemptions.json] [baseline-ref]. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(process.argv[2] || process.cwd());
const output = resolve(process.argv[3] || '/tmp/chassis-preservation.json');
const exclusionsFile = resolve(
  process.argv[4] ||
    root + '/docs/evidence/unified-chassis/chassis-exclusions.json',
);
const req = createRequire(root + '/package.json');
const THREE = await import(pathToFileURL(req.resolve('three')).href);
const ts = req('typescript');
const hash = (value) => createHash('sha256').update(value).digest('hex');
const sourcePath = 'components/spacecraft-model.ts';
const baselineRef = process.argv[5] || 'bb326e6';
const baseline = execFileSync('git', ['show', baselineRef + ':' + sourcePath], {
  cwd: root,
  encoding: 'utf8',
});
const candidate = readFileSync(root + '/' + sourcePath, 'utf8');
const exemptionConfig = JSON.parse(readFileSync(exclusionsFile, 'utf8'));
const exclusions = Array.isArray(exemptionConfig)
  ? exemptionConfig
  : exemptionConfig.parts;
const metadataExclusions = Array.isArray(exemptionConfig)
  ? []
  : exemptionConfig.metadata || [];
assert(
  metadataExclusions.every((key) =>
    ['labelAnchors', 'sideLabelAnchors'].includes(key),
  ),
  'Only explicitly redesigned exterior label anchors may be exempted',
);
assert(Array.isArray(exclusions));
for (const e of exclusions)
  assert(e.name && e.reason, 'Every exact-name exemption needs a reason');
const exemptNames = new Set(exclusions.map((e) => e.name));
const roomNames = ['projects', 'experience', 'about', 'contact'];
const rounded = (value) => Math.round(value * 1e9) / 1e9;
const stable = (value) => {
  if (typeof value === 'number') return rounded(value);
  if (Array.isArray(value)) return value.map(stable);
  if (ArrayBuffer.isView(value)) return Array.from(value, rounded);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .filter((k) => !['uuid', 'id', 'version'].includes(k))
        .map((k) => [k, stable(value[k])]),
    );
  return value;
};
const digest = (value) => hash(JSON.stringify(stable(value)));
function installCanvas() {
  globalThis.document = {
    // oxlint-disable-next-line typescript/no-deprecated -- Scoped deterministic CPU canvas recording stub.
    createElement() {
      const operations = [];
      const ctx = new Proxy(
        {},
        {
          get(target, key) {
            if (key in target) return target[key];
            if (key === 'measureText')
              return (text) => ({
                width:
                  text.length *
                  Number(
                    (target.font || '10px').match(/[\d.]+(?=px)/)?.[0] || 10,
                  ) *
                  0.58,
              });
            if (key === 'createLinearGradient')
              return (...args) => {
                const gradient = { gradient: operations.length };
                operations.push([key, args]);
                gradient.addColorStop = (...stops) =>
                  operations.push(['addColorStop', gradient.gradient, stops]);
                return gradient;
              };
            return (...args) => operations.push([key, args]);
          },
          set(target, key, value) {
            target[key] = value;
            operations.push(['set', key, value]);
            return true;
          },
        },
      );
      return {
        width: 0,
        height: 0,
        auditOperations: operations,
        getContext: () => ctx,
      };
    },
  };
}
function geometry(g) {
  return digest({
    index: g.index && Array.from(g.index.array),
    groups: g.groups,
    drawRange: g.drawRange,
    attributes: Object.fromEntries(
      Object.entries(g.attributes).map(([key, attr]) => [
        key,
        {
          itemSize: attr.itemSize,
          normalized: attr.normalized,
          array: Array.from(attr.array),
        },
      ]),
    ),
  });
}
function texture(t) {
  return {
    type: t.constructor.name,
    width: t.image?.width,
    height: t.image?.height,
    operations: t.image?.auditOperations,
    data: t.image?.data && hash(Buffer.from(t.image.data.buffer)),
    colorSpace: t.colorSpace,
    wrapS: t.wrapS,
    wrapT: t.wrapT,
    minFilter: t.minFilter,
    magFilter: t.magFilter,
    anisotropy: t.anisotropy,
    generateMipmaps: t.generateMipmaps,
    offset: t.offset?.toArray(),
    repeat: t.repeat?.toArray(),
    flipY: t.flipY,
    rotation: t.rotation,
    center: t.center?.toArray(),
    matrix: t.matrix?.elements,
    channel: t.channel,
    mapping: t.mapping,
    typeCode: t.type,
    format: t.format,
    premultiplyAlpha: t.premultiplyAlpha,
  };
}
function material(m) {
  return {
    onBeforeCompile: m.onBeforeCompile?.toString(),
    customProgramCacheKey: m.customProgramCacheKey?.toString(),
    values: Object.fromEntries(
      Object.entries(m)
        .filter(
          ([key, value]) =>
            !['uuid', 'id', 'version', '_listeners'].includes(key) &&
            typeof value !== 'function' &&
            value !== undefined,
        )
        .map(([key, value]) => [
          key,
          value?.isTexture
            ? texture(value)
            : value?.isColor
              ? value.toArray()
              : value,
        ]),
    ),
  };
}
function ancestry(object) {
  const chain = [];
  for (let o = object; o; o = o.auditParent || o.parent) chain.unshift(o);
  return chain;
}
async function create(source) {
  const javascript = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
  }).outputText;
  const { createSpacecraft } = await import(
    'data:text/javascript;base64,' + Buffer.from(javascript).toString('base64')
  );
  const objects = [];
  const tracker = (Base) =>
    class extends Base {
      constructor(...args) {
        super(...args);
        objects.push(this);
      }
      removeFromParent() {
        if (this.parent && !this.auditParent) this.auditParent = this.parent;
        return super.removeFromParent();
      }
    };
  installCanvas();
  const records = (n) =>
    Array.from({ length: n }, (_, i) => ({
      title: 'Audit entry ' + i,
      slug: 'audit-' + i,
      sample: true,
    }));
  const model = createSpacecraft(
    {
      ...THREE,
      Mesh: tracker(THREE.Mesh),
      InstancedMesh: tracker(THREE.InstancedMesh),
      PointLight: tracker(THREE.PointLight),
    },
    {
      projects: records(9),
      caseStudies: records(3),
      labels: {
        projects: 'Projects',
        experience: 'Case studies',
        about: 'About',
        contact: 'Contact',
      },
      vesselName: 'portfolio.example',
      sampleLabel: 'Concept',
    },
  );
  delete globalThis.document;
  const assets = [],
    excluded = [];
  for (const object of objects) {
    if (object.userData.parts) continue; // Compare original source meshes, not changed batch packing.
    const chain = ancestry(object),
      room = chain.find((o) =>
        roomNames.some((name) => o.name === name + '-assembly'),
      );
    if (!room) continue;
    const exemption = exclusions.find(
      (e) =>
        e.name === object.name &&
        e.rooms.includes(room.name.replace('-assembly', '')),
    );
    if (exemption) {
      excluded.push(object.name);
      continue;
    }
    assets.push({ object, room, chain });
  }
  return { model, assets, excluded };
}
const before = await create(baseline),
  after = await create(candidate);
function snapshot(bundle) {
  bundle.model.group.updateMatrixWorld(true);
  const entries = new Map(),
    duplicates = new Map(),
    geometryCache = new Map();
  const vesselInverse = bundle.model.group.matrixWorld.clone().invert();
  for (const { object, room, chain } of bundle.assets) {
    object.updateMatrix();
    const path = chain
      .slice(chain.indexOf(room))
      .map((o) => o.name || o.type)
      .join('/');
    const index = duplicates.get(path) || 0;
    duplicates.set(path, index + 1);
    const key = path + '#' + index;
    const world = object.auditParent
      ? object.auditParent.matrixWorld.clone().multiply(object.matrix)
      : object.matrixWorld;
    const local = room.matrixWorld.clone().invert().multiply(world);
    if (object.geometry && !geometryCache.has(object.geometry))
      geometryCache.set(object.geometry, geometry(object.geometry));
    const data = {
      geometryHash: geometryCache.get(object.geometry) || null,
      roomTransform: vesselInverse.clone().multiply(room.matrixWorld).elements,
      flags: {
        castShadow: object.castShadow,
        receiveShadow: object.receiveShadow,
        renderOrder: object.renderOrder,
        layers: object.layers.mask,
        frustumCulled: object.frustumCulled,
      },
      transform: local.elements,
      visible: chain.every((o) => o.visible),
      material: object.material
        ? [].concat(object.material).map(material)
        : null,
      userData: object.userData,
      count: object.count,
      instanceMatrix:
        object.instanceMatrix && Array.from(object.instanceMatrix.array),
      instanceColor:
        object.instanceColor && Array.from(object.instanceColor.array),
      light: object.isLight
        ? {
            color: object.color.toArray(),
            intensity: object.intensity,
            distance: object.distance,
            decay: object.decay,
          }
        : null,
    };
    entries.set(key, { digest: digest(data), data });
  }
  return entries;
}
const states = [
  { name: 'overview', active: '', state: { activeRoom: 'home' } },
  ...roomNames.map((room) => ({
    name: 'hover-' + room,
    active: room,
    state: { activeRoom: 'home' },
  })),
  ...roomNames.map((room) => ({
    name: 'selected-' + room,
    active: '',
    state: { activeRoom: room },
  })),
  {
    name: 'model-open-project-rack',
    active: '',
    state: {
      activeRoom: 'projects',
      selectedProject: 'audit-0',
      hoveredProject: 'audit-1',
    },
  },
  {
    name: 'model-open-case-rack',
    active: '',
    state: {
      activeRoom: 'experience',
      selectedCaseStudy: 'audit-0',
      hoveredCaseStudy: 'audit-1',
    },
  },
  {
    name: 'passing-ladder',
    active: '',
    state: {
      activeRoom: 'about',
      travelling: true,
      transitWalkway: true,
      transitRoom: null,
    },
  },
];
const batchBlock = (source) =>
  source.slice(
    source.indexOf('  // Static scenery is batched per room.'),
    source.indexOf('  group.userData.roomAnchors = Object.fromEntries('),
  );
const report = {
  unchangedBatching: {
    baselineSha256: hash(batchBlock(baseline)),
    candidateSha256: hash(batchBlock(candidate)),
    matched: batchBlock(baseline) === batchBlock(candidate),
  },
  baselineRef,
  baselineSha256: hash(baseline),
  candidateSha256: hash(candidate),
  threeRevision: THREE.REVISION,
  scope:
    'Selectable cabin source geometry, room-local transforms, material values and texture drawing commands, lights, instance transforms, visibility, control metadata and room navigation anchors. Exact named authorized chassis parts are exempted.',
  limitations: [
    'CPU canvas commands and a deterministic width stub verify preserved texture generation, not GPU font rasterization.',
    'Changed chassis shadows are expected; source invariance does not prove every visual aperture is unobstructed. Current browser and raycast evidence is required separately.',
  ],
  exclusions,
  metadataExclusions,
  counts: { baseline: before.assets.length, candidate: after.assets.length },
  states: [],
  differences: [],
};
for (const layout of ['wide', 'compact']) {
  before.model.setLayout(layout);
  after.model.setLayout(layout);
  for (const test of states) {
    const state = {
      reading: false,
      travelling: false,
      transitRoom: null,
      transitWalkway: false,
      hoveredWalkway: false,
      labelPortrait: layout === 'compact',
      ...test.state,
    };
    before.model.update(0, test.active, true, state);
    after.model.update(0, test.active, true, state);
    const a = snapshot(before),
      b = snapshot(after),
      keys = new Set([...a.keys(), ...b.keys()]);
    let matched = 0;
    for (const key of keys) {
      if (a.get(key)?.digest === b.get(key)?.digest) matched++;
      else if (report.differences.length < 60)
        report.differences.push({
          layout,
          state: test.name,
          key,
          changed: !a.has(key)
            ? ['added']
            : !b.has(key)
              ? ['removed']
              : Object.keys(a.get(key).data).filter(
                  (k) =>
                    digest(a.get(key).data[k]) !== digest(b.get(key).data[k]),
                ),
        });
    }
    report.states.push({
      layout,
      state: test.name,
      protectedParts: keys.size,
      matched,
      baselineDigest: digest([...a].map(([k, v]) => [k, v.digest])),
      candidateDigest: digest([...b].map(([k, v]) => [k, v.digest])),
    });
  }
  for (const key of [
    'roomAnchors',
    'innerApertureBounds',
    'readerAnchors',
    'headerAnchors',
    'labelAnchors',
    'sideLabelAnchors',
    'hotspots',
    'portals',
  ]) {
    if (metadataExclusions.includes(key)) continue;
    if (
      digest(before.model.group.userData[key]) !==
      digest(after.model.group.userData[key])
    )
      report.differences.push({
        layout,
        key,
        changed: ['navigation metadata'],
      });
  }
}
report.protectedNames = [
  ...new Set(before.assets.map((a) => a.object.name)),
].sort((a, b) => a.localeCompare(b));
report.exemptedBaselineCounts = Object.fromEntries(
  [...exemptNames].map((name) => [
    name,
    before.excluded.filter((n) => n === name).length,
  ]),
);
for (const exemption of exclusions) {
  const actual = before.excluded.filter((n) => n === exemption.name).length;
  if (actual !== exemption.expectedCount)
    report.differences.push({
      name: exemption.name,
      expectedCount: exemption.expectedCount,
      actual,
    });
}
if (!report.unchangedBatching.matched)
  report.differences.push({
    changed: ['batching implementation requires independent validation'],
  });
report.passed = !report.differences.length;
writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(
  JSON.stringify(
    {
      passed: report.passed,
      counts: report.counts,
      states: report.states.length,
      differences: report.differences,
      output,
    },
    null,
    2,
  ),
);
assert(
  report.passed,
  'Protected cabin assets differ from the committed baseline',
);
