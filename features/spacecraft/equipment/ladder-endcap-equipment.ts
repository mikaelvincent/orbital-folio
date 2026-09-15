/** Open transfer grips follow the ladder's rounded
 * ends. The liner remains visible through every handhold and attachment point.
 */
export function buildLadderEndcapEquipment(
  THREE: any,
  h: any,
  parent: any,
  contour: Array<{ x: number; y: number }>,
  centerY: number,
  materials: { navy: any; metal: any; amber: any },
) {
  const root = new THREE.Group();
  root.name = 'ladder-end-transfer-equipment';
  root.userData = {
    section: 'walkway',
    batchRoot: true,
    excludePick: true,
    static: true,
    equipmentKind: 'open-transfer-grips',
  };
  parent.add(root);
  const crownY = (x: number, side: number) => {
    let edge = side > 0 ? -Infinity : Infinity;
    for (let i = 0; i < contour.length; i++) {
      const a = contour[i],
        b = contour[(i + 1) % contour.length];
      if (
        Math.abs(a.x - b.x) < 1e-10 ||
        x < Math.min(a.x, b.x) ||
        x > Math.max(a.x, b.x)
      )
        continue;
      const y = a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x);
      edge = side > 0 ? Math.max(edge, y) : Math.min(edge, y);
    }
    if (!Number.isFinite(edge))
      throw new RangeError('Ladder attachment must fit inside the rounded end');
    return edge;
  };
  const mesh = (geometry: any, material: any, name: string) => {
    const o = h.mesh(geometry, material, root, 'ladder-end-' + name);
    o.userData.excludePick = true;
    return o;
  };
  const tube = (
    points: number[][],
    radius: number,
    material: any,
    name: string,
    segments = 40,
    radial = 10,
  ) => {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
      false,
      'centripetal',
    );
    mesh(
      new THREE.TubeGeometry(curve, segments, radius, radial, false),
      material,
      name,
    );
    return curve;
  };
  const tubeSection = (
    curve: any,
    from: number,
    to: number,
    radius: number,
    material: any,
    name: string,
  ) => {
    tube(
      Array.from({ length: 9 }, (_, i) =>
        curve.getPointAt(from + ((to - from) * i) / 8).toArray(),
      ),
      radius,
      material,
      name,
      12,
    );
  };
  // These are individual circular mounting shoes, not backing boards. A radial
  // grid seats their entire back faces on the curved liner, including interiors.
  const shoe = (
    radius: number,
    depth: number,
    inset: number,
    cross: number,
    z: number,
    side: number,
    material: any,
    name: string,
  ) => {
    const positions: number[] = [],
      indices: number[] = [],
      uv: number[] = [];
    const segments = 24,
      rings = 4;
    const point = (u: number, v: number, w: number) => [
      cross + u,
      crownY(cross + u, side) - side * w,
      z + v,
    ];
    for (const w of [inset, inset + depth]) {
      positions.push(...point(0, 0, w));
      uv.push(0.5, 0.5);
      for (let ring = 1; ring <= rings; ring++)
        for (let j = 0; j < segments; j++) {
          const a = (j * 2 * Math.PI) / segments,
            r = (radius * ring) / rings;
          positions.push(...point(Math.cos(a) * r, Math.sin(a) * r, w));
          uv.push(
            0.5 + (Math.cos(a) * ring) / rings / 2,
            0.5 + (Math.sin(a) * ring) / rings / 2,
          );
        }
    }
    const layer = 1 + rings * segments;
    for (let j = 0; j < segments; j++) {
      const next = (j + 1) % segments;
      indices.push(0, 1 + next, 1 + j, layer, layer + 1 + j, layer + 1 + next);
      for (let ring = 1; ring < rings; ring++) {
        const a = 1 + (ring - 1) * segments + j,
          b = 1 + (ring - 1) * segments + next;
        const c = a + segments,
          d = b + segments;
        indices.push(
          a,
          b,
          c,
          c,
          b,
          d,
          layer + a,
          layer + c,
          layer + b,
          layer + c,
          layer + d,
          layer + b,
        );
      }
      const a = 1 + (rings - 1) * segments + j,
        b = 1 + (rings - 1) * segments + next;
      indices.push(a, a + layer, b, b, a + layer, b + layer);
    }
    // The lower crown mirrors the upper crown, reversing its basis.
    if (side < 0)
      for (let i = 0; i < indices.length; i += 3)
        [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return mesh(geometry, material, name);
  };
  const mounts: Array<{
    side: number;
    surface: string;
    cross: number;
    z: number;
    radius: number;
  }> = [];
  for (const side of [-1, 1]) {
    // Two shallow, open corner grips carry the reach from the ladder towards
    // the docking shoulder. They stay ahead of its lamps and off the door wall.
    for (const z of [-0.28, 0.51]) {
      // A rigid straight grasp and two constant-radius return elbows read as
      // a grab bar. The rounded liner does not turn the rail into a loose hose.
      const a = new THREE.Vector3(-0.34, crownY(-0.34, side), z);
      const b = new THREE.Vector3(0.37, crownY(0.37, side), z);
      const along = b.clone().sub(a).normalize();
      const inward = new THREE.Vector3(side * along.y, -side * along.x, 0);
      const lift = 0.14,
        radius = 0.048,
        k = 0.5522847498307936;
      const cornerA = a.clone().addScaledVector(inward, lift);
      const cornerB = b.clone().addScaledVector(inward, lift);
      const returnA = cornerA.clone().addScaledVector(inward, -radius);
      const graspA = cornerA.clone().addScaledVector(along, radius);
      const graspB = cornerB.clone().addScaledVector(along, -radius);
      const returnB = cornerB.clone().addScaledVector(inward, -radius);
      const curve = new THREE.CurvePath();
      curve.add(
        new THREE.LineCurve3(a.clone().addScaledVector(inward, 0.019), returnA),
      );
      curve.add(
        new THREE.CubicBezierCurve3(
          returnA,
          returnA.clone().addScaledVector(inward, k * radius),
          graspA.clone().addScaledVector(along, -k * radius),
          graspA,
        ),
      );
      curve.add(new THREE.LineCurve3(graspA, graspB));
      curve.add(
        new THREE.CubicBezierCurve3(
          graspB,
          graspB.clone().addScaledVector(along, k * radius),
          returnB.clone().addScaledVector(inward, k * radius),
          returnB,
        ),
      );
      curve.add(
        new THREE.LineCurve3(returnB, b.clone().addScaledVector(inward, 0.019)),
      );
      mesh(
        new THREE.TubeGeometry(curve, 64, 0.027, 12, false),
        materials.metal,
        'curved-transfer-handhold',
      );
      tubeSection(
        curve,
        0.235,
        0.765,
        0.038,
        materials.navy,
        'rigid-handhold-grasp',
      );
      tubeSection(
        curve,
        0.23,
        0.25,
        0.04,
        materials.amber,
        'handhold-grip-index',
      );
      tubeSection(
        curve,
        0.75,
        0.77,
        0.04,
        materials.amber,
        'handhold-grip-index',
      );
      for (const x of [-0.34, 0.37]) {
        shoe(
          0.061,
          0.018,
          -0.0015,
          x,
          z,
          side,
          materials.metal,
          'liner-seated-handhold-shoe',
        );
        shoe(
          0.032,
          0.016,
          0.014,
          x,
          z,
          side,
          materials.navy,
          'handhold-anchor-collar',
        );
        mounts.push({ side, surface: 'crown', cross: x, z, radius: 0.061 });
      }
    }
  }
  root.userData.layout = {
    symmetryCenterY: centerY,
    gripDepthsZ: [-0.28, 0.51],
    gripReturnStandOff: 0.14,
    mounts,
    noGrillesOrLouvers: true,
    followsPressureLiner: true,
    noLightsOrControls: true,
  };
  return root;
}
