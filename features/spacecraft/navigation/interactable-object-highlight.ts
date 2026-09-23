import { PALETTE } from '../../../lib/palette.ts';
/** Shared scene-object feedback. All registered objects use the same easing and
 * brightness, on top of their room's existing lighting. Never mutate a shared
 * room material: two identical consoles must respond independently.
 */
export function createObjectHighlight(
  THREE: any,
  root: any,
  id: string,
  rim?: { width: number; height: number; radius: number; z: number },
) {
  const materials = new Map<any, any>();
  root.userData.batchRoot = true;
  root.userData.interactableId = id;
  root.traverse((object: any) => {
    if (!object.isMesh) return;
    const isolate = (source: any) => {
      if (!materials.has(source)) {
        const material = source.clone();
        material.name = `${source.name}-${id}`;
        material.userData = { ...source.userData, interactableId: id };
        materials.set(source, material);
      }
      return materials.get(source);
    };
    object.material = Array.isArray(object.material)
      ? object.material.map(isolate)
      : isolate(object.material);
  });
  // A physical rim respects foreground occlusion. An HTML outline would draw
  // across switches or hands in front of the enclosure at oblique angles.
  let rimMaterial: any = null;
  if (rim) {
    const rounded = (
      path: any,
      width: number,
      height: number,
      radius: number,
    ) => {
      const x = -width / 2,
        y = -height / 2;
      path.moveTo(x + radius, y);
      path.lineTo(x + width - radius, y);
      path.quadraticCurveTo(x + width, y, x + width, y + radius);
      path.lineTo(x + width, y + height - radius);
      path.quadraticCurveTo(
        x + width,
        y + height,
        x + width - radius,
        y + height,
      );
      path.lineTo(x + radius, y + height);
      path.quadraticCurveTo(x, y + height, x, y + height - radius);
      path.lineTo(x, y + radius);
      path.quadraticCurveTo(x, y, x + radius, y);
      return path;
    };
    const shape = rounded(
      new THREE.Shape(),
      rim.width - 0.024,
      rim.height - 0.024,
      rim.radius,
    );
    shape.holes.push(
      rounded(
        new THREE.Path(),
        rim.width - 0.04,
        rim.height - 0.04,
        rim.radius - 0.008,
      ),
    );
    rimMaterial = new THREE.MeshBasicMaterial({
      name: `${id}-hover-rim`,
      color: PALETTE.bronzeLight,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false,
    });
    const mesh = new THREE.Mesh(
      new THREE.ShapeGeometry(shape, 16),
      rimMaterial,
    );
    mesh.name = `${id}-hover-rim`;
    mesh.position.z = rim.z;
    mesh.castShadow = mesh.receiveShadow = false;
    mesh.userData.excludePick = true;
    for (let parent = root; parent; parent = parent.parent)
      if (parent.userData.section) {
        mesh.userData.section = parent.userData.section;
        break;
      }
    root.add(mesh);
  }
  let progress = 0;
  return {
    id,
    update(
      hovered: boolean,
      enabled: boolean,
      delta: number,
      immediate = false,
      dimIdle = enabled,
    ) {
      const target = hovered && enabled ? 1 : 0;
      const blend = immediate
        ? 1
        : 1 - Math.exp(-Math.max(0, Math.min(0.1, delta)) * 15);
      progress += (target - progress) * blend;
      if (Math.abs(target - progress) < 0.002) progress = target;
      // Idle appearance is independent of input availability: previews and
      // camera travel must not brighten screens before arrival enables input.
      // Disabled input also suppresses any departing or stale hover immediately.
      const level = dimIdle ? 0.65 + (enabled ? progress * 0.5 : 0) : 1;
      for (const [source, material] of materials) {
        material.color.copy(source.color).multiplyScalar(level);
        if (material.emissive && source.emissive) {
          material.emissive.copy(source.emissive).multiplyScalar(level);
          material.emissiveIntensity = source.emissiveIntensity;
        }
      }
      if (rimMaterial) rimMaterial.opacity = enabled ? progress * 0.95 : 0;
      root.userData.hoverProgress = progress;
      root.userData.highlightLevel = level;
      return progress !== target;
    },
  };
}
