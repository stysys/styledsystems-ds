/**
 * @styled/core - Typography CSS Output Module
 * Generates and formats CSS output for typography scales
 * Extracted from styled-typo plugin's ui/css-output.ts
 */

import { generateFluidClamp } from "../utilities";
import { calculateFontSize } from "./typography";
import type { TextStyleMapping } from "./typography-semantic";

/**
 * Generate CSS theme variables for typography
 */
export function generateTypographyCSS(
  scaleSteps: Array<{ name: string; power: number }>,
  minViewportWidth: number,
  maxViewportWidth: number,
  minFontSize: number,
  maxFontSize: number,
  minTypeScale: number,
  maxTypeScale: number,
  headingsFontFamily: string = "Inter",
  bodyFontFamily: string = "Inter",
  headingsFontWeight: string = "Regular",
  bodyFontWeight: string = "Regular"
): string {
  let css = "@theme {\n";

  // Generate font size variables for all available scale steps
  const allTextVars = [
    "9xl",
    "8xl",
    "7xl",
    "6xl",
    "5xl",
    "4xl",
    "3xl",
    "2xl",
    "xl",
    "lg",
    "base",
    "sm",
    "xs",
  ];

  allTextVars.forEach((name) => {
    let step = scaleSteps.find((s) => s.name.toLowerCase() === name);
    if (!step && name === "lg") {
      step = { name: "lg", power: 1 };
    }
    if (step) {
      const minSize = calculateFontSize(minFontSize, minTypeScale, step.power);
      const maxSize = calculateFontSize(maxFontSize, maxTypeScale, step.power);
      const fluidCSS = generateFluidClamp(minSize, maxSize, minViewportWidth, maxViewportWidth);
      css += `  --text-${name}: ${fluidCSS};\n`;
    } else {
      css += `  --text-${name}: /* Not configured */;\n`;
    }
  });

  // Font family variables
  css += `  --font-display: "${headingsFontFamily}";\n`;
  css += `  --font-body: "${bodyFontFamily}";\n`;

  // Spacing variables
  css += `  --spacing-headings: var(--spacing-headings, 1.1);\n`;
  css += `  --spacing-body: var(--spacing-body, 1.25);\n`;

  css += "}\n\n";

  // Utility classes for headings and body
  css += "@utility headings {\n  @apply font-display leading-headings;\n}\n";
  css += "@utility body {\n  @apply font-body leading-body;\n}\n\n";

  return css;
}

/**
 * Generate CSS utility classes for semantic names
 */
export function generateSemanticUtilityCSS(mappings: TextStyleMapping[]): string {
  let css = "";

  mappings.forEach((mapping) => {
    if (Array.isArray(mapping.rows)) {
      mapping.rows.forEach((row) => {
        if (row.checked && row.semanticName) {
          const semanticName = row.semanticName.toLowerCase().replace(/\s+/g, "-");
          css += `@utility ${semanticName} {\n  @apply --text-${mapping.scaleName};\n}\n`;
        }
      });
    }
  });

  return css;
}

/**
 * Format CSS code for display/copy
 */
export function formatCSSForDisplay(css: string): string {
  return css.trim();
}

/**
 * Copy CSS to clipboard and show notification
 */
export async function copyCSSToClipboard(css: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(css);
      return true;
    }
    // Fallback for older browsers
    const textArea = document.createElement("textarea");
    textArea.value = css;
    document.body.appendChild(textArea);
    textArea.select();
    const success = document.execCommand("copy");
    document.body.removeChild(textArea);
    return success;
  } catch (error) {
    console.error("[CSS Export] Failed to copy to clipboard:", error);
    return false;
  }
}

/**
 * Update CSS output display in UI
 */
export function updateCSSOutputDisplay(css: string): void {
  const outputElement = document.getElementById("css-code-output");
  if (outputElement) {
    outputElement.textContent = css;
  }

  const textareaElement = document.getElementById("css-code") as HTMLTextAreaElement;
  if (textareaElement) {
    textareaElement.value = css;
  }
}

/**
 * Generate full CSS export including theme and utilities
 */
export function generateFullTypographyCSS(
  scaleSteps: Array<{ name: string; power: number }>,
  mappings: TextStyleMapping[],
  minViewportWidth: number,
  maxViewportWidth: number,
  minFontSize: number,
  maxFontSize: number,
  minTypeScale: number,
  maxTypeScale: number,
  headingsFontFamily: string = "Inter",
  bodyFontFamily: string = "Inter",
  headingsFontWeight: string = "Regular",
  bodyFontWeight: string = "Regular"
): string {
  const themeCSS = generateTypographyCSS(
    scaleSteps,
    minViewportWidth,
    maxViewportWidth,
    minFontSize,
    maxFontSize,
    minTypeScale,
    maxTypeScale,
    headingsFontFamily,
    bodyFontFamily,
    headingsFontWeight,
    bodyFontWeight
  );

  const utilityCSS = generateSemanticUtilityCSS(mappings);

  return themeCSS + utilityCSS;
}
