/** Open transfer grips and retained safety tethers follow the ladder's rounded
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
    equipmentKind: 'curved-transfer-grips-and-retained-safety-tethers',
  };
  parent.add(root);
  const wallX = (y: number) => {
    let left = Infinity;
    for (let i = 0; i < contour.length; i++) {
      const a = contour[i],
        b = contour[(i + 1) % contour.length];
      if (
        Math.abs(a.y - b.y) < 1e-10 ||
        y < Math.min(a.y, b.y) ||
        y > Math.max(a.y, b.y)
      )
        continue;
      left = Math.min(left, a.x + ((b.x - a.x) * (y - a.y)) / (b.y - a.y));
    }
    if (!Number.isFinite(left))
      throw new RangeError('Ladder attachment must lie on the pressure liner');
    return left;
  };
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
    surface: 'bow' | 'crown',
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
    const point = (u: number, v: number, w: number) =>
      surface === 'bow'
        ? [wallX(cross + v) + w, cross + v, z - u]
        : [cross + u, crownY(cross + u, side) - side * w, z + v];
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
    if (surface === 'crown' && side < 0)
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
          'crown',
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
          'crown',
          x,
          z,
          side,
          materials.navy,
          'handhold-anchor-collar',
        );
        mounts.push({ side, surface: 'crown', cross: x, z, radius: 0.061 });
      }
    }
    // An exposed winding spool and its clipped carabiner make the secondary
    // fixture recognizable as a retained safety tether, rather than a control.
    const y = centerY + side * 2.39,
      z = 0.075;
    shoe(
      0.05,
      0.019,
      -0.0015,
      'bow',
      y,
      z,
      side,
      materials.metal,
      'liner-seated-tether-shoe',
    );
    shoe(
      0.026,
      0.147,
      0.012,
      'bow',
      y,
      z,
      side,
      materials.navy,
      'tether-spool-axle',
    );
    mounts.push({ side, surface: 'bow', cross: y, z, radius: 0.05 });
    // Narrow open flanges expose the drum and its deep dark rope winding.
    // There is no solid silver face that could read as a washer or a disc.
    for (const inset of [0.025, 0.153]) {
      const ring = Array.from({ length: 65 }, (_, i) => {
        const angle = (i * Math.PI * 2) / 64,
          py = y + side * Math.cos(angle) * 0.084;
        return [wallX(py) + inset, py, z + Math.sin(angle) * 0.084];
      });
      tube(ring, 0.006, materials.metal, 'open-tether-reel-flange', 64, 8);
      for (let arm = 0; arm < 3; arm++) {
        const angle = (arm * Math.PI * 2) / 3;
        const point = (r: number) => {
          const py = y + side * Math.cos(angle) * r;
          return [wallX(py) + inset, py, z + Math.sin(angle) * r];
        };
        tube(
          [point(0.021), point(0.083)],
          0.0055,
          materials.metal,
          'tether-reel-spoke',
          8,
          8,
        );
      }
    }
    shoe(
      0.056,
      0.114,
      0.031,
      'bow',
      y,
      z,
      side,
      materials.navy,
      'tether-winding-drum-core',
    );
    const windings = Array.from({ length: 241 }, (_, i) => {
      const t = i / 240,
        angle = t * Math.PI * 20,
        py = y + side * Math.cos(angle) * 0.064;
      return [wallX(py) + 0.031 + t * 0.115, py, z + Math.sin(angle) * 0.064];
    });
    tube(windings, 0.0085, materials.navy, 'retained-tether-windings', 240, 8);
    shoe(
      0.017,
      0.01,
      0.159,
      'bow',
      y,
      z,
      side,
      materials.amber,
      'tether-spool-lock-pin',
    );
    const hookY = centerY + side * 2.435,
      hookZ = 0.322;
    const hookPoint = (u: number, v: number, inset = 0.105) => {
      const py = hookY + side * v;
      return [wallX(py) + inset, py, hookZ + u];
    };
    const hook = [
      [0.031, 0.06],
      [0, 0.084],
      [-0.04, 0.057],
      [-0.046, 0.003],
      [-0.037, -0.054],
      [0.004, -0.079],
      [0.039, -0.05],
    ];
    const hookCurve = tube(
      hook.map(([u, v]) => hookPoint(u, v)),
      0.0105,
      materials.metal,
      'clipped-tether-carabiner',
      40,
    );
    tube(
      [hookPoint(0.039, -0.05), hookPoint(0.031, 0.06)],
      0.008,
      materials.navy,
      'carabiner-spring-gate',
      8,
    );
    tube(
      [hookPoint(0.036, -0.006), hookPoint(0.034, 0.019)],
      0.012,
      materials.amber,
      'carabiner-gate-lock',
      8,
    );
    // The hook is captured on a real peg; the short slack lead terminates on
    // its frame, and every winding stays on the drum between its flanges.
    shoe(
      0.024,
      0.105,
      -0.0015,
      'bow',
      hookY + side * 0.041,
      hookZ - 0.029,
      side,
      materials.navy,
      'carabiner-retaining-peg',
    );
    shoe(
      0.03,
      0.012,
      0.101,
      'bow',
      hookY + side * 0.041,
      hookZ - 0.029,
      side,
      materials.metal,
      'carabiner-peg-end-stop',
    );
    tube(
      [
        windings[windings.length - 1],
        [wallX(y + side * 0.07) + 0.18, y + side * 0.07, 0.16],
        [wallX(hookY + side * 0.052) + 0.12, hookY + side * 0.052, 0.245],
        hookCurve.getPointAt(0.16).toArray(),
      ],
      0.0075,
      materials.navy,
      'spool-to-carabiner-safety-lead',
      28,
      8,
    );
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
