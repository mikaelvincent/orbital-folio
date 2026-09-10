// Usage: node audit.mjs [repository] [baseline git ref] [output.json]
// Read-only source-contract and vessel-space invariance audit; no ray sweep.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve, join } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const root = resolve(process.argv[2] || process.cwd()),
  ref = process.argv[3] || '64c68d0',
  output = resolve(process.argv[4] || '/tmp/fixed-room-proportions-audit.json');
const req = createRequire(join(root, 'package.json')),
  T = await import(pathToFileURL(req.resolve('three')).href),
  ts = req('typescript'),
  sha = (s) => createHash('sha256').update(s).digest('hex');
const rendererText = readFileSync(
    join(root, 'components/spacecraft.tsx'),
    'utf8',
  ),
  modelText = readFileSync(
    join(root, 'components/spacecraft-model.ts'),
    'utf8',
  ),
  oldModel = execFileSync(
    'git',
    ['-C', root, 'show', ref + ':components/spacecraft-model.ts'],
    { encoding: 'utf8', maxBuffer: 8e6 },
  );
const report = {
  baseline: ref,
  rendererSha256: sha(rendererText),
  modelSha256: sha(modelText),
  limits: [
    'Source AST proves that viewport handling cannot request a different physical layout. CPU geometry checks exercise the existing orientation/update path; live browser resizing is validated separately.',
    'Vessel-space matrices intentionally exclude the allowed root rotation. Materials and screen text are not part of the geometry invariance assertion.',
    'The model still exposes explicit legacy layout APIs; the website never calls them in response to viewport size.',
  ],
  sourceContract: {},
  canonical: {},
  viewports: [],
  failures: [],
};
const assert = (ok, message, data = {}) => {
  if (!ok) report.failures.push({ message, ...data });
};
const ast = ts.createSourceFile(
    'spacecraft.tsx',
    rendererText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  ),
  calls = [],
  identifiers = [],
  declarations = [];
function walk(node) {
  if (ts.isCallExpression(node)) calls.push(node);
  if (ts.isIdentifier(node)) identifiers.push(node.text);
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name))
    declarations.push(node);
  ts.forEachChild(node, walk);
}
walk(ast);
const name = (p) =>
  p?.name && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name))
    ? p.name.text
    : undefined;
const creation = calls.filter(
    (c) =>
      ts.isIdentifier(c.expression) && c.expression.text === 'createSpacecraft',
  ),
  options = creation[0]?.arguments[1],
  layout =
    options && ts.isObjectLiteralExpression(options)
      ? options.properties.find((p) => name(p) === 'layout')
      : null;
const literalLayout =
  layout &&
  ts.isPropertyAssignment(layout) &&
  ts.isStringLiteral(layout.initializer)
    ? layout.initializer.text
    : null;
const layoutCalls = calls.filter(
  (c) =>
    ts.isPropertyAccessExpression(c.expression) &&
    c.expression.name.text === 'setLayout',
);
const updates = calls.filter(
  (c) =>
    ts.isPropertyAccessExpression(c.expression) &&
    c.expression.expression.getText(ast) === 'model' &&
    c.expression.name.text === 'update',
);
const updateCanRequestLayout = updates.some((c) => {
  const state = c.arguments[3];
  return (
    !state ||
    !ts.isObjectLiteralExpression(state) ||
    state.properties.some(
      (p) => ts.isSpreadAssignment(p) || name(p) === 'layout',
    )
  );
});
const resize = declarations.find((d) => d.name.text === 'resize')?.initializer,
  resizeCalls = [];
if (resize) {
  const scan = (n) => {
    if (ts.isCallExpression(n)) resizeCalls.push(n.expression.getText(ast));
    ts.forEachChild(n, scan);
  };
  scan(resize);
}
report.sourceContract = {
  creationCount: creation.length,
  literalLayout,
  setLayoutCallCount: layoutCalls.length,
  hasCompactLayoutIdentifier: identifiers.includes('compactLayout'),
  updateCount: updates.length,
  updateCanRequestLayout,
  resizeCalls,
};
assert(
  creation.length === 1 && literalLayout === 'wide',
  'Actual website creates one canonical wide vessel',
);
assert(
  !layoutCalls.length &&
    !identifiers.includes('compactLayout') &&
    !updateCanRequestLayout,
  'Viewport code cannot call or indirectly request another physical layout',
);
assert(
  resizeCalls.includes('syncSceneTargets') &&
    resizeCalls.includes('camera.updateProjectionMatrix') &&
    resizeCalls.includes('go'),
  'Resize retains camera refitting and target synchronization',
);
assert(
  sha(modelText) === sha(oldModel),
  'Physical model source is unchanged from the approved baseline',
);
const source = [];
class Mesh extends T.Mesh {
  constructor(...args) {
    super(...args);
    source.push(this);
  }
  removeFromParent() {
    if (this.parent) this.auditParent = this.parent;
    return super.removeFromParent();
  }
}
const js = ts.transpileModule(modelText, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
  }).outputText,
  { createSpacecraft } = await import(
    'data:text/javascript;base64,' + Buffer.from(js).toString('base64')
  );
