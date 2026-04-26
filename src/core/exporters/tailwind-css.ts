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

import { calculateRamp, generateTertiaryRamp, generateGrayRamp, RAMP_STEPS } from "../tokens/colorRamps.js";
import { SEMANTIC_SCALE } from "../tokens/scaleDefinition.js";
import { generateFluidClamp } from "../utilities/utilities.js";
import { calculateFontSize } from "../typography/typography.js";

// ---------------------------------------------------------------------------
// Public input type
// ---------------------------------------------------------------------------

export interface ColorTokenEntry {
  /** CSS-safe identifier, e.g. "primary", "brand-blue" */
  key: string;
  /** Display label used for comments in the output */
  label: string;
  /** Base hex value */
  hex: string;
}

export interface TailwindCssTokens {
  typography?: {
    /** Desktop base font size in px. Was "baseSize". */
    maxFontSize: number;
    /** Mobile base font size in px. If absent, derived as maxFontSize × 0.875. */
    minFontSize?: number;
    /** Desktop scale ratio. Was "scaleRatio". */
    maxTypeScale: number;
    /** Mobile scale ratio. If absent, derived as maxTypeScale − 0.125 (min 1.0). */
    minTypeScale?: number;
    /** Min viewport width in px. Default 320. */
    minViewportWidth?: number;
    /** Max viewport width in px. Default 1200. */
    maxViewportWidth?: number;
    headingFont: string;
    bodyFont: string;
    spaceScale?: number;
    // Legacy aliases — accepted for backwards compat, lower priority than min/maxFontSize
    baseSize?: number;
    scaleRatio?: number;
  };
  /**
   * Dynamic color entries — each produces a full --color-{key}-* ramp.
   * Tertiary is auto-derived from the first two; gray is always achromatic.
   */
  colors?: ColorTokenEntry[];
  /**
   * Semantic color role → hex value. Outputs --color-{role}: {hex} vars.
   * e.g. { primary: "#05ac8e", background: "#030303", fg: "#f5f5f5" }
   */
  semanticColors?: Record<string, string>;
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

/**
 * Tailwind-standard text scale with power assignments from our modular scale.
 * Powers cover the full semantic range (overline = -4, display = 10).
 * Names follow Tailwind v4 conventions; 3xs/2xs are custom additions for
 * the sub-xs range that has no Tailwind equivalent.
 */
const TEXT_SCALE: ReadonlyArray<{ name: string; power: number }> = [
  { name: "3xs",  power: -4 }, // overline
  { name: "2xs",  power: -3 }, // small-text
  { name: "xs",   power: -2 }, // caption
  { name: "sm",   power: -1 }, // body-small
  { name: "base", power:  0 }, // body
  { name: "lg",   power:  1 }, // intermediate
  { name: "xl",   power:  2 }, // intermediate
  { name: "2xl",  power:  3 }, // h6 / body-large
  { name: "3xl",  power:  4 }, // h5
  { name: "4xl",  power:  5 }, // h4
  { name: "5xl",  power:  6 }, // h3
  { name: "6xl",  power:  7 }, // h2
  { name: "7xl",  power:  8 }, // h1
  { name: "8xl",  power:  9 }, // intermediate
  { name: "9xl",  power: 10 }, // display
];

/** Nearest Tailwind text var name for a given modular-scale power. */
function tailwindTextVar(power: number): string {
  const nearest = TEXT_SCALE.reduce((best, entry) =>
    Math.abs(entry.power - power) < Math.abs(best.power - power) ? entry : best
  );
  return `--text-${nearest.name}`;
}

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
  if (!colors || colors.length === 0) return "";

  // Build each user-defined ramp
  const userRamps: Array<{ cssKey: string; label: string; ramp: Record<number, string> }> = [];
  for (const entry of colors) {
    userRamps.push({ cssKey: entry.key, label: entry.label, ramp: calculateRamp(entry.hex) });
  }

  // Auto-derived ramps
  const derived: Array<{ cssKey: string; label: string; ramp: Record<number, string> }> = [];
  if (userRamps.length >= 2) {
    derived.push({
      cssKey: "tertiary",
      label: "Tertiary",
      ramp: generateTertiaryRamp(userRamps[0].ramp as any, userRamps[1].ramp as any),
    });
  }
  derived.push({ cssKey: "gray", label: "Gray", ramp: generateGrayRamp() });

