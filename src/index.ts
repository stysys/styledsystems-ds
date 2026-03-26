/**
 * @stysys/design-system
 * Shared design system foundation: styles, fonts, types, and comprehensive core modules
 */

// Core Functionality (includes types)
export * from "./core/activation.js";
export * from "./core/types.js";
export * from "./core/user.js";
export * from "./core/utilities/index.js";

// Tabs & Navigation
export * from "./core/ui/index.js";

// Brand System
export * from "./core/brand/index.js";

// Color System
export * from "./core/colors/index.js";

// Typography System
export * from "./core/typography/index.js";

// Design tokens — semantic type scale + OKLCH color ramps
export * from "./core/tokens/index.js";

// Exporters — ASE (Adobe Swatch Exchange) + IDML (InDesign Markup Language)
export * from "./core/exporters/index.js";

// Namespaced activation for backward compatibility
export * as activation from "./core/activation.js";
