// Package builder
export { buildSyncPackage, buildDifferentialPackage } from "./package-builder.js";
export type { SyncPackage, SyncPackageOptions } from "./package-builder.js";

// Generators (re-exported for direct use in plugins)
export { generateW3CTokens } from "./generators/tokens.js";
export type { W3CTokensDocument } from "./generators/tokens.js";

export { generateTailwindConfig } from "./generators/tailwind.js";
export type { TailwindMode } from "./generators/tailwind.js";

export { generateCSSVariables } from "./generators/css.js";
export type { CssMode } from "./generators/css.js";

export { generateFigmaTokens, generateFigmaVariables } from "./generators/figma.js";
export type { FigmaTokensDocument, FigmaVariablesDocument } from "./generators/figma.js";

export { generateReadme } from "./generators/readme.js";

export { generateIDML } from "./generators/idml.js";

// Clients
export { uploadToGitHub } from "./clients/github.js";
export type { GitHubSyncConfig, GitHubSyncResult } from "./clients/github.js";

export { uploadToGoogleDrive } from "./clients/drive.js";
export type { GoogleDriveSyncConfig, GoogleDriveSyncResult } from "./clients/drive.js";

// Utilities
export { hashContent, getChangedFiles, buildSyncedFilesMap } from "./utils/hash.js";
export type { SyncFile } from "./utils/hash.js";

export { checkSyncQuota, nextMonthResetDate } from "./utils/quota.js";
