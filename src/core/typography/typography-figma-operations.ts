/// <reference types="@figma/plugin-typings" />
/**
 * Generate flat typography preview frames (min/max scale, as in styled-typo)
 * Used for visualizing min/max font sizes for each mapping
 */
export async function generateFlatTypographyPreview(
  mappings: Array<{
    scaleName: string;
    semanticName: string;
    minSize: number;
    maxSize: number;
  }>,
  minViewportWidth: number = 375,
  maxViewportWidth: number = 1440,
  fontFamily: string = "Inter",
  fontWeight: string = "Regular"
): Promise<void> {
  // Remove any existing preview frame with the new canonical name
  const previewFrameName = "Typography Scale Preview";
  const existingPreview = figma.currentPage.findOne(
    (node) => node.type === "FRAME" && node.name === previewFrameName
  );
  if (existingPreview) existingPreview.remove();

  // Create a container frame
  const containerFrame = figma.createFrame();
  containerFrame.name = previewFrameName;
  containerFrame.layoutMode = "HORIZONTAL";
  containerFrame.primaryAxisSizingMode = "AUTO";
  containerFrame.counterAxisSizingMode = "AUTO";
  containerFrame.itemSpacing = 40;
  containerFrame.fills = [];
  figma.currentPage.appendChild(containerFrame);

  // Mobile frame
  const mobileFrame = figma.createFrame();
  mobileFrame.name = "Mobile";
  mobileFrame.layoutMode = "VERTICAL";
  mobileFrame.primaryAxisSizingMode = "AUTO";
  mobileFrame.counterAxisSizingMode = "FIXED";
  mobileFrame.resize(minViewportWidth, mobileFrame.height);
  mobileFrame.itemSpacing = 24;
  mobileFrame.paddingTop = 40;
  mobileFrame.paddingRight = 40;
  mobileFrame.paddingBottom = 40;
  mobileFrame.paddingLeft = 40;
  mobileFrame.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
  containerFrame.appendChild(mobileFrame);

  // Desktop frame
  const desktopFrame = figma.createFrame();
  desktopFrame.name = "Desktop";
  desktopFrame.layoutMode = "VERTICAL";
  desktopFrame.primaryAxisSizingMode = "AUTO";
  desktopFrame.counterAxisSizingMode = "FIXED";
  desktopFrame.resize(maxViewportWidth, desktopFrame.height);
  desktopFrame.itemSpacing = 24;
  desktopFrame.paddingTop = 40;
  desktopFrame.paddingRight = 40;
  desktopFrame.paddingBottom = 40;
  desktopFrame.paddingLeft = 40;
  desktopFrame.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
  containerFrame.appendChild(desktopFrame);

  await figma.loadFontAsync({ family: fontFamily, style: fontWeight });

  for (const mapping of mappings) {
    const label = mapping.semanticName || mapping.scaleName;
    // Mobile (min)
    const mobileText = figma.createText();
    try {
      await figma.loadFontAsync({ family: fontFamily, style: fontWeight });
    } catch (e) {
      console.error(`[CORE] Failed to load font for Mobile node: ${fontFamily} ${fontWeight}`, e);
      figma.notify(`Failed to load font: ${fontFamily} ${fontWeight}`);
    }
    mobileText.fontName = { family: fontFamily, style: fontWeight };
    mobileText.characters = label;
    mobileText.fontSize = mapping.minSize;
    mobileText.layoutAlign = "STRETCH";
    mobileText.textAutoResize = "WIDTH_AND_HEIGHT";
    mobileFrame.appendChild(mobileText);
    // Desktop (max)
    const desktopText = figma.createText();
    try {
      await figma.loadFontAsync({ family: fontFamily, style: fontWeight });
    } catch (e) {
      console.error(`[CORE] Failed to load font for Desktop node: ${fontFamily} ${fontWeight}`, e);
      figma.notify(`Failed to load font: ${fontFamily} ${fontWeight}`);
    }
    desktopText.fontName = { family: fontFamily, style: fontWeight };
    desktopText.characters = label;
    desktopText.fontSize = mapping.maxSize;
    desktopText.layoutAlign = "STRETCH";
    desktopText.textAutoResize = "WIDTH_AND_HEIGHT";
    desktopFrame.appendChild(desktopText);
  }

  figma.viewport.scrollAndZoomIntoView([containerFrame]);
}
/**
 * @stysys/core - Typography Figma Operations
 * Handles all Figma API interactions for typography creation
 * Extracted from styled-typo plugin's code.ts
 *
 * This module is plugin-agnostic and can be used by any plugin
 * for creating text styles and responsive typography variables.
 */

