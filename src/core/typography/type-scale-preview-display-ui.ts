/**
 * @stysys/core - Typography Scale Preview Display
 * Reusable component for displaying typography scale comparisons
 * Shows min/max viewport sizes with generated typography styles
 * Uses BEM class names that align with existing styled-typo styling
 */

import type { TypographyStyle, ScaleStep } from "./typography";

/**
 * CSS constants for BEM class names
 * Styling is defined in type-scale-preview-display-ui.css
 * @stysys/core - Typography Scale Preview Display
 */
export const TYPOGRAPHY_SCALE_PREVIEW_STYLES = {
  container: "type-scale-preview",
  row: "type-scale-preview__row",
  label: "type-scale-preview__label",
  value: "type-scale-preview__value",
};

// Make styles globally available for plugin UI runtime
if (typeof window !== "undefined") {
  (window as any).TYPOGRAPHY_SCALE_PREVIEW_STYLES = TYPOGRAPHY_SCALE_PREVIEW_STYLES;
}

/**
 * Create a scale preview row displaying min and max typography styles
 * @param minStyle - Typography style for minimum viewport
 * @param maxStyle - Typography style for maximum viewport
 * @returns Row element with min/max style comparison
 */
export function createScalePreviewRow(
  minStyle: TypographyStyle,
  maxStyle: TypographyStyle
): HTMLDivElement {
  const row = document.createElement("div");
  row.className = TYPOGRAPHY_SCALE_PREVIEW_STYLES.row;

  // MIN SIZE PREVIEW
  const minNameLabel = document.createElement("div");
  minNameLabel.className = TYPOGRAPHY_SCALE_PREVIEW_STYLES.label;
  minNameLabel.style.fontFamily = minStyle.fontFamily;
  minNameLabel.style.fontSize = `${minStyle.fontSize}px`;
  minNameLabel.style.fontWeight = `${minStyle.fontWeight}`;
  minNameLabel.style.lineHeight = `${minStyle.lineHeight}`;
  minNameLabel.textContent = minStyle.name;

  const minSizeLabel = document.createElement("div");
  minSizeLabel.className = TYPOGRAPHY_SCALE_PREVIEW_STYLES.value;
  minSizeLabel.textContent = `${minStyle.fontSize.toFixed(2)}px`;

  // MAX SIZE PREVIEW
  const maxNameLabel = document.createElement("div");
  maxNameLabel.className = TYPOGRAPHY_SCALE_PREVIEW_STYLES.label;
  maxNameLabel.style.fontFamily = maxStyle.fontFamily;
  maxNameLabel.style.fontSize = `${maxStyle.fontSize}px`;
  maxNameLabel.style.fontWeight = `${maxStyle.fontWeight}`;
  maxNameLabel.style.lineHeight = `${maxStyle.lineHeight}`;
  maxNameLabel.textContent = maxStyle.name;

  const maxSizeLabel = document.createElement("div");
  maxSizeLabel.className = TYPOGRAPHY_SCALE_PREVIEW_STYLES.value;
  maxSizeLabel.textContent = `${maxStyle.fontSize.toFixed(2)}px`;

  row.appendChild(minNameLabel);
  row.appendChild(minSizeLabel);
  row.appendChild(maxNameLabel);
  row.appendChild(maxSizeLabel);

  return row;
}

/**
 * Create complete typography scale preview container
 * Displays min/max comparison for all active scale steps
 *
 * @param minStyles - Typography styles for minimum viewport
 * @param maxStyles - Typography styles for maximum viewport
 * @param activeSteps - Active type scale steps to display
 * @returns Container element with scale preview rows
 */
export function createTypographyScalePreview(
  minStyles: TypographyStyle[],
  maxStyles: TypographyStyle[],
  activeSteps: ScaleStep[]
): HTMLElement {
  const scalePreview = document.createElement("div");
  scalePreview.className = TYPOGRAPHY_SCALE_PREVIEW_STYLES.container;

  // Always sort steps descending by power so largest is on top
  const sortedSteps = [...activeSteps].sort((a, b) => b.power - a.power);
  sortedSteps.forEach((step) => {
    const minStyle = minStyles.find((s) => s.name === step.name);
    const maxStyle = maxStyles.find((s) => s.name === step.name);
    if (!minStyle || !maxStyle) return;
    const row = createScalePreviewRow(minStyle, maxStyle);
    scalePreview.appendChild(row);
  });

  return scalePreview;
}
