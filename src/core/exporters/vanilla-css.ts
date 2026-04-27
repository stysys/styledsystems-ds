/**
 * Vanilla CSS custom properties exporter.
 *
 * Generates a framework-agnostic :root { } file with:
 *   - Full OKLCH-derived color ramps (all 11 steps per color)
 *   - Auto-derived tertiary + achromatic gray ramp
 *   - Fluid clamp() typography scale
 *   - Font family variables
 *
 * Works in any browser, InDesign, Figma, vanilla JS — no build step required.
 * Pair with generateTailwindWrapper() for Tailwind v4 projects.
 */

import { calculateRamp, generateTertiaryRamp, generateGrayRamp, RAMP_STEPS } from "../tokens/colorRamps.js";
import { generateFluidClamp } from "../utilities/utilities.js";
import { calculateFontSize } from "../typography/typography.js";
import type { TailwindCssTokens } from "./tailwind-css.js";

const MIN_VP = 320;
const MAX_VP = 1200;

// Utopia-style fluid space scale — multiples of the base font size
export const SPACE_SCALE: ReadonlyArray<{ name: string; mul: number }> = [
  { name: "3xs", mul: 0.25 },
  { name: "2xs", mul: 0.5  },
  { name: "xs",  mul: 0.75 },
  { name: "s",   mul: 1    },
  { name: "m",   mul: 1.5  },
  { name: "l",   mul: 2    },
  { name: "xl",  mul: 3    },
  { name: "2xl", mul: 4    },
  { name: "3xl", mul: 6    },
];

export function generateSpaceLines(
  minBase: number,
  maxBase: number,
  minVp: number,
  maxVp: number,
): string[] {
  const lines: string[] = [];
  // Individual steps
  for (const step of SPACE_SCALE) {
    const clamp = generateFluidClamp(step.mul * minBase, step.mul * maxBase, minVp, maxVp);
    lines.push(`  --spacing-${step.name}: ${clamp};`);
  }
  // One-up pairs
  for (let i = 0; i < SPACE_SCALE.length - 1; i++) {
    const small = SPACE_SCALE[i];
    const large = SPACE_SCALE[i + 1];
    const clamp = generateFluidClamp(small.mul * minBase, large.mul * maxBase, minVp, maxVp);
    lines.push(`  --spacing-${small.name}-${large.name}: ${clamp};`);
  }
  return lines;
}

const TEXT_SCALE: ReadonlyArray<{ name: string; power: number }> = [
  { name: "3xs",  power: -4 },
  { name: "2xs",  power: -3 },
  { name: "xs",   power: -2 },
  { name: "sm",   power: -1 },
  { name: "base", power:  0 },
  { name: "lg",   power:  1 },
  { name: "xl",   power:  2 },
  { name: "2xl",  power:  3 },
  { name: "3xl",  power:  4 },
  { name: "4xl",  power:  5 },
  { name: "5xl",  power:  6 },
  { name: "6xl",  power:  7 },
  { name: "7xl",  power:  8 },
  { name: "8xl",  power:  9 },
  { name: "9xl",  power: 10 },
];

function ruler(title: string): string {
  const pad = 52 - title.length;
  return `  /* ${title} ${"-".repeat(Math.max(2, pad))} */\n`;
}

/**
 * Generate a vanilla CSS file with full design token custom properties.
 * Output is a plain :root { } block — no framework dependency.
 */
export function generateVanillaCSSVars(tokens: TailwindCssTokens, dsName?: string): string {
  const lines: string[] = [];

  // --- Colors ---
  if (tokens.colors && tokens.colors.length > 0) {
    const userRamps = tokens.colors.map((c) => ({
      cssKey: c.key,
      label: c.label,
      ramp: calculateRamp(c.hex),
    }));

    const derived: Array<{ cssKey: string; label: string; ramp: Record<number, string> }> = [];
    if (userRamps.length >= 2) {
      derived.push({
        cssKey: "tertiary",
        label: "Tertiary",
        ramp: generateTertiaryRamp(userRamps[0].ramp as any, userRamps[1].ramp as any),
      });
    }
    derived.push({ cssKey: "gray", label: "Gray", ramp: generateGrayRamp() });

    lines.push(ruler("Colors"));
    for (const { cssKey, label, ramp } of [...userRamps, ...derived]) {
      lines.push(`\n  /* ${label} */`);
      for (const step of RAMP_STEPS) {
        lines.push(`  --color-${cssKey}-${step}: ${ramp[step]};`);
      }
    }
    lines.push("");
  }

  // --- Semantic colors ---
  if (tokens.semanticColors && Object.keys(tokens.semanticColors).length > 0) {
    lines.push(ruler("Semantic colors"));
    for (const [role, hex] of Object.entries(tokens.semanticColors)) {
      lines.push(`  --color-${role}: ${hex};`);
    }
    lines.push("");
  }

  // --- Typography ---
  if (tokens.typography) {
    const typo = tokens.typography;
    const maxBase = typo.maxFontSize ?? typo.baseSize ?? 16;
    const maxScale = typo.maxTypeScale ?? typo.scaleRatio ?? 1.25;
    const minBase = typo.minFontSize ?? Math.round(maxBase * 0.875);
    const minScale = typo.minTypeScale ?? Math.max(maxScale - 0.125, 1.0);
    const minVp = typo.minViewportWidth ?? MIN_VP;
    const maxVp = typo.maxViewportWidth ?? MAX_VP;

    lines.push(ruler("Typography scale — fluid clamp"));
    for (const { name, power } of TEXT_SCALE) {
      const minPx = calculateFontSize(minBase, minScale, power);
      const maxPx = calculateFontSize(maxBase, maxScale, power);
      lines.push(`  --text-${name}: ${generateFluidClamp(minPx, maxPx, minVp, maxVp)};`);
    }

    lines.push(`\n${ruler("Font families")}`);
    lines.push(`  --font-display: "${typo.headingFont}";`);
    lines.push(`  --font-body: "${typo.bodyFont}";`);
    lines.push("");

    lines.push(ruler("Fluid space scale"));
    lines.push(...generateSpaceLines(minBase, maxBase, minVp, maxVp));
    lines.push("");
  }

  while (lines[lines.length - 1] === "") lines.pop();

  const header = dsName
    ? `/* ${"=".repeat(63)}\n   Design System: ${dsName}\n   Generated by styled.systems — do not edit by hand.\n${"=".repeat(66)} */\n`
    : `/* ${"=".repeat(63)}\n   Generated by styled.systems — do not edit by hand.\n${"=".repeat(66)} */\n`;

  return `${header}\n:root {\n${lines.join("\n")}\n}\n`;
}
