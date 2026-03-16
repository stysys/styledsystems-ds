# Publishing & Update Workflow

This document describes how to publish updates to the design system and keep consuming projects (plugins) synchronized.

## Architecture

The `@stysys/design-system` package is:

- **Published to**: npm.pkg.github.com (GitHub npm registry)
- **Source**: This repository (styledsystem-ds)
- **Publishing**: Automated via GitHub Actions on version tags
- **Consumers**: InDesign plugins, Figma plugins, and other projects

## Publishing a New Version

### 1. Make your changes

Edit files in the design system (styles, fonts, types):

```bash
cd /Users/kristofferwindolf/Sites/styledsystem-ds
# Make changes to src/styles/, src/fonts/, or src/types/
```

### 2. Bump the version

Update `package.json` with the new semantic version:

```json
{
  "name": "@stysys/design-system",
  "version": "1.0.2" // was 1.0.1
}
```

### 3. Commit and tag

```bash
# Commit the version bump
git add package.json
git commit -m "chore: bump version to 1.0.2"

# Create a git tag
git tag v1.0.2

# Push commits and tags
git push origin main
git push origin v1.0.2
```

### 4. GitHub Actions handles publishing

When you push the tag, GitHub Actions automatically:

1. Builds the package (`npm run build`)
2. Publishes to npm.pkg.github.com (`npm publish`)
3. Creates a release in GitHub

No manual `npm publish` needed!

## Updating Consuming Projects

### For projects using the published package:

```bash
cd /path/to/plugin-project

# Update to latest version
npm update @stysys/design-system

# Or update to specific version
npm install @stysys/design-system@1.0.2

# Rebuild the project
npm run build
```

### Verify the update

```bash
npm list @stysys/design-system
# Should show: @stysys/design-system@1.0.2
```

## Version Strategy

Use semantic versioning:

- **Patch (1.0.→1.0.2)**: Bug fixes, font refinements, minor CSS tweaks
- **Minor (1.0.2→1.1.0)**: New components, new utilities, new design tokens
- **Major (1.0.2→2.0.0)**: Breaking changes, API restructuring, major redesigns

## Setup for Consuming Projects

### Install the published package

In your plugin's `package.json`:

```json
{
  "dependencies": {
    "@stysys/design-system": "^1.0.1"
  }
}
```

Run `npm install` to pull from npm.pkg.github.com.

### Import the theme in CSS

```css
/* In your main CSS file */
@import "../../node_modules/@stysys/design-system/dist/styles/_theme.css";
```

Or import all core styles:

```css
@import "../../node_modules/@stysys/design-system/dist/styles/index.css";
```

### What's included in the package

The published package contains:

- `dist/styles/` - All CSS files (theme, colors, typography, utilities, etc.)
- `dist/fonts/` - Font files (GDGaioVF, GDOctioVF in woff/woff2 formats)
- `dist/types/` - TypeScript type definitions (if applicable)
- `package.json` - Package metadata

## Troubleshooting

### Package not found in npm registry

Check that:

1. The GitHub tag was pushed: `git push origin v1.0.2`
2. GitHub Actions workflow succeeded (check Actions tab on GitHub)
3. Authenticate to npm.pkg.github.com if needed:
   ```bash
   npm login --registry https://npm.pkg.github.com
   ```

### CSS import not resolving

Use relative path from your CSS file to node_modules:

```css
/* From src/styles/main.css → node_modules (2 levels up) */
@import "../../node_modules/@stysys/design-system/dist/styles/_theme.css";
```

### Fonts not loading

Verify the relative paths in your font imports work:

```css
@font-face {
  font-family: "GDGaioVF";
  src: url("../../node_modules/@stysys/design-system/dist/fonts/GDGaioVF.woff2");
}
```

## Related Files

- [GitHub Workflows](.github/workflows/publish.yml) - Automated publishing configuration
- [package.json](package.json) - Build scripts and version
- [README.md](README.md) - Package overview
