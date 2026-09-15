/** Shallow roof thermal hardware, visible from the supported overview cameras.
 * The fittings follow the pressure skin's own surface function and stay clear
 * of the front cutaway, docking approach and service module.
 */
export function buildExteriorThermalEquipment(
  THREE: any,
  h: any,
  parent: any,
  materials: any,
  { datums: d, profiles, variant }: any,
) {
  const root = new THREE.Group();
  root.name = variant + '-exterior-thermal-equipment';
  root.userData = {
    section: 'contact',
    exterior: true,
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
    tilt = 0,
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
      // Hinged vanes have a real modest slope, with the low edge still seated
      // on the common carrier. Their pose is static, without moving geometry.
      const x = centerX + u * Math.cos(tilt) - w * Math.sin(tilt);
      const depthOffset =
        offset + (u + width / 2) * Math.sin(tilt) + w * Math.cos(tilt);
      const z = centerV - v;
      p.setXYZ(i, x, profiles.roofAt(x, z) + depthOffset, z);
    }
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const mesh = h.mesh(geometry, material, root, 'exterior-thermal-' + name);
    parts.push({
      name,
      surface: 'roof',
      center: [centerX, centerV],
      size: [width, height, depth],
      offset,
      tilt,
      bounds: [
        geometry.boundingBox.min.toArray(),
        geometry.boundingBox.max.toArray(),
      ],
    });
    return mesh;
  };
  // Two thermal-control trays share the cabin column axes. All hardware is on
  // the roof exposed by the normal viewing envelope, not the concealed rear.
  for (const x of [-d.halfPitch, d.halfPitch]) {
    panel(
      'louver-carrier',
      1.92 * s,
      0.88,
      0.03,
      0.1,
      materials.navy,
      x,
      -0.055,
      -0.002,
    );
    panel(
      'louver-radiating-bed',
      1.77 * s,
      0.73,
      0.017,
      0.07,
      materials.metal,
      x,
      -0.055,
      0.027,
    );
    for (let i = 0; i < 6; i++) {
      const u = (i - 2.5) * 0.271 * s;
      panel(
        'ceramic-louver-vane',
        0.245 * s,
        0.648,
        0.014,
        0.028,
        materials.chalk,
        x + u,
        -0.055,
        0.043,
        0.12,
      );
    }
    // Two broad captured hinge rails anchor all six vanes. No fastener field.
    for (const z of [-0.414, 0.304])
      panel(
        'louver-hinge-rail',
        1.61 * s,
        0.038,
        0.018,
        0.012,
        materials.metal,
        x,
        z,
        0.032,
      );
    for (const side of [-1, 1])
      panel(
        'carrier-captive-retainer',
        0.042 * s,
        0.105,
        0.011,
        0.015,
        materials.amber,
        x + side * 0.887 * s,
        -0.055,
        0.03,
      );
  }
  root.userData.layout = {
    variant,
    thermalHardware: true,
    exposedRoofOnly: true,
    hiddenRearGeometry: false,
    surfaceMounted: true,
    symmetryAxisX: 0,
    cabinColumnAxes: [-d.halfPitch, d.halfPitch],
    cutawayFrontLimitZ: 0.39,
    roofDepthRange: [-0.495, 0.385],
    maximumProjection: 0.1,
    sourceParts: parts.length,
    parts,
  };
  return root;
}
