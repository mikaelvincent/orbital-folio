/** Structural inventory after normal model batching, never a frame-time benchmark.
 * Run: node docs/evidence/project-interface-polish/geometry-inventory.mjs [baseline] [output]
 */
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import * as THREE from 'three';
import { modelSourceSnapshot } from '../../../scripts/benchmarks/model-source-snapshot.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const revision = process.argv[2] || 'c7a5c9c';
const output = resolve(
  process.argv[3] ||
    resolve(dirname(fileURLToPath(import.meta.url)), 'geometry-inventory.json'),
);
const hash = (value) => createHash('sha256').update(value).digest('hex');
const git = (...args) =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8' });
const noop = () => {};
globalThis.Path2D = class Path2D {};
const canvasDocument = {
  createElement(tag) {
    if (tag !== 'canvas') throw new Error(`Unexpected DOM element: ${tag}`);
    const canvas = { width: 300, height: 150 };
    const context = new Proxy(
      {
        canvas,
        font: '10px sans-serif',
        measureText(text) {
          const px = Number(/([\d.]+)px/.exec(this.font)?.[1] || 10);
          return {
            width: text.length * px * 0.55,
            actualBoundingBoxAscent: px * 0.75,
            actualBoundingBoxDescent: px * 0.2,
          };
        },
        createLinearGradient: () => ({ addColorStop: noop }),
        createRadialGradient: () => ({ addColorStop: noop }),
      },
      { get: (target, key) => (key in target ? target[key] : noop) },
    );
    canvas.getContext = () => context;
    return canvas;
  },
};
globalThis.document = canvasDocument;

const fixtures = {
  projects: [
    { title: 'Relay', slug: 'relay', categories: ['systems'] },
    { title: 'Fieldnotes', slug: 'fieldnotes', categories: ['interfaces'] },
    { title: 'Meter', slug: 'meter', categories: ['experiments'] },
    {
      title: 'Shared project',
      slug: 'shared-project',
      categories: ['systems', 'interfaces'],
    },
  ],
  caseStudies: [],
  layout: 'wide',
};

function nominalTextureBytes(texture) {
  if (
    texture.format !== THREE.RGBAFormat ||
    texture.type !== THREE.UnsignedByteType
  )
    return null;
  let width = texture.image?.width,
    height = texture.image?.height,
    bytes = 0;
  if (!width || !height) return null;
  while (true) {
    bytes += width * height * 4;
    if (!texture.generateMipmaps || (width === 1 && height === 1)) return bytes;
    width = Math.max(1, Math.floor(width / 2));
    height = Math.max(1, Math.floor(height / 2));
  }
}

function effectivelyVisible(object) {
  for (let ancestor = object; ancestor; ancestor = ancestor.parent)
    if (!ancestor.visible) return false;
  return [object.material].flat().some((material) => material?.visible);
}

