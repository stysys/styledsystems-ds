/**
 * Allows controlled mutation of the color state (for plugin UI sync)
 */
export function setColorState(newState: Partial<DatabaseColorsState>): void {
  if (newState.editableColors) state.editableColors = newState.editableColors;
  if (newState.customColors) state.customColors = newState.customColors;
  if (typeof newState.hasUnsyncedChanges === "boolean")
    state.hasUnsyncedChanges = newState.hasUnsyncedChanges;
  if (newState.rampComplexity) state.rampComplexity = newState.rampComplexity;
  if (newState.lastSyncedColors) state.lastSyncedColors = newState.lastSyncedColors;
  if (newState.lastSyncedColorValues) state.lastSyncedColorValues = newState.lastSyncedColorValues;
  if (newState.lastSyncedColorRamps) state.lastSyncedColorRamps = newState.lastSyncedColorRamps;
  if (typeof newState.isInitialLoad === "boolean") state.isInitialLoad = newState.isInitialLoad;
}
/**
 * Database Colors Management Module
 * Shared across styled-connect, styled-colors, web-ui
 *
 * Handles:
 * - Color rendering with tiered ramp generation
 * - Color state management (editing, custom colors)
 * - Change detection and sync tracking
 * - Color picker integration
 */

import { sendToPlugin, showNotification } from "../utilities";
import { generateColorRamp, generateSemanticScales, getContrastTextColor } from "./color-scale";
import {
  setupColorPickersForColors,
  showColorPickerById,
  type ColorConfig,
} from "./color-picker-modal-ui";

// ===== STATE MANAGEMENT =====

interface DatabaseColorsState {
  editableColors: Array<{ name: string; hex: string }>;
  customColors: Array<{ name: string; hex: string }>;
  rampComplexity: "simple" | "medium" | "comprehensive";
  hasUnsyncedChanges: boolean;
  lastSyncedColors: string;
  lastSyncedColorValues: Map<string, string>;
  lastSyncedColorRamps: Map<string, Record<string, string>>;
  isInitialLoad: boolean;
}

const RAMP_STEPS: Record<"simple" | "medium" | "comprehensive", number[]> = {
  // 7 steps: evenly distributed from 50 to 950
  simple: [50, 200, 350, 500, 650, 800, 950],
  medium: [100, 200, 300, 400, 500, 600, 700, 800, 900], // 9 steps
  comprehensive: [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950], // 11 steps
};

const MAX_CUSTOM_COLORS = 3;

const DEFAULT_COLORS = [
  { name: "Primary", hex: "#3b82f6" },
  { name: "Secondary", hex: "#8b5cf6" },
  { name: "Neutral", hex: "#6b7280" },
  { name: "Success", hex: "#10b981" },
  { name: "Warning", hex: "#f59e0b" },
  { name: "Danger", hex: "#ef4444" },
  { name: "Info", hex: "#06b6d4" },
];

// Global state
let state: DatabaseColorsState = {
  editableColors: [],
  customColors: [],
  rampComplexity: "simple",
  hasUnsyncedChanges: false,
  lastSyncedColors: "",
  lastSyncedColorValues: new Map(),
  lastSyncedColorRamps: new Map(),
  isInitialLoad: true,
};

// ===== STATE GETTERS & SETTERS =====

export function getColorState(): Readonly<DatabaseColorsState> {
  return { ...state };
}

export function setRampComplexity(complexity: "simple" | "medium" | "comprehensive"): void {
  state.rampComplexity = complexity;
}

export function getHasUnsyncedChanges(): boolean {
  return state.hasUnsyncedChanges;
}

export function setInitialLoadComplete(): void {
  state.isInitialLoad = false;
}

// ===== COLOR RAMP GENERATION =====

/**
 * Blend two hex colors
 */
