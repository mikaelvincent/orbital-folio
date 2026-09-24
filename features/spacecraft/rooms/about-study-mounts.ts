import { CABIN_FLOOR } from '../geometry/spacecraft-wall-layout.ts';

type StudyAnchor = {
  carrier: any;
  x: number;
  y: number;
  front: number;
  name: string;
};

/** Fit mounting stock to the real lining in each furniture scale. Placeholder
 * carriers follow their equipment until its final parent has been established. */
export function buildStudyWallMounts(
  THREE: any,
  h: any,
  root: any,
  anchors: StudyAnchor[],
  material: any,
  profile: Array<{ y: number; z: number }>,
) {
  const rearZ = (y: number) => {
    const zs: number[] = [];
    for (let i = 0; i + 1 < profile.length; i++) {
      const a = profile[i],
        b = profile[i + 1];
      if (y < Math.min(a.y, b.y) - 1e-8 || y > Math.max(a.y, b.y) + 1e-8)
        continue;
      if (Math.abs(a.y - b.y) < 1e-8) zs.push(a.z, b.z);
      else zs.push(a.z + ((b.z - a.z) * (y - a.y)) / (b.y - a.y));
    }
    if (!zs.length) throw new Error(`Study mount outside rear profile: ${y}`);
    return Math.min(...zs);
  };
  const variants: any[] = [];
  const parents = new Map<any, StudyAnchor[]>();
  for (const anchor of anchors) {
    const parent = anchor.carrier.parent;
    if (!parents.has(parent)) parents.set(parent, []);
    parents.get(parent)!.push(anchor);
    anchor.carrier.removeFromParent();
  }
  for (const [parent, mounts] of parents) {
    let offsetY = 0,
      offsetZ = 0;
    for (let p = parent; p !== root; p = p.parent) {
      offsetY += p.position.y;
      offsetZ += p.position.z;
    }
    for (const scale of [1, 0.84]) {
      const variant = new THREE.Group();
      variant.name = `personal-study-profile-mounts-${scale === 1 ? 'wide' : 'compact'}`;
      variant.userData.batchRoot = true;
      variant.userData.propScale = scale;
      parent.add(variant);
      variants.push(variant);
      for (const anchor of mounts) {
        const bottom = anchor.y - 0.0525,
          top = anchor.y + 0.0525;
        const ys = [
          bottom,
          top,
          ...profile.map((p) => (p.y - CABIN_FLOOR) / scale - offsetY),
        ]
          .filter((y) => y >= bottom && y <= top)
          .sort((a, b) => a - b)
          .filter((y, i, list) => !i || y - list[i - 1] > 1e-8);
        // About scales about the floor while retaining the flat rear plane.
        const points = ys.map((y) => ({
          y,
          z:
            (rearZ(CABIN_FLOOR + scale * (y + offsetY)) + 1.1 * (1 - scale)) /
              scale -
            offsetZ,
        }));
        if (points.some((p) => p.z > anchor.front + 1e-7))
          throw new Error(
            `Study ${anchor.name} shoe is behind the cabin lining`,
          );
        const shape = new THREE.Shape();
        shape.moveTo(-anchor.front, bottom);
        shape.lineTo(-anchor.front, top);
        for (const p of [...points].reverse()) shape.lineTo(-p.z, p.y);
        shape.closePath();
        const geometry = new THREE.ExtrudeGeometry(shape, {
          depth: 0.092,
          bevelEnabled: false,
          steps: 1,
        });
        geometry.rotateY(Math.PI / 2);
        geometry.translate(anchor.x - 0.046, 0, 0);
        h.mesh(
          geometry,
          material,
          variant,
          `personal-study-${anchor.name}-wall-anchor`,
        );
      }
    }
  }
  const setPropScale = (scale: number) => {
    for (const variant of variants)
      variant.visible = variant.userData.propScale === (scale > 0.9 ? 1 : 0.84);
  };
  setPropScale(1);
  return setPropScale;
}
