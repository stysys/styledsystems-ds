# Typography Orchestration Logic Extracted to @styled/core

## Overview

Extracted all typography business logic from styled-typo plugin into reusable core modules. styled-connect and future plugins can now use these orchestration functions without reimplementing them.

## New Core Modules

### 1. `typography-semantic.ts`

**Purpose**: Semantic naming and intelligent mapping of typography scales

**Exports**:

- `TextStyleMapping` - Type for scale-to-semantic mappings
- `TextStyleMappingRow` - Type for mapping rows
- `SEMANTIC_NAMES` - All available semantic names
- `generateSemanticMappings()` - Smart algorithm that assigns semantic names to scale steps
  - Displays for extra-large steps (9xl-6xl)
  - Headings for main large steps (H1-H5)
  - Body/Caption for smaller steps
  - Fixed mappings for base, lg, sm, xs
- `getFontCategoryFromSemantic()` - Determines if semantic name uses heading or body font
- `formatSemanticNameToStyleName()` - Formats semantic names for UI display
- `getStyleFolderFromSemantic()` - Determines folder organization (Headings/ vs Text/)

### 2. `typography-fonts.ts`

**Purpose**: Font family and weight selection management

**Exports**:

- `FontFamily` - Type for font with weights
- `initializeFontFamilyOptions()` - Populates headings font dropdown
- `initializeBodyFontFamilyOptions()` - Populates body font dropdown
- `updateHeadingsFontWeights()` - Updates weight options based on selected family
- `updateBodyFontWeights()` - Updates body weight options
- `getSelectedHeadingsFont()` - Gets currently selected heading font
- `getSelectedBodyFont()` - Gets currently selected body font
- `saveFontSelections()` - Persists font choices to storage
- `loadFontSelections()` - Restores font choices from storage

### 3. `typography-css.ts`

**Purpose**: CSS output generation for typography scales

**Exports**:

- `generateTypographyCSS()` - Generates @theme block with font variables
- `generateSemanticUtilityCSS()` - Generates @utility classes for semantic names
- `generateFullTypographyCSS()` - Combines theme + utilities
- `formatCSSForDisplay()` - Formats CSS for UI display
- `copyCSSToClipboard()` - Copies CSS with clipboard API
- `updateCSSOutputDisplay()` - Updates UI elements with CSS code

### 4. `typography-mappings.ts`

**Purpose**: Storage and orchestration of text style mappings

**Exports**:

- `getSavedTextStyleMappings()` - Retrieves cached mappings
- `setSavedTextStyleMappings()` - Updates cached mappings
- `saveTextStyleMappings()` - Persists mappings to figma.clientStorage
- `loadTextStyleMappings()` - Loads mappings from storage
- `generateDefaultMappings()` - Creates default mappings for scale steps
- `collectMappingsFromUI()` - Gathers current UI mapping state
- `createMappingRows()` - Creates mapping row objects for rendering

## Data Flow Architecture

```
User Input (UI)
    ↓
[Font Selection]
  ├─→ updateHeadingsFontWeights()
  └─→ updateBodyFontWeights()
    ↓
[Scale Configuration]
  ├─→ generateSemanticMappings()
  ├─→ generateDefaultMappings()
  └─→ Display in UI
    ↓
[User Adjusts Mappings]
  └─→ collectMappingsFromUI()
    ↓
[Generate Output]
  ├─→ generateFullTypographyCSS()
  ├─→ copyCSSToClipboard()
  └─→ Create Text Styles (in plugin code.ts)
    ↓
[Save State]
  ├─→ saveFontSelections()
  └─→ saveTextStyleMappings()
```

## Integration with styled-connect

styled-connect UI can now:

1. Import all these functions from `@styled/core`
2. Call them to manage typography without duplicating logic
3. Focus on just UI rendering and event handling
4. Let core handle all business logic

## Integration with styled-typo

styled-typo can optionally be refactored to:

1. Use the core functions instead of local versions
2. Remove redundant code from ui/mappings.ts, ui/font.ts, ui/css-output.ts
3. Keep plugin-specific features in code.ts (text style creation)

## What's NOT in Core (Plugin-Specific)

These remain in each plugin's `code.ts`:

- Figma text style creation (figma.createTextStyle)
- Variable collection management (figma.variables)
- Canvas operations (figma.currentPage)
- Plugin-specific message handling

This separation ensures:

- ✅ Core handles business logic (pure functions)
- ✅ Plugins handle Figma API (plugin-specific)
- ✅ No duplication across plugins
- ✅ Easy testing of core logic
- ✅ Clean architecture
