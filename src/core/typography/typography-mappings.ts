/**
 * @stysys/core - Typography Mapping Storage & Orchestration
 * Manages persistence and retrieval of text style mappings
 */

import type { TextStyleMapping, TextStyleMappingRow } from "./typography-semantic";
import { generateSemanticMappings } from "./typography-semantic";
import type { ScaleStep } from "./typography";

// Global state for mappings
let savedTextStyleMappings: TextStyleMapping[] | null = null;

/**
 * Get saved text style mappings
 */
export function getSavedTextStyleMappings(): TextStyleMapping[] | null {
  return savedTextStyleMappings;
}

/**
 * Set saved text style mappings
 */
export function setSavedTextStyleMappings(mappings: TextStyleMapping[] | null): void {
  savedTextStyleMappings = mappings;
}

/**
 * Save text style mappings to client storage
 */
export async function saveTextStyleMappings(
  mappings: TextStyleMapping[],
  storageKey: string,
  existingData?: any
): Promise<void> {
  if (typeof figma === "undefined" || !figma.clientStorage) {
    console.warn("[Typography] Figma clientStorage not available");
    return;
  }

  try {
    const mappingData = {
      "text-style-mappings": JSON.stringify(
        mappings.map((m) => ({
          scaleName: m.scaleName,
          rows: m.rows,
        }))
      ),
    };

    const mergedData = { ...existingData, ...mappingData };
    await figma.clientStorage.setAsync(storageKey, mergedData);
    setSavedTextStyleMappings(mappings);
    console.log("[Typography] Mappings saved successfully");
  } catch (error) {
    console.error("[Typography] Failed to save mappings:", error);
  }
}

/**
 * Load text style mappings from storage
 */
export function loadTextStyleMappings(data: any): TextStyleMapping[] | null {
  try {
    if (data && data["text-style-mappings"]) {
      const parsed = JSON.parse(data["text-style-mappings"]);
      setSavedTextStyleMappings(parsed);
      return parsed;
    }
  } catch (error) {
    console.error("[Typography] Failed to load mappings:", error);
  }
  return null;
}

/**
 * Generate default mappings for scale steps
 * Used when no saved mappings exist
 */
export function generateDefaultMappings(
  activeSteps: ScaleStep[],
  minFontSize: number,
  maxFontSize: number,
  minTypeScale: number,
  maxTypeScale: number
): TextStyleMapping[] {
  const semanticMap = generateSemanticMappings(activeSteps);

  return activeSteps.map((step) => {
    // Calculate min and max sizes for this step
    const minSize = Math.round(minFontSize * Math.pow(minTypeScale, step.power));
    const maxSize = Math.round(maxFontSize * Math.pow(maxTypeScale, step.power));

    const defaultSemanticNames = semanticMap[step.name] || [];

    const rows: TextStyleMappingRow[] = defaultSemanticNames.map((name) => ({
      semanticName: name,
      checked: true,
    }));

    return {
      scaleName: step.name,
      rows: rows.length > 0 ? rows : [{ semanticName: "", checked: false }],
    };
  });
}

/**
 * Collect all mapping data from UI for export
 */
export function collectMappingsFromUI(): Array<{
  scaleName: string;
  semanticName: string;
  minSize: number;
  maxSize: number;
}> {
  const result: Array<{
    scaleName: string;
    semanticName: string;
    minSize: number;
    maxSize: number;
  }> = [];

  document.querySelectorAll(".text-style-mapping-item").forEach((item) => {
    const scaleName = (item as HTMLElement).dataset.scaleName || "";
    const sizeText =
      (item as HTMLElement).querySelector(".text-style-mapping-item__size")?.textContent || "";

    // Parse "123.45px – 234.56px" format
    const sizeMatch = sizeText.match(/(\d+\.?\d*)\s*px\s*[–-]\s*(\d+\.?\d*)\s*px/);
    const minSize = sizeMatch ? parseFloat(sizeMatch[1]) : 0;
    const maxSize = sizeMatch ? parseFloat(sizeMatch[2]) : 0;

    // Collect all selected semantic names for this scale
    const rows = item.querySelectorAll(".text-style-mapping-item__row");
    rows.forEach((row) => {
      const select = row.querySelector("select") as HTMLSelectElement;
      const checkbox = row.querySelector("input[type='checkbox']") as HTMLInputElement;

      const semanticName = select?.value || "";
      const isChecked = checkbox?.checked || false;

      if (semanticName && isChecked) {
        result.push({
          scaleName,
          semanticName,
          minSize,
          maxSize,
        });
      }
    });
  });

  return result;
}

/**
 * Create mapping rows for rendering
 */
export function createMappingRows(
  scaleNames: string[],
  fallbackSemanticNames: Record<string, string[]>,
  savedMappings?: TextStyleMapping[]
): Record<string, TextStyleMappingRow[]> {
  const result: Record<string, TextStyleMappingRow[]> = {};

  scaleNames.forEach((scaleName) => {
    const savedMapping = savedMappings?.find((m) => m.scaleName === scaleName);

    if (savedMapping && savedMapping.rows) {
      result[scaleName] = savedMapping.rows;
    } else {
      const defaultNames = fallbackSemanticNames[scaleName] || [];
      result[scaleName] = defaultNames.map((name) => ({
        semanticName: name,
        checked: true,
      }));
    }
  });

  return result;
}
