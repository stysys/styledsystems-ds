/**
 * sync/generators/figma.ts — Figma-compatible token formats
 *
 * Two formats:
 *   1. figma-tokens.json  — Tokens Studio plugin format (tokens.studio)
 *   2. figma-variables.json — Native Figma Variables REST API format
 */

import type { SyncableDesignSystem } from "../../versions/types.js";
import { extractTypographyScales } from "./tokens.js";

// ---------------------------------------------------------------------------
// 1. Figma Tokens (Tokens Studio plugin format)
// ---------------------------------------------------------------------------

export interface FigmaTokensDocument {
  global: {
    fontFamilies?: Record<string, { value: string; type: "fontFamilies" }>;
    fontSize?: Record<string, { value: number; type: "fontSizes" }>;
    lineHeights?: Record<string, { value: number; type: "lineHeights" }>;
    fontWeights?: Record<string, { value: number; type: "fontWeights" }>;
    typography?: Record<string, { value: FigmaTypographyComposition; type: "typography" }>;
    colors?: Record<string, { value: string; type: "color" }>;
    spacing?: Record<string, { value: number; type: "spacing" }>;
  };
}

interface FigmaTypographyComposition {
  fontFamily: string;
  fontSize: string;
  lineHeight: string;
  fontWeight?: string;
}

/**
 * Generates a Figma Tokens Studio compatible tokens.json document.
 */
export function generateFigmaTokens(
  designSystem: SyncableDesignSystem
): FigmaTokensDocument {
  const { tokens } = designSystem;
  const doc: FigmaTokensDocument = { global: {} };
  const primaryFamily =
    tokens.fontFamilies?.[0]?.name ??
    tokens.fontFamilies?.find((f) => f.type === "sans")?.name ??
    "sans-serif";
  const primaryFamilyKey =
    tokens.fontFamilies?.[0]?.type ?? "body";

  // Font families
  if (tokens.fontFamilies?.length) {
    doc.global.fontFamilies = {};
    for (const ff of tokens.fontFamilies) {
      doc.global.fontFamilies[ff.type] = { value: ff.name, type: "fontFamilies" };
    }
  }

  // Typography scales
  if (tokens.typography) {
    const scales = extractTypographyScales(tokens.typography);

    if (scales.length) {
      doc.global.fontSize = {};
      doc.global.lineHeights = {};
      doc.global.typography = {};
      if (scales.some((s) => s.fontWeight !== undefined)) {
        doc.global.fontWeights = {};
      }

      for (const s of scales) {
        doc.global.fontSize![s.token] = { value: s.fontSize, type: "fontSizes" };
        doc.global.lineHeights![s.token] = { value: s.lineHeight, type: "lineHeights" };

        if (s.fontWeight !== undefined && doc.global.fontWeights) {
          doc.global.fontWeights[s.token] = { value: s.fontWeight, type: "fontWeights" };
        }

        const composition: FigmaTypographyComposition = {
          fontFamily: `{fontFamilies.${primaryFamilyKey}}`,
          fontSize: `{fontSize.${s.token}}`,
          lineHeight: `{lineHeights.${s.token}}`,
        };
        if (s.fontWeight !== undefined) {
          composition.fontWeight = `{fontWeights.${s.token}}`;
        }
        doc.global.typography![s.token] = { value: composition, type: "typography" };
      }
    }
  }

  // Colors
  if (tokens.colors) {
    doc.global.colors = {};
    for (const [name, value] of Object.entries(tokens.colors)) {
      doc.global.colors[name] = { value, type: "color" };
    }
  }

  // Spacing
  if (tokens.spacing) {
    doc.global.spacing = {};
    for (const [name, value] of Object.entries(tokens.spacing)) {
      doc.global.spacing[name] = { value, type: "spacing" };
    }
  }

  return doc;
}

// ---------------------------------------------------------------------------
// 2. Figma Variables (native REST API format)
// ---------------------------------------------------------------------------

export interface FigmaVariablesDocument {
  collections: FigmaVariableCollection[];
  variables: FigmaVariable[];
}

interface FigmaVariableCollection {
  id: string;
  name: string;
  modes: Array<{ modeId: string; name: string }>;
  variableIds: string[];
}

interface FigmaVariable {
  id: string;
  name: string;
  resolvedType: "COLOR" | "FLOAT" | "STRING" | "BOOLEAN";
  valuesByMode: Record<string, unknown>;
  scopes: string[];
}

/**
 * Generates a Figma Variables document in the native REST API format.
 */
export function generateFigmaVariables(
  designSystem: SyncableDesignSystem
): FigmaVariablesDocument {
  const { tokens } = designSystem;
  const collection: FigmaVariableCollection = {
    id: "design-system",
    name: designSystem.name || "Design System",
    modes: [{ modeId: "default", name: "Default" }],
    variableIds: [],
  };
  const variables: FigmaVariable[] = [];
  let index = 0;

  // Colors
  if (tokens.colors) {
    for (const [name, hex] of Object.entries(tokens.colors)) {
      const id = `color-${index++}`;
      collection.variableIds.push(id);
      variables.push({
        id,
        name: `color/${name}`,
        resolvedType: "COLOR",
        valuesByMode: { default: parseHexToRgba(hex) },
        scopes: ["ALL_SCOPES"],
      });
    }
  }

  // Typography as FLOAT variables
  if (tokens.typography) {
    const scales = extractTypographyScales(tokens.typography);
    for (const s of scales) {
      const sizeId = `fontSize-${index++}`;
      const leadingId = `lineHeight-${index++}`;
      collection.variableIds.push(sizeId, leadingId);

      variables.push({
        id: sizeId,
        name: `typography/${s.token}/size`,
        resolvedType: "FLOAT",
        valuesByMode: { default: s.fontSize },
        scopes: ["FONT_SIZE"],
      });
      variables.push({
        id: leadingId,
        name: `typography/${s.token}/lineHeight`,
        resolvedType: "FLOAT",
        valuesByMode: { default: s.lineHeight },
        scopes: ["LINE_HEIGHT"],
      });
    }
  }

  // Spacing
  if (tokens.spacing) {
    for (const [name, value] of Object.entries(tokens.spacing)) {
      const id = `spacing-${index++}`;
      collection.variableIds.push(id);
      variables.push({
        id,
        name: `spacing/${name}`,
        resolvedType: "FLOAT",
        valuesByMode: { default: value },
        scopes: ["GAP", "WIDTH_HEIGHT", "CORNER_RADIUS"],
      });
    }
  }

  return { collections: [collection], variables };
}

// ---------------------------------------------------------------------------
// Color parsing
// ---------------------------------------------------------------------------

interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

function parseHexToRgba(hex: string): RgbaColor {
  const clean = hex.replace("#", "");
  if (clean.length === 3) {
    const [r, g, b] = clean.split("").map((c) => parseInt(c + c, 16));
    return { r: r / 255, g: g / 255, b: b / 255, a: 1 };
  }
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const a = clean.length === 8 ? parseInt(clean.slice(6, 8), 16) / 255 : 1;
  return { r: r / 255, g: g / 255, b: b / 255, a };
}
