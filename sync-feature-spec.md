# Sync Feature Specification for styledsystems-ds

**Target Repo:** `stysys/styledsystems-ds`  
**Purpose:** Enable design systems stored in Firestore to sync to external destinations (GitHub, Google Drive)  
**Architecture:** Client-side sync executed by plugins (InDesign UXP) using shared core functions  
**Date:** 2026-04-03

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  FIRESTORE DB (Single Source of Truth)                  │
│  ┌─────────────────────────────────────────────────┐   │
│  │ designSystems/{id}                              │   │
│  │  - typography, colors, grid                     │   │
│  │  - assets (logos, refs to Storage)              │   │
│  │  - sync config & status                         │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                    ▲                    ▲
                    │                    │
            CRUD operations      CRUD operations
                    │                    │
┌───────────────────┴────┐   ┌───────────┴─────────────────┐
│  InDesign UXP Plugin   │   │  Figma Plugin               │
│  ┌──────────────────┐  │   │  ┌──────────────────┐       │
│  │ FULL EDITING     │  │   │  │ FULL EDITING     │       │
│  │ - Create scales  │  │   │  │ - Create scales  │       │
│  │ - Edit colors    │  │   │  │ - Edit colors    │       │
│  │ - Modify grid    │  │   │  │ - Modify grid    │       │
│  │ - Apply to doc   │  │   │  │ - Apply to file  │       │
│  └──────────────────┘  │   │  └──────────────────┘       │
│  ┌──────────────────┐  │   │  ┌──────────────────┐       │
│  │ SYNC             │  │   │  │ SYNC             │       │
│  │ - GitHub         │  │   │  │ - GitHub         │       │
│  │ - Google Drive   │  │   │  │ - Google Drive   │       │
│  └──────────────────┘  │   │  └──────────────────┘       │
└────────────────────────┘   └──────────────────────────────┘
                    │                    │
                    │ Both import from   │
                    └────────────────────┘
                            styledsystems-ds
                    ┌────────────────────────────────┐
                    │ Shared Core Functions          │
                    │ - Token generators             │
                    │ - Sync clients                 │
                    │ - CRUD operations              │
                    │ - Validation                   │
                    └────────────────────────────────┘
                              │
                    Both plugins can export:
                    ┌─────────────────────────────────┐
                    │ - tokens.json (W3C)             │
                    │ - tailwind.config.js            │
                    │ - variables.css                 │
                    │ - design-system.idml            │
                    │ - figma-tokens.json             │
                    │ - assets/                       │
                    └─────────────────────────────────┘
```

**Key Principle:** Firestore is the source of truth. Both plugins are **equal co-authors** that read and write to the same design system. Users choose their primary tool based on workflow, not capability.
```

---

## Firestore Schema Extensions

### Collection: `designSystems`

Add the following fields to existing design system documents:

```typescript
interface DesignSystem {
  // ... existing fields (typography, colors, grid, etc.) ...
  
  // Organization ownership
  organizationId: string;          // Which org owns this system
  
  // Version control
  currentVersion: string;           // e.g., "2.5.0"
  versionHistory: {
    [versionNumber: string]: {
      publishedAt: string;          // ISO 8601
      publishedBy: string;          // userId of admin who published
      createdBy?: string;           // userId of contributor who created (if different)
    }
  };
  
  // NEW: Asset references
  assets?: {
    logos?: Array<{
      id: string;                    // e.g., 'logo_primary'
      name: string;                  // e.g., 'Primary Logo'
      formats: string[];             // e.g., ['svg', 'png', 'png@2x']
      firebaseStoragePath: string;   // e.g., 'design-systems/acme/logos/primary.svg'
    }>;
    brandColors?: {
      swatchImagePath?: string;      // Optional PNG of color palette
    };
  };
  
  // NEW: Sync configuration
  sync?: {
    enabled: boolean;
    
    // Auto-sync on version publish (default: true)
    autoSyncOnPublish: boolean;      // NEW: trigger sync when version approved
    
    // Quota tracking (prevent abuse on free tier)
    quota?: {
      maxSyncsPerDay: number;        // Default: 10 for free tier
      maxSyncsPerMonth: number;      // Default: 100 for free tier
      currentMonth: {
        count: number;
        resetAt: string;             // ISO 8601 date
      };
    };
    
    // Auto-sync settings
    autoSync?: {
      enabled: boolean;
      debounceMs: number;            // Wait time after last change (default: 300000 = 5 min)
      maxPerHour: number;            // Rate limit (default: 2)
    };
    
    // Configured destinations
    destinations: Array<{
      type: 'github' | 'google-drive';
      enabled: boolean;
      
      // GitHub-specific config
      config: {
        // GitHub
        repo?: string;               // e.g., 'acme-corp/design-tokens'
        branch?: string;             // e.g., 'main'
        path?: string;               // e.g., 'design-system/'
        
        // Google Drive
        folderId?: string;           // Created on first sync
        folderName?: string;         // e.g., 'ACME Design Tokens'
        
        // What to include
        include: {
          tokens: boolean;           // tokens.json
          tailwind: boolean;         // tailwind.config.js
          css: boolean;              // variables.css
          idml: boolean;             // design-system.idml
          figma: boolean;            // figma-tokens.json + figma-variables.json
          assets: boolean;           // logos, images
          documentation: boolean;    // README.md
        };
        
        // Format options
        formats: {
          tokens: 'w3c' | 'style-dictionary';
          css: 'custom-props' | 'scss-vars';
          tailwind: 'preset' | 'full-config';
        };
      };
      
      // Sync state tracking
      lastSync?: string;             // ISO 8601 timestamp
      lastSyncHash?: string;         // Hash of last synced content (for differential sync)
      status?: 'success' | 'error' | 'pending';
      errorMessage?: string;
      
      // File-level tracking (for differential sync)
      lastSyncedFiles?: {
        [filename: string]: string;  // filename -> content hash
      };
      
      // GitHub-specific tracking
      lastCommitSha?: string;
      commitUrl?: string;
      
      // Google Drive-specific tracking
      filesCount?: number;
    }>;
  };
}
```

### Collection: `users`

```typescript
interface User {
  userId: string;
  email: string;
  name: string;
  
  // Organization memberships and roles
  organizations: {
    [organizationId: string]: {
      role: 'viewer' | 'contributor' | 'admin';
      addedBy: string;              // userId of admin who added them
      addedAt: string;              // ISO 8601
    }
  };
}
```

### Subcollection: `designSystems/{id}/versions`

```typescript
interface Version {
  versionId: string;                // e.g., "v2.5.0-draft-abc123"
  versionNumber: string;            // e.g., "2.5.0"
  baseVersion: string;              // e.g., "2.4.1" (what it branched from)
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'published';
  
  // Creator info
  createdBy: {
    userId: string;
    userName: string;
    email: string;
    role: 'contributor' | 'admin';
  };
  createdAt: string;                // ISO 8601
  
  // Changes (delta from baseVersion)
  changes: {
    typography?: {
      scales?: {
        [scaleName: string]: {
          size: number;
          leading: number;
          _changeType?: 'added' | 'modified' | 'deleted';
          _previousValue?: any;     // For modified items
        }
      };
      families?: { /* ... */ };
    };
    colors?: {
      [colorName: string]: {
        value: string;
        _changeType?: 'added' | 'modified' | 'deleted';
        _previousValue?: string;
      }
    };
    grid?: { /* ... */ };
  };
  
  // Commit metadata
  commitMessage: string;
  commitDescription?: string;
  
  // Workflow tracking
  submittedAt?: string;             // When submitted for approval
  
  approvedBy?: {
    userId: string;
    userName: string;
    email: string;
  };
  approvedAt?: string;
  approvalNotes?: string;
  
  rejectedBy?: {
    userId: string;
    userName: string;
    email: string;
  };
  rejectedAt?: string;
  rejectionReason?: string;
  
  publishedAt?: string;             // When changes went live
}
```

### Collection: `syncJobs`

```typescript
interface SyncJob {
  jobId: string;                    // Unique job identifier
  designSystemId: string;           // Which system is being synced
  status: 'queued' | 'running' | 'completed' | 'failed' | 'partial';
  
  // Timing
  createdAt: string;                // ISO 8601
  startedAt?: string;
  completedAt?: string;
  
  // What triggered this sync
  metadata: {
    triggeredBy: 'version_approval' | 'manual' | 'scheduled';
    versionNumber?: string;         // If triggered by version approval
    approvedBy?: string;            // Admin who approved
    manuallyTriggeredBy?: string;   // Admin who clicked "Sync Now"
  };
  
  // Sync package reference
  package: SyncPackage;             // The generated sync package
  
  // Results per destination
  results?: Array<{
    destination: 'github' | 'google-drive';
    success: boolean;
    commitSha?: string;             // GitHub
    commitUrl?: string;             // GitHub
    folderId?: string;              // Google Drive
    folderUrl?: string;             // Google Drive
    filesCount?: number;
    bytesSynced?: number;
    error?: string;                 // If failed
  }>;
}
```

---

## styledsystems-ds Package Structure

Add the following directory structure to the repo:

```
styledsystems-ds/
├── src/
│   ├── sync/
│   │   ├── index.js                 # Public API exports
│   │   ├── package-builder.js       # Main orchestrator
│   │   ├── generators/
│   │   │   ├── tokens.js            # W3C Design Token Format
│   │   │   ├── tailwind.js          # Tailwind config generation
│   │   │   ├── css.js               # CSS custom properties
│   │   │   ├── idml.js              # IDML template generation
│   │   │   ├── figma.js             # Figma tokens.json format
│   │   │   └── readme.js            # Documentation generation
│   │   ├── clients/
│   │   │   ├── github.js            # GitHub API wrapper
│   │   │   └── drive.js             # Google Drive API wrapper
│   │   └── utils/
│   │       ├── hash.js              # Content hashing for differential sync
│   │       ├── quota.js             # Quota checking and enforcement
│   │       └── validators.js        # Config validation
│   ├── versions/
│   │   ├── index.js                 # Version management API
│   │   ├── draft.js                 # Draft creation and editing
│   │   ├── approval.js              # Approval/rejection workflow
│   │   ├── permissions.js           # Permission checking
│   │   └── utils.js                 # Version numbering, change tracking
│   ├── storage/
│   │   ├── figma-client.js          # Figma clientStorage utilities (inherited patterns)
│   │   └── storage-keys.js          # Shared namespace constants
│   └── [existing files...]
├── package.json
└── README.md
```

---

## Package API Specification

### Public API (`src/sync/index.js`)

```javascript
/**
 * Build a complete sync package for a design system
 * @param {Object} designSystem - Design system document from Firestore
 * @param {Object} options - Optional overrides for include/format settings
 * @returns {Promise<SyncPackage>}
 */
export async function buildSyncPackage(designSystem, options = {});

/**
 * Build only changed files (differential sync)
 * @param {Object} designSystem - Current design system state
 * @param {Object} lastSyncState - Previous sync state from Firestore
 * @returns {Promise<SyncPackage>}
 */
export async function buildDifferentialPackage(designSystem, lastSyncState);

/**
 * Upload package to GitHub
 * @param {SyncPackage} package - Package to upload
 * @param {Object} config - GitHub config with token
 * @returns {Promise<SyncResult>}
 */
export async function uploadToGitHub(package, config);

/**
 * Upload package to Google Drive
 * @param {SyncPackage} package - Package to upload
 * @param {Object} config - Google Drive config with token
 * @returns {Promise<SyncResult>}
 */
export async function uploadToGoogleDrive(package, config);

/**
 * Check if user has quota remaining for sync
 * @param {Object} designSystem - Design system with sync.quota
 * @returns {Promise<QuotaStatus>}
 */
export async function checkSyncQuota(designSystem);

/**
 * Record a sync operation (updates quota counter)
 * @param {string} designSystemId - Firestore document ID
 * @returns {Promise<void>}
 */
export async function recordSyncOperation(designSystemId);
```

