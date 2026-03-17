/**
 * @styled/core - Action Group UI
 * Reusable semantic container for CRUD operation buttons
 * Provides consistent styling for create, update, sync, delete actions
 */

/**
 * Action button options
 */
export interface ActionButton {
  label: string;
  icon?: string;
  type: "primary" | "secondary" | "danger" | "success";
  onClick: () => void;
  disabled?: boolean;
}

/**
 * CSS constants for BEM class names
 * Styling is defined in action-group-ui.css
 */
export const ACTION_GROUP_STYLES = {
  container: "action-group",
  btn: "action-group__btn",
  btnPrimary: "action-group__btn--primary",
  btnSecondary: "action-group__btn--secondary",
  btnDanger: "action-group__btn--danger",
  btnSuccess: "action-group__btn--success",
};

/**
 * Create a single action button
 * @param config - Button configuration
 * @returns Button element
 */
export function createActionButton(config: ActionButton): HTMLButtonElement {
  const button = document.createElement("button");
  button.className = `${ACTION_GROUP_STYLES.btn} ${ACTION_GROUP_STYLES.btn}--${config.type}`;

  const text = config.icon ? `${config.icon} ${config.label}` : config.label;
  button.textContent = text;

  button.onclick = config.onClick;

  if (config.disabled) {
    button.disabled = true;
  }

  return button;
}

/**
 * Create a complete action group with multiple buttons
 * @param buttons - Array of action buttons to render
 * @returns Container element with all action buttons
 */
export function createActionGroup(buttons: ActionButton[]): HTMLDivElement {
  const group = document.createElement("div");
  group.className = ACTION_GROUP_STYLES.container;

  buttons.forEach((buttonConfig) => {
    const button = createActionButton(buttonConfig);
    group.appendChild(button);
  });

  return group;
}
