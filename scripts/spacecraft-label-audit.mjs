/** Args: [repo] [baseline-ref-or-model] [candidate-model] [output-json]. Baseline defaults to git ebff2d0; candidate defaults to the current repo model. */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
const root = resolve(process.argv[2] || process.cwd()),
  baselineArg = process.argv[3] || 'ebff2d0',
  baseline = existsSync(resolve(baselineArg))
    ? resolve(baselineArg)
    : 'git:' + baselineArg,
  candidate = resolve(
    process.argv[4] || join(root, 'components/spacecraft-model.ts'),
  ),
  output = resolve(process.argv[5] || '/tmp/spacecraft-label-audit.json');
const require = createRequire(pathToFileURL(join(root, 'package.json'))),
  THREE = await import(pathToFileURL(require.resolve('three')).href);
const changedNames = new Set([
  'reinforced-lower-nameplate-collar',
  'room-label-backing',
  'room-label-ceramic-insert',
  'reinforced-side-nameplate-collar',
  'side-label-backing',
  'side-label-ceramic-insert',
  'nameplate-amber-clasp',
  'side-nameplate-amber-clasp',
  'vessel-nameplate-integrated-hull-band',
  'vessel-nameplate-recessed-gasket',
  'vessel-nameplate-enamel',
  'symmetric-nameplate-end-clasp',
  'vessel-nameplate-ink',
  ...['projects', 'experience', 'about', 'contact'].flatMap((s) => [
    'hull-plaque-ink-' + s,
    'side-plaque-ink-' + s,
  ]),
]);
globalThis.document = {
  // oxlint-disable-next-line typescript/no-deprecated -- Deterministic CPU canvas stub.
  createElement() {
    const commands = [],
      values = {};
    const ctx = new Proxy(values, {
      set(t, k, v) {
        t[k] = v;
        commands.push(['set', k, typeof v === 'object' ? 'object' : v]);
        return true;
      },
      get(t, k) {
        if (k in t) return t[k];
        if (k === 'createLinearGradient')
          return (...args) => {
            commands.push([k, ...args]);
            return {
              addColorStop(...a) {
                commands.push(['addColorStop', ...a]);
              },
            };
          };
        if (k === 'measureText')
          return (text) => {
            commands.push([k, text]);
            const font = Number(
              (t.font || '10px').match(/[\d.]+(?=px)/)?.[0] || 10,
            );
            return {
              width: text.length * font * 0.58,
              actualBoundingBoxAscent: font * 0.73,
              actualBoundingBoxDescent: font * 0.08,
            };
          };
        return (...args) =>
          commands.push([
            k,
            ...args.map((v) => (typeof v === 'object' ? 'object' : v)),
          ]);
      },
    });
    return {
      width: 0,
      height: 0,
      commands,
      getContext() {
        return ctx;
      },
    };
  },
};
async function build(path, screenLabels = false) {
  const sources = [];
  class Mesh extends THREE.Mesh {
    constructor(...args) {
      super(...args);
      sources.push(this);
    }
    removeFromParent() {
      if (this.parent && !this.auditParent) this.auditParent = this.parent;
      return super.removeFromParent();
    }
  }
  class InstancedMesh extends THREE.InstancedMesh {
    constructor(...args) {
      super(...args);
      sources.push(this);
    }
  }
  let url = pathToFileURL(path).href;
  if (path.startsWith('git:')) {
    const source = execFileSync(
      'git',
      ['show', path.slice(4) + ':components/spacecraft-model.ts'],
      { cwd: root, encoding: 'utf8' },
    );
    const ts = require('typescript');
    const code = ts.transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
      },
    }).outputText;
    url = 'data:text/javascript;base64,' + Buffer.from(code).toString('base64');
  }
  const { createSpacecraft } = await import(url);
  const m = createSpacecraft(
    { ...THREE, Mesh, InstancedMesh },
    {
      labels: {
        projects: 'Projects',
        experience: 'Case studies',
        about: 'About',
        contact: 'Contact',
      },
      projects: Array.from({ length: 9 }, (_, i) => ({
        title: 'Project ' + i,
        slug: 'p-' + i,
      })),
      caseStudies: Array.from({ length: 3 }, (_, i) => ({
        title: 'Case ' + i,
        slug: 'c-' + i,
      })),
      vesselName: 'portfolio.example',
      screenLabels,
    },
  );
  return { m, sources };
}
const base = await build(baseline),
  next = await build(candidate);
