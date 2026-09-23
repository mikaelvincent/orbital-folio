/** Authored spacecraft/interface anchors. Colors are sRGB; do not boost their
 * saturation before passing them to Three.js. CSS counterparts live in globals.css.
 * Bronze is hardware/accent paint, never ordinary text on ivory or carbon.
 */
export const PALETTE = {
  ivory: '#EEE9DE',
  carbon: '#1F2730',
  bronze: '#AA8054',
  ivoryShade: '#D8D2C6',
  carbonDeep: '#151C23',
  carbonRaised: '#303A44',
  alloy: '#A5AAA7',
  textMuted: '#C2C3BF',
  bronzeLight: '#D4B28C',
  bronzeDark: '#775332',
} as const;

/** Preserve saved/custom accent metadata while rendering the retired default
 * orange as the current bronze. No database migration or owner-content rewrite.
 */
export function paletteAccent(saved?: string): string {
  return !saved || /^#(?:ffb547|e6a34c)$/i.test(saved) ? PALETTE.bronze : saved;
}
