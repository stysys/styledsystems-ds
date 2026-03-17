/**
 * Shared Colors Management Module
 * Used by styled-connect and other plugins needing color management
 *
 * Provides:
 * - Color list rendering with editing
 * - Interactive color picker modal (iro.js)
 * - Color scale generation
 * - Event handling for color changes
 */

import { sendToPlugin, isValidHexColor } from "../utilities";
import { showColorPickerModal, createColorSwatchButton } from "./color-picker-modal-ui";
import {
  generateColorRamp,
  generateSemanticScales,
  generateTailwindPalette,
  getContrastTextColor,
} from "./color-scale";
import type { DesignSystem } from "../types";

/**
 * Render color list with inline editing and interactive picker
 */
export function renderColorsList(designSystem: DesignSystem | null): void {
  const colorsArea = document.getElementById("colors-area");
  if (!colorsArea) return;

  const colors = designSystem?.tokens?.colors || {};

  let html = `<div id="color-list" class="color-list">`;

  Object.entries(colors).forEach(([name, value]) => {
    const textColor = getContrastTextColor(value);
    html += `
      <div class="color-item" style="display: flex; align-items: center; gap: 12px; padding: 12px; background: #f9fafb; border-radius: 6px; margin-bottom: 8px;">
        <div 
          class="color-swatch" 
          data-color-name="${name}"
          style="width: 48px; height: 48px; border-radius: 6px; background-color: ${value}; border: 2px solid #e5e7eb; cursor: pointer; flex-shrink: 0; transition: all 0.2s ease;"
          title="Click to edit color"
        ></div>
        <div style="flex: 1; min-width: 0;">
          <input 
            type="text" 
            value="${name}" 
            class="color-name-input" 
            data-color-name="${name}" 
            placeholder="Color name"
            style="width: 100%; padding: 6px 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px; margin-bottom: 6px; box-sizing: border-box;"
          />
          <input 
            type="text" 
            value="${value}" 
            class="color-value-input" 
            data-color-name="${name}" 
            placeholder="Hex color"
            style="width: 100%; padding: 6px 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px; font-family: monospace; box-sizing: border-box;"
          />
        </div>
        <div style="display: flex; gap: 6px; flex-shrink: 0;">
          <button 
            class="btn btn--primary btn--sm save-color-btn" 
            data-color-name="${name}"
            style="padding: 6px 12px; background: #0284C7; color: white; border: none; border-radius: 4px; font-size: 12px; cursor: pointer; font-weight: 500;"
          >
            Save
          </button>
          <button 
            class="btn btn--secondary btn--sm delete-color-btn" 
            data-color-name="${name}"
            style="padding: 6px 12px; background: #ef4444; color: white; border: none; border-radius: 4px; font-size: 12px; cursor: pointer; font-weight: 500;"
          >
            Delete
          </button>
        </div>
      </div>
    `;
  });

  html += `</div>`;
  html += `<button class="btn btn--primary" id="add-color-btn" style="width: 100%; padding: 10px; margin-top: 12px; background: #10B981; color: white; border: none; border-radius: 6px; font-weight: 500; cursor: pointer;">+ Add Color</button>`;

  colorsArea.innerHTML = html;
  attachColorEventHandlers();
}

/**
 * Attach event handlers to color inputs and buttons
 */
export function attachColorEventHandlers(): void {
  // Color swatch click - open interactive color picker modal
  document.querySelectorAll(".color-swatch").forEach((swatch) => {
    const swatchEl = swatch as HTMLElement;
    swatchEl.addEventListener("click", function (this: HTMLElement) {
      const colorName = this.dataset.colorName;
      if (!colorName) return;

      const currentColor = (
        document.querySelector(
          `.color-value-input[data-color-name="${colorName}"]`
        ) as HTMLInputElement
      )?.value;

      showColorPickerModal({
        title: `Edit ${colorName}`,
        initialColor: currentColor || "#0EA5E9",
        onColorSelected: (color) => {
          const valueInput = document.querySelector(
            `.color-value-input[data-color-name="${colorName}"]`
          ) as HTMLInputElement;
          if (valueInput) {
            valueInput.value = color;
            swatchEl.style.backgroundColor = color;
          }
        },
      });
    });

    // Hover effect
    swatchEl.addEventListener("mouseenter", function () {
      (this as HTMLElement).style.boxShadow = "0 0 0 3px rgba(2, 132, 199, 0.1)";
      (this as HTMLElement).style.borderColor = "#0284C7";
    });
    swatchEl.addEventListener("mouseleave", function () {
      (this as HTMLElement).style.boxShadow = "none";
      (this as HTMLElement).style.borderColor = "#e5e7eb";
    });
  });

  // Save color button
  document.querySelectorAll(".save-color-btn").forEach((btn) => {
    btn.addEventListener("click", function (this: HTMLElement) {
      const colorName = this.dataset.colorName;
      if (!colorName) return;

      const nameInput = document.querySelector(
        `.color-name-input[data-color-name="${colorName}"]`
      ) as HTMLInputElement;
      const valueInput = document.querySelector(
        `.color-value-input[data-color-name="${colorName}"]`
      ) as HTMLInputElement;

      if (!nameInput || !valueInput) return;

      const newName = nameInput.value.trim();
      const newValue = valueInput.value.trim();

      if (!newName) {
        alert("Color name cannot be empty");
        return;
      }

      if (!isValidHexColor(newValue)) {
        alert("Please enter a valid hex color (e.g., #FF0000)");
        return;
      }

      // Send to plugin to save color
      sendToPlugin({
        type: "save-color",
        colorName,
        newName,
        newValue,
      });
    });
  });

  // Delete color button
  document.querySelectorAll(".delete-color-btn").forEach((btn) => {
    btn.addEventListener("click", function (this: HTMLElement) {
      const colorName = this.dataset.colorName;
      if (!colorName) return;

      if (confirm(`Delete color "${colorName}"?`)) {
        sendToPlugin({
          type: "delete-color",
          colorName,
        });
      }
    });
  });

  // Add color button
  const addColorBtn = document.getElementById("add-color-btn");
  if (addColorBtn) {
    addColorBtn.addEventListener("click", () => {
      const newName = prompt("Enter color name (e.g., primary-blue):");
      if (!newName) return;

      // Show color picker modal instead of prompt
      showColorPickerModal({
        title: "Choose Color",
        initialColor: "#0EA5E9",
        onColorSelected: (color) => {
          if (isValidHexColor(color)) {
            sendToPlugin({
              type: "add-color",
              colorName: newName.trim(),
              colorValue: color,
            });
          }
        },
      });
    });
  }
}

/**
 * Initialize colors tab
 */
export function initializeColors(): void {
  // Event listeners will be attached when colors are rendered
}

/**
 * Export color picker utilities for advanced use
 */
export { showColorPickerModal, createColorSwatchButton } from "./color-picker-modal-ui";
export {
  generateColorRamp,
  generateSemanticScales,
  generateTailwindPalette,
  darkenColor,
  lightenColor,
  getComplementaryColor,
  getAnalogousColors,
  getTriadicColors,
  getContrastRatio,
  hasGoodContrast,
  isLightColor,
  getContrastTextColor,
} from "./color-scale";
