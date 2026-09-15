/** A matched pair of portable rescue torches, secured in open quick-release
 * holsters on the actual curved docking liner. Recessed pale optics, flared
 * heads and graspable dark barrels make the equipment recognizable at a glance.
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
  root.name = prefix + 'rescue-torches';
  root.userData = {
    section: 'walkway',
    batchRoot: true,
    excludePick: true,
    static: true,
    equipmentKind: 'holstered-rescue-torches',
  };
  parent.add(root);
  const material = (
    name: string,
    color: number,
    roughness: number,
    metalness: number,
  ) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    m.name = prefix + name;
    m.envMapIntensity = 0.17;
    m.userData.highlightScale = 0.018;
    return m;
  };
  const m = {
    navy: material('torch-graphite', 0x25343e, 0.61, 0.12),
    alloy: material('torch-satin-alloy', 0xa2acae, 0.36, 0.56),
    lens: material('torch-pale-optics', 0xe1e4d6, 0.23, 0.22),
    amber: material('holster-release-latches', 0xd3943e, 0.5, 0.2),
  };
  const mounts: any[] = [],
    torches: any[] = [],
    parts: string[] = [];
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
      left = Math.min(left, a.x + ((b.x - a.x) * (y - a.y)) / (b.y - a.y));
    }
    if (!Number.isFinite(left))
      throw new RangeError('Torch holster must fit inside the docking contour');
    return left;
  };
  const yAxis = new THREE.Vector3(0, 1, 0),
    zAxis = new THREE.Vector3(0, 0, 1);
  const emit = (geometry: any, material: any, name: string, matrix?: any) => {
    if (matrix) geometry.applyMatrix4(matrix);
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    parts.push(name);
    return h.mesh(geometry, material, root, prefix + name);
  };
  for (const side of [-1, 1]) {
    const y = centerY + side * 1.66;
    const slope = (wallX(y + 0.006) - wallX(y - 0.006)) / 0.012;
    const tangent = new THREE.Vector3(slope, 1, 0).normalize();
    const normal = new THREE.Vector3(1, -slope, 0).normalize();
    // Both optics face partly forward so the lower-deck lens remains visible
    // from the regular view, instead of pointing down into the hull.
    const axis = tangent
      .clone()
      .multiplyScalar(side * 0.83)
      .addScaledVector(zAxis, 0.558)
      .normalize();
    const cross = new THREE.Vector3().crossVectors(normal, axis).normalize();
    const origin = new THREE.Vector3(wallX(y), y, 0).addScaledVector(
      normal,
      0.235,
    );
    const matrix = new THREE.Matrix4()
      .makeBasis(normal, axis, cross)
      .setPosition(origin);
    const localPoint = (x: number, y: number, z: number) =>
      new THREE.Vector3(x, y, z).applyMatrix4(matrix);
    const cylinder = (
      r0: number,
      r1: number,
      height: number,
      cy: number,
      material: any,
      name: string,
    ) => {
      const geometry = new THREE.CylinderGeometry(r1, r0, height, 32, 1, false);
      geometry.translate(0, cy, 0);
      return emit(geometry, material, name, matrix);
    };
    const ring = (
      r: number,
      tube: number,
      cy: number,
      material: any,
      name: string,
      arc = Math.PI * 2,
      start = 0,
    ) => {
      const geometry = new THREE.TorusGeometry(r, tube, 12, 40, arc);
      geometry.rotateZ(start);
      geometry.rotateX(Math.PI / 2);
      geometry.translate(0, cy, 0);
      return emit(geometry, material, name, matrix);
    };
    // Broad, smooth silhouette: heel cap, substantial grip, flared optical head.
    cylinder(0.056, 0.059, 0.385, -0.1125, m.navy, 'torch-graspable-barrel');
    cylinder(0.063, 0.063, 0.235, -0.115, m.navy, 'torch-rubber-grip');
    cylinder(0.059, 0.059, 0.034, -0.32, m.alloy, 'torch-captured-heel-cap');
    ring(0.055, 0.009, -0.338, m.navy, 'torch-rounded-heel-edge');
    cylinder(0.06, 0.086, 0.11, 0.1375, m.navy, 'torch-flared-neck');
    cylinder(0.086, 0.113, 0.085, 0.235, m.alloy, 'torch-flared-optical-head');
    const bezel = new THREE.LatheGeometry(
      [
        new THREE.Vector2(0.096, 0.2775),
        new THREE.Vector2(0.113, 0.2775),
        new THREE.Vector2(0.113, 0.3225),
        new THREE.Vector2(0.096, 0.3225),
        new THREE.Vector2(0.096, 0.2775),
      ],
      40,
    );
    emit(bezel, m.navy, 'torch-open-optical-bezel', matrix);
    ring(0.104, 0.012, 0.324, m.alloy, 'torch-rounded-lens-bezel');
    // A shallow concave reflector surrounds the off-state optic; no light or
    // emissive material is added to the scene.
    const reflector = new THREE.LatheGeometry(
      [
        new THREE.Vector2(0.018, 0.285),
        new THREE.Vector2(0.033, 0.289),
        new THREE.Vector2(0.073, 0.309),
        new THREE.Vector2(0.096, 0.321),
      ].reverse(),
      40,
    );
    emit(reflector, m.lens, 'torch-recessed-reflector', matrix);
    cylinder(0.022, 0.029, 0.013, 0.287, m.navy, 'torch-led-seat');
    const optic = new THREE.SphereGeometry(
      0.026,
      24,
      12,
      0,
      Math.PI * 2,
      0,
      Math.PI / 2,
    );
    optic.scale(1, 0.4, 1);
    optic.translate(0, 0.3, 0);
    emit(optic, m.lens, 'torch-pale-optic', matrix);
    // Two open saddles leave the barrel exposed to the hand. Only the upper
    // saddle carries a hinged release strap; the lower one supports the heel.
    for (const cy of [-0.215, 0.055]) {
      ring(
        0.073,
        0.014,
        cy,
        m.alloy,
        'holster-open-saddle',
        (Math.PI * 4) / 3,
        Math.PI / 3,
      );
      for (const a of [Math.PI / 3, (Math.PI * 5) / 3]) {
        const cap = new THREE.SphereGeometry(0.014, 12, 8);
        cap.translate(0.073 * Math.cos(a), cy, 0.073 * Math.sin(a));
        emit(cap, m.alloy, 'holster-rounded-saddle-end', matrix);
      }
      const back = localPoint(-0.092, cy, 0),
        py = back.y,
        pz = back.z;
      const skin = new THREE.Vector3(wallX(py), py, pz);
      const n = new THREE.Vector3(
        1,
        -(wallX(py + 0.005) - wallX(py - 0.005)) / 0.01,
        0,
      ).normalize();
      const postDelta = back.clone().sub(skin),
        post = new THREE.CylinderGeometry(0.023, 0.023, postDelta.length(), 20);
      post.applyQuaternion(
        new THREE.Quaternion().setFromUnitVectors(
          yAxis,
          postDelta.clone().normalize(),
        ),
      );
      post.translate(...back.clone().add(skin).multiplyScalar(0.5).toArray());
      emit(post, m.alloy, 'holster-rigid-post');
      const foot = new THREE.CylinderGeometry(0.053, 0.053, 0.024, 24);
      foot.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(yAxis, n));
      foot.translate(...skin.clone().addScaledVector(n, 0.01).toArray());
      emit(foot, m.navy, 'holster-bonded-mount-foot');
      mounts.push({
        side,
        skin: skin.toArray(),
        normal: n.toArray(),
        postEnd: back.toArray(),
      });
    }
    for (const z of [-0.036, 0.036]) {
      const spine = new THREE.CylinderGeometry(0.012, 0.012, 0.315, 16);
      spine.translate(-0.087, -0.095, z);
      emit(spine, m.navy, 'holster-open-backing-rail', matrix);
    }
    ring(
      0.074,
      0.01,
      0.055,
      m.navy,
      'holster-captive-release-strap',
      (Math.PI * 2) / 3,
      -Math.PI / 3,
    );
    const release = h.box(
      0.029,
      0.094,
      0.024,
      m.amber,
      0,
      0,
      0,
      root,
      0.009,
      prefix + 'holster-quick-release-lever',
    );
    const leverGeo = release.geometry.clone();
    leverGeo.translate(0.04, 0.055, 0.067);
    leverGeo.applyMatrix4(matrix);
    release.geometry = leverGeo;
    parts.push('holster-quick-release-lever');
    // A small heel cradle makes the torch positively retained in zero gravity.
    const cradle = new THREE.CylinderGeometry(0.041, 0.041, 0.026, 24);
    cradle.translate(-0.036, -0.345, 0);
    emit(cradle, m.alloy, 'holster-heel-stop', matrix);
    torches.push({
      side,
      center: origin.toArray(),
      axis: axis.toArray(),
      lens: localPoint(0, 0.32, 0).toArray(),
      grip: localPoint(0, -0.115, 0).toArray(),
      normal: normal.toArray(),
    });
  }
  root.userData.layout = {
    symmetryCenterY: centerY,
    centerOffsetsY: [-1.66, 1.66],
    torches,
    mounts,
    parts,
    followsPressureLiner: true,
    noLightsOrControls: true,
    lensFacesForward: true,
    openHolsters: true,
  };
  return root;
}
