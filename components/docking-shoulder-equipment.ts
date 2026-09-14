/** Flush, paired service cassettes on the docking bay's curved pressure liner.
 * The rear of each enclosure follows the same sampled contour as the wall;
 * these are sealed service covers, not additional navigation controls.
 */
export function buildDockingShoulderEquipment(
  THREE: any,
  h: any,
  parent: any,
  wallContour: Array<{ x: number; y: number }>,
  centerY: number,
) {
  const prefix = 'docking-shoulder-';
  const root = new THREE.Group();
  root.name = prefix + 'service-cassettes';
  root.userData = {
    section: 'walkway',
    batchRoot: true,
    excludePick: true,
    static: true,
    equipmentKind: 'sealed-pressure-service-cassettes',
  };
  parent.add(root);
  const material = (
    name: string,
    color: number,
    roughness: number,
    metalness: number,
  ) => {
    const value = new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
    });
    value.name = prefix + name;
    value.envMapIntensity = 0.12;
    value.userData.highlightScale = 0.018;
    return value;
  };
  const m = {
    navy: material('protective-graphite', 0x26343e, 0.7, 0.12),
    cream: material('enamel-cover', 0xc9c0ad, 0.7, 0.08),
    alloy: material('brushed-alloy', 0x849393, 0.5, 0.45),
    amber: material('captive-retainers', 0xc78528, 0.56, 0.18),
  };
  // Intersect the actual liner polyline rather than approximating the bow
  // with an ellipse, which could leave the mounting flange floating at angles.
  const wallX = (y: number) => {
    let left = Infinity;
    for (let i = 0; i < wallContour.length; i++) {
      const a = wallContour[i],
        b = wallContour[(i + 1) % wallContour.length];
      if (
        Math.abs(b.y - a.y) < 1e-10 ||
        y < Math.min(a.y, b.y) ||
        y > Math.max(a.y, b.y)
      )
        continue;
      const t = (y - a.y) / (b.y - a.y);
      left = Math.min(left, a.x + (b.x - a.x) * t);
    }
    if (!Number.isFinite(left))
      throw new RangeError(
        'Docking cassette must fit inside the shoulder contour',
      );
    return left;
  };
  const surfaceBox = (
    width: number,
    height: number,
    depth: number,
    material: any,
    cross: number,
    y: number,
    inset: number,
    name: string,
    radius: number,
  ) => {
    const object = h.box(
      width,
      height,
      depth,
      material,
      0,
      0,
      0,
      root,
      radius,
      prefix + name,
    );
    // h.box geometry is cached elsewhere in the model; deform a private copy.
    const geometry = object.geometry.clone();
    const positions = geometry.getAttribute('position');
    for (let i = 0; i < positions.count; i++) {
      const py = y + positions.getY(i);
      const pz = -(cross + positions.getX(i));
      const px = wallX(py) + inset + positions.getZ(i);
      positions.setXYZ(i, px, py, pz);
    }
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    object.geometry = geometry;
    return object;
  };
  const offsets = [-1.66, 1.66];
  for (const offset of offsets) {
    const y = centerY + offset;
    // Broad rounded silhouettes survive the overview, with restrained detail.
    // A shared depth axis lines both cassettes up with the docking hatch.
    surfaceBox(
      0.71,
      0.66,
      0.068,
      m.navy,
      0,
      y,
      0.032,
      'contoured-housing',
      0.046,
    );
    surfaceBox(
      0.593,
      0.526,
      0.03,
      m.cream,
      0,
      y,
      0.079,
      'sealed-access-cover',
      0.038,
    );
    surfaceBox(
      0.386,
      0.079,
      0.012,
      m.navy,
      0,
      y,
      0.098,
      'recessed-service-seam',
      0.022,
    );
    surfaceBox(
      0.26,
      0.026,
      0.013,
      m.alloy,
      0,
      y,
      0.103,
      'captured-seam-insert',
      0.008,
    );
    for (const cross of [-0.251, 0.251]) {
      surfaceBox(
        0.049,
        0.142,
        0.016,
        m.navy,
        cross,
        y,
        0.1,
        'retainer-pocket',
        0.012,
      );
      surfaceBox(
        0.027,
        0.092,
        0.014,
        m.amber,
        cross,
        y,
        0.111,
        'captive-quarter-turn-retainer',
        0.01,
      );
    }
    // Substantial hinge leaves and witness marks, not a field of tiny screws.
    for (const dy of [-0.246, 0.246])
      surfaceBox(
        0.151,
        0.029,
        0.013,
        m.alloy,
        0,
        y + dy,
        0.1,
        'captured-hinge-leaf',
        0.008,
      );
  }
  root.userData.layout = {
    symmetryCenterY: centerY,
    centers: offsets.map((offset) => [
      wallX(centerY + offset),
      centerY + offset,
      0,
    ]),
    maxProjection: 0.118,
    dockingAxisZ: 0,
    housingSize: [0.71, 0.66, 0.068],
    roundedCasings: true,
    followsPressureLiner: true,
  };
  return root;
}
