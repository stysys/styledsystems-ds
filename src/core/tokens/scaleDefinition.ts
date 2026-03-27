/**
 * scaleDefinition.ts
 *
 * Single source of truth for the semantic type scale.
 * Shared across the Stysys ecosystem:
 *   - InDesign plugin  (creates paragraph styles via UXP API)
 *   - Figma plugin     (creates text styles via Figma API)
 *   - styledsystems    (preview, token version storage, IDML export)
 *
 * `power` drives the modular scale: size = baseFontSize × typeScale^power
 * `leading` is a multiplier applied to the computed size (1.1 = tight, 1.6 = loose)
 * `tracking` is in InDesign thousandths-of-em (e.g. -20 = -0.02em, 80 = 0.08em)
 *
 * Vertical rhythm uses the SAME typeScale ratio for spacing:
 *   spaceBefore = rhythmBase × typeScale^spacePowerBefore
 *   spaceAfter  = rhythmBase × typeScale^spacePowerAfter
 * This means changing the type scale ratio adjusts spacing proportionally too —
 * one ratio governs the whole system.
 */

export interface SemanticScaleEntry {
  /** Unique token identifier, e.g. "h1", "body-small" */
  token: string;
  /** Human-readable label shown in UIs */
  label: string;
  /** Style name used when writing to InDesign / Figma */
  name: string;
  /** Modular scale power — 0 is the base (body) size */
  power: number;
  /** Tailwind size token mapping, e.g. "5xl", "base", "xs" */
  sizeToken: string;
  /** Font weight string as expected by InDesign / Figma */
  weight: "Bold" | "SemiBold" | "Medium" | "Regular";
  /** Line height multiplier (applied to computed font size) */
  leading: number;
  /** Tracking in InDesign thousandths-of-em */
  tracking: number;
  /**
   * Modular scale power for space BEFORE the paragraph.
   * spaceBefore = rhythmBase × typeScale^spacePowerBefore
   * Default: 1
   */
  spacePowerBefore?: number;
  /**
   * Modular scale power for space AFTER the paragraph.
   * spaceAfter = rhythmBase × typeScale^spacePowerAfter
   * Default: 0
   */
  spacePowerAfter?: number;
}

export const SEMANTIC_SCALE: SemanticScaleEntry[] = [
  {
    token: "display",
    label: "Display",
    name: "display",
    power: 10,
    sizeToken: "5xl",
    weight: "Bold",
    leading: 1.1,
    tracking: -20,
    spacePowerBefore: 8,
    spacePowerAfter: 4,
  },
  {
    token: "h1",
    label: "H1",
    name: "h1",
    power: 8,
    sizeToken: "4xl",
    weight: "Bold",
    leading: 1.15,
    tracking: -10,
    spacePowerBefore: 7,
    spacePowerAfter: 3,
  },
  {
    token: "h2",
    label: "H2",
    name: "h2",
    power: 7,
    sizeToken: "3xl",
    weight: "Bold",
    leading: 1.2,
    tracking: -5,
    spacePowerBefore: 6,
    spacePowerAfter: 3,
  },
  {
    token: "h3",
    label: "H3",
    name: "h3",
    power: 6,
    sizeToken: "2xl",
    weight: "SemiBold",
    leading: 1.25,
    tracking: 0,
    spacePowerBefore: 5,
    spacePowerAfter: 2,
  },
  {
    token: "h4",
    label: "H4",
    name: "h4",
    power: 5,
    sizeToken: "xl",
    weight: "SemiBold",
    leading: 1.3,
    tracking: 0,
    spacePowerBefore: 4,
    spacePowerAfter: 2,
  },
  {
    token: "h5",
    label: "H5",
    name: "h5",
    power: 4,
    sizeToken: "lg",
    weight: "SemiBold",
    leading: 1.4,
    tracking: 0,
    spacePowerBefore: 4,
    spacePowerAfter: 1,
  },
  {
    token: "h6",
    label: "H6",
    name: "h6",
    power: 3,
    sizeToken: "md",
    weight: "SemiBold",
    leading: 1.45,
    tracking: 0,
    spacePowerBefore: 3,
    spacePowerAfter: 1,
  },
  {
    token: "body-large",
    label: "Body Large",
    name: "body-large",
    power: 3,
    sizeToken: "md",
    weight: "Regular",
    leading: 1.5,
    tracking: 0,
    spacePowerBefore: 3,
    spacePowerAfter: 1,
  },
  {
    token: "body",
    label: "Body",
    name: "body",
    power: 0,
    sizeToken: "base",
    weight: "Regular",
    leading: 1.5,
    tracking: 0,
    spacePowerBefore: 2,
    spacePowerAfter: 1,
  },
  {
    token: "body-small",
    label: "Body Small",
    name: "body-small",
    power: -1,
    sizeToken: "sm",
    weight: "Regular",
    leading: 1.5,
    tracking: 5,
    spacePowerBefore: 1,
    spacePowerAfter: 0,
  },
  {
    token: "caption",
    label: "Caption",
    name: "caption",
    power: -2,
    sizeToken: "xs",
    weight: "Regular",
    leading: 1.4,
    tracking: 10,
    spacePowerBefore: 1,
    spacePowerAfter: 0,
  },
  {
    token: "small-text",
    label: "Small Text",
    name: "small-text",
    power: -3,
    sizeToken: "2xs",
    weight: "Regular",
    leading: 1.35,
    tracking: 20,
    spacePowerBefore: 0,
    spacePowerAfter: 0,
  },
  {
    token: "overline",
    label: "Overline",
    name: "overline",
    power: -4,
    sizeToken: "3xs",
    weight: "Medium",
    leading: 1.3,
    tracking: 80,
    spacePowerBefore: 3,
    spacePowerAfter: -1,
  },
];

