/**
 * A single cabin lining, including the returns onto both side walls. The
 * quarter-round replaces the old edge strips; adjoining side faces are cut
 * back to the same boundary rather than covered by another raised panel.
 */
export function buildRoundedCabinInterior(
  THREE: any,
  profile: any[],
  halfWidth: number,
  radius = 0.08,
  steps = 12,
) {
  const normals = profile.map((point: any, i: number) => {
    const before = point
      .clone()
      .sub(profile[Math.max(0, i - 1)])
      .normalize();
    const after = profile[Math.min(profile.length - 1, i + 1)]
      .clone()
      .sub(point)
      .normalize();
    if (!i) before.copy(after);
    if (i === profile.length - 1) after.copy(before);
    const n0 = new THREE.Vector2(-before.y, before.x);
    const n1 = new THREE.Vector2(-after.y, after.x);
    const normal = n0.clone().add(n1).normalize();
    return {
      normal,
      // Intersect the two offset profile segments. Both the return and the
      // trimmed wall use this exact boundary, including the rear coves.
      offset: normal.clone().multiplyScalar(radius / normal.dot(n0)),
    };
  });
  const sideProfile = profile.map((p: any, i: number) =>
    p.clone().add(normals[i].offset),
  );
  const columns: Array<{ x: number; angle: number; sign: number }> = [];
  for (const sign of [-1, 1])
    for (let step = 0; step <= steps; step++) {
      const angle = (((sign < 0 ? steps - step : step) / steps) * Math.PI) / 2;
      columns.push({
        x: sign * (halfWidth - radius + radius * Math.sin(angle)),
        angle,
        sign,
      });
    }
  const positions: number[] = [];
  const vertexNormals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (const { x, angle, sign } of columns)
    for (let i = 0; i < profile.length; i++) {
      const point = profile[i]
        .clone()
        .addScaledVector(normals[i].offset, 1 - Math.cos(angle));
      positions.push(x, point.y, -point.x);
      vertexNormals.push(
        -sign * Math.sin(angle),
        normals[i].normal.y * Math.cos(angle),
        -normals[i].normal.x * Math.cos(angle),
      );
      uvs.push(x / (2 * halfWidth) + 0.5, i / (profile.length - 1));
    }
  for (let x = 0; x + 1 < columns.length; x++)
    for (let p = 0; p + 1 < profile.length; p++) {
      const a = x * profile.length + p;
      const b = (x + 1) * profile.length + p;
      indices.push(a, b, b + 1, a, b + 1, a + 1);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute(
    'normal',
    new THREE.Float32BufferAttribute(vertexNormals, 3),
  );
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  geometry.userData = { radius, replacesSideStrips: true };
  return { geometry, sideProfile, radius };
}

/** Clip a planar side-wall face to the matching rounded lining's contour.
 * Aperture holes and their physical throat faces remain unchanged.
 */
export function trimCabinSideWall(
  THREE: any,
  source: any,
  sideProfile: any[],
  centerY = 0,
) {
  const attributes = Object.entries(source.attributes) as Array<[string, any]>;
  const values = Object.fromEntries(
    attributes.map(([name]) => [name, [] as number[]]),
  );
  const count = source.index?.count ?? source.getAttribute('position').count;
  for (let i = 0; i < count; i += 3) {
    let polygon = [0, 1, 2].map((offset) => {
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
    if (polygon.every((vertex) => Math.abs(vertex.normal[0]) > 0.999)) {
      for (let edge = 0; edge < sideProfile.length && polygon.length; edge++) {
        const a = sideProfile[edge];
        const b = sideProfile[(edge + 1) % sideProfile.length];
        const distance = (vertex: any) =>
          (b.x - a.x) * (vertex.position[1] - centerY - a.y) -
          (b.y - a.y) * (-vertex.position[2] - a.x);
        const clipped: typeof polygon = [];
        for (let j = 0; j < polygon.length; j++) {
          const p = polygon[j];
          const q = polygon[(j + 1) % polygon.length];
          const dp = distance(p);
          const dq = distance(q);
          if (dp >= -1e-10) clipped.push(p);
          if (dp >= -1e-10 !== dq >= -1e-10) {
            const fraction = dp / (dp - dq);
            clipped.push(
              Object.fromEntries(
                attributes.map(([name]) => [
                  name,
                  p[name].map(
                    (value, c) => value + (q[name][c] - value) * fraction,
                  ),
                ]),
              ),
            );
          }
        }
        polygon = clipped;
      }
    }
    for (let j = 1; j + 1 < polygon.length; j++) {
      const triangle = [polygon[0], polygon[j], polygon[j + 1]];
      const [a, b, c] = triangle.map(
        (vertex) => new THREE.Vector3(...vertex.position),
      );
      if (b.sub(a).cross(c.sub(a)).lengthSq() < 1e-18) continue;
      for (const vertex of triangle)
        for (const [name] of attributes) values[name].push(...vertex[name]);
    }
  }
  const geometry = new THREE.BufferGeometry();
  for (const [name, attribute] of attributes)
    geometry.setAttribute(
      name,
      new THREE.Float32BufferAttribute(values[name], attribute.itemSize),
    );
  geometry.computeBoundingSphere();
  return geometry;
}
