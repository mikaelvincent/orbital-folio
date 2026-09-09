import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const root = path.resolve(process.argv[2] ?? process.cwd()),
  require = createRequire(path.join(root, 'package.json'));
const THREE = await import(pathToFileURL(require.resolve('three')));
// Node-only canvas measurement stub; no browser DOM is created.
globalThis.document = {
  // oxlint-disable-next-line typescript/no-deprecated
  createElement(tag) {
    if (tag !== 'canvas') throw Error(tag);
    const context = new Proxy(
      {
        measureText(text) {
          return {
            width: String(text).length * 50,
            actualBoundingBoxAscent: 60,
            actualBoundingBoxDescent: 12,
          };
        },
        createLinearGradient() {
          return { addColorStop() {} };
        },
      },
      {
        get(t, k) {
          return k in t ? t[k] : () => {};
        },
      },
    );
    return {
      width: 1,
      height: 1,
      getContext() {
        return context;
      },
    };
  },
};
const { createSpacecraft } = await import(
  pathToFileURL(path.join(root, 'components/spacecraft-model.ts'))
);
const model = createSpacecraft(THREE, {
  layout: 'wide',
  screenLabels: false,
  projects: Array.from({ length: 9 }, (_, i) => ({
    title: `Project ${i + 1}`,
    slug: `project-${i + 1}`,
  })),
  projectPageSize: 9,
  labels: {
    projects: 'Projects',
    experience: 'Experience',
    about: 'About',
    contact: 'Contact',
  },
});
const sourceFiles = [
  'components/spacecraft.tsx',
  'components/spacecraft-model.ts',
  'components/orbital-environment.ts',
  'node_modules/three/src/renderers/shaders/ShaderChunk/lights_fragment_begin.glsl.js',
  'node_modules/three/src/renderers/WebGLRenderer.js',
];
const hashes = Object.fromEntries(
  sourceFiles.map((file) => [
    file,
    crypto
      .createHash('sha256')
      .update(fs.readFileSync(path.join(root, file)))
      .digest('hex'),
  ]),
);
let nodes = 0,
  meshObjects = 0,
  visibleMeshObjects = 0,
  castShadowObjects = 0,
  instancedObjects = 0,
  triangleInstances = 0;
const pointLights = [];
const materials = new Set(),
  geometries = new Set();
