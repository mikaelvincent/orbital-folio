/** Trim real triangles to a structural datum, retaining their surface attributes. */
export function clipGeometryPlane(
  THREE: any,
  source: any,
  axis: number,
  limit: number,
) {
  const attributes = Object.entries(source.attributes) as Array<[string, any]>;
  const values = Object.fromEntries(
    attributes.map(([name]) => [name, [] as number[]]),
  );
  const count = source.index?.count ?? source.getAttribute('position').count;
  for (let i = 0; i < count; i += 3) {
    const triangle = [0, 1, 2].map((offset) => {
      const index = source.index ? source.index.getX(i + offset) : i + offset;
      return Object.fromEntries(
        attributes.map(([name, attribute]) => [
          name,
          Array.from(
            { length: attribute.itemSize },
            (_, c) => attribute.array[index * attribute.itemSize + c],
          ),
        ]),
      );
    });
    const clipped: typeof triangle = [];
    for (let j = 0; j < 3; j++) {
      const a = triangle[j],
        b = triangle[(j + 1) % 3];
      const da = a.position[axis] - limit,
        db = b.position[axis] - limit;
      if (da >= 0) clipped.push(a);
      if (da >= 0 !== db >= 0) {
        const t = da / (da - db);
        clipped.push(
          Object.fromEntries(
            attributes.map(([name]) => [
              name,
              a[name].map((value, c) => value + (b[name][c] - value) * t),
            ]),
          ),
        );
      }
    }
    for (let j = 1; j + 1 < clipped.length; j++)
      for (const vertex of [clipped[0], clipped[j], clipped[j + 1]])
        for (const [name] of attributes) values[name].push(...vertex[name]);
  }
  const result = new THREE.BufferGeometry();
  for (const [name, attribute] of attributes)
    result.setAttribute(
      name,
      new THREE.Float32BufferAttribute(values[name], attribute.itemSize),
    );
  result.normalizeNormals();
  result.computeBoundingSphere();
  return result;
}