// Type definition for VariableMode from Figma's API
export interface VariableMode {
  modeId: string;
  name: string;
}

/**
 * Ensure the "SYS / Typography" collection exists with Phone/Desktop modes
 * Handles the Figma quirk where new collections have a default "Mode 1"
 *
 * @returns Collection with Phone and Desktop modes ready
 */
export async function ensureTypographyCollection(): Promise<{
  collection: VariableCollection;
  phoneMode: VariableMode;
  desktopMode: VariableMode;
}> {
  // 1. Find or create the variable collection for text styles
  let collectionList = await figma.variables.getLocalVariableCollectionsAsync();
  let collection = collectionList.find((c) => c.name === "SYS / Typography");

  if (!collection) {
    collection = figma.variables.createVariableCollection("SYS / Typography");
  }

  // --- Fix for Figma's default 'Mode 1' ---
  // When a collection is just created, it has a default mode 'Mode 1'.
  // We need to remove it and replace with our Phone/Desktop modes.
  let mode1 = collection.modes.find((m) => m.name === "Mode 1");
  let phoneMode = collection.modes.find((m) => m.name === "Phone");
  let desktopMode = collection.modes.find((m) => m.name === "Desktop");

  if (mode1) {
    if (!phoneMode) {
      collection.addMode("Phone");
    }
    collection.removeMode(mode1.modeId);
    // Refetch after modification
    const refetched = await figma.variables.getVariableCollectionByIdAsync(collection.id);
    if (!refetched) {
      throw new Error("Failed to refetch variable collection after fixing Mode 1");
    }
    collection = refetched;
    phoneMode = collection.modes.find((m) => m.name === "Phone");
    desktopMode = collection.modes.find((m) => m.name === "Desktop");
  }

  // Ensure Phone mode exists
  if (!phoneMode) {
    collection.addMode("Phone");
    const refetched = await figma.variables.getVariableCollectionByIdAsync(collection.id);
    if (!refetched) {
      throw new Error("Failed to refetch variable collection after adding Phone mode");
    }
    collection = refetched;
    phoneMode = collection.modes.find((m) => m.name === "Phone");
  }

  // Ensure Desktop mode exists
  if (!desktopMode) {
    collection.addMode("Desktop");
    const refetched = await figma.variables.getVariableCollectionByIdAsync(collection.id);
    if (!refetched) {
      throw new Error("Failed to refetch variable collection after adding Desktop mode");
    }
    collection = refetched;
    desktopMode = collection.modes.find((m) => m.name === "Desktop");
  }

  // Remove any extra modes (keep only Phone and Desktop)
  for (const mode of collection.modes) {
    if (mode.name !== "Phone" && mode.name !== "Desktop") {
      collection.removeMode(mode.modeId);
    }
  }

  // Refetch after cleanup
  const refetchedFinal = await figma.variables.getVariableCollectionByIdAsync(collection.id);
  if (!refetchedFinal) {
    throw new Error("Failed to refetch variable collection after removing extra modes");
  }
  collection = refetchedFinal;

  phoneMode = collection.modes.find((m) => m.name === "Phone");
  desktopMode = collection.modes.find((m) => m.name === "Desktop");

  if (!phoneMode || !desktopMode) {
    throw new Error("Failed to ensure Phone/Desktop modes exist");
  }

  return { collection, phoneMode, desktopMode };
}

/**
 * Create or update a typography variable in the collection
 * Sets values for both Phone and Desktop modes
 */
export async function createOrUpdateTypographyVariable(
  collection: VariableCollection,
  semanticName: string,
  phoneSize: number,
  desktopSize: number,
  phoneMode: VariableMode,
  desktopMode: VariableMode
): Promise<Variable> {
  // Get existing variables in collection
  let allVariables: Variable[] = [];
  if (collection.variableIds.length > 0) {
    allVariables = (
      await Promise.all(
        collection.variableIds.map((id) => figma.variables.getVariableByIdAsync(id))
      )
    ).filter(Boolean) as Variable[];
  }

  // Find or create variable
  let variable = allVariables.find((v) => v && v.name === semanticName);
  if (!variable) {
    variable = figma.variables.createVariable(semanticName, collection, "FLOAT");
  }

  // Set both modes: Phone (minSize), Desktop (maxSize)
  variable.setValueForMode(phoneMode.modeId, phoneSize);
  variable.setValueForMode(desktopMode.modeId, desktopSize);

  return variable;
}

/**
 * Remove variables that are no longer used
 */
