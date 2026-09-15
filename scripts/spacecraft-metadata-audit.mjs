import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
const repo = resolve(process.argv[2] || process.cwd());
const modelPath = resolve(
  process.argv[3] || join(repo, 'features/spacecraft/spacecraft-model.ts'),
);
const output = resolve(
  process.argv[4] || '/tmp/spacecraft-metadata-audit.json',
);
const baselinePath = process.argv[5] ? resolve(process.argv[5]) : null;
const require = createRequire(pathToFileURL(join(repo, 'package.json')));
const THREE = await import(pathToFileURL(require.resolve('three')).href);
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

const keys = [
  'roomAnchors',
  'roomBounds',
  'innerApertureBounds',
  'readerAnchors',
  'labelAnchors',
  'sideLabelAnchors',
  'headerAnchors',
  'labelPlaques',
  'labelAssemblyBounds',
  'sideLabelBounds',
  'overviewBounds',
  'recommendedFraming',
  'walkwaySigns',
  'walkwayBounds',
  'walkwayAnchor',
  'walkwayProfile',
  'dockingAnchor',
  'dockingAnchors',
  'communicationsAnchor',
  'hotspots',
  'portals',
  'adjacency',
  'requiredFramingPoints',
  'labelSizes',
  'sideLabelSizes',
  'chassis',
];
async function build(path) {
  const { createSpacecraft } = await import(pathToFileURL(path).href);
  return createSpacecraft(THREE, {
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
    screenLabels: false,
  });
}
function copy(value) {
  return JSON.parse(JSON.stringify(value));
}
function metadata(model) {
  return Object.fromEntries(
    keys.map((k) => [k, copy(model.group.userData[k])]),
  );
}
function hashGeometry(geometry) {
  const hash = createHash('sha256');
  for (const name of Object.keys(geometry.attributes).sort()) {
    const a = geometry.attributes[name];
    hash.update(name);
    hash.update(
      new Uint8Array(a.array.buffer, a.array.byteOffset, a.array.byteLength),
    );
  }
  if (geometry.index)
    hash.update(
      new Uint8Array(
        geometry.index.array.buffer,
        geometry.index.array.byteOffset,
        geometry.index.array.byteLength,
      ),
    );
  return hash.digest('hex');
}
function localGeometry(model) {
  const list = [];
  model.group.traverse((o) => {
    if (o.isMesh)
      list.push({
        name: o.name,
        geometry: hashGeometry(o.geometry),
        local: o.matrix.elements,
        visible: o.visible,
        portal: o.userData.portalPosition,
      });
  });
  return copy(list);
}
function transform(object) {
  return copy({
    position: object.position.toArray(),
    rotation: object.rotation.toArray(),
    quaternion: object.quaternion.toArray(),
    scale: object.scale.toArray(),
    matrix: object.matrix.elements,
    matrixWorld: object.matrixWorld.elements,
    matrixAutoUpdate: object.matrixAutoUpdate,
    matrixWorldAutoUpdate: object.matrixWorldAutoUpdate,
  });
}
const report = {
  modelPath,
  metadataKeys: keys,
  cases: [],
  baselineDiagnostic: null,
};
const reference = await build(modelPath),
  tested = await build(modelPath);
const parent = new THREE.Group();
parent.add(tested.group);
const poses = [
  {
    name: 'roll90',
    position: [0, 0, 0],
    rotation: [0, 0, Math.PI / 2],
    scale: [1, 1, 1],
  },
  {
    name: 'tilted-offset',
    position: [12.4, -8.2, 5.6],
    rotation: [0.29, -0.43, 1.14],
    scale: [1, 1, 1],
  },
  {
    name: 'tilted-offset-scaled-parent',
    position: [-3.2, 5.1, -1.8],
    rotation: [-0.19, 0.32, Math.PI / 2],
    scale: [1.13, 0.87, 1.07],
    parent: true,
  },
];
for (const pose of poses) {
  tested.group.position.fromArray(pose.position);
  tested.group.rotation.set(...pose.rotation);
  tested.group.scale.fromArray(pose.scale);
  parent.position.set(
    pose.parent ? 11 : 0,
    pose.parent ? -7 : 0,
    pose.parent ? 3 : 0,
  );
  parent.rotation.set(
    pose.parent ? 0.21 : 0,
    pose.parent ? -0.34 : 0,
    pose.parent ? 0.17 : 0,
  );
  parent.scale.set(
    pose.parent ? 1.17 : 1,
    pose.parent ? 0.91 : 1,
    pose.parent ? 1.06 : 1,
  );
  parent.updateMatrixWorld(true);
  const rootBefore = transform(tested.group),
    parentBefore = transform(parent);
  for (const layout of ['wide', 'compact', 'wide']) {
    reference.setLayout(layout);
    tested.setLayout(layout);
    for (const [activeRoom, portrait] of [
      ['home', false],
      ['home', true],
      ['projects', false],
      ['experience', true],
      ['about', false],
      ['contact', true],
      ['home', true],
      ['home', false],
    ]) {
      const state = {
        activeRoom,
        labelPortrait: portrait,
        reading: false,
        travelling: false,
        transitWalkway: false,
        hoveredWalkway: false,
      };
      reference.update(0, '', true, state);
      tested.update(0, '', true, state);
      // Force both explicit orientation toggles and setLayout while rolled.
      reference.setLabelOrientation(portrait);
      tested.setLabelOrientation(portrait);
      reference.setLayout(layout);
      tested.setLayout(layout);
      assert.deepEqual(
        metadata(tested),
        metadata(reference),
        'Public metadata changed with vessel root transform',
      );
      assert.deepEqual(
        localGeometry(tested),
        localGeometry(reference),
        'Descendant geometry/transforms changed with vessel root transform',
      );
      assert.deepEqual(
        transform(tested.group),
        rootBefore,
        'Live vessel transform was mutated',
      );
      assert.deepEqual(
        transform(parent),
        parentBefore,
        'Scene parent transform was mutated',
      );
      report.cases.push({
        pose: pose.name,
        layout,
        activeRoom,
        portrait,
        metadataMatchesIdentity: true,
        localGeometryMatchesIdentity: true,
        rootUnchanged: true,
      });
    }
  }
}
if (baselinePath) {
  const a = await build(baselinePath),
    b = await build(baselinePath);
  b.group.rotation.z = Math.PI / 2;
  b.group.position.set(1.2, -0.8, 2.1);
  for (const m of [a, b]) {
    m.setLayout('compact');
    m.update(0, '', true, { activeRoom: 'home', labelPortrait: true });
    m.setLabelOrientation(true);
    m.setLayout('wide');
  }
  const ma = metadata(a),
    mb = metadata(b),
    changed = keys.filter(
      (k) => JSON.stringify(ma[k]) !== JSON.stringify(mb[k]),
    );
  report.baselineDiagnostic = {
    baselinePath,
    changedKeys: changed,
    baselineExposesBug: changed.length > 0,
  };
}
report.summary = {
  passed: true,
  poses: poses.length,
  states: report.cases.length,
  metadataFields: keys.length,
  exactLocalGeometryAndMetadata: true,
  rootAndParentTransformsPreserved: true,
};
writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(
  JSON.stringify(
    {
      output,
      summary: report.summary,
      baselineDiagnostic: report.baselineDiagnostic,
    },
    null,
    2,
  ),
);
