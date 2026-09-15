/** Shared exactness/inventory helpers for offline experiments, never app imports. */
export function geometryBytes(geometry) {
  return (
    (geometry.index?.array.byteLength ?? 0) +
    Object.values(geometry.attributes).reduce(
      (sum, attribute) => sum + attribute.array.byteLength,
      0,
    )
  );
}
function equal(value, expected, message) {
  if (Object.is(value, expected)) return;
  if (
    !value ||
    !expected ||
    typeof value !== 'object' ||
    typeof expected !== 'object'
  )
    throw new Error(message);
  const keys = Object.keys(value),
    other = Object.keys(expected);
  if (keys.length !== other.length || keys.some((key, i) => key !== other[i]))
    throw new Error(message);
  for (const key of keys) equal(value[key], expected[key], `${message}/${key}`);
}
export function assertGeometryEquivalent(before, after, label = 'geometry') {
  equal(after.boundingBox, before.boundingBox, `${label}: stored box`);
  equal(after.boundingSphere, before.boundingSphere, `${label}: stored sphere`);
  equal(after.userData, before.userData, `${label}: geometry metadata`);
  equal(
    Object.keys(after.attributes),
    Object.keys(before.attributes),
    `${label}: attributes`,
  );
  equal(after.groups, before.groups, `${label}: material groups`);
  equal(after.drawRange, before.drawRange, `${label}: draw range`);
  const count = before.index?.count ?? before.attributes.position.count;
  equal(
    after.index?.count ?? after.attributes.position.count,
    count,
    `${label}: triangle count`,
  );
  if (before.index && after.index)
    for (const key of ['itemSize', 'normalized', 'gpuType', 'usage', 'name'])
      equal(after.index[key], before.index[key], `${label}: index ${key}`);
  for (const name of Object.keys(before.attributes)) {
    const a = before.attributes[name],
      b = after.attributes[name];
    for (const key of ['itemSize', 'normalized', 'gpuType', 'usage', 'name'])
      equal(b[key], a[key], `${label}/${name}: ${key}`);
    if (a.array.constructor !== b.array.constructor)
      throw new Error(`${label}/${name}: array type`);
    const av = new Uint8Array(
      a.array.buffer,
      a.array.byteOffset,
      a.array.byteLength,
    );
    const bv = new Uint8Array(
      b.array.buffer,
      b.array.byteOffset,
      b.array.byteLength,
    );
    const stride = a.itemSize * a.array.BYTES_PER_ELEMENT;
    for (let i = 0; i < count; i++) {
      const ai = (before.index ? before.index.getX(i) : i) * stride;
      const bi = (after.index ? after.index.getX(i) : i) * stride;
      for (let c = 0; c < stride; c++)
        if (av[ai + c] !== bv[bi + c])
          throw new Error(`${label}/${name}: changed draw byte ${i}/${c}`);
    }
  }
  const bounds = [
    before.boundingBox,
    before.boundingSphere,
    after.boundingBox,
    after.boundingSphere,
  ];
  try {
    before.boundingBox =
      before.boundingSphere =
      after.boundingBox =
      after.boundingSphere =
        null;
    for (const method of ['computeBoundingBox', 'computeBoundingSphere']) {
      before[method]();
      after[method]();
    }
    equal(after.boundingBox, before.boundingBox, `${label}: box`);
    equal(after.boundingSphere, before.boundingSphere, `${label}: sphere`);
  } finally {
    [
      before.boundingBox,
      before.boundingSphere,
      after.boundingBox,
      after.boundingSphere,
    ] = bounds;
  }
}
export function meshes(root, visible = false) {
  const result = [];
  root[visible ? 'traverseVisible' : 'traverse']((object) => {
    if (object.isMesh) result.push(object);
  });
  return result;
}
export function inventory(root, visible = false) {
  const objects = meshes(root, visible),
    geometries = new Set(objects.map((o) => o.geometry));
  return {
    meshes: objects.length,
    geometries: geometries.size,
    vertices: [...geometries].reduce(
      (sum, g) => sum + g.attributes.position.count,
      0,
    ),
    geometryBytes: [...geometries].reduce(
      (sum, g) => sum + geometryBytes(g),
      0,
    ),
    triangles: objects.reduce(
      (sum, o) =>
        sum +
        ((o.geometry.index?.count ?? o.geometry.attributes.position.count) /
          3) *
          (o.isInstancedMesh ? o.count : 1),
      0,
    ),
  };
}
export function disposeModel(model) {
  const geometries = new Set(),
    materials = new Set(),
    textures = new Set();
  model.group.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of [object.material].flat().filter(Boolean))
      materials.add(material);
  });
  for (const material of materials)
    for (const value of Object.values(material))
      if (value?.isTexture) textures.add(value);
  for (const item of [...geometries, ...materials, ...textures]) item.dispose();
}