### Type Definitions

```typescript
interface SyncPackage {
  files: Array<{
    path: string;              // e.g., 'tokens.json', 'assets/logo.svg'
    content: string | Buffer;  // File content (text or binary)
    type: 'json' | 'javascript' | 'css' | 'markdown' | 'binary';
    hash?: string;             // Content hash for differential sync
  }>;
  metadata: {
    name: string;              // Design system name
    version: string;           // Generated version (e.g., '2026.04.03.1')
    syncedAt: string;          // ISO 8601 timestamp
  };
}

interface SyncResult {
  success: boolean;
  destination: 'github' | 'google-drive';
  
  // GitHub-specific
  commitSha?: string;
  commitUrl?: string;
  
  // Google Drive-specific
  folderId?: string;
  folderUrl?: string;
  
  // Common
  filesCount: number;
  bytesSynced: number;
  error?: string;
}

interface QuotaStatus {
  allowed: boolean;
  remaining: number;
  resetAt: string;           // ISO 8601 timestamp
  message?: string;          // User-friendly message if quota exceeded
}
```

---

## Core Function Implementations

### 1. Package Builder (`src/sync/package-builder.js`)

```javascript
import { generateW3CTokens } from './generators/tokens.js';
import { generateTailwindConfig } from './generators/tailwind.js';
import { generateCSSVariables } from './generators/css.js';
import { generateIDML } from './generators/idml.js';
import { generateReadme } from './generators/readme.js';
import { hashContent } from './utils/hash.js';

/**
 * Builds a complete sync package from a design system
 */
export async function buildSyncPackage(designSystem, options = {}) {
  const defaultOptions = {
    include: {
      tokens: true,
      tailwind: true,
      css: true,
      idml: true,
      figma: true,
      assets: true,
      documentation: true,
    },
    formats: {
      tokens: 'w3c',
      css: 'custom-props',
      tailwind: 'preset',
    },
    ...options,
  };
  
  const files = [];
  
  // 1. Generate tokens.json
  if (defaultOptions.include.tokens) {
    const tokens = await generateW3CTokens(designSystem);
    const content = JSON.stringify(tokens, null, 2);
    files.push({
      path: 'tokens.json',
      content,
      type: 'json',
      hash: hashContent(content),
    });
  }
  
  // 2. Generate tailwind.config.js
  if (defaultOptions.include.tailwind) {
    const tailwindConfig = await generateTailwindConfig(
      designSystem,
      defaultOptions.formats.tailwind
    );
    files.push({
      path: 'tailwind.config.js',
      content: tailwindConfig,
      type: 'javascript',
      hash: hashContent(tailwindConfig),
    });
  }
  
  // 3. Generate variables.css
  if (defaultOptions.include.css) {
    const cssVars = await generateCSSVariables(
      designSystem,
      defaultOptions.formats.css
    );
    files.push({
      path: 'variables.css',
      content: cssVars,
      type: 'css',
      hash: hashContent(cssVars),
    });
  }
  
  // 4. Generate IDML template
  if (defaultOptions.include.idml) {
    const idmlBuffer = await generateIDML(designSystem);
    files.push({
      path: 'design-system.idml',
      content: idmlBuffer,
      type: 'binary',
      hash: hashContent(idmlBuffer),
    });
  }
  
  // 4b. Generate Figma tokens
  if (defaultOptions.include.figma) {
    const { generateFigmaTokens, generateFigmaVariables } = await import('./generators/figma.js');
    
    // Figma Tokens plugin format
    const figmaTokens = await generateFigmaTokens(designSystem);
    const figmaTokensContent = JSON.stringify(figmaTokens, null, 2);
    files.push({
      path: 'figma-tokens.json',
      content: figmaTokensContent,
      type: 'json',
      hash: hashContent(figmaTokensContent),
    });
    
    // Figma native variables format
    const figmaVariables = await generateFigmaVariables(designSystem);
    const figmaVariablesContent = JSON.stringify(figmaVariables, null, 2);
    files.push({
      path: 'figma-variables.json',
      content: figmaVariablesContent,
      type: 'json',
      hash: hashContent(figmaVariablesContent),
    });
  }
  
  // 5. Include assets (logos, etc.)
  if (defaultOptions.include.assets && designSystem.assets?.logos) {
    for (const logo of designSystem.assets.logos) {
      for (const format of logo.formats) {
        // NOTE: Asset fetching will be handled by the plugin
        // We just generate the file structure here
        files.push({
          path: `assets/${logo.id}.${format}`,
          content: null, // Plugin will fetch from Firebase Storage
          type: 'binary',
          storageRef: logo.firebaseStoragePath.replace(/\.\w+$/, `.${format}`),
        });
      }
    }
  }
  
  // 6. Generate README.md
  if (defaultOptions.include.documentation) {
    const readme = await generateReadme(designSystem);
    files.push({
      path: 'README.md',
      content: readme,
      type: 'markdown',
      hash: hashContent(readme),
    });
  }
  
  return {
    files,
    metadata: {
      name: designSystem.name,
      version: generateVersion(),
      syncedAt: new Date().toISOString(),
    },
  };
}

/**
 * Generates version string: YYYY.MM.DD.N
 */
function generateVersion() {
  const now = new Date();
  const date = now.toISOString().split('T')[0].replace(/-/g, '.');
  const counter = Math.floor(now.getTime() / 1000) % 1000; // Simple incrementer
  return `${date}.${counter}`;
}
```

### 2. Token Generator (`src/sync/generators/tokens.js`)

```javascript
/**
 * Generates W3C Design Token Format JSON
 * Spec: https://design-tokens.github.io/community-group/format/
 */
export async function generateW3CTokens(designSystem) {
  const tokens = {};
  
  // Typography tokens
  if (designSystem.typography) {
    tokens.typography = {
      fontFamily: {},
      fontSize: {},
      lineHeight: {},
    };
    
    // Font families
    if (designSystem.typography.families) {
      Object.entries(designSystem.typography.families).forEach(([name, fonts]) => {
        tokens.typography.fontFamily[name] = {
          $value: fonts,
          $type: 'fontFamily',
        };
      });
    }
    
    // Type scales
    if (designSystem.typography.scales) {
      Object.entries(designSystem.typography.scales).forEach(([name, scale]) => {
        tokens.typography.fontSize[name] = {
          $value: `${scale.size}px`,
          $type: 'dimension',
        };
        tokens.typography.lineHeight[name] = {
          $value: `${scale.leading}px`,
          $type: 'dimension',
        };
      });
    }
  }
  
  // Color tokens
  if (designSystem.colors) {
    tokens.color = {};
    Object.entries(designSystem.colors).forEach(([name, value]) => {
      tokens.color[name] = {
        $value: value,
        $type: 'color',
      };
    });
  }
  
  // Spacing tokens (from grid system)
  if (designSystem.grid) {
    tokens.spacing = {};
    
    if (designSystem.grid.baselineIncrement) {
      tokens.spacing.baseline = {
        $value: `${designSystem.grid.baselineIncrement}px`,
        $type: 'dimension',
      };
    }
    
    if (designSystem.grid.margins) {
      tokens.spacing.margin = {
        $value: `${designSystem.grid.margins}px`,
        $type: 'dimension',
      };
    }
  }
  
  return tokens;
}
```

### 3. Tailwind Generator (`src/sync/generators/tailwind.js`)

```javascript
/**
 * Generates Tailwind CSS configuration
 */
export async function generateTailwindConfig(designSystem, mode = 'preset') {
  const { typography, colors, grid } = designSystem;
  
  let config = {
    theme: {
      extend: {},
    },
  };
  
  // Font families
  if (typography?.families) {
    config.theme.extend.fontFamily = {};
    Object.entries(typography.families).forEach(([name, fonts]) => {
      config.theme.extend.fontFamily[name] = fonts;
    });
  }
  
  // Font sizes with line heights
  if (typography?.scales) {
    config.theme.extend.fontSize = {};
    Object.entries(typography.scales).forEach(([name, scale]) => {
      config.theme.extend.fontSize[name] = [
        `${scale.size}px`,
        { lineHeight: `${scale.leading}px` },
      ];
    });
  }
  
  // Colors
  if (colors) {
    config.theme.extend.colors = {};
    Object.entries(colors).forEach(([name, value]) => {
      config.theme.extend.colors[name] = value;
    });
  }
  
  // Spacing (from baseline grid)
  if (grid?.baselineIncrement) {
    config.theme.extend.spacing = {
      baseline: `${grid.baselineIncrement}px`,
    };
  }
  
  // Generate JavaScript module
  const configString = JSON.stringify(config, null, 2);
  
  return `/** @type {import('tailwindcss').Config} */
module.exports = ${configString}
`;
}
```

### 4. CSS Variables Generator (`src/sync/generators/css.js`)

```javascript
/**
 * Generates CSS custom properties
 */
export async function generateCSSVariables(designSystem, mode = 'custom-props') {
  const { typography, colors, grid } = designSystem;
  
  let css = ':root {\n';
  
  // Typography
  css += '  /* Typography */\n';
  
  if (typography?.families) {
    Object.entries(typography.families).forEach(([name, fonts]) => {
      css += `  --font-${name}: ${fonts.join(', ')};\n`;
    });
  }
  
  if (typography?.scales) {
    Object.entries(typography.scales).forEach(([name, scale]) => {
      css += `  --text-${name}-size: ${scale.size}px;\n`;
      css += `  --text-${name}-leading: ${scale.leading}px;\n`;
    });
  }
  
  // Colors
  if (colors) {
    css += '\n  /* Colors */\n';
    Object.entries(colors).forEach(([name, value]) => {
      css += `  --color-${name}: ${value};\n`;
    });
  }
  
  // Spacing
  if (grid?.baselineIncrement) {
    css += '\n  /* Spacing */\n';
    css += `  --spacing-baseline: ${grid.baselineIncrement}px;\n`;
  }
  
  css += '}\n';
  
  return css;
}
```

### 5. README Generator (`src/sync/generators/readme.js`)