  let out = ruler("Colors");
  for (const { cssKey, label, ramp } of [...userRamps, ...derived]) {
    out += `\n  /* ${label} */\n`;
    for (const step of RAMP_STEPS) {
      out += `  --color-${cssKey}-${step}: ${ramp[step]};\n`;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// @theme — typography
// ---------------------------------------------------------------------------

function typographyThemeBlock(typo: TailwindCssTokens["typography"]): string {
  if (!typo) return "";

  const maxBase = typo.maxFontSize ?? typo.baseSize ?? 16;
  const maxScale = typo.maxTypeScale ?? typo.scaleRatio ?? 1.25;
  const minBase = typo.minFontSize ?? Math.round(maxBase * 0.875);
  const minScale = typo.minTypeScale ?? Math.max(maxScale - 0.125, 1.0);
  const { headingFont, bodyFont } = typo;

  const minVp = typo.minViewportWidth ?? MIN_VP;
  const maxVp = typo.maxViewportWidth ?? MAX_VP;

  let out = ruler("Typography scale — fluid clamp");
  for (const { name, power } of TEXT_SCALE) {
    const minPx = calculateFontSize(minBase, minScale, power);
    const maxPx = calculateFontSize(maxBase, maxScale, power);
    out += `  --text-${name}: ${generateFluidClamp(minPx, maxPx, minVp, maxVp)};\n`;
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
    out += `  font-size: var(${tailwindTextVar(entry.power)});\n`;
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
 *   colors:     { primary: "#0c8ce9", secondary: "#8a38f5", neutrals: "#6b7280" }, // neutrals is the internal key; outputs --color-neutral-*
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

/**
 * Generate a Tailwind v4 wrapper file that references tokens.css via CSS vars.
 *
 * Outputs `@import "./tokens.css"` + `@theme inline { --color-*: var(--color-*) }`.
 * `@theme inline` tells Tailwind v4 to read values from :root at runtime —
 * no variable duplication, tokens.css remains the single source of truth.
 *
 * Usage in a Tailwind v4 project entry CSS:
 *   @import "./tailwind.css";
 *   → enables bg-primary-500, text-neutral-900, @apply text-display, etc.
 */
export function generateTailwindWrapper(tokens: TailwindCssTokens): string {
  const lines: string[] = [];

  // --- Color var references ---
  if (tokens.colors && tokens.colors.length > 0) {
    const userKeys = tokens.colors.map((c) => c.key);
    const allKeys = [
      ...userKeys,
      ...(userKeys.length >= 2 ? ["tertiary"] : []),
      "gray",
    ];

    lines.push(`  ${ruler("Colors").trim()}`);
    for (const key of allKeys) {
      for (const step of RAMP_STEPS) {
        lines.push(`  --color-${key}-${step}: var(--color-${key}-${step});`);
      }
      lines.push("");
    }
  }

  // --- Semantic color var references ---
  if (tokens.semanticColors && Object.keys(tokens.semanticColors).length > 0) {
    lines.push(`  ${ruler("Semantic colors").trim()}`);
    for (const role of Object.keys(tokens.semanticColors)) {
      lines.push(`  --color-${role}: var(--color-${role});`);
    }
    lines.push("");
  }

  // --- Typography var references ---
  if (tokens.typography) {
    lines.push(`  ${ruler("Typography scale").trim()}`);
    for (const { name } of TEXT_SCALE) {
      lines.push(`  --text-${name}: var(--text-${name});`);
    }
    lines.push("");
    lines.push(`  ${ruler("Font families").trim()}`);
    lines.push(`  --font-display: var(--font-display);`);
    lines.push(`  --font-body: var(--font-body);`);
  }

  while (lines[lines.length - 1] === "") lines.pop();

  const header = `/* ${"=".repeat(63)}
   Tailwind v4 design token wrapper — generated by styled.systems
   Import this in your Tailwind entry CSS to get full token utilities:
     @import "./tailwind.css";
   Requires tokens.css in the same directory.
${"=".repeat(66)} */`;

  const themeBlock = lines.length > 0 ? `\n@theme inline {\n${lines.join("\n")}\n}\n` : "";

  const utilityBlock = tokens.typography ? `\n${semanticUtilityBlocks(tokens.typography)}` : "";

  return `${header}\n\n@import "./tokens.css";\n${themeBlock}${utilityBlock}`;
}
