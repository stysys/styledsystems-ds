/**
 * versions/draft.ts — Draft creation and editing
 *
 * Pure functions. Callers handle Firestore persistence.
 */

import type {
  Version,
  VersionChanges,
  OrgUserRef,
  OrganizationRole,
  SyncableDesignSystem,
} from "./types.js";
import { computeNextVersion, generateVersionId, hasChanges } from "./utils.js";

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

/**
 * Creates a new draft Version document from the current design system state.
 * Does not write to Firestore — caller must persist the returned object.
 */
export function createDraft(
  designSystem: SyncableDesignSystem,
  createdBy: OrgUserRef,
  creatorRole: "contributor" | "admin",
  changes: VersionChanges,
  commitMessage: string,
  commitDescription?: string
): Version {
  const nextVersion = computeNextVersion(designSystem.currentVersion);
  const versionId = generateVersionId(nextVersion);

  return {
    versionId,
    versionNumber: nextVersion,
    baseVersion: designSystem.currentVersion,
    status: "draft",
    createdBy: { ...createdBy, role: creatorRole },
    createdAt: new Date().toISOString(),
    changes,
    commitMessage,
    commitDescription,
  };
}

// ---------------------------------------------------------------------------
// Edit
// ---------------------------------------------------------------------------

/**
 * Merges new changes into an existing draft.
 * Only drafts with status 'draft' can be edited.
 */
export function updateDraft(
  version: Version,
  changes: VersionChanges,
  commitMessage?: string,
  commitDescription?: string
): Version {
  if (version.status !== "draft") {
    throw new Error(
      `Cannot edit version '${version.versionId}': status is '${version.status}', expected 'draft'`
    );
  }

  return {
    ...version,
    changes: mergeChanges(version.changes, changes),
    ...(commitMessage !== undefined && { commitMessage }),
    ...(commitDescription !== undefined && { commitDescription }),
  };
}

// ---------------------------------------------------------------------------
// Submit
// ---------------------------------------------------------------------------

/**
 * Transitions a draft to 'submitted' status, ready for admin review.
 * Throws if the draft has no meaningful changes.
 */
export function submitDraft(version: Version): Version {
  if (version.status !== "draft") {
    throw new Error(
      `Cannot submit version '${version.versionId}': status is '${version.status}', expected 'draft'`
    );
  }

  if (!hasChanges(version.changes)) {
    throw new Error(
      `Cannot submit version '${version.versionId}': no changes recorded`
    );
  }

  return {
    ...version,
    status: "submitted",
    submittedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Deep-merges two VersionChanges objects. Later entries win on conflict.
 */
function mergeChanges(base: VersionChanges, overlay: VersionChanges): VersionChanges {
  return {
    typography: {
      scales: { ...base.typography?.scales, ...overlay.typography?.scales },
      families: { ...base.typography?.families, ...overlay.typography?.families },
    },
    colors: { ...base.colors, ...overlay.colors },
    grid: { ...base.grid, ...overlay.grid },
  };
}
