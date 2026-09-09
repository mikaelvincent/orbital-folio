/** Read-only model audit. Run: node scripts/lighting-symbol-pairs-audit.mjs [repo] [output.json] */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
const started = performance.now(),
  root = resolve(process.argv[2] || process.cwd());
const modelPath = join(root, 'components/spacecraft-model.ts');
const output = resolve(
  process.argv[3] || '/tmp/lighting-symbol-pairs-audit.json',
);
const req = createRequire(pathToFileURL(join(root, 'package.json')));
const THREE = await import(pathToFileURL(req.resolve('three')).href),
  ts = req('typescript');
const source = readFileSync(modelPath, 'utf8');
const sha256 = (s) => createHash('sha256').update(s).digest('hex');
// Import the captured source bytes, so concurrent geometry edits cannot invalidate the recorded hash.
const javascript = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
  },
}).outputText;
const { createSpacecraft } = await import(
  'data:text/javascript;base64,' + Buffer.from(javascript).toString('base64')
);
const rooms = ['projects', 'experience', 'about', 'contact'],
  sections = [...rooms, 'walkway'];
const failures = [];
let checks = 0,
  materialStateChecks = 0;
function check(ok, message, detail) {
  checks++;
  if (!ok && failures.length < 80) failures.push({ message, detail });
}
const near = (a, b, t = 1e-6) => Math.abs(a - b) <= t;
const same = (a, b, t = 1e-6) =>
  a.length === b.length && a.every((v, i) => near(v, b[i], t));
const baseState = {
  activeRoom: 'home',
  travelling: false,
  transitRoom: null,
  hoveredWalkway: false,
  transitWalkway: false,
  hoveredPortal: null,
  reading: false,
  labelPortrait: false,
  selectedProject: null,
  hoveredProject: null,
  selectedCaseStudy: null,
  hoveredCaseStudy: null,
};
const report = {
  modelPath,
  sourceSha256: sha256(source),
  threeRevision: THREE.REVISION,
  method:
    'CPU execution of captured current TypeScript source with real Three geometry/materials and a canvas text-width stub; no renderer or browser',
  limits: [
    'Text clearance uses the entire centered text plane, a conservative geometry bound. Canvas font pixels and on-screen legibility are not measured.',
    'No GPU lighting, temporal shimmer, UI event or runtime frame-rate claims.',
    'Emitter inventory is current model CPU state: exactly eight fixed point lights, none in walkway; no historical baseline comparison.',
  ],
  layouts: [],
};
let sources = [];
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
function installCanvasStub() {
  globalThis.document = {
    // oxlint-disable-next-line typescript/no-deprecated -- Scoped CPU canvas stub.
    createElement() {
      const ctx = new Proxy(
        {},
        {
          get(t, k) {
            if (k in t) return t[k];
            if (k === 'createLinearGradient')
              return () => ({ addColorStop() {} });
            if (k === 'measureText')
              return (text) => ({
                width:
                  text.length *
                  Number((t.font || '10px').match(/[\d.]+(?=px)/)?.[0] || 10) *
                  0.58,
              });
            return () => {};
          },
        },
      );
      return {
        width: 0,
        height: 0,
        getContext() {
          return ctx;
        },
      };
    },
  };
}
const records = (n) =>
  Array.from({ length: n }, (_, i) => ({
    title: 'Sample ' + i,
    slug: 'item-' + i,
    sample: true,
  }));
