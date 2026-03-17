/**
 * Create Figma color variables and paint styles for a color ramp
 * - Gets or creates the variable collection
 * - For each color and ramp step, creates/updates variable and paint style
 * - Returns {variablesCreated, stylesCreated}
 */
import { hexToRGB, createOrUpdatePaintStyle } from "./figma-color-operations";

export async function createColorVariablesAndStyles(
  colorName: string,
  ramp: Record<string, string>,
  collectionName = "SYS / Colors"
): Promise<{ variablesCreated: number; stylesCreated: number }> {
  // Get or create variable collection
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  let collection = collections.find((c) => c.name === collectionName);
  if (!collection) {
    collection = figma.variables.createVariableCollection(collectionName);
    console.log(`[core] Created variable collection: ${collectionName}`);
  }
  let variablesCreated = 0;
  let stylesCreated = 0;
  for (const [step, colorHex] of Object.entries(ramp)) {
    const varName = `${colorName}/${step}`;
    let variable = undefined;
    for (const id of collection.variableIds) {
      const v = await figma.variables.getVariableByIdAsync(id);
      if (v && v.name === varName) {
        variable = v;
        break;
      }
    }
    if (!variable) {
      variable = figma.variables.createVariable(varName, collection, "COLOR");
      variablesCreated++;
      console.log(`[core] Created variable: ${varName}`);
    }
    variable.setValueForMode(collection.modes[0].modeId, hexToRGB(colorHex));
    // Create or update paint style
    await createOrUpdatePaintStyle(`Colors/${colorName}/${step}`, colorHex, false);
    stylesCreated++;
  }
  return { variablesCreated, stylesCreated };
}
