/**
 * @styled/core/colors - Color system exports
 * Core color utilities (platform-agnostic)
 */

export * from "./colors";
export * from "./color-scale";
export * from "./color-picker-modal-ui";
export * from "./database-colors";

// Platform-specific operations - import separately in plugins that need them
// Figma-specific
// export * from "./figma-color-operations";
// export * from "./figma-create-color-variables";
// export * from "./color-storage"; // Figma clientStorage specific

// Note: Use storage implementation appropriate for your platform:
// - Figma: figma.clientStorage
// - InDesign: localStorage
// - Web: localStorage / sessionStorage
