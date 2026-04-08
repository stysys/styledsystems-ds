/**
 * versions/utils.ts — Version numbering and change tracking utilities
 */

import type {
  VersionChanges,
  TokenChange,
} from "./types.js";
import type { DesignSystemTokens } from "../types.js";

// ---------------------------------------------------------------------------
// Version numbering
// ---------------------------------------------------------------------------

/**
 * Increments the patch segment of a semver string.
 * "2.4.1" → "2.4.2", "1.0.0" → "1.0.1"
 */
export function computeNextVersion(currentVersion: string): string {
  const parts = currentVersion.split(".");
  if (parts.length !== 3 || parts.some((p) => isNaN(Number(p)))) {
    throw new Error(
      `Invalid version string: '${currentVersion}'. Expected semver format X.Y.Z`
    );
  }
  const patch = Number(parts[2]) + 1;
  return `${parts[0]}.${parts[1]}.${patch}`;
}

/**
 * Generates a unique version document ID from a version number and a short
 * random suffix to prevent collisions if two drafts start from the same base.
 */
export function generateVersionId(versionNumber: string): string {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `v${versionNumber}-draft-${suffix}`;
}

// ---------------------------------------------------------------------------
// Change tracking
// ---------------------------------------------------------------------------

function diffRecord<T>(
  base: Record<string, T> | undefined,
  updated: Record<string, T> | undefined
): Record<string, TokenChange<T>> | undefined {
  const result: Record<string, TokenChange<T>> = {};
  let hasChanges = false;

  const allKeys = new Set([
    ...Object.keys(base ?? {}),
    ...Object.keys(updated ?? {}),
  ]);

  for (const key of allKeys) {
    const prev = (base ?? {})[key];
    const next = (updated ?? {})[key];

    if (prev === undefined && next !== undefined) {
      result[key] = { value: next, _changeType: "added" };
      hasChanges = true;
    } else if (prev !== undefined && next === undefined) {
      result[key] = { value: prev, _changeType: "deleted", _previousValue: prev };
      hasChanges = true;
    } else if (JSON.stringify(prev) !== JSON.stringify(next)) {
      result[key] = {
        value: next as T,
        _changeType: "modified",
        _previousValue: prev,
      };
      hasChanges = true;
    }
  }

  return hasChanges ? result : undefined;
}

/**
 * Computes a delta (VersionChanges) between two design system token snapshots.
 * Only changed/added/deleted entries are included — unchanged keys are omitted.
 */
export function calculateChangeDelta(
  base: DesignSystemTokens,
  updated: DesignSystemTokens
): VersionChanges {
  const delta: VersionChanges = {};

  // Typography scales
  const baseScales = flattenTypographyScales(base.typography);
  const updatedScales = flattenTypographyScales(updated.typography);
  const scaleDiff = diffRecord(baseScales, updatedScales);
  if (scaleDiff) {
    delta.typography = { ...delta.typography, scales: scaleDiff };
  }

  // Colors
  const colorDiff = diffRecord(base.colors, updated.colors);
  if (colorDiff) {
    delta.colors = colorDiff;
  }

  // Spacing (treated as grid proxy)
  const spacingDiff = diffRecord(
    base.spacing as Record<string, number | string> | undefined,
    updated.spacing as Record<string, number | string> | undefined
  );
  if (spacingDiff) {
    delta.grid = spacingDiff as VersionChanges["grid"];
  }

  return delta;
}

/**
 * Returns true if the VersionChanges object contains at least one change.
 */
export function hasChanges(changes: VersionChanges): boolean {
  return !!(
    changes.typography?.scales ||
    changes.typography?.families ||
    changes.colors ||
    changes.grid
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function flattenTypographyScales(
  typography: DesignSystemTokens["typography"]
): Record<string, { size: number; leading: number }> | undefined {
  if (!typography) return undefined;

  const result: Record<string, { size: number; leading: number }> = {};
  let found = false;

  for (const [key, value] of Object.entries(typography)) {
    if (key === "rhythm") continue;
    if (
      value &&
      typeof value === "object" &&
      "size" in value &&
      "leading" in value
    ) {
      result[key] = { size: (value as any).size, leading: (value as any).leading };
      found = true;
    }
  }

  return found ? result : undefined;
}