function inventory(group, visibleOnly) {
  const geometry = new Set(),
    arrays = new Set(),
    instanceArrays = new Set(),
    materials = new Set(),
    textures = new Set();
  let meshes = 0,
    instancedMeshes = 0,
    logicalInstances = 0,
    triangleInputs = 0,
    potentialMaterialSubmissions = 0;
  group.traverse((object) => {
    if (!object.isMesh || (visibleOnly && !effectivelyVisible(object))) return;
    meshes++;
    if (object.isInstancedMesh) {
      instancedMeshes++;
      logicalInstances += object.count;
      instanceArrays.add(object.instanceMatrix.array);
      if (object.instanceColor) instanceArrays.add(object.instanceColor.array);
    }
    const g = object.geometry;
    geometry.add(g);
    for (const attribute of Object.values(g.attributes))
      arrays.add(attribute.array || attribute.data.array);
    if (g.index) arrays.add(g.index.array);
    for (const material of [object.material].flat()) {
      if (!material) continue;
      materials.add(material);
      for (const value of Object.values(material))
        if (value?.isTexture) textures.add(value);
    }
    const total = g.index?.count ?? g.attributes.position.count;
    const start = Math.max(0, g.drawRange.start),
      end = Math.min(total, start + g.drawRange.count);
    const groups = Array.isArray(object.material)
      ? g.groups
      : [{ start: 0, count: total, materialIndex: 0 }];
    for (const part of groups) {
      const material = Array.isArray(object.material)
        ? object.material[part.materialIndex]
        : object.material;
      if (!material?.visible) continue;
      const vertices = Math.max(
        0,
        Math.min(end, part.start + part.count) - Math.max(start, part.start),
      );
      if (!vertices) continue;
      potentialMaterialSubmissions++;
      triangleInputs +=
        Math.floor(vertices / 3) * (object.isInstancedMesh ? object.count : 1);
    }
  });
  const textureDetails = [...textures]
    .map((texture) => ({
      name: texture.name,
      width: texture.image?.width ?? null,
      height: texture.image?.height ?? null,
      canvas: !!texture.isCanvasTexture,
      generateMipmaps: texture.generateMipmaps,
      nominalRgba8Bytes: nominalTextureBytes(texture),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return {
    meshObjects: meshes,
    instancedMeshObjects: instancedMeshes,
    logicalInstances,
    potentialMaterialSubmissions,
    triangleInputs,
    uniqueGeometries: geometry.size,
    uniqueGeometryTypedArrays: arrays.size,
    geometryTypedArrayBytes: [...arrays].reduce(
      (sum, array) => sum + array.byteLength,
      0,
    ),
    instanceMatrixAndColorBytes: [...instanceArrays].reduce(
      (sum, array) => sum + array.byteLength,
      0,
    ),
    uniqueMaterials: materials.size,
    textureObjects: textures.size,
    nominalRgba8TextureBytes: textureDetails.reduce(
      (sum, texture) => sum + (texture.nominalRgba8Bytes ?? 0),
      0,
    ),
    unestimatedTextures: textureDetails.filter(
      (texture) => texture.nominalRgba8Bytes === null,
    ).length,
    textures: textureDetails,
  };
}

const result = {
  capturedAt: new Date().toISOString(),
  baselineCommit: git('rev-parse', revision).trim(),
  candidateParentCommit: git('rev-parse', 'HEAD').trim(),
  measurementScriptSha256: hash(await readFile(fileURLToPath(import.meta.url))),
  threeRevision: THREE.REVISION,
  installedThreeCoreSha256: hash(
    await readFile(resolve(root, 'node_modules/three/build/three.core.js')),
  ),
  fixtures,
  method: [
    'Bundle baseline source from Git, candidate from checkout. Both use the same installed Three.js and inputs. Source archives contain every bundled repository TS/JS dependency with file hashes.',
    'Full createSpacecraft normal coalescing and batching retained. Inert Canvas2D and deterministic font metrics preserve canvas dimensions, material branches and label geometry; no rasterization or browser renderer.',
    'Retained inventories include all attached meshes, including hidden variants. Effectively visible excludes objects with a hidden ancestor or no visible material; no camera/frustum/occlusion/shader-discard test.',
    'Triangle inputs honor draw ranges and material groups; logical instances multiply them. Potential material submissions are structural, not measured render calls or GPU work.',
    'Geometry bytes deduplicate typed attribute/index array objects; instance matrices/colors are separate. These are array byte lengths, not measured process/GPU allocations.',
    'Texture bytes are nominal RGBA8 texels including complete mip chains, not measured residency or browser canvas backing allocation. Project count removal changes existing canvas contents only. Case display resolution follows its authored dimensions.',
  ],
  excluded: [
    'CPU/GPU/frame timing and frame pacing',
    'HTML/CSS compositing',
    'network download',
    'Earth/sky and PMREM',
    'shadow/AO/render targets',
    'driver allocations',
    'font rasterization',
    'heat/battery claims',
  ],
  sources: {},
  versions: {},
  delta: {},
};
for (const version of ['baseline', 'candidate']) {
  const sourceRevision = version === 'baseline' ? revision : undefined;
  const sources = {};
  const snapshot = modelSourceSnapshot({
    root,
    revision: sourceRevision,
    onSource: (name, contents) => {
      sources[name] = contents;
    },
  });
  const bundled = await build({
    absWorkingDir: root,
    entryPoints: [snapshot.entry],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'esm',
    logLevel: 'silent',
    plugins: [
      snapshot.plugin,
      {
        name: 'snapshot-repository-js',
        setup(builder) {
          builder.onLoad({ filter: /\.js$/ }, async ({ path }) => {
            const name = relative(root, path);
            if (name.startsWith('../') || name.startsWith('node_modules/'))
              return;
            const contents = sourceRevision
              ? git('show', `${sourceRevision}:${name}`)
              : await readFile(path, 'utf8');
            sources[name] = contents;
            return { contents, loader: 'js', resolveDir: dirname(path) };
          });
        },
      },
    ],
  });
  const entries = Object.entries(sources).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  const sourceJson = JSON.stringify(Object.fromEntries(entries));
  const sourceHash = hash(sourceJson);
  const archive = `model-source-${version}-${sourceHash.slice(0, 16)}.json.gz`;
  await writeFile(resolve(dirname(output), archive), gzipSync(sourceJson));
  result.sources[version] = {
    sha256: sourceHash,
    archive,
    files: Object.fromEntries(
      entries.map(([name, contents]) => [name, hash(contents)]),
    ),
  };
  const { createSpacecraft } = await import(
    `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`
  );
  const model = createSpacecraft(THREE, fixtures);
  result.versions[version] = {};
  for (const layout of ['wide', 'compact']) {
    model.setLayout(layout);
    result.versions[version][layout] = {};
    for (const state of ['idle', 'contact-open']) {
      model.update(0, state === 'idle' ? 'home' : 'contact', true, {
        activeRoom: state === 'idle' ? 'home' : 'contact',
        reading: state === 'contact-open',
      });
      model.group.updateMatrixWorld(true);
      const scopes = {
        whole: model.group,
        contactConsole: model.group.getObjectByName('contact-flight-console'),
        caseStudyArchive: model.group.getObjectByName(
          'case-study-flight-recorder-archive',
        ),
        projectsWorkshop: model.group.getObjectByName('projects-workshop'),
      };
      result.versions[version][layout][state] = Object.fromEntries(
        Object.entries(scopes).flatMap(([scope, group]) => [
          [`${scope}Retained`, inventory(group, false)],
          [`${scope}Visible`, inventory(group, true)],
        ]),
      );
    }
  }
}
for (const layout of ['wide', 'compact']) {
  result.delta[layout] = {};
  for (const state of ['idle', 'contact-open']) {
    result.delta[layout][state] = {};
    for (const [scope, before] of Object.entries(
      result.versions.baseline[layout][state],
    )) {
      const after = result.versions.candidate[layout][state][scope];
      result.delta[layout][state][scope] = Object.fromEntries(
        Object.keys(before)
          .filter((key) => typeof before[key] === 'number')
          .map((key) => [key, after[key] - before[key]]),
      );
    }
  }
}
await writeFile(output, `${JSON.stringify(result, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      output,
      sourceHashes: Object.fromEntries(
        Object.entries(result.sources).map(([key, value]) => [
          key,
          value.sha256,
        ]),
      ),
      delta: result.delta.wide.idle,
    },
    null,
    2,
  ),
);
