/**
 * versions/permissions.ts — Role-based permission checks
 *
 * Pure functions — no Firestore access. Takes data objects and returns booleans.
 * Callers are responsible for fetching the user and design system from Firestore.
 */

import type {
  OrgUser,
  OrganizationRole,
  PermissionAction,
  SyncableDesignSystem,
} from "./types.js";

// ---------------------------------------------------------------------------
// Role hierarchy
// ---------------------------------------------------------------------------

const ROLE_RANK: Record<OrganizationRole, number> = {
  viewer: 0,
  contributor: 1,
  admin: 2,
};

function atLeast(role: OrganizationRole, required: OrganizationRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[required];
}

// ---------------------------------------------------------------------------
// Permission matrix
// ---------------------------------------------------------------------------

const PERMISSION_MATRIX: Record<PermissionAction, OrganizationRole> = {
  read: "viewer",
  createDraft: "contributor",
  editDraft: "contributor",
  submitDraft: "contributor",
  approveVersion: "admin",
  rejectVersion: "admin",
  publishVersion: "admin",
  syncToGitHub: "admin",
  syncToGoogleDrive: "admin",
  manageSync: "admin",
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the user's role in the design system's organization, or null if
 * they are not a member.
 */
export function getUserRole(
  user: OrgUser,
  designSystem: SyncableDesignSystem
): OrganizationRole | null {
  const membership = user.organizations[designSystem.organizationId];
  return membership?.role ?? null;
}

/**
 * Returns true if the user has permission to perform the given action
 * on the design system.
 */
export function hasPermission(
  user: OrgUser,
  designSystem: SyncableDesignSystem,
  action: PermissionAction
): boolean {
  const role = getUserRole(user, designSystem);
  if (!role) return false;
  return atLeast(role, PERMISSION_MATRIX[action]);
}

/**
 * Throws if the user does not have permission to perform the action.
 */
export function requirePermission(
  user: OrgUser,
  designSystem: SyncableDesignSystem,
  action: PermissionAction
): void {
  if (!hasPermission(user, designSystem, action)) {
    const role = getUserRole(user, designSystem);
    const required = PERMISSION_MATRIX[action];
    throw new Error(
      role
        ? `Insufficient permissions: '${action}' requires '${required}' role, user has '${role}'`
        : `Access denied: user is not a member of organization '${designSystem.organizationId}'`
    );
  }
}

/**
 * Returns all actions the user is permitted to perform on the design system.
 */
export function getAllowedActions(
  user: OrgUser,
  designSystem: SyncableDesignSystem
): PermissionAction[] {
  return (Object.keys(PERMISSION_MATRIX) as PermissionAction[]).filter(
    (action) => hasPermission(user, designSystem, action)
  );
}