const model = createSpacecraft(
    { ...T, Mesh },
    { layout: literalLayout, projects: [], caseStudies: [] },
  ),
  objects = source.filter((o) => !o.userData.parts);
model.group.traverse((o) => {
  if (o.isInstancedMesh) objects.push(o);
});
const keys = [
  'layout',
  'layoutScale',
  'roomAnchors',
  'roomBounds',
  'readerAnchors',
  'innerApertureBounds',
  'calloutAnchors',
  'calloutEdges',
  'hotspots',
  'portals',
  'requiredFramingPoints',
  'overviewBounds',
  'overviewSupportPoints',
  'walkwayBounds',
];
function vesselMatrix(object) {
  const m = new T.Matrix4();
  for (let o = object; o && o !== model.group; o = o.parent || o.auditParent) {
    o.updateMatrix();
    m.premultiply(o.matrix);
  }
  return m.toArray();
}
function snapshot() {
  const cache = new Map();
  const geom = (g) => {
    if (!cache.has(g)) {
      cache.set(
        g,
        sha(
          JSON.stringify({
            index: g.index ? Array.from(g.index.array) : null,
            attributes: Object.fromEntries(
              Object.entries(g.attributes).map(([k, a]) => [
                k,
                { size: a.itemSize, array: Array.from(a.array) },
              ]),
            ),
          }),
        ),
      );
    }
    return cache.get(g);
  };
  return {
    objects: objects.map((o) => ({
      name: o.name,
      geometry: geom(o.geometry),
      matrix: vesselMatrix(o),
      instances: o.isInstancedMesh ? Array.from(o.instanceMatrix.array) : null,
    })),
    metadata: Object.fromEntries(keys.map((k) => [k, model.group.userData[k]])),
    readerAnchors: Object.fromEntries(
      Object.entries(model.readerSurfaces).map(([k, v]) => [
        k,
        v.userData.deployedPosition,
      ]),
    ),
  };
}
model.update(0, '', true, {
  activeRoom: 'home',
  labelPortrait: false,
  delta: 0,
});
model.group.updateMatrixWorld(true);
const canonical = snapshot(),
  geometryHash = sha(JSON.stringify(canonical.objects)),
  metadataHash = sha(JSON.stringify(canonical.metadata)),
  readerHash = sha(JSON.stringify(canonical.readerAnchors));
const aperture = model.group.userData.innerApertureBounds.projects;
report.canonical = {
  objects: objects.length,
  geometryHash,
  metadataHash,
  readerHash,
  apertureSize: aperture.size,
  apertureRatio: aperture.size[0] / aperture.size[1],
  layout: model.group.userData.layout,
  layoutScale: model.group.userData.layoutScale,
};
for (const [width, height] of [
  [1920, 1080],
  [1024, 768],
  [960, 900],
  [920, 900],
  [900, 850],
  [899, 700],
  [880, 840],
  [850, 850],
  [840, 880],
  [768, 1024],
  [390, 844],
]) {
  const portrait = height > width,
    roll = portrait ? Math.PI / 2 : 0;
  model.group.rotation.z = roll;
  model.update(0, '', true, {
    activeRoom: 'home',
    labelPortrait: portrait,
    delta: 0,
  });
  model.group.updateMatrixWorld(true);
  const view = snapshot(),
    r = {
      viewport: [width, height],
      portrait,
      roll,
      legacyWouldBeCompact: width < 900 || width / height < 1.05,
      geometryUnchanged: sha(JSON.stringify(view.objects)) === geometryHash,
      metadataUnchanged: sha(JSON.stringify(view.metadata)) === metadataHash,
      readerAnchorsUnchanged:
        sha(JSON.stringify(view.readerAnchors)) === readerHash,
      apertureSize: model.group.userData.innerApertureBounds.projects.size,
    };
  report.viewports.push(r);
  assert(
    r.geometryUnchanged && r.metadataUnchanged && r.readerAnchorsUnchanged,
    'Orientation/update path preserves physical meshes, proxies, anchors and framing metadata',
    { viewport: r.viewport },
  );
}
writeFileSync(output, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.failures.length ? 1 : 0;