const screenLabels = await build(candidate, true);
delete globalThis.document;
const matrix = (o) =>
    o.auditParent
      ? o.auditParent.matrixWorld.clone().multiply(o.matrix)
      : o.matrixWorld.clone(),
  near = (a, b) => Math.abs(a - b) < 1e-5;
function geometryHash(g) {
  const h = createHash('sha256');
  for (const name of Object.keys(g.attributes).sort()) {
    const a = g.attributes[name];
    h.update(name);
    h.update(
      new Uint8Array(a.array.buffer, a.array.byteOffset, a.array.byteLength),
    );
  }
  if (g.index)
    h.update(
      new Uint8Array(
        g.index.array.buffer,
        g.index.array.byteOffset,
        g.index.array.byteLength,
      ),
    );
  return h.digest('hex');
}
function isCabinSource(object) {
  for (let node = object; node; node = node.auditParent || node.parent)
    if (
      [
        'projects-assembly',
        'experience-assembly',
        'about-assembly',
        'contact-assembly',
      ].includes(node.name)
    )
      return true;
  return false;
}
// Matrix association changes in the vessel-local fix can differ at 1e-15.
function stableMetadata(value) {
  if (typeof value === 'number') return Math.round(value * 1e10) / 1e10;
  if (Array.isArray(value)) return value.map(stableMetadata);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, stableMetadata(entry)]),
    );
  return value;
}
function protectedSnapshot(a) {
  return a.sources
    .filter(
      (o) => !o.userData.parts && isCabinSource(o) && !changedNames.has(o.name),
    )
    .map((o) => ({
      name: o.name,
      section: o.userData.section,
      geometry: geometryHash(o.geometry),
      matrix: matrix(o).elements.map((x) => Number(x.toFixed(10))),
      instances: o.instanceMatrix ? Array.from(o.instanceMatrix.array) : null,
      material: {
        name: o.material.name,
        color: o.material.color.toArray(),
        emissive: o.material.emissive?.toArray(),
        exterior: o.material.userData.exterior,
        transparent: o.material.transparent,
        depthWrite: o.material.depthWrite,
        roughness: o.material.roughness,
        metalness: o.material.metalness,
      },
      canvas: o.material.map?.image?.commands,
      userData: { ...o.userData },
    }));
}
function sourcePath(o) {
  const parts = [];
  for (let n = o; n; n = n.auditParent || n.parent)
    parts.unshift(n.name || n.type);
  return parts.join('/');
}
const exemptions = [...changedNames].map((name) => ({
  name,
  reason:
    name.includes('vessel-nameplate') ||
    name === 'symmetric-nameplate-end-clasp'
      ? 'Remove physical portfolio branding assembly'
      : 'Replace full exterior room label assembly and orientation-dependent hardware',
  baselineCount: base.sources.filter(
    (o) => o.name === name && !o.userData.parts,
  ).length,
  candidateCount: next.sources.filter(
    (o) => o.name === name && !o.userData.parts,
  ).length,
  baselinePaths: base.sources
    .filter((o) => o.name === name && !o.userData.parts)
    .map(sourcePath),
}));
const report = {
  baseline,
  candidate,
  preservationExemptions: exemptions,
  labelMetadata: next.m.group.userData.labelOrientation,
  invariance: [],
  states: [],
  alignment: [],
  typography: [],
  mounts: [],
  brandingRemoved: false,
  changedNames: [...changedNames],
};
function assemblies(m) {
  const out = [];
  m.group.traverse((o) => {
    if (o.userData.exteriorLabelAssembly) out.push(o);
  });
  return out;
}
function shown(m) {
  const out = [];
  m.group.traverseVisible((o) => {
    if (o.userData.exteriorLabelAssembly) out.push(o);
  });
  return out;
}
const headerNames = ['projects', 'experience', 'about', 'contact'].map(
  (s) => 'header-label-mount-' + s,
);
for (const layout of ['wide', 'compact', 'wide']) {
  base.m.setLayout(layout);
  next.m.setLayout(layout);
  const scale = layout === 'wide' ? 1.4 : 1;
  for (const [activeRoom, portrait] of [
    ['home', false],
    ['home', true],
    ...['projects', 'experience', 'about', 'contact'].flatMap((s) => [
      [s, false],
      [s, true],
    ]),
    ['home', true],
    ['home', false],
  ]) {
    const state = {
      activeRoom,
      labelPortrait: portrait,
      travelling: false,
      transitRoom: null,
      hoveredWalkway: false,
      transitWalkway: false,
      reading: false,
    };
    base.m.update(0, '', true, state);
    next.m.update(0, '', true, state);
    assert.deepEqual(
      protectedSnapshot(next),
      protectedSnapshot(base),
      'Non-label model content or header texture commands changed',
    );
    for (const key of [
      'roomAnchors',
      'roomBounds',
      'innerApertureBounds',
      'readerAnchors',
      'headerAnchors',
      'hotspots',
      'portals',
      'adjacency',
    ])
      assert.deepEqual(
        stableMetadata(next.m.group.userData[key]),
        stableMetadata(base.m.group.userData[key]),
      );
    const visible = shown(next.m);
    assert.equal(visible.length, activeRoom === 'home' ? 4 : 0);
    if (visible.length)
      assert(
        visible.every(
          (o) => o.userData.labelRole === (portrait ? 'side' : 'hull'),
        ),
      );
    const headers = [];
    next.m.group.traverseVisible((o) => {
      if (headerNames.includes(o.name)) headers.push(o);
    });
    assert.equal(headers.length, 4);
    for (const assembly of assemblies(next.m)) {
      assert.equal(assembly.visible, visible.includes(assembly));
      const meta =
        next.m.group.userData.labelAssemblyBounds[assembly.userData.section][
          assembly.userData.labelRole
        ];
      assert.equal(meta.visible, assembly.visible);
      if (assembly.visible) {
        let drawn = 0;
        assembly.traverseVisible((o) => {
          if (o.isMesh && o.material.visible !== false) {
            drawn++;
            assert(o.userData.excludePick);
          }
        });
        assert.equal(
          drawn,
          5,
          'Exactly four hardware batches plus ink should draw',
        );
      }
    }
    report.states.push({
      layout,
      activeRoom,
      portrait,
      visibleExteriorAssemblies: visible.map((o) => o.name),
      visibleHeaders: headers.length,
    });
  }
  report.invariance.push({
    layout,
    protectedSourceCount: protectedSnapshot(next).length,
    exactGeometryTransformMaterialCanvasMatch: true,
  });
  const ud = next.m.group.userData;
  for (const section of ['projects', 'experience', 'about', 'contact']) {
    const [x, y] = ud.roomAnchors[section],
      hull = ud.labelAssemblyBounds[section].hull,
      side = ud.labelAssemblyBounds[section].side;
    assert(
      near(hull.min[0], x - 1.325 * scale) &&
        near(hull.max[0], x + 1.325 * scale),
    );
    assert(
      near(side.min[1], y + 0.06 - 1.43) && near(side.max[1], y + 0.06 + 1.43),
    );
    assert(near(hull.size[1], 0.57) && near(side.size[0], 0.57));
    assert.deepEqual(ud.sideLabelBounds[section], side);
    report.alignment.push({
      layout,
      section,
      horizontalEnds: [hull.min[0], hull.max[0]],
      verticalEnds: [side.min[1], side.max[1]],
      expectedHorizontal: [x - 1.325 * scale, x + 1.325 * scale],
      expectedVertical: [y + 0.06 - 1.43, y + 0.06 + 1.43],
      horizontalThickness: hull.size[1],
      verticalThickness: side.size[0],
    });
    for (const role of ['hull', 'side']) {
      const mount = next.m.group.getObjectByName(
          role + '-label-mount-' + section,
        ),
        ink = mount.children.find((o) => o.isMesh),
        canvas = ink.material.map.image;
      ink.geometry.computeBoundingBox();
      const box = ink.geometry.boundingBox,
        axisX = new THREE.Vector3(1, 0, 0).transformDirection(ink.matrixWorld),
        axisY = new THREE.Vector3(0, 1, 0).transformDirection(ink.matrixWorld),
        w = box.max.x - box.min.x,
        h = box.max.y - box.min.y,
        scl = ink.getWorldScale(new THREE.Vector3()),
        width = w * scl.x,
        height = h * scl.y;
      const aspectRatio = canvas.width / canvas.height / (width / height);
      assert(
        Math.abs(aspectRatio - 1) < 0.004,
        'Label pixels must have equal world X/Y scale',
      );
      const label = ud.labelPlaques.find(
        (p) => p.section === section && p.role === role,
      );
      assert(label.inkBounds[0] <= canvas.width * 0.941);
      assert(label.inkBounds[1] <= canvas.height * 0.881);
      report.typography.push({
        layout,
        section,
        role,
        width,
        height,
        canvas: [canvas.width, canvas.height],
        pixelAspectRatio: aspectRatio,
        physicalFontHeight: (label.fontSize * height) / canvas.height,
        worldRight: axisX.toArray(),
        worldUp: axisY.toArray(),
      });
    }
    // Each mounting body overlaps the common chassis at a real attachment point.
    const frame = next.m.group.getObjectByName(
        layout + '-common-pressure-frame',
      ),
      meshes = [];
    frame.traverse((o) => {
      if (o.isMesh) meshes.push(o);
    });
    for (const [role, px, py] of [
      ['hull', x, y - 1.499],
      ['side', x - 1.565 * scale, y + 0.06],
    ]) {
      const hit = new THREE.Raycaster(
        new THREE.Vector3(px, py, 1.5),
        new THREE.Vector3(0, 0, -1),
        0.001,
        0.5,
      ).intersectObjects(meshes, false)[0];
      assert(hit);
      assert(hit.point.z >= 1.3);
      report.mounts.push({
        layout,
        section,
        role,
        attachment: [px, py, hit.point.z],
        bodyFrontZ: 1.328,
        sharedFrameFrontZ: hit.point.z,
      });
    }
  }
}
assert.equal(
  next.m.group.getObjectByName('top-center-vessel-nameplate'),
  undefined,
);
assert(
  !next.sources.some(
    (o) =>
      o.name.startsWith('vessel-nameplate-') ||
      o.name === 'symmetric-nameplate-end-clasp',
  ),
);
assert.deepEqual(next.m.group.userData.branding, []);
assert.equal(next.m.group.userData.brandInkVisible, false);
report.brandingRemoved = true;
assert.equal(shown(screenLabels.m).length, 0);
screenLabels.m.setLabelOrientation(true);
assert.equal(shown(screenLabels.m).length, 0);
report.screenLabelsHidesHardware = true;
const code = readFileSync(candidate, 'utf8'),
  boundsCode = code.slice(
    code.indexOf('function captureOverviewBounds()'),
    code.indexOf('function setLayout('),
  );
assert(!/\bbranding\b/.test(boundsCode));
report.summary = {
  states: report.states.length,
  protectedSources: report.invariance[0].protectedSourceCount,
  alignmentCases: report.alignment.length,
  typographyCases: report.typography.length,
  mountChecks: report.mounts.length,
  brandingRemoved: true,
  passed: true,
};
writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(
  JSON.stringify(
    {
      output,
      summary: report.summary,
      firstAlignment: report.alignment[0],
      firstType: report.typography[0],
    },
    null,
    2,
  ),
);
