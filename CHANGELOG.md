# Changelog

## [1.1.0] - 2026-03-17

### Added

- **Comprehensive Color System** - Full color management utilities from figma-plugins/core/colors
  - Color scale generation and ramp creation
  - Color space conversions (RGB/HSL)
  - Contrast ratio calculation and WCAG compliance
  - Semantic color scales (primary, secondary, success, warning, error, info)
  - Tailwind palette generation
  - Color picker UI components

- **Typography System** - Complete typography utilities from figma-plugins/core/typography
  - Core typography utilities and semantic scales
  - Type scale configuration
  - CSS generation for typography
  - UI components for type scale preview and controls

- **Brand System** - Brand identity utilities
  - Brand configuration and utilities

- **Shared UI Components** - Common UI components for plugins
  - Tab navigation (`tabs.ts`)
  - Footer components (`footer-component.ts`, `footer-overlays.ts`)
  - Info display component (`info-component.ts`)
  - Plugin info component (`plugin-info.ts`)
  - Action group UI (`action-group-ui.ts`)
  - Overlay handlers (`overlay.ts`)

- **Utilities** - Shared utility functions and helpers
  - Preview helpers and utilities

### Architecture Changes

- Migrated all core modules from `figma-plugins/core/` to `@stysys/design-system`
- TypeScript configured to exclude platform-specific Figma implementations
- Clear separation between platform-agnostic utilities and plugin-specific code
- Platform-specific modules available for selective import in plugins

### Updated

- Package description to reflect comprehensive design system utilities
- Main index exports now include all core modules
- Type definitions for all new modules

### Notes

- Figma-specific implementations (typography-figma-operations, color-storage with figma.clientStorage) excluded from main exports
- These can be imported separately in Figma plugins
- InDesign plugin can use platform-agnostic utilities with localStorage storage

## [1.0.9] - Previous

Initial release with basic typography and type-scale utilities.
