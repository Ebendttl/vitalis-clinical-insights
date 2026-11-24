/**
 * Minimal OKLCH → WCAG contrast maths, used to verify design tokens in tests.
 * Formulae from Björn Ottosson's OKLab reference and WCAG 2.2 §1.4.3.
 */

export type Oklch = { l: number; c: number; h: number };

const OKLCH_PATTERN = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*[\d.]+\s*)?\)$/;

export function parseOklch(input: string): Oklch {
  const match = OKLCH_PATTERN.exec(input.trim());
  if (!match) throw new Error(`Not an oklch() colour: ${input}`);
  return { l: Number(match[1]), c: Number(match[2]), h: Number(match[3]) };
}

/** Returns linear-light sRGB channels, clamped to gamut. */
export function oklchToLinearSrgb({ l, c, h }: Oklch): [number, number, number] {
  const rad = (h * Math.PI) / 180;
  const a = c * Math.cos(rad);
  const b = c * Math.sin(rad);

  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;

  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  return [
    clamp(4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_),
    clamp(-1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_),
    clamp(-0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_),
  ];
}

export function relativeLuminance(color: Oklch): number {
  const [r, g, b] = oklchToLinearSrgb(color);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(fg: Oklch, bg: Oklch): number {
  const a = relativeLuminance(fg);
  const b = relativeLuminance(bg);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}
