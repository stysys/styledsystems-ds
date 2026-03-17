/**
 * @stysys/core - Ensure Core Line Height Variables
 * Ensures the SYS / Core variable collection and font family variables exist for typography
 * Extracted from styled-typo plugin for shared use
 */

export async function ensureCoreLineHeightVariables() {
  // Ensure the SYS / Core collection exists
  let collections = await figma.variables.getLocalVariableCollectionsAsync();
  let coreCollection = collections.find((c) => c.name === "SYS / Core");
  if (!coreCollection) {
    coreCollection = figma.variables.createVariableCollection("SYS / Core");
  }
  const singleMode = coreCollection.modes[0];

  // Helper to check for existing variable by name
  async function getVariableByName(name: string) {
    if (!coreCollection || !coreCollection.variableIds.length) return null;
    const variables = await Promise.all(
      coreCollection.variableIds.map((id) => figma.variables.getVariableByIdAsync(id))
    );
    return variables.find((v) => v && v.name === name) || null;
  }

  // Ensure "Font Family/font-display"
  let fontDisplay = await getVariableByName("Font Family/font-display");
  if (!fontDisplay) {
    fontDisplay = figma.variables.createVariable(
      "Font Family/font-display",
      coreCollection,
      "STRING"
    );
    fontDisplay.setValueForMode(singleMode.modeId, "Inter"); // Default value
  }

  // Ensure "Font Family/font-body"
  let fontBody = await getVariableByName("Font Family/font-body");
  if (!fontBody) {
    fontBody = figma.variables.createVariable("Font Family/font-body", coreCollection, "STRING");
    fontBody.setValueForMode(singleMode.modeId, "Inter"); // Default value
  }
}