/**
 * Resolve the actual point size for a scale entry given a base size and ratio.
 * Formula: baseFontSize × typeScale^power, rounded to 2 decimal places.
 */
export function resolvePointSize(
  entry: SemanticScaleEntry,
  baseFontSize: number,
  typeScale: number
): number {
  return Math.round(baseFontSize * Math.pow(typeScale, entry.power) * 100) / 100;
}

/**
 * Derive the vertical rhythm base unit from the body font size.
 * Default: baseFontSize × 0.5  (e.g. 16px → 8pt grid)
 * Can be overridden with an explicit value from token storage.
 */
export function resolveRhythmBase(baseFontSize: number, override?: number): number {
  if (override != null && override > 0) return override;
  return Math.round(baseFontSize * 0.5 * 100) / 100;
}

/**
 * Resolve all scale entries to concrete point sizes, leading, and spacing values.
 * Returns objects ready to pass to InDesign, Figma, or IDML exporters.
 *
 * Vertical rhythm uses the same typeScale ratio as type sizes:
 *   spaceBefore = rhythmBase × typeScale^spacePowerBefore
 * So adjusting the type scale ratio automatically scales spacing proportionally.
 */
export function resolveSemanticScale(
  baseFontSize: number,
  typeScale: number,
  fontFamily = "Arial",
  entries: SemanticScaleEntry[] = SEMANTIC_SCALE,
  rhythmBase?: number
): ResolvedScaleEntry[] {
  const rb = resolveRhythmBase(baseFontSize, rhythmBase);
  return entries.map((entry) => {
    const pointSize = resolvePointSize(entry, baseFontSize, typeScale);
    return {
      ...entry,
      pointSize,
      leadingPt: Math.round(pointSize * entry.leading * 100) / 100,
      fontFamily,
      spaceBefore: Math.round(rb * Math.pow(typeScale, entry.spacePowerBefore ?? 1) * 100) / 100,
      spaceAfter:  Math.round(rb * Math.pow(typeScale, entry.spacePowerAfter  ?? 0) * 100) / 100,
    };
  });
}

export interface ResolvedScaleEntry extends SemanticScaleEntry {
  /** Computed font size in points */
  pointSize: number;
  /** Computed line height in points (pointSize × leading multiplier) */
  leadingPt: number;
  /** Font family name */
  fontFamily: string;
  /** Space before paragraph in points — rhythmBase × typeScale^spacePowerBefore */
  spaceBefore: number;
  /** Space after paragraph in points — rhythmBase × typeScale^spacePowerAfter */
  spaceAfter: number;
}
