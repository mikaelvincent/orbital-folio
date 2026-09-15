/** Sealed roof and docking-shoulder access/shield panels in the visible camera envelope.
 * The fittings follow the pressure skin's own surface function and stay clear
 * of the front cutaway, docking approach and service module.
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
    equipmentKind: 'sealed-exterior-access-panels',
    excludePick: true,
    batchRoot: true,
    static: true,
  };
  parent.add(root);
  const s = d.scale;
  const parts: any[] = [];
  const shape = (width: number, height: number, radius: number) => {
    const x = width / 2,
      y = height / 2;
    const r = Math.min(radius, x * 0.8, y * 0.8);
    const result = new THREE.Shape();
    result.moveTo(-x + r, -y);
    result.lineTo(x - r, -y);
    result.quadraticCurveTo(x, -y, x, -y + r);
    result.lineTo(x, y - r);
    result.quadraticCurveTo(x, y, x - r, y);
    result.lineTo(-x + r, y);
    result.quadraticCurveTo(-x, y, -x, y - r);
    result.lineTo(-x, -y + r);
    result.quadraticCurveTo(-x, -y, -x + r, -y);
    return result;
  };
  const panel = (
    name: string,
    width: number,
    height: number,
    depth: number,
    radius: number,
    material: any,
    centerX: number,
    centerV: number,
    offset: number,
  ) => {
    // Small dedicated extrusions avoid applying the model's fully tessellated
    // furniture boxes to broad, nearly flat exterior sheets.
    const bevel = Math.min(0.004, depth / 4);
    const geometry = new THREE.ExtrudeGeometry(
      shape(width - 2 * bevel, height - 2 * bevel, radius - bevel),
      {
        depth: depth - 2 * bevel,
        bevelEnabled: true,
        bevelSize: bevel,
        bevelThickness: bevel,
        bevelSegments: 1,
        curveSegments: 4,
        steps: 1,
      },
    );
    geometry.translate(0, 0, bevel);
    const p = geometry.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i),
        v = p.getY(i),
        w = p.getZ(i);
      const x = centerX + u;
      const depthOffset = offset + w;
      const z = centerV - v;
      p.setXYZ(i, x, profiles.roofAt(x, z) + depthOffset, z);
    }
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const mesh = h.mesh(geometry, material, root, 'exterior-service-' + name);
    parts.push({
      name,
      surface: 'roof',
      center: [centerX, centerV],
      size: [width, height, depth],
      offset,
      bounds: [
        geometry.boundingBox.min.toArray(),
        geometry.boundingBox.max.toArray(),
      ],
    });
    return mesh;
  };
  // Broad solid shields fill the visible roof depth, including the former bare
  // front strip. Protected captive latches and one hinge make their purpose clear.
  for (const x of [-d.halfPitch, d.halfPitch]) {
    panel(
      'roof-seated-gasket',
      1.98 * s,
      1.46,
      0.03,
      0.12,
      materials.navy,
      x,
      0.2,
      -0.002,
    );
    panel(
      'roof-protective-perimeter',
      1.84 * s,
      1.34,
      0.024,
      0.1,
      materials.metal,
      x,
      0.2,
      0.026,
    );
    panel(
      'roof-sealed-shield-cover',
      1.68 * s,
      1.18,
      0.025,
      0.085,
      materials.chalk,
      x,
      0.2,
      0.048,
    );
    for (const side of [-1, 1]) {
      panel(
        'roof-captive-latch-pocket',
        0.095 * s,
        0.21,
        0.014,
        0.026,
        materials.navy,
        x + side * 0.889 * s,
        0.2,
        0.05,
      );
      panel(
        'roof-captive-latch',
        0.037 * s,
        0.113,
        0.012,
        0.014,
        materials.amber,
        x + side * 0.889 * s,
        0.2,
        0.063,
      );
    }
    panel(
      'roof-captured-hinge',
      0.61 * s,
      0.04,
      0.014,
      0.014,
      materials.metal,
      x,
      -0.403,
      0.048,
    );
  }

  const bowAt = (y: number, z: number) => {
    let left = Infinity;
    for (let i = 0; i < bowContour.length; i++) {
      const a = bowContour[i],
        b = bowContour[(i + 1) % bowContour.length];
      if (
        Math.abs(b.y - a.y) < 1e-9 ||
        y < Math.min(a.y, b.y) ||
        y > Math.max(a.y, b.y)
      )
        continue;
      left = Math.min(left, a.x + ((b.x - a.x) * (y - a.y)) / (b.y - a.y));
    }
    if (!Number.isFinite(left))
      throw new RangeError('Shoulder shield lies outside the exterior contour');
    return profiles.bowPointAtZ(new THREE.Vector2(left, y), z);
  };
  // A fitted, sealed cover pair protects the docking services. The wider roof
  // panels and these curved shoulder covers occupy only front-visible surfaces.
  const shoulder = (
    name: string,
    width: number,
    height: number,
    depth: number,
    radius: number,
    material: any,
    side: number,
    offset: number,
  ) => {
    const centerY = d.ladderCenterY + side * 1.7,
      centerZ = 0.42;
    // Dense only along the one curved axis. The cross-section is a rounded
    // rectangle and the face strips follow the real bow instead of bridging it.
    const positions: number[] = [],
      indices: number[] = [],
      uv: number[] = [];
    const rows = 20,
      cols = 4;
    const halfWidth = (y: number) =>
      width / 2 -
      radius +
      Math.sqrt(
        Math.max(
          0,
          radius * radius - Math.max(0, Math.abs(y) - height / 2 + radius) ** 2,
        ),
      );
    for (const w of [0, depth])
      for (let j = 0; j <= rows; j++) {
        const v = -height / 2 + (height * j) / rows;
        for (let i = 0; i <= cols; i++) {
          const u = halfWidth(v) * ((2 * i) / cols - 1),
            z = centerZ + u;
          const q = bowAt(centerY + v, z);
          positions.push(q.x - offset - w, q.y, z);
          uv.push(i / cols, j / rows);
        }
      }
    const layer = (rows + 1) * (cols + 1);
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) {
        const a = j * (cols + 1) + i,
          b = a + cols + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
        indices.push(
          layer + a,
          layer + a + 1,
          layer + b,
          layer + b,
          layer + a + 1,
          layer + b + 1,
        );
      }
    const boundary: number[] = [];
    for (let i = 0; i <= cols; i++) boundary.push(i);
    for (let j = 1; j <= rows; j++) boundary.push(j * (cols + 1) + cols);
    for (let i = cols - 1; i >= 0; i--) boundary.push(rows * (cols + 1) + i);
    for (let j = rows - 1; j > 0; j--) boundary.push(j * (cols + 1));
    for (let k = 0; k < boundary.length; k++) {
      const a = boundary[k],
        b = boundary[(k + 1) % boundary.length];
      indices.push(a, b, a + layer, b, b + layer, a + layer);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const object = h.mesh(geometry, material, root, 'exterior-service-' + name);
    parts.push({
      name,
      surface: 'shoulder',
      side,
      center: [centerY, centerZ],
      size: [width, height, depth],
      offset,
      bounds: [
        geometry.boundingBox.min.toArray(),
        geometry.boundingBox.max.toArray(),
      ],
    });
    return object;
  };
  for (const side of [-1, 1]) {
    shoulder(
      'shoulder-seated-gasket',
      0.82,
      0.55,
      0.024,
      0.075,
      materials.navy,
      side,
      -0.002,
    );
    shoulder(
      'shoulder-protective-perimeter',
      0.73,
      0.465,
      0.022,
      0.063,
      materials.metal,
      side,
      0.019,
    );
    shoulder(
      'shoulder-sealed-service-cover',
      0.65,
      0.39,
      0.023,
      0.052,
      materials.chalk,
      side,
      0.038,
    );
  }
  root.userData.layout = {
    variant,
    sealedServiceHardware: true,
    exposedSurfacesOnly: true,
    hiddenRearGeometry: false,
    surfaceMounted: true,
    symmetryAxisX: 0,
    cabinColumnAxes: [-d.halfPitch, d.halfPitch],
    cutawayFrontLimitZ: 0.94,
    roofDepthRange: [-0.53, 0.93],
    maximumProjection: 0.1,
    sourceParts: parts.length,
    parts,
  };
  return root;
}
