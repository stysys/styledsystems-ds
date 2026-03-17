/**
 * Shared Color Scale & Ramp Generator
 * Generates color scales, ramps, and interpolations for design systems
 *
 * Features:
 * - Color interpolation between two colors
 * - Generate balanced color ramps (light to dark)
 * - Create semantic color scales (primary, secondary, success, warning, error, etc.)
 * - Support for different color spaces (RGB, HSL)
 */

/**
 * Simple color interpolation between two hex colors
 * Returns an array of hex colors
 *
 * @example
 * interpolateColor("#FF0000", "#0000FF", 5)
 * // Returns: ["#FF0000", "#CC0033", "#990066", "#660099", "#0000FF"]
 */
export function interpolateColor(
  colorA: string,
  colorB: string,
  steps: number
): string[] {
  const colors: string[] = [];

  // Convert hex to RGB
  const rgbA = hexToRgb(colorA);
  const rgbB = hexToRgb(colorB);

  if (!rgbA || !rgbB) return [colorA, colorB];

  for (let i = 0; i < steps; i++) {
    const factor = steps === 1 ? 0 : i / (steps - 1);

    const r = Math.round(rgbA.r + (rgbB.r - rgbA.r) * factor);
    const g = Math.round(rgbA.g + (rgbB.g - rgbA.g) * factor);
    const b = Math.round(rgbA.b + (rgbB.b - rgbA.b) * factor);

    colors.push(rgbToHex(r, g, b));
  }

  return colors;
}

/**
 * Generate a color ramp from light to dark
 * Uses HSL color space for better perceptual uniformity
 *
 * @example
 * generateColorRamp("#0EA5E9", 11)
 * // Returns array of 11 colors from light sky-blue to dark sky-blue
 */
export function generateColorRamp(
  baseColor: string,
  steps: number = 11
): string[] {
  const hsl = hexToHsl(baseColor);
  if (!hsl) return [baseColor];

  const ramp: string[] = [];
  const baseLight = hsl.l;
  const middleIndex = Math.floor(steps / 2); // Index where baseColor should be (e.g., 5 for 11 steps)

  // Limit the range to keep colors usable (not pure white/black)
  const minLight = 5; // Don't go darker than 5% (almost black)
  const maxLight = 95; // Don't go lighter than 95% (almost white)

  for (let i = 0; i < steps; i++) {
    let lightness: number;

    if (i < middleIndex) {
      // Lighter side: interpolate from maxLight (95%) to baseLight
      const factor = i / middleIndex;
      lightness = maxLight - (maxLight - baseLight) * factor;
    } else if (i > middleIndex) {
      // Darker side: interpolate from baseLight to minLight (5%)
      const factor = (i - middleIndex) / (steps - 1 - middleIndex);
      lightness = baseLight - (baseLight - minLight) * factor;
    } else {
      // Middle: use baseLight exactly
      lightness = baseLight;
    }

    ramp.push(
      hslToHex(hsl.h, hsl.s, Math.max(minLight, Math.min(maxLight, lightness)))
    );
  }

  return ramp;
}

/**
 * Generate semantic color scales (primary, secondary, success, warning, error, info)
 * Returns a color scale object with 50-950 stops (like Tailwind)
 */
export function generateSemanticScales(
  primaryColor: string,
  secondaryColor?: string,
  accentColor?: string
): SemanticColorScale {
  return {
    primary: generateColorRamp(primaryColor, 10),
    secondary: generateColorRamp(secondaryColor || primaryColor, 10),
    accent: generateColorRamp(accentColor || primaryColor, 10),
    success: generateColorRamp("#10B981", 10), // Emerald
    warning: generateColorRamp("#F59E0B", 10), // Amber
    error: generateColorRamp("#EF4444", 10), // Red
    info: generateColorRamp("#3B82F6", 10), // Blue
  };
}

/**
 * Generate Tailwind-like color palette (50, 100, 200, ..., 950)
 */
