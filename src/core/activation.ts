/**
 * Activation and subscription logic
 * Shared across all plugins
 */

import type {
  ActivationUserStatus,
  PlatformId,
  PluginAccess,
  CheckStatusResponse,
  EnsureUserRequest,
  RequestActivationRequest,
  VerifyActivationRequest,
  TrackUsageRequest,
  APIResponse,
} from "./types.js";

const API_BASE_URL = "https://styled.systems";

/**
 * Check if a user has access to a specific plugin
 */
export function hasPluginAccess(
  status: ActivationUserStatus,
  pluginId: string,
): PluginAccess {
  // Email verified users have basic access to all plugins
  if (status.emailVerified) {
    return {
      pluginId,
      hasAccess: true,
      reason: "Email verified - basic access granted",
    };
  }

  // Non-verified users can use trial (if available)
  if (status.trialRemaining && status.trialRemaining > 0) {
    return {
      pluginId,
      hasAccess: true,
      reason: `Trial access - ${status.trialRemaining} uses remaining`,
    };
  }

  return {
    pluginId,
    hasAccess: false,
    reason: "Trial exhausted - please verify email",
  };
}

/**
 * Check if user has Pro features
 */
export function hasProFeatures(status: ActivationUserStatus): boolean {
  return (
    status.isPro === true ||
    status.isBundle === true ||
    status.isLifetime === true
  );
}

/**
 * Check if user has CSS export capability
 */
export function hasCSSExport(status: ActivationUserStatus): boolean {
  // Email verified users get CSS export
  if (status.emailVerified) return true;

  // Pro users always get CSS export
  return hasProFeatures(status);
}

/**
 * Check if user is on a bundle subscription
 */
export function isBundle(status: ActivationUserStatus): boolean {
  return status.isBundle === true;
}

/**
 * Check if user is on a lifetime subscription
 */
export function isLifetime(status: ActivationUserStatus): boolean {
  return status.isLifetime === true;
}

/**
 * Get list of plugins user has access to
 * For bundle/lifetime users, returns all plugins
 * For single-plugin users, returns only their purchased plugin
 */
export function getEnabledPlugins(status: ActivationUserStatus): string[] {
  if (status.isBundle === true || status.isLifetime === true) {
    return ["styled-typo", "styled-colors", "styled-buttons"];
  }

  // Single plugin Pro users
  if (status.isPro === true) {
    return ["styled-typo"]; // This should come from backend
  }

  // Verified users have basic access to all plugins
  if (status.emailVerified) {
    return ["styled-typo", "styled-colors", "styled-buttons"];
  }

  return [];
}

/**
 * Fetch user activation status from API
 */
export async function fetchActivationStatus(
  platformId: PlatformId,
  platformUserId: string | null,
  pluginId: string,
): Promise<ActivationUserStatus> {
  if (!platformUserId) {
    throw new Error("User ID is required");
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/${platformId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Action": "check-status",
      },
      body: JSON.stringify({
        platformId,
        platformUserId,
        pluginId,
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data: CheckStatusResponse = await response.json();

    // Calculate hasCSSExport: email verified users OR pro users get CSS export
    const emailVerified = data.emailVerified || false;
    const isPro = data.isPro || false;
    const isBundle = data.isBundle || false;
    const isLifetime = data.isLifetime || false;
    const calculatedHasCSSExport =
      emailVerified || isPro || isBundle || isLifetime;

    return {
      platformUserId,
      email: data.email || null,
      emailVerified,
      subscriptionTier: (data.subscriptionTier || "free") as
        | "free"
        | "pro"
        | "bundle"
        | "lifetime",
      hasBasicAccess: data.hasBasicAccess || false,
      hasCSSExport: calculatedHasCSSExport,
      hasProFeatures: data.hasProFeatures || false,
      isPro,
      isBundle,
      isLifetime,
      trialRemaining: data.trialRemaining ?? 3,
    };
  } catch (error) {
    console.error("[Core] Error fetching activation status:", error);
    throw error;
  }
}

/**
 * Ensure user exists in backend
 */
export async function ensureUser(
  request: EnsureUserRequest,
): Promise<APIResponse> {
  if (!request.platformUserId) {
    return {
      success: false,
      error: "User ID is required",
    };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/${request.platformId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Action": "ensure-user",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return { success: true };
  } catch (error) {
    console.error("[Core] Error ensuring user:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Request activation email
 */
export async function requestActivation(
  request: RequestActivationRequest,
): Promise<APIResponse> {
  if (!request.platformUserId) {
    return {
      success: false,
      error: "User ID is required",
    };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/${request.platformId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Action": "request-activation",
      },
      body: JSON.stringify(request),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.message || "Failed to send verification code",
      };
    }

    return { success: true, data };
  } catch (error) {
    console.error("[Core] Error requesting activation:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Verify activation code
 */
export async function verifyActivation(
  request: VerifyActivationRequest,
): Promise<APIResponse<{ unlocked: boolean }>> {
  if (!request.platformUserId) {
    return {
      success: false,
      error: "User ID is required",
    };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/${request.platformId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Action": "verify-activation",
      },
      body: JSON.stringify(request),
    });

    const data = await response.json();

    if (!response.ok || !data.unlocked) {
      return {
        success: false,
        message: data.message || "Verification failed",
      };
    }

    return { success: true, data };
  } catch (error) {
    console.error("[Core] Error verifying activation:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Track plugin usage
 */
export async function trackUsage(request: TrackUsageRequest): Promise<void> {
  if (!request.platformUserId) {
    console.warn("[Core] Cannot track usage: User ID is required");
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/${request.platformId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Action": "track-usage",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      console.warn("[Core] Failed to track usage:", await response.text());
    }
  } catch (error) {
    console.warn("[Core] Error tracking usage:", error);
  }
}

/**
 * Create default user status for offline/error scenarios
 */
export function createDefaultStatus(
  platformUserId: string,
  maxTrialAttempts: number = 3,
): ActivationUserStatus {
  return {
    platformUserId,
    email: null,
    emailVerified: false,
    subscriptionTier: "free",
    hasBasicAccess: true,
    hasCSSExport: false,
    hasProFeatures: false,
    isPro: false,
    isBundle: false,
    isLifetime: false,
    trialRemaining: maxTrialAttempts,
  };
}