```javascript
/**
 * Generates documentation README.md
 */
export async function generateReadme(designSystem) {
  const { name, typography, colors, grid } = designSystem;
  
  let readme = `# ${name}\n\n`;
  readme += `Generated by Styled Systems on ${new Date().toLocaleDateString()}\n\n`;
  
  // Installation
  readme += '## Installation\n\n';
  readme += '### Using Tailwind CSS\n\n';
  readme += '```bash\n';
  readme += 'npm install -D tailwindcss\n';
  readme += '```\n\n';
  readme += 'Then import the config:\n\n';
  readme += '```javascript\n';
  readme += '// tailwind.config.js\n';
  readme += 'module.exports = {\n';
  readme += '  presets: [\n';
  readme += "    require('./tailwind.config.js')\n";
  readme += '  ],\n';
  readme += '}\n';
  readme += '```\n\n';
  
  readme += '### Using CSS Variables\n\n';
  readme += '```css\n';
  readme += "@import './variables.css';\n\n";
  readme += 'body {\n';
  readme += '  font-family: var(--font-body);\n';
  readme += '  font-size: var(--text-base-size);\n';
  readme += '  line-height: var(--text-base-leading);\n';
  readme += '}\n';
  readme += '```\n\n';
  
  readme += '### Using in InDesign\n\n';
  readme += 'Open `design-system.idml` in Adobe InDesign to access all paragraph styles, ';
  readme += 'character styles, and color swatches.\n\n';
  
  // Files
  readme += '## Files\n\n';
  readme += '- `tokens.json` - W3C Design Token Format (for design tools)\n';
  readme += '- `tailwind.config.js` - Tailwind CSS preset\n';
  readme += '- `variables.css` - CSS custom properties\n';
  readme += '- `design-system.idml` - InDesign template\n';
  readme += '- `assets/` - Logos and brand assets\n\n';
  
  // Typography scale
  if (typography?.scales) {
    readme += '## Typography Scale\n\n';
    Object.entries(typography.scales).forEach(([name, scale]) => {
      readme += `- **${name}**: ${scale.size}px / ${scale.leading}px\n`;
    });
    readme += '\n';
  }
  
  // Colors
  if (colors) {
    readme += '## Colors\n\n';
    Object.entries(colors).forEach(([name, value]) => {
      readme += `- **${name}**: ${value}\n`;
    });
    readme += '\n';
  }
  
  readme += '---\n\n';
  readme += '*Synced from Styled Systems - sanningen finns på ett ställe*\n';
  
  return readme;
}
```

### 6. IDML Generator (`src/sync/generators/idml.js`)

```javascript
/**
 * Generates IDML template file
 * This will reuse your existing IDML generation logic
 */
export async function generateIDML(designSystem) {
  // Import your existing IDML generation functions
  const { createIDMLFromDesignSystem } = await import('../../idml/index.js');
  
  // Generate IDML buffer
  const idmlBuffer = await createIDMLFromDesignSystem(designSystem);
  
  return idmlBuffer;
}
```

### 6b. Figma Tokens Generator (`src/sync/generators/figma.js`)

```javascript
/**
 * Generates Figma-compatible tokens.json
 * Figma Tokens plugin format: https://docs.tokens.studio/
 */
export async function generateFigmaTokens(designSystem) {
  const { typography, colors, grid } = designSystem;
  
  const figmaTokens = {
    global: {},
  };
  
  // Typography tokens
  if (typography) {
    // Font families
    if (typography.families) {
      figmaTokens.global.fontFamilies = {};
      Object.entries(typography.families).forEach(([name, fonts]) => {
        figmaTokens.global.fontFamilies[name] = {
          value: fonts[0], // Figma uses single font, not fallback stack
          type: 'fontFamilies',
        };
      });
    }
    
    // Font sizes
    if (typography.scales) {
      figmaTokens.global.fontSize = {};
      Object.entries(typography.scales).forEach(([name, scale]) => {
        figmaTokens.global.fontSize[name] = {
          value: scale.size,
          type: 'fontSizes',
        };
      });
      
      // Line heights
      figmaTokens.global.lineHeights = {};
      Object.entries(typography.scales).forEach(([name, scale]) => {
        figmaTokens.global.lineHeights[name] = {
          value: scale.leading,
          type: 'lineHeights',
        };
      });
      
      // Typography compositions (combined styles)
      figmaTokens.global.typography = {};
      Object.entries(typography.scales).forEach(([name, scale]) => {
        figmaTokens.global.typography[name] = {
          value: {
            fontFamily: `{fontFamilies.${typography.families ? Object.keys(typography.families)[0] : 'body'}}`,
            fontSize: `{fontSize.${name}}`,
            lineHeight: `{lineHeights.${name}}`,
          },
          type: 'typography',
        };
      });
    }
  }
  
  // Colors
  if (colors) {
    figmaTokens.global.colors = {};
    Object.entries(colors).forEach(([name, value]) => {
      figmaTokens.global.colors[name] = {
        value,
        type: 'color',
      };
    });
  }
  
  // Spacing (from grid)
  if (grid) {
    figmaTokens.global.spacing = {};
    
    if (grid.baselineIncrement) {
      figmaTokens.global.spacing.baseline = {
        value: grid.baselineIncrement,
        type: 'spacing',
      };
    }
    
    if (grid.margins) {
      figmaTokens.global.spacing.margin = {
        value: grid.margins,
        type: 'spacing',
      };
    }
  }
  
  return figmaTokens;
}

/**
 * Generate Figma Variables JSON (native Figma variables format)
 * This is the newer format that Figma supports natively
 */
export async function generateFigmaVariables(designSystem) {
  const { typography, colors, grid } = designSystem;
  
  const variables = {
    collections: [
      {
        id: 'design-system',
        name: designSystem.name || 'Design System',
        modes: [
          {
            modeId: 'default',
            name: 'Default',
          },
        ],
        variableIds: [],
      },
    ],
    variables: [],
  };
  
  let variableIndex = 0;
  
  // Colors as variables
  if (colors) {
    Object.entries(colors).forEach(([name, value]) => {
      const varId = `color-${variableIndex++}`;
      variables.collections[0].variableIds.push(varId);
      
      // Parse color to RGBA
      const rgba = parseColor(value);
      
      variables.variables.push({
        id: varId,
        name: `color/${name}`,
        resolvedType: 'COLOR',
        valuesByMode: {
          default: {
            r: rgba.r / 255,
            g: rgba.g / 255,
            b: rgba.b / 255,
            a: rgba.a,
          },
        },
        scopes: ['ALL_SCOPES'],
      });
    });
  }
  
  // Typography sizes as number variables
  if (typography?.scales) {
    Object.entries(typography.scales).forEach(([name, scale]) => {
      // Font size
      const sizeVarId = `fontSize-${variableIndex++}`;
      variables.collections[0].variableIds.push(sizeVarId);
      variables.variables.push({
        id: sizeVarId,
        name: `typography/${name}/size`,
        resolvedType: 'FLOAT',
        valuesByMode: {
          default: scale.size,
        },
        scopes: ['FONT_SIZE'],
      });
      
      // Line height
      const lineHeightVarId = `lineHeight-${variableIndex++}`;
      variables.collections[0].variableIds.push(lineHeightVarId);
      variables.variables.push({
        id: lineHeightVarId,
        name: `typography/${name}/lineHeight`,
        resolvedType: 'FLOAT',
        valuesByMode: {
          default: scale.leading,
        },
        scopes: ['LINE_HEIGHT'],
      });
    });
  }
  
  return variables;
}

/**
 * Parse color string to RGBA
 */
function parseColor(colorString) {
  // Simple hex parser (extend for rgb, rgba, hsl, etc.)
  if (colorString.startsWith('#')) {
    const hex = colorString.substring(1);
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const a = hex.length === 8 ? parseInt(hex.substring(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
  }
  
  // Default to black
  return { r: 0, g: 0, b: 0, a: 1 };
}
```

### 7. GitHub Client (`src/sync/clients/github.js`)

```javascript
import { Octokit } from '@octokit/rest';

/**
 * Upload sync package to GitHub repository
 */
export async function uploadToGitHub(package, config) {
  const { token, repo, branch = 'main', path = '' } = config;
  
  if (!token || !repo) {
    throw new Error('GitHub token and repo are required');
  }
  
  const octokit = new Octokit({ auth: token });
  const [owner, repoName] = repo.split('/');
  
  try {
    // Get current commit SHA
    const { data: ref } = await octokit.git.getRef({
      owner,
      repo: repoName,
      ref: `heads/${branch}`,
    });
    const commitSha = ref.object.sha;
    
    // Get current tree
    const { data: commit } = await octokit.git.getCommit({
      owner,
      repo: repoName,
      commit_sha: commitSha,
    });
    const treeSha = commit.tree.sha;
    
    // Create blobs for all files
    const blobs = await Promise.all(
      package.files
        .filter(file => file.content !== null) // Skip asset placeholders
        .map(async (file) => {
          const content = file.type === 'binary'
            ? file.content.toString('base64')
            : file.content;
          
          const { data } = await octokit.git.createBlob({
            owner,
            repo: repoName,
            content,
            encoding: file.type === 'binary' ? 'base64' : 'utf-8',
          });
          
          return {
            path: `${path}${file.path}`,
            mode: '100644',
            type: 'blob',
            sha: data.sha,
          };
        })
    );
    
    // Create tree
    const { data: tree } = await octokit.git.createTree({
      owner,
      repo: repoName,
      base_tree: treeSha,
      tree: blobs,
    });
    
    // Create commit
    const commitMessage = `Sync design system from Styled Systems\n\n${package.metadata.syncedAt}`;
    const { data: newCommit } = await octokit.git.createCommit({
      owner,
      repo: repoName,
      message: commitMessage,
      tree: tree.sha,
      parents: [commitSha],
    });
    
    // Update reference
    await octokit.git.updateRef({
      owner,
      repo: repoName,
      ref: `heads/${branch}`,
      sha: newCommit.sha,
    });
    
    return {
      success: true,
      destination: 'github',
      commitSha: newCommit.sha,
      commitUrl: `https://github.com/${owner}/${repoName}/commit/${newCommit.sha}`,
      filesCount: blobs.length,
      bytesSynced: blobs.reduce((sum, blob) => sum + blob.content?.length || 0, 0),
    };
    
  } catch (error) {
    return {
      success: false,
      destination: 'github',
      error: error.message,
      filesCount: 0,
      bytesSynced: 0,
    };
  }
}
```

### 8. Google Drive Client (`src/sync/clients/drive.js`)

```javascript
import { google } from 'googleapis';

/**
 * Upload sync package to Google Drive
 */
export async function uploadToGoogleDrive(package, config) {
  const { token, folderId, folderName = 'Design System' } = config;
  
  if (!token) {
    throw new Error('Google Drive token is required');
  }
  
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: token });
  const drive = google.drive({ version: 'v3', auth });
  
  try {
    // Find or create folder
    let targetFolderId = folderId;
    
    if (!targetFolderId) {
      const folderMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      };
      
      const folder = await drive.files.create({
        resource: folderMetadata,
        fields: 'id',
      });
      
      targetFolderId = folder.data.id;
    }
    
    // Upload all files
    let totalBytes = 0;
    
    for (const file of package.files) {
      if (file.content === null) continue; // Skip asset placeholders
      
      const fileMetadata = {
        name: file.path.split('/').pop(),
        parents: [targetFolderId],
      };
      
      const media = {
        mimeType: getMimeType(file.type),
        body: file.type === 'binary'
          ? Buffer.from(file.content)
          : file.content,
      };
      
      await drive.files.create({
        resource: fileMetadata,
        media,
        fields: 'id, name',
      });
      
      totalBytes += file.content.length;
    }
    
    return {
      success: true,
      destination: 'google-drive',
      folderId: targetFolderId,
      folderUrl: `https://drive.google.com/drive/folders/${targetFolderId}`,
      filesCount: package.files.filter(f => f.content !== null).length,
      bytesSynced: totalBytes,
    };
    
  } catch (error) {
    return {
      success: false,
      destination: 'google-drive',
      error: error.message,
      filesCount: 0,
      bytesSynced: 0,
    };
  }
}

function getMimeType(type) {
  const mimeTypes = {
    json: 'application/json',
    javascript: 'text/javascript',
    css: 'text/css',
    markdown: 'text/markdown',
    binary: 'application/octet-stream',
  };
  return mimeTypes[type] || 'text/plain';
}
```

### 9. Quota Management (`src/sync/utils/quota.js`)

```javascript
/**
 * Check if user has remaining sync quota
 */
