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
export function calculateFontSize(baseFontSize: number, typeScale: number, power: number): number {
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
  fontWeight: number = 400
): TypographyStyle[] {
  const styles: TypographyStyle[] = [];

  // Calculate min and max font sizes for the given viewport widths
  const minFontSizeCalc = config.minFontSize;
  const maxFontSizeCalc = config.maxFontSize;

  scaleSteps.forEach((step) => {
    // Calculate fonts sizes at min and max viewports
    const minSize = calculateFontSize(minFontSizeCalc, config.minTypeScale, step.power);
    const maxSize = calculateFontSize(maxFontSizeCalc, config.maxTypeScale, step.power);

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
  classPrefix: string = "type"
): string {
  let css = `/* Responsive Typography Scale */\n`;
  css += `/* Min Viewport: ${config.minViewportWidth}px, Max Viewport: ${config.maxViewportWidth}px */\n\n`;

  scaleSteps.forEach((step) => {
    const minSize = calculateFontSize(config.minFontSize, config.minTypeScale, step.power);
    const maxSize = calculateFontSize(config.maxFontSize, config.maxTypeScale, step.power);
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
  variableName: string
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
  lineHeight?: number
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

/**
 * Scale Steps Management
 * Business logic for managing which scale steps are visible in preview
 * This is shared between all plugins (styled-typo, styled-connect, etc.)
 */

/**
 * Get all available scale steps (the full range from 9xl to xs)
 */
export function getAllScaleSteps(): ScaleStep[] {
  return [
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
}

/**
 * Add a larger heading step
 * Adds the next larger step not already in activeSteps
 */
export function addHeadingStep(activeSteps: ScaleStep[]): ScaleStep[] | null {
  // Only allow adding up to 9xl (power 10)
  const allHeadings = [
    { name: "lg", power: 1 },
    { name: "xl", power: 2 },
    { name: "2xl", power: 3 },
    { name: "3xl", power: 4 },
    { name: "4xl", power: 5 },
    { name: "5xl", power: 6 },
    { name: "6xl", power: 7 },
    { name: "7xl", power: 8 },
    { name: "8xl", power: 9 },
    { name: "9xl", power: 10 },
  ];
  const presentPowers = activeSteps.map((s) => s.power);
  // Find the highest present heading step (power > 0)
  const presentHeadings = presentPowers.filter((p) => p > 0);
  let maxHeading = 0;
  if (presentHeadings.length > 0) {
    maxHeading = Math.max(...presentHeadings);
  }
  // Find the next step above the current max
  const nextStep = allHeadings.find((s) => s.power === maxHeading + 1);
  if (nextStep) {
    // Always build a contiguous block from lg (power 1) up to the new max
    const newMax = nextStep.power;
    const contiguous = allHeadings
      .filter((s) => s.power <= newMax && s.power >= 1)
      .sort((a, b) => b.power - a.power); // largest at top
    // Always include base and any smalls present
    const baseAndSmalls = activeSteps.filter((s) => s.power <= 0);
    // Sort: 9xl, 8xl, ..., lg, base, sm, xs (top to bottom)
    const allSteps = [...contiguous, ...baseAndSmalls];
    return allSteps.sort((a, b) => {
      // Headings (power > 0) first, descending
      if (a.power > 0 && b.power > 0) return b.power - a.power;
      if (a.power > 0) return -1;
      if (b.power > 0) return 1;
      // base (0) next
      if (a.power === 0 && b.power === 0) return 0;
      if (a.power === 0) return -1;
      if (b.power === 0) return 1;
      // sm (-1) then xs (-2)
      return b.power - a.power;
    });
  }
  // If all steps up to 9xl are present, do nothing
  return null;
}

/**
 * Remove the largest heading step
 * Only removes if at least one step larger than base remains
 * Prevents deletion of base scale (power 0)
 * CRITICAL: Base must always remain in the scale
 */
export function removeHeadingStep(activeSteps: ScaleStep[]): ScaleStep[] | null {
  // Only allow removal if there is at least one step larger than base (power > 0), and base is present
  const baseIndex = activeSteps.findIndex((s) => s.power === 0);
  if (baseIndex === -1) return null;
  // Find the largest power
  const largestStep = Math.max(...activeSteps.map((s) => s.power));
  if (largestStep <= 0) return null; // No headings to remove
  // Only allow removal if more than one step remains
  if (activeSteps.length <= 1) return null;
  // Remove the largest step, never base
  const result = activeSteps.filter((s) => s.power !== largestStep);
  // Ensure base remains
  if (!result.some((s) => s.power === 0)) return null;
  // If only base and smalls remain, that's fine
  return result;
}

/**
 * Add a smaller text step
 * Adds the next smaller step not already in activeSteps
 */
export function addSmallStep(activeSteps: ScaleStep[]): ScaleStep[] | null {
  // Find the smallest power in current steps
  const minPower = Math.min(...activeSteps.map((s) => s.power));
  // All possible small steps (ascending order)
  const allSmalls = [
    { name: "xs", power: -2 },
    { name: "sm", power: -1 },
  ];
  // Find the next smaller step not already present
  const nextStep = allSmalls.find((s) => s.power === minPower - 1);
  if (nextStep && !activeSteps.some((s) => s.power === nextStep.power)) {
    return [...activeSteps, nextStep];
  }
  return null;
}

/**
 * Remove the smallest text step
 * Only removes if "base" or smaller steps remain, and base won't be removed
 * CRITICAL: Base scale (power = 0) must always remain in the scale
 */
export function removeSmallStep(activeSteps: ScaleStep[]): ScaleStep[] | null {
  // Only allow removal if there is at least one step smaller than base (power < 0), and base is present
  const baseIndex = activeSteps.findIndex((s) => s.power === 0);
  if (baseIndex === -1) return null;
  // Find the smallest power
  const smallestStep = Math.min(...activeSteps.map((s) => s.power));
  if (smallestStep >= 0) return null; // No smalls to remove
  // Only allow removal if more than one step remains
  if (activeSteps.length <= 1) return null;
  // Remove the smallest step, never base
  const result = activeSteps.filter((s) => s.power !== smallestStep);
  // Ensure base remains
  if (!result.some((s) => s.power === 0)) return null;
  return result;
}
