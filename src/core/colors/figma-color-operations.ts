/**
 * Figma Color Operations
 * Shared utilities for creating Figma color styles and variables
 * Reused across styled-colors and styled-connect plugins
 */

/**
 * Convert hex color to RGB format for Figma
 * @param hex - Hex color string (e.g., "#FF0000")
 * @returns RGB object with normalized values (0-1)
 */
export function hexToRGB(hex: string): { r: number; g: number; b: number } {
  if (typeof hex !== "string" || !/^#[0-9a-fA-F]{6}$/.test(hex)) {
    return { r: 0, g: 0.5, b: 1 }; // Default blue
  }
  const hexVal = hex.replace("#", "");
  const bigint = parseInt(hexVal, 16);
  return {
    r: ((bigint >> 16) & 255) / 255,
    g: ((bigint >> 8) & 255) / 255,
    b: (bigint & 255) / 255,
  };
}

/**
 * Create or update a Figma color paint style
 * @param styleName - Style name (e.g., "Colors/Primary/500")
 * @param hexColor - Hex color value
 * @param skipIfExists - If true, only create if style doesn't exist (don't overwrite)
 * @returns The created or updated paint style
 */
export async function createOrUpdatePaintStyle(
  styleName: string,
  hexColor: string,
  skipIfExists: boolean = false
): Promise<PaintStyle> {
  // Check if style already exists
  const existingStyles = await figma.getLocalPaintStylesAsync();
  let paintStyle = existingStyles.find((s) => s.name === styleName);

  if (!paintStyle) {
    paintStyle = figma.createPaintStyle();
    paintStyle.name = styleName;
    console.log(`[Figma] Created paint style: ${styleName}`);
  } else if (skipIfExists) {
    console.log(`[Figma] Style already exists, skipping: ${styleName}`);
    return paintStyle;
  }

  paintStyle.paints = [
    { type: "SOLID", color: hexToRGB(hexColor), opacity: 1 },
  ];

  return paintStyle;
}

/**
 * Create color paint styles for a ramp (creates new, doesn't overwrite existing)
 * Creates styles with path: Colors/{colorName}/{step}
 * @param colorName - Base color name (e.g., "Primary")
 * @param rampData - Object with step keys and hex values (e.g., { "50": "#fff", "500": "#0066ff", "950": "#000" })
 */
export async function createColorRampStyles(
  colorName: string,
  rampData: Record<string, string>
): Promise<PaintStyle[]> {
  const styles: PaintStyle[] = [];

  try {
    for (const [step, hexColor] of Object.entries(rampData)) {
      const styleName = `Colors/${colorName}/${step}`;
      // skipIfExists=false to UPDATE existing styles if they already exist
      const style = await createOrUpdatePaintStyle(styleName, hexColor, false);
      styles.push(style);
    }
    console.log(
      `[Figma] Created/Updated ${styles.length} paint styles for color: ${colorName}`
    );
  } catch (err) {
    console.error(`[Figma] Error creating ramp styles for ${colorName}:`, err);
  }

  return styles;
}
