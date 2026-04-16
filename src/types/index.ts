/**
 * Shared types for the Styled Systems Design System
 */

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

export interface UserStatus {
  email: string | null;
  emailVerified: boolean;
  figmaUserId: string;
  subscription: string;
  createdAt: string;
  // Added for plugin/activation logic compatibility
  isPro?: boolean;
  isBundle?: boolean;
  isLifetime?: boolean;
  trialRemaining?: number;
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
  components?: Record<string, import("../core/plugin-api-types").ComponentToken>;
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
