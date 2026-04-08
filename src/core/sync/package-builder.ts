/**
 * sync/package-builder.ts — Builds a complete sync package from a design system
 *
 * Orchestrates all generators and produces a SyncPackage ready for upload
 * to GitHub or Google Drive.
 */

import type { SyncableDesignSystem, DesignSystemAssetLogo } from "../versions/types.js";
import { generateW3CTokens } from "./generators/tokens.js";
import { generateTailwindConfig } from "./generators/tailwind.js";
import { generateCSSVariables } from "./generators/css.js";
import { generateFigmaTokens, generateFigmaVariables } from "./generators/figma.js";
import { generateReadme } from "./generators/readme.js";
import { generateIDML } from "./generators/idml.js";
import { hashContent, type SyncFile } from "./utils/hash.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface SyncPackageOptions {
  include?: {
    tokens?: boolean;
    tailwind?: boolean;
    css?: boolean;
    idml?: boolean;
    figma?: boolean;
    assets?: boolean;
    documentation?: boolean;
  };
  formats?: {
    tokens?: "w3c" | "style-dictionary";
    css?: "custom-props" | "scss-vars";
    tailwind?: "preset" | "full-config";
  };
}

export interface SyncPackage {
  files: SyncFile[];
  metadata: {
    name: string;
    version: string;
    syncedAt: string;
  };
}

const DEFAULT_OPTIONS: Required<SyncPackageOptions> = {
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
    tokens: "w3c",
    css: "custom-props",
    tailwind: "preset",
  },
};

// ---------------------------------------------------------------------------
// Build full package
// ---------------------------------------------------------------------------

/**
 * Builds a complete sync package from a design system.
 * Asset files (`storageRef` entries) will have `content: null` — the caller
 * (plugin) is responsible for fetching those from Firebase Storage and
 * populating `content` before uploading.
 */
export async function buildSyncPackage(
  designSystem: SyncableDesignSystem,
  options: SyncPackageOptions = {}
): Promise<SyncPackage> {
  const opts = mergeOptions(options);
  const files: SyncFile[] = [];

  // tokens.json
  if (opts.include.tokens) {
    const tokens = generateW3CTokens(designSystem);
    const content = JSON.stringify(tokens, null, 2);
    files.push({
      path: "tokens.json",
      content,
      hash: await hashContent(content),
    });
  }

  // tailwind.config.js
  if (opts.include.tailwind) {
    const content = generateTailwindConfig(designSystem, opts.formats.tailwind);
    files.push({
      path: "tailwind.config.js",
      content,
      hash: await hashContent(content),
    });
  }

  // variables.css
  if (opts.include.css) {
    const content = generateCSSVariables(designSystem, opts.formats.css);
    files.push({
      path: "variables.css",
      content,
      hash: await hashContent(content),
    });
  }

  // design-system.idml
  if (opts.include.idml) {
    const idmlBytes = generateIDML(designSystem);
    files.push({
      path: "design-system.idml",
      content: idmlBytes,
      hash: await hashContent(idmlBytes),
    });
  }

  // figma-tokens.json + figma-variables.json
  if (opts.include.figma) {
    const figmaTokens = generateFigmaTokens(designSystem);
    const figmaTokensContent = JSON.stringify(figmaTokens, null, 2);
    files.push({
      path: "figma-tokens.json",
      content: figmaTokensContent,
      hash: await hashContent(figmaTokensContent),
    });

    const figmaVars = generateFigmaVariables(designSystem);
    const figmaVarsContent = JSON.stringify(figmaVars, null, 2);
    files.push({
      path: "figma-variables.json",
      content: figmaVarsContent,
      hash: await hashContent(figmaVarsContent),
    });
  }

  // assets/ — placeholders, plugin fetches from Firebase Storage
  if (opts.include.assets && designSystem.assets?.logos) {
    for (const logo of designSystem.assets.logos) {
      for (const format of logo.formats) {
        files.push(makeAssetPlaceholder(logo, format));
      }
    }
  }

  // README.md
  if (opts.include.documentation) {
    const content = generateReadme(designSystem);
    files.push({
      path: "README.md",
      content,
      hash: await hashContent(content),
    });
  }

  return {
    files,
    metadata: {
      name: designSystem.name,
      version: buildSyncVersion(),
      syncedAt: new Date().toISOString(),
    },
  };
}

// ---------------------------------------------------------------------------
// Differential package
// ---------------------------------------------------------------------------

/**
 * Builds a package containing only files whose content hash differs from the
 * last sync state. Always includes asset placeholders.
 */
export async function buildDifferentialPackage(
  designSystem: SyncableDesignSystem,
  lastSyncedFiles: Record<string, string> = {},
  options: SyncPackageOptions = {}
): Promise<SyncPackage> {
  const full = await buildSyncPackage(designSystem, options);

  const changedFiles = full.files.filter((file) => {
    if (file.content === null) return true; // always include asset placeholders
    const lastHash = lastSyncedFiles[file.path];
    return !lastHash || lastHash !== file.hash;
  });

  return { ...full, files: changedFiles };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mergeOptions(
  overrides: SyncPackageOptions
): Required<SyncPackageOptions> {
  return {
    include: { ...DEFAULT_OPTIONS.include, ...overrides.include },
    formats: { ...DEFAULT_OPTIONS.formats, ...overrides.formats },
  };
}

function makeAssetPlaceholder(
  logo: DesignSystemAssetLogo,
  format: string
): SyncFile & { storageRef: string } {
  // Derive the storage path for this format by replacing the file extension
  const storageRef = logo.firebaseStoragePath.replace(/\.\w+$/, `.${format}`);
  return {
    path: `assets/${logo.id}.${format}`,
    content: null,
    storageRef,
  };
}

/**
 * Generates a datestamp-based version string: YYYY.MM.DD.NNN
 * The NNN suffix is a seconds-within-day counter to differentiate multiple
 * syncs on the same day without requiring a persistent counter.
 */
function buildSyncVersion(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, ".");
  const secondsInDay = Math.floor(
    (now.getTime() - new Date(now.toDateString()).getTime()) / 1000
  );
  return `${date}.${secondsInDay}`;
}
