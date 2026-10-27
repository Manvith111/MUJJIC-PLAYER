/**
 * MUJJIC PLAYER theme — monochrome black & white terminal (MUSIC2D-inspired).
 *
 * Silkscreen (pixel) for display/headings, Space Mono for body. No color accents:
 * white is the accent, grays carry hierarchy. Existing color keys are kept and
 * remapped to grayscale so components render mono without churn.
 */
export const colors = {
  bg: '#0a0a0b',
  panel: '#141416',
  panelAlt: '#0f0f11',
  border: '#2e2e33',
  borderDim: '#1f1f23',
  text: '#f2f2f4',
  textDim: '#8a8a92',
  textFaint: '#56565e',

  accent: '#ffffff', // rings, active states, progress
  accentBg: '#ffffff', // filled play buttons…
  accentInk: '#0a0a0b', // …with dark glyphs on top

  // Legacy semantic keys, remapped to monochrome:
  cyan: '#f2f2f4',
  green: '#ffffff',
  amber: '#d0d0d4',
  red: '#f2f2f4',
  yellow: '#d0d0d4',
};

export const font = {
  display: 'Silkscreen_400Regular',
  displayBold: 'Silkscreen_700Bold',
  family: 'SpaceMono_400Regular',
  bold: 'SpaceMono_700Bold',
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
};

export const space = (n: number) => n * 4;

export const box = { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' };

/** Deterministic dark gray from a track id — placeholder tint before art loads. */
export function tintFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xff;
  const base = 26 + (h % 22); // 26–48: dark, monochrome-friendly
  const v = base.toString(16).padStart(2, '0');
  return `#${v}${v}${(base + 4).toString(16).padStart(2, '0')}`;
}
