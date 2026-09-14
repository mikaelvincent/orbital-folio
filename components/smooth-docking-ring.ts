/** Circular pressure mount with continuous circumference shading. Flat annular
 * mounting faces retain their axial normals; the bore faces inward as before.
 */
export function buildSmoothDockingRing(
  THREE: any,
  outerRadius: number,
  innerRadius: number,
  depth: number,
) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);
  const bore = new THREE.Path();
  bore.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
  shape.holes.push(bore);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSize: 0.008,
    bevelThickness: 0.008,
    bevelSegments: 2,
    // Full EllipseCurve sampling produces 96 circumference segments. This
    // controls the silhouette; smoothing alone only removes the shaded bands.
    curveSegments: 48,
    steps: 1,
  });
  const positions = geometry.getAttribute('position');
  const normals = geometry.getAttribute('normal');
  for (let i = 0; i < positions.count; i++) {
    const nx = normals.getX(i),
      ny = normals.getY(i),
      nz = normals.getZ(i);
    const radial = Math.hypot(nx, ny);
    if (radial < 1e-7) continue; // Preserve the planar mating surfaces.
    const x = positions.getX(i),
      y = positions.getY(i);
    const radius = Math.hypot(x, y);
    const sign = nx * x + ny * y < 0 ? -1 : 1;
    // Extrusion duplicates vertices for every polygon side. Use the exact
    // radial direction at each vertex instead of retaining each facet normal.
    // Keep the bevel's axial component and the inward-facing bore orientation.
    normals.setXYZ(
      i,
      (sign * radial * x) / radius,
      (sign * radial * y) / radius,
      nz,
    );
  }
  geometry.translate(0, 0, -depth / 2);
  geometry.rotateY(Math.PI / 2);
  return geometry;
}
