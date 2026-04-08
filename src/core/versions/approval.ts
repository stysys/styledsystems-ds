/**
 * versions/approval.ts — Approval, rejection, and publish workflow
 *
 * Pure functions. Callers handle Firestore persistence and sync triggering.
 */

import type {
  Version,
  OrgUserRef,
  SyncableDesignSystem,
} from "./types.js";

// ---------------------------------------------------------------------------
// Approve
// ---------------------------------------------------------------------------

/**
 * Transitions a submitted version to 'approved' status.
 * Only versions with status 'submitted' can be approved.
 */
export function approveVersion(
  version: Version,
  approvedBy: OrgUserRef,
  approvalNotes?: string
): Version {
  if (version.status !== "submitted") {
    throw new Error(
      `Cannot approve version '${version.versionId}': status is '${version.status}', expected 'submitted'`
    );
  }

  return {
    ...version,
    status: "approved",
    approvedBy,
    approvedAt: new Date().toISOString(),
    approvalNotes,
  };
}

// ---------------------------------------------------------------------------
// Reject
// ---------------------------------------------------------------------------

/**
 * Transitions a submitted version back to 'rejected' status.
 * The contributor can create a new draft based on the rejection feedback.
 */
export function rejectVersion(
  version: Version,
  rejectedBy: OrgUserRef,
  rejectionReason: string
): Version {
  if (version.status !== "submitted") {
    throw new Error(
      `Cannot reject version '${version.versionId}': status is '${version.status}', expected 'submitted'`
    );
  }

  return {
    ...version,
    status: "rejected",
    rejectedBy,
    rejectedAt: new Date().toISOString(),
    rejectionReason,
  };
}

// ---------------------------------------------------------------------------
// Publish
// ---------------------------------------------------------------------------

/**
 * Transitions an approved version to 'published' status.
 * Returns both the updated Version and a partial DesignSystem update
 * (currentVersion + versionHistory entry) that the caller should write
 * to the parent DesignSystem document.
 */
export function publishVersion(
  version: Version,
  publishedBy: OrgUserRef
): {
  version: Version;
  designSystemUpdate: {
    currentVersion: string;
    versionHistory: Record<
      string,
      { publishedAt: string; publishedBy: string; createdBy?: string }
    >;
  };
} {
  if (version.status !== "approved") {
    throw new Error(
      `Cannot publish version '${version.versionId}': status is '${version.status}', expected 'approved'`
    );
  }

  const publishedAt = new Date().toISOString();

  const updatedVersion: Version = {
    ...version,
    status: "published",
    publishedAt,
  };

  const designSystemUpdate = {
    currentVersion: version.versionNumber,
    versionHistory: {
      [version.versionNumber]: {
        publishedAt,
        publishedBy: publishedBy.userId,
        createdBy:
          version.createdBy.userId !== publishedBy.userId
            ? version.createdBy.userId
            : undefined,
      },
    },
  };

  return { version: updatedVersion, designSystemUpdate };
}

// ---------------------------------------------------------------------------
// Auto-sync check
// ---------------------------------------------------------------------------

/**
 * Returns true if the design system is configured to automatically sync
 * when a version is published.
 */
export function shouldAutoSync(designSystem: SyncableDesignSystem): boolean {
  return !!(
    designSystem.sync?.enabled &&
    designSystem.sync.autoSyncOnPublish &&
    designSystem.sync.destinations.some((d) => d.enabled)
  );
}

/**
 * Returns the enabled sync destinations for a design system.
 */
export function getEnabledDestinations(designSystem: SyncableDesignSystem) {
  return designSystem.sync?.destinations.filter((d) => d.enabled) ?? [];
}
