/**
 * Plugin REST API Types
 *
 * Shared type contracts for the styled.systems plugin API endpoints.
 * Used by all plugin consumers (Figma, InDesign) to ensure consistent
 * request/response shapes.
 */

export interface PluginDesignSystem {
  id: string;
  name: string;
  orgId: string;
}

export interface ColorPayload {
  ramps: Record<string, Record<number, string>>;
  semantic?: Record<string, string>;
}

export interface TypoPayload {
  baseFontSize: number;
  typeScale: number;
  fontFamily: string;
}

export interface DsTokens {
  dsName: string;
  colorPayload: ColorPayload | null;
  typoPayload: TypoPayload | null;
}

export interface TokenVersion {
  id: string;
  status: "published" | "archived";
  createdAt: string | null;
  label: string;
}

export interface DsVersions {
  color: TokenVersion[];
  typography: TokenVersion[];
}

export type UserRole = "admin" | "editor" | "viewer";

/** Lightweight brand variant as returned by the plugin API. */
export interface PluginBrandVariant {
  id: "logoSymbol" | "logoHorizontal" | "logoVertical";
  variantName: string;
  minifiedSVG: string;
}
