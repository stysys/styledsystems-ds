# styledsystem-ds — @stysys/design-system

The **source of truth** for all Stysys logic. Published as `@stysys/design-system` to GitHub Packages (`npm.pkg.github.com`).

## What this is
Shared library containing both visual design tokens AND business logic used across all Stysys products. Not just a UI kit — it owns activation, subscription checking, and user identity across platforms.

## Ecosystem
```
styledsystem-ds  →  publishes @stysys/design-system (GitHub Packages)
     │
     ├──▶ figma-plugins     (OG plugin, uses local @stysys/core alias — not yet migrated to npm pkg)
     ├──▶ indesign-plugins  (UXP plugin, consumes @stysys/design-system from npm)
     └──▶ styledsystems     (Next.js/Firebase backend at styled.systems)
```

## What's exported (`src/index.ts`)
- **activation.ts** — subscription/access checks, talks to `https://styled.systems` API
- **user.ts** — cross-platform user ID resolution (figma / indesign / web)
- **types.ts** — shared types: `ActivationUserStatus`, `PlatformId`, `PluginAccess`, etc.
- **utilities/** — shared utility functions
- **ui/** — tabs & navigation components
- **brand/** — brand system
- **colors/** — color scale generation, semantic palettes, Figma color operations
- **typography/** — type scale config, tokens, CSS generation, Figma operations

## Dev
```bash
npm run build    # tsc + copy styles/fonts/types to dist/
npm run watch    # tsc --watch
npm run release  # semantic-release → bumps version + publishes
```

## Publishing
- Published to GitHub Packages, NOT npm.org
- Consumers need `.npmrc` with `@stysys:registry=https://npm.pkg.github.com`
- Version is bumped automatically via `semantic-release` on every push to `main` — **do not manually bump `package.json` version**
- Commit message prefix controls the version bump:
  - `fix:` → patch (e.g. 1.5.0 → 1.5.1)
  - `feat:` → minor (e.g. 1.5.0 → 1.6.0)
  - `BREAKING CHANGE:` in footer → major

## After every push to main — update consumers
After CI publishes a new version, run `npm install @stysys/design-system` in each consuming repo:

```bash
# styledsystems
cd /Users/kristofferwindolf/Sites/styledsystems && npm install @stysys/design-system

# indesign-plugins
cd /Users/kristofferwindolf/Sites/indesign-plugins && npm install @stysys/design-system
```

`figma-plugins` uses a local `core/` alias — not on npm, no install needed there.

## Key constraints
- Pure TypeScript, no framework dependencies
- Must work in Figma plugin sandbox, InDesign UXP, and Node/browser contexts
- `PlatformId` (`"figma" | "indesign" | "web"`) is used to branch platform-specific behaviour
- Exports use `.js` extensions in import paths (required for ESM compatibility)
