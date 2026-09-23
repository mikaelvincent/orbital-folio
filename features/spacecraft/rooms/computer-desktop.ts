import { PALETTE } from '../../../lib/palette.ts';

/** One static wallpaper shared by the five application monitors in one scene.
 * It lives on the real rounded glass, so portrait app cropping cannot expose an
 * unpainted bezel backing. Native HTML only supplies the window above it. */
export function createComputerDesktopMaterial(THREE: any) {
  let texture = null;
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 768;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const base = ctx.createLinearGradient(0, 0, 860, 768);
      base.addColorStop(0, PALETTE.carbonRaised);
      base.addColorStop(0.67, PALETTE.carbonDeep);
      base.addColorStop(1, PALETTE.carbon);
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, 1024, 768);

      // A broad folded sheet of alloy light, without distracting detail.
      const fold = ctx.createLinearGradient(260, 0, 760, 768);
      fold.addColorStop(0, `${PALETTE.alloy}4a`);
      fold.addColorStop(0.3, `${PALETTE.carbonRaised}80`);
      fold.addColorStop(1, `${PALETTE.carbonRaised}00`);
      ctx.fillStyle = fold;
      ctx.beginPath();
      ctx.moveTo(670, 0);
      ctx.lineTo(1024, 0);
      ctx.lineTo(460, 768);
      ctx.lineTo(0, 768);
      ctx.lineTo(0, 540);
      ctx.closePath();
      ctx.fill();
      const glow = ctx.createRadialGradient(980, 870, 0, 980, 870, 700);
      glow.addColorStop(0, `${PALETTE.alloy}70`);
      glow.addColorStop(1, `${PALETTE.alloy}00`);
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, 1024, 768);

      texture = new THREE.CanvasTexture(canvas);
      texture.name = 'computer-desktop-wallpaper';
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;
    }
  }
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    color: texture ? 0xffffff : PALETTE.carbon,
    toneMapped: false,
  });
  material.name = 'computer-desktop-wallpaper';
  return material;
}

export function attachComputerDesktop(
  THREE: any,
  glass: any,
  parent: any,
  material: any,
) {
  const desktop = new THREE.Group();
  desktop.name = `${glass.name}-desktop`;
  desktop.userData.animated = true;
  desktop.visible = false;
  // Use the exact rounded geometry and UVs: no rectangular overdraw beyond
  // the glass and no competing coplanar faces (idle/desktop are exclusive).
  // Model batching will create separate retained arrays for this display.
  const face = new THREE.Mesh(glass.geometry, material);
  face.name = `${glass.name}-wallpaper`;
  face.position.copy(glass.position);
  face.rotation.copy(glass.rotation);
  face.scale.copy(glass.scale);
  face.userData = { ...glass.userData };
  face.castShadow = false;
  face.receiveShadow = false;
  desktop.add(face);
  parent.add(desktop);
  return desktop;
}