export function generateTailwindPalette(baseColor: string): TailwindPalette {
  const ramp = generateColorRamp(baseColor, 10);

  return {
    50: ramp[0],
    100: ramp[1],
    200: ramp[2],
    300: ramp[3],
    400: ramp[4],
    500: ramp[5],
    600: ramp[6],
    700: ramp[7],
    800: ramp[8],
    900: ramp[9],
    950: darkenColor(ramp[9], 15),
  };
}

/**
 * Darken a color by reducing its lightness
 */
export function darkenColor(hexColor: string, amount: number = 10): string {
  const hsl = hexToHsl(hexColor);
  if (!hsl) return hexColor;

  return hslToHex(hsl.h, hsl.s, Math.max(0, hsl.l - amount));
}

/**
 * Lighten a color by increasing its lightness
 */
export function lightenColor(hexColor: string, amount: number = 10): string {
  const hsl = hexToHsl(hexColor);
  if (!hsl) return hexColor;

  return hslToHex(hsl.h, hsl.s, Math.min(100, hsl.l + amount));
}

/**
 * Get complementary color (opposite on color wheel)
 */
export function getComplementaryColor(hexColor: string): string {
  const hsl = hexToHsl(hexColor);
  if (!hsl) return hexColor;

  const complementaryHue = (hsl.h + 180) % 360;
  return hslToHex(complementaryHue, hsl.s, hsl.l);
}

/**
 * Get analogous colors (adjacent on color wheel)
 */
export function getAnalogousColors(hexColor: string): string[] {
  const hsl = hexToHsl(hexColor);
  if (!hsl) return [hexColor];

  const angle = 30; // 30 degrees apart
  return [
    hslToHex((hsl.h - angle + 360) % 360, hsl.s, hsl.l),
    hexColor,
    hslToHex((hsl.h + angle) % 360, hsl.s, hsl.l),
  ];
}

/**
 * Get triadic colors (120 degrees apart)
 */
export function getTriadicColors(hexColor: string): string[] {
  const hsl = hexToHsl(hexColor);
  if (!hsl) return [hexColor];

  return [
    hexColor,
    hslToHex((hsl.h + 120) % 360, hsl.s, hsl.l),
    hslToHex((hsl.h + 240) % 360, hsl.s, hsl.l),
  ];
}

/**
 * Calculate contrast ratio between two colors (WCAG)
 * Returns a number between 1 and 21
 */
export function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getRelativeLuminance(color1);
  const lum2 = getRelativeLuminance(color2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if two colors have sufficient contrast (WCAG AA: 4.5:1 for text)
 */
export function hasGoodContrast(
  foreground: string,
  background: string,
  ratio: number = 4.5
): boolean {
  return getContrastRatio(foreground, background) >= ratio;
}

/**
 * Determine if a color is light or dark
 */
export function isLightColor(hexColor: string): boolean {
  const hsl = hexToHsl(hexColor);
  return hsl ? hsl.l > 50 : false;
}

/**
 * Choose text color (black or white) for best contrast
 */
export function getContrastTextColor(bgColor: string): string {
  return isLightColor(bgColor) ? "#000000" : "#FFFFFF";
}

// ============================================================================
// Helper Functions - Color Space Conversions
// ============================================================================

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface HSL {
  h: number;
  s: number;
  l: number;
}

export function hexToRgb(hex: string): RGB | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

export function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((x) => {
        const hex = x.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      })
      .join("")
      .toUpperCase()
  );
}

export function hexToHsl(hex: string): HSL | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;

  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function hslToHex(h: number, s: number, l: number): string {
  s = s / 100;
  l = l / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0,
    g = 0,
    b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (h >= 300 && h < 360) {
    r = c;
    g = 0;
    b = x;
  }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return ("#" + toHex(r) + toHex(g) + toHex(b)).toUpperCase();
}

/**
 * Calculate relative luminance (WCAG)
 */
function getRelativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((val) => {
    val = val / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// ============================================================================
// Type Definitions
// ============================================================================

export interface SemanticColorScale {
  primary: string[];
  secondary: string[];
  accent: string[];
  success: string[];
  warning: string[];
  error: string[];
  info: string[];
}

export interface TailwindPalette {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
}
