# Shared UI Module - Color Picker & Design System

This directory contains reusable UI components and utilities for all Figma plugins. Built with modularity and DRY principles in mind.

## 📦 Module Structure

### Core Modules

#### `types.ts`

Shared TypeScript types used across all plugins.

```typescript
import { PluginMessage, UIState, DesignSystem } from "../../shared-ui";
```

#### `utilities.ts`

General-purpose utilities:

- **SVG Operations**: `canonicalizeSVG()`, `getSvgFingerprint()`
- **Typography**: `calculateFontSize()`, `pxToRem()`
- **Notifications**: `sendToPlugin()`, `showNotification()`
- **Validation**: `isValidHexColor()`, `isValidFontSize()`

#### `tabs.ts`

Tab navigation system:

- `initializeTabs()` - Setup tab navigation
- `switchTab()` - Change active tab
- `getActiveTab()` - Get current tab
- `disableTab()` / `enableTab()` - Toggle tab states

#### `brand.ts`

Brand asset management:

- `renderBrandLogos()` - Display logos
- `initializeBrandLogos()` - Setup brand tab
- `attachLogoEventHandlers()` - Logo interaction
- `updateSyncStatus()` - Sync state UI

### Color Management Modules (NEW)

#### `colors.ts`

Main color management interface:

- `renderColorsList()` - Render interactive color list
- `attachColorEventHandlers()` - Attach event listeners
- `initializeColors()` - Initialize colors tab
- Re-exports: `showColorPickerModal`, `generateColorRamp`

#### `colorPickerModal.ts` (NEW)

Interactive color picker powered by iro.js:

- `showColorPickerModal(options)` - Show modal with color wheel
- `createColorSwatchButton()` - Create clickable color swatches
- Features:
  - iro.js color wheel picker
  - Hex value input with validation
  - Color preview
  - Save/Cancel buttons
  - Keyboard shortcuts (Escape to close)

**Usage:**

```typescript
import { showColorPickerModal } from "../../shared-ui";

showColorPickerModal({
  title: "Edit Primary Color",
  initialColor: "#0EA5E9",
  onColorSelected: (color) => {
    // Handle selected color
  },
});
```

#### `colorScale.ts` (NEW)

Color math and scale generation:

- **Interpolation**: `interpolateColor()` - Linear interpolation between colors
- **Ramps**: `generateColorRamp()` - Create light→dark gradient
- **Semantic Scales**: `generateSemanticScales()` - 7 color scales (primary, secondary, success, warning, error, info, accent)
- **Tailwind Palettes**: `generateTailwindPalette()` - 50/100/200/.../950 stops
- **Color Manipulation**:
  - `darkenColor()` - Reduce lightness
  - `lightenColor()` - Increase lightness
  - `getComplementaryColor()` - Opposite hue (180°)
  - `getAnalogousColors()` - Adjacent hues (±30°)
  - `getTriadicColors()` - Triangle harmony (120°)
- **Accessibility**:
  - `getContrastRatio()` - WCAG contrast ratio
  - `hasGoodContrast()` - Check WCAG AA/AAA compliance
  - `getContrastTextColor()` - Auto black/white for text
  - `isLightColor()` - Determine if color is light/dark

**Usage:**

```typescript
import {
  generateColorRamp,
  generateSemanticScales,
  hasGoodContrast,
} from "../../shared-ui";

// Generate ramp
const ramp = generateColorRamp("#0EA5E9", 11);

// Generate all scales
const scales = generateSemanticScales("#0EA5E9");

// Check contrast
const ok = hasGoodContrast("#FFFFFF", "#0EA5E9", 4.5); // WCAG AA
```

## 🎨 Quick Start

### Using Color Picker in Your Plugin

1. **Import the module:**

```typescript
import {
  renderColorsList,
  attachColorEventHandlers,
  showColorPickerModal,
} from "../../shared-ui";
```

2. **Render color list:**

```typescript
const designSystem = { tokens: { colors: { primary: "#0EA5E9" } } };
renderColorsList(designSystem);
```

3. **Show interactive picker:**

```typescript
showColorPickerModal({
  title: "Pick a Color",
  initialColor: "#0EA5E9",
  onColorSelected: (color) => {
    console.log("Selected:", color);
  },
});
```

### Generating Color Scales

```typescript
import { generateSemanticScales } from "../../shared-ui";

const scales = generateSemanticScales(
  "#0EA5E9", // primary
  "#EC4899" // secondary
);

// scales.primary → array of 10 colors light→dark
// scales.secondary → array of 10 colors light→dark
// scales.success, warning, error, info → auto-generated
```

## 🔧 Architecture Benefits

✅ **No Code Duplication** - Single source of truth for all color/UI logic
✅ **Modular Design** - Each concern in separate file
✅ **Easy Integration** - Import from shared-ui/index.ts
✅ **Accessibility First** - WCAG contrast checking built-in
✅ **Interactive UI** - iro.js color wheel for better UX
✅ **Extensible** - Easy to add new color utilities
✅ **Type Safe** - Full TypeScript support
✅ **Consistent** - All plugins use same components

## 📚 Module Dependencies

```
index.ts (exports everything)
│
├── types.ts (no dependencies)
├── utilities.ts (uses types)
├── tabs.ts (uses utilities)
├── brand.ts (uses utilities)
│
├── colorPickerModal.ts (uses utilities)
├── colorScale.ts (no external dependencies)
│
└── colors.ts (uses all above + re-exports colorPicker/Scale)
    ├── imports: utilities, colorPickerModal, colorScale
    └── used by: styled-connect, styled-typo, styled-colors
```

## 🎛️ Plugin Integration

### styled-connect

Uses shared-ui for:

- Brand logo management (brand.ts)
- Color list UI (colors.ts)
- Interactive color picker (colorPickerModal.ts)
- General utilities (utilities.ts, tabs.ts)

### styled-typo

Uses shared-ui for:

- Tab navigation (tabs.ts)
- Typography utilities (utilities.ts)
- Re-exports custom types and functions

### styled-colors

Can use shared-ui for:

- Color picker modal (colorPickerModal.ts)
- Color scale generation (colorScale.ts)
- Accessibility utilities (colorScale.ts)

## 🚀 Future Enhancements

- [ ] Add color blindness simulation
- [ ] Add color naming suggestions (e.g., "Sky Blue")
- [ ] Add color palette presets (Material, Tailwind, etc.)
- [ ] Add color harmonies visualization
- [ ] Add color format conversions (RGB, HSL, HSV, LAB, etc.)
- [ ] Add gradient generator
- [ ] Add theme export formats (CSS, JSON, Figma tokens, etc.)

## 📖 Examples

See `USAGE_EXAMPLES.ts` for detailed examples of:

1. Basic color picker modal
2. Color swatch buttons
3. Generating color ramps
4. Semantic color scales
5. Contrast & accessibility checking
6. Color manipulation (darken, lighten, complementary, etc.)
7. Integration patterns for each plugin

## 🔗 Dependencies

- **iro.js** - Color wheel picker library (CDN: `https://cdn.jsdelivr.net/npm/@jaames/iro/dist/iro.min.js`)
- **TypeScript** - Type safety
- **Figma Plugin API** - Plugin communication

## 📝 License

Same as main project
