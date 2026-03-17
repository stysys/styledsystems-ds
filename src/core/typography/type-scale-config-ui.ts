/**
 * @stysys/core - Type Scale Configuration UI
 * Reusable UI component for configuring type scale parameters
 * Used by styled-typo, styled-connect, and web UI
 *
 * Factory functions for creating configuration controls with callbacks
 */

import type { TypeScaleConfig } from "./typography";

/**
 * Callbacks for configuration UI events
 */
export interface TypeScaleConfigCallbacks {
  onConfigChanged?: (config: TypeScaleConfig) => void;
  onError?: (message: string) => void;
}

/**
 * CSS constants for BEM class names
 * Styling is defined in type-scale-config-ui.css
 */
export const TYPE_SCALE_CONFIG_STYLES = {
  section: "type-scale-section",
  sectionConfig: "type-scale-section__config",
  sectionPreview: "type-scale-section__preview",
  container: "type-scale-config",
  title: "type-scale-config__title",
  grid: "type-scale-config__grid",
  group: "type-scale-config__group",
  groupMin: "type-scale-config__group--min",
  groupMax: "type-scale-config__group--max",
  fieldDiv: "type-scale-config__field",
  label: "type-scale-config__label",
  input: "type-scale-config__input",
  infoText: "type-scale-config__info",
};

/**
 * Create a single input field for configuration
 * @param label - Display label
 * @param value - Current numeric value
 * @param key - Configuration key to update
 * @param config - Current configuration object
 * @param callbacks - Optional callbacks
 * @returns Input field element
 */
export function createConfigInputField(
  label: string,
  value: number,
  key: keyof TypeScaleConfig,
  config: TypeScaleConfig,
  callbacks?: TypeScaleConfigCallbacks
): HTMLDivElement {
  const fieldDiv = document.createElement("div");
  fieldDiv.className = TYPE_SCALE_CONFIG_STYLES.fieldDiv;

  const labelEl = document.createElement("label");
  labelEl.textContent = label;
  labelEl.className = TYPE_SCALE_CONFIG_STYLES.label;

  const input = document.createElement("input");
  input.type = "number";
  input.value = value.toString();
  input.className = TYPE_SCALE_CONFIG_STYLES.input;

  input.oninput = () => {
    const newValue = parseFloat(input.value);
    if (!isNaN(newValue) && newValue > 0) {
      (config as any)[key] = newValue;
      callbacks?.onConfigChanged?.(config);
    } else if (callbacks?.onError) {
      callbacks.onError(`Invalid value for ${label}. Must be a positive number.`);
    }
  };

  fieldDiv.appendChild(labelEl);
  fieldDiv.appendChild(input);
  return fieldDiv;
}

/**
 * Create a group container for related fields
 * @param fields - Array of field elements to group
 * @param modifier - Optional modifier class (e.g., "--min", "--max")
 * @returns Group container element
 */
export function createConfigGroup(fields: HTMLDivElement[], modifier?: string): HTMLDivElement {
  const group = document.createElement("div");
  group.className = TYPE_SCALE_CONFIG_STYLES.group;
  if (modifier) {
    group.classList.add(`${TYPE_SCALE_CONFIG_STYLES.group}${modifier}`);
  }
  fields.forEach((field) => group.appendChild(field));
  return group;
}

/**
 * Create the configuration grid with all input fields grouped by min/max
 * @param config - Current configuration
 * @param callbacks - Optional callbacks
 * @returns Grid element containing grouped input fields
 */