export async function checkSyncQuota(designSystem) {
  const quota = designSystem.sync?.quota;
  
  if (!quota) {
    // No quota configured, allow sync
    return {
      allowed: true,
      remaining: Infinity,
      resetAt: null,
    };
  }
  
  const now = new Date();
  const resetDate = new Date(quota.currentMonth.resetAt);
  
  // Check if we need to reset the counter
  if (now >= resetDate) {
    return {
      allowed: true,
      remaining: quota.maxSyncsPerMonth,
      resetAt: getNextMonthReset().toISOString(),
      needsReset: true, // Signal to caller to reset counter
    };
  }
  
  // Check if quota exceeded
  if (quota.currentMonth.count >= quota.maxSyncsPerMonth) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: resetDate.toISOString(),
      message: `Sync quota exceeded. Resets on ${resetDate.toLocaleDateString()}`,
    };
  }
  
  return {
    allowed: true,
    remaining: quota.maxSyncsPerMonth - quota.currentMonth.count,
    resetAt: resetDate.toISOString(),
  };
}

/**
 * Get the first day of next month
 */
function getNextMonthReset() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return next;
}
```

### 10. Content Hashing (`src/sync/utils/hash.js`)

```javascript
import crypto from 'crypto';

/**
 * Generate SHA-256 hash of content (for differential sync)
 */
export function hashContent(content) {
  const hash = crypto.createHash('sha256');
  hash.update(typeof content === 'string' ? content : content.toString());
  return hash.digest('hex');
}

/**
 * Compare two sync states to find changed files
 */
export function getChangedFiles(currentPackage, lastSyncedFiles = {}) {
  return currentPackage.files.filter(file => {
    const lastHash = lastSyncedFiles[file.path];
    return !lastHash || lastHash !== file.hash;
  });
}
```

### 11. Figma Client Storage Utilities (`src/storage/figma-client.js`)

```javascript
/**
 * Figma clientStorage utilities
 * Pattern inherited from Styled Typo and Styled Colors
 */

import { STORAGE_KEYS } from './storage-keys.js';

/**
 * Save typography scales
 * Pattern: Same as what Styled Typo does, but to mother namespace
 */
export async function saveTypographyScales(scales, figmaClientStorage) {
  await figmaClientStorage.setAsync(STORAGE_KEYS.MOTHER.TYPOGRAPHY_SCALES, scales);
}

/**
 * Load typography scales
 * Pattern: Same as what Styled Typo does
 */
export async function loadTypographyScales(figmaClientStorage) {
  return await figmaClientStorage.getAsync(STORAGE_KEYS.MOTHER.TYPOGRAPHY_SCALES) || {};
}

/**
 * Save color palette
 * Pattern: Same as what Styled Colors does, but to mother namespace
 */
export async function saveColorPalette(colors, figmaClientStorage) {
  await figmaClientStorage.setAsync(STORAGE_KEYS.MOTHER.COLORS, colors);
}

/**
 * Load color palette
 * Pattern: Same as what Styled Colors does
 */
export async function loadColorPalette(figmaClientStorage) {
  return await figmaClientStorage.getAsync(STORAGE_KEYS.MOTHER.COLORS) || {};
}

/**
 * Save grid settings (new feature, no equivalent in single plugins)
 */
export async function saveGridSettings(grid, figmaClientStorage) {
  await figmaClientStorage.setAsync(STORAGE_KEYS.MOTHER.GRID, grid);
}

/**
 * Load grid settings
 */
export async function loadGridSettings(figmaClientStorage) {
  return await figmaClientStorage.getAsync(STORAGE_KEYS.MOTHER.GRID) || {};
}

/**
 * Save entire design system to clientStorage (for offline capability)
 * Useful pattern: Cache Firestore data locally
 */
export async function syncDesignSystemToClientStorage(designSystem, figmaClientStorage) {
  const promises = [];
  
  if (designSystem.typography?.scales) {
    promises.push(saveTypographyScales(designSystem.typography.scales, figmaClientStorage));
  }
  
  if (designSystem.typography?.families) {
    promises.push(
      figmaClientStorage.setAsync(STORAGE_KEYS.MOTHER.TYPOGRAPHY_FAMILIES, designSystem.typography.families)
    );
  }
  
  if (designSystem.colors) {
    promises.push(saveColorPalette(designSystem.colors, figmaClientStorage));
  }
  
  if (designSystem.grid) {
    promises.push(saveGridSettings(designSystem.grid, figmaClientStorage));
  }
  
  await Promise.all(promises);
}

/**
 * Load entire design system from clientStorage (offline fallback)
 */
export async function loadDesignSystemFromClientStorage(figmaClientStorage) {
  const [scales, families, colors, grid] = await Promise.all([
    loadTypographyScales(figmaClientStorage),
    figmaClientStorage.getAsync(STORAGE_KEYS.MOTHER.TYPOGRAPHY_FAMILIES),
    loadColorPalette(figmaClientStorage),
    loadGridSettings(figmaClientStorage),
  ]);
  
  return {
    typography: {
      scales: scales || {},
      families: families || {},
    },
    colors: colors || {},
    grid: grid || {},
  };
}
```

### 11. Figma Client Storage Utilities (`src/storage/figma-client.js`)

```javascript
/**
 * Storage namespace constants
 * Follows pattern from single plugins but under new namespace
 */

export const STORAGE_KEYS = {
  // Mother plugin namespace
  MOTHER: {
    TYPOGRAPHY_SCALES: 'styledsystems.typography.scales',
    TYPOGRAPHY_FAMILIES: 'styledsystems.typography.families',
    COLORS: 'styledsystems.colors.palette',
    GRID: 'styledsystems.grid.settings',
    SYNC_CONFIG: 'styledsystems.sync.config',
    ACTIVE_SYSTEM_ID: 'styledsystems.activeDesignSystemId',
  },
};
```

---

## InDesign Plugin Integration

The InDesign UXP plugin will consume these functions like this:

```javascript
// In InDesign plugin code
import { 
  buildSyncPackage,
  uploadToGitHub,
  uploadToGoogleDrive,
  checkSyncQuota
} from '@stysys/styledsystems-ds/sync';

async function handleSyncNow(designSystemId) {
  // 1. Fetch design system from Firestore
  const designSystem = await getDesignSystem(designSystemId);
  
  // 2. Check quota
  const quotaStatus = await checkSyncQuota(designSystem);
  if (!quotaStatus.allowed) {
    showError(quotaStatus.message);
    return;
  }
  
  // 3. Build sync package
  showProgress('Building sync package...');
  const package = await buildSyncPackage(designSystem);
  
  // 4. Fetch assets from Firebase Storage (plugin-side)
  for (const file of package.files) {
    if (file.storageRef) {
      file.content = await fetchAssetFromStorage(file.storageRef);
    }
  }
  
  // 5. Upload to configured destinations
  const destinations = designSystem.sync.destinations.filter(d => d.enabled);
  
  for (const dest of destinations) {
    showProgress(`Syncing to ${dest.type}...`);
    
    let result;
    if (dest.type === 'github') {
      result = await uploadToGitHub(package, {
        token: await getGitHubToken(), // From plugin's OAuth
        ...dest.config
      });
    } else if (dest.type === 'google-drive') {
      result = await uploadToGoogleDrive(package, {
        token: await getGoogleDriveToken(), // From plugin's OAuth
        ...dest.config
      });
    }
    
    // 6. Update sync status in Firestore
    await updateSyncStatus(designSystemId, dest.type, result);
  }
  
  // 7. Record sync operation (updates quota)
  await recordSyncOperation(designSystemId);
  
  showSuccess('Sync complete!');
}
```

---

## Figma Plugin Integration

The Figma plugin has **full read/write capabilities** just like the InDesign plugin.

### Workflow 1: Edit Design System

```javascript
// In Figma plugin code
import { 
  getDesignSystem,
  updateDesignSystem
} from '@stysys/styledsystems-ds';
import { 
  saveTypographyScales,
  syncDesignSystemToClientStorage 
} from '@stysys/styledsystems-ds/storage/figma-client';

/**
 * Create or modify a type scale
 * Pattern inherited from Styled Typo
 */
async function createTypeScale(designSystemId, scaleName, size, leading) {
  // 1. Fetch current design system from Firestore
  const designSystem = await getDesignSystem(designSystemId);
  
  // 2. Add or update scale
  if (!designSystem.typography.scales) {
    designSystem.typography.scales = {};
  }
  
  designSystem.typography.scales[scaleName] = {
    size,
    leading,
    family: designSystem.typography.families.body[0],
  };
  
  // 3. Write to Firestore (source of truth)
  await updateDesignSystem(designSystemId, designSystem);
  
  // 4. Cache in clientStorage (offline capability)
  // This pattern is inherited from how Styled Typo works
  await saveTypographyScales(designSystem.typography.scales, figma.clientStorage);
  
  showSuccess(`Created scale: ${scaleName}`);
}

/**
 * On plugin startup: Load from Firestore, cache locally
 */
async function initializePlugin() {
  const designSystemId = await getActiveDesignSystemId();
  
  if (designSystemId) {
    // Fetch from Firestore (cloud)
    const designSystem = await getDesignSystem(designSystemId);
    
    // Cache in clientStorage (offline capability)
    // Pattern: Same as Styled Typo/Colors do for their tokens
    await syncDesignSystemToClientStorage(designSystem, figma.clientStorage);
    
    return designSystem;
  }
}
```

### Workflow 2: Export/Sync (same as InDesign)

```javascript
// In Figma plugin code
import { 
  buildSyncPackage,
  uploadToGitHub,
  uploadToGoogleDrive,
  checkSyncQuota
} from '@stysys/styledsystems-ds/sync';

async function handleSyncNow(designSystemId) {
  // Identical to InDesign implementation
  // Builds package with figma-tokens.json and figma-variables.json
  // Syncs to GitHub/Drive
}
```

### Workflow 3: Apply to Figma File (Figma-specific)

```javascript
// In Figma plugin code
import { generateFigmaTokens, generateFigmaVariables } from '@stysys/styledsystems-ds/sync/generators/figma';

/**
 * Apply design system to current Figma file
 * Creates color styles, text styles, and variables
 */
async function applyDesignSystemToFigma(designSystemId) {
  // 1. Fetch design system from Firestore
  const designSystem = await getDesignSystem(designSystemId);
  
  // 2. Generate Figma variables
  const figmaVariables = await generateFigmaVariables(designSystem);
  
  // 3. Create color styles in Figma
  showProgress('Creating color styles...');
  const colorVariables = figmaVariables.variables.filter(v => v.resolvedType === 'COLOR');
  
  for (const colorVar of colorVariables) {
    const style = figma.createPaintStyle();
    style.name = colorVar.name;
    style.paints = [{
      type: 'SOLID',
      color: colorVar.valuesByMode.default,
    }];
  }
  
  // 4. Create text styles from typography scales
  showProgress('Creating text styles...');
  if (designSystem.typography?.scales) {
    for (const [name, scale] of Object.entries(designSystem.typography.scales)) {
      const textStyle = figma.createTextStyle();
      textStyle.name = `typography/${name}`;
      textStyle.fontSize = scale.size;
      textStyle.lineHeight = { value: scale.leading, unit: 'PIXELS' };
      
      // Set font family if available
      if (designSystem.typography.families?.body) {
        const fontFamily = designSystem.typography.families.body[0];
        textStyle.fontName = { family: fontFamily, style: 'Regular' };
      }
    }
  }
  
  // 5. Optional: Create page layout simulation frame
  if (designSystem.grid) {
    showProgress('Creating page simulation...');
    await createPageSimulationFrame(designSystem);
  }
  
  showSuccess('Design system applied to Figma!');
}

/**
 * Create a Figma frame that visualizes grid/baseline system
 */
