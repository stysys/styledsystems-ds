/**
 * @stysys/design-system/styles
 * Shared CSS styles for UI components and design tokens
 *
 * Import this file to load all design system styles:
 * import '@stysys/design-system/dist/styles/index.css'
 */

// CSS files are included in the dist/styles directory after build
// Import the main index.css to load all styles:
// import './index.css'

export const STYLES = {
  // Theme and foundation
  THEME: "./dist/styles/_theme.css",
  COLORS: "./dist/styles/_colors.css",
  TYPOGRAPHY: "./dist/styles/_typography.css",

  // Layout and utilities
  LAYOUT: "./dist/styles/_layout.css",
  UTILITIES: "./dist/styles/_utilities.css",
  ANIMATIONS: "./dist/styles/_animations.css",

  // Component styles
  BUTTONS: "./dist/styles/button.css",
  NUMBER_INPUT: "./dist/styles/number-input.css",
  SCALE_RATIO_SELECT: "./dist/styles/scale-ratio-select.css",
  TYPOGRAPHY_STYLES: "./dist/styles/typography-styles.css",
  ACTION_GROUP_UI: "./dist/styles/_action-group-ui.css",
  CARD_UI: "./dist/styles/_card-ui.css",

  // Main bundle
  MAIN: "./dist/styles/index.css",
};
