/**
 * versions/types.ts — Firestore schema types for version control and sync
 *
 * Phase 0: Permissions & Version Control
 * Extends the base DesignSystem with org ownership, versioning, asset refs,
 * and sync configuration. Also defines Version, SyncJob, and org-aware User.
 */

import type { DesignSystemTokens } from "../types.js";

// ---------------------------------------------------------------------------
// Roles & permissions
// ---------------------------------------------------------------------------

export type OrganizationRole = "viewer" | "contributor" | "admin";

export type PermissionAction =
  | "read"
  | "createDraft"
  | "editDraft"
  | "submitDraft"
  | "approveVersion"
  | "rejectVersion"
  | "publishVersion"
  | "syncToGitHub"
  | "syncToGoogleDrive"
  | "manageSync";

// ---------------------------------------------------------------------------
// Org-aware user
// ---------------------------------------------------------------------------

export interface OrgMembership {
  role: OrganizationRole;
  addedBy: string; // userId
  addedAt: string; // ISO 8601
}

export interface OrgUser {
  userId: string;
  email: string;
  name: string;
  organizations: Record<string, OrgMembership>; // keyed by organizationId
}

export type OrgUserRef = Pick<OrgUser, "userId" | "name" | "email">;

// ---------------------------------------------------------------------------
// Version
// ---------------------------------------------------------------------------

export type VersionStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "published";

/** Delta for a single token key within a category */
export interface TokenChange<T = unknown> {
  value: T;
  _changeType: "added" | "modified" | "deleted";
  _previousValue?: T;
}

export interface VersionChanges {
  typography?: {
    scales?: Record<
      string,
      TokenChange<{ size: number; leading: number }>
    >;
    families?: Record<string, TokenChange<string[]>>;
  };
  colors?: Record<string, TokenChange<string>>;
  grid?: Record<string, TokenChange<number | string>>;
}

export interface Version {
  versionId: string;
  versionNumber: string; // e.g. "2.5.0"
  baseVersion: string; // e.g. "2.4.1"
  status: VersionStatus;

  createdBy: OrgUserRef & { role: "contributor" | "admin" };
  createdAt: string; // ISO 8601

  changes: VersionChanges;

  commitMessage: string;
  commitDescription?: string;

  submittedAt?: string;

  approvedBy?: OrgUserRef;
  approvedAt?: string;
  approvalNotes?: string;

  rejectedBy?: OrgUserRef;
  rejectedAt?: string;
  rejectionReason?: string;

  publishedAt?: string;
}

// ---------------------------------------------------------------------------
// DesignSystem extensions (sync + versioning fields)
// ---------------------------------------------------------------------------

export interface DesignSystemAssetLogo {
  id: string;
  name: string;
  formats: string[];
  firebaseStoragePath: string;
}

export interface DesignSystemAssets {
  logos?: DesignSystemAssetLogo[];
  brandColors?: {
    swatchImagePath?: string;
  };
}

export interface SyncDestinationConfig {
  type: "github" | "google-drive";
  enabled: boolean;

  config: {
    // GitHub
    repo?: string;
    branch?: string;
    path?: string;

    // Google Drive
    folderId?: string;
    folderName?: string;

    include: {
      tokens: boolean;
      tailwind: boolean;
      css: boolean;
      idml: boolean;
      figma: boolean;
      assets: boolean;
      documentation: boolean;
    };

    formats: {
      tokens: "w3c" | "style-dictionary";
      css: "custom-props" | "scss-vars";
      tailwind: "preset" | "full-config";
    };
  };

  lastSync?: string;
  lastSyncHash?: string;
  status?: "success" | "error" | "pending";
  errorMessage?: string;
  lastSyncedFiles?: Record<string, string>; // filename → content hash

  // GitHub-specific
  lastCommitSha?: string;
  commitUrl?: string;

  // Google Drive-specific
  filesCount?: number;
}

export interface DesignSystemSyncQuota {
  maxSyncsPerDay: number;
  maxSyncsPerMonth: number;
  currentMonth: {
    count: number;
    resetAt: string; // ISO 8601
  };
}

export interface DesignSystemSyncConfig {
  enabled: boolean;
  autoSyncOnPublish: boolean;
  quota?: DesignSystemSyncQuota;
  autoSync?: {
    enabled: boolean;
    debounceMs: number;
    maxPerHour: number;
  };
  destinations: SyncDestinationConfig[];
}

export interface VersionHistoryEntry {
  publishedAt: string;
  publishedBy: string;
  createdBy?: string;
}

/** Augments the base DesignSystem with sync + versioning fields */
export interface SyncableDesignSystem {
  id: string;
  organizationId: string;
  name: string;
  tokens: DesignSystemTokens;
  currentVersion: string;
  versionHistory?: Record<string, VersionHistoryEntry>;
  assets?: DesignSystemAssets;
  sync?: DesignSystemSyncConfig;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// SyncJob
// ---------------------------------------------------------------------------

export type SyncJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "partial";

export interface SyncJobResult {
  destination: "github" | "google-drive";
  success: boolean;
  commitSha?: string;
  commitUrl?: string;
  folderId?: string;
  folderUrl?: string;
  filesCount?: number;
  bytesSynced?: number;
  error?: string;
}

export interface SyncJob {
  jobId: string;
  designSystemId: string;
  status: SyncJobStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  metadata: {
    triggeredBy: "version_approval" | "manual" | "scheduled";
    versionNumber?: string;
    approvedBy?: string;
    manuallyTriggeredBy?: string;
  };
  results?: SyncJobResult[];
}

// ---------------------------------------------------------------------------
// Quota status (returned by checkSyncQuota)
// ---------------------------------------------------------------------------

export interface QuotaStatus {
  allowed: boolean;
  remaining: number;
  resetAt: string | null;
  message?: string;
  needsReset?: boolean;
}