async function createPageSimulationFrame(designSystem) {
  const { grid } = designSystem;
  
  // Create frame with page dimensions
  const frame = figma.createFrame();
  frame.name = 'Page Layout Simulation';
  frame.resize(grid.pageWidth || 595, grid.pageHeight || 842);
  
  // Add margin guides (visual rectangles)
  if (grid.margins) {
    const marginGuide = figma.createRectangle();
    marginGuide.name = 'Margin Guide';
    marginGuide.x = grid.margins;
    marginGuide.y = grid.margins;
    marginGuide.resize(
      (grid.pageWidth || 595) - (grid.margins * 2),
      (grid.pageHeight || 842) - (grid.margins * 2)
    );
    marginGuide.strokes = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 }, opacity: 0.5 }];
    marginGuide.strokeWeight = 1;
    marginGuide.fills = [];
    marginGuide.locked = true;
    frame.appendChild(marginGuide);
  }
  
  // Add baseline grid (visual lines)
  if (grid.baselineIncrement) {
    const textArea = (grid.pageHeight || 842) - (grid.margins * 2);
    const baselineCount = Math.floor(textArea / grid.baselineIncrement);
    
    for (let i = 0; i <= baselineCount; i++) {
      const line = figma.createLine();
      line.name = `Baseline ${i}`;
      line.x = grid.margins;
      line.y = grid.margins + (i * grid.baselineIncrement);
      line.resize((grid.pageWidth || 595) - (grid.margins * 2), 0);
      line.strokes = [{ type: 'SOLID', color: { r: 0, g: 0.5, b: 1 }, opacity: 0.3 }];
      line.strokeWeight = 0.5;
      line.locked = true;
      frame.appendChild(line);
    }
  }
  
  figma.viewport.scrollAndZoomIntoView([frame]);
}
```

### Figma Plugin UI Panel

```
┌─────────────────────────────────────┐
│  STYLED SYSTEMS    [username]       │
├─────────────────────────────────────┤
│  EDIT  │  APPLY  │  SYNC            │
├─────────────────────────────────────┤
│                                     │
│  [Tab: EDIT SYSTEM]                 │
│  (Same UI as InDesign plugin)       │
│                                     │
│  Design System: [ACME Brand]        │
│                                     │
│  Typography                         │
│  [Edit Scales] [Edit Families]      │
│                                     │
│  Colors                             │
│  [Edit Colors]                      │
│                                     │
│  Grid                               │
│  [Edit Grid Settings]               │
│                                     │
│  ────────────────────────────────   │
│                                     │
│  [Tab: APPLY TO FIGMA]              │
│                                     │
│  ☑ Create color styles              │
│  ☑ Create text styles               │
│  ☑ Create spacing variables         │
│  ☐ Create page simulation frame     │
│                                     │
│  [Apply to Figma File]              │
│                                     │
│  ────────────────────────────────   │
│                                     │
│  [Tab: SYNC]                        │
│  (Same UI as InDesign plugin)       │
│                                     │
│  Export Design System               │
│  ☑ GitHub Repository                │
│  ☑ Google Drive                     │
│                                     │
│  [Sync Now]                         │
│                                     │
└─────────────────────────────────────┘
```

### Key Capabilities

**✅ Full Editing** (writes to Firestore)
- Create/modify type scales
- Add/edit colors
- Adjust grid settings
- Upload assets

**✅ Full Syncing** (same as InDesign)
- Export to GitHub
- Export to Google Drive
- Quota management
- Differential sync

**✅ Figma-Specific Application** (tool-specific)
- Apply as native Figma color styles
- Apply as native Figma text styles
- Create native Figma variables
- Visual grid/baseline overlays

---

## Package Dependencies

Add to `package.json`:

```json
{
  "name": "@stysys/styledsystems-ds",
  "version": "1.0.0",
  "dependencies": {
    "@octokit/rest": "^19.0.0",
    "googleapis": "^118.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0"
  },
  "exports": {
    "./sync": "./src/sync/index.js"
  }
}
```

---

## Implementation Phases

### Phase 0: Permissions & Version Control (Week 0-1) **NEW**
- ✅ User roles in Firestore (viewer, contributor, admin)
- ✅ Version management functions (draft, submit, approve, reject)
- ✅ Auto-sync on approval logic
- ✅ Background sync job queue infrastructure
- ✅ Permission checking utilities
- ✅ Change tracking (delta calculation)

### Phase 1: Core Package Functions (Week 1-2)
- ✅ Package structure setup
- ✅ Token generator (W3C format)
- ✅ Tailwind config generator
- ✅ CSS variables generator
- ✅ README generator
- ✅ Figma tokens generator (plugin format)
- ✅ Figma variables generator (native format)
- ✅ Content hashing utilities
- ✅ Quota management

### Phase 2: GitHub Integration (Week 2)
- ✅ GitHub client implementation
- ✅ OAuth token handling pattern
- ✅ Differential sync logic
- ✅ Error handling and retries

### Phase 3: Google Drive Integration (Week 3)
- ✅ Google Drive client implementation
- ✅ Folder creation and file upload
- ✅ OAuth token handling

### Phase 4: IDML Generation (Week 4)
- ✅ Integrate existing IDML generation
- ✅ Template creation
- ✅ Binary packaging

### Phase 5: InDesign Plugin Integration (Week 5-6)
- ✅ Role detection and adaptive UI
- ✅ Viewer mode (read-only apply)
- ✅ Contributor mode (draft creation and editing)
- ✅ Admin mode (approval workflow, sync)
- ✅ Draft version UI panel
- ✅ Sync UI panel (admin only)
- ✅ OAuth flow for GitHub/Drive
- ✅ Asset fetching from Firebase Storage
- ✅ Status indicators and error handling

### Phase 6: Figma Plugin Development (Week 6-8)
- ✅ Figma plugin setup and structure
- ✅ Client storage utilities (dual-write pattern)
- ✅ Migration from single plugins (Styled Typo, Styled Colors)
- ✅ Shared storage namespace implementation
- ✅ Edit UI panel (same as InDesign)
- ✅ Sync UI panel (same as InDesign)
- ✅ Apply tokens to Figma workflow
  - Create color styles from tokens
  - Create text styles from typography
  - Create spacing variables
- ✅ Page layout simulation
  - Margin guides
  - Baseline grid overlay
  - Column guides
- ✅ Import from GitHub/Drive workflow
- ✅ OAuth flow for GitHub/Drive
- ✅ Offline mode (clientStorage fallback)

---

## Testing Checklist

- [ ] Unit tests for each generator (tokens, tailwind, css, figma)
- [ ] Integration test: Build full package
- [ ] Integration test: Upload to GitHub (mock API)
- [ ] Integration test: Upload to Drive (mock API)
- [ ] Quota enforcement test
- [ ] Differential sync test (only changed files)
- [ ] Error handling: Network failures
- [ ] Error handling: Invalid tokens
- [ ] Error handling: Quota exceeded
- [ ] Figma token generation: valid tokens.json format
- [ ] Figma variables generation: valid variables format
- [ ] Figma plugin: Apply color styles correctly
- [ ] Figma plugin: Apply text styles with correct sizing/leading
- [ ] Figma plugin: Create simulation frame with accurate dimensions
- [ ] Figma plugin: Token reference resolution ({fontSize.base})
- [ ] Figma storage: Dual-write to mother + single plugin namespaces
- [ ] Figma storage: Offline mode works with clientStorage fallback
- [ ] **Version control: Draft creation and editing**
- [ ] **Version control: Submit for approval workflow**
- [ ] **Version control: Approve triggers auto-sync (if enabled)**
- [ ] **Version control: Manual sync works (if auto-sync disabled)**
- [ ] **Version control: Sync job queues and executes in background**
- [ ] **Version control: Partial sync failures handled gracefully**
- [ ] **Permissions: Viewer cannot create drafts**
- [ ] **Permissions: Contributor can create/submit drafts**
- [ ] **Permissions: Only admin can approve/reject**
- [ ] **Permissions: Only admin can sync to GitHub/Drive**

---

## Notes for Implementation

1. **Client-Side Execution**: All sync operations run in the InDesign plugin (user's machine), not on Cloud Functions. This minimizes your egress costs.

2. **OAuth Tokens**: The plugin handles OAuth flows and stores tokens securely. The core package functions just accept tokens as parameters.

3. **Asset Handling**: Assets (logos) are stored in Firebase Storage. The package builder generates placeholders, and the plugin fetches actual files before upload.

4. **Differential Sync**: By tracking file hashes, we only sync changed files. This reduces bandwidth and GitHub API calls.

5. **Quota Management**: Free tier users get 10 syncs/day. This prevents abuse and keeps your Firestore costs low.

6. **Version Generation**: Each sync gets a version number (YYYY.MM.DD.N) for tracking and rollback.

---

## Example Usage Flows

### Flow 1: InDesign User Creates System

```
Designer opens InDesign plugin
    ↓
Creates type scale (size: 16px, leading: 24px)
    ↓
Plugin writes to Firestore: designSystems/acme/typography/scales/base
    ↓
Designer clicks "Sync Now"
    ↓
Plugin calls buildSyncPackage() → generates tokens.json, IDML, etc.
    ↓
Plugin calls uploadToGitHub() with user's OAuth token
    ↓
GitHub receives commit with all files
    ↓
Developer pulls tokens.json into codebase
```

### Flow 2: Figma User Creates System

```
Designer opens Figma plugin
    ↓
Creates type scale (size: 16px, leading: 24px)
    ↓
Plugin writes to Firestore: designSystems/acme/typography/scales/base
    ↓
Designer clicks "Apply to Figma"
    ↓
Plugin creates native Figma text style with those values
    ↓
Designer clicks "Sync Now"
    ↓
Plugin calls buildSyncPackage() → generates tokens.json, Figma tokens, etc.
    ↓
Plugin calls uploadToGitHub() with user's OAuth token
    ↓
GitHub receives commit with all files
    ↓
Developer pulls tokens.json into codebase
```

### Flow 3: Cross-Tool Collaboration

```
Designer A (InDesign):
  Creates color "Primary Blue" = #0066CC
  Writes to Firestore
    ↓
Designer B (Figma):
  Opens Figma plugin
  Sees "Primary Blue" in color list (from Firestore)
  Clicks "Apply to Figma"
  Figma creates color style automatically
    ↓
Designer B adds new color "Accent Green" = #00AA66
  Writes to Firestore
    ↓
Designer A (InDesign):
  Refreshes InDesign plugin
  Sees "Accent Green" appear
  Applies to InDesign document
```

**Key Point:** Both designers are editing the **same** design system in Firestore. They just use different tools to apply and preview it.

---

## Cost Projection (with this architecture)

**Per sync operation:**
- Firestore reads: 3 documents @ $0.00000018 = $0.00000054
- Firestore writes: 1 document @ $0.00000054 = $0.00000054
- Cloud Storage reads: ~5 assets @ $0.0000004 = $0.000002
- **Total: ~$0.000003 per sync** ✅

**At 1,000 active users (10 syncs/day):**
- 10,000 syncs/day × $0.000003 = **$0.03/day = $0.90/month**

**At 10,000 active users:**
- 100,000 syncs/day × $0.000003 = **$0.30/day = $9/month**

Much more sustainable than the server-side approach!

---

## Learning from Existing Figma Plugins

### Context: You Already Have Working Solutions

Before building the mother plugin (Styled Systems), **you already built and shipped**:
- **Styled Typo** - Typography token management in Figma
- **Styled Colors** - Color token management in Figma

These plugins are **live in production** and have proven patterns for:
- Figma `clientStorage` usage
- UI components and workflows
- Token data structures
- Applying tokens to Figma documents

### Instruction to Agent: Inherit, Don't Reinvent

**Agent should:**
1. **Review existing code** in Styled Typo and Styled Colors repos
2. **Extract proven patterns** (storage schemas, UI flows, Figma API usage)
3. **Reuse those patterns** in the mother plugin
4. **Maintain compatibility** with existing storage structures

**Don't:**
- Design new storage schemas from scratch
- Invent new UI patterns
- Ignore how the single plugins work

### Specific Things to Inherit

**From Styled Typo:**
```javascript
// Agent: Look for how Styled Typo structures typography data
// Example pattern to find and reuse:
{
  "scales": {
    "base": { "size": 16, "leading": 24 },
    "h1": { "size": 48, "leading": 56 }
  },
  "families": {
    "body": ["Inter", "system-ui"],
    "heading": ["Playfair Display", "serif"]
  }
}

