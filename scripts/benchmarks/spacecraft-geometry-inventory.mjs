/** Static inventory only: no renderer, GPU allocation or frame timing. */
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const baseline = 'b64852f';
const result = {
  baseline,
  measurement:
    'Static visible scene inventory; not frame costs or GPU/process memory',
  method:
    'Wide model, traverseVisible; all mesh triangles including instances, unique geometry attribute/index typed-array bytes. No frustum culling.',
  excludes: [
    'JavaScript object overhead',
    'instance buffers',
    'textures',
    'render targets',
    'other scene layers',
  ],
  sources: {},
};
for (const version of ['before', 'after']) {
  result.sources[version] = {};
  const bundled = await build({
    absWorkingDir: root,
    entryPoints: ['components/spacecraft-model.ts'],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'esm',
    logLevel: 'silent',
    plugins: [
      {
        name: 'record-model-source',
        setup(builder) {
          builder.onLoad({ filter: /\.(ts|tsx)$/ }, async ({ path }) => {
            const name = relative(root, path);
            if (!/^(components|lib)\//.test(name)) return;
            const contents =
              version === 'before'
                ? execFileSync('git', ['show', `${baseline}:${name}`], {
                    cwd: root,
                    encoding: 'utf8',
                  })
                : await readFile(path, 'utf8');
            result.sources[version][name] = createHash('sha256')
              .update(contents)
              .digest('hex');
            return { contents, loader: 'ts', resolveDir: dirname(path) };
          });
        },
      },
    ],
  });
  const { createSpacecraft } = await import(
    `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`
  );
  const model = createSpacecraft(THREE);
  model.setLayout('wide');
  const geometries = new Set(),
    materials = new Set(),
    textures = new Set();
  let visibleMeshes = 0,
    triangles = 0,
    geometryBytes = 0;
  model.group.traverseVisible((object) => {
    if (!object.isMesh) return;
    visibleMeshes++;
    const geometry = object.geometry;
    triangles +=
      ((geometry.index?.count ?? geometry.getAttribute('position').count) / 3) *
      (object.isInstancedMesh ? object.count : 1);
    if (geometries.has(geometry)) return;
    geometries.add(geometry);
    for (const attribute of Object.values(geometry.attributes))
      geometryBytes += attribute.array.byteLength;
    if (geometry.index) geometryBytes += geometry.index.array.byteLength;
  });
  result[version] = {
    visibleMeshes,
    triangles,
    geometryBytes,
    geometryMiB: geometryBytes / 1048576,
  };
  model.group.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of [object.material].flat())
      if (material) materials.add(material);
  });
  for (const material of materials) {
    for (const value of Object.values(material))
      if (value?.isTexture) textures.add(value);
    material.dispose();
  }
  for (const texture of textures) texture.dispose();
  for (const geometry of geometries) geometry.dispose();
}
result.delta = {
  visibleMeshes: result.after.visibleMeshes - result.before.visibleMeshes,
  triangles: result.after.triangles - result.before.triangles,
  trianglePercent: 100 * (result.after.triangles / result.before.triangles - 1),
  geometryBytes: result.after.geometryBytes - result.before.geometryBytes,
  geometryMiB: result.after.geometryMiB - result.before.geometryMiB,
};
console.log(JSON.stringify(result, null, 2));