for (const layout of ['wide', 'compact']) {
  sources = [];
  installCanvasStub();
  const model = createSpacecraft(
    { ...THREE, Mesh },
    {
      layout,
      projects: records(9),
      caseStudies: records(3),
      labels: {
        projects: 'Projects',
        experience: 'Case studies',
        about: 'About',
        contact: 'Contact',
      },
      sampleLabel: 'Concept',
      vesselName: 'portfolio.example',
    },
  );
  delete globalThis.document;
  const row = {
    layout,
    exhaustiveStates: 0,
    interpolatedFrames: 0,
    levelRange: [Infinity, -Infinity],
    materialCounts: {},
    signs: [],
    representativeLighting: [],
  };
  report.layouts.push(row);
  const materials = new Map();
  for (const o of sources)
    for (const mat of [].concat(o.material || []))
      if (mat.userData?.baseColor) {
        const known = materials.get(mat.uuid);
        if (known)
          check(
            known.section === o.userData.section,
            'Material section mapping is unique',
            { name: mat.name },
          );
        else materials.set(mat.uuid, { mat, section: o.userData.section });
      }
  const liveMaterials = new Set(),
    lights = [];
  model.group.traverse((o) => {
    if (o.isLight) lights.push(o);
    for (const mat of [].concat(o.material || []))
      if (mat.userData?.baseColor) {
        liveMaterials.add(mat.uuid);
        if (!materials.has(mat.uuid)) {
          row.instancedMaterialCount = (row.instancedMaterialCount || 0) + 1;
          materials.set(mat.uuid, {
            mat,
            section: o.userData.section || o.parent?.userData.section,
          });
        }
      }
  });
  check(
    [...liveMaterials].every((id) => materials.has(id)),
    'Every rendered dimmable material is present in audit inventory',
  );
  for (const { mat, section } of materials.values()) {
    row.materialCounts[section] = (row.materialCounts[section] || 0) + 1;
    check(sections.includes(section), 'Known material room', {
      name: mat.name,
      section,
    });
  }
  row.materialCounts.total = materials.size;
  row.materialCounts.rendered = liveMaterials.size;
  row.materialCounts.exterior = [...materials.values()].filter(
    (x) => x.mat.userData.exterior,
  ).length;
  row.materialCounts.surfaceOnly = [...materials.values()].filter(
    (x) => x.mat.userData.surfaceOnly,
  ).length;
  row.materialCounts.linked = [...materials.values()].filter(
    (x) => x.mat.userData.linkedRooms,
  ).length;
  function lightSnapshot() {
    return lights.map((l) => ({
      uuid: l.uuid,
      type: l.type,
      intensity: l.intensity,
      color: l.color.toArray(),
      position: l.position.toArray(),
      distance: l.distance,
      decay: l.decay,
      section: l.parent?.userData.section,
    }));
  }
  const lightBaseline = JSON.stringify(lightSnapshot());
  row.emitters = lightSnapshot().map(({ uuid: _uuid, ...v }) => v);
  check(
    lights.length === 8 &&
      lights.every((l) => l.isPointLight && near(l.intensity, 0.35)),
    'Exactly eight fixed point emitters',
  );
  check(
    rooms.every(
      (s) =>
        lights.filter((l) => l.parent?.userData.section === s).length === 2,
    ),
    'Two point lights in each cabin',
  );
  check(
    !lights.some((l) => l.parent?.userData.section === 'walkway'),
    'No walkway point emitters',
  );
  const expected = (state, hover) =>
    Object.fromEntries(
      sections.map((section) => [
        section,
        section === 'walkway'
          ? state.transitWalkway ||
            (state.hoveredWalkway &&
              rooms.includes(state.activeRoom) &&
              !state.travelling)
            ? 1
            : 0.5
          : (!state.travelling && state.activeRoom === section) ||
              (state.travelling
                ? state.transitRoom === section
                : hover === section)
            ? 1
            : 0.5,
      ]),
    );
  const update = (state = {}, hover = '', instant = true, time = 0) =>
    model.update(time, hover, instant, { ...baseState, ...state });
  function auditActual(levels, label) {
    check(
      JSON.stringify(lightSnapshot()) === lightBaseline,
      'Emitter properties are invariant',
      label,
    );
    for (const section of sections) {
      const actual = model.group.userData.lightingState[section];
      check(
        near(actual.level, levels[section]),
        'Metadata reflects expected real level',
        { label, section, actual: actual.level, expected: levels[section] },
      );
      check(
        actual.level >= 0.5 - 1e-9 && actual.level <= 1 + 1e-9,
        'Interpolated dimmer stays within 0.5..1',
        { label, section, level: actual.level },
      );
      row.levelRange[0] = Math.min(row.levelRange[0], actual.level);
      row.levelRange[1] = Math.max(row.levelRange[1], actual.level);
    }
    for (const { mat, section } of materials.values()) {
      const d = mat.userData,
        level = d.exterior
          ? 1
          : d.linkedRooms
            ? Math.max(...d.linkedRooms.map((s) => levels[s] ?? 0.5))
            : levels[section];
      const color = d.baseColor.toArray().map((v) => v * level),
        emissive = d.baseEmissive
          .toArray()
          .map((v) => v * (d.surfaceOnly ? 0 : d.baseIntensity * level));
      check(
        same(mat.color.toArray(), color),
        'Actual material color multiplier',
        {
          label,
          name: mat.name,
          section,
          exterior: !!d.exterior,
          actual: mat.color.toArray(),
          expected: color,
        },
      );
      check(
        same(mat.emissive.toArray(), emissive),
        'Actual material emission multiplier',
        {
          label,
          name: mat.name,
          section,
          actual: mat.emissive.toArray(),
          expected: emissive,
        },
      );
      // The intentionally non-emissive portal route paint normalizes intensity to zero after the common loop.
      check(
        near(
          mat.emissiveIntensity,
          mat.name.startsWith('route-paint-') ? 0 : 1,
        ),
        'Normalized material emission intensity',
        { label, name: mat.name, actual: mat.emissiveIntensity },
      );
      materialStateChecks++;
    }
  }
  auditActual(Object.fromEntries(sections.map((s) => [s, 0.5])), 'constructor');
  for (const activeRoom of ['home', ...rooms])
    for (const hover of ['', ...rooms])
      for (const transitRoom of [null, ...rooms])
        for (const travelling of [false, true])
          for (const hoveredWalkway of [false, true])
            for (const transitWalkway of [false, true]) {
              const state = {
                activeRoom,
                travelling,
                transitRoom,
                hoveredWalkway,
                transitWalkway,
              };
              update(state, hover);
              const want = expected(state, hover);
              auditActual(want, `state-${row.exhaustiveStates}`);
              for (const section of sections)
                check(
                  near(
                    model.group.userData.lightingState[section].targetLevel,
                    want[section],
                  ),
                  'Exhaustive target level',
                  { state, hover, section },
                );
              row.exhaustiveStates++;
            }
  for (const activeRoom of ['home', ...rooms])
    for (const hoveredWalkway of [false, true]) {
      update({ activeRoom, hoveredWalkway });
      row.representativeLighting.push({
        activeRoom,
        hoveredWalkway,
        levels: Object.fromEntries(
          sections.map((s) => [s, model.group.userData.lightingState[s].level]),
        ),
      });
    }
  // Check the exact bounded exponential blend and reversals, including delta clamping.
  update();
  let clock = 0,
    previous = Object.fromEntries(sections.map((s) => [s, 0.5]));
  const deltas = [1 / 1000, 1 / 240, 1 / 60, 1 / 30, 0.1, 0.25];
  for (let i = 0; i < 144; i++) {
    const delta = deltas[i % deltas.length],
      state = {
        activeRoom: rooms[Math.floor(i / 9) % 4],
        travelling: i % 17 > 9,
        transitRoom: rooms[Math.floor(i / 7) % 4],
        hoveredWalkway: i % 11 < 6,
        transitWalkway: i % 23 > 17,
        delta,
      },
      hover = rooms[Math.floor(i / 5) % 4];
    clock += delta;
    const target = expected({ ...baseState, ...state }, hover),
      blend = 1 - Math.exp(-13 * Math.max(1 / 240, Math.min(0.1, delta)));
    const want = Object.fromEntries(
      sections.map((s) => {
        let v = previous[s] + (target[s] - previous[s]) * blend;
        if (Math.abs(v - target[s]) < 0.002) v = target[s];
        return [s, v];
      }),
    );
    update(state, hover, false, clock);
    auditActual(want, `interpolation-${i}`);
    previous = want;
    row.interpolatedFrames++;
  }
  update();
  model.group.updateMatrixWorld(true);
  function matrix(o) {
    o.updateMatrix();
    return o.auditParent
      ? o.auditParent.matrixWorld.clone().multiply(o.matrix)
      : o.matrixWorld;
  }
  function relativeBounds(o, parent) {
    o.geometry.computeBoundingBox();
    return o.geometry.boundingBox
      .clone()
      .applyMatrix4(parent.matrixWorld.clone().invert().multiply(matrix(o)));
  }
  function union(parts, parent) {
    const box = new THREE.Box3();
    for (const p of parts) box.union(relativeBounds(p, parent));
    return box;
  }
  const bJSON = (b) => ({ min: b.min.toArray(), max: b.max.toArray() });
  for (const portal of model.group.userData.portals) {
    const text = sources.find(
      (o) =>
        o.name === 'portal-destination-ink' &&
        o.auditParent?.parent?.userData.portalId === portal.id,
    );
    check(!!text, 'Caption text source exists', portal.id);
    if (!text) continue;
    const caption = text.auditParent,
      back = sources.find(
        (o) =>
          o.name === 'above-door-label-backing' && o.auditParent === caption,
      ),
      enamel = sources.find(
        (o) =>
          o.name === 'above-door-label-enamel' && o.auditParent === caption,
      );
    const symbols = [
      ...new Set(
        sources
          .filter(
            (o) =>
              o.name === 'painted-direction-arrow' &&
              o.auditParent?.parent === caption,
          )
          .map((o) => o.auditParent),
      ),
    ].sort((a, b) => a.position.x - b.position.x);
    check(
      symbols.length === 2,
      'Exactly two physical symbol groups per doorway',
      portal.id,
    );
    if (symbols.length !== 2 || !back || !enamel) continue;
    const textBounds = relativeBounds(text, caption),
      plateBounds = relativeBounds(back, caption),
      enamelBounds = relativeBounds(enamel, caption);
    check(
      near(textBounds.getCenter(new THREE.Vector3()).x, 0),
      'Destination text plane is centered',
      portal.id,
    );
    const symbolBounds = [],
      directions = [],
      partsBySide = [];
    for (const [index, symbol] of symbols.entries()) {
      const parts = sources.filter((o) => o.auditParent === symbol),
        arrow = parts.find((o) => o.name === 'painted-direction-arrow'),
        rails = parts.filter((o) => o.name === 'painted-ladder-side'),
        rungs = parts.filter((o) => o.name === 'painted-ladder-rung');
      const bound = union(parts, caption),
        isLadder = portal.via === 'walkway',
        up = !isLadder || portal.to === 'projects';
      symbolBounds.push(bound);
      partsBySide.push(parts);
      check(
        near(symbol.position.x, index === 0 ? -0.566 : 0.566),
        'Symmetric symbol group positions',
        portal.id,
      );
      check(
        rails.length === (isLadder ? 2 : 0) &&
          rungs.length === (isLadder ? 4 : 0) &&
          parts.length === (isLadder ? 7 : 1),
        'Ladder rails/rungs and arrow are physical geometry',
        {
          portal: portal.id,
          index,
          parts: parts.length,
          rails: rails.length,
          rungs: rungs.length,
        },
      );
      const p = arrow.geometry.getAttribute('position'),
        ys = Array.from({ length: p.count }, (_, i) => p.getY(i)),
        yMin = Math.min(...ys),
        yMax = Math.max(...ys);
      const xsAt = (y) => [
        ...new Set(
          Array.from({ length: p.count }, (_, i) => i)
            .filter((i) => near(p.getY(i), y))
            .map((i) => Math.round(p.getX(i) * 1e7) / 1e7),
        ),
      ];
      const top = xsAt(yMax),
        bottom = xsAt(yMin),
        actualUp = top.length === 1 && bottom.length === 2,
        actualDown = bottom.length === 1 && top.length === 2;
      check(
        up ? actualUp : actualDown,
        'Arrow tip direction matches actual destination',
        { portal: portal.id, index, top, bottom, up },
      );
      directions.push(actualUp ? 'up' : actualDown ? 'down' : 'invalid');
      check(
        bound.min.x >= plateBounds.min.x - 1e-7 &&
          bound.max.x <= plateBounds.max.x + 1e-7 &&
          bound.min.y >= plateBounds.min.y - 1e-7 &&
          bound.max.y <= plateBounds.max.y + 1e-7,
        'Symbols remain within physical plate',
        { portal: portal.id, index },
      );
      check(
        bound.min.x >= enamelBounds.min.x - 1e-7 &&
          bound.max.x <= enamelBounds.max.x + 1e-7,
        'Symbols remain within enamel face',
        { portal: portal.id, index },
      );
      check(
        index === 0
          ? bound.max.x < textBounds.min.x
          : bound.min.x > textBounds.max.x,
        'Symbols clear the entire centered text plane',
        { portal: portal.id, index },
      );
    }
    const [left, right] = symbolBounds;
    check(
      near(left.min.x, -right.max.x, 0.001) &&
        near(left.max.x, -right.min.x, 0.001) &&
        near(left.min.y, right.min.y) &&
        near(left.max.y, right.max.y),
      'Paired physical bounds are symmetric within 0.001 world units',
      portal.id,
    );
    const signature = (parts) =>
      parts.map((p) => ({
        name: p.name,
        position: p.position.toArray(),
        rotation: p.rotation.toArray(),
        scale: p.scale.toArray(),
        vertices: Array.from(p.geometry.getAttribute('position').array),
      }));
    check(
      JSON.stringify(signature(partsBySide[0])) ===
        JSON.stringify(signature(partsBySide[1])),
      'Paired glyphs have identical geometry and direction',
      portal.id,
    );
    const combined = left.clone().union(right),
      expectedSymbol =
        portal.via === 'walkway'
          ? portal.to === 'projects'
            ? 'ladder-up'
            : 'ladder-down'
          : 'door-forward-up';
    check(
      portal.directionSymbol === expectedSymbol &&
        JSON.stringify(portal.symbolSides) ===
          JSON.stringify(['left', 'right']),
      'Metadata matches physical symbols',
      portal.id,
    );
    row.signs.push({
      portal: portal.id,
      symbol: expectedSymbol,
      physicalDirections: directions,
      partCounts: partsBySide.map((p) => p.length),
      groupPositions: symbols.map((s) => s.position.toArray()),
      textBounds: bJSON(textBounds),
      plateBounds: bJSON(plateBounds),
      symbolBounds: symbolBounds.map(bJSON),
      textClearance: Math.min(
        textBounds.min.x - left.max.x,
        right.min.x - textBounds.max.x,
      ),
      plateEdgeClearance: Math.min(
        combined.min.x - plateBounds.min.x,
        plateBounds.max.x - combined.max.x,
      ),
      enamelEdgeClearance: Math.min(
        combined.min.x - enamelBounds.min.x,
        enamelBounds.max.x - combined.max.x,
      ),
      symmetryError: Math.max(
        Math.abs(left.min.x + right.max.x),
        Math.abs(left.max.x + right.min.x),
      ),
    });
  }
  check(row.signs.length === 6, 'Six doorway captions checked');
  const textures = new Set(),
    geometries = new Set();
  for (const o of sources) {
    if (o.geometry) geometries.add(o.geometry);
    for (const mat of [].concat(o.material || []))
      for (const value of Object.values(mat))
        if (value?.isTexture) textures.add(value);
  }
  for (const g of geometries) g.dispose();
  for (const { mat } of materials.values()) mat.dispose();
  for (const t of textures) t.dispose();
}
report.checks = checks;
report.materialStateChecks = materialStateChecks;
report.failures = failures;
report.passed = failures.length === 0;
report.elapsedMs = Math.round((performance.now() - started) * 10) / 10;
report.sourceStillCurrent =
  sha256(readFileSync(modelPath, 'utf8')) === report.sourceSha256;
writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(
  JSON.stringify(
    {
      output,
      passed: report.passed,
      sourceSha256: report.sourceSha256,
      sourceStillCurrent: report.sourceStillCurrent,
      checks,
      materialStateChecks,
      elapsedMs: report.elapsedMs,
      layouts: report.layouts.map((r) => ({
        layout: r.layout,
        states: r.exhaustiveStates,
        interpolatedFrames: r.interpolatedFrames,
        levelRange: r.levelRange,
        materialCounts: r.materialCounts,
        symbolPairs: r.signs.length,
        minTextClearance: Math.min(...r.signs.map((s) => s.textClearance)),
        minPlateEdgeClearance: Math.min(
          ...r.signs.map((s) => s.plateEdgeClearance),
        ),
        minEnamelEdgeClearance: Math.min(
          ...r.signs.map((s) => s.enamelEdgeClearance),
        ),
        maxSymmetryError: Math.max(...r.signs.map((s) => s.symmetryError)),
      })),
      failures: failures.slice(0, 12),
    },
    null,
    2,
  ),
);
assert(report.passed, 'Lighting/symbol-pair audit failed; inspect output JSON');
