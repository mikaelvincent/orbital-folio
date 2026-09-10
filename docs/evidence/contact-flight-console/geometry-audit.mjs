/**
 * Read-only CPU audit of the actual procedural model, with its TypeScript import graph.
 * Usage: node /tmp/contact-flight-geometry-audit.mjs [repo] [report.json] [baseline-ref]
 * No browser emulation: canvas records commands; GPU appearance needs separate review.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const root = resolve(process.argv[2] || process.cwd());
const output = resolve(
  process.argv[3] || '/tmp/contact-flight-geometry-audit.json',
);
const baselineRef = process.argv[4] || 'e68fd31';
const req = createRequire(root + '/package.json');
const ts = req('typescript');
const THREE = await import(pathToFileURL(req.resolve('three')).href);
const temp = mkdtempSync(join(tmpdir(), 'contact-flight-audit-'));
const issues = [];
const hash = (value) => createHash('sha256').update(value).digest('hex');
const round = (n) => Math.round(n * 1e8) / 1e8;
const stable = (v) => {
  if (typeof v === 'number') return round(v);
  if (Array.isArray(v)) return v.map(stable);
  if (ArrayBuffer.isView(v)) return Array.from(v, round);
  if (v && typeof v === 'object')
    return Object.fromEntries(
      Object.keys(v)
        .sort()
        .filter(
          (k) =>
            !['uuid', 'id', 'version', '_listeners'].includes(k) &&
            typeof v[k] !== 'function',
        )
        .map((k) => [k, stable(v[k])]),
    );
  return v;
};
const digest = (v) => hash(JSON.stringify(stable(v)));
const baselineSource = (path) =>
  execFileSync('git', ['show', baselineRef + ':' + path], {
    cwd: root,
    encoding: 'utf8',
  });
const modelPath = 'components/spacecraft-model.ts';
function canvasStub() {
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    writable: true,
    value: {
      createElement() {
        const operations = [];
        const context = new Proxy(
          {},
          {
            get(target, key) {
              if (key in target) return target[key];
              if (key === 'measureText')
                return (text) => ({
                  width:
                    String(text).length *
                    Number(
                      (target.font || '10px').match(/[\d.]+(?=px)/)?.[0] || 10,
                    ) *
                    0.58,
                });
              if (
                key === 'createLinearGradient' ||
                key === 'createRadialGradient'
              )
                return (...args) => {
                  const g = {
                    gradient: operations.length,
                    addColorStop(...stops) {
                      operations.push(['addColorStop', this.gradient, stops]);
                    },
                  };
                  operations.push([key, args]);
                  return g;
                };
              if (key === 'createImageData' || key === 'getImageData')
                return (w, h) => ({
                  width: w,
                  height: h,
                  data: new Uint8ClampedArray(w * h * 4),
                });
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
          getContext: () => context,
        };
      },
    },
  });
}
const compiled = new Map();
function compile(file, baseline = false) {
  const key = `${baseline}:${file}`;
  if (compiled.has(key)) return compiled.get(key);
  const out = join(temp, `${compiled.size}.mjs`);
  compiled.set(key, out);
  const relative = file.slice(root.length + 1);
  const source = baseline
    ? baselineSource(relative)
    : readFileSync(file, 'utf8');
  let code = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
  }).outputText;
  code = code.replace(
    /(\bfrom\s*|\bimport\s*)['"]([^'"]+)['"]/g,
    (match, prefix, specifier) => {
      if (!specifier.startsWith('.'))
        return `${prefix}${JSON.stringify(pathToFileURL(req.resolve(specifier)).href)}`;
      let dependency = resolve(dirname(file), specifier);
      if (!extname(dependency)) dependency += '.ts';
      else if (
        /\.m?js$/.test(dependency) &&
        existsSync(dependency.replace(/\.m?js$/, '.ts'))
      )
        dependency = dependency.replace(/\.m?js$/, '.ts');
      return `${prefix}${JSON.stringify(pathToFileURL(compile(dependency, baseline)).href)}`;
    },
  );
  writeFileSync(out, code);
  return out;
}
function ancestry(object) {
  const chain = [];
  for (let node = object; node; node = node.auditParent || node.parent)
    chain.unshift(node);
  return chain;
}
function sourceWorld(object) {
  const matrix = new THREE.Matrix4();
  for (const node of ancestry(object)) {
    node.updateMatrix();
    matrix.multiply(node.matrix);
  }
  return matrix;
}
const geometryCache = new WeakMap();
function geometryDigest(g) {
  if (!geometryCache.has(g))
    geometryCache.set(
      g,
      digest({
        index: g.index?.array,
        attributes: Object.fromEntries(
          Object.entries(g.attributes).map(([k, a]) => [
            k,
            { itemSize: a.itemSize, normalized: a.normalized, array: a.array },
          ]),
        ),
        groups: g.groups,
      }),
    );
  return geometryCache.get(g);
}
function texture(t) {
  return {
    type: t.type,
    width: t.image?.width,
    height: t.image?.height,
    ops: t.image?.auditOperations,
    data: t.image?.data && hash(Buffer.from(t.image.data.buffer)),
    colorSpace: t.colorSpace,
    minFilter: t.minFilter,
    magFilter: t.magFilter,
    anisotropy: t.anisotropy,
    generateMipmaps: t.generateMipmaps,
    flipY: t.flipY,
    wrapS: t.wrapS,
    wrapT: t.wrapT,
    repeat: t.repeat.toArray(),
  };
}
function material(m) {
  return Object.fromEntries(
    Object.entries(m)
      .filter(
        ([k, v]) =>
          !['uuid', 'id', 'version', '_listeners'].includes(k) &&
          typeof v !== 'function',
      )
      .map(([k, v]) => [
        k,
        v?.isTexture ? texture(v) : v?.isColor ? v.toArray() : v,
      ]),
  );
}
async function build(baseline) {
  const sources = [];
  const tracker = (Base) =>
    class extends Base {
      constructor(...args) {
        super(...args);
        sources.push(this);
      }
      removeFromParent() {
        if (this.parent && !this.auditParent) this.auditParent = this.parent;
        return super.removeFromParent();
      }
    };
  canvasStub();
  const fixture = (n) =>
    Array.from({ length: n }, (_, i) => ({
      title: 'Audit entry ' + i,
      slug: 'audit-' + i,
      sample: true,
    }));
  const modelModule = await import(
    pathToFileURL(compile(resolve(root, modelPath), baseline)).href
  );
  const model = modelModule.createSpacecraft(
    {
      ...THREE,
      Mesh: tracker(THREE.Mesh),
      InstancedMesh: tracker(THREE.InstancedMesh),
      PointLight: tracker(THREE.PointLight),
    },
    {
      projects: fixture(9),
      caseStudies: fixture(3),
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
  const originals = sources.filter((o) => !o.userData.parts);
  const consoleRoot = baseline
    ? originals.find((o) => o.name === 'communications-console-housing')
        ?.auditParent
    : model.group.getObjectByName('contact-flight-console');
  if (!consoleRoot)
    issues.push(
      `${baseline ? 'Baseline' : 'Candidate'} Contact console root not found`,
    );
  const contactParts = originals.filter((o) =>
    ancestry(o).includes(consoleRoot),
  );
  function exempt(o) {
    const chain = ancestry(o);
    if (chain.includes(consoleRoot)) return true;
    const inContact = chain.some((n) => n.name === 'contact-assembly');
    return (
      inContact &&
      ([
        'upper-header-wall-saddle',
        'upper-room-enamel-header',
        'header-plaque-ink-contact',
      ].includes(o.name) ||
        chain.some((n) => n.name === 'header-label-mount-contact'))
    );
  }
  return {
    model,
    originals,
    consoleRoot,
    contactParts,
    protected: originals.filter((o) => !exempt(o)),
  };
}
function protectedSnapshot(bundle) {
  bundle.model.group.updateMatrixWorld(true);
  const entries = new Map(),
    duplicates = new Map();
  const materialCache = new Map();
  for (const o of bundle.protected) {
    const path = ancestry(o)
      .map((n) => n.name || n.type)
      .join('/');
    const ordinal = duplicates.get(path) || 0;
    duplicates.set(path, ordinal + 1);
    const key = `${path}#${ordinal}`;
    const mats = o.material
      ? [].concat(o.material).map((m) => {
          if (!materialCache.has(m)) materialCache.set(m, digest(material(m)));
          return materialCache.get(m);
        })
      : null;
    entries.set(
      key,
      digest({
        geometry: o.geometry && geometryDigest(o.geometry),
        matrix: sourceWorld(o).elements,
        material: mats,
        visible: ancestry(o).every((n) => n.visible),
        flags: {
          castShadow: o.castShadow,
          receiveShadow: o.receiveShadow,
          renderOrder: o.renderOrder,
          frustumCulled: o.frustumCulled,
          layers: o.layers.mask,
        },
        userData: o.userData,
        count: o.count,
        instanceMatrix: o.instanceMatrix?.array,
        light: o.isLight
          ? {
              color: o.color.toArray(),
              intensity: o.intensity,
              distance: o.distance,
              decay: o.decay,
            }
          : null,
      }),
    );
  }
  return entries;
}
function meshCosts(objects) {
  const mats = new Set(),
    geoms = new Set(),
    textures = new Set();
  let draws = 0,
    triangles = 0,
    bytes = 0;
  for (const o of objects) {
    if (!o.isMesh) continue;
    draws++;
    const g = o.geometry;
    triangles +=
      ((g.index ? g.index.count : g.attributes.position.count) / 3) *
      (o.isInstancedMesh ? o.count : 1);
    if (!geoms.has(g)) {
      geoms.add(g);
      for (const a of Object.values(g.attributes)) bytes += a.array.byteLength;
      bytes += g.index?.array.byteLength || 0;
    }
    for (const m of [].concat(o.material)) {
      mats.add(m);
      for (const v of Object.values(m)) if (v?.isTexture) textures.add(v);
    }
  }
  return {
    draws,
    triangles,
    geometryBytes: bytes,
    materials: mats.size,
    textures: [...textures].map((t) => ({
      width: t.image?.width,
      height: t.image?.height,
      anisotropy: t.anisotropy,
      mipmaps: t.generateMipmaps,
      minFilter: t.minFilter,
    })),
  };
}
function costs(bundle) {
  const rendered = [],
    renderedConsole = [];
  bundle.model.group.traverse((o) => {
    if (o.isMesh && !o.userData.isInteractionProxy) rendered.push(o);
  });
  bundle.consoleRoot?.traverse((o) => {
    if (o.isMesh && !o.userData.isInteractionProxy) renderedConsole.push(o);
  });
  const whole = meshCosts(rendered);
  delete whole.textures;
  const authored = meshCosts(bundle.contactParts);
  const retained =
    bundle.consoleRoot?.name === 'contact-flight-console'
      ? meshCosts(renderedConsole)
      : null;
  return {
    wholeVesselRender: whole,
    consoleAuthored: {
      ...authored,
      draws: undefined,
      sourceMeshes: authored.draws,
    },
    isolatedConsoleRender: retained,
    note: 'The old console was merged into shared room material batches; its final isolated draw count is unavailable. Whole-vessel counts are comparable actual render meshes, before frustum culling.',
  };
}
const report = {
  baselineRef,
  threeRevision: THREE.REVISION,
  scope:
    'Static Contact visual rebuild; exact preservation of non-console source meshes, navigation metadata and controlling modules.',
  limitations: [
    'CPU canvas records draw commands and uses deterministic font metrics. It does not verify actual GPU glyph appearance, antialiasing, z-fighting or visual quality.',
    'Attachment AABBs verify floor and cabin envelope, not every curved surface intersection; browser close-up review remains required.',
    'The former Contact physical header is an explicit visual exemption; anchor metadata and all other physical headers remain protected.',
  ],
  issues,
  protectedStates: [],
  metadata: [],
  sourceHashes: [],
  geometry: {},
  staticStates: [],
};
try {
  const before = await build(true),
    after = await build(false);
  report.costs = { before: costs(before), after: costs(after) };
  report.counts = {
    beforeProtected: before.protected.length,
    afterProtected: after.protected.length,
    beforeConsole: before.contactParts.length,
    afterConsole: after.contactParts.length,
  };
  const metadataKeys = [
    'roomAnchors',
    'roomBounds',
    'innerApertureBounds',
    'readerAnchors',
    'readerSize',
    'headerAnchors',
    'labelAnchors',
    'sideLabelAnchors',
    'calloutAnchors',
    'calloutEdges',
    'hotspots',
    'portals',
    'adjacency',
    'dockingAnchors',
    'overviewBounds',
  ];
  const states = [
    { name: 'overview', active: '', state: { activeRoom: 'home' } },
    { name: 'contact-selected', active: '', state: { activeRoom: 'contact' } },
    { name: 'contact-hover', active: 'contact', state: { activeRoom: 'home' } },
    {
      name: 'contact-transit',
      active: '',
      state: {
        activeRoom: 'contact',
        travelling: true,
        transitRoom: 'contact',
      },
    },
  ];
  for (const layout of ['wide', 'compact']) {
    before.model.setLayout(layout);
    after.model.setLayout(layout);
    let firstStatic;
    for (const test of states) {
      const state = {
        reading: false,
        travelling: false,
        transitRoom: null,
        transitWalkway: false,
        hoveredWalkway: false,
        hoveredPortal: null,
        selectedProject: null,
        selectedCaseStudy: null,
        ...test.state,
      };
      before.model.update(0, test.active, true, state);
      after.model.update(0, test.active, true, state);
      const a = protectedSnapshot(before),
        b = protectedSnapshot(after),
        diffs = [];
      for (const key of new Set([...a.keys(), ...b.keys()]))
        if (a.get(key) !== b.get(key)) diffs.push(key);
      report.protectedStates.push({
        layout,
        state: test.name,
        matched: a.size - diffs.length,
        differences: diffs.slice(0, 20),
      });
      if (diffs.length)
        issues.push(
          `Protected source difference: ${layout}/${test.name} (${diffs.length} parts)`,
        );
      const stat = digest(
        after.contactParts.map((o) => ({
          name: o.name,
          matrix: sourceWorld(o).elements,
          geometry: o.geometry && geometryDigest(o.geometry),
          instances: o.instanceMatrix?.array,
        })),
      );
      firstStatic ||= stat;
      report.staticStates.push({
        layout,
        state: test.name,
        digest: stat,
        matched: stat === firstStatic,
      });
      if (stat !== firstStatic)
        issues.push(`Static Contact geometry moved in ${layout}/${test.name}`);
    }
    for (const key of metadataKeys) {
      const matched =
        digest(before.model.group.userData[key]) ===
        digest(after.model.group.userData[key]);
      report.metadata.push({ layout, key, matched });
      if (!matched) issues.push(`Metadata changed: ${layout}/${key}`);
    }
  }
  after.model.setLayout('wide');
  after.model.update(0, '', true, {
    activeRoom: 'contact',
    reading: false,
    travelling: false,
  });
  const room = after.model.group.getObjectByName('contact-assembly');
  room.updateMatrixWorld(true);
  const roomInverse = room.matrixWorld.clone().invert();
  let vertices = 0,
    nonFinite = 0,
    nonUnitNormals = 0,
    invalidIndices = 0,
    newLights = 0,
    newAnimated = 0;
  const bounds = new THREE.Box3(),
    seen = new Set(),
    feet = [];
  for (const o of after.contactParts) {
    if (o.isLight) newLights++;
    if (ancestry(o).some((n) => n.userData.animated)) newAnimated++;
    if (!o.geometry) continue;
    const g = o.geometry;
    if (!seen.has(g)) {
      seen.add(g);
      vertices += g.attributes.position.count;
      for (const a of Object.values(g.attributes))
        for (const v of a.array) if (!Number.isFinite(v)) nonFinite++;
      if (g.index)
        for (const i of g.index.array)
          if (i < 0 || i >= g.attributes.position.count) invalidIndices++;
      const n = g.attributes.normal;
      if (n)
        for (let i = 0; i < n.count; i++) {
          const length = Math.hypot(n.getX(i), n.getY(i), n.getZ(i));
          if (Math.abs(length - 1) > 0.02) nonUnitNormals++;
        }
    }
    g.computeBoundingBox();
    const matrix = roomInverse.clone().multiply(sourceWorld(o));
    const ob = g.boundingBox.clone().applyMatrix4(matrix);
    if (o.isInstancedMesh) {
      const ib = new THREE.Box3(),
        im = new THREE.Matrix4();
      for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, im);
        ib.union(
          g.boundingBox.clone().applyMatrix4(matrix.clone().multiply(im)),
        );
      }
      bounds.union(ib);
    } else bounds.union(ob);
    if (/foot|floor-anchor|floor-shoe|floor-mount/.test(o.name))
      feet.push({
        name: o.name,
        min: ob.min.toArray().map(round),
        max: ob.max.toArray().map(round),
        floorOffset: round(ob.min.y + 1.32),
      });
  }
  report.geometry = {
    vertices,
    uniqueGeometries: seen.size,
    nonFinite,
    nonUnitNormals,
    invalidIndices,
    newLights,
    newAnimated,
    cabinLocalBounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
    floorDatum: -1.32,
    feet,
  };
  if (nonFinite || nonUnitNormals || invalidIndices || newLights || newAnimated)
    issues.push('Contact geometry/material static construction check failed');
  if (bounds.min.y < -1.345 || bounds.min.y > -1.29)
    issues.push(`Console is not grounded to floor: minimum y ${bounds.min.y}`);
  if (
    bounds.min.x < -1.73 ||
    bounds.max.x > 1.73 ||
    bounds.max.y > 1.43 ||
    bounds.max.z > 1.15 ||
    bounds.min.z < -1.08
  )
    issues.push('Console exceeds Contact cabin envelope');
  for (const path of [
    'components/spacecraft.tsx',
    'components/orbital-environment.ts',
    'components/overview-annotations.ts',
    'components/immersive-portfolio.tsx',
    'components/world-reader.tsx',
    'components/contact-form.tsx',
  ]) {
    const a = hash(baselineSource(path)),
      b = hash(readFileSync(join(root, path)));
    report.sourceHashes.push({
      path,
      baseline: a,
      candidate: b,
      matched: a === b,
    });
    if (a !== b) issues.push(`Protected controlling source changed: ${path}`);
  }
  // Match the existing renderer cleanup traversal, including cloned material maps.
  const reachableGeometries = new Set(),
    reachableMaterials = new Set(),
    reachableTextures = new Set();
  after.model.group.traverse((object) => {
    if (!object.isMesh && !object.isInstancedMesh) return;
    reachableGeometries.add(object.geometry);
    for (const m of [].concat(object.material)) {
      reachableMaterials.add(m);
      for (const value of Object.values(m))
        if (value?.isTexture) reachableTextures.add(value);
    }
  });
  const consoleTextures = new Set();
  after.consoleRoot.traverse((object) => {
    if (!object.isMesh) return;
    if (!reachableGeometries.has(object.geometry))
      issues.push('Console geometry unreachable by renderer cleanup');
    for (const m of [].concat(object.material)) {
      if (!reachableMaterials.has(m))
        issues.push('Console material unreachable by renderer cleanup');
      if (!m.isMeshStandardMaterial)
        issues.push(
          'Console material is incompatible with standard room dimming',
        );
      for (const key of [
        'roughness',
        'metalness',
        'emissiveIntensity',
        'opacity',
      ])
        if (!Number.isFinite(m[key]))
          issues.push('Nonfinite Contact material ' + key);
      for (const value of Object.values(m))
        if (value?.isTexture) {
          consoleTextures.add(value);
          if (!reachableTextures.has(value))
            issues.push('Console texture unreachable by renderer cleanup');
        }
    }
  });
  report.disposal = {
    renderedConsoleResourcesReachable: true,
    consoleTextures: consoleTextures.size,
    rendererCleanupSourceUnchanged: report.sourceHashes.find(
      (v) => v.path === 'components/spacecraft.tsx',
    )?.matched,
    policy:
      'Rendered resources are deduplicated and disposed by the unchanged scene traversal. Authored pre-batch CPU source geometries are outside this GPU resource check.',
  };
  const source = readFileSync(join(root, modelPath), 'utf8'),
    base = baselineSource(modelPath);
  const updateBlock = (s) =>
    s.slice(
      s.indexOf('  function update('),
      s.indexOf('  setProjectPage(0);', s.indexOf('  function update(')),
    );
  report.updateFunctionUnchanged = updateBlock(source) === updateBlock(base);
  if (!report.updateFunctionUnchanged)
    issues.push('Shared update/lighting/animation implementation changed');
  report.passed = !issues.length;
} catch (error) {
  issues.push(error.stack || String(error));
  report.passed = false;
} finally {
  delete globalThis.document;
  rmSync(temp, { recursive: true, force: true });
}
writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(
  JSON.stringify(
    {
      passed: report.passed,
      issues,
      counts: report.counts,
      costs: report.costs,
      geometry: report.geometry,
      output,
    },
    null,
    2,
  ),
);
if (!report.passed) process.exitCode = 1;
