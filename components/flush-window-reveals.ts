type Aperture = { section: string; path: any };

/** Finish the actual pressure-face reveals instead of adding a second ring.
 * Splitting existing triangles keeps every opening, bevel and hull datum exact.
 */
export function finishWindowReveals(
  THREE: any,
  source: any,
  apertures: Aperture[],
  {
    bevel = 0.006,
    bandStartZ,
    bandEndZ,
  }: { bevel?: number; bandStartZ: number; bandEndZ: number },
) {
  const attributes = Object.entries(source.attributes) as Array<[string, any]>;
  type Vertex = Record<string, number[]>;
  const makeBucket = () =>
    Object.fromEntries(attributes.map(([name]) => [name, [] as number[]]));
  const shell = makeBucket();
  const dark = makeBucket();
  const bands = Object.fromEntries(
    apertures.map(({ section }) => [section, makeBucket()]),
  );
  const edgeTolerance = bevel * 2 + 1e-5;
  const cellSize = Math.max(0.1, edgeTolerance * 4);
  type Edge = {
    section: string;
    ax: number;
    ay: number;
    dx: number;
    dy: number;
    length: number;
  };
  const edgeCells = new Map<string, Edge[]>();
  // Index the sampled contour once. Each reveal triangle needs only the few
  // nearby edges, rather than walking all five complete window outlines.
  for (const { section, path } of apertures) {
    const points = path.getPoints(64);
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1],
        b = points[i];
      const dx = b.x - a.x,
        dy = b.y - a.y;
      const edge = {
        section,
        ax: a.x,
        ay: a.y,
        dx,
        dy,
        length: dx * dx + dy * dy,
      };
      const minX = Math.floor((Math.min(a.x, b.x) - edgeTolerance) / cellSize);
      const maxX = Math.floor((Math.max(a.x, b.x) + edgeTolerance) / cellSize);
      const minY = Math.floor((Math.min(a.y, b.y) - edgeTolerance) / cellSize);
      const maxY = Math.floor((Math.max(a.y, b.y) + edgeTolerance) / cellSize);
      for (let x = minX; x <= maxX; x++)
        for (let y = minY; y <= maxY; y++) {
          const key = `${x}:${y}`;
          const edges = edgeCells.get(key);
          if (edges) edges.push(edge);
          else edgeCells.set(key, [edge]);
        }
    }
  }
  const sideRanges = source.groups.filter(
    (group: any) => group.materialIndex === 1,
  );
  const positions = source.getAttribute('position');
  const count = source.index?.count ?? positions.count;
  const p0 = new THREE.Vector3(),
    p1 = new THREE.Vector3(),
    p2 = new THREE.Vector3();
  const copyTriangle = (
    bucket: Record<string, number[]>,
    indices: number[],
  ) => {
    p0.fromBufferAttribute(positions, indices[0]);
    p1.fromBufferAttribute(positions, indices[1]);
    p2.fromBufferAttribute(positions, indices[2]);
    if (p1.sub(p0).cross(p2.sub(p0)).lengthSq() < 1e-20) return;
    for (const index of indices)
      for (const [name, attribute] of attributes)
        for (let c = 0; c < attribute.itemSize; c++)
          bucket[name].push(attribute.array[index * attribute.itemSize + c]);
  };

  const append = (bucket: Record<string, number[]>, polygon: Vertex[]) => {
    for (let i = 1; i + 1 < polygon.length; i++) {
      const vertices = [polygon[0], polygon[i], polygon[i + 1]];
      const [a, b, c] = vertices.map(
        (vertex) => new THREE.Vector3(...vertex.position),
      );
      if (b.sub(a).cross(c.sub(a)).lengthSq() < 1e-20) continue;
      for (const vertex of vertices)
        for (const [name] of attributes) bucket[name].push(...vertex[name]);
    }
  };
  const clip = (polygon: Vertex[], z: number, sign: number) => {
    const result: Vertex[] = [];
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i],
        b = polygon[(i + 1) % polygon.length];
      const da = sign * (a.position[2] - z),
        db = sign * (b.position[2] - z);
      if (da >= 0) result.push(a);
      if (da >= 0 !== db >= 0) {
        const t = da / (da - db);
        result.push(
          Object.fromEntries(
            attributes.map(([name]) => [
              name,
              a[name].map((value, j) => value + (b[name][j] - value) * t),
            ]),
          ),
        );
      }
    }
    return result;
  };
  for (let i = 0; i < count; i += 3) {
    const indices = [0, 1, 2].map((offset) =>
      source.index ? source.index.getX(i + offset) : i + offset,
    );
    let section: string | undefined;
    if (
      sideRanges.some(
        (range: any) => i >= range.start && i < range.start + range.count,
      )
    ) {
      let x = 0,
        y = 0;
      for (const index of indices) {
        x += positions.getX(index);
        y += positions.getY(index);
      }
      x *= 1 / 3;
      y *= 1 / 3;
      const candidates = edgeCells.get(
        `${Math.floor(x / cellSize)}:${Math.floor(y / cellSize)}`,
      );
      for (const edge of candidates || []) {
        const t = edge.length
          ? Math.max(
              0,
              Math.min(
                1,
                ((x - edge.ax) * edge.dx + (y - edge.ay) * edge.dy) /
                  edge.length,
              ),
            )
          : 0;
        if (
          Math.hypot(x - edge.ax - edge.dx * t, y - edge.ay - edge.dy * t) <=
          edgeTolerance
        ) {
          section = edge.section;
          break;
        }
      }
    }
    if (!section) {
      copyTriangle(shell, indices);
      continue;
    }
    const zs = indices.map((index) => positions.getZ(index));
    const minZ = Math.min(...zs),
      maxZ = Math.max(...zs);
    // Most triangles belong wholly to one finish. Copy their original raw
    // attributes; allocate clipping polygons only at the two paint boundaries.
    if (maxZ < bandStartZ || minZ > bandEndZ) {
      copyTriangle(dark, indices);
      continue;
    }
    if (minZ > bandStartZ && maxZ < bandEndZ) {
      copyTriangle(bands[section], indices);
      continue;
    }
    const triangle = indices.map(
      (index) =>
        Object.fromEntries(
          attributes.map(([name, attribute]) => [
            name,
            Array.from(
              { length: attribute.itemSize },
              (_, c) => attribute.array[index * attribute.itemSize + c],
            ),
          ]),
        ) as Vertex,
    );
    // Three complementary slabs partition the original face: no coincident
    // paint planes, raised strips, or exposed cream inside the reveal.
    append(dark, clip(triangle, bandStartZ, -1));
    append(bands[section], clip(clip(triangle, bandStartZ, 1), bandEndZ, -1));
    append(dark, clip(triangle, bandEndZ, 1));
  }
  const geometry = (bucket: Record<string, number[]>) => {
    const result = new THREE.BufferGeometry();
    for (const [name, attribute] of attributes)
      result.setAttribute(
        name,
        new THREE.Float32BufferAttribute(bucket[name], attribute.itemSize),
      );
    result.computeBoundingSphere();
    return result;
  };
  return {
    shell: geometry(shell),
    dark: geometry(dark),
    bands: Object.entries(bands).map(([section, bucket]) => ({
      section,
      geometry: geometry(bucket),
    })),
  };
}
