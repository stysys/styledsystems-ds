// Shared color storage utilities for all plugins
// Usage: await saveColorsToClientStorage(colors, ownerId)

export const COLOR_STORAGE_KEY = "styled-systems/styled-colors-data";

/**
 * Save color array to Figma clientStorage (for offline access and cross-plugin sync)
 * @param colors Array of { name, hex }
 * @param ownerId String (user or system id for updatedBy)
 * @param customColorCount Optional number of custom colors
 */
export async function saveColorsToClientStorage(colors, ownerId, customColorCount = 0) {
  if (typeof figma === "undefined" || !figma.clientStorage) return;
  const data = {
    colors,
    customColorCount,
    updatedAt: new Date().toISOString(),
    updatedBy: ownerId,
  };
  await figma.clientStorage.setAsync(COLOR_STORAGE_KEY, data);
  return data;
}

/**
 * Load color array from Figma clientStorage
 * @returns { colors, customColorCount, updatedAt, updatedBy } or null
 */
export async function loadColorsFromClientStorage() {
  if (typeof figma === "undefined" || !figma.clientStorage) return null;
  return await figma.clientStorage.getAsync(COLOR_STORAGE_KEY);
}
