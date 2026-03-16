/**
 * Shared Activation & User Types
 * Used across all plugins (Figma, InDesign, etc.)
 */

// Platform identifiers
export type PlatformId = "figma" | "indesign" | "web";

// User & Activation Status
export interface ActivationUserStatus {
  figmaUserId?: string;
  indesignUserId?: string;
  platformUserId?: string;
  email: string | null;
  emailVerified: boolean;
  subscription?: string;
  subscriptionTier: "free" | "pro" | "bundle" | "lifetime";
  createdAt?: string;
  hasBasicAccess: boolean;
  hasCSSExport: boolean;
  hasProFeatures: boolean;
  isPro?: boolean;
  isBundle?: boolean;
  isLifetime?: boolean;
  trialRemaining?: number;
}

// Plugin Access
export interface PluginAccess {
  pluginId: string;
  hasAccess: boolean;
  reason: string;
}

// API Responses & Requests
export interface APIResponse<T = void> {
  success: boolean;
  error?: string;
  message?: string;
  data?: T;
}

export interface CheckStatusResponse {
  email?: string;
  emailVerified?: boolean;
  subscriptionTier?: string;
  hasBasicAccess?: boolean;
  hasCSSExport?: boolean;
  hasProFeatures?: boolean;
  isPro?: boolean;
  isBundle?: boolean;
  isLifetime?: boolean;
  trialRemaining?: number;
}

export interface EnsureUserRequest {
  platformId: PlatformId;
  platformUserId: string;
  email?: string;
  pluginId: string;
}

export interface RequestActivationRequest {
  platformId: PlatformId;
  platformUserId: string;
  email: string;
  pluginId: string;
}

export interface VerifyActivationRequest {
  platformId: PlatformId;
  platformUserId: string;
  email: string;
  code: string;
  pluginId: string;
}

export interface TrackUsageRequest {
  platformId: PlatformId;
  platformUserId: string;
  pluginId: string;
  action: string;
  metadata?: Record<string, any>;
  timestamp?: string;
}

// UI State
export interface PluginMessage {
  type: string;
  data?: any;
  [key: string]: any;
}

export interface UIState {
  currentTab: string;
  isActivationOpen: boolean;
  isVerificationStep: boolean;
  isDataLoaded: boolean;
  [key: string]: any;
}

// Design System related types
export interface BrandLogoVariant {
  id: string;
  brandTokenId: string;
  variantName: string;
  variantDefaultName: string;
  variantType: "symbol" | "horizontal" | "vertical";
  canonical?: {
    rawSVG?: string;
    minifiedSVG?: string;
    vector?: any;
  };
  fingerprintHash: string;
  version: string;
  updatedBy: string;
  updatedAt: string;
}

export interface DesignSystemTokens {
  spacing?: Record<string, number>;
  typography?: Record<string, any>;
  colors?: Record<string, string>;
  brand?: {
    variants: BrandLogoVariant[];
    [key: string]: any;
  };
}

export interface DesignSystem {
  ownerId: string;
  name: string;
  tokens: DesignSystemTokens;
  components: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}
