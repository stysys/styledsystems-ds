/**
 * Tailwind CSS v4 token exporter — FULL STABLE VERSION
 * 1. generateTailwindCSS: Creates the raw "tokens.css" with hardcoded values.
 * 2. generateTailwindWrapper: Creates the "tailwind.css" wrapper for the app.
 */

import {
  calculateRamp,
  generateTertiaryRamp,
  generateGrayRamp,
  RAMP_STEPS,
} from "../tokens/colorRamps.js";
import { SEMANTIC_SCALE } from "../tokens/scaleDefinition.js";
import { generateFluidClamp } from "../utilities/utilities.js";
import { calculateFontSize } from "../typography/typography.js";

// ---------------------------------------------------------------------------
// Types & Interfaces
// ---------------------------------------------------------------------------

export interface ColorTokenEntry {
  key: string;
  label: string;
  hex: string;
}

export interface TailwindCssTokens {
  typography?: {
    maxFontSize: number;
    minFontSize?: number;
    maxTypeScale: number;
    minTypeScale?: number;
    minViewportWidth?: number;
    maxViewportWidth?: number;
    headingFont: string;
    bodyFont: string;
    spaceScale?: number;
    baseSize?: number;
    scaleRatio?: number;
    semanticRoles?: Record<
      string,
      {
        step?: string;
        fontSize: number;
        lineHeight: number;
        fontFamily: string;
        fontWeight: number;
        letterSpacing?: number | string;
      }
    >;
  };
  colors?: ColorTokenEntry[];
  semanticColors?: Record<string, string>;
  buttonSizes?: Record<
    string,
    {
      height: number;
      paddingX: number;
      radius: string;
      labelRole?: string;
    }
  >;
  styles?: {
    radius?: Record<string, number>;
    shadows?: Record<string, string>;
  };
}

// ---------------------------------------------------------------------------
// Constants & Helpers
// ---------------------------------------------------------------------------

export const DEFAULT_RADIUS: Record<string, number> = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

const WEIGHT_MAP: Record<string, number> = {
  Bold: 700,
  SemiBold: 600,
  Medium: 500,
  Regular: 400,
};

const HEADING_TOKENS = new Set([
  "display-lg", "display", "display-sm", "heading-xl", "heading-lg",
  "heading-md", "title-lg", "title-md", "title-sm", "label-lg", "label-md", "label-sm",
]);

const TEXT_SCALE: ReadonlyArray<{ name: string; power: number }> = [
  { name: "3xs", power: -4 }, { name: "2xs", power: -3 }, { name: "xs", power: -2 },
  { name: "sm", power: -1 }, { name: "base", power: 0 }, { name: "lg", power: 1 },
  { name: "xl", power: 2 }, { name: "2xl", power: 3 }, { name: "3xl", power: 4 },
  { name: "4xl", power: 5 }, { name: "5xl", power: 6 }, { name: "6xl", power: 7 },
  { name: "7xl", power: 8 }, { name: "8xl", power: 9 }, { name: "9xl", power: 10 },
];

function tailwindTextVar(power: number): string {
  const nearest = TEXT_SCALE.reduce((best, entry) =>
    Math.abs(entry.power - power) < Math.abs(best.power - power) ? entry : best,
  );
  return `--text-${nearest.name}`;
}

function ruler(title: string): string {
  const pad = 54 - title.length;
  return `  /* ${title} ${"-".repeat(Math.max(2, pad))} */\n`;
}

// ---------------------------------------------------------------------------
// Part 1: THEME DATA GENERATION (tokens.css)
// ---------------------------------------------------------------------------

