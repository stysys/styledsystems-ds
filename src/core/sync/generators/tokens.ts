/**
 * sync/generators/tokens.ts — W3C Design Token Format
 * Spec: https://design-tokens.github.io/community-group/format/
 */

import type { SyncableDesignSystem } from "../../versions/types.js";

// ---------------------------------------------------------------------------
// W3C token types
// ---------------------------------------------------------------------------

interface W3CToken<T = string> {
  $value: T;
  $type: string;
  $description?: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface W3CTokenGroup extends Record<string, W3CToken | W3CTokenGroup> {}

export interface W3CTokensDocument {
  typography?: {
    fontFamily?: Record<string, W3CToken<string>>;
    fontSize?: Record<string, W3CToken<string>>;
    lineHeight?: Record<string, W3CToken<string>>;
    fontWeight?: Record<string, W3CToken<string>>;
  };
  color?: Record<string, W3CToken<string>>;
  spacing?: Record<string, W3CToken<string>>;
}

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

/**
 * Generates a W3C Design Token Format document from a design system.
 */
export function generateW3CTokens(
  designSystem: SyncableDesignSystem
): W3CTokensDocument {
  const doc: W3CTokensDocument = {};
  const { tokens } = designSystem;

  // --- Typography ---
  const typo = tokens.typography;
  const families = tokens.fontFamilies;

  if (typo || families) {
    doc.typography = {};

    // Font families from the fontFamilies array
    if (families?.length) {
      doc.typography.fontFamily = {};
      for (const ff of families) {
        doc.typography.fontFamily[ff.type] = {
          $value: ff.name,
          $type: "fontFamily",
        };
      }
    }

    // Scales: any key on typography that has size + leading fields
    if (typo) {
      const scales = extractTypographyScales(typo);
      if (scales.length) {
        doc.typography.fontSize = {};
        doc.typography.lineHeight = {};
        doc.typography.fontWeight = {};

        for (const scale of scales) {
          doc.typography.fontSize[scale.token] = {
            $value: `${scale.fontSize}px`,
            $type: "dimension",
          };
          doc.typography.lineHeight[scale.token] = {
            $value: `${scale.lineHeight}px`,
            $type: "dimension",
          };
          if (scale.fontWeight !== undefined) {
            doc.typography.fontWeight[scale.token] = {
              $value: String(scale.fontWeight),
              $type: "fontWeight",
            };
          }
        }
      }
    }
  }

  // --- Colors ---
  if (tokens.colors) {
    doc.color = {};
    for (const [name, value] of Object.entries(tokens.colors)) {
      doc.color[name] = { $value: value, $type: "color" };
    }
  }

  // --- Spacing ---
  if (tokens.spacing) {
    doc.spacing = {};
    for (const [name, value] of Object.entries(tokens.spacing)) {
      doc.spacing[name] = {
        $value: `${value}px`,
        $type: "dimension",
      };
    }
  }

  return doc;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface NormalizedScale {
  token: string;
  fontSize: number;
  lineHeight: number;
  fontWeight?: number;
}

/**
 * Extracts normalized scale entries from the typography token map.
 * Handles both ResolvedScaleEntry shape (pointSize/leadingPt) and
 * a simpler {size, leading} shape used in some design system documents.
 */
export function extractTypographyScales(
  typography: Record<string, any>
): NormalizedScale[] {
  const scales: NormalizedScale[] = [];

  for (const [key, value] of Object.entries(typography)) {
    if (key === "rhythm" || typeof value !== "object" || value === null) continue;

    // ResolvedScaleEntry shape
    if ("pointSize" in value && "leadingPt" in value) {
      scales.push({
        token: key,
        fontSize: Math.round(value.pointSize),
        lineHeight: Math.round(value.leadingPt),
        fontWeight: value.weight ? weightToNumber(value.weight) : undefined,
      });
      continue;
    }

    // Simple {size, leading} shape
    if ("size" in value && "leading" in value) {
      scales.push({
        token: key,
        fontSize: value.size,
        lineHeight: value.leading,
        fontWeight: value.weight ? weightToNumber(value.weight) : undefined,
      });
      continue;
    }

    // {fontSize, lineHeight} shape
    if ("fontSize" in value && "lineHeight" in value) {
      scales.push({
        token: key,
        fontSize: value.fontSize,
        lineHeight: value.lineHeight,
        fontWeight: value.fontWeight,
      });
    }
  }

  return scales;
}

function weightToNumber(weight: string | number): number | undefined {
  if (typeof weight === "number") return weight;
  const map: Record<string, number> = {
    Bold: 700,
    SemiBold: 600,
    Medium: 500,
    Regular: 400,
    Light: 300,
  };
  return map[weight];
}
