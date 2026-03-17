/**
 * @stysys/core - Typography Font Selection Module
 * Manages font family and weight selection for text styles
 * Extracted from styled-typo plugin's ui/font.ts
 */

import type { FontMetadata } from "./typography-semantic";

/**
 * Font family with available weights
 */
export interface FontFamily {
  family: string;
  weights: string[];
}

/**
 * Initialize font family dropdown options
 */
export function initializeFontFamilyOptions(fonts: FontFamily[]): HTMLSelectElement | null {
  const select = document.getElementById("text-style-font-family") as HTMLSelectElement | null;
  if (!select || !fonts || fonts.length === 0) return null;

  // Build available fonts map
  const availableFonts: Record<string, string[]> = {};
  fonts.forEach((font) => {
    availableFonts[font.family] = font.weights || [];
  });

  select.innerHTML = '<option value="Inter">Inter</option>';
  fonts.forEach((font) => {
    if (font.family !== "Inter") {
      const option = document.createElement("option");
      option.value = font.family;
      option.textContent = font.family;
      select.appendChild(option);
    }
  });

  return select;
}

/**
 * Initialize body font family dropdown options
 */
export function initializeBodyFontFamilyOptions(fonts: FontFamily[]): HTMLSelectElement | null {
  const select = document.getElementById("text-style-body-font-family") as HTMLSelectElement | null;
  if (!select || !fonts || fonts.length === 0) return null;

  select.innerHTML = '<option value="Inter">Inter</option>';
  fonts.forEach((font) => {
    if (font.family !== "Inter") {
      const option = document.createElement("option");
      option.value = font.family;
      option.textContent = font.family;
      select.appendChild(option);
    }
  });

  return select;
}

/**
 * Update font weights based on selected font family (headings)
 */
export function updateHeadingsFontWeights(fonts: FontFamily[], savedWeight?: string): void {
  const fontFamilySelect = document.getElementById(
    "text-style-font-family"
  ) as HTMLSelectElement | null;
  const fontWeightSelect = document.getElementById(
    "text-style-font-weight"
  ) as HTMLSelectElement | null;

  if (!fontFamilySelect || !fontWeightSelect) return;

  const selectedFamily = fontFamilySelect.value;
  const availableFonts: Record<string, string[]> = {};
  fonts.forEach((font) => {
    availableFonts[font.family] = font.weights || [];
  });

  const weights = availableFonts[selectedFamily] || ["Regular", "Medium", "SemiBold", "Bold"];

  fontWeightSelect.innerHTML = "";
  weights.forEach((weight) => {
    const option = document.createElement("option");
    option.value = weight;
    option.textContent = weight;
    fontWeightSelect.appendChild(option);
  });

  // Restore saved weight if available
  if (savedWeight && fontWeightSelect.querySelector(`option[value="${savedWeight}"]`)) {
    fontWeightSelect.value = savedWeight;
  } else {
    fontWeightSelect.value = "Regular";
  }
}

/**
 * Update font weights based on selected font family (body)
 */
export function updateBodyFontWeights(fonts: FontFamily[], savedWeight?: string): void {
  const fontFamilySelect = document.getElementById(
    "text-style-body-font-family"
  ) as HTMLSelectElement | null;
  const fontWeightSelect = document.getElementById(
    "text-style-body-font-weight"
  ) as HTMLSelectElement | null;

  if (!fontFamilySelect || !fontWeightSelect) return;

  const selectedFamily = fontFamilySelect.value;
  const availableFonts: Record<string, string[]> = {};
  fonts.forEach((font) => {
    availableFonts[font.family] = font.weights || [];
  });

  const weights = availableFonts[selectedFamily] || ["Regular", "Medium", "SemiBold", "Bold"];

  fontWeightSelect.innerHTML = "";
  weights.forEach((weight) => {
    const option = document.createElement("option");
    option.value = weight;
    option.textContent = weight;
    fontWeightSelect.appendChild(option);
  });

  // Restore saved weight if available
  if (savedWeight && fontWeightSelect.querySelector(`option[value="${savedWeight}"]`)) {
    fontWeightSelect.value = savedWeight;
  } else {
    fontWeightSelect.value = "Regular";
  }
}

/**
 * Get selected font metadata for headings
 */
export function getSelectedHeadingsFont(): FontMetadata {
  const familySelect = document.getElementById(
    "text-style-font-family"
  ) as HTMLSelectElement | null;
  const weightSelect = document.getElementById(
    "text-style-font-weight"
  ) as HTMLSelectElement | null;

  return {
    family: familySelect?.value || "Inter",
    weight: weightSelect?.value || "Regular",
  };
}

/**
 * Get selected font metadata for body
 */
export function getSelectedBodyFont(): FontMetadata {
  const familySelect = document.getElementById(
    "text-style-body-font-family"
  ) as HTMLSelectElement | null;
  const weightSelect = document.getElementById(
    "text-style-body-font-weight"
  ) as HTMLSelectElement | null;

  return {
    family: familySelect?.value || "Inter",
    weight: weightSelect?.value || "Regular",
  };
}

/**
 * Save font selections to client storage
 */
export async function saveFontSelections(storageKey: string, existingData?: any): Promise<void> {
  const headingsFont = getSelectedHeadingsFont();
  const bodyFont = getSelectedBodyFont();

  const fontData = {
    "text-style-font-family": headingsFont.family,
    "text-style-font-weight": headingsFont.weight,
    "text-style-body-font-family": bodyFont.family,
    "text-style-body-font-weight": bodyFont.weight,
  };

  if (typeof figma !== "undefined" && figma.clientStorage) {
    const mergedData = { ...existingData, ...fontData };
    await figma.clientStorage.setAsync(storageKey, mergedData);
  }
}

/**
 * Load font selections from stored data
 */
export function loadFontSelections(data: any): void {
  const headingsFontFamily = data["text-style-font-family"];
  const headingsFontWeight = data["text-style-font-weight"];
  const bodyFontFamily = data["text-style-body-font-family"];
  const bodyFontWeight = data["text-style-body-font-weight"];

  if (headingsFontFamily) {
    const select = document.getElementById("text-style-font-family") as HTMLSelectElement;
    if (select) select.value = headingsFontFamily;
  }

  if (headingsFontWeight) {
    const select = document.getElementById("text-style-font-weight") as HTMLSelectElement;
    if (select) select.value = headingsFontWeight;
  }

  if (bodyFontFamily) {
    const select = document.getElementById("text-style-body-font-family") as HTMLSelectElement;
    if (select) select.value = bodyFontFamily;
  }

  if (bodyFontWeight) {
    const select = document.getElementById("text-style-body-font-weight") as HTMLSelectElement;
    if (select) select.value = bodyFontWeight;
  }
}
