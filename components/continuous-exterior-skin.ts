import { LADDER_SHOULDER_RUN } from '../lib/spacecraft-wall-layout.ts';

/**
 * One exterior owner for the cabin roof, keel, rounded service-side wall and
 * rear. The caller retains only inward cabin surfaces, the curved bow shell,
 * the ladder rear (with its equipment recesses), and the docking wall.
 */
export function buildContinuousExteriorSkin(
  THREE: any,
  {
    datums: d,
    cabinExteriorProfile,
    outerBow,
    frontZ,
    cabinRearZ = -1.1 - d.thickness,
    ladderRearZ = cabinRearZ,
  }: any,
) {
  const t = d.thickness;
  const scale = d.scale;
  const tangentX =
    d.bowTangentX ?? d.ladderX + (LADDER_SHOULDER_RUN - 0.665) * scale;
  const startX = d.stepStartX;
  const endX = d.stepEndX;
  const rightX = d.nominalRightOuter ?? d.right;
  const radiusX = 0.35 * scale + t;
  const radiusY = 0.35 + t;
  const cornerStartX = rightX - radiusX;
  const q = d.rowHalfPitch;
  const clamp = (v: number) => Math.max(0, Math.min(1, v));

  function envelopeAtZ(z: number, upper: boolean) {
    const x = -Math.max(cabinRearZ, Math.min(frontZ, z));
    const values: number[] = [];
    for (let i = 0; i + 1 < cabinExteriorProfile.length; i++) {
      const a = cabinExteriorProfile[i];
      const b = cabinExteriorProfile[i + 1];
      if (x < Math.min(a.x, b.x) - 1e-7 || x > Math.max(a.x, b.x) + 1e-7)
        continue;
      if (Math.abs(b.x - a.x) < 1e-8) values.push(a.y, b.y);
      else {
        const f = clamp((x - a.x) / (b.x - a.x));
        values.push(a.y + (b.y - a.y) * f);
      }
    }
    if (!values.length) throw new Error(`No cabin exterior envelope at Z=${z}`);
    const crown = Math.max(...values) + q;
    // Reflect the exterior crown around the deck center so both ends of the
    // ladder have one silhouette. The lower interior cove remains untouched.
    return upper ? crown : 2 * d.ladderCenterY - crown;
  }

  function rearAtX(_x: number) {
    return cabinRearZ;
  }
  function cornerDropAtX(x: number) {
    if (x <= cornerStartX) return 0;
    const u = 1 - Math.sqrt(clamp((rightX - x) / radiusX));
    return radiusY * u * u;
  }
  const rearEdgeRadius = t;
  function rearReturn(z: number) {
    const u = clamp((cabinRearZ + rearEdgeRadius - z) / rearEdgeRadius);
    return { u, inset: rearEdgeRadius * (1 - Math.sqrt(1 - u * u)) };
  }
  function exteriorX(x: number, z: number) {
    const weight = clamp((x - cornerStartX) / radiusX);
    return x - rearReturn(z).inset * weight * weight;
  }
  function boundaryAt(x: number, z: number, upper: boolean) {
    // One depth profile reaches from the bow tangent to the service end.
    // Blending a flat ladder crown into the cabin's curved rear created a
    // visible hump at every oblique view of the back edge.
    return envelopeAtZ(z, upper) + (upper ? -1 : 1) * cornerDropAtX(x);
  }
  const roofAt = (x: number, z: number) => boundaryAt(x, z, true);
  const keelAt = (x: number, z: number) => boundaryAt(x, z, false);
  function bowPointAtZ(point: any, z: number) {
    const upper = point.y >= d.ladderCenterY;
    const tangentY = upper ? d.upperTangentY : d.lowerTangentY;
    const crownY = upper ? d.noseTop : d.noseBottom;
    const fraction = clamp((point.y - tangentY) / (crownY - tangentY));
    const leftWeight = clamp((tangentX - point.x) / (tangentX - d.left));
    return new THREE.Vector2(
      point.x + rearReturn(z).inset * leftWeight * leftWeight,
      point.y + (envelopeAtZ(z, upper) - crownY) * fraction,
    );
  }

  // Include every original profile breakpoint. The new skin follows the
  // canonical cove exactly rather than bridging across its curved sections.
  const depthFractions = [0, 1];
  // One shared sampling of the rear quarter-round joins the bow, docking
  // strip, roof and outboard return without independent chord approximations.
  for (let i = 0; i <= 32; i++) {
    const z =
      cabinRearZ +
      rearEdgeRadius -
      rearEdgeRadius * Math.sin((i * Math.PI) / 64);
    depthFractions.push((frontZ - z) / (frontZ - cabinRearZ));
  }
  for (const point of cabinExteriorProfile) {
    const z = -point.x;
    if (z > cabinRearZ && z < frontZ)
      depthFractions.push((frontZ - z) / (frontZ - cabinRearZ));
  }
  for (let i = 1; i < 16; i++) depthFractions.push(i / 16);
  depthFractions.sort((a, b) => a - b);
  const depth = depthFractions.filter(
    (value, i) => !i || value - depthFractions[i - 1] > 1e-8,
  );
  const columns: number[] = [];
  for (let i = 0; i <= 8; i++)
    columns.push(tangentX + ((startX - tangentX) * i) / 8);
  for (let i = 1; i <= 24; i++) {
    const u = i / 24;
    columns.push(
      startX + (endX - startX) * (1.2 * u - 0.6 * u * u + 0.4 * u * u * u),
    );
  }
  // Flat roof spans have no per-room tessellation or material boundary.
  for (let i = 1; i <= 8; i++)
    columns.push(endX + ((cornerStartX - endX) * i) / 8);
  for (let i = 1; i <= 64; i++) {
    const u = i / 64;
    columns.push(rightX - radiusX * (1 - u) * (1 - u));
  }

  function makeGeometry(positions: number[], indices: number[]) {
    const kept: number[] = [];
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    for (let i = 0; i < indices.length; i += 3) {
      a.fromArray(positions, 3 * indices[i]);
      b.fromArray(positions, 3 * indices[i + 1]);
      c.fromArray(positions, 3 * indices[i + 2]);
      if (b.sub(a).cross(c.sub(a)).lengthSq() > 1e-20)
        kept.push(indices[i], indices[i + 1], indices[i + 2]);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setIndex(kept);
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    return geometry;
  }

  const surfaces: Array<{ name: string; geometry: any }> = [];
  for (const upper of [true, false]) {
    const positions: number[] = [];
    const indices: number[] = [];
    for (const x of columns) {
      const rear = rearAtX(x);
      for (const f of depth) {
        const z = frontZ + (rear - frontZ) * f;
        positions.push(exteriorX(x, z), boundaryAt(x, z, upper), z);
      }
    }
    for (let i = 0; i + 1 < columns.length; i++)
      for (let j = 0; j + 1 < depth.length; j++) {
        const a = i * depth.length + j;
        const b = (i + 1) * depth.length + j;
        if (upper) indices.push(a, b, b + 1, a, b + 1, a + 1);
        else indices.push(a, b + 1, b, a, a + 1, b + 1);
      }
    const geometry = makeGeometry(positions, indices);
    // The quadratic arc is tangent to the straight right side at its endpoint.
    // Separate meshes share that exact normal so their seam stays invisible.
    const normals = geometry.getAttribute('normal');
    const lastColumn = (columns.length - 1) * depth.length;
    for (let j = 0; j < depth.length; j++) {
      const z = frontZ + (cabinRearZ - frontZ) * depth[j];
      const { u } = rearReturn(z);
      normals.setXYZ(lastColumn + j, Math.sqrt(1 - u * u), 0, -u);
    }
    surfaces.push({
      name: upper ? 'continuous-exterior-roof' : 'continuous-exterior-keel',
      geometry,
    });
  }

  const sidePositions: number[] = [];
  const sideIndices: number[] = [];
  for (const f of depth) {
    const z = frontZ + (cabinRearZ - frontZ) * f;
    sidePositions.push(exteriorX(rightX, z), keelAt(rightX, z), z);
    sidePositions.push(exteriorX(rightX, z), roofAt(rightX, z), z);
  }
  for (let i = 0; i + 1 < depth.length; i++) {
    const a = 2 * i;
    const b = a + 2;
    sideIndices.push(a, b, b + 1, a, b + 1, a + 1);
  }
  const sideGeometry = makeGeometry(sidePositions, sideIndices);
  const sideNormals = sideGeometry.getAttribute('normal');
  for (let i = 0; i < depth.length; i++) {
    const z = frontZ + (cabinRearZ - frontZ) * depth[i];
    const { u } = rearReturn(z);
    for (const j of [0, 1])
      sideNormals.setXYZ(2 * i + j, Math.sqrt(1 - u * u), 0, -u);
  }
  surfaces.push({
    name: 'continuous-rounded-outboard-wall',
    geometry: sideGeometry,
  });

  // Replace all former exterior cabin back faces and the middeck bridge.
  // This rear plane follows the same shoulder transition as the outer roof.
  const rearColumns = columns.filter((x) => x >= startX - 1e-9);
  const rearPositions: number[] = [];
  const rearIndices: number[] = [];
  for (const x of rearColumns) {
    const z = rearAtX(x);
    rearPositions.push(
      exteriorX(x, z),
      keelAt(x, z),
      z,
      exteriorX(x, z),
      roofAt(x, z),
      z,
    );
  }
  for (let i = 0; i + 1 < rearColumns.length; i++) {
    const a = 2 * i;
    const b = a + 2;
    rearIndices.push(a, a + 1, b + 1, a, b + 1, b);
  }
  surfaces.push({
    name: 'continuous-cabin-rear-exterior',
    geometry: makeGeometry(rearPositions, rearIndices),
  });

  const rearBow = outerBow.map((point: any) => bowPointAtZ(point, ladderRearZ));
  function bowBoundaryAtX(x: number, upper: boolean) {
    const values: number[] = [];
    for (let i = 0; i < rearBow.length; i++) {
      const a = rearBow[i];
      const b = rearBow[(i + 1) % rearBow.length];
      if (x < Math.min(a.x, b.x) - 1e-6 || x > Math.max(a.x, b.x) + 1e-6)
        continue;
      if (Math.abs(b.x - a.x) < 1e-8) values.push(a.y, b.y);
      else {
        const f = clamp((x - a.x) / (b.x - a.x));
        values.push(a.y + (b.y - a.y) * f);
      }
    }
    if (!values.length)
      throw new Error(`No preserved bow rear boundary at X=${x}`);
    return upper ? Math.max(...values) : Math.min(...values);
  }
  // Only fill the wedges beyond the retained rounded ladder rear boundary.
  // Its existing full rear face and equipment pockets are not overlaid.
  for (const upper of [true, false]) {
    const positions: number[] = [];
    const indices: number[] = [];
    // Match every vertex of the retained rear bow, rather than cutting across
    // its curved edge with coarser wedge chords that create overlapping slivers.
    const allX = [
      ...columns.filter((x) => x <= startX + 1e-9),
      ...outerBow
        .map((p: any) => p.x)
        .filter((x: number) => x >= tangentX && x <= startX),
    ].sort((a, b) => a - b);
    const xs = allX.filter((x, i) => !i || x - allX[i - 1] > 1e-8);
    for (const x of xs)
      positions.push(
        x,
        bowBoundaryAtX(x, upper),
        ladderRearZ,
        x,
        boundaryAt(x, ladderRearZ, upper),
        ladderRearZ,
      );
    for (let i = 0; i + 1 < xs.length; i++) {
      const a = 2 * i;
      const b = a + 2;
      if (upper) indices.push(a, a + 1, b + 1, a, b + 1, b);
      else indices.push(a, b + 1, a + 1, a, b, b + 1);
    }
    surfaces.push({
      name: upper
        ? 'continuous-bow-upper-rear-closure'
        : 'continuous-bow-lower-rear-closure',
      geometry: makeGeometry(positions, indices),
    });
  }

  /** A filled side-wall outline in the model's canonical (-Z,Y) coordinates. */
  function sideOutlineAtX(x: number) {
    const rear = rearAtX(x);
    const points = depth.map((f) => {
      const z = frontZ + (rear - frontZ) * f;
      return new THREE.Vector2(-z, keelAt(x, z));
    });
    for (const f of [...depth].reverse()) {
      const z = frontZ + (rear - frontZ) * f;
      points.push(new THREE.Vector2(-z, roofAt(x, z)));
    }
    return new THREE.Shape(points);
  }

  return {
    surfaces,
    profiles: {
      roofAt,
      keelAt,
      rearAtX,
      envelopeAtZ,
      cornerDropAtX,
      sideOutlineAtX,
      bowPointAtZ,
      rearBow,
      depthFractions: depth,
    },
    replaceBowAfterX: tangentX,
    metadata: {
      nominalThickness: t,
      frontZ,
      cabinRearZ,
      ladderRearZ,
      rightX,
      cornerRadii: [radiusX, radiusY],
      shoulderBoundsX: [tangentX, endX],
      singleExteriorOwner: true,
      removesOldCabinExteriors: true,
      sharedRearDepth: true,
      rearEdgeRadius,
      formerLadderRearZ: -0.985 - t,
      ladderRearExtension: -0.985 - t - ladderRearZ,
      sharedCrownDepthProfile: true,
      rearBowContour: rearBow.map((point: any) => point.toArray()),
      rearCrownY: [
        envelopeAtZ(cabinRearZ, false),
        envelopeAtZ(cabinRearZ, true),
      ],
    },
  };
}