export function createConfigGrid(
  config: TypeScaleConfig,
  callbacks?: TypeScaleConfigCallbacks
): HTMLDivElement {
  const configGrid = document.createElement("div");
  configGrid.className = TYPE_SCALE_CONFIG_STYLES.grid;

  // Min group: Min Width, Min Font Size, Min Scale Ratio
  const minFields = [
    createConfigInputField(
      "Min Width (px)",
      config.minViewportWidth,
      "minViewportWidth",
      config,
      callbacks
    ),
    createConfigInputField(
      "Min Font Size (px)",
      config.minFontSize,
      "minFontSize",
      config,
      callbacks
    ),
    createConfigInputField(
      "Min Scale Ratio",
      config.minTypeScale,
      "minTypeScale",
      config,
      callbacks
    ),
  ];
  const minGroup = createConfigGroup(minFields, "--min");
  configGrid.appendChild(minGroup);

  // Max group: Max Width, Max Font Size, Max Scale Ratio
  const maxFields = [
    createConfigInputField(
      "Max Width (px)",
      config.maxViewportWidth,
      "maxViewportWidth",
      config,
      callbacks
    ),
    createConfigInputField(
      "Max Font Size (px)",
      config.maxFontSize,
      "maxFontSize",
      config,
      callbacks
    ),
    createConfigInputField(
      "Max Scale Ratio",
      config.maxTypeScale,
      "maxTypeScale",
      config,
      callbacks
    ),
  ];
  const maxGroup = createConfigGroup(maxFields, "--max");
  configGrid.appendChild(maxGroup);

  return configGrid;
}

/**
 * Create info text explaining type scale ratios
 * @returns Info text element
 */
export function createConfigInfoText(): HTMLParagraphElement {
  const infoText = document.createElement("p");
  infoText.className = TYPE_SCALE_CONFIG_STYLES.infoText;
  infoText.innerHTML = `
    <strong>Type Scale Ratio:</strong> Controls size progression (1.067 = Minor Second, 1.25 = Major Third).<br/>
    Higher ratio = more contrast between sizes.
  `;
  return infoText;
}

/**
 * Create complete type scale configuration controls
 * Main entry point for creating configuration UI
 *
 * @param config - Current configuration object
 * @param callbacks - Optional callbacks for configuration changes
 * @returns Container element with all configuration controls
 */
export function createTypeScaleConfigControls(
  config: TypeScaleConfig,
  callbacks?: TypeScaleConfigCallbacks
): HTMLElement {
  const configSection = document.createElement("section");
  configSection.id = "type-scale-config";
  configSection.className = TYPE_SCALE_CONFIG_STYLES.container;

  const configTitle = document.createElement("h3");
  configTitle.textContent = "Type Scale Configuration";
  configTitle.className = TYPE_SCALE_CONFIG_STYLES.title;
  configSection.appendChild(configTitle);

  // Add configuration grid
  const configGrid = createConfigGrid(config, callbacks);
  configSection.appendChild(configGrid);

  // Add info text
  const infoText = createConfigInfoText();
  configSection.appendChild(infoText);

  return configSection;
}

/**
 * Create a complete type scale section with config and preview
 * Wraps config and preview in a semantic parent container
 *
 * @param config - Current configuration object
 * @param previewElement - Rendered preview element (from createTypographyScalePreview)
 * @param callbacks - Optional callbacks for configuration changes
 * @returns Section container with config and preview
 */
export function createTypeScaleSection(
  config: TypeScaleConfig,
  previewElement: HTMLElement,
  callbacks?: TypeScaleConfigCallbacks
): HTMLElement {
  const section = document.createElement("section");
  section.className = TYPE_SCALE_CONFIG_STYLES.section;
  section.style.cssText = "display: flex; flex-direction: column; gap: 24px;";

  // Config element
  const configWrapper = document.createElement("div");
  configWrapper.className = TYPE_SCALE_CONFIG_STYLES.sectionConfig;
  const config_controls = createTypeScaleConfigControls(config, callbacks);
  configWrapper.appendChild(config_controls);

  // Preview element
  const previewWrapper = document.createElement("div");
  previewWrapper.className = TYPE_SCALE_CONFIG_STYLES.sectionPreview;
  previewWrapper.appendChild(previewElement);

  section.appendChild(configWrapper);
  section.appendChild(previewWrapper);

  return section;
}
