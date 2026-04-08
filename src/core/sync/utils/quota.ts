/**
 * sync/utils/quota.ts — Sync quota enforcement
 *
 * Pure functions — no Firestore access. Caller reads/writes the quota fields.
 */

import type { SyncableDesignSystem, QuotaStatus } from "../../versions/types.js";

/**
 * Checks whether the design system has remaining quota for a sync operation.
 * Returns a QuotaStatus with `needsReset: true` when the monthly counter has
 * passed its reset date — caller should zero the counter in Firestore before
 * proceeding with the sync.
 */
export function checkSyncQuota(designSystem: SyncableDesignSystem): QuotaStatus {
  const quota = designSystem.sync?.quota;

  if (!quota) {
    return {
      allowed: true,
      remaining: Infinity,
      resetAt: null,
    };
  }

  const now = new Date();
  const resetDate = new Date(quota.currentMonth.resetAt);

  // Counter expired — allow sync and signal caller to reset
  if (now >= resetDate) {
    return {
      allowed: true,
      remaining: quota.maxSyncsPerMonth,
      resetAt: nextMonthReset().toISOString(),
      needsReset: true,
    };
  }

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
 * Returns an ISO 8601 string for the start of the next calendar month.
 * Use this to set `quota.currentMonth.resetAt` when resetting the counter.
 */
export function nextMonthResetDate(): string {
  return nextMonthReset().toISOString();
}

function nextMonthReset(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}