model.group.traverse((o) => {
  nodes++;
  if (o.isPointLight)
    pointLights.push({
      name: o.name,
      distance: o.distance,
      intensity: o.intensity,
      castShadow: o.castShadow,
    });
  if (o.isMesh) {
    meshObjects++;
    geometries.add(o.geometry);
    [].concat(o.material).forEach((m) => materials.add(m));
    if (o.castShadow) castShadowObjects++;
    if (o.isInstancedMesh) instancedObjects++;
  }
});
model.group.traverseVisible((o) => {
  if (o.isMesh) {
    visibleMeshObjects++;
    triangleInstances +=
      ((o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3) *
      (o.isInstancedMesh ? o.count : 1);
  }
});
const cases = [];
let time = 0;
const scenarios = [
  {
    name: 'overview idle',
    active: '',
    state: {
      activeRoom: 'home',
      hoveredPortal: '',
      hoveredProject: '',
      selectedProject: '',
      reading: false,
    },
  },
  {
    name: 'overview hover projects',
    active: 'projects',
    state: {
      activeRoom: 'home',
      hoveredPortal: '',
      hoveredProject: '',
      selectedProject: '',
      reading: false,
    },
  },
  {
    name: 'projects settled',
    active: '',
    state: {
      activeRoom: 'projects',
      hoveredPortal: '',
      hoveredProject: '',
      selectedProject: '',
      reading: false,
    },
  },
  {
    name: 'projects hover about passage',
    active: 'about',
    state: {
      activeRoom: 'projects',
      hoveredPortal: 'about',
      hoveredProject: '',
      selectedProject: '',
      reading: false,
    },
  },
  {
    name: 'project locker hover',
    active: 'projects',
    state: {
      activeRoom: 'projects',
      hoveredPortal: '',
      hoveredProject: 'project-2',
      selectedProject: '',
      reading: false,
    },
  },
];
for (const c of scenarios) {
  let lastMotionFrame = -1;
  const samples = [];
  for (let frame = 0; frame < 600; frame++) {
    time += 1 / 60;
    const t = performance.now();
    model.update(time, c.active, false, { ...c.state, delta: 1 / 60 });
    const ms = performance.now() - t;
    if (frame >= 120) samples.push(ms);
    if (model.group.userData.motionActive) lastMotionFrame = frame;
  }
  samples.sort((a, b) => a - b);
  cases.push({
    name: c.name,
    lastMotionFrame,
    lastMotionSeconds: lastMotionFrame < 0 ? 0 : (lastMotionFrame + 1) / 60,
    settledMotionFlag: model.group.userData.motionActive,
    modelUpdateCpuMs: {
      p50: samples[Math.floor(samples.length * 0.5)],
      p95: samples[Math.floor(samples.length * 0.95)],
    },
  });
}
// Count actual hierarchy walks; do not include instrumentation in CPU timings.
const proto = THREE.Object3D.prototype,
  original = proto.updateMatrixWorld;
let matrixVisits = 0;
proto.updateMatrixWorld = function (...args) {
  matrixVisits++;
  return original.apply(this, args);
};
model.update(time, '', false, {
  activeRoom: 'home',
  reading: false,
  delta: 1 / 60,
});
const updateVisits = matrixVisits;
model.group.updateMatrixWorld(true);
const extraDrawVisits = matrixVisits - updateVisits;
const scene = new THREE.Scene();
scene.add(model.group);
scene.updateMatrixWorld();
const rendererAutoVisits = matrixVisits - updateVisits - extraDrawVisits;
proto.updateMatrixWorld = original;
const data = model.group.userData;
const diagnostics = {
  physicalLabels: JSON.stringify(data.labelPlaques),
  roomAnchors: JSON.stringify(data.roomAnchors),
  portals: JSON.stringify(data.portals),
  activeRoute: JSON.stringify(data.activeRoute),
  lightingState: JSON.stringify(data.lightingState),
};
const diagnosticBytes = Object.fromEntries(
  Object.entries(diagnostics).map(([k, v]) => [k, Buffer.byteLength(v ?? '')]),
);
const serialization = [];
for (let i = 0; i < 500; i++) {
  const t = performance.now();
  JSON.stringify(data.labelPlaques);
  JSON.stringify(data.roomAnchors);
  JSON.stringify(data.portals);
  JSON.stringify(data.activeRoute);
  JSON.stringify(data.lightingState);
  serialization.push(performance.now() - t);
}
serialization.sort((a, b) => a - b);
const report = {
  at: new Date().toISOString(),
  sourceHashes: hashes,
  scope:
    'Read-only model/renderer-source audit. No WebGL context, browser frames, GPU timings or CSS layout costs are measured.',
  model: {
    nodes,
    meshObjects,
    visibleMeshObjects,
    castShadowObjects,
    instancedObjects,
    uniqueMaterials: materials.size,
    uniqueGeometries: geometries.size,
    triangleInstances,
    pointLights,
  },
  settling: cases,
  matrixTraversal: {
    modelUpdateVisits: updateVisits,
    followingDrawUpdateVisits: extraDrawVisits,
    rendererSceneUpdateVisits: rendererAutoVisits,
    totalForNormalFrame: updateVisits + extraDrawVisits + rendererAutoVisits,
  },
  diagnostics: {
    bytes: diagnosticBytes,
    totalSerializedBytes: Object.values(diagnosticBytes).reduce(
      (a, b) => a + b,
      0,
    ),
    serializationP50Ms: serialization[250],
    serializationP95Ms: serialization[475],
    note: 'The source emits these values at 5Hz after renderCpuMs ends, plus additional small dynamic fields. DOM mutation/style cost is excluded.',
  },
};
fs.writeFileSync(
  '/tmp/production-scene-cost-audit.json',
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
