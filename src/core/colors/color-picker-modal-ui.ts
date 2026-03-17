/**
 * Shared Interactive Color Picker Modal Component
 * Provides iro.js-based color wheel picker for styled-connect and styled-colors
 *
 * This component creates interactive modals with:
 * - Color wheel picker (iro.js)
 * - Hex value input
 * - Color preview with contrast-aware text
 * - Real-time color updates
 *
 * Architecture:
 * - setupColorPickersForColors: Creates modals for an array of colors
 * - ColorPickerConfig: Configuration for individual pickers
 * - Mirrors styled-colors implementation for consistency
 */

import { sendToPlugin, isValidHexColor } from "../utilities";

declare const iro: any;

export interface ColorPickerOptions {
  title?: string;
  initialColor?: string;
  onColorSelected?: (color: string) => void;
  onColorChanging?: (color: string) => void; // Live preview callback as user drags
}

export interface ColorConfig {
  id: string; // Unique identifier for the color (e.g., "primary", "secondary")
  name: string; // Display name (e.g., "Primary 500")
  hex: string; // Initial hex color
  onColorChange?: (newHex: string) => void; // Called when color is confirmed
  onColorChanging?: (newHex: string) => void; // Called during color picking (live)
}

/**
 * Setup color pickers for an array of colors
 * Creates picker modals and stores them in a container
 * Matches styled-colors implementation pattern
 */
export function setupColorPickersForColors(
  colors: ColorConfig[],
  containerId: string = "modals-container"
): void {
  // Always append modals directly to body to ensure they're visible
  // Even if container has display: none, fixed position modals should work
  const container = document.getElementById(containerId) || document.body;

  if (!document.getElementById(containerId)) {
    console.warn(`[Color Picker] Container "${containerId}" not found, using body`);
  }

  console.log(
    `[Color Picker] Setting up ${colors.length} color pickers:`,
    colors.map((c) => c.id)
  );

  colors.forEach((colorConfig, idx) => {
    const modalId = `${colorConfig.id}-picker-modal`;
    console.log(`[Color Picker] Creating modal: ${modalId}`);

    const modal = document.createElement("div");
    modal.id = modalId;
    modal.className = "picker-modal";
    modal.style.cssText = ``;

    modal.innerHTML = `
      <div class="picker-modal__content" style="
        background: ${colorConfig.hex};">
        <div class="picker-modal__title">${colorConfig.name}</div>
        <div id="${colorConfig.id}-picker" class="picker-modal__picker"></div>
        <input 
          type="text" 
          id="${colorConfig.id}-color-input" 
          class="picker-modal__input" 
          placeholder="#000000"
          value="${colorConfig.hex}"
        />
        <div class="btn-wrapper">
          <button id="${colorConfig.id}-color-cancel" class="btn btn--cancel">Cancel</button>
          <button id="${colorConfig.id}-color-confirm" class="btn btn--primary">Confirm</button>
        </div>
      </div>
    `;

    container.appendChild(modal);

    console.log(
      `[Color Picker] Created modal ${modalId}, now in DOM:`,
      document.getElementById(modalId) ? "YES" : "NO"
    );

    // Close modal on outside click
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.style.display = "none";
      }
    });

    // Initialize iro.js picker for this color
    initializeIroPickerForColor(
      colorConfig.id,
      colorConfig.hex,
      colorConfig.onColorChange,
      colorConfig.onColorChanging
    );
  });

  // Verify all modals exist in DOM
  console.log(
    `[Color Picker] Setup complete. Total modals in DOM:`,
    document.querySelectorAll("[id*='picker-modal']").length
  );
  console.log(
    `[Color Picker] Modal IDs:`,
    Array.from(document.querySelectorAll("[id*='picker-modal']")).map((el) => el.id)
  );
}

/**
 * Initialize iro.js picker for a single color
 * Handles real-time updates and contrast-aware text
 */
