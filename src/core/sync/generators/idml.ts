/**
 * sync/generators/idml.ts — IDML binary generator for the sync pipeline
 *
 * Adapts a SyncableDesignSystem to the IdmlOptions format expected by the
 * existing buildIdmlFiles() exporter, then zips the file tree into a
 * standards-compliant .idml binary using fflate.
 *
 * IDML zip requirements:
 *   - "mimetype" must be the first entry, stored uncompressed (level 0)
 *   - All other entries may use standard deflate compression
 */

import { strToU8, zipSync, type Zippable } from "fflate";
import { buildIdmlFiles, colorRampsToIdmlGroups } from "../../exporters/idml.js";
import type { IdmlColorGroup, IdmlOptions } from "../../exporters/idml.js";
import type { ResolvedScaleEntry } from "../../tokens/scaleDefinition.js";
import { calculateRamp } from "../../tokens/colorRamps.js";
import type { SyncableDesignSystem } from "../../versions/types.js";
import { extractTypographyScales } from "./tokens.js";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generates a complete .idml binary from a design system.
 * Returns a Uint8Array suitable for writing to disk or uploading directly.
 */
export function generateIDML(designSystem: SyncableDesignSystem): Uint8Array {
  const options = buildIdmlOptions(designSystem);
  const fileMap = buildIdmlFiles(options);
  return zipIdml(fileMap);
}

// ---------------------------------------------------------------------------
// Adapt SyncableDesignSystem → IdmlOptions
// ---------------------------------------------------------------------------

function buildIdmlOptions(ds: SyncableDesignSystem): IdmlOptions {
  const { tokens, name } = ds;

  // --- Typography styles ---
  const typographyStyles: ResolvedScaleEntry[] = [];

  if (tokens.typography) {
    const primaryFamily =
      tokens.fontFamilies?.find((f) => f.type === "sans")?.name ??
      tokens.fontFamilies?.[0]?.name ??
      "Inter";

    const scales = extractTypographyScales(tokens.typography);
    for (const scale of scales) {
      typographyStyles.push({
        // SemanticScaleEntry fields
        token: scale.token,
        label: capitalize(scale.token),
        name: scale.token,
        power: 0, // not used in rendering — already resolved
        sizeToken: scale.token,
        weight: numberToWeightString(scale.fontWeight ?? 400),
        leading: scale.lineHeight / scale.fontSize,
        tracking: 0,
        // ResolvedScaleEntry fields
        pointSize: scale.fontSize,
        leadingPt: scale.lineHeight,
        fontFamily: primaryFamily,
        spaceBefore: 0,
        spaceAfter: 0,
      });
    }
  }

  // --- Color groups ---
  const colorGroups: IdmlColorGroup[] = [];

  if (tokens.colors) {
    // Build ramps for each color so InDesign gets the full palette
    const ramps: Record<string, ReturnType<typeof calculateRamp>> = {};
    for (const [name, hex] of Object.entries(tokens.colors)) {
      // Only generate ramps for base colors (skip step tokens like "primary-500")
      if (!name.match(/-\d+$/)) {
        ramps[name] = calculateRamp(hex);
      }
    }

    if (Object.keys(ramps).length) {
      colorGroups.push(...colorRampsToIdmlGroups(ramps));
    } else {
      // Flat color list as a single group
      colorGroups.push({
        name: "Colors",
        swatches: Object.entries(tokens.colors).map(([n, hex]) => ({
          name: capitalize(n),
          hex,
        })),
      });
    }
  }

  return {
    dsName: name,
    typographyStyles,
    colorGroups,
    exportedAt: new Date().toLocaleString("en-US"),
    dsVersion: ds.currentVersion,
  };
}

// ---------------------------------------------------------------------------
// ZIP
// ---------------------------------------------------------------------------

/**
 * Zips an IDML file map into a standards-compliant binary.
 * "mimetype" is stored first and uncompressed as required by the IDML spec.
 */
function zipIdml(fileMap: Map<string, string>): Uint8Array {
  const zippable: Zippable = {};

  // mimetype must be first and uncompressed
  const mimeContent = fileMap.get("mimetype") ?? "application/vnd.adobe.indesign-idml-package";
  zippable["mimetype"] = [strToU8(mimeContent), { level: 0 }];

  // All other files — standard compression
  for (const [path, content] of fileMap) {
    if (path === "mimetype") continue;
    zippable[path] = strToU8(content);
  }

  return zipSync(zippable);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function numberToWeightString(
  weight: number
): "Bold" | "SemiBold" | "Medium" | "Regular" {
  if (weight >= 700) return "Bold";
  if (weight >= 600) return "SemiBold";
  if (weight >= 500) return "Medium";
  return "Regular";
}