export async function cleanupUnusedTypographyVariables(
  collection: VariableCollection,
  keepNames: Set<string>
): Promise<void> {
  if (collection.variableIds.length === 0) return;

  const allVariables = (
    await Promise.all(collection.variableIds.map((id) => figma.variables.getVariableByIdAsync(id)))
  ).filter(Boolean) as Variable[];

  for (const variable of allVariables) {
    if (variable && !keepNames.has(variable.name)) {
      variable.remove();
    }
  }
}

/**
 * Get the next heavier font weight for medium variants
 * Creates a weight hierarchy: Thin → Light → Regular → Medium → Semibold → Bold → Extrabold → Black
 */
export function getNextHeavierFontWeight(currentWeight: string): string {
  if (currentWeight.includes("Thin") || currentWeight.includes("100")) {
    return "Light";
  } else if (currentWeight.includes("Light") || currentWeight.includes("300")) {
    return "Regular";
  } else if (currentWeight.includes("Regular") || currentWeight.includes("400")) {
    return "Medium";
  } else if (currentWeight.includes("Medium") || currentWeight.includes("500")) {
    return "Semibold";
  } else if (currentWeight.includes("Semibold") || currentWeight.includes("600")) {
    return "Bold";
  } else if (currentWeight.includes("Bold") || currentWeight.includes("700")) {
    return "Extrabold";
  } else if (currentWeight.includes("Extrabold") || currentWeight.includes("800")) {
    return "Black";
  } else {
    return "Medium"; // Safe fallback
  }
}

/**
 * Determine folder organization based on semantic name category
 * Display/Heading/Title styles go to "Headings" folder
 * Everything else goes to "Text" folder
 */
export function getSemanticCategory(semanticName: string): {
  folder: string;
  isHeading: boolean;
} {
  const parts = semanticName.split("-");
  const category = parts[0].toLowerCase();

  const isHeading = category === "display" || category === "heading" || category === "title";

  return {
    folder: isHeading ? "Headings" : "Text",
    isHeading,
  };
}

/**
 * Format semantic name for UI display
 * "body-lg" → "Body Lg"
 */
export function formatSemanticNameForStyle(semanticName: string): string {
  const parts = semanticName.split("-");

  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  }

  return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
}

/**
 * Create typography text styles for all mappings
 * Handles both regular and medium weight variants for body styles
 */
