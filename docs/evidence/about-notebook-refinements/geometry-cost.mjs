import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const source = resolve(process.argv[2]);
const require = createRequire(source + '/package.json');
const THREE = require('three');
const { createModelPrimitives } = await import(
  pathToFileURL(source + '/features/spacecraft/geometry/model-primitives.ts')
);
const { buildAboutPersonalStudy } = await import(
  pathToFileURL(source + '/features/spacecraft/rooms/about-personal-study.ts')
);
const canvasDocument = {
  createElement() {
    const canvas = { width: 0, height: 0 };
    const ctx = new Proxy(
      {
        canvas,
        createLinearGradient: () => ({ addColorStop() {} }),
        createRadialGradient: () => ({ addColorStop() {} }),
        measureText: (text) => ({ width: text.length * 12 }),
      },
      { get: (target, key) => target[key] ?? (() => {}) },
    );
    canvas.getContext = () => ctx;
    return canvas;
  },
};
globalThis.document = canvasDocument;
const root = new THREE.Group();
root.userData.section = 'about';
const h = createModelPrimitives(THREE, root, undefined, { about: [] });
buildAboutPersonalStudy(THREE, h, root, {
  journal: Array.from({ length: 6 }, (_, i) => ({ title: `Section ${i + 1}` })),
});
const notebook = root.userData.aboutNotebook;
const geometries = new Set(),
  textures = new Set();
const pieces = [];
let meshCount = 0,
  triangles = 0;
notebook.root.traverse((object) => {
  if (!object.isMesh) return;
  meshCount++;
  geometries.add(object.geometry);
  const count =
    ((object.geometry.index?.count ??
      object.geometry.attributes.position.count) /
      3) *
    (object.isInstancedMesh ? object.count : 1);
  triangles += count;
  pieces.push({ name: object.name, triangles: count });
  for (const material of Array.isArray(object.material)
    ? object.material
    : [object.material]) {
    for (const value of Object.values(material))
      if (value?.isTexture) textures.add(value);
  }
});
let geometryArrayBytes = 0;
for (const geometry of geometries) {
  for (const attribute of Object.values(geometry.attributes))
    geometryArrayBytes += attribute.array.byteLength;
  if (geometry.index) geometryArrayBytes += geometry.index.array.byteLength;
}
const textureDetails = [...textures].map((texture) => ({
  name: texture.name,
  width: texture.image.width,
  height: texture.image.height,
  nominalRgbaBaseBytes: texture.image.width * texture.image.height * 4,
}));
const sourceSha256 = {};
for (const path of [
  'features/spacecraft/rooms/about-personal-study.ts',
  'features/spacecraft/rooms/about-notebook-layout.ts',
  'features/spacecraft/rooms/about-study-artwork.ts',
  'features/spacecraft/geometry/model-primitives.ts',
])
  sourceSha256[path] = createHash('sha256')
    .update(await readFile(source + '/' + path))
    .digest('hex');
console.log(
  JSON.stringify(
    {
      sourceSha256,
      meshCount,
      triangles,
      uniqueGeometries: geometries.size,
      geometryArrayBytes,
      textureCount: textures.size,
      nominalTextureRgbaBaseBytes: textureDetails.reduce(
        (sum, t) => sum + t.nominalRgbaBaseBytes,
        0,
      ),
      textureDetails,
      pieces,
    },
    null,
    2,
  ),
);
