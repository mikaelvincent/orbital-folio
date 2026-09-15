/** Matched circulation returns keep both dead ends of the ladder bay ventilated.
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
  root.name = 'ladder-end-circulation-returns';
  root.userData = {
    section: 'walkway',
    batchRoot: true,
    excludePick: true,
    static: true,
    equipmentKind: 'paired-air-circulation-returns',
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
      throw new RangeError('Ladder return must lie on the pressure liner');
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
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: depth - 2 * bevel,
      steps: 1,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 2,
      curveSegments: 6,
    });
    const position = geometry.getAttribute('position');
    for (let i = 0; i < position.count; i++) {
      const py = y + position.getY(i);
      position.setXYZ(
        i,
        wallX(py) + inset + position.getZ(i) + bevel,
        py,
        -position.getX(i),
      );
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
      0.99,
      0.267,
      0.028,
      0.043,
      y,
      0.028,
      materials.liner,
      'ceramic-air-plenum',
    );
    panel(
      0.84,
      0.183,
      0.006,
      0.028,
      y,
      0.055,
      materials.navy,
      'protected-intake',
    );
    for (const offset of [-0.052, 0, 0.052])
      panel(
        0.76,
        0.019,
        0.014,
        0.007,
        y + offset,
        0.06,
        materials.metal,
        'captured-airfoil',
      );
  }
  root.userData.layout = {
    symmetryCenterY: centerY,
    centerOffsetsY: [-2.46, 2.46],
    depthAxisZ: 0,
    maxProjection: 0.074,
    followsPressureLiner: true,
    noLightsOrControls: true,
  };
  return root;
}
