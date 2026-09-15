/** Matched sealed utility covers and crown panels finish both ladder ends.
 * Low-profile housings follow the pressure liner instead of floating on rails.
 */
export function buildLadderEndcapEquipment(
  THREE: any,
  h: any,
  parent: any,
  contour: Array<{ x: number; y: number }>,
  centerY: number,
  materials: { navy: any; liner: any; metal: any },
) {
  const root = new THREE.Group();
  root.name = 'ladder-end-sealed-equipment';
  root.userData = {
    section: 'walkway',
    batchRoot: true,
    excludePick: true,
    static: true,
    equipmentKind: 'paired-sealed-utility-and-crown-panels',
  };
  parent.add(root);
  function wallX(y: number) {
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
      throw new RangeError('Ladder equipment must lie on the pressure liner');
    return left;
  }
  function panel(
    width: number,
    height: number,
    depth: number,
    radius: number,
    y: number,
    inset: number,
    material: any,
    name: string,
    surface: 'bow' | 'crown' = 'bow',
    cross = 0,
  ) {
    const l = -width / 2,
      b = -height / 2,
      r = radius;
    const shape = new THREE.Shape();
    shape.moveTo(l + r, b);
    shape.lineTo(l + width - r, b);
    shape.quadraticCurveTo(l + width, b, l + width, b + r);
    shape.lineTo(l + width, b + height - r);
    shape.quadraticCurveTo(l + width, b + height, l + width - r, b + height);
    shape.lineTo(l + r, b + height);
    shape.quadraticCurveTo(l, b + height, l, b + height - r);
    shape.lineTo(l, b + r);
    shape.quadraticCurveTo(l, b, l + r, b);
    shape.closePath();
    const bevel = Math.min(0.006, depth / 4);
    let geometry: any = new THREE.ExtrudeGeometry(shape, {
      depth: depth - 2 * bevel,
      steps: 1,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 2,
      curveSegments: 6,
    });
    if (surface === 'crown') {
      // Subdivide along the curved X axis. Bending only the outline of a large
      // cap would leave its interior triangles bridging above the pressure skin.
      const p: number[] = [],
        indices: number[] = [],
        uv: number[] = [];
      const rows = 20,
        cols = 4;
      for (const w of [-bevel, depth - bevel])
        for (let j = 0; j <= rows; j++) {
          const u = -width / 2 + (width * j) / rows;
          const half =
            height / 2 -
            radius +
            Math.sqrt(
              Math.max(
                0,
                radius * radius -
                  Math.max(0, Math.abs(u) - width / 2 + radius) ** 2,
              ),
            );
          for (let i = 0; i <= cols; i++) {
            p.push(u, half * ((2 * i) / cols - 1), w);
            uv.push(j / rows, i / cols);
          }
        }
      const layer = (rows + 1) * (cols + 1);
      for (let j = 0; j < rows; j++)
        for (let i = 0; i < cols; i++) {
          const a = j * (cols + 1) + i,
            b = a + cols + 1;
          indices.push(
            a,
            a + 1,
            b,
            b,
            a + 1,
            b + 1,
            layer + a,
            layer + b,
            layer + a + 1,
            layer + b,
            layer + b + 1,
            layer + a + 1,
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
        indices.push(a, a + layer, b, b, a + layer, b + layer);
      }
      geometry.dispose();
      geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      geometry.setIndex(indices);
      const indexed = geometry;
      geometry = indexed.toNonIndexed();
      indexed.dispose();
    }
    const position = geometry.getAttribute('position');
    for (let i = 0; i < position.count; i++) {
      const u = position.getX(i),
        v = position.getY(i),
        w = position.getZ(i) + bevel;
      if (surface === 'bow') {
        const py = y + v;
        position.setXYZ(i, wallX(py) + inset + w, py, -u + cross);
      } else {
        const side = Math.sign(y - centerY),
          x = 0.22 + u,
          z = 0.22 - v;
        let edge = side > 0 ? -Infinity : Infinity;
        for (let j = 0; j < contour.length; j++) {
          const a = contour[j],
            b = contour[(j + 1) % contour.length];
          if (
            Math.abs(b.x - a.x) < 1e-9 ||
            x < Math.min(a.x, b.x) ||
            x > Math.max(a.x, b.x)
          )
            continue;
          const q = a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x);
          edge = side > 0 ? Math.max(edge, q) : Math.min(edge, q);
        }
        if (!Number.isFinite(edge))
          throw new RangeError('Ladder crown panel must fit within the liner');
        position.setXYZ(i, x, edge - side * (inset + w), z);
      }
    }
    // The upper crown looks inward/down; unlike the lower crown its basis
    // reverses the extruded face winding. Preserve single-sided materials.
    if (surface === 'crown' && y > centerY) {
      for (let i = 0; i < position.count; i += 3) {
        const a = [
          position.getX(i + 1),
          position.getY(i + 1),
          position.getZ(i + 1),
        ];
        position.setXYZ(
          i + 1,
          position.getX(i + 2),
          position.getY(i + 2),
          position.getZ(i + 2),
        );
        position.setXYZ(i + 2, a[0], a[1], a[2]);
      }
    }
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return h.mesh(geometry, material, root, 'ladder-end-' + name);
  }
  for (const side of [-1, 1]) {
    const y = centerY + side * 2.46;
    panel(1.06, 0.32, 0.038, 0.052, y, -0.002, materials.navy, 'seated-gasket');
    panel(
      0.96,
      0.242,
      0.028,
      0.043,
      y,
      0.028,
      materials.liner,
      'sealed-utility-cover',
    );
    panel(
      0.14,
      0.098,
      0.012,
      0.02,
      y,
      0.055,
      materials.navy,
      'protected-captive-latch',
    );
    panel(
      0.067,
      0.041,
      0.008,
      0.01,
      y,
      0.066,
      materials.metal,
      'captive-latch-insert',
    );
    // Solid access panels occupy the previously bare ceiling/floor ahead of
    // each terminal lamp, while preserving the full lamp and door clearance.
    panel(
      0.62,
      1.08,
      0.024,
      0.06,
      y,
      -0.002,
      materials.navy,
      'crown-seated-gasket',
      'crown',
    );
    panel(
      0.54,
      0.97,
      0.022,
      0.05,
      y,
      0.019,
      materials.metal,
      'crown-protective-perimeter',
      'crown',
    );
    panel(
      0.45,
      0.84,
      0.025,
      0.045,
      y,
      0.038,
      materials.liner,
      'crown-solid-access-cover',
      'crown',
    );
  }
  root.userData.layout = {
    symmetryCenterY: centerY,
    centerOffsetsY: [-2.46, 2.46],
    depthAxisZ: 0,
    maxProjection: 0.074,
    crownCenterXZ: [0.22, 0.22],
    crownFootprint: [0.62, 1.08],
    noGrillesOrLouvers: true,
    followsPressureLiner: true,
    noLightsOrControls: true,
  };
  return root;
}