// Agent: Look for clientStorage keys used
// Example pattern to find and reuse:
const TYPO_STORAGE_KEY = 'styledtypo.scales';
```

**From Styled Colors:**
```javascript
// Agent: Look for how Styled Colors structures color data
// Example pattern to find and reuse:
{
  "palette": {
    "primary": "#0066CC",
    "secondary": "#00AA66",
    "text": "#1A1A1A"
  }
}

// Agent: Look for clientStorage keys used
// Example pattern to find and reuse:
const COLORS_STORAGE_KEY = 'styledcolors.palette';
```

**From Both Plugins:**
- How they save to `figma.clientStorage`
- How they load from `figma.clientStorage`
- How they apply tokens to Figma (creating color styles, text styles)
- UI component patterns (dropdowns, color pickers, scale editors)
- Error handling patterns

### Storage Namespace Strategy

The mother plugin should use a **superset** structure that **includes** the existing patterns:

```javascript
// Mother plugin storage (new namespace, but familiar structure)
'styledsystems.typography.scales'   // ← Same structure as styledtypo.scales
'styledsystems.typography.families' // ← Same structure as styledtypo.families
'styledsystems.colors.palette'      // ← Same structure as styledcolors.palette
'styledsystems.grid.settings'       // ← New, no equivalent in single plugins
'styledsystems.sync.config'         // ← New, no equivalent in single plugins
```

**Key principle:** Don't break what works. The typography and color structures should be **identical** to what Styled Typo and Styled Colors use.

### Migration Path (Optional, Later)

**Phase 1 (Now):** Mother plugin inherits patterns from single plugins
- Uses same data structures
- Writes to new namespace (`styledsystems.*`)
- Can optionally dual-write to single plugin namespaces for compatibility

**Phase 2 (Later):** Optionally upgrade single plugins
- Refactor Styled Typo to use `styledsystems-ds` core package
- Refactor Styled Colors to use `styledsystems-ds` core package
- They become "lite versions" of mother plugin (simpler UI, same backend)

### Code References for Agent

**Agent should examine:**
1. **Styled Typo repository** - typography token management patterns
2. **Styled Colors repository** - color token management patterns
3. Pay special attention to:
   - `clientStorage` save/load functions
   - Data structure schemas (JSON shapes)
   - Figma API calls (`figma.createTextStyle()`, `figma.createPaintStyle()`)
   - UI components for editing tokens
   - Validation logic

**Then apply those patterns to mother plugin:**
- Same storage structure for typography/colors
- Same Figma API patterns
- Same UI component approach
- Add new features (grid, sync) on top of proven foundation

---

## Figma Plugin Ecosystem & Client Storage Architecture

### Building on Proven Foundations

The mother plugin (Styled Systems) **inherits patterns** from existing single plugins:
- Storage schemas are **based on** what Styled Typo and Styled Colors already use
- UI patterns are **based on** what already works in production
- Figma API usage is **based on** proven implementations

### Recommended Storage Schema (Based on Existing Plugins)

```javascript
// Storage namespace pattern
export const STORAGE_KEYS = {
  // Mother plugin namespace (new, but familiar structure)
  MOTHER: {
    TYPOGRAPHY_SCALES: 'styledsystems.typography.scales',    // ← Same structure as styledtypo.scales
    TYPOGRAPHY_FAMILIES: 'styledsystems.typography.families', // ← Same structure as styledtypo.families
    COLORS: 'styledsystems.colors.palette',                   // ← Same structure as styledcolors.palette
    GRID: 'styledsystems.grid.settings',                      // ← New feature
    SYNC_CONFIG: 'styledsystems.sync.config',                 // ← New feature
    ACTIVE_SYSTEM_ID: 'styledsystems.activeDesignSystemId',
  },
};
```

**Key Principle:** Typography and color data structures should be **identical** to what the single plugins use. Don't invent new shapes — reuse what works.

### Dual Storage Strategy: Firestore + ClientStorage

```
┌─────────────────────────────────────────────┐
│  FIRESTORE (Cloud, Source of Truth)        │
│  - Cross-tool sync (InDesign ↔ Figma)      │
│  - Team collaboration                       │
│  - Version history                          │
└─────────────────────────────────────────────┘
                    ↕
┌─────────────────────────────────────────────┐
│  FIGMA CLIENT STORAGE (Local Cache)        │
│  - Offline capability                       │
│  - Fast reads                               │
│  - Based on Styled Typo/Colors patterns    │
└─────────────────────────────────────────────┘
```

**Pattern to inherit from single plugins:**
```javascript
// How Styled Typo/Colors likely do it:
async function saveTokens(tokens) {
  await figma.clientStorage.setAsync('styledtypo.scales', tokens);
}

async function loadTokens() {
  return await figma.clientStorage.getAsync('styledtypo.scales') || {};
}

// Mother plugin does similar, plus Firestore:
async function saveTokens(designSystemId, tokens) {
  // 1. Save to Firestore (source of truth)
  await updateDesignSystem(designSystemId, { typography: { scales: tokens } });
  
  // 2. Cache in clientStorage (offline capability)
  await figma.clientStorage.setAsync('styledsystems.typography.scales', tokens);
}
```

### Optional: Compatibility Layer

If you want users to be able to use **both** mother plugin and single plugins without conflict, add dual-write:

```javascript
// Optional: Also write to single plugin namespace
async function saveWithCompatibility(tokens) {
  // Mother plugin namespace
  await figma.clientStorage.setAsync('styledsystems.typography.scales', tokens);
  
  // ALSO write to Styled Typo namespace (so Styled Typo can still read it)
  await figma.clientStorage.setAsync('styledtypo.scales', tokens);
}
```

**This is optional.** Only implement if you want both plugins to coexist. Otherwise, just use the mother plugin's namespace.

---

## Permissions, Roles & Version Control

### The Governance Challenge

**Problem:** If every plugin user can directly edit the design system in Firestore, chaos ensues:
- Designer A changes primary color in Figma
- Designer B simultaneously changes it in InDesign
- No approval process, no audit trail, no control

**Solution:** Role-based permissions + version control workflow

### Three Permission Levels

```javascript
// In Firestore users collection
{
  userId: "user_123",
  email: "kristoffer@agency.se",
  organizations: {
    "org_bigcorp": {
      role: "contributor",
      addedBy: "admin_456",
      addedAt: "2026-04-01T10:00:00Z"
    }
  }
}
```

**Roles:**
1. **Viewer** - Consume the system, no editing
2. **Contributor** - Propose changes via version drafts
3. **Admin** - Approve versions, manage users, sync to external systems

### Permission Matrix

| Action | Viewer | Contributor | Admin |
|--------|--------|-------------|-------|
| View design system | ✅ | ✅ | ✅ |
| Apply to document (InDesign/Figma) | ✅ | ✅ | ✅ |
| **Create draft versions** | ❌ | ✅ | ✅ |
| **Edit within draft** | ❌ | ✅ | ✅ |
| **Submit draft for approval** | ❌ | ✅ | ✅ |
| **Approve/reject versions** | ❌ | ❌ | ✅ |
| **Publish versions** | ❌ | ❌ | ✅ |
| **Sync to GitHub/Drive** | ❌ | ❌ | ✅ |
| **Manage organization users** | ❌ | ❌ | ✅ |
| **Delete design systems** | ❌ | ❌ | ✅ |

### Real-World Role Scenarios

#### Scenario 1: Freelance Consultant Setting Up Client System

```
Organization: Big Corp AB
├── Anna (Admin) - Internal brand manager at Big Corp
├── Kristoffer (Contributor) - Freelance consultant hired to build system
└── 50 designers (Viewers) - Internal design team
```

**Workflow:**
1. Big Corp hires Kristoffer to build their design system
2. Anna invites Kristoffer with **Contributor** role
3. Kristoffer works in Figma plugin:
   - Creates draft "v1.0.0 - Initial system setup"
   - Defines typography scales, colors, grid
   - Submits for approval
4. Anna reviews in web app → Approves
5. v1.0.0 published → 50 designers can now use it
6. Contract ends → Anna revokes Kristoffer's access

**Why Contributor, not Admin?**
- Kristoffer shouldn't sync to Big Corp's GitHub repo (security)
- Kristoffer shouldn't manage user permissions (temporary access)
- Anna (internal stakeholder) should have final approval (ownership)

#### Scenario 2: Agency Managing Client's Brand System

```
Organization: Client Brand Inc
├── Erik (Admin) - Client's marketing director
├── Agency Team (Contributors):
│   ├── Lisa - Senior designer at agency
│   ├── Johan - Junior designer at agency
└── Client designers (Viewers) - 5 people
```

**Workflow:**
1. Agency is hired to maintain Client Brand Inc's design system
2. Erik gives Lisa and Johan **Contributor** access
3. Lisa creates draft: "Update primary color for rebrand"
4. Erik reviews in web app → Approves
5. Johan creates draft: "Add new display font"
6. Erik reviews → Rejects (doesn't fit brand strategy)
7. Agency submits monthly invoice, continues maintaining system

**Why Contributors?**
- Agency does the work, but client retains control
- Client can reject changes that don't align with strategy
- Agency's access can be managed when contract changes

#### Scenario 3: Internal Team with Experience Levels

```
Organization: Design Studio XYZ
├── Sara (Admin) - Creative director
├── Senior Designers (Contributors):
│   ├── Maja - 5 years experience
│   ├── Oscar - 8 years experience
└── Junior Designers (Viewers):
    ├── Emma - 6 months experience
    ├── Lucas - Intern
