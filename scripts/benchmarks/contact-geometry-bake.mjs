import { readFile, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import { Matrix3, Matrix4, Ray, Vector3 } from 'three';

/**
 * Developer-only, geometric contact-occlusion bake. This is not a reconstruction
 * of camera-dependent GTAO. Finite hemisphere sampling, distance weighting,
 * vertex interpolation and byte storage intentionally make it an approximation.
 * All meshes are static occluders; only receiver:true meshes are returned.
 */
export function bakeContactGeometry(input, options = {}) {
  const started = performance.now();
  if (!Array.isArray(input?.meshes)) throw new Error('meshes must be an array.');
  const settings = {
    radius: 0.32,
    samples: 32,
    maxEdge: 0.10,
    originBias: 0.0004,
    maxSubdivisionDepth: 18,
    maxOutputVertices: 600_000,
    maxOutputTriangles: 1_000_000,
    maxUniqueSamples: 400_000,
    maxOccluderTriangles: 1_000_000,
    ...input.settings,
  };
  for (const key of ['radius', 'maxEdge', 'originBias']) {
    if (!Number.isFinite(settings[key]) || settings[key] <= 0)
      throw new Error(`${key} must be positive and finite.`);
  }
  for (const key of ['samples', 'maxSubdivisionDepth', 'maxOutputVertices', 'maxOutputTriangles', 'maxUniqueSamples', 'maxOccluderTriangles']) {
    if (!Number.isSafeInteger(settings[key]) || settings[key] <= 0)
      throw new Error(`${key} must be a positive integer.`);
  }
  if (settings.samples > 4096 || settings.maxSubdivisionDepth > 30)
    throw new Error('Sample count or subdivision depth exceeds the offline safety limit.');
  if (settings.originBias >= settings.radius)
    throw new Error('originBias must be smaller than radius.');
  const finite = (values, length, name) => {
    if (!values || values.length !== length || !Array.from(values).every(Number.isFinite))
      throw new Error(`${name} must contain ${length} finite numbers.`);
  };
  finite(input.bounds?.min, 3, 'bounds.min');
  finite(input.bounds?.max, 3, 'bounds.max');
  if (input.bounds.min.some((v, i) => v >= input.bounds.max[i]))
    throw new Error('bounds must have positive extent on every axis.');
  const region = {
    min: input.bounds.min.map((v) => v - settings.radius),
    max: input.bounds.max.map((v) => v + settings.radius),
  };
  const stats = {
    preparationOnly: options.prepareOnly === true,
    settings,
    inputMeshes: input.meshes.length,
    receiverMeshes: 0,
    inputVertices: 0,
    inputTriangles: 0,
    receiverInputVertices: 0,
    receiverInputTriangles: 0,
    occluderTriangles: 0,
    rejectedOutsideTriangles: 0,
    rejectedDegenerateTriangles: 0,
    outputVertices: 0,
    outputTriangles: 0,
    outsideReceiverVertices: 0,
    outsideReceiverTriangles: 0,
    subdivisionSplits: 0,
    subdivisionDepthLimitedTriangles: 0,
    maximumOutputEdge: 0,
    maximumRefinedRegionEdge: 0,
    uniqueSamples: 0,
    memoHits: 0,
    rays: 0,
    plannedRays: 0,
    hitRays: 0,
    nodeTests: 0,
    triangleTests: 0,
    bvhNodes: 0,
    bvhDepth: 0,
    minimumAo: 255,
    maximumAo: 0,
    meanAo: 0,
    timingsMs: {},
    meshes: [],
    limitations: [
      'This surface-space geometric bake is not equivalent to screen-space GTAO.',
      'All supplied geometry is treated as opaque and double-sided, without texture alpha, displacement or custom vertex shaders.',
      'The caller must exclude dynamic occluders and feedback/text receivers and apply the supported static layout before export.',
      'Only occluder triangles intersecting bounds expanded by radius are retained; outside receiver vertices are white and outside receiver triangles are not refined.',
      'Triangles crossing the receiver boundary interpolate sampled inside values and white outside values; the renderer must mask the bake outside the receiver bounds.',
      'Subdivision preserves triangle surfaces and UV seams, but interpolated normals and byte occlusion can differ from original shading.',
      'Finite samples, distance falloff and vertex interpolation can flatten fine contacts; depth-limited triangles are reported.',
    ],
  };
  const ids = new Set();
  const triangles = [];
  const sources = [];
  const edgeA = new Vector3(), edgeB = new Vector3();
  for (const mesh of input.meshes) {
    if (typeof mesh.id !== 'string' || ids.has(mesh.id))
      throw new Error('Mesh ids must be unique strings.');
    ids.add(mesh.id);
    const count = mesh.position?.length / 3;
    if (!Number.isInteger(count)) throw new Error(`${mesh.id}: invalid positions.`);
    finite(mesh.position, count * 3, `${mesh.id}.position`);
    finite(mesh.normal, count * 3, `${mesh.id}.normal`);
    finite(mesh.matrix, 16, `${mesh.id}.matrix`);
    if (mesh.uv !== undefined) finite(mesh.uv, count * 2, `${mesh.id}.uv`);
    if (mesh.matrix[3] !== 0 || mesh.matrix[7] !== 0 || mesh.matrix[11] !== 0 || mesh.matrix[15] !== 1)
      throw new Error(`${mesh.id}: matrix must be an affine world transform.`);
    const matrix = new Matrix4().fromArray(mesh.matrix);
    if (Math.abs(matrix.determinant()) < 1e-15)
      throw new Error(`${mesh.id}: matrix must be invertible.`);
    const normalMatrix = new Matrix3().getNormalMatrix(matrix);
    const index = mesh.index === undefined ? Array.from({ length: count }, (_, i) => i) : Array.from(mesh.index);
    if (index.length % 3 || index.some((v) => !Number.isSafeInteger(v) || v < 0 || v >= count))
      throw new Error(`${mesh.id}: invalid triangle index.`);
    stats.inputVertices += count;
    stats.inputTriangles += index.length / 3;
    const world = Array.from({ length: count }, (_, i) =>
      new Vector3().fromArray(mesh.position, i * 3).applyMatrix4(matrix));
    for (let i = 0; i < index.length; i += 3) {
      const [a, b, c] = [world[index[i]], world[index[i + 1]], world[index[i + 2]]];
      const min = [Math.min(a.x, b.x, c.x), Math.min(a.y, b.y, c.y), Math.min(a.z, b.z, c.z)];
      const max = [Math.max(a.x, b.x, c.x), Math.max(a.y, b.y, c.y), Math.max(a.z, b.z, c.z)];
      if (min.some((v, axis) => v > region.max[axis] || max[axis] < region.min[axis])) {
        stats.rejectedOutsideTriangles++;
        continue;
      }
      if (edgeA.subVectors(b, a).cross(edgeB.subVectors(c, a)).lengthSq() < 1e-24) {
        stats.rejectedDegenerateTriangles++;
        continue;
      }
      triangles.push({ a, b, c, min, max, center: min.map((v, axis) => (v + max[axis]) / 2) });
      if (triangles.length > settings.maxOccluderTriangles)
        throw new Error('Occluder triangle budget exceeded; narrow bounds or raise maxOccluderTriangles.');
    }
    if (mesh.receiver) {
      stats.receiverMeshes++;
      stats.receiverInputVertices += count;
      stats.receiverInputTriangles += index.length / 3;
      sources.push({ mesh, matrix, normalMatrix, world, index });
    }
  }
  stats.occluderTriangles = triangles.length;
  stats.timingsMs.prepare = performance.now() - started;

  // Median splitting avoids the triangle duplication of a spatial octree. The
  // ray traversal below visits only nodes on the finite contact-radius segment.
  const buildStarted = performance.now();
  function build(items, depth = 0) {
    if (!items.length) return null;
    stats.bvhNodes++;
    stats.bvhDepth = Math.max(stats.bvhDepth, depth);
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (const triangle of items) for (let axis = 0; axis < 3; axis++) {
      min[axis] = Math.min(min[axis], triangle.min[axis]);
      max[axis] = Math.max(max[axis], triangle.max[axis]);
    }
    if (items.length <= 12 || depth >= 24) return { min, max, items };
    let axis = 0;
    for (let i = 1; i < 3; i++) if (max[i] - min[i] > max[axis] - min[axis]) axis = i;
    items.sort((a, b) => a.center[axis] - b.center[axis]);
    const middle = Math.floor(items.length / 2);
    return { min, max, left: build(items.slice(0, middle), depth + 1), right: build(items.slice(middle), depth + 1) };
  }
  const tree = stats.preparationOnly ? null : build(triangles);
  stats.timingsMs.acceleration = stats.preparationOnly ? 0 : performance.now() - buildStarted;

  const hemisphere = Array.from({ length: settings.samples }, (_, i) => {
    const radial = Math.sqrt((i + 0.5) / settings.samples);
    const azimuth = i * Math.PI * (3 - Math.sqrt(5));
    return [radial * Math.cos(azimuth), radial * Math.sin(azimuth), Math.sqrt(1 - radial * radial)];
  });
  const ray = new Ray(), hit = new Vector3();
  const normal = new Vector3(), tangent = new Vector3(), bitangent = new Vector3();
  const scratch = new Vector3();
  const memo = new Map();
  const traversal = [];
  function intersects(node, distance) {
    stats.nodeTests++;
    let near = 0, far = distance;
    for (let axis = 0; axis < 3; axis++) {
      const origin = ray.origin.getComponent(axis), direction = ray.direction.getComponent(axis);
      if (Math.abs(direction) < 1e-15) {
        if (origin < node.min[axis] || origin > node.max[axis]) return false;
      } else {
        const first = (node.min[axis] - origin) / direction;
        const second = (node.max[axis] - origin) / direction;
        near = Math.max(near, Math.min(first, second));
        far = Math.min(far, Math.max(first, second));
        if (near > far) return false;
      }
    }
    return true;
  }
  function nearestHit() {
    let nearest = settings.radius;
    traversal.length = 0;
    if (tree) traversal.push(tree);
    while (traversal.length) {
      const node = traversal.pop();
      if (!intersects(node, nearest)) continue;
      if (node.items) {
        for (const triangle of node.items) {
          stats.triangleTests++;
          if (ray.intersectTriangle(triangle.a, triangle.b, triangle.c, false, hit))
            nearest = Math.min(nearest, hit.distanceTo(ray.origin));
        }
      } else traversal.push(node.left, node.right);
    }
    return nearest;
  }
  function sample(point, localNormal, normalMatrix) {
    if (point.x < input.bounds.min[0] || point.x > input.bounds.max[0] ||
      point.y < input.bounds.min[1] || point.y > input.bounds.max[1] ||
      point.z < input.bounds.min[2] || point.z > input.bounds.max[2]) {
      stats.outsideReceiverVertices++;
      return 255;
    }
    normal.copy(localNormal).applyMatrix3(normalMatrix);
    if (normal.lengthSq() < 1e-20) throw new Error('Receiver contains a zero-length surface normal.');
    normal.normalize();
    // Exact numeric keys deliberately avoid welding nearby positions, UV seams
    // or distinct normals. Negative zero has the same physical ray direction.
    const key = `${point.x},${point.y},${point.z}|${normal.x},${normal.y},${normal.z}`;
    const previous = memo.get(key);
    if (previous !== undefined) { stats.memoHits++; return previous; }
    if (memo.size >= settings.maxUniqueSamples)
      throw new Error('Unique sample budget exceeded; coarsen maxEdge or raise maxUniqueSamples.');
    if (stats.preparationOnly) {
      memo.set(key, 255);
      stats.uniqueSamples++;
      return 255;
    }
    tangent.set(Math.abs(normal.z) < 0.9 ? 0 : 1, 0, Math.abs(normal.z) < 0.9 ? 1 : 0).cross(normal).normalize();
    bitangent.crossVectors(normal, tangent).normalize();
    ray.origin.copy(point).addScaledVector(normal, settings.originBias);
    let occluded = 0;
    for (const [x, y, z] of hemisphere) {
      ray.direction.copy(tangent).multiplyScalar(x).addScaledVector(bitangent, y).addScaledVector(normal, z).normalize();
      const distance = nearestHit();
      stats.rays++;
      if (distance < settings.radius) {
        stats.hitRays++;
        const fraction = distance / settings.radius;
        // Smooth falloff avoids a hard contact-radius contour on flat surfaces.
        occluded += 1 - fraction * fraction * (3 - 2 * fraction);
      }
    }
    const value = Math.max(0, Math.min(255, Math.round(255 * (1 - occluded / settings.samples))));
    memo.set(key, value);
    stats.uniqueSamples++;
    return value;
  }

  let subdivisionMs = 0, samplingMs = 0, aoTotal = 0;
  const meshes = sources.map(({ mesh, matrix, normalMatrix, world, index }) => {
    const prior = { outside: stats.outsideReceiverVertices, unique: stats.uniqueSamples, memo: stats.memoHits, rays: stats.rays };
    const subdivisionStarted = performance.now();
    const position = Array.from(mesh.position), normals = Array.from(mesh.normal);
    const uv = mesh.uv === undefined ? undefined : Array.from(mesh.uv);
    const outputIndex = [];
    const midpoints = new Map();
    const stack = [];
    const maxEdgeSquared = settings.maxEdge * settings.maxEdge;
    const checkVertexBudget = () => {
      if (stats.outputVertices + position.length / 3 > settings.maxOutputVertices)
        throw new Error('Receiver vertex budget exceeded; coarsen maxEdge or raise maxOutputVertices.');
    };
    checkVertexBudget();
    function midpoint(a, b) {
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      if (midpoints.has(key)) return midpoints.get(key);
      const result = position.length / 3;
      for (let axis = 0; axis < 3; axis++) {
        position.push((position[a * 3 + axis] + position[b * 3 + axis]) / 2);
        normals.push((normals[a * 3 + axis] + normals[b * 3 + axis]) / 2);
      }
      if (uv) for (let axis = 0; axis < 2; axis++) uv.push((uv[a * 2 + axis] + uv[b * 2 + axis]) / 2);
      world.push(new Vector3().fromArray(position, result * 3).applyMatrix4(matrix));
      midpoints.set(key, result);
      checkVertexBudget();
      return result;
    }
    for (let source = 0; source < index.length; source += 3) {
      stack.push([index[source], index[source + 1], index[source + 2], 0]);
      while (stack.length) {
        const [a, b, c, depth] = stack.pop();
        const edges = [world[a].distanceToSquared(world[b]), world[b].distanceToSquared(world[c]), world[c].distanceToSquared(world[a])];
        const edge = edges.indexOf(Math.max(...edges));
        const outside = [0, 1, 2].some((axis) => {
          const values = [world[a].getComponent(axis), world[b].getComponent(axis), world[c].getComponent(axis)];
          return Math.min(...values) > input.bounds.max[axis] || Math.max(...values) < input.bounds.min[axis];
        });
        if (outside || edges[edge] <= maxEdgeSquared || depth >= settings.maxSubdivisionDepth) {
          outputIndex.push(a, b, c);
          stats.maximumOutputEdge = Math.max(stats.maximumOutputEdge, Math.sqrt(edges[edge]));
          if (outside) stats.outsideReceiverTriangles++;
          else {
            stats.maximumRefinedRegionEdge = Math.max(stats.maximumRefinedRegionEdge, Math.sqrt(edges[edge]));
            if (edges[edge] > maxEdgeSquared) stats.subdivisionDepthLimitedTriangles++;
          }
          if (stats.outputTriangles + outputIndex.length / 3 > settings.maxOutputTriangles)
            throw new Error('Receiver triangle budget exceeded; coarsen maxEdge or raise maxOutputTriangles.');
          continue;
        }
        const [first, second, opposite] = edge === 0 ? [a, b, c] : edge === 1 ? [b, c, a] : [c, a, b];
        const middle = midpoint(first, second);
        stack.push([first, middle, opposite, depth + 1], [middle, second, opposite, depth + 1]);
        stats.subdivisionSplits++;
      }
    }
    subdivisionMs += performance.now() - subdivisionStarted;
    const samplingStarted = performance.now();
    const ao = [];
    for (let i = 0; i < position.length / 3; i++) {
      let value;
      try { value = sample(world[i], scratch.fromArray(normals, i * 3), normalMatrix); }
      catch (error) { throw new Error(`${mesh.id} (${mesh.name ?? 'unnamed'}), vertex ${i}: ${error.message}`, { cause: error }); }
      ao.push(value);
      stats.minimumAo = Math.min(stats.minimumAo, value);
      stats.maximumAo = Math.max(stats.maximumAo, value);
      aoTotal += value;
    }
    samplingMs += performance.now() - samplingStarted;
    stats.outputVertices += position.length / 3;
    stats.outputTriangles += outputIndex.length / 3;
    stats.meshes.push({ id: mesh.id, name: typeof mesh.name === 'string' ? mesh.name : undefined,
      inputVertices: mesh.position.length / 3, inputTriangles: index.length / 3,
      outputVertices: position.length / 3, outputTriangles: outputIndex.length / 3,
      outsideVertices: stats.outsideReceiverVertices - prior.outside,
      newlyUniqueSamples: stats.uniqueSamples - prior.unique,
      memoHits: stats.memoHits - prior.memo, rays: stats.rays - prior.rays });
    return { id: mesh.id, position, normal: normals, ...(uv ? { uv } : {}), index: outputIndex, ao };
  });
  stats.meanAo = stats.outputVertices ? aoTotal / stats.outputVertices : null;
  if (!stats.outputVertices) stats.minimumAo = stats.maximumAo = null;
  stats.timingsMs.subdivision = subdivisionMs;
  stats.plannedRays = stats.uniqueSamples * settings.samples;
  stats.timingsMs.sampling = stats.preparationOnly ? 0 : samplingMs;
  stats.timingsMs.samplePreparation = stats.preparationOnly ? samplingMs : 0;
  if (stats.preparationOnly) stats.limitations.unshift('Sizing-only result: no rays were cast, all AO bytes are placeholders of255, and this payload must never be installed as a finished bake.');
  stats.timingsMs.total = performance.now() - started;
  return { meshes, stats };
}

// Input/output paths make the bake reproducible without a browser or app server.
// Output creation is exclusive: source-identified evidence is never overwritten.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [inputPath, outputPath, ...extra] = process.argv.slice(2);
  if (!inputPath || !outputPath || extra.length) {
    console.error('Usage: node scripts/benchmarks/contact-geometry-bake.mjs input.json output.json');
    process.exitCode = 1;
  } else {
    try {
      const input = JSON.parse(await readFile(inputPath, 'utf8'));
      const output = bakeContactGeometry(input);
      await writeFile(outputPath, `${JSON.stringify(output)}\n`, { flag: 'wx' });
      console.log(JSON.stringify(output.stats, null, 2));
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
  }
}
