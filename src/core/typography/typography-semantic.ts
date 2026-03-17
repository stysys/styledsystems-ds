/**
 * @stysys/core - Typography Semantic Mapping Module
 * Handles semantic naming and intelligent mapping of typography scale steps
 * Extracted from styled-typo plugin's ui/mappings.ts and ui/types.ts
 */

import type { ScaleStep } from "./typography";

/**
 * Text Style Mapping - associates a scale step with semantic names
 */
export interface TextStyleMappingRow {
  semanticName: string;
  checked: boolean;
}

export interface TextStyleMapping {
  scaleName: string;
  rows: TextStyleMappingRow[];
}

/**
 * Font information for text style creation
 */
export interface FontMetadata {
  family: string;
  weight: string;
}

/**
 * Semantic name definition for UI dropdowns
 */
export interface SemanticNameOption {
  value: string;
  label: string;
}

/**
 * All available semantic names for mapping
 * Follows typography naming conventions: category-size or single word
 */
export const SEMANTIC_NAMES: SemanticNameOption[] = [
  { value: "overline", label: "Overline" },
  { value: "caption-sm", label: "Caption Sm" },
  { value: "caption", label: "Caption" },
  { value: "body-sm", label: "Body Sm" },
  { value: "body", label: "Body" },
  { value: "body-lg", label: "Body Lg" },
  { value: "title-sm", label: "Title Sm" },
  { value: "title-md", label: "Title Md" },
  { value: "title-lg", label: "Title Lg" },
  { value: "heading-6", label: "Heading 6 (H6)" },
  { value: "heading-5", label: "Heading 5 (H5)" },
  { value: "heading-4", label: "Heading 4 (H4)" },
  { value: "heading-3", label: "Heading 3 (H3)" },
  { value: "heading-2", label: "Heading 2 (H2)" },
  { value: "heading-1", label: "Heading 1 (H1)" },
  { value: "display-lg", label: "Display Lg" },
  { value: "display-xl", label: "Display XL" },
  { value: "display-2xl", label: "Display 2XL" },
  { value: "display-3xl", label: "Display 3XL" },
].reverse();

/**
 * Generate smart semantic mappings for scale steps
 * Algorithm:
 * 1. Display styles (3XL, 2XL, XL, LG) - for extra-large steps beyond 5 headings
 * 2. Heading styles (H1-H5) - for main large steps
 * 3. Body/Caption styles - for smaller steps
 * 4. Fixed mappings for base, lg, sm, xs
 */
export function generateSemanticMappings(activeSteps: ScaleStep[]): Record<string, string[]> {
  const stepToSemantic: Record<string, string[]> = {};

  const headings = ["heading-1", "heading-2", "heading-3", "heading-4", "heading-5"];
  const displays = ["display-3xl", "display-2xl", "display-xl", "display-lg"];
  const bodyStyles = ["body-lg", "body", "body-sm", "caption", "caption-sm", "overline"];

  // Filter out special cases (base, sm, xs, lg) - they have fixed mappings
  const mainSteps = activeSteps.filter((s) => !["base", "sm", "xs", "lg"].includes(s.name));

  // Sort by power descending (largest first)
  const sortedSteps = [...mainSteps].sort((a, b) => b.power - a.power);

  // Determine how many Display slots to use
  // If > 5 large steps: use Displays for the extra ones
  const numDisplaysToUse = Math.min(
    Math.max(0, sortedSteps.length - headings.length),
    displays.length
  );

  // Assign mappings
  sortedSteps.forEach((step, index) => {
    const defaultMapping: string[] = [];

    if (index < numDisplaysToUse) {
      // Largest steps get Display styles (if we have more than 5 large steps)
      defaultMapping.push(displays[index]);
    } else if (index < numDisplaysToUse + headings.length) {
      // Next slots get Heading styles (H1-H5)
      defaultMapping.push(headings[index - numDisplaysToUse]);
    } else {
      // Remaining steps get body styles
      const bodyIndex = index - numDisplaysToUse - headings.length;
      defaultMapping.push(bodyStyles[Math.min(bodyIndex, bodyStyles.length - 1)]);
    }

    stepToSemantic[step.name] = defaultMapping;
  });

  // Add fixed mappings for special cases
  activeSteps.forEach((step) => {
    if (step.name === "base") stepToSemantic[step.name] = ["body"];
    else if (step.name === "lg") stepToSemantic[step.name] = ["body-lg"];
    else if (step.name === "sm") stepToSemantic[step.name] = ["body-sm"];
    else if (step.name === "xs") stepToSemantic[step.name] = ["caption"];
  });

  return stepToSemantic;
}

/**
 * Determine font category from semantic name
 * Returns "heading" for display/heading/title styles, "body" for others
 */
export function getFontCategoryFromSemantic(semanticName: string): "heading" | "body" {
  const category = semanticName.split("-")[0].toLowerCase();
  return category === "display" || category === "heading" || category === "title"
    ? "heading"
    : "body";
}

/**
 * Format semantic name to style name
 * Example: "display-3xl" -> "Display 3xl", "heading-1" -> "Heading 1"
 */
export function formatSemanticNameToStyleName(semanticName: string): string {
  const parts = semanticName.split("-");

  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  }

  return parts
    .map((p) => {
      // Keep numbers as-is (e.g., "3xl" stays "3xl")
      if (/^\d/.test(p)) return p;
      // Capitalize first letter
      return p.charAt(0).toUpperCase() + p.slice(1);
    })
    .join(" ");
}

/**
 * Get folder name for style organization
 * Display/Heading/Title -> "Headings", everything else -> "Text"
 */
export function getStyleFolderFromSemantic(semanticName: string): string {
  const category = semanticName.split("-")[0].toLowerCase();
  return category === "display" || category === "heading" || category === "title"
    ? "Headings"
    : "Text";
}
