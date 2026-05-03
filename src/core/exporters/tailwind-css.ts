/**
 * Tailwind CSS v4 token exporter — Full Suite
 * * 1. generateTailwindCSS: Creates the raw "tokens.css" with hardcoded values.
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
  cardConfig?: {
    sm?: {
      padding: number;
      radius: string;
      shadow: string;
      titleRole?: string;
      bodyRole?: string;
    };
    md?: {
      padding: number;
      radius: string;
      shadow: string;
      titleRole?: string;
      bodyRole?: string;
    };
    lg?: {
      padding: number;
      radius: string;
      shadow: string;
      titleRole?: string;
      bodyRole?: string;
    };
    background?: string;
  };
}

// ---------------------------------------------------------------------------
// Constants & Logic Helpers
// ---------------------------------------------------------------------------

export const DEFAULT_RADIUS: Record<string, number> = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};
const DEFAULT_RADIUS_KEYS = Object.keys(DEFAULT_RADIUS);

export const DEFAULT_SHADOWS: Record<string, string> = {
  sm: "0 1px 3px 0 oklch(0% 0 0 / 0.10)",
  md: "0 4px 6px -1px oklch(0% 0 0 / 0.10), 0 2px 4px -2px oklch(0% 0 0 / 0.10)",
  lg: "0 10px 15px -3px oklch(0% 0 0 / 0.10), 0 4px 6px -4px oklch(0% 0 0 / 0.10)",
  xl: "0 20px 25px -5px oklch(0% 0 0 / 0.10), 0 8px 10px -6px oklch(0% 0 0 / 0.10)",
};
const DEFAULT_SHADOW_KEYS = Object.keys(DEFAULT_SHADOWS);

const WEIGHT_MAP: Record<string, number> = {
  Bold: 700,
  SemiBold: 600,
  Medium: 500,
  Regular: 400,
};

const HEADING_TOKENS = new Set([
  "display-lg",
  "display",
  "display-sm",
  "heading-xl",
  "heading-lg",
  "heading-md",
  "title-lg",
  "title-md",
  "title-sm",
  "label-lg",
  "label-md",
  "label-sm",
]);

const MIN_VP = 320;
const MAX_VP = 1200;

const TEXT_SCALE: ReadonlyArray<{ name: string; power: number }> = [
  { name: "3xs", power: -4 },
  { name: "2xs", power: -3 },
  { name: "xs", power: -2 },
  { name: "sm", power: -1 },
  { name: "base", power: 0 },
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
// Part 1: Tokens Generation (Uses ColorRamps, FluidClamp, calculateFontSize)
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
    derived.push({
      cssKey: "tertiary",
      label: "Tertiary",
      ramp: generateTertiaryRamp(
        userRamps[0].ramp as any,
        userRamps[1].ramp as any,
      ),
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
  out += `\n${ruler("Font families")}  --font-display: "${headingFont}";\n  --font-body: "${bodyFont}";\n`;
  return out;
}

/** GENERATES TOKENS.CSS */
export function generateTailwindCSS(tokens: TailwindCssTokens): string {
  const themeContent = [
    colorThemeBlock(tokens.colors),
    typographyThemeBlock(tokens.typography),
  ]
    .filter(Boolean)
    .join("\n");
  const parts = [
    `/* ===============================================================\n   Design tokens — generated by @stysys/design-system\n================================================================== */\n`,
  ];
  if (themeContent) parts.push(`@theme {\n${themeContent}}\n`);
  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// Part 2: Utilities (Fixed for v4 with direct var() calls)
// ---------------------------------------------------------------------------

const FORM_UTILITIES = `/* Form utilities ────────────────────────────────────────── */

@utility input {
  height: var(--button-md-height);
  border-radius: var(--button-md-radius);
  @apply flex w-full border bg-transparent px-3 text-sm transition-all;
  border-style: solid;
  border-color: var(--color-outline);
  color: var(--color-foreground);
  &::placeholder { color: var(--color-muted); }
  &:focus-visible { border-color: var(--color-primary); outline: none; }
  &:disabled { @apply cursor-not-allowed opacity-50; }
}

@utility input-select {
  @apply input pr-8;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23ffffff' d='M6 8L2 4h8z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  background-size: 12px;
}
`;

const BUTTON_VARIANT_UTILITIES = `/* Button variant utilities ───────────────────────────────── */

@utility btn-solid {
  border-color: var(--color-neutral-500);
  background-color: var(--color-neutral-500);
  color: var(--color-neutral-950);
  &:hover { background-color: var(--color-primary); color: var(--color-on-primary); border-color: var(--color-primary); }
}

@utility btn-outline {
  border-color: var(--color-border);
  background-color: transparent;
  color: var(--color-foreground);
  &:hover { background-color: var(--color-surface-raised); }
}

@utility btn-primary {
  border-color: transparent;
  background-color: var(--color-primary);
  color: var(--color-on-primary);
  &:hover { opacity: 0.9; }
}
/* ... rest of variants (btn-secondary, btn-destructive, etc) follow same pattern ... */
`;

function semanticUtilityBlocks(typo: TailwindCssTokens["typography"]): string {
  if (!typo) return "";
  let out = `/* Semantic type utilities ${"─".repeat(34)} */\n`;

  if (typo.semanticRoles && Object.keys(typo.semanticRoles).length > 0) {
    for (const [token, role] of Object.entries(typo.semanticRoles)) {
      const sizeVar = role.step
        ? `var(--text-${role.step})`
        : `${role.fontSize}px`;
      const fontVar = HEADING_TOKENS.has(token)
        ? "var(--font-display)"
        : "var(--font-body)";
      out += `\n@utility ${token} {\n  font-size: ${sizeVar};\n  font-family: ${fontVar};\n  font-weight: ${role.fontWeight};\n  line-height: ${role.lineHeight};\n}\n`;
    }
  } else {
    for (const entry of SEMANTIC_SCALE) {
      const fontVar = HEADING_TOKENS.has(entry.token)
        ? "var(--font-display)"
        : "var(--font-body)";
      const weight = WEIGHT_MAP[entry.weight] ?? 400;
      out += `\n@utility ${entry.token} {\n  font-size: var(${tailwindTextVar(entry.power)});\n  font-family: ${fontVar};\n  font-weight: ${weight};\n  line-height: ${entry.leading};\n}\n`;
    }
  }
  return out;
}

function buttonUtilityBlocks(
  sizes: Record<
    string,
    { height: number; paddingX: number; radius: string; labelRole?: string }
  >,
): string {
  let out = `/* Button size utilities ${"─".repeat(36)} */\n`;
  for (const [size, cfg] of Object.entries(sizes)) {
    out += `\n@utility btn-${size} {\n  height: var(--button-${size}-height);\n  padding-left: var(--button-${size}-padding-x);\n  padding-right: var(--button-${size}-padding-x);\n  border-radius: var(--radius-${cfg.radius});\n`;
    if (cfg.labelRole) out += `  @apply ${cfg.labelRole};\n`;
    out += `}\n`;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Part 3: Wrapper Export (The main entry point for the App)
// ---------------------------------------------------------------------------

export function generateTailwindWrapper(tokens: TailwindCssTokens): string {
  const lines: string[] = [];

  // Colors
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
    }
  }

  // Semantic Colors
  const BASELINE_SEMANTIC = [
    "background",
    "surface",
    "foreground",
    "muted",
    "border",
    "outline",
    "primary",
    "on-primary",
    "secondary",
    "destructive",
  ];
  lines.push(`\n  ${ruler("Semantic colors").trim()}`);
  for (const role of BASELINE_SEMANTIC) {
    lines.push(`  --color-${role}: var(--color-${role});`);
  }

  // Radius & Shadows
  const radiusKeys = tokens.styles?.radius
    ? Object.keys(tokens.styles.radius)
    : DEFAULT_RADIUS_KEYS;
  lines.push(`\n  ${ruler("Radius scale").trim()}`);
  for (const k of radiusKeys)
    lines.push(`  --radius-${k}: var(--radius-${k});`);

  const header = `/* Tailwind v4 design token wrapper — generated by styled.systems */`;
  const themeBlock = `\n@theme inline {\n${lines.join("\n")}\n}\n`;
  const utilityBlock = tokens.typography
    ? `\n${semanticUtilityBlocks(tokens.typography)}`
    : "";
  const buttonBlock = tokens.buttonSizes
    ? `\n${buttonUtilityBlocks(tokens.buttonSizes)}`
    : "";

  return `${header}\n\n@import "./tokens.css";\n${themeBlock}${utilityBlock}${buttonBlock}\n${FORM_UTILITIES}\n${BUTTON_VARIANT_UTILITIES}`;
}