function initializeIroPickerForColor(
  colorId: string,
  initialHex: string,
  onColorChange?: (newHex: string) => void,
  onColorChanging?: (newHex: string) => void
): void {
  const pickerId = `${colorId}-picker`;
  const colorInputId = `${colorId}-color-input`;
  const modalId = `${colorId}-picker-modal`;

  if (typeof iro === "undefined") {
    console.warn(
      '[Color Picker] iro.js not loaded. Add to HTML: <script src="https://cdn.jsdelivr.net/npm/@jaames/iro/dist/iro.min.js"></script>'
    );
    return;
  }

  try {
    const picker = new iro.ColorPicker(`#${pickerId}`, {
      width: 220,
      color: initialHex,
      layout: [
        { component: iro.ui.Box },
        { component: iro.ui.Slider, options: { sliderType: "hue" } },
      ],
    });

    const modalContent = document.querySelector(
      `#${modalId} .picker-modal__content`
    ) as HTMLElement;
    const colorInput = document.getElementById(colorInputId) as HTMLInputElement;

    // Initialize modal appearance
    if (modalContent && colorInput) {
      const brightness = getColorBrightness(initialHex);
      modalContent.style.color = brightness > 128 ? "#000" : "#fff";
      colorInput.value = initialHex;
    }

    // Real-time color updates during picking
    picker.on("color:change", (c: any) => {
      const newHex = c.hexString;

      if (colorInput) {
        colorInput.value = newHex;
      }

      if (modalContent) {
        modalContent.style.backgroundColor = newHex;
        const brightness = getColorBrightness(newHex);
        modalContent.style.color = brightness > 128 ? "#000" : "#fff";
      }

      // Trigger live preview callback
      if (onColorChanging) {
        onColorChanging(newHex);
      }
    });

    // Handle hex input changes
    if (colorInput) {
      colorInput.addEventListener("input", (e) => {
        const newHex = (e.target as HTMLInputElement).value;
        if (isValidHexColor(newHex)) {
          picker.color.hexString = newHex;

          if (modalContent) {
            modalContent.style.backgroundColor = newHex;
            const brightness = getColorBrightness(newHex);
            modalContent.style.color = brightness > 128 ? "#000" : "#fff";
          }

          if (onColorChanging) {
            onColorChanging(newHex);
          }
        }
      });

      // Confirm selection on Enter
      colorInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          const modal = document.getElementById(modalId) as HTMLElement;
          if (modal) {
            const finalHex = colorInput.value;
            if (isValidHexColor(finalHex) && onColorChange) {
              onColorChange(finalHex);
            }
            modal.style.display = "none";
          }
        }
      });

      // Confirm button
      const confirmBtn = document.getElementById(`${colorId}-color-confirm`) as HTMLButtonElement;
      if (confirmBtn) {
        confirmBtn.addEventListener("click", () => {
          const finalHex = colorInput.value;
          if (isValidHexColor(finalHex) && onColorChange) {
            onColorChange(finalHex);
          }
          const modal = document.getElementById(modalId) as HTMLElement;
          if (modal) {
            modal.style.display = "none";
          }
        });
      }

      // Cancel button
      const cancelBtn = document.getElementById(`${colorId}-color-cancel`) as HTMLButtonElement;
      if (cancelBtn) {
        cancelBtn.addEventListener("click", () => {
          const modal = document.getElementById(modalId) as HTMLElement;
          if (modal) {
            modal.style.display = "none";
          }
        });
      }
    }
  } catch (e) {
    console.error(`[Color Picker] Failed to initialize iro.js for ${colorId}:`, e);
  }
}

/**
 * Calculate color brightness for contrast-aware text
 * Returns 0-255 brightness value
 */
function getColorBrightness(hex: string): number {
  const r = parseInt(hex.substr(1, 2), 16);
  const g = parseInt(hex.substr(3, 2), 16);
  const b = parseInt(hex.substr(5, 2), 16);
  return (r * 299 + g * 587 + b * 114) / 1000;
}

/**
 * Show/hide a color picker modal by ID
 */
export function showColorPickerById(colorId: string): void {
  const modalId = `${colorId}-picker-modal`;
  const modal = document.getElementById(modalId) as HTMLElement;

  if (modal) {
    console.log(`[Color Picker] ✓ Showing modal: ${modalId}`);
    modal.style.display = "flex";
  } else {
    console.error(`[Color Picker] ✗ Modal NOT found: ${modalId}`);
    console.log(
      `Available modals:`,
      Array.from(document.querySelectorAll("[id*='picker-modal']")).map((el) => el.id)
    );
  }
}

/**
 * Hide a color picker modal by ID
 */
export function hideColorPickerById(colorId: string): void {
  const modal = document.getElementById(`${colorId}-picker-modal`) as HTMLElement;
  if (modal) {
    modal.style.display = "none";
  }
}

/**
 * Legacy: Show single color picker modal (simpler interface)
 * For backwards compatibility with existing code
 */
export function showColorPickerModal(options: ColorPickerOptions = {}): void {
  const {
    title = "Pick a Color",
    initialColor = "#0EA5E9",
    onColorSelected = defaultColorHandler,
    onColorChanging,
  } = options;

  // Create temporary color config and show picker
  setupColorPickersForColors(
    [
      {
        id: "temp-picker",
        name: title,
        hex: initialColor,
        onColorChange: onColorSelected,
        onColorChanging,
      },
    ],
    "temp-modals-container"
  );

  // Ensure container exists
  let container = document.getElementById("temp-modals-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "temp-modals-container";
    container.style.display = "none";
    document.body.appendChild(container);
  }

  // Show the modal
  showColorPickerById("temp-picker");

  // Clean up on close
  const modal = document.getElementById("temp-picker-picker-modal");
  if (modal) {
    const originalOnChange = onColorSelected;
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        container?.remove();
      }
    });
  }
}

/**
 * Default color handler - sends color to plugin
 */
function defaultColorHandler(color: string): void {
  sendToPlugin({
    type: "color-selected",
    color,
  });
}

/**
 * Create a color swatch button that opens the picker
 */
export function createColorSwatchButton(
  containerSelector: string,
  color: string,
  onColorChange: (color: string) => void
): HTMLElement {
  const container = document.querySelector(containerSelector);
  if (!container) return document.createElement("div");

  const button = document.createElement("button");
  button.className = "color-swatch-btn";
  button.style.cssText = `
    width: 48px;
    height: 48px;
    border-radius: 8px;
    border: 2px solid #e5e7eb;
    background-color: ${color};
    cursor: pointer;
    transition: all 0.2s ease;
    padding: 0;
    font-size: 0;
  `;

  button.title = "Click to pick color";

  button.addEventListener("click", () => {
    showColorPickerModal({
      title: "Edit Color",
      initialColor: color,
      onColorSelected: onColorChange,
    });
  });

  button.addEventListener("mouseenter", () => {
    button.style.borderColor = "#0284C7";
    button.style.boxShadow = "0 0 0 3px rgba(2, 132, 199, 0.1)";
  });

  button.addEventListener("mouseleave", () => {
    button.style.borderColor = "#e5e7eb";
    button.style.boxShadow = "none";
  });

  return button;
}