function colorThemeBlock(colors: TailwindCssTokens["colors"]): string {
  if (!colors || colors.length === 0) return "";
  const userRamps = colors.map((entry) => ({
    cssKey: entry.key,
    label: entry.label,
    ramp: calculateRamp(entry.hex),
  }));
  const derived = [];
  if (userRamps.length >= 2) {
    derived.push({ cssKey: "tertiary", label: "Tertiary", ramp: generateTertiaryRamp(userRamps[0].ramp as any, userRamps[1].ramp as any) });
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

/** GENERATES TOKENS.CSS — This is the "Truth" file */
export function generateTailwindCSS(tokens: TailwindCssTokens): string {
  let themeContent = colorThemeBlock(tokens.colors);

  // Typography
  if (tokens.typography) {
    const typo = tokens.typography;
    const maxBase = typo.maxFontSize ?? 16;
    const maxScale = typo.maxTypeScale ?? 1.25;
    const minBase = typo.minFontSize ?? Math.round(maxBase * 0.875);
    const minScale = typo.minTypeScale ?? 1.125;
    themeContent += `\n${ruler("Typography scale — fluid")}`;
    for (const { name, power } of TEXT_SCALE) {
      const minPx = calculateFontSize(minBase, minScale, power);
      const maxPx = calculateFontSize(maxBase, maxScale, power);
      themeContent += `  --text-${name}: ${generateFluidClamp(minPx, maxPx, 320, 1200)};\n`;
    }
    themeContent += `\n  --font-display: "${typo.headingFont}";\n  --font-body: "${typo.bodyFont}";\n`;
  }

  // Radius (Fixes your missing button radius)
  const radii = tokens.styles?.radius || DEFAULT_RADIUS;
  themeContent += `\n${ruler("Radius Scale")}`;
  for (const [k, v] of Object.entries(radii)) {
    themeContent += `  --radius-${k}: ${v}px;\n`;
  }

  // Button & Input Dimensions (Fixes the undefined heights)
  if (tokens.buttonSizes) {
    themeContent += `\n${ruler("Button & Input Dimensions")}`;
    for (const [size, cfg] of Object.entries(tokens.buttonSizes)) {
      themeContent += `  --button-${size}-height: ${cfg.height}px;\n`;
      themeContent += `  --button-${size}-padding-x: ${cfg.paddingX}px;\n`;
      themeContent += `  --button-${size}-radius: var(--radius-${cfg.radius});\n`;
    }
  }

  return `/* ===============================================================\n   Design tokens — generated by @stysys/design-system\n================================================================== */\n\n@theme {\n${themeContent}}\n`;
}

// ---------------------------------------------------------------------------
// Part 2: UTILITY BRIDGES (tailwind.css)
// ---------------------------------------------------------------------------

function colorBridgeBlocks(): string {
  const semantic = [
    "primary", "secondary", "neutral", "tertiary", "destructive", 
    "success", "warning", "info", "surface", "surface-raised", 
    "background", "foreground", "foreground-muted", "border", "outline"
  ];
  let out = `/* Color Utility Bridge (Fixes @apply crashes) ────────── */\n\n`;
  for (const name of semantic) {
    out += `@utility text-${name} { color: var(--color-${name}); }\n`;
    out += `@utility bg-${name} { background-color: var(--color-${name}); }\n`;
    out += `@utility border-${name} { border-color: var(--color-${name}); }\n`;
  }
  return out;
}

function semanticTypeBlocks(typo: TailwindCssTokens["typography"]): string {
  if (!typo) return "";
  let out = `/* Semantic type utilities ────────────────────────────────── */\n`;
  for (const entry of SEMANTIC_SCALE) {
    const font = HEADING_TOKENS.has(entry.token) ? "var(--font-display)" : "var(--font-body)";
    const weight = WEIGHT_MAP[entry.weight] ?? 400;
    out += `\n@utility ${entry.token} {\n  font-size: var(${tailwindTextVar(entry.power)});\n  font-family: ${font};\n  font-weight: ${weight};\n  line-height: ${entry.leading};\n}\n`;
  }
  return out;
}

function buttonUtilityBlocks(sizes: TailwindCssTokens["buttonSizes"]): string {
  if (!sizes) return "";
  let out = `/* Button size utilities ─────────────────────────────────── */\n`;
  for (const [size, cfg] of Object.entries(sizes)) {
    out += `\n@utility btn-${size} {\n  height: var(--button-${size}-height);\n  padding-left: var(--button-${size}-padding-x);\n  padding-right: var(--button-${size}-padding-x);\n  border-radius: var(--button-${size}-radius);\n`;
    if (cfg.labelRole) out += `  @apply ${cfg.labelRole};\n`;
    out += `}\n`;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Part 3: MAIN WRAPPERS
// ---------------------------------------------------------------------------

export function generateTailwindWrapper(tokens: TailwindCssTokens): string {
  const header = `/* Tailwind v4 design token wrapper — Generated for stable @apply support */`;
  
  // 1. The @theme inline block ensures Tailwind registers your variables as utilities
  const semanticVars = [
    "background", "surface", "surface-raised", "foreground", "foreground-muted", 
    "border", "outline", "primary", "on-primary", "secondary", "destructive"
  ];
  
  let inlineTheme = `@theme inline {\n  ${ruler("Semantic Mapping")}`;
  for (const v of semanticVars) inlineTheme += `  --color-${v}: var(--color-${v});\n`;
  
  // Radius Mapping
  inlineTheme += `\n  ${ruler("Radius Mapping")}`;
  const radiusKeys = tokens.styles?.radius ? Object.keys(tokens.styles.radius) : Object.keys(DEFAULT_RADIUS);
  for (const k of radiusKeys) inlineTheme += `  --radius-${k}: var(--radius-${k});\n`;
  inlineTheme += `}\n`;

  // 2. Component Utility Blocks
  const formUtils = `\n@utility input {\n  height: var(--button-md-height);\n  border-radius: var(--button-md-radius);\n  @apply flex w-full border bg-transparent px-3 text-sm transition-all;\n  border-style: solid;\n  border-color: var(--color-outline);\n  color: var(--color-foreground);\n  &:focus-visible { border-color: var(--color-primary); outline: none; }\n}\n`;

  const colorBridge = colorBridgeBlocks();
  const typoUtils = semanticTypeBlocks(tokens.typography);
  const btnUtils = buttonUtilityBlocks(tokens.buttonSizes);

  return `${header}\n\n@import "./tokens.css";\n\n${inlineTheme}\n${colorBridge}\n${typoUtils}\n${btnUtils}\n${formUtils}`;
}