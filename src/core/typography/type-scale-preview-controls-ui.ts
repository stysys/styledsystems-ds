export const SCALE_PREVIEW_CONTROLS_STYLES = {
  previewSection: "type-scale-preview-section",
  previewSectionControls: "type-scale-preview-section__controls",
  previewSectionDisplay: "type-scale-preview-section__display",
  container: "type-scale-preview-controls",
  title: "type-scale-preview-controls__title",
  btnGroup: "type-scale-preview-controls__btn-group",
  btnSet: "type-scale-preview-controls__btn-set",
  btn: "type-scale-preview-controls__btn",
  btnRemoveSmall: "type-scale-preview-controls__btn--remove-small",
  btnAddSmall: "type-scale-preview-controls__btn--add-small",
  btnRemoveLarge: "type-scale-preview-controls__btn--remove-large",
  btnAddLarge: "type-scale-preview-controls__btn--add-large",
  label: "type-scale-preview-controls__label",
};
/**
 * @styled/core - Scale Preview UI Components
 * Reusable UI for controlling type scale steps (small/large)
 * Can be used by Figma plugins and web applications
 *
 * Provides:
 * - Scale step control buttons (add/remove small and large sizes)
 * - Consistent styling and interaction patterns
 * - Base scale protection with user feedback
 * - Plugin-agnostic callbacks for external state management
 */

import {
  removeSmallStep,
  addSmallStep,
  removeHeadingStep,
  addHeadingStep,
  type ScaleStep,
} from "./typography";

/**
 * Callback options for scale preview events
 */
export interface ScalePreviewCallbacks {
  onStepsChanged?: (newSteps: ScaleStep[]) => void;
  onBaseProtected?: (message: string) => void;
  onError?: (error: string) => void;
}

/**
 * CSS constants for BEM class names
 * Styling is defined in type-scale-preview-controls-ui.css
 */

/**
 * Create a remove button for smaller text steps
 * @param activeSteps Current scale steps
 * @param callbacks Callback functions for state management
 * @returns Button element with click handler
 */
export function createRemoveSmallButton(
  activeSteps: ScaleStep[],
  callbacks?: ScalePreviewCallbacks
): HTMLButtonElement {
  const button = document.createElement("button");
  button.className = `${SCALE_PREVIEW_CONTROLS_STYLES.btn} ${SCALE_PREVIEW_CONTROLS_STYLES.btnRemoveSmall}`;
  button.textContent = "−";
  // Disable if removal is not possible (core logic returns null)
  if (removeSmallStep(activeSteps) === null) {
    button.disabled = true;
    button.title = "Cannot remove: base must remain";
  }
  button.onclick = () => {
    const result = removeSmallStep(activeSteps);
    if (result) {
      console.log("[Scale Preview] Removed small step. Active steps:", result);
      callbacks?.onStepsChanged?.(result);
    } else {
      // Base cannot be removed - provide feedback
      const message = "Base scale is required and cannot be removed";
      console.warn(`[Scale Preview] ${message}`);
      callbacks?.onBaseProtected?.(message);
    }
  };
  return button;
}

/**
 * Create an add button for smaller text steps
 * @param activeSteps Current scale steps
 * @param callbacks Callback functions for state management
 * @returns Button element with click handler
 */
export function createAddSmallButton(
  activeSteps: ScaleStep[],
  callbacks?: ScalePreviewCallbacks
): HTMLButtonElement {
  const button = document.createElement("button");
  button.className = `${SCALE_PREVIEW_CONTROLS_STYLES.btn} ${SCALE_PREVIEW_CONTROLS_STYLES.btnAddSmall}`;
  button.textContent = "+";

  button.onclick = () => {
    const result = addSmallStep(activeSteps);
    if (result) {
      console.log("[Scale Preview] Added small step. Active steps:", result);
      callbacks?.onStepsChanged?.(result);
    } else {
      const message = "All smaller step sizes already added";
      console.warn(`[Scale Preview] ${message}`);
      callbacks?.onError?.(message);
    }
  };

  return button;
}

/**
 * Create a remove button for larger text steps
 * @param activeSteps Current scale steps
 * @param callbacks Callback functions for state management
 * @returns Button element with click handler
 */
export function createRemoveLargeButton(
  activeSteps: ScaleStep[],
  callbacks?: ScalePreviewCallbacks
): HTMLButtonElement {
  const button = document.createElement("button");
  button.className = `${SCALE_PREVIEW_CONTROLS_STYLES.btn} ${SCALE_PREVIEW_CONTROLS_STYLES.btnRemoveLarge}`;
  button.textContent = "−";
  // Disable if removal is not possible (core logic returns null)
  if (removeHeadingStep(activeSteps) === null) {
    button.disabled = true;
    button.title = "Cannot remove: base must remain";
  }
  button.onclick = () => {
    const result = removeHeadingStep(activeSteps);
    if (result) {
      console.log("[Scale Preview] Removed large step. Active steps:", result);
      callbacks?.onStepsChanged?.(result);
    } else {
      // Base cannot be removed - provide feedback
      const message = "Base scale is required and cannot be removed";
      console.warn(`[Scale Preview] ${message}`);
      callbacks?.onBaseProtected?.(message);
    }
  };
  return button;
}

/**
 * Create an add button for larger text steps
 * @param activeSteps Current scale steps
 * @param callbacks Callback functions for state management
 * @returns Button element with click handler
 */
export function createAddLargeButton(
  activeSteps: ScaleStep[],
  callbacks?: ScalePreviewCallbacks
): HTMLButtonElement {
  const button = document.createElement("button");
  button.className = `${SCALE_PREVIEW_CONTROLS_STYLES.btn} ${SCALE_PREVIEW_CONTROLS_STYLES.btnAddLarge}`;
  button.textContent = "+";

  button.onclick = () => {
    const result = addHeadingStep(activeSteps);
    if (result) {
      console.log("[Scale Preview] Added large step. Active steps:", result);
      callbacks?.onStepsChanged?.(result);
    } else {
      const message = "All larger step sizes already added";
      console.warn(`[Scale Preview] ${message}`);
      callbacks?.onError?.(message);
    }
  };

  return button;
}

/**
 * Create a complete small text controls section
 * @param activeSteps Current scale steps
 * @param callbacks Callback functions for state management
 * @returns Container with label and add/remove buttons
 */
export function createSmallTextControls(
  activeSteps: ScaleStep[],
  callbacks?: ScalePreviewCallbacks
): HTMLDivElement {
  const container = document.createElement("div");

  container.className = SCALE_PREVIEW_CONTROLS_STYLES.btnSet;

  // Label
  const label = document.createElement("span");
  label.className = SCALE_PREVIEW_CONTROLS_STYLES.label;
  label.textContent = "Small text:";

  // Remove button
  const removeBtn = createRemoveSmallButton(activeSteps, callbacks);

  // Add button
  const addBtn = createAddSmallButton(activeSteps, callbacks);

  container.appendChild(label);
  container.appendChild(removeBtn);
  container.appendChild(addBtn);

  return container;
}

/**
 * Create a complete large text controls section
 * @param activeSteps Current scale steps
 * @param callbacks Callback functions for state management
 * @returns Container with label and add/remove buttons
 */
export function createLargeTextControls(
  activeSteps: ScaleStep[],
  callbacks?: ScalePreviewCallbacks
): HTMLDivElement {
  const container = document.createElement("div");

  container.className = SCALE_PREVIEW_CONTROLS_STYLES.btnSet;

  // Label
  const label = document.createElement("span");
  label.className = SCALE_PREVIEW_CONTROLS_STYLES.label;
  label.textContent = "Large text:";

  // Remove button
  const removeBtn = createRemoveLargeButton(activeSteps, callbacks);

  // Add button
  const addBtn = createAddLargeButton(activeSteps, callbacks);

  container.appendChild(label);
  container.appendChild(removeBtn);
  container.appendChild(addBtn);

  return container;
}

/**
 * Create a complete scale preview controls section
 * Includes both small and large text controls
 * @param activeSteps Current scale steps
 * @param callbacks Callback functions for state management
 * @returns Complete controls container
 */
export function createScalePreviewControls(
  activeSteps: ScaleStep[],
  callbacks?: ScalePreviewCallbacks
): HTMLElement {
  const container = document.createElement("div");

  container.className = SCALE_PREVIEW_CONTROLS_STYLES.container;

  // Title
  const title = document.createElement("h3");
  title.textContent = "Type Scale Controls";
  title.className = SCALE_PREVIEW_CONTROLS_STYLES.title;

  // Button group
  const btnGroup = document.createElement("div");
  btnGroup.className = SCALE_PREVIEW_CONTROLS_STYLES.btnGroup;

  // Add small and large controls
  const smallControls = createSmallTextControls(activeSteps, callbacks);
  const largeControls = createLargeTextControls(activeSteps, callbacks);

  btnGroup.appendChild(smallControls);
  btnGroup.appendChild(largeControls);

  container.appendChild(title);
  container.appendChild(btnGroup);

  return container;
}

/**
 * Create a complete preview section with controls and display
 * Wraps both controls and preview in a parent container
 *
 * @param controls - Rendered controls element
 * @param preview - Rendered preview display element
 * @returns Section container with controls and preview
 */
export function createTypographyPreviewSection(
  controls: HTMLElement,
  preview: HTMLElement
): HTMLElement {
  const section = document.createElement("section");
  section.className = SCALE_PREVIEW_CONTROLS_STYLES.previewSection;
  section.id = "typography-preview-section";

  // Controls element
  const controlsWrapper = document.createElement("div");
  controlsWrapper.className = SCALE_PREVIEW_CONTROLS_STYLES.previewSectionControls;
  controlsWrapper.appendChild(controls);

  // Display element
  const displayWrapper = document.createElement("div");
  displayWrapper.className = SCALE_PREVIEW_CONTROLS_STYLES.previewSectionDisplay;
  displayWrapper.appendChild(preview);

  section.appendChild(controlsWrapper);
  section.appendChild(displayWrapper);

  return section;
}