```

**Workflow:**
1. Sara wants experienced designers to propose improvements
2. Maja notices: "Our h3 scale too small for accessibility"
3. Maja creates draft with updated scale
4. Sara reviews → Approves
5. Emma and Lucas use the updated system (can't edit yet)

**Why this split?**
- Juniors learn the system before being allowed to change it
- Experienced designers iterate without bottlenecking Sara
- Sara maintains quality control and system consistency

#### Scenario 4: Solo Freelancer (Simplest)

```
Organization: Kristoffer's Projects
└── Kristoffer (Admin) - Solo designer
```

**Workflow:**
1. Kristoffer is the only user
2. He's an Admin (owner)
3. He can:
   - Edit directly (auto-approve own changes), OR
   - Use draft workflow for personal version control
4. Syncs to his own GitHub repo

**Why Admin?**
- It's his system, no external approval needed
- Full control over syncing and integrations

---

### Version Control Workflow

#### Firestore Schema: Versions Collection

```javascript
// Collection: designSystems/{id}/versions/{versionId}
{
  versionId: "v2.5.0-draft-abc123",
  versionNumber: "2.5.0",
  baseVersion: "2.4.1",           // What it branched from
  status: "draft" | "submitted" | "approved" | "rejected" | "published",
  
  // Who created this version
  createdBy: {
    userId: "user_123",
    userName: "Kristoffer",
    email: "kristoffer@agency.se",
    role: "contributor"
  },
  createdAt: "2026-04-03T14:30:00Z",
  
  // Changes in this version (delta from base)
  changes: {
    typography: {
      scales: {
        "4xl": { 
          size: 72, 
          leading: 84,
          _changeType: "added"  // added | modified | deleted
        }
      }
    },
    colors: {
      "primary": {
        value: "#0066CC",
        _previousValue: "#0055BB",
        _changeType: "modified"
      }
    }
  },
  
  // Commit metadata
  commitMessage: "Larger headings for web redesign",
  commitDescription: "Updated typography scale to support new homepage hero section...",
  
  // Workflow tracking
  submittedAt: "2026-04-03T15:00:00Z",
  
  approvedBy: {
    userId: "admin_456",
    userName: "Anna",
    email: "anna@bigcorp.se"
  },
  approvedAt: "2026-04-03T16:00:00Z",
  approvalNotes: "Looks good, matches brand guidelines",
  
  rejectedBy: null,
  rejectedAt: null,
  rejectionReason: null,
  
  publishedAt: "2026-04-03T16:00:00Z"
}

// Main design system document
{
  id: "bigcorp-brand-2026",
  name: "Big Corp Brand System",
  organizationId: "org_bigcorp",
  
  // Current published state
  currentVersion: "2.5.0",
  
  // The actual design system data (published version)
  typography: {
    scales: {
      "xs": { size: 12, leading: 16 },
      "base": { size: 16, leading: 24 },
      // ... all scales including new "4xl"
    }
  },
  colors: { /* published colors */ },
  grid: { /* published grid */ },
  
  // Version history (for reference)
  versionHistory: {
    "2.4.1": {
      publishedAt: "2026-03-15T10:00:00Z",
      publishedBy: "admin_456"
    },
    "2.5.0": {
      publishedAt: "2026-04-03T16:00:00Z",
      publishedBy: "admin_456",
      createdBy: "user_123"  // Contributor who created it
    }
  }
}
```

---

### Plugin UI: Role-Adaptive Interface

#### Viewer Mode (Read-Only)

```
┌─────────────────────────────────────┐
│  STYLED SYSTEMS    [Emma]           │
│  Role: Viewer                       │
├─────────────────────────────────────┤
│                                     │
│  Active System: Design Studio XYZ   │
│  Current Version: v2.5.0            │
│                                     │
│  You can view and apply this system │
│  to your designs.                   │
│                                     │
│  Typography                         │
│  [View Scales]  [Apply to Doc]      │
│                                     │
│  Colors                             │
│  [View Palette]  [Apply to Doc]     │
│                                     │
│  Grid                               │
│  [View Settings]  [Create Frame]    │
│                                     │
│  🔒 You need Contributor access     │
│     to propose changes.             │
│     Contact sara@studio.se          │
│                                     │
└─────────────────────────────────────┘
```

#### Contributor Mode (Propose Changes)

```
┌─────────────────────────────────────┐
│  STYLED SYSTEMS    [Kristoffer]     │
│  Role: Contributor                  │
├─────────────────────────────────────┤
│  APPLY  │  DRAFT                    │
├─────────────────────────────────────┤
│                                     │
│  [Tab: APPLY]                       │
│                                     │
│  Active System: Big Corp Brand      │
│  Published: v0.9.0 (baseline)       │
│                                     │
│  Typography                         │
│  [View Scales]  [Apply to Doc]      │
│                                     │
│  Colors                             │
│  [View Palette]  [Apply to Doc]     │
│                                     │
│  ────────────────────────────────   │
│                                     │
│  💡 Ready to build the system?      │
│  [Create Draft Version]             │
│                                     │
└─────────────────────────────────────┘

After clicking "Create Draft Version":

┌─────────────────────────────────────┐
│  DRAFT: v1.0.0                      │
│  Branched from: v0.9.0              │
│  Status: Draft (not submitted)      │
├─────────────────────────────────────┤
│  EDIT  │  REVIEW  │  APPLY          │
├─────────────────────────────────────┤
│                                     │
│  [Tab: EDIT]                        │
│                                     │
│  Now you can edit:                  │
│                                     │
│  Typography                         │
│  [Edit Scales] [Edit Families]      │
│                                     │
│  Colors                             │
│  [Edit Colors]                      │
│                                     │
│  Grid                               │
│  [Edit Grid Settings]               │
│                                     │
│  Your changes are saved to draft    │
│  and won't affect others yet.       │
│                                     │
│  ────────────────────────────────   │
│                                     │
│  [Tab: REVIEW]                      │
│                                     │
│  Changes in this draft:             │
│  ✚ Typography: 8 scales added       │
│  ✚ Colors: 12 colors added          │
│  ✚ Grid: Baseline system added      │
│                                     │
│  Commit message:                    │
│  ┌─────────────────────────────┐   │
│  │ Initial design system setup  │   │
│  └─────────────────────────────┘   │
│                                     │
│  Description (optional):            │
│  ┌─────────────────────────────┐   │
│  │ Complete typography scale    │   │
│  │ based on brand guidelines.   │   │
│  │ Color palette extracted from │   │
│  │ logo and marketing materials.│   │
│  └─────────────────────────────┘   │
│                                     │
│  [Submit to Anna for Approval]      │
│  [Save Draft] [Discard]             │
│                                     │
└─────────────────────────────────────┘
```

#### Admin Mode (Approve & Manage)

```
┌─────────────────────────────────────┐
│  STYLED SYSTEMS    [Anna]           │
│  Role: Admin                        │
├─────────────────────────────────────┤
│  APPLY  │  DRAFT  │  PENDING (1)    │
├─────────────────────────────────────┤
│                                     │
│  [Tab: PENDING VERSIONS]            │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ v1.0.0                       │   │
│  │ Submitted by: Kristoffer     │   │
│  │ kristoffer@agency.se         │   │
│  │ 2026-04-03 15:00             │   │
│  │                              │   │
│  │ "Initial design system setup"│   │
│  │                              │   │
│  │ Changes:                     │   │
│  │ ✚ Typography: 8 scales       │   │
│  │ ✚ Colors: 12 colors          │   │
│  │ ✚ Grid: Baseline system      │   │
│  │                              │   │
│  │ [Review in Detail]           │   │
│  │ [Approve & Publish]          │   │
│  │ [Reject with Feedback]       │   │
│  └─────────────────────────────┘   │
│                                     │
│  ────────────────────────────────   │
│                                     │
│  [Tab: SYNC & MANAGE]               │
│                                     │
│  Export System                      │
│  ☑ GitHub Repository                │
│  ☑ Google Drive                     │
│  [Sync Now]                         │
│                                     │
│  Organization Users                 │
│  [Manage Access]                    │
│                                     │
└─────────────────────────────────────┘
```

---

### Core Package Functions: Version Management

Add to `styledsystems-ds`:

```javascript
// src/versions/index.js

/**
 * Create a new draft version
 */
export async function createDraftVersion(designSystemId, userId, baseVersion) {
  const draftId = generateDraftId();
  const user = await getUser(userId);
  
  const draft = {
    versionId: draftId,
    versionNumber: incrementVersion(baseVersion), // 2.4.1 → 2.5.0
    baseVersion,
    status: 'draft',
    createdBy: {
      userId: user.id,
      userName: user.name,
      email: user.email,
      role: user.organizations[designSystemId].role
    },
    createdAt: new Date().toISOString(),
    changes: {},
    commitMessage: '',
    commitDescription: ''
  };
  
  await saveVersionDraft(designSystemId, draft);
  return draft;
}

/**
 * Update changes in a draft version
 */
export async function updateDraftChanges(designSystemId, versionId, changes) {
  const draft = await getVersionDraft(designSystemId, versionId);
  
  // Merge new changes
  draft.changes = deepMerge(draft.changes, changes);
  
  await saveVersionDraft(designSystemId, draft);
}

/**
 * Submit draft for approval
 */
export async function submitDraftForApproval(designSystemId, versionId, commitMessage, commitDescription) {
  const draft = await getVersionDraft(designSystemId, versionId);
  
  draft.status = 'submitted';
  draft.submittedAt = new Date().toISOString();
  draft.commitMessage = commitMessage;
  draft.commitDescription = commitDescription;
  
  await saveVersionDraft(designSystemId, draft);
  
  // Notify admins
  await notifyAdminsOfPendingVersion(designSystemId, draft);
  
  return draft;
}

/**
 * Approve and publish a version (admin only)
 * Optionally auto-syncs to configured destinations
 */
export async function approveVersion(designSystemId, versionId, adminUserId, approvalNotes, options = {}) {
  const draft = await getVersionDraft(designSystemId, versionId);
  const admin = await getUser(adminUserId);
  
  // Verify admin permission
  if (admin.organizations[designSystemId].role !== 'admin') {
    throw new Error('Only admins can approve versions');
  }
  
  // Update draft status
  draft.status = 'approved';
  draft.approvedBy = {
    userId: admin.id,
    userName: admin.name,
    email: admin.email
  };
  draft.approvedAt = new Date().toISOString();
  draft.approvalNotes = approvalNotes;
  
  // Apply changes to main design system
  const designSystem = await getDesignSystem(designSystemId);
  designSystem.typography = applyChanges(designSystem.typography, draft.changes.typography);
  designSystem.colors = applyChanges(designSystem.colors, draft.changes.colors);
  designSystem.grid = applyChanges(designSystem.grid, draft.changes.grid);
  designSystem.currentVersion = draft.versionNumber;
  
  // Add to version history
  designSystem.versionHistory[draft.versionNumber] = {
    publishedAt: new Date().toISOString(),
    publishedBy: adminUserId,
    createdBy: draft.createdBy.userId
  };
  
  // Publish to Firestore
  await updateDesignSystem(designSystemId, designSystem);
  
  // Mark draft as published
  draft.status = 'published';
  draft.publishedAt = new Date().toISOString();
  await saveVersionDraft(designSystemId, draft);
  
  // AUTO-SYNC: Check if should sync on publish
  let syncResult = null;
  const shouldAutoSync = designSystem.sync?.autoSyncOnPublish !== false; // default: true
  
  if (shouldAutoSync && !options.skipSync && designSystem.sync?.enabled) {
    // Queue background sync job (non-blocking)
    syncResult = await queueSyncJob(designSystemId, {
      triggeredBy: 'version_approval',
      versionNumber: draft.versionNumber,
      approvedBy: adminUserId
    });
  }
  
  // Notify all users of new version
  await notifyUsersOfNewVersion(designSystemId, draft.versionNumber);
  
  return {
    version: draft,
    published: true,
    synced: syncResult?.queued || false,
    syncJobId: syncResult?.jobId
  };
}

/**
 * Queue a sync job to run in background
 * Non-blocking - returns immediately with job ID
 */
async function queueSyncJob(designSystemId, metadata) {
  const designSystem = await getDesignSystem(designSystemId);
  const syncPackage = await buildSyncPackage(designSystem);
  
  const jobId = generateJobId();
  const job = {
    jobId,
    designSystemId,
    status: 'queued',
    createdAt: new Date().toISOString(),
    metadata,
    package: syncPackage
  };
  
  // Save to jobs collection for background worker
  await saveSyncJob(job);
  
  // Trigger background worker (implementation depends on infrastructure)
  await triggerSyncWorker(jobId);
  
  return {
    queued: true,
    jobId
  };
}

/**
 * Background worker: Execute queued sync job
 */
