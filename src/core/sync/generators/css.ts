/**
 * sync/generators/css.ts — CSS custom properties generator
 */

import type { SyncableDesignSystem } from "../../versions/types.js";
import { extractTypographyScales } from "./tokens.js";

export type CssMode = "custom-props" | "scss-vars";

/**
 * Generates a CSS (or SCSS) variables file from the design system tokens.
 */
export function generateCSSVariables(
  designSystem: SyncableDesignSystem,
  mode: CssMode = "custom-props"
): string {
  const { tokens } = designSystem;
  const prefix = mode === "scss-vars" ? "$" : "--";
  const open = mode === "scss-vars" ? "" : ":root {\n";
  const close = mode === "scss-vars" ? "" : "}\n";
  const indent = mode === "scss-vars" ? "" : "  ";

  const lines: string[] = [];

  // --- Font families ---
  if (tokens.fontFamilies?.length) {
    lines.push(`${indent}/* Font families */`);
    for (const ff of tokens.fontFamilies) {
      lines.push(`${indent}${prefix}font-${ff.type}: "${ff.name}", sans-serif;`);
    }
    lines.push("");
  }

  // --- Typography scales ---
  if (tokens.typography) {
    const scales = extractTypographyScales(tokens.typography);
    if (scales.length) {
      lines.push(`${indent}/* Typography scales */`);
      for (const s of scales) {
        lines.push(`${indent}${prefix}text-${s.token}-size: ${s.fontSize}px;`);
        lines.push(`${indent}${prefix}text-${s.token}-leading: ${s.lineHeight}px;`);
        if (s.fontWeight !== undefined) {
          lines.push(`${indent}${prefix}text-${s.token}-weight: ${s.fontWeight};`);
        }
      }
      lines.push("");
    }
  }

  // --- Colors ---
  if (tokens.colors) {
    lines.push(`${indent}/* Colors */`);
    for (const [name, value] of Object.entries(tokens.colors)) {
      lines.push(`${indent}${prefix}color-${name}: ${value};`);
    }
    lines.push("");
  }

  // --- Spacing ---
  if (tokens.spacing) {
    lines.push(`${indent}/* Spacing */`);
    for (const [name, value] of Object.entries(tokens.spacing)) {
      lines.push(`${indent}${prefix}spacing-${name}: ${value}px;`);
    }
    lines.push("");
  }

  // Remove trailing blank line before closing brace
  while (lines[lines.length - 1] === "") lines.pop();

  const body = lines.join("\n");
  return `${open}${body}\n${close}`;
}
