/**
 * User-related utilities
 */

import type { PlatformId } from "./types";

/**
 * Get the current user's ID from the environment
 * For Figma plugins, this reads from figma.currentUser
 * For InDesign plugins, this reads from UXP userInfo
 * For web, this would come from authentication context
 */
export async function getUserId(platform: PlatformId): Promise<string | null> {
  if (platform === "figma") {
    // @ts-ignore - figma is available in plugin context
    return figma.currentUser?.id || null;
  }

  if (platform === "indesign") {
    try {
      // @ts-ignore - uxp is available in InDesign plugin context
      return require("uxp").userInfo.userId() || null;
    } catch {
      return null;
    }
  }

  // For web platform, authentication would be handled differently
  return null;
}

/**
 * Get the current user's email from the environment
 * For Figma plugins, this reads from figma.currentUser
 * For InDesign plugins, this reads from UXP userInfo
 */
export async function getUserEmail(
  platform: PlatformId,
): Promise<string | null> {
  if (platform === "figma") {
    // @ts-ignore - figma is available in plugin context
    return figma.currentUser?.email || null;
  }

  if (platform === "indesign") {
    try {
      // @ts-ignore - uxp is available in InDesign plugin context
      return require("uxp").userInfo.userEmail() || null;
    } catch {
      console.warn("[Core] Could not get user email from UXP");
      return null;
    }
  }

  return null;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate verification code format (6 digits)
 */
export function isValidVerificationCode(code: string): boolean {
  return /^\d{6}$/.test(code);
}

/**
 * Get user info safely from both Figma and InDesign
 */
export async function getUserInfo(platform: PlatformId) {
  return {
    id: await getUserId(platform),
    email: await getUserEmail(platform),
  };
}
