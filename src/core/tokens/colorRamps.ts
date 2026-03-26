/**
 * colorRamps.ts
 *
 * OKLCH-based color ramp generation.
 * Perceptually uniform — equal lightness steps look equal to the human eye,
 * unlike HSL which is non-linear.
 *
 * Shared across:
 *   - styledsystems dashboard (color picker + token storage)
 *   - IDML / ASE exporters (color swatch generation)
 *   - Figma plugin (when migrated from local core/)
 */

import { converter, formatHex, interpolate } from "culori";

export const RAMP_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
export type RampStep = (typeof RAMP_STEPS)[number];
export type ColorRamp = Record<RampStep, string>;

export interface RampSet {
  primary: ColorRamp;
  secondary: ColorRamp;
  tertiary: ColorRamp;
  neutrals: ColorRamp;
  gray: ColorRamp;
}

const toOklch = converter("oklch");

function interpolateOklch(a: string, b: string, t: number): string {
  return (
    formatHex(interpolate([toOklch(a)!, toOklch(b)!], "oklch")(t)) ?? "#000000"
  );
}

/** Generate an 11-step ramp from a single base hex, interpolating in OKLCH. */
export function calculateRamp(baseHex: string): ColorRamp {
  const oklch = toOklch(baseHex);
  if (!oklch) return Object.fromEntries(RAMP_STEPS.map((s) => [s, baseHex])) as ColorRamp;

  const safeC = oklch.c ?? 0;
  const safeH = safeC === 0 ? undefined : oklch.h ?? 0;
  const L_base = oklch.l ?? 0.5;
  const L_light = Math.min(0.98, L_base + 0.45);
  const L_dark = Math.max(0.05, L_base - 0.45);

  const ramp: Partial<ColorRamp> = {};
  for (const step of RAMP_STEPS) {
    let L: number;
    if (step < 500) {
      const t = (500 - step) / 450;
      L = L_base + (L_light - L_base) * t;
    } else if (step > 500) {
      const t = (step - 500) / 450;
      L = L_base + (L_dark - L_base) * t;
    } else {
      L = L_base;
    }
    ramp[step] = formatHex({ mode: "oklch", l: L, c: safeC, h: safeH }) ?? baseHex;
  }
  return ramp as ColorRamp;
}

/** Blend primary[500] + secondary[500] in OKLCH, then build the full ramp. */
export function generateTertiaryRamp(
  primaryRamp: ColorRamp,
  secondaryRamp: ColorRamp
): ColorRamp {
  const mid = interpolateOklch(primaryRamp[500], secondaryRamp[500], 0.5);
  const ramp: Partial<ColorRamp> = {};
  for (const step of RAMP_STEPS) {
    if (step < 500) {
      ramp[step] = interpolateOklch(mid, "#ffffff", 0.6 - step / 1000);
    } else if (step > 500) {
      ramp[step] = interpolateOklch(mid, "#000000", ((step - 500) / 1000) * 0.6);
    } else {
      ramp[step] = mid;
    }
  }
  return ramp as ColorRamp;
}

/** Achromatic (chroma=0) gray ramp across all RAMP_STEPS. */
export function generateGrayRamp(): ColorRamp {
  const L_light = 0.98;
  const L_dark = 0.05;
  const minStep = RAMP_STEPS[0];
  const maxStep = RAMP_STEPS[RAMP_STEPS.length - 1];
  const ramp: Partial<ColorRamp> = {};
  for (const step of RAMP_STEPS) {
    const t = (step - minStep) / (maxStep - minStep);
    const L = L_light + (L_dark - L_light) * t;
    ramp[step] = formatHex({ mode: "oklch", l: L, c: 0, h: undefined }) ?? "#000000";
  }
  return ramp as ColorRamp;
}

/** Build all five ramps from three user-chosen base colors. Gray is always auto-generated. */
export function buildRampSet(
  primaryHex: string,
  secondaryHex: string,
  neutralsHex: string
): RampSet {
  const primary = calculateRamp(primaryHex);
  const secondary = calculateRamp(secondaryHex);
  return {
    primary,
    secondary,
    tertiary: generateTertiaryRamp(primary, secondary),
    neutrals: calculateRamp(neutralsHex),
    gray: generateGrayRamp(),
  };
}

/** Returns "#000000" or "#ffffff" based on OKLCH lightness — for readable text on a swatch. */
export function contrastText(hex: string): string {
  const oklch = toOklch(hex);
  return (oklch?.l ?? 0.5) > 0.55 ? "#000000" : "#ffffff";
}

/** Serialize a RampSet to a storable payload (e.g. for Firestore token versions). */
export function rampSetToPayload(
  ramps: RampSet,
  config: { primary: string; secondary: string; neutrals: string }
) {
  return {
    config,
    ramps: {
      primary: ramps.primary,
      secondary: ramps.secondary,
      tertiary: ramps.tertiary,
      neutrals: ramps.neutrals,
      gray: ramps.gray,
    },
  };
}
