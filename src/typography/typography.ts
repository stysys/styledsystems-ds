/**
 * @stysys/core - Typography Module
 * Shared typography functionality for all Styled Systems plugins
 * Provides type definitions, scaling algorithms, and UI helpers for typography
 */

/**
 * Typography Style Definition
 * Core data structure for a typography style
 */
export interface TypographyStyle {
  name: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  fontFamily: string;
  letterSpacing?: number;
}

/**
 * Typography Scale Configuration
 * Used to configure type scale generation
 */
export interface TypeScaleConfig {
  minViewportWidth: number;
  maxViewportWidth: number;
  minFontSize: number;
  maxFontSize: number;
  minTypeScale: number;
  maxTypeScale: number;
}

/**
 * Scale Step Definition
 * Represents a single step in the type scale
 */
export interface ScaleStep {
  name: string;
  power: number;
}

/**
 * Default type scale steps
 * From xs (power -2) to 9xl (power 10)
 */
export const DEFAULT_SCALE_STEPS: ScaleStep[] = [
  { name: "9xl", power: 10 },
  { name: "8xl", power: 9 },
  { name: "7xl", power: 8 },
  { name: "6xl", power: 7 },
  { name: "5xl", power: 6 },
  { name: "4xl", power: 5 },
  { name: "3xl", power: 4 },
  { name: "2xl", power: 3 },
  { name: "xl", power: 2 },
  { name: "lg", power: 1 },
  { name: "base", power: 0 },
  { name: "sm", power: -1 },
  { name: "xs", power: -2 },
];

/**
 * Calculate font size for a given scale step
 * Uses modular scale calculation based on type scale ratio
 * Formula: baseFontSize * (typeScale ^ power)
 */
export function calculateFontSize(
  baseFontSize: number,
  typeScale: number,
  power: number,
): number {
  return Math.round(baseFontSize * Math.pow(typeScale, power));
}

/**
 * Calculate line height ratio based on font size
 * Larger text gets smaller line height, smaller text gets larger line height
 */
export function calculateLineHeight(fontSize: number): number {
  if (fontSize >= 32) return 1.2;
  if (fontSize >= 24) return 1.3;
  if (fontSize >= 18) return 1.4;
  if (fontSize >= 14) return 1.5;
  return 1.6;
}

/**
 * Generate a complete typography scale
 * Creates a series of typography styles based on scale configuration
 */
export function generateTypographyScale(
  config: TypeScaleConfig,
  scaleSteps: ScaleStep[] = DEFAULT_SCALE_STEPS,
  fontFamily: string = "Inter",
  fontWeight: number = 400,
): TypographyStyle[] {
  const styles: TypographyStyle[] = [];

  // Calculate min and max font sizes for the given viewport widths
  const minFontSizeCalc = config.minFontSize;
  const maxFontSizeCalc = config.maxFontSize;

  scaleSteps.forEach((step) => {
    // Calculate fonts sizes at min and max viewports
    const minSize = calculateFontSize(
      minFontSizeCalc,
      config.minTypeScale,
      step.power,
    );
    const maxSize = calculateFontSize(
      maxFontSizeCalc,
      config.maxTypeScale,
      step.power,
    );

    // For display purposes, use the max size (desktop)
    const displaySize = maxSize;
    const lineHeight = calculateLineHeight(displaySize);

    styles.push({
      name: step.name,
      fontSize: displaySize,
      fontWeight,
      lineHeight,
      fontFamily,
    });
  });

  return styles;
}

/**
 * Generate responsive typography CSS
 * Creates media queries for responsive font sizes
 */
export function generateResponsiveCSS(
  config: TypeScaleConfig,
  scaleSteps: ScaleStep[] = DEFAULT_SCALE_STEPS,
  classPrefix: string = "type",
): string {
  let css = `/* Responsive Typography Scale */\n`;
  css += `/* Min Viewport: ${config.minViewportWidth}px, Max Viewport: ${config.maxViewportWidth}px */\n\n`;

  scaleSteps.forEach((step) => {
    const minSize = calculateFontSize(
      config.minFontSize,
      config.minTypeScale,
      step.power,
    );
    const maxSize = calculateFontSize(
      config.maxFontSize,
      config.maxTypeScale,
      step.power,
    );
    const lineHeight = calculateLineHeight(maxSize);

    const fluidSize = `clamp(${minSize}px, ${((maxSize - minSize) / (config.maxViewportWidth - config.minViewportWidth)) * 100}vw + ${minSize - ((maxSize - minSize) / (config.maxViewportWidth - config.minViewportWidth)) * config.minViewportWidth}px, ${maxSize}px)`;

    css += `.${classPrefix}-${step.name} {\n`;
    css += `  font-size: ${fluidSize};\n`;
    css += `  line-height: ${lineHeight};\n`;
    css += `}\n\n`;
  });

  return css;
}

/**
 * Parse typography CSS variable name
 * Extracts style information from a Figma variable name
 * Example: "SYS / Typography / Heading / lg" -> { category: "Heading", size: "lg" }
 */
export function parseTypographyVariableName(
  variableName: string,
): { category?: string; size?: string } | null {
  const parts = variableName.split("/").map((p) => p.trim());
  if (parts.length < 3) return null;

  const category = parts[parts.length - 2];
  const size = parts[parts.length - 1];

  return { category, size };
}

/**
 * Create a typography style from config
 * Helper to create consistent typography styles
 */
export function createTypographyStyle(
  name: string,
  fontSize: number,
  fontFamily: string = "Inter",
  fontWeight: number = 400,
  lineHeight?: number,
): TypographyStyle {
  return {
    name,
    fontSize,
    fontWeight,
    lineHeight: lineHeight || calculateLineHeight(fontSize),
    fontFamily,
  };
}

/**
 * Validate typography style
 * Ensures all required properties are present and valid
 */
export function validateTypographyStyle(style: any): style is TypographyStyle {
  return (
    typeof style.name === "string" &&
    typeof style.fontSize === "number" &&
    typeof style.fontWeight === "number" &&
    typeof style.lineHeight === "number" &&
    typeof style.fontFamily === "string" &&
    style.fontSize > 0 &&
    style.fontWeight > 0 &&
    style.lineHeight > 0
  );
}
