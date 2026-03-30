/**
 * Tailwind CSS v4 token exporter.
 *
 * Generates a self-contained CSS file with:
 *   - @theme block: color ramp variables + fluid typography scale variables
 *   - @utility blocks: one per semantic type token with full typographic props
 *
 * Designed to be called from the webapp export route, Figma plugins, or any
 * Node/browser context that has access to the token data.
 */

import { buildRampSet, RAMP_STEPS } from "../tokens/colorRamps.js";
import { SEMANTIC_SCALE } from "../tokens/scaleDefinition.js";
import { generateFluidClamp } from "../utilities/utilities.js";
import { calculateFontSize } from "../typography/typography.js";

// ---------------------------------------------------------------------------
// Public input type
// ---------------------------------------------------------------------------

export interface TailwindCssTokens {
  typography?: {
    baseSize: number;
    scaleRatio: number;
    headingFont: string;
    bodyFont: string;
    spaceScale?: number;
  };
  colors?: {
    /** Base hex for the primary ramp */
    primary: string;
    /** Base hex for the secondary ramp */
    secondary: string;
    /** Base hex for the neutrals ramp */
    neutrals: string;
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WEIGHT_MAP: Record<string, number> = {
  Bold: 700,
  SemiBold: 600,
  Medium: 500,
  Regular: 400,
};

const HEADING_TOKENS = new Set([
  "display",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
]);

/** Min/max viewport mirrors the TypographyTool scale config. */
const MIN_VP = 320;
const MAX_VP = 1200;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ruler(title: string): string {
  const pad = 54 - title.length;
  return `  /* ${title} ${"-".repeat(Math.max(2, pad))} */\n`;
}

// ---------------------------------------------------------------------------
// @theme — colors
// ---------------------------------------------------------------------------

function colorThemeBlock(colors: TailwindCssTokens["colors"]): string {
  if (!colors) return "";

  const ramps = buildRampSet(colors.primary, colors.secondary, colors.neutrals);
  const rampNames = [
    ["primary", "Primary"],
    ["secondary", "Secondary"],
    ["tertiary", "Tertiary"],
    ["neutrals", "Neutrals"],
    ["gray", "Gray"],
  ] as const;

  let out = ruler("Colors");
  for (const [key, label] of rampNames) {
    out += `\n  /* ${label} */\n`;
    for (const step of RAMP_STEPS) {
      out += `  --color-${key}-${step}: ${(ramps as any)[key][step]};\n`;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// @theme — typography
// ---------------------------------------------------------------------------

function typographyThemeBlock(typo: TailwindCssTokens["typography"]): string {
  if (!typo) return "";

  const { baseSize, scaleRatio, headingFont, bodyFont } = typo;

  // Mirror TypographyTool viewport/scale derivation
  const minBase = Math.round(baseSize * 0.875);
  const minScale = Math.max(scaleRatio - 0.125, 1.0);

  // Build power-per-sizeToken map from SEMANTIC_SCALE (first occurrence wins)
  const powerBySizeToken = new Map<string, number>();
  for (const entry of SEMANTIC_SCALE) {
    if (!powerBySizeToken.has(entry.sizeToken)) {
      powerBySizeToken.set(entry.sizeToken, entry.power);
    }
  }

  let out = ruler("Typography scale — fluid clamp");
  for (const [sizeToken, power] of powerBySizeToken) {
    const minPx = calculateFontSize(minBase, minScale, power);
    const maxPx = calculateFontSize(baseSize, scaleRatio, power);
    out += `  --text-${sizeToken}: ${generateFluidClamp(minPx, maxPx, MIN_VP, MAX_VP)};\n`;
  }

  out += `\n${ruler("Font families")}`;
  out += `  --font-display: "${headingFont}";\n`;
  out += `  --font-body: "${bodyFont}";\n`;

  return out;
}

// ---------------------------------------------------------------------------
// @utility — semantic type tokens
// ---------------------------------------------------------------------------

function semanticUtilityBlocks(typo: TailwindCssTokens["typography"]): string {
  if (!typo) return "";

  let out = `/* Semantic type utilities ${"─".repeat(34)} */\n`;

  for (const entry of SEMANTIC_SCALE) {
    const fontVar = HEADING_TOKENS.has(entry.token)
      ? "--font-display"
      : "--font-body";
    const weight = WEIGHT_MAP[entry.weight] ?? 400;
    const tracking =
      entry.tracking !== 0
        ? `${(entry.tracking / 1000).toFixed(4).replace(/\.?0+$/, "")}em`
        : null;

    out += `\n@utility ${entry.token} {\n`;
    out += `  font-size: var(--text-${entry.sizeToken});\n`;
    out += `  font-family: var(${fontVar});\n`;
    out += `  font-weight: ${weight};\n`;
    out += `  line-height: ${entry.leading};\n`;
    if (tracking) out += `  letter-spacing: ${tracking};\n`;
    out += `}\n`;
  }

  return out;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a complete Tailwind CSS v4 token file from design system tokens.
 *
 * @example
 * const css = generateTailwindCSS({
 *   typography: { baseSize: 16, scaleRatio: 1.25, headingFont: "Playfair Display", bodyFont: "Inter" },
 *   colors:     { primary: "#0c8ce9", secondary: "#8a38f5", neutrals: "#6b7280" },
 * });
 */
export function generateTailwindCSS(tokens: TailwindCssTokens): string {
  const themeContent = [
    colorThemeBlock(tokens.colors),
    typographyThemeBlock(tokens.typography),
  ]
    .filter(Boolean)
    .join("\n");

  const parts: string[] = [
    `/* ${"=".repeat(63)}
   Design tokens — generated by @stysys/design-system
   Do not edit by hand.
${"=".repeat(66)} */\n`,
  ];

  if (themeContent) {
    parts.push(`@theme {\n${themeContent}}\n`);
  }

  if (tokens.typography) {
    parts.push(semanticUtilityBlocks(tokens.typography));
  }

  return parts.join("\n");
}