export async function executeSyncJob(jobId) {
  const job = await getSyncJob(jobId);
  const designSystem = await getDesignSystem(job.designSystemId);
  
  // Update job status
  job.status = 'running';
  job.startedAt = new Date().toISOString();
  await updateSyncJob(job);
  
  const results = [];
  
  // Sync to each enabled destination
  const destinations = designSystem.sync.destinations.filter(d => d.enabled);
  
  for (const dest of destinations) {
    try {
      let result;
      
      if (dest.type === 'github') {
        result = await uploadToGitHub(job.package, {
          token: await getSystemToken('github', job.designSystemId),
          ...dest.config
        });
      } else if (dest.type === 'google-drive') {
        result = await uploadToGoogleDrive(job.package, {
          token: await getSystemToken('google-drive', job.designSystemId),
          ...dest.config
        });
      }
      
      results.push({
        destination: dest.type,
        success: result.success,
        ...result
      });
      
      // Update sync status in design system
      await updateSyncStatus(job.designSystemId, dest.type, result);
      
    } catch (error) {
      results.push({
        destination: dest.type,
        success: false,
        error: error.message
      });
    }
  }
  
  // Update job status
  job.status = results.every(r => r.success) ? 'completed' : 'partial';
  job.completedAt = new Date().toISOString();
  job.results = results;
  await updateSyncJob(job);
  
  // Notify admin of sync completion
  await notifyAdminOfSyncCompletion(job.metadata.approvedBy, job);
  
  return job;
}

/**
 * Reject a version (admin only)
 */
export async function rejectVersion(designSystemId, versionId, adminUserId, rejectionReason) {
  const draft = await getVersionDraft(designSystemId, versionId);
  const admin = await getUser(adminUserId);
  
  // Verify admin permission
  if (admin.organizations[designSystemId].role !== 'admin') {
    throw new Error('Only admins can reject versions');
  }
  
  draft.status = 'rejected';
  draft.rejectedBy = {
    userId: admin.id,
    userName: admin.name,
    email: admin.email
  };
  draft.rejectedAt = new Date().toISOString();
  draft.rejectionReason = rejectionReason;
  
  await saveVersionDraft(designSystemId, draft);
  
  // Notify creator
  await notifyUserOfRejection(draft.createdBy.userId, designSystemId, draft, rejectionReason);
  
  return draft;
}

/**
 * Check user permission for action
 */
export function canUserPerformAction(user, designSystemId, action) {
  const role = user.organizations[designSystemId]?.role;
  
  const permissions = {
    'view': ['viewer', 'contributor', 'admin'],
    'createDraft': ['contributor', 'admin'],
    'editDraft': ['contributor', 'admin'],
    'submitDraft': ['contributor', 'admin'],
    'approveVersion': ['admin'],
    'rejectVersion': ['admin'],
    'syncToGitHub': ['admin'],
    'manageUsers': ['admin']
  };
  
  return permissions[action]?.includes(role) || false;
}
```

---

### Web App Integration Points

The web app remains the central hub for:

1. **Version Approval** (primary workflow)
   - Richer diff viewer than plugin can show
   - Side-by-side comparison of before/after
   - Comment threads on specific changes
   - **Approve button triggers auto-sync** (if enabled)

2. **Sync Management**
   - Configure auto-sync on/off per design system
   - View sync job history and status
   - Manually trigger sync (if auto-sync disabled)
   - Monitor sync progress in real-time

3. **User Management**
   - Invite users with specific roles
   - Revoke access when contracts end
   - Audit log of all user actions

4. **Version History**
   - Visual timeline of all versions
   - Rollback to previous versions
   - Compare any two versions

5. **Analytics** (future)
   - Which designers use which tokens most
   - Adoption metrics across organization

The plugins are **execution environments** where work happens. The web app is the **governance layer** where decisions are made.

---

### Web App UI: Sync Settings

```
┌─────────────────────────────────────────────┐
│  Design System Settings                     │
├─────────────────────────────────────────────┤
│                                             │
│  Sync Configuration                         │
│                                             │
│  ☑ Enable sync                              │
│                                             │
│  ☑ Auto-sync on version publish             │
│    Automatically sync to GitHub and Google  │
│    Drive when a new version is approved.    │
│    (Recommended)                            │
│                                             │
│  Sync Destinations:                         │
│  ┌─────────────────────────────────────┐   │
│  │ ☑ GitHub Repository                 │   │
│  │   acme-corp/design-tokens           │   │
│  │   Branch: main                      │   │
│  │   Path: design-system/              │   │
│  │   Last sync: 2 hours ago ✓          │   │
│  │   [Configure]                       │   │
│  │                                     │   │
│  │ ☑ Google Drive                      │   │
│  │   /ACME Design Tokens               │   │
│  │   Last sync: 2 hours ago ✓          │   │
│  │   [Configure]                       │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  [Save Settings]                            │
│                                             │
└─────────────────────────────────────────────┘
```

### Web App UI: After Approving Version

**With auto-sync ENABLED:**
```
┌────────────────────────────────────────────┐
│  ✓ Version v2.5.0 Published                │
│                                            │
│  Changes are now live for all users.       │
│                                            │
│  Sync Status:                              │
│  ┌────────────────────────────────────┐   │
│  │ ⏳ GitHub (syncing...)             │   │
│  │    Job ID: sync_abc123             │   │
│  │                                    │   │
│  │ ✓ Google Drive (complete)          │   │
│  │    5 files synced                  │   │
│  └────────────────────────────────────┘   │
│                                            │
│  [View Sync Details]                       │
│  [View Version]                            │
└────────────────────────────────────────────┘

(Updates in real-time as sync progresses)

After GitHub completes:

┌────────────────────────────────────────────┐
│  ✓ Version v2.5.0 Published & Synced       │
│                                            │
│  Sync Results:                             │
│  ┌────────────────────────────────────┐   │
│  │ ✓ GitHub                           │   │
│  │    Commit: a3f8b2c                 │   │
│  │    View: github.com/acme/.../a3f8b │   │
│  │                                    │   │
│  │ ✓ Google Drive                     │   │
│  │    5 files synced                  │   │
│  │    View: drive.google.com/...      │   │
│  └────────────────────────────────────┘   │
│                                            │
│  [Close]                                   │
└────────────────────────────────────────────┘
```

**With auto-sync DISABLED:**
```
┌────────────────────────────────────────────┐
│  ✓ Version v2.5.0 Published                │
│                                            │
│  Changes are now live for all users.       │
│                                            │
│  ⚠️ Auto-sync is disabled                  │
│                                            │
│  This version has not been synced to       │
│  external systems yet.                     │
│                                            │
│  Preview sync package:                     │
│  • tokens.json                             │
│  • tailwind.config.js                      │
│  • variables.css                           │
│  • design-system.idml                      │
│  • 3 assets                                │
│                                            │
│  [Review Package]                          │
│  [Sync Now]                                │
└────────────────────────────────────────────┘
```

---

### Web App UI: Sync History

```
┌─────────────────────────────────────────────┐
│  Sync History                               │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ ✓ v2.5.0 - April 3, 2026 16:00     │   │
│  │   Triggered by: Version approval    │   │
│  │   Approved by: Anna                 │   │
│  │   Status: Completed (2 of 2)        │   │
│  │   GitHub: ✓ | Google Drive: ✓      │   │
│  │   [View Details]                    │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ ⚠️ v2.4.1 - March 15, 2026 10:30    │   │
│  │   Triggered by: Manual sync         │   │
│  │   Triggered by: Anna                │   │
│  │   Status: Partial (1 of 2)          │   │
│  │   GitHub: ✓ | Google Drive: ✗       │   │
│  │   Error: Drive quota exceeded       │   │
│  │   [Retry] [View Details]            │   │
│  └─────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Plugin Philosophy: Tool Parity, Not Hierarchy

Both the InDesign and Figma plugins are **equal first-class citizens**. There is no "mother" and "child" relationship. Users choose their primary tool based on their workflow, not limitations.

### Feature Parity

| Feature | InDesign Plugin | Figma Plugin | Notes |
|---------|----------------|--------------|-------|
| **Read design system** | ✅ Full access | ✅ Full access | Both read from same Firestore |
| **Edit typography** | ✅ Create/edit scales | ✅ Create/edit scales | Both write to Firestore |
| **Edit colors** | ✅ Full control | ✅ Full control | Both write to Firestore |
| **Edit grid** | ✅ Full control | ✅ Full control | Both write to Firestore |
| **Sync to GitHub** | ✅ Export package | ✅ Export package | Identical sync functionality |
| **Sync to Drive** | ✅ Export package | ✅ Export package | Identical sync functionality |
| **Apply to document** | ✅ IDML styles | ✅ Figma styles | Tool-specific application |
| **Visual simulation** | ✅ Native docs | ✅ Frame overlays | Different but equivalent |

### Typical User Profiles

**Print/Editorial Designer:**
- Primary tool: **InDesign plugin**
- Creates type scales, tests in real layouts
- Exports IDML templates for production
- May never touch Figma

**Digital/Product Designer:**
- Primary tool: **Figma plugin**
- Creates type scales, tests in frames
- Exports Figma variables for design system
- May never touch InDesign

**Agency Managing Multiple Brands:**
- Uses **both plugins**
- InDesign for print clients
- Figma for digital clients
- Same design system, different outputs

**Developer Team:**
- Uses **neither plugin directly**
- Pulls tokens from GitHub sync
- Consumes tailwind.config.js / variables.css

### Core Principle: *Sanningen finns på ett ställe*

The **truth** lives in **Firestore**, not in any specific tool:

```
┌─────────────────────────────────────────┐
│  FIRESTORE = SOURCE OF TRUTH            │
│  {                                      │
│    typography: {...},                   │
│    colors: {...},                       │
│    grid: {...}                          │
│  }                                      │
└─────────────────────────────────────────┘
           ▲               ▲
           │               │
    ┌──────┴──────┐   ┌───┴──────┐
    │  InDesign   │   │  Figma   │
    │  Plugin     │   │  Plugin  │
    └─────────────┘   └──────────┘
    
    Both can READ and WRITE
    Neither is the "source"
    Firestore is the source
```

If a user creates a type scale in **Figma**, it immediately syncs to Firestore. If another user opens the **InDesign plugin**, they see that same scale. And vice versa.

### Tool-Specific Capabilities

Each plugin has unique features **because of the tool they live in**, not because one is more powerful:

**InDesign Plugin Unique Features:**
- Apply styles to native InDesign documents
- Export publication-ready IDML files
- Precise typographic control (optical kerning, etc.)

**Figma Plugin Unique Features:**
- Apply as native Figma variables
- Create auto-layout components with system tokens
- Real-time collaboration on design variations

**Both Plugins Share:**
- Full CRUD on design system data
- Sync to GitHub/Drive
- Quota management
- Asset management

---

## Next Steps

1. Review this spec with your agent
2. Have agent implement Phase 1 (core generators)
3. Test token generation with your existing design systems
4. Implement GitHub client (Phase 2)
5. Build InDesign plugin UI for sync panel

---

**Questions for Agent:**
- Should IDML generation reuse existing code, or be refactored into this package?
- Do we need support for other destinations (Dropbox, S3, Notion)?
- Should we generate a CHANGELOG.md that tracks version history?
- Do we want to support custom export formats (e.g., iOS/Android native tokens)?
- For Figma plugin: Should InDesign simulation be a separate Figma file template or generated on-demand?
- For Figma plugin: Do we need bidirectional sync (Figma → Firestore)?
- Should Figma plugin support importing from existing Figma files (reading existing styles)?