export async function createTypographyTextStyles(
  mappings: Array<{
    scaleName: string;
    semanticName: string;
    minSize: number;
    maxSize: number;
  }>,
  headingsFontFamily: string,
  headingsFontWeight: string,
  bodyFontFamily: string,
  bodyFontWeight: string,
  collection: VariableCollection,
  phoneMode: VariableMode,
  desktopMode: VariableMode
): Promise<{
  createdStyles: TextStyle[];
  styleNames: Set<string>;
}> {
  const allTextStyles = await figma.getLocalTextStylesAsync();
  const createdStyles: TextStyle[] = [];
  const styleNames = new Set<string>();

  // Sort mappings by semantic name preference order
  const preferredOrder = [
    "display-3xl",
    "display-2xl",
    "display-xl",
    "display-lg",
    "heading-1",
    "heading-2",
    "heading-3",
    "heading-4",
    "heading-5",
    "body-lg",
    "body",
    "body-sm",
    "caption",
  ];

  const orderMap: { [key: string]: number } = {};
  for (let i = 0; i < preferredOrder.length; i++) {
    orderMap[preferredOrder[i]] = i;
  }

  const sortedMappings = [...mappings].sort((a, b) => {
    const aIdx = orderMap[a.semanticName] ?? 999;
    const bIdx = orderMap[b.semanticName] ?? 999;
    if (aIdx !== bIdx) return aIdx - bIdx;
    return b.maxSize - a.maxSize;
  });

  // Process each mapping
  for (const mapping of sortedMappings) {
    const { folder, isHeading } = getSemanticCategory(mapping.semanticName);
    const formattedName = formatSemanticNameForStyle(mapping.semanticName);
    const styleName = `${folder}/${formattedName}`;
    const styleDescription = `Scale: ${mapping.scaleName} • Size: ${mapping.minSize}px–${mapping.maxSize}px`;

    styleNames.add(styleName);

    // Create or update variable for this mapping
    const variable = await createOrUpdateTypographyVariable(
      collection,
      mapping.semanticName,
      mapping.minSize,
      mapping.maxSize,
      phoneMode,
      desktopMode
    );

    // Create regular text style
    let textStyle = allTextStyles.find((s) => s.name === styleName);
    if (!textStyle) {
      textStyle = figma.createTextStyle();
      textStyle.name = styleName;
    }

    textStyle.description = styleDescription;

    // Set font family and weight (headings vs body)
    const useFontFamily = isHeading ? headingsFontFamily : bodyFontFamily;
    const useFontWeight = isHeading ? headingsFontWeight : bodyFontWeight;

    try {
      await figma.loadFontAsync({
        family: useFontFamily,
        style: useFontWeight,
      });
      textStyle.fontName = { family: useFontFamily, style: useFontWeight };
    } catch (e) {
      console.warn(`Failed to load font: ${useFontFamily} ${useFontWeight}`, e);
    }

    // Bind variable to text style
    textStyle.setBoundVariable("fontSize", variable);

    // Set line height based on category
    const category = mapping.semanticName.split("-")[0].toLowerCase();
    if (category === "display") {
      textStyle.lineHeight = { unit: "PERCENT", value: 120 };
    } else if (category === "heading") {
      textStyle.lineHeight = { unit: "PERCENT", value: 130 };
    } else {
      textStyle.lineHeight = { unit: "PERCENT", value: 140 };
    }

    createdStyles.push(textStyle);

    // Create medium variant for body styles
    const isBodyStyle = category === "body" || mapping.semanticName === "caption";
    if (isBodyStyle) {
      const mediumStyleName = `${folder}/${formattedName} Medium`;
      styleNames.add(mediumStyleName);

      let mediumTextStyle = allTextStyles.find((s) => s.name === mediumStyleName);
      if (!mediumTextStyle) {
        mediumTextStyle = figma.createTextStyle();
        mediumTextStyle.name = mediumStyleName;
      }

      mediumTextStyle.description = `${styleDescription} • Weight: Medium variant`;

      // Get heavier weight for medium variant
      const heavierWeight = getNextHeavierFontWeight(bodyFontWeight);

      try {
        await figma.loadFontAsync({
          family: bodyFontFamily,
          style: heavierWeight,
        });
        mediumTextStyle.fontName = {
          family: bodyFontFamily,
          style: heavierWeight,
        };
      } catch (e) {
        console.warn(`Could not load ${bodyFontFamily} ${heavierWeight}, using regular weight`, e);
        mediumTextStyle.fontName = {
          family: bodyFontFamily,
          style: bodyFontWeight,
        };
      }

      mediumTextStyle.setBoundVariable("fontSize", variable);
      mediumTextStyle.lineHeight = { unit: "PERCENT", value: 140 };

      createdStyles.push(mediumTextStyle);
    }
  }

  return { createdStyles, styleNames };
}

/**
 * Remove text styles that are not in the current mappings
 */
export async function cleanupUnusedTextStyles(styleNames: Set<string>): Promise<void> {
  const allTextStyles = await figma.getLocalTextStylesAsync();

  for (const style of allTextStyles) {
    if (!styleNames.has(style.name)) {
      style.remove();
    }
  }
}

/**
 * Generate typography preview frames (Phone and Desktop viewports)
 */
