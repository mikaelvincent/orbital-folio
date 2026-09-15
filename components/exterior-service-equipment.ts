/** A continuous, open EVA access route climbs the docking shoulder and crosses
 * the visible roof. Tubular rails, glove-clear rungs and real restrained mounts
 * explain the structure without filling the hull with anonymous closed panels.
 */
export function buildExteriorServiceEquipment(
  THREE: any,
  h: any,
  parent: any,
  materials: any,
  { datums: d, profiles, bowContour, variant }: any,
) {
  const root = new THREE.Group();
  root.name = variant + '-exterior-service-equipment';
  root.userData = {
    section: 'contact',
    exterior: true,
    equipmentKind: 'exterior-eva-access',
    excludePick: true,
    batchRoot: true,
    static: true,
  };
  parent.add(root);
  const parts: any[] = [],
    routes: any[] = [],
    mounts: any[] = [];
  const zCenter = 0.35,
    halfWidth = 0.425,
    clearance = 0.205;
  const railRadius = 0.037,
    rungRadius = 0.029;
  const zAxis = new THREE.Vector3(0, 0, 1),
    yAxis = new THREE.Vector3(0, 1, 0);
  const mesh = (geometry: any, material: any, name: string) => {
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const object = h.mesh(geometry, material, root, 'exterior-eva-' + name);
    parts.push({
      name,
      triangles:
        (geometry.index?.count ?? geometry.attributes.position.count) / 3,
      bounds: [
        geometry.boundingBox.min.toArray(),
        geometry.boundingBox.max.toArray(),
      ],
    });
    return object;
  };
  const cylinder = (
    a: any,
    b: any,
    radius: number,
    material: any,
    name: string,
  ) => {
    const delta = b.clone().sub(a),
      geometry = new THREE.CylinderGeometry(
        radius,
        radius,
        delta.length(),
        20,
        1,
        false,
      );
    geometry.applyQuaternion(
      new THREE.Quaternion().setFromUnitVectors(
        yAxis,
        delta.clone().normalize(),
      ),
    );
    geometry.translate(...a.clone().add(b).multiplyScalar(0.5).toArray());
    return mesh(geometry, material, name);
  };
  const ring = (
    center: any,
    normal: any,
    radius: number,
    tube: number,
    material: any,
    name: string,
  ) => {
    const geometry = new THREE.TorusGeometry(radius, tube, 10, 28);
    geometry.applyQuaternion(
      new THREE.Quaternion().setFromUnitVectors(zAxis, normal),
    );
    geometry.translate(...center.toArray());
    return mesh(geometry, material, name);
  };
  const bowX = (y: number) => {
    let x = Infinity;
    for (let i = 0; i < bowContour.length; i++) {
      const a = bowContour[i],
        b = bowContour[(i + 1) % bowContour.length];
      if (
        Math.abs(b.y - a.y) < 1e-10 ||
        y < Math.min(a.y, b.y) - 1e-8 ||
        y > Math.max(a.y, b.y) + 1e-8
      )
        continue;
      x = Math.min(x, a.x + ((b.x - a.x) * (y - a.y)) / (b.y - a.y));
    }
    if (!Number.isFinite(x))
      throw new RangeError('EVA mount must lie on the pressure bow');
    return x;
  };
  const sourceArc = bowContour
    .filter(
      (p: any) => p.x <= d.bowTangentX + 1e-6 && p.y >= d.ladderCenterY + 1.28,
    )
    .sort((a: any, b: any) => a.y - b.y);
  const uniqueArc = sourceArc.filter(
    (p: any, i: number) => !i || p.distanceTo(sourceArc[i - 1]) > 1e-6,
  );
  const startY = d.ladderCenterY + 1.28;
  const arc = [
    new THREE.Vector3(bowX(startY), startY, zCenter),
    ...uniqueArc.map((p: any) => new THREE.Vector3(p.x, p.y, zCenter)),
  ];
  const tangent = new THREE.Vector3(
    d.bowTangentX,
    profiles.roofAt(d.bowTangentX, zCenter),
    zCenter,
  );
  if (arc[arc.length - 1].distanceTo(tangent) > 1e-6) arc.push(tangent);
  // Frequent roof support points preserve a straight tangent after the curved
  // shoulder. The tube follows one continuous path, not disconnected ladders.
  const endX = d.right - 0.64;
  const roofSpan = endX - tangent.x;
  for (let i = 1; i <= Math.ceil(roofSpan / 0.5); i++)
    arc.push(
      new THREE.Vector3(
        tangent.x + (roofSpan * i) / Math.ceil(roofSpan / 0.5),
        tangent.y,
        zCenter,
      ),
    );
  const mainPath = new THREE.CatmullRomCurve3(arc, false, 'centripetal');
  mainPath.arcLengthDivisions = 800;
  mainPath.updateArcLengths();
  const centerline = (path: any, t: number) => {
    const p = path.getPointAt(t),
      tangent = path.getTangentAt(t).normalize();
    const normal = new THREE.Vector3(-tangent.y, tangent.x, 0).normalize();
    return { p, tangent, normal };
  };
  const surface = (p: any, z: number, side: number) => {
    if (side > 0 && p.x >= d.bowTangentX - 1e-5)
      return new THREE.Vector3(p.x, profiles.roofAt(p.x, z), z);
    const y = p.y,
      q = profiles.bowPointAtZ(new THREE.Vector2(bowX(y), y), z);
    return new THREE.Vector3(q.x, q.y, z);
  };
  const station = (path: any, t: number, side: number) => {
    const sample = centerline(path, t);
    if (side < 0) sample.normal.negate();
    return sample;
  };
  const buildRoute = (
    name: string,
    path: any,
    side: number,
    spacing: number,
  ) => {
    const length = path.getLength();
    const count = Math.max(3, Math.round((length - 0.38) / spacing) + 1);
    const rungPositions = Array.from(
      { length: count },
      (_, i) => (0.19 + ((length - 0.38) * i) / (count - 1)) / length,
    );
    const anchorCount = Math.max(2, Math.ceil(length / 1.22) + 1);
    const anchorPositions = Array.from(
      { length: anchorCount },
      (_, i) => i / (anchorCount - 1),
    );
    const actualRungs: any[] = [];
    for (const railSide of [-1, 1]) {
      const points = [];
      for (let i = 0; i <= Math.ceil(length / 0.085); i++) {
        const t = i / Math.ceil(length / 0.085),
          q = station(path, t, side);
        const p = q.p.clone().addScaledVector(q.normal, clearance);
        p.z = zCenter + railSide * halfWidth;
        points.push(p);
      }
      const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
      mesh(
        new THREE.TubeGeometry(
          curve,
          Math.max(24, Math.ceil(length / 0.055)),
          railRadius,
          14,
          false,
        ),
        materials.navy,
        name + '-continuous-rail',
      );
      for (const t of [0, 1]) {
        const q = station(path, t, side),
          p = q.p.clone().addScaledVector(q.normal, clearance);
        p.z = zCenter + railSide * halfWidth;
        const cap = new THREE.SphereGeometry(railRadius, 16, 10);
        cap.translate(...p.toArray());
        mesh(cap, materials.navy, name + '-rounded-rail-end');
      }
      for (const t of anchorPositions) {
        const q = station(path, t, side),
          z = zCenter + railSide * halfWidth;
        const foot = surface(q.p, z, side),
          rail = q.p.clone().addScaledVector(q.normal, clearance);
        rail.z = z;
        // Circular bonded feet and a short rigid strut meet the actual hull.
        // These small mounts support the rails rather than decorating empty space.
        cylinder(
          foot.clone().addScaledVector(q.normal, -0.005),
          foot.clone().addScaledVector(q.normal, 0.023),
          0.074,
          materials.navy,
          name + '-bonded-mount-foot',
        );
        cylinder(
          foot.clone().addScaledVector(q.normal, 0.016),
          rail.clone().addScaledVector(q.normal, -0.006),
          0.024,
          materials.metal,
          name + '-rigid-standoff',
        );
        ring(
          foot.clone().addScaledVector(q.normal, 0.024),
          q.normal,
          0.051,
          0.006,
          materials.metal,
          name + '-mount-edge',
        );
        cylinder(
          rail.clone().addScaledVector(q.tangent, -0.045),
          rail.clone().addScaledVector(q.tangent, 0.045),
          0.047,
          materials.metal,
          name + '-split-rail-clamp',
        );
        // One seam in each split clamp is a mechanical joint, never a grille.
        ring(
          rail,
          q.tangent,
          0.047,
          0.005,
          materials.navy,
          name + '-clamp-separation',
        );
        mounts.push({
          route: name,
          t,
          railSide,
          skin: foot.toArray(),
          normal: q.normal.toArray(),
          rail: rail.toArray(),
        });
      }
    }
    for (const t of rungPositions) {
      const q = station(path, t, side),
        p = q.p.clone().addScaledVector(q.normal, clearance);
      const a = p.clone(),
        b = p.clone();
      a.z = zCenter - halfWidth;
      b.z = zCenter + halfWidth;
      cylinder(a, b, rungRadius, materials.metal, name + '-open-rung');
      const gripA = p.clone(),
        gripB = p.clone();
      gripA.z = zCenter - 0.175;
      gripB.z = zCenter + 0.175;
      cylinder(gripA, gripB, 0.033, materials.navy, name + '-rung-grip-sleeve');
      for (const z of [zCenter - halfWidth, zCenter + halfWidth]) {
        const socket = p.clone();
        socket.z = z;
        cylinder(
          socket.clone().addScaledVector(zAxis, -0.049),
          socket.clone().addScaledVector(zAxis, 0.049),
          0.042,
          materials.navy,
          name + '-rung-socket',
        );
      }
      actualRungs.push({ center: p.toArray(), t });
    }
    const tetherPositions = name === 'main' ? [0.06, 0.53, 0.95] : [0.5];
    for (const t of tetherPositions) {
      const q = station(path, t, side),
        rail = q.p.clone().addScaledVector(q.normal, clearance);
      rail.z = zCenter + halfWidth;
      const eye = rail
        .clone()
        .addScaledVector(zAxis, 0.086)
        .addScaledVector(q.normal, 0.016);
      cylinder(rail, eye, 0.027, materials.metal, name + '-tether-eye-neck');
      ring(
        eye,
        q.tangent,
        0.069,
        0.014,
        materials.metal,
        name + '-open-tether-eye',
      );
      ring(
        rail,
        q.tangent,
        0.041,
        0.008,
        materials.amber,
        name + '-tether-anchor-marker',
      );
    }
    routes.push({
      name,
      length,
      rungCount: count,
      rungSpacing: (length - 0.38) / (count - 1),
      rungs: actualRungs,
      anchorCount,
      centerline: Array.from({ length: 65 }, (_, i) => {
        const q = station(path, i / 64, side);
        return { p: q.p.toArray(), normal: q.normal.toArray() };
      }),
    });
  };
  buildRoute('main', mainPath, 1, 0.51);
  // A compact docking transfer station mirrors the first part of the climb.
  // It offers hand/foot purchase and a tether eye below the sleeve, without a
  // decorative route vanishing around the concealed keel.
  const transferLength = 1.12,
    lowerPoints = [];
  for (let i = 0; i <= 24; i++) {
    const p = mainPath.getPointAt(
      ((transferLength / mainPath.getLength()) * i) / 24,
    );
    p.y = 2 * d.ladderCenterY - p.y;
    lowerPoints.push(p);
  }
  const lowerPath = new THREE.CatmullRomCurve3(
    lowerPoints,
    false,
    'centripetal',
  );
  lowerPath.arcLengthDivisions = 160;
  lowerPath.updateArcLengths();
  buildRoute('docking-transfer', lowerPath, -1, 0.37);
  root.userData.layout = {
    variant,
    evaAccessRoute: true,
    exposedSurfacesOnly: true,
    hiddenRearGeometry: false,
    zCenter,
    railSeparation: 2 * halfWidth,
    railRadius,
    rungRadius,
    nominalRailClearance: clearance,
    cutawayFrontLimitZ: 1.02,
    sourceParts: parts.length,
    routes,
    mounts,
    parts,
  };
  return root;
}
