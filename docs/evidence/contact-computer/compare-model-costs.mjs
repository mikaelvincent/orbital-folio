/** Deterministic authored-model inventory, not a rendering or timing benchmark.
 * Run: node docs/evidence/contact-computer/compare-model-costs.mjs d0fb599 /tmp/model-costs.json
 * Canvas operations are inert; real model canvas dimensions and geometry branches
 * are retained. Text metrics are deterministic substitutes, not browser metrics.
 */
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import * as THREE from 'three';
import { modelSourceSnapshot } from '../../../scripts/benchmarks/model-source-snapshot.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const revision = process.argv[2] || 'd0fb599';
const output = resolve(process.argv[3] || '/tmp/contact-model-costs.json');
const hash = (data) => createHash('sha256').update(data).digest('hex');
const noop = () => {};
process.on('uncaughtException', (error) => {
  console.error(error.message);
  process.exit(1);
});
globalThis.Path2D = class Path2D {};
globalThis.document = {
  // oxlint-disable-next-line typescript/no-deprecated -- Deliberate inert DOM test double.
  createElement(tag) {
    if (tag !== 'canvas') throw new Error(`Unexpected element ${tag}`);
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

function mipBytes(width, height, mipmaps) {
  let bytes = 0;
  while (width >= 1 && height >= 1) {
    bytes += width * height * 4;
    if (!mipmaps || (width === 1 && height === 1)) break;
    width = Math.max(1, Math.floor(width / 2));
    height = Math.max(1, Math.floor(height / 2));
  }
  return bytes;
}

function inventory(objects) {
  const geometries = new Set(),
    arrays = new Set(),
    instanceArrays = new Set(),
    materials = new Set(),
    textures = new Set();
  let meshObjects = 0,
    instanceObjects = 0,
    logicalInstances = 0,
    triangleInputs = 0,
    potentialMeshSubmissions = 0;
  for (const object of objects) {
    if (!object.isMesh) continue;
    meshObjects++;
    if (object.isInstancedMesh) {
      instanceObjects++;
      logicalInstances += object.count;
      instanceArrays.add(object.instanceMatrix.array);
      if (object.instanceColor) instanceArrays.add(object.instanceColor.array);
    }
    const geometry = object.geometry;
    geometries.add(geometry);
    for (const attribute of Object.values(geometry.attributes))
      arrays.add(attribute.array || attribute.data.array);
    if (geometry.index) arrays.add(geometry.index.array);
    for (const material of [object.material].flat()) {
      if (!material) continue;
      materials.add(material);
      for (const value of Object.values(material))
        if (value?.isTexture) textures.add(value);
    }
    const total = geometry.index?.count ?? geometry.attributes.position.count;
    const rangeStart = Math.max(0, geometry.drawRange.start);
    const rangeEnd = Math.min(total, rangeStart + geometry.drawRange.count);
    const groups = Array.isArray(object.material)
      ? geometry.groups
      : [{ start: 0, count: total, materialIndex: 0 }];
    for (const group of groups) {
      const material = Array.isArray(object.material)
        ? object.material[group.materialIndex]
        : object.material;
      if (!material?.visible) continue;
      const vertices = Math.max(
        0,
        Math.min(rangeEnd, group.start + group.count) -
          Math.max(rangeStart, group.start),
      );
      if (!vertices) continue;
      potentialMeshSubmissions++;
      triangleInputs +=
        Math.floor(vertices / 3) * (object.isInstancedMesh ? object.count : 1);
    }
  }
  const textureDetails = [...textures]
    .map((texture) => {
      const image = texture.image;
      const width = image?.width ?? null,
        height = image?.height ?? null;
      const rgba8 =
        texture.type === THREE.UnsignedByteType &&
        texture.format === THREE.RGBAFormat;
      return {
        name: texture.name,
        width,
        height,
        format: texture.format,
        type: texture.type,
        canvas: !!texture.isCanvasTexture,
        generateMipmaps: texture.generateMipmaps,
        nominalRgba8Bytes:
          rgba8 && width && height
            ? mipBytes(width, height, texture.generateMipmaps)
            : null,
      };
    })
    .sort(
      (a, b) => a.name.localeCompare(b.name) || (a.width ?? 0) - (b.width ?? 0),
    );
  return {
    meshObjects,
    instanceObjects,
    logicalInstances,
    potentialMeshSubmissions,
    triangleInputs,
    uniqueGeometries: geometries.size,
    uniqueGeometryAttributeAndIndexArrays: arrays.size,
    geometryAttributeAndIndexBytes: [...arrays].reduce(
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

await mkdir(dirname(output), { recursive: true });
const result = {
  schema: 1,
  capturedAt: new Date().toISOString(),
  baselineCommit: execFileSync('git', ['rev-parse', revision], {
    cwd: root,
    encoding: 'utf8',
  }).trim(),
  candidateParentCommit: execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
  }).trim(),
  threeRevision: THREE.REVISION,
  measurementScriptSha256: hash(await readFile(fileURLToPath(import.meta.url))),
  threeCoreSha256: hash(
    await readFile(resolve(root, 'node_modules/three/build/three.core.js')),
  ),
  threeModuleSha256: hash(
    await readFile(resolve(root, 'node_modules/three/build/three.module.js')),
  ),
  scope:
    'Deterministic model construction inventory; authored Contact redesign, not an optimization comparison.',
  method: [
    'Both source trees bundle through the existing snapshot loader. All model-owned TS/JS source bytes and SHA-256 values are archived; installed dependencies remain shared.',
    'Construct createSpacecraft(THREE) with default content. Canvas drawing is inert but preserves canvas creation, width/height, material branches and keyboard legend geometry. No images are rasterized.',
    'Wide and compact layouts: visible = traverseVisible and material-visible triangle submissions without camera/frustum/occlusion/shader discard. Retained = every attached object, including hidden variants. No runtime camera or lighting renderer is created.',
    'Geometry bytes deduplicate typed attribute/index array objects; instance matrices and colors are separate. Geometry instanced attributes such as atlas cells remain included in geometry bytes.',
    'Potential mesh submissions are a structural count, not measured draw calls. Actual passes, frustum culling, shadows, AO, materials, HTML and background alter rendered work.',
    'Texture bytes are nominal RGBA8 texel storage including exact full mip chains where generateMipmaps is true. Not measured process/GPU memory, allocation residency, startup, decode, frame timing, heat, or battery.',
  ],
  excluded: [
    'GPU/CPU/frame pacing timing',
    'HTML/CSS form layout and browser compositing',
    'font rasterization',
    'Earth/sky/textures outside the spacecraft model',
    'PMREM and lighting',
    'render targets and AO buffers',
    'driver allocations',
    'JavaScript object overhead',
    'actual network or compiled application download size',
  ],
  sources: {},
  versions: {},
};
for (const version of ['baseline', 'candidate']) {
  const sources = {};
  const sourceRevision = version === 'baseline' ? revision : undefined;
  const snapshot = modelSourceSnapshot({
    root,
    revision: sourceRevision,
    onSource(name, contents) {
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
        name: 'capture-owned-js',
        setup(builder) {
          builder.onLoad({ filter: /\.js$/ }, async ({ path }) => {
            const name = relative(root, path);
            if (name.startsWith('../') || name.startsWith('node_modules/'))
              return;
            const contents = sourceRevision
              ? execFileSync('git', ['show', `${sourceRevision}:${name}`], {
                  cwd: root,
                  encoding: 'utf8',
                })
              : await readFile(path, 'utf8');
            sources[name] = contents;
            return { contents, loader: 'js', resolveDir: dirname(path) };
          });
        },
      },
    ],
  });
  const sourceEntries = Object.entries(sources).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  const sourceJson = JSON.stringify(Object.fromEntries(sourceEntries));
  const sourceSha256 = hash(sourceJson);
  const archiveName = `model-source-${version}-${sourceSha256.slice(0, 16)}.json.gz`;
  const compressed = gzipSync(sourceJson);
  try {
    await writeFile(resolve(dirname(output), archiveName), compressed, {
      flag: 'wx',
    });
  } catch (error) {
    if (
      error.code !== 'EEXIST' ||
      hash(await readFile(resolve(dirname(output), archiveName))) !==
        hash(compressed)
    )
      throw error;
  }
  result.sources[version] = {
    sourceSha256,
    sourceFileCount: sourceEntries.length,
    archive: archiveName,
    archiveSha256: hash(compressed),
    files: Object.fromEntries(
      sourceEntries.map(([name, contents]) => [name, hash(contents)]),
    ),
  };
  const { createSpacecraft } = await import(
    `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`
  );
  const model = createSpacecraft(THREE);
  const layouts = {};
  for (const layout of ['wide', 'compact']) {
    model.setLayout(layout);
    model.group.updateMatrixWorld(true);
    const visible = [],
      retained = [],
      contact = [];
    model.group.traverseVisible((object) => visible.push(object));
    model.group.traverse((object) => retained.push(object));
    model.group
      .getObjectByName('contact-flight-console')
      .traverseVisible((object) => contact.push(object));
    layouts[layout] = {
      visible: inventory(visible),
      retained: inventory(retained),
      contactConsole: inventory(contact),
    };
  }
  result.versions[version] = layouts;
}
result.delta = {};
for (const layout of ['wide', 'compact']) {
  result.delta[layout] = {};
  for (const scope of ['visible', 'retained', 'contactConsole']) {
    const before = result.versions.baseline[layout][scope],
      after = result.versions.candidate[layout][scope];
    result.delta[layout][scope] = Object.fromEntries(
      Object.keys(before)
        .filter((key) => typeof before[key] === 'number')
        .map((key) => [key, after[key] - before[key]]),
    );
  }
}
result.keyboardAtlas = {
  width: 1024,
  height: 512,
  format: 'RGBA8',
  baseLevelBytes: 1024 * 512 * 4,
  fullMipChainBytes: mipBytes(1024, 512, true),
  networkImageBytes: 0,
  note: 'Runtime-generated canvas; extra JavaScript download size is not measured. Temporary canvas/browser backing allocation is separate from this nominal texture estimate.',
};
await writeFile(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(
  JSON.stringify(
    {
      output,
      baseline: result.sources.baseline.sourceSha256,
      candidate: result.sources.candidate.sourceSha256,
      delta: result.delta,
      keyboardAtlas: result.keyboardAtlas,
    },
    null,
    2,
  ),
);
