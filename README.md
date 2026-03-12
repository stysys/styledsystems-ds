# @stysys/design-system

Shared design system utilities extracted from Styled Systems plugins. Pure JavaScript/TypeScript functions for typography calculations and design system types.

## Installation

```bash
npm install @stysys/design-system
```

## Quick Start

### Typography

```typescript
import {
  calculateFontSize,
  calculateLineHeight,
  generateTypographyScale,
} from "@stysys/design-system";

// Calculate a single font size using modular scale
const size = calculateFontSize(16, 1.25, 2); // 16 * 1.25^2 = 25px

// Calculate responsive line height
const lineHeight = calculateLineHeight(25); // 1.3

// Generate complete typography scale
const scale = generateTypographyScale({
  minViewportWidth: 320,
  maxViewportWidth: 1920,
  minFontSize: 14,
  maxFontSize: 48,
  minTypeScale: 1.125,
  maxTypeScale: 1.333,
});

console.log(scale); // Array of TypographyStyle objects
```

## API Reference

### Typography Functions

- **`calculateFontSize(baseFontSize, typeScale, power)`** - Calculate font size at scale step
  - Uses modular scale: `baseFontSize * (typeScale ^ power)`
  - Returns rounded pixel value

- **`calculateLineHeight(fontSize)`** - Get responsive line height ratio
  - Larger fonts get smaller line height (1.2)
  - Smaller fonts get larger line height (1.6)

- **`generateTypographyScale(config, scaleSteps, fontFamily, fontWeight)`** - Generate full typography scale
  - Returns `TypographyStyle[]` with all scale steps

- **`generateResponsiveCSS(config, scaleSteps, classPrefix)`** - Generate responsive CSS with clamp()
  - Returns CSS string with media queries

- **`createTypographyStyle(name, fontSize, fontFamily, fontWeight, lineHeight)`** - Helper to create single style

- **`validateTypographyStyle(style)`** - Type guard to validate TypographyStyle

- **`parseTypographyVariableName(variableName)`** - Parse typography variable names

## Types

### TypographyStyle

```typescript
interface TypographyStyle {
  name: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  fontFamily: string;
  letterSpacing?: number;
}
```

### TypeScaleConfig

```typescript
interface TypeScaleConfig {
  minViewportWidth: number;
  maxViewportWidth: number;
  minFontSize: number;
  maxFontSize: number;
  minTypeScale: number;
  maxTypeScale: number;
}
```

## Build

```bash
npm run build    # Compile TypeScript
npm run watch    # Watch for changes
```

## License

MIT
