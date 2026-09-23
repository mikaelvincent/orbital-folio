import { PALETTE } from '../../../lib/palette.ts';

/** Physical ANSI 75% layout, keyed by KeyboardEvent.code rather than typed text.
 * This lets Shift+A, held modifiers and non-US input keep their physical position.
 */
export type ContactKey = {
  code: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export const CONTACT_KEY_TRAVEL = 0.012;
const UNIT = 0.109;
const ROW_PITCH = 0.103;
const ROW_WIDTH = 16.25;

function keyboardLayout(): ContactKey[] {
  const keys: ContactKey[] = [];
  const row = (index: number, values: Array<[string, string, number?]>) => {
    let x = 0;
    for (const [code, label, width = 1] of values) {
      if (code)
        keys.push({
          code,
          label,
          x: (x + width / 2 - ROW_WIDTH / 2) * UNIT,
          y: (2.5 - index) * ROW_PITCH,
          width: width * UNIT - 0.013,
          height: index === 0 ? 0.073 : 0.087,
        });
      x += width;
    }
  };
  row(0, [
    ['Escape', 'Esc'],
    ['', '', 1],
    ...Array.from(
      { length: 4 },
      (_, i) => [`F${i + 1}`, `F${i + 1}`] as [string, string],
    ),
    ['', '', 0.5],
    ...Array.from(
      { length: 4 },
      (_, i) => [`F${i + 5}`, `F${i + 5}`] as [string, string],
    ),
    ['', '', 0.5],
    ...Array.from(
      { length: 4 },
      (_, i) => [`F${i + 9}`, `F${i + 9}`] as [string, string],
    ),
    ['', '', 0.25],
    ['Delete', 'Del'],
  ]);
  row(1, [
    ['Backquote', '`'],
    ...'1234567890'.split('').map((n) => [`Digit${n}`, n] as [string, string]),
    ['Minus', '−'],
    ['Equal', '='],
    ['Backspace', 'Back', 2],
    ['', '', 0.25],
    ['Home', 'Home'],
  ]);
  row(2, [
    ['Tab', 'Tab', 1.5],
    ...'QWERTYUIOP'
      .split('')
      .map((letter) => [`Key${letter}`, letter] as [string, string]),
    ['BracketLeft', '['],
    ['BracketRight', ']'],
    ['Backslash', '\\', 1.5],
    ['', '', 0.25],
    ['PageUp', 'PgUp'],
  ]);
  row(3, [
    ['CapsLock', 'Caps', 1.75],
    ...'ASDFGHJKL'
      .split('')
      .map((letter) => [`Key${letter}`, letter] as [string, string]),
    ['Semicolon', ';'],
    ['Quote', "'"],
    ['Enter', 'Enter', 2.25],
    ['', '', 0.25],
    ['PageDown', 'PgDn'],
  ]);
  row(4, [
    ['ShiftLeft', 'Shift', 2.25],
    ...'ZXCVBNM'
      .split('')
      .map((letter) => [`Key${letter}`, letter] as [string, string]),
    ['Comma', ','],
    ['Period', '.'],
    ['Slash', '/'],
    ['ShiftRight', 'Shift'],
    ['', '', 1],
    ['ArrowUp', '↑'],
    ['End', 'End'],
  ]);
  row(5, [
    ['ControlLeft', 'Ctrl', 1.25],
    ['MetaLeft', '⌘', 1.25],
    ['AltLeft', 'Alt', 1.25],
    ['Space', '', 6.25],
    ['AltRight', 'Alt'],
    ['MetaRight', '⌘'],
    ['ControlRight', 'Ctrl'],
    ['', '', 0.25],
    ['ArrowLeft', '←'],
    ['ArrowDown', '↓'],
    ['ArrowRight', '→'],
  ]);
  return keys;
}

export const CONTACT_KEY_LAYOUT = keyboardLayout();

/** Two draw submissions: rounded keycaps and one shared label atlas. Keys never
 * cast into the cached static shadow map, and their dynamic matrices are excluded
 * from static instance coalescing. No listeners or browser state live here.
 */
export function buildContactKeyboard(
  THREE: any,
  h: any,
  deck: any,
  materials: any,
) {
  const root = new THREE.Group();
  root.name = 'contact-keyboard';
  root.userData.animated = true;
  root.userData.excludePick = true;
  deck.add(root);
  const shape = new THREE.Shape();
  shape.moveTo(-0.39, -0.48);
  shape.lineTo(0.39, -0.48);
  shape.quadraticCurveTo(0.48, -0.48, 0.48, -0.39);
  shape.lineTo(0.48, 0.39);
  shape.quadraticCurveTo(0.48, 0.48, 0.39, 0.48);
  shape.lineTo(-0.39, 0.48);
  shape.quadraticCurveTo(-0.48, 0.48, -0.48, 0.39);
  shape.lineTo(-0.48, -0.39);
  shape.quadraticCurveTo(-0.48, -0.48, -0.39, -0.48);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.018,
    bevelEnabled: true,
    bevelThickness: 0.003,
    bevelSize: 0.018,
    bevelSegments: 1,
    steps: 1,
    curveSegments: 3,
  });
  const keyMaterial = new THREE.MeshStandardMaterial({
    name: 'contact-keyboard-keycaps',
    color: 0xffffff,
    roughness: 0.65,
    metalness: 0.08,
  });
  keyMaterial.userData.highlightScale = 0.018;
  const originZ = 0.045;
  const transforms = CONTACT_KEY_LAYOUT.map((key) => ({
    p: [key.x, key.y, originZ],
    s: [key.width, key.height, 1],
  }));
  const caps = h.instances(
    geometry,
    keyMaterial,
    transforms,
    root,
    'contact-keyboard-keycaps',
  );
  caps.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  caps.castShadow = false;
  caps.userData.excludePick = true;
  const color = new THREE.Color();
  CONTACT_KEY_LAYOUT.forEach((key, index) => {
    color.set(
      key.code === 'Escape' || key.code === 'Enter'
        ? PALETTE.bronzeDark
        : /^Key|^Digit|^Space/.test(key.code)
          ? PALETTE.carbonRaised
          : PALETTE.carbon,
    );
    caps.setColorAt(index, color);
  });

  let legends: any = null;
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = PALETTE.ivory;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      CONTACT_KEY_LAYOUT.forEach((key, index) => {
        ctx.font = `${key.label.length > 2 ? 15 : 25}px system-ui, sans-serif`;
        ctx.fillText(
          key.label,
          (index % 16) * 64 + 32,
          Math.floor(index / 16) * 64 + 32,
          60,
        );
      });
      const texture = new THREE.CanvasTexture(canvas);
      texture.name = 'contact-keyboard-legend-atlas';
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      const ink = materials.ink.clone();
      ink.name = 'contact-keyboard-printed-legends';
      ink.color.set(0xffffff);
      ink.map = texture;
      ink.alphaTest = 0.25;
      ink.depthWrite = false;
      const legendGeometry = new THREE.PlaneGeometry(1, 1);
      const cells = new Float32Array(CONTACT_KEY_LAYOUT.length * 2);
      CONTACT_KEY_LAYOUT.forEach((_, index) => {
        cells[index * 2] = (index % 16) / 16;
        cells[index * 2 + 1] = 1 - (Math.floor(index / 16) + 1) / 8;
      });
      legendGeometry.setAttribute(
        'legendCell',
        new THREE.InstancedBufferAttribute(cells, 2),
      );
      legends = h.instances(
        legendGeometry,
        ink,
        CONTACT_KEY_LAYOUT.map((key) => ({
          p: [key.x, key.y, originZ + 0.022],
          s: [Math.min(key.width * 0.9, 0.113), key.height * 0.82, 1],
        })),
        root,
        'contact-keyboard-legends',
      );
      legends.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      legends.castShadow = legends.receiveShadow = false;
      legends.userData.excludePick = true;
      legends.material.onBeforeCompile = (shader: any) => {
        shader.vertexShader =
          `attribute vec2 legendCell;\n${shader.vertexShader}`.replace(
            '#include <uv_vertex>',
            '#include <uv_vertex>\nvMapUv = vMapUv * vec2(0.0625, 0.125) + legendCell;',
          );
      };
      legends.material.customProgramCacheKey = () =>
        'contact-keyboard-atlas-v1';
    }
  }
  caps.computeBoundingBox();
  caps.computeBoundingSphere();
  if (legends) {
    legends.computeBoundingBox();
    legends.computeBoundingSphere();
  }
  const indices = new Map(
    CONTACT_KEY_LAYOUT.map((key, index) => [key.code, index]),
  );
  const pressed = new Set<number>();
  const animating = new Set<number>();
  const depths = new Float32Array(CONTACT_KEY_LAYOUT.length);
  const matrix = new THREE.Matrix4();
  const writeDepth = (index: number) => {
    caps.getMatrixAt(index, matrix);
    matrix.elements[14] = originZ - depths[index];
    caps.setMatrixAt(index, matrix);
    if (legends) {
      legends.getMatrixAt(index, matrix);
      matrix.elements[14] = originZ + 0.022 - depths[index];
      legends.setMatrixAt(index, matrix);
    }
  };
  let dirty = false;
  return {
    root,
    caps,
    legends,
    keys: CONTACT_KEY_LAYOUT,
    width: ROW_WIDTH * UNIT,
    height: 5 * ROW_PITCH + 0.087,
    press(code: string) {
      const index = indices.get(code);
      if (index === undefined || pressed.has(index)) return false;
      pressed.add(index);
      animating.add(index);
      return true;
    },
    release(code: string) {
      const index = indices.get(code);
      if (index === undefined || !pressed.delete(index)) return false;
      animating.add(index);
      return true;
    },
    clear(immediate = false) {
      for (const index of pressed) animating.add(index);
      pressed.clear();
      if (immediate) {
        for (const index of animating) {
          if (depths[index] === 0) continue;
          depths[index] = 0;
          writeDepth(index);
          dirty = true;
        }
        animating.clear();
      }
    },
    update(delta: number, immediate = false) {
      let changed = dirty;
      dirty = false;
      const dt = Number.isFinite(delta) ? Math.max(0, Math.min(delta, 0.1)) : 0;
      for (const index of animating) {
        const target = pressed.has(index) ? CONTACT_KEY_TRAVEL : 0;
        const blend = immediate ? 1 : 1 - Math.exp(-dt * (target ? 60 : 38));
        const next = depths[index] + (target - depths[index]) * blend;
        const depth = Math.abs(target - next) < 0.00001 ? target : next;
        if (depth !== depths[index]) {
          depths[index] = depth;
          writeDepth(index);
          changed = true;
        }
        if (Math.abs(target - depths[index]) < 0.000001)
          animating.delete(index);
      }
      if (changed) {
        caps.instanceMatrix.needsUpdate = true;
        if (legends) legends.instanceMatrix.needsUpdate = true;
      }
      return changed;
    },
  };
}
