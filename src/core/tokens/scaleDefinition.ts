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
  { token: "display-lg", label: "Display LG", name: "display-lg",
    power: 10, sizeToken: "9xl", weight: "Regular",   leading: 1.05, tracking: -30, spacePowerBefore: 8, spacePowerAfter: 4 },
  { token: "display",    label: "Display",    name: "display",
    power: 9,  sizeToken: "8xl", weight: "Regular",   leading: 1.06, tracking: -25, spacePowerBefore: 7, spacePowerAfter: 4 },
  { token: "display-sm", label: "Display SM", name: "display-sm",
    power: 8,  sizeToken: "7xl", weight: "Regular",   leading: 1.08, tracking: -20, spacePowerBefore: 7, spacePowerAfter: 3 },
  { token: "heading-xl", label: "Heading XL", name: "heading-xl",
    power: 7,  sizeToken: "6xl", weight: "Bold",    leading: 1.1,  tracking: -20, spacePowerBefore: 7, spacePowerAfter: 3 },
  { token: "heading-lg", label: "Heading LG", name: "heading-lg",
    power: 6,  sizeToken: "5xl", weight: "Bold",    leading: 1.15, tracking: -15, spacePowerBefore: 6, spacePowerAfter: 3 },
  { token: "heading-md", label: "Heading MD", name: "heading-md",
    power: 5,  sizeToken: "4xl", weight: "SemiBold", leading: 1.2, tracking: -10, spacePowerBefore: 5, spacePowerAfter: 2 },
  { token: "title-lg",   label: "Title LG",   name: "title-lg",
    power: 4,  sizeToken: "3xl", weight: "SemiBold", leading: 1.25, tracking: -5, spacePowerBefore: 4, spacePowerAfter: 2 },
  { token: "title-md",   label: "Title MD",   name: "title-md",
    power: 3,  sizeToken: "2xl", weight: "SemiBold", leading: 1.3,  tracking: 0,  spacePowerBefore: 4, spacePowerAfter: 1 },
  { token: "title-sm",   label: "Title SM",   name: "title-sm",
    power: 2,  sizeToken: "xl",  weight: "Medium",  leading: 1.4,  tracking: 0,  spacePowerBefore: 3, spacePowerAfter: 1 },
  { token: "body-lg",    label: "Body LG",    name: "body-lg",
    power: 1,  sizeToken: "lg",  weight: "Regular", leading: 1.6,  tracking: 0,  spacePowerBefore: 3, spacePowerAfter: 1 },
  { token: "body",       label: "Body",       name: "body",
    power: 0,  sizeToken: "base", weight: "Regular", leading: 1.6,  tracking: 0,  spacePowerBefore: 2, spacePowerAfter: 1 },
  { token: "body-sm",    label: "Body SM",    name: "body-sm",
    power: -1, sizeToken: "sm",  weight: "Regular", leading: 1.5,  tracking: 5,  spacePowerBefore: 1, spacePowerAfter: 0 },
  { token: "label-lg",   label: "Label LG",   name: "label-lg",
    power: -2, sizeToken: "xs",  weight: "Medium",  leading: 1.4,  tracking: 10, spacePowerBefore: 1, spacePowerAfter: 0 },
  { token: "label-md",   label: "Label MD",   name: "label-md",
    power: -3, sizeToken: "2xs", weight: "Medium",  leading: 1.35, tracking: 20, spacePowerBefore: 0, spacePowerAfter: 0 },
  { token: "label-sm",   label: "Label SM",   name: "label-sm",
    power: -4, sizeToken: "3xs", weight: "Medium",  leading: 1.3,  tracking: 80, spacePowerBefore: 0, spacePowerAfter: -1 },
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
 * Type sizes use typeScale; paragraph spacing uses spaceScale (falls back to
 * typeScale if not set). Decoupling them lets spacing breathe more dramatically
 * than the type scale alone — e.g. typeScale 1.125, spaceScale 1.25.
 *
 *   pointSize   = baseFontSize × typeScale^power
 *   spaceBefore = rhythmBase   × spaceScale^spacePowerBefore
 */
export function resolveSemanticScale(
  baseFontSize: number,
  typeScale: number,
  fontFamily = "Arial",
  entries: SemanticScaleEntry[] = SEMANTIC_SCALE,
  rhythmBase?: number,
  spaceScale?: number
): ResolvedScaleEntry[] {
  const rb = resolveRhythmBase(baseFontSize, rhythmBase);
  const sr = spaceScale ?? typeScale;
  return entries.map((entry) => {
    const pointSize = resolvePointSize(entry, baseFontSize, typeScale);
    return {
      ...entry,
      pointSize,
      leadingPt: Math.round(pointSize * entry.leading * 100) / 100,
      fontFamily,
      spaceBefore: Math.round(rb * Math.pow(sr, entry.spacePowerBefore ?? 1) * 100) / 100,
      spaceAfter:  Math.round(rb * Math.pow(sr, entry.spacePowerAfter  ?? 0) * 100) / 100,
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
