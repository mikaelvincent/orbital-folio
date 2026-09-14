/**
 * Deterministic geometry inventory, independent of display/device/GPU timings.
 * node scripts/measure-hardware-geometry.mjs [baseline-repository-directory]
 * Optional baseline must have its own source tree and installed dependencies.
 */
import * as THREE from 'three';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const currentRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const groups = {
  projects: 'projects-workshop',
  about: 'about-personal-study',
  caseStudies: 'case-study-flight-recorder-archive',
  contact: 'contact-flight-console',
};

function inventory(root) {
  const geometries = new Set();
  let meshes = 0;
  let triangles = 0;
  let attributeBytes = 0;
  const bounds = new THREE.Box3();
  root.traverseVisible((object) => {
    if (!object.isMesh) return;
    meshes++;
    const geometry = object.geometry;
    triangles +=
      ((geometry.index?.count ?? geometry.attributes.position.count) / 3) *
      (object.isInstancedMesh ? object.count : 1);
    bounds.union(new THREE.Box3().setFromObject(object));
    if (geometries.has(geometry)) return;
    geometries.add(geometry);
    attributeBytes += geometry.index?.array.byteLength ?? 0;
    for (const attribute of Object.values(geometry.attributes))
      attributeBytes += attribute.array.byteLength;
  });
  return {
    meshes,
    triangles,
    uniqueGeometries: geometries.size,
    attributeBytes,
    bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
  };
}

export async function measureHardwareGeometry(repositoryRoot = currentRoot) {
  const { createSpacecraft } = await import(
    pathToFileURL(resolve(repositoryRoot, 'components/spacecraft-model.ts'))
      .href
  );
  const model = createSpacecraft(THREE);
  const layouts = {};
  for (const layout of ['wide', 'compact']) {
    model.setLayout(layout);
    model.update(0, 'home', true, {
      activeRoom: 'home',
      layout,
      delta: 0,
      immediateDoors: true,
    });
    model.group.updateMatrixWorld(true);
    layouts[layout] = {
      scene: inventory(model.group),
      furniture: Object.fromEntries(
        Object.entries(groups).map(([key, name]) => [
          key,
          inventory(model.group.getObjectByName(name)),
        ]),
      ),
    };
  }
  return {
    method:
      'Visible scene-graph inventory after real material batching and instancing. Triangles include instance counts; bytes count unique geometry attributes and indices, excluding textures/driver storage. This is deterministic submitted-geometry potential, not frustum-culling-aware renderer timings or GPU-memory telemetry.',
    layouts,
  };
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  const before = process.argv[2]
    ? await measureHardwareGeometry(resolve(process.argv[2]))
    : undefined;
  const after = await measureHardwareGeometry();
  console.log(
    JSON.stringify({ ...(before ? { before } : {}), after }, null, 2),
  );
}