export async function generateTypographyPreview(
  collection: VariableCollection,
  phoneMode: VariableMode,
  desktopMode: VariableMode,
  minViewportWidth: number,
  maxViewportWidth: number,
  mappings: Array<{
    scaleName: string;
    semanticName: string;
    minSize: number;
    maxSize: number;
  }>,
  headingsFontFamily: string,
  headingsFontWeight: string,
  bodyFontFamily: string,
  bodyFontWeight: string
): Promise<void> {
  // Reuse or create the preview frame container
  let containerFrame = figma.currentPage.findOne(
    (node) => node.type === "FRAME" && node.name === "Typography Styles"
  ) as FrameNode | null;

  if (containerFrame) {
    // Remove all existing children
    while (containerFrame.children.length > 0) {
      containerFrame.children[0].remove();
    }
  } else {
    containerFrame = figma.createFrame();
    containerFrame.name = "Typography Styles";
    containerFrame.layoutMode = "HORIZONTAL";
    containerFrame.primaryAxisSizingMode = "AUTO";
    containerFrame.counterAxisSizingMode = "AUTO";
    containerFrame.itemSpacing = 40;
    containerFrame.fills = [];
    figma.currentPage.appendChild(containerFrame);
  }

  // Get all created text styles
  const allTextStyles = await figma.getLocalTextStylesAsync();

  // Sort mappings in preferred order
  const preferredOrder = [
    "display-3xl",
    "display-2xl",
    "display-xl",
    "display-lg",
    "heading-1",
    "heading-2",
    "heading-3",
    "heading-4",
    "heading-5",
    "body-lg",
    "body",
    "body-sm",
    "caption",
  ];

  const orderMap: { [key: string]: number } = {};
  for (let i = 0; i < preferredOrder.length; i++) {
    orderMap[preferredOrder[i]] = i;
  }

  const sortedMappings = [...mappings].sort((a, b) => {
    const aIdx = orderMap[a.semanticName] ?? 999;
    const bIdx = orderMap[b.semanticName] ?? 999;
    if (aIdx !== bIdx) return aIdx - bIdx;
    return b.maxSize - a.maxSize;
  });

  // Preload fonts
  try {
    await figma.loadFontAsync({
      family: headingsFontFamily,
      style: headingsFontWeight,
    });
  } catch (e) {
    console.warn(`Failed to preload headings font: ${headingsFontFamily}`, e);
  }

  try {
    await figma.loadFontAsync({
      family: bodyFontFamily,
      style: bodyFontWeight,
    });
  } catch (e) {
    console.warn(`Failed to preload body font: ${bodyFontFamily}`, e);
  }

  // Create Phone viewport frame
  const phoneFrame = figma.createFrame();
  phoneFrame.name = "Phone";
  phoneFrame.layoutMode = "VERTICAL";
  phoneFrame.primaryAxisSizingMode = "AUTO";
  phoneFrame.counterAxisSizingMode = "FIXED";
  phoneFrame.resize(minViewportWidth, phoneFrame.height);
  phoneFrame.itemSpacing = 12;
  phoneFrame.paddingTop = 40;
  phoneFrame.paddingRight = 40;
  phoneFrame.paddingBottom = 40;
  phoneFrame.paddingLeft = 40;
  phoneFrame.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
  phoneFrame.setExplicitVariableModeForCollection(collection, phoneMode.modeId);
  containerFrame.appendChild(phoneFrame);

  // Create Desktop viewport frame
  const desktopFrame = figma.createFrame();
  desktopFrame.name = "Desktop";
  desktopFrame.layoutMode = "VERTICAL";
  desktopFrame.primaryAxisSizingMode = "AUTO";
  desktopFrame.counterAxisSizingMode = "FIXED";
  desktopFrame.resize(maxViewportWidth, desktopFrame.height);
  desktopFrame.itemSpacing = 12;
  desktopFrame.paddingTop = 40;
  desktopFrame.paddingRight = 40;
  desktopFrame.paddingBottom = 40;
  desktopFrame.paddingLeft = 40;
  desktopFrame.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
  desktopFrame.setExplicitVariableModeForCollection(collection, desktopMode.modeId);
  containerFrame.appendChild(desktopFrame);

  // --- Instead of calling flat preview, create text nodes and assign textStyleId ---
  for (const mapping of sortedMappings) {
    const { folder, isHeading } = getSemanticCategory(mapping.semanticName);
    const formattedName = formatSemanticNameForStyle(mapping.semanticName);
    const styleName = `${folder}/${formattedName}`;

    // Find the matching text style
    const textStyle = allTextStyles.find((s) => s.name === styleName);

    // Phone node
    const phoneText = figma.createText();
    phoneText.characters = mapping.semanticName || mapping.scaleName;
    phoneText.layoutAlign = "STRETCH";
    phoneText.textAutoResize = "WIDTH_AND_HEIGHT";
    phoneFrame.appendChild(phoneText);
    if (textStyle) {
      await phoneText.setTextStyleIdAsync(textStyle.id);
    } else {
      // fallback: set fontName/fontSize
      phoneText.fontName = {
        family: isHeading ? headingsFontFamily : bodyFontFamily,
        style: isHeading ? headingsFontWeight : bodyFontWeight,
      };
      phoneText.fontSize = mapping.minSize;
    }

    // Desktop node
    const desktopText = figma.createText();
    desktopText.characters = mapping.semanticName || mapping.scaleName;
    desktopText.layoutAlign = "STRETCH";
    desktopText.textAutoResize = "WIDTH_AND_HEIGHT";
    desktopFrame.appendChild(desktopText);
    if (textStyle) {
      await desktopText.setTextStyleIdAsync(textStyle.id);
    } else {
      desktopText.fontName = {
        family: isHeading ? headingsFontFamily : bodyFontFamily,
        style: isHeading ? headingsFontWeight : bodyFontWeight,
      };
      desktopText.fontSize = mapping.maxSize;
    }
  }

  // Navigate to preview
  figma.viewport.scrollAndZoomIntoView([containerFrame]);
}
