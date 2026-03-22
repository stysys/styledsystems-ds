/**
 * Typography Token Builder
 * Builds complete token objects for design systems with platform identification
 * Used by plugins (InDesign, Figma) to generate consistent token structures
 */

export interface SemanticMapping {
  name: string;
  scaleRef: string;
  type: "heading" | "body";
}

export interface ScaleItem {
  token: string;
  size: number;
  leading: number;
  weight: string;
  tracking: number;
}

export interface DisplayFlavorMapping {
  name: string;
  scaleRef: string;
  type: "heading" | "body";
}

export interface TokenBuilderConfig {
  scale: ScaleItem[];
  baseSize: number;
  baseLineHeight: number;
  scaleRatio: number;
  semanticMapping: SemanticMapping[];
  displayFlavorMapping: DisplayFlavorMapping[];
  headingFontFamily: string;
  bodyFontFamily: string;
  platform: "indesign" | "figma" | "sketch" | string;
  overrides?: Record<
    string,
    { size?: number; leading?: number; weight?: string; tracking?: number }
  >;
}

export interface PlatformTokens {
  semantic: Record<string, any>;
  sizeTokens: Record<string, any>;
  displayFlavor: Record<string, any>;
  baseSize: number;
  baseLineHeight: number;
  scaleRatio: number;
  headingFont: string;
  bodyFont: string;
  updatedAt: string;
  updatedBy: string;
}

export interface TypographyToken {
  platform: string;
  source: string;
  [platformKey: string]: any; // Allows "web", "print", "indesign", etc. with PlatformTokens
}

/**
 * Build a complete typography token structure organized by platform
 * Structure: typography -> platform -> semantic/sizeTokens/displayFlavor
 * displayFlavor references semantic token families rather than duplicating
 */
export function buildTypographyTokens(
  config: TokenBuilderConfig,
): TypographyToken {
  const {
    scale,
    baseSize,
    baseLineHeight,
    scaleRatio,
    semanticMapping,
    displayFlavorMapping,
    headingFontFamily,
    bodyFontFamily,
    platform,
    overrides = {},
  } = config;

  const platformKey = platform.toLowerCase();
  const typography: TypographyToken = {
    platform: platformKey,
    source: `${platform}-plugin`,
  };

  // Create platform-specific token group
  const platformTokens: Record<string, any> = {};

  // Add semantic styles (named tokens like "Headline", "Body", etc.)
  const semantic: Record<string, any> = {};
  for (const mapping of semanticMapping) {
    const item = scale.find((s) => s.token === mapping.scaleRef);
    if (item) {
      const style = overrides[item.token] || {};
      semantic[mapping.name] = {
        fontSize: style.size !== undefined ? style.size : item.size,
        lineHeight: style.leading !== undefined ? style.leading : item.leading,
        fontWeight: parseWeight(
          style.weight !== undefined ? style.weight : item.weight,
        ),
        fontFamily:
          mapping.type === "heading" ? headingFontFamily : bodyFontFamily,
        letterSpacing:
          (style.tracking !== undefined ? style.tracking : item.tracking) /
          1000,
      };
    }
  }
  platformTokens.semantic = semantic;

  // Add sizeTokens group (raw scale steps)
  const sizeTokens: Record<string, any> = {};
  for (const item of scale) {
    sizeTokens[item.token] = {
      fontSize: item.size,
      lineHeight: item.leading,
      fontWeight: parseWeight(item.weight),
      fontFamily: bodyFontFamily,
      letterSpacing: item.tracking / 1000,
    };
  }
  platformTokens.sizeTokens = sizeTokens;

  // Add display flavor group - references semantic families
  const displayFlavor: Record<string, any> = {};
  for (const mapping of displayFlavorMapping) {
    // Display flavor references the semantic token family
    displayFlavor[mapping.name] = {
      ref: mapping.name, // Reference to semantic token family
      type: mapping.type,
      weight: 700, // Display flavors are always bold
    };
  }
  platformTokens.displayFlavor = displayFlavor;

  // Add metadata at platform level
  platformTokens.baseSize = baseSize;
  platformTokens.baseLineHeight = baseLineHeight;
  platformTokens.scaleRatio = scaleRatio;
  platformTokens.headingFont = headingFontFamily;
  platformTokens.bodyFont = bodyFontFamily;
  platformTokens.updatedAt = new Date().toISOString();
  platformTokens.updatedBy = `${platform}-plugin`;

  // Organize by platform - this is the key structure
  typography[platformKey] = platformTokens;

  return typography;
}

/**
 * Helper to parse font weight string to number
 */
function parseWeight(weight: string | number): number {
  if (typeof weight === "number") return weight;
  switch (weight.toLowerCase()) {
    case "thin":
      return 100;
    case "extralight":
      return 200;
    case "light":
      return 300;
    case "normal":
    case "regular":
      return 400;
    case "medium":
      return 500;
    case "semibold":
      return 600;
    case "bold":
      return 700;
    case "extrabold":
      return 800;
    case "black":
      return 900;
    default:
      return 400;
  }
}

/**
 * Get human-readable platform label
 * Provides consistent naming across platforms
 */
function getPlatformLabel(platform: string): string {
  switch (platform.toLowerCase()) {
    case "indesign":
      return "print (web)"; // InDesign tokens optimized for web
    case "figma":
      return "web";
    case "sketch":
      return "design";
    default:
      return `${platform} (web)`;
  }
}

/**
 * Export token builder as default
 */
export default buildTypographyTokens;