function blendHexColors(hex1: string, hex2: string): string {
  const r1 = parseInt(hex1.substr(1, 2), 16);
  const g1 = parseInt(hex1.substr(3, 2), 16);
  const b1 = parseInt(hex1.substr(5, 2), 16);
  const r2 = parseInt(hex2.substr(1, 2), 16);
  const g2 = parseInt(hex2.substr(3, 2), 16);
  const b2 = parseInt(hex2.substr(5, 2), 16);
  const r = Math.round((r1 + r2) / 2);
  const g = Math.round((g1 + g2) / 2);
  const b = Math.round((b1 + b2) / 2);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b
    .toString(16)
    .padStart(2, "0")}`;
}

/**
 * Generate default tiered ramp structure
 * Creates hierarchy: Primary → Secondary → Tertiary (blended)
 */
export function generateDefaultTieredRamp(): {
  [key: string]: { name: string; hex: string; tier?: string };
} {
  const tiers: { [key: string]: { name: string; hex: string; tier?: string } } = {};
  const primary = DEFAULT_COLORS.find((c) => c.name === "Primary");
  const secondary = DEFAULT_COLORS.find((c) => c.name === "Secondary");

  if (!primary) return tiers;

  const primarySteps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  const primaryRamp = generateColorRamp(primary.hex, 11);

  primaryRamp.forEach((hex, idx) => {
    const step = primarySteps[idx];
    if (step === 500) {
      tiers[`Primary`] = { name: "Primary", hex, tier: "Primary" };
    } else {
      tiers[`Primary.${step}`] = {
        name: `Primary.${step}`,
        hex,
        tier: "Primary",
      };
    }
  });

  if (secondary) {
    const secondaryRamp = generateColorRamp(secondary.hex, 11);
    secondaryRamp.forEach((hex, idx) => {
      const step = primarySteps[idx];
      if (step === 500) {
        tiers[`Secondary`] = { name: "Secondary", hex, tier: "Secondary" };
      } else {
        tiers[`Secondary.${step}`] = {
          name: `Secondary.${step}`,
          hex,
          tier: "Secondary",
        };
      }
    });

    const tertiaryBase = blendHexColors(primary.hex, secondary.hex);
    const tertiaryRamp = generateColorRamp(tertiaryBase, 11);
    tertiaryRamp.forEach((hex, idx) => {
      const step = primarySteps[idx];
      if (step === 500) {
        tiers[`Tertiary`] = { name: "Tertiary", hex, tier: "Tertiary" };
      } else {
        tiers[`Tertiary.${step}`] = {
          name: `Tertiary.${step}`,
          hex,
          tier: "Tertiary",
        };
      }
    });
  }

  return tiers;
}

/**
 * Get colors for display with priority: database > tiered-defaults > clientStorage > defaults
 */
export function getColorsForDisplay(
  databaseColors: Array<{ name: string; hex: string }> | null,
  clientStorageColors: Array<{ name: string; hex: string }> | null,
  useTieredRamp: boolean = true
): { colors: Array<{ name: string; hex: string }>; source: string } {
  // Priority 1: Database colors
  if (databaseColors && databaseColors.length > 0) {
    return { colors: databaseColors, source: "database" };
  }

  // Priority 2: Tiered ramp defaults
  if (useTieredRamp) {
    const tieredRamp = generateDefaultTieredRamp();
    const tieredColors: Array<{ name: string; hex: string }> = [];

    const baseTiers = ["Primary", "Secondary", "Tertiary"];
    baseTiers.forEach((tierKey) => {
      if (tieredRamp[tierKey]) {
        tieredColors.push({
          name: tieredRamp[tierKey].name,
          hex: tieredRamp[tierKey].hex,
        });
      }
    });

    DEFAULT_COLORS.forEach((color) => {
      if (color.name !== "Primary" && color.name !== "Secondary") {
        tieredColors.push(color);
      }
    });

    return { colors: tieredColors, source: "defaults-tiered" };
  }

  // Priority 3: clientStorage
  if (clientStorageColors && clientStorageColors.length > 0) {
    return { colors: clientStorageColors, source: "clientStorage" };
  }

  // Fallback
  return { colors: DEFAULT_COLORS, source: "defaults" };
}

/**
 * Get ramp with appropriate complexity
 */
export function getColorRampForComplexity(baseColor: string): string[] {
  const steps = RAMP_STEPS[state.rampComplexity];
  return generateColorRamp(baseColor, steps.length).slice(0, steps.length);
}

// ===== CHANGE DETECTION =====

/**
 * Generate hash of current colors
 */
function generateColorsHash(): string {
  const allColors = [...state.editableColors, ...state.customColors];
  return allColors.map((c) => `${c.name}:${c.hex}`).join("|");
}

/**
 * Get indices of colors that changed since last sync
 */
export function getChangedColorIndices(): number[] {
  const allColors = [...state.editableColors, ...state.customColors];
  const changedIndices: number[] = [];

  allColors.forEach((color, idx) => {
    const lastValue = state.lastSyncedColorValues.get(color.name);
    if (lastValue !== color.hex) {
      changedIndices.push(idx);
    }
  });

  return changedIndices;
}

/**
 * Update sync button state
 */
export function updateSyncButtonState(buttonElement?: HTMLButtonElement): void {
  if (!buttonElement) {
    buttonElement = document.getElementById("color2000-sync-button") as HTMLButtonElement;
  }
  if (!buttonElement) return;

  const currentHash = generateColorsHash();
  state.hasUnsyncedChanges = state.isInitialLoad ? false : currentHash !== state.lastSyncedColors;

  if (state.hasUnsyncedChanges) {
    buttonElement.style.opacity = "1";
    buttonElement.style.cursor = "pointer";
    buttonElement.style.backgroundColor = "#3b82f6";
    buttonElement.disabled = false;
    buttonElement.title = "Click to sync changes to database and file";
    buttonElement.textContent = "💾 Sync Changes";
  } else {
    buttonElement.style.opacity = "0.5";
    buttonElement.style.cursor = "not-allowed";
    buttonElement.style.backgroundColor = "#9ca3af";
    buttonElement.disabled = true;
    buttonElement.title = "All changes synced ✓";
    buttonElement.textContent = "✓ All Synced";
  }
}

// ===== RENDERING =====

/**
 * Render database colors with tiered ramps and editing
 */
export function renderDatabaseColors(
  colors: Array<{ name: string; hex: string }> | null,
  clientStorageColors?: Array<{ name: string; hex: string }> | null,
  containerId: string = "color2000-area"
): void {
  const container = document.getElementById(containerId);
  if (!container) return;

  const { colors: colorsToDisplay, source } = getColorsForDisplay(
    colors && colors.length > 0 ? colors : state.editableColors,
    clientStorageColors || null
  );

  // Store for syncing (only overwrite if colorsToDisplay is not empty)
  if (colorsToDisplay.length > 0) {
    state.editableColors = [...colorsToDisplay];
  }

  // Extract custom colors on first load
  if (state.customColors.length === 0) {
    const semanticColorNames = [
      "Primary",
      "Secondary",
      "Tertiary",
      "Neutral",
      "Success",
      "Warning",
      "Danger",
      "Info",
    ];
    state.customColors = colorsToDisplay
      .filter((color) => !semanticColorNames.includes(color.name))
      .slice(0, MAX_CUSTOM_COLORS);
  }

  // Initialize lastSyncedColorValues on first load
  if (state.lastSyncedColorValues.size === 0) {
    colorsToDisplay.forEach((color) => {
      state.lastSyncedColorValues.set(color.name, color.hex);
    });
    state.lastSyncedColors = generateColorsHash();
  }

  container.innerHTML = "";

  // Create modals container
  let modalsContainer = document.getElementById("color2000-modals-container");
  if (!modalsContainer) {
    modalsContainer = document.createElement("div");
    modalsContainer.id = "color2000-modals-container";
    modalsContainer.style.pointerEvents = "none";
    document.body.appendChild(modalsContainer);
  } else {
    modalsContainer.innerHTML = "";
  }

  // Show source info
  const sourceInfo = document.createElement("p");
  sourceInfo.style.cssText = "font-size: 0.75rem; color: #999; margin-bottom: 12px;";
  const sourceLabel =
    source === "defaults-tiered"
      ? "Default Tiered Hierarchy (Primary → Secondary → Tertiary)"
      : source === "database"
        ? "Design System Database"
        : source === "clientStorage"
          ? "File Storage (clientStorage)"
          : "Default Colors";
  sourceInfo.textContent = `📦 Colors: ${sourceLabel} (${colorsToDisplay.length} colors)`;
  container.appendChild(sourceInfo);

  // Create wrapper
  const wrapper = document.createElement("div");
  wrapper.style.cssText = "display: flex; flex-direction: column; gap: 16px;";

  // Complexity selector
  const complexityContainer = document.createElement("div");
  complexityContainer.style.cssText =
    "display: flex; gap: 8px; align-items: center; padding: 8px; background: #f9fafb; border-radius: 6px;";

  const complexityLabel = document.createElement("label");
  complexityLabel.textContent = "Ramp steps:";
  complexityLabel.style.cssText = "font-size: 0.875rem; color: #6b7280; white-space: nowrap;";

  const complexitySelect = document.createElement("select");
  complexitySelect.style.cssText =
    "padding: 4px 8px; border: 1px solid #d1d5db; border-radius: 4px; background: white; font-size: 0.875rem; cursor: pointer;";

  const options = [
    { value: "simple", label: "Simple (7 steps)" },
    { value: "medium", label: "Medium (9 steps)" },
    { value: "comprehensive", label: "Comprehensive (11 steps)" },
  ];

  options.forEach((opt) => {
    const option = document.createElement("option");
    option.value = opt.value;
    option.textContent = opt.label;
    if (opt.value === state.rampComplexity) option.selected = true;
    complexitySelect.appendChild(option);
  });

  complexitySelect.onchange = (e) => {
    state.rampComplexity = (e.target as HTMLSelectElement).value as typeof state.rampComplexity;
    renderDatabaseColors(state.editableColors, undefined, containerId);
  };

  complexityContainer.appendChild(complexityLabel);
  complexityContainer.appendChild(complexitySelect);
  wrapper.appendChild(complexityContainer);

  // Colors container
  const colorsContainer = document.createElement("div");
  colorsContainer.className = "color-ramps";

  // Setup color picker configs
  const pickerConfigs: ColorConfig[] = colorsToDisplay.map(
    (color, idx): ColorConfig => ({
      id: `color-${color.name.toLowerCase().replace(/\s+/g, "-")}`,
      name: `${color.name} 500`,
      hex: color.hex,
      onColorChange: (newHex) => {
        state.editableColors[idx].hex = newHex;
        renderDatabaseColors(state.editableColors, undefined, containerId);
      },
    })
  );

  state.customColors.forEach((customColor, idx) => {
    pickerConfigs.push({
      id: `color-custom-${idx}`,
      name: customColor.name,
      hex: customColor.hex,
      onColorChange: (newHex) => {
        state.customColors[idx].hex = newHex;
        renderDatabaseColors(state.editableColors, undefined, containerId);
      },
    });
  });

  if (pickerConfigs.length > 0) {
    setupColorPickersForColors(pickerConfigs, "color2000-modals-container");
  }

  // Sort and render colors
  const semanticColorOrder = [
    "Primary",
    "Secondary",
    "Tertiary",
    "Neutral",
    "Success",
    "Warning",
    "Danger",
    "Info",
  ];
  const sortedColors = [...colorsToDisplay].sort((a, b) => {
    const aIndex = semanticColorOrder.indexOf(a.name);
    const bIndex = semanticColorOrder.indexOf(b.name);
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return 0;
  });

  sortedColors.forEach((color, index) => {
    try {
      const ramp = getColorRampForComplexity(color.hex);
      const steps = RAMP_STEPS[state.rampComplexity];
      const rampRecord: Record<string, string> = {};
      steps.forEach((step, idx) => {
        if (ramp[idx]) rampRecord[`${step}`] = ramp[idx];
      });
      state.lastSyncedColorRamps.set(color.name, rampRecord);

      // Create color section
      const section = document.createElement("div");
      section.className = "color-ramp-section";
      section.setAttribute("data-color-id", color.name);

      const rampWrapper = document.createElement("div");
      rampWrapper.className = "color-ramp";

      const rampContainer = document.createElement("div");
      rampContainer.className = "color-ramp__swatches";

      const rampLabel = document.createElement("div");
      rampLabel.className = "color-ramp__label";
      rampLabel.style.setProperty("--label-bg", color.hex);
      rampLabel.style.setProperty("--label-text", getContrastTextColor(color.hex));

      const nameContainer = document.createElement("div");
      nameContainer.className = "color-ramp__name-container";

      const nameSpan = document.createElement("span");
      nameSpan.className = "color-ramp__name";
      nameSpan.textContent = color.name;

      const semanticColors = ["Success", "Warning", "Danger", "Info", "Neutral"];
      const isSemanticColor = semanticColors.includes(color.name);

      const editBtn = document.createElement("button");
      editBtn.className = "color-ramp__edit-btn";
      if (isSemanticColor) {
        editBtn.classList.add("color-ramp__edit-btn--locked");
      }
      editBtn.textContent = isSemanticColor ? "🔒" : "✏️";
      editBtn.title = isSemanticColor ? "Semantic colors cannot be renamed" : "Edit color name";
      editBtn.disabled = isSemanticColor;

      nameContainer.appendChild(nameSpan);
      nameContainer.appendChild(editBtn);

      const hexCode = document.createElement("code");
      hexCode.className = "color-ramp__hex-code";
      hexCode.title = "Click to open color picker";
      hexCode.textContent = color.hex;

      const pickerId = `color-${color.name.toLowerCase().replace(/\s+/g, "-")}`;
      hexCode.onclick = (e) => {
        e.stopPropagation();
        showColorPickerById(pickerId);
      };

      rampLabel.appendChild(nameContainer);
      rampLabel.appendChild(hexCode);

      // Generate swatches
      ramp.forEach((hex, idx) => {
        const swatch = document.createElement("div");
        swatch.className = "color-swatch";
        swatch.setAttribute("data-step", steps[idx].toString());
        swatch.style.backgroundColor = hex;

        swatch.innerHTML = `
          <span class="color-swatch__label">${steps[idx]}</span>
          <span class="color-swatch__hex">${hex}</span>
        `;

        swatch.onclick = () => {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(hex).catch(() => {
              showNotification(`Failed to copy ${hex}`, "error");
            });
            showNotification(`Copied ${hex}`, "success");
          } else {
            showNotification(`Hex: ${hex} - Copy manually`, "info");
          }
        };

        rampContainer.appendChild(swatch);
      });

      rampWrapper.appendChild(rampLabel);
      rampWrapper.appendChild(rampContainer);
      section.appendChild(rampWrapper);
      colorsContainer.appendChild(section);
    } catch (error) {
      console.error("[DatabaseColors] Error rendering color:", color, error);
    }
  });

  wrapper.appendChild(colorsContainer);

  // Custom colors section
  if (state.customColors.length > 0 || state.customColors.length < MAX_CUSTOM_COLORS) {
    const customSection = document.createElement("div");
    customSection.style.cssText =
      "margin-top: 16px; padding-top: 16px; border-top: 1px solid #e0e0e0;";

    const customTitle = document.createElement("p");
    customTitle.style.cssText =
      "font-size: 0.875rem; font-weight: 600; color: #333; margin: 0 0 12px 0;";
    customTitle.textContent = `Custom Colors (${state.customColors.length}/${MAX_CUSTOM_COLORS})`;
    customSection.appendChild(customTitle);

    state.customColors.forEach((customColor, idx) => {
      const customColorDiv = document.createElement("div");
      customColorDiv.style.cssText =
        "display: flex; gap: 8px; margin-bottom: 8px; align-items: center;";

      const colorSwatch = document.createElement("div");
      colorSwatch.setAttribute("data-custom-idx", idx.toString());
      colorSwatch.style.cssText = `width: 32px; height: 32px; border-radius: 6px; background: ${customColor.hex}; border: 1px solid #d0d0d0; cursor: pointer;`;
      colorSwatch.onclick = () => {
        showColorPickerById(`color-custom-${idx}`);
      };

      const label = document.createElement("span");
      label.style.cssText = "flex: 1; font-size: 0.875rem; color: #555;";
      label.textContent = customColor.name;

      const deleteBtn = document.createElement("button");
      deleteBtn.style.cssText =
        "padding: 4px 8px; background: #fee2e2; color: #dc2626; border: none; border-radius: 4px; cursor: pointer; font-size: 0.75rem;";
      deleteBtn.textContent = "Remove";
      deleteBtn.onclick = () => {
        state.customColors.splice(idx, 1);
        renderDatabaseColors(state.editableColors, undefined, containerId);
      };

      customColorDiv.appendChild(colorSwatch);
      customColorDiv.appendChild(label);
      customColorDiv.appendChild(deleteBtn);
      customSection.appendChild(customColorDiv);
    });

    if (state.customColors.length < MAX_CUSTOM_COLORS) {
      const addCustomBtn = document.createElement("button");
      addCustomBtn.style.cssText =
        "width: 100%; padding: 8px 12px; background: #f3f4f6; border: 2px dashed #d1d5db; border-radius: 6px; color: #6b7280; font-size: 0.875rem; cursor: pointer; transition: all 0.2s;";
      addCustomBtn.textContent = "+ Add Custom Color";
      addCustomBtn.onmouseover = () => {
        addCustomBtn.style.background = "#e5e7eb";
        addCustomBtn.style.borderColor = "#9ca3af";
      };
      addCustomBtn.onmouseout = () => {
        addCustomBtn.style.background = "#f3f4f6";
        addCustomBtn.style.borderColor = "#d1d5db";
      };
      addCustomBtn.onclick = () => {
        state.customColors.push({
          name: `Custom ${state.customColors.length + 1}`,
          hex: "#6366f1",
        });
        renderDatabaseColors(state.editableColors, undefined, containerId);
      };
      customSection.appendChild(addCustomBtn);
    }

    wrapper.appendChild(customSection);
  }

  // Action buttons
  const buttonContainer = document.createElement("div");
  buttonContainer.className = "action-group";

  const syncButton = document.createElement("button");
  syncButton.id = "color2000-sync-button";
  syncButton.className = "action-group__btn action-group__btn--primary";
  syncButton.setAttribute("data-action", "sync-colors");

  const createButton = document.createElement("button");
  createButton.className = "action-group__btn action-group__btn--secondary";
  createButton.setAttribute("data-action", "create-colors");
  createButton.textContent = "🎨 Create on Canvas";
  createButton.title = "Apply colors to Figma components and styles";

  buttonContainer.appendChild(syncButton);
  buttonContainer.appendChild(createButton);
  wrapper.appendChild(buttonContainer);

  container.appendChild(wrapper);

  // Update sync state
  updateSyncButtonState(syncButton);

  state.isInitialLoad = false;
}

/**
 * Mark colors as synced
 */
export function markColorsSynced(): void {
  state.lastSyncedColors = generateColorsHash();
  state.lastSyncedColorValues.clear();
  [...state.editableColors, ...state.customColors].forEach((color) => {
    state.lastSyncedColorValues.set(color.name, color.hex);
  });
  state.hasUnsyncedChanges = false;
}

/**
 * Reset state (for testing or plugin switching)
 */
export function resetColorState(): void {
  state = {
    editableColors: [],
    customColors: [],
    rampComplexity: "simple",
    hasUnsyncedChanges: false,
    lastSyncedColors: "",
    lastSyncedColorValues: new Map(),
    lastSyncedColorRamps: new Map(),
    isInitialLoad: true,
  };
}
