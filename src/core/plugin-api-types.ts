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
  ramps: Record<string, Record<string, string>>;
  semantic?: Record<string, string>;
}

export interface TypoPayload {
  /** Primary DB field names */
  baseSize?: number;
  scaleRatio?: number;
  bodyLeading?: number;
  headingFont?: string;
  bodyFont?: string;
  /** Vertical rhythm / paragraph spacing */
  rhythm?: {
    /** Independent ratio for paragraph spacing. Falls back to scaleRatio if omitted. */
    spaceScale?: number;
  };
  /** Legacy field names — older Firestore records may use these */
  baseFontSize?: number;
  typeScale?: number;
  fontFamily?: string;
}

/**
 * A single component token — maps to an InDesign object style and a Figma component.
 * All measurements in points (pt). Color fields are swatch name references
 * (e.g. "Blue 500") that must exist in the design system's color tokens.
 *
 * Authoring paths:
 *  - Web app PM  → defines via UI → syncs to InDesign as object style
 *  - InDesign super user → builds frame → plugin reads properties → pushes to backend
 */
export interface ComponentToken {
  /** Human-readable name, becomes the object style name in InDesign */
  name: string;

  // ── Fill & stroke ──────────────────────────────────────────────────────────
  /** Swatch name reference, e.g. "Blue 500" or "surface.raised" */
  fillColor?: string;
  /** Swatch name reference */
  strokeColor?: string;
  /** Stroke weight in pt */
  strokeWeight?: number;

  // ── Shape ──────────────────────────────────────────────────────────────────
  /** Corner radius in pt — applies to all corners */
  cornerRadius?: number;

  // ── Text frame options (InDesign textFramePreferences) ─────────────────────
  /** Inner padding in pt — [top, right, bottom, left] */
  insets?: [number, number, number, number];
  /** Vertical alignment of text content within the frame */
  verticalJustification?: "top" | "center" | "bottom" | "justify";

  // ── Typography default ─────────────────────────────────────────────────────
  /** Default paragraph style name applied to new text in this frame */
  paragraphStyle?: string;

  // ── Variations ─────────────────────────────────────────────────────────────
  /**
   * Name of the base ComponentToken this one inherits from (InDesign "Based On").
   * Only overridden properties are stored — merge with base to get full definition.
   * Stored on the base component's `variations` map, not as a standalone field used at runtime.
   */
  basedOn?: string;
  /**
   * Derived styles keyed by variation name. Each entry stores only the properties
   * that differ from this base component. Resolve full style as: { ...base, ...variation }.
   */
  variations?: Record<string, Partial<Omit<ComponentToken, "name" | "basedOn" | "variations">>>;

  // ── Sample content ─────────────────────────────────────────────────────────
  /**
   * First ≤10 words from each paragraph in the component's text frame.
   * Captured at save time — used as placeholder copy in documentation / preview tools.
   */
  textSample?: string[];

  // ── Meta ───────────────────────────────────────────────────────────────────
  /** Optional description shown in UI */
  description?: string;
}

export interface ComponentPayload {
  components: Record<string, ComponentToken>;
}

export interface DsTokens {
  dsName: string;
  colorPayload: ColorPayload | null;
  typoPayload: TypoPayload | null;
  componentPayload: ComponentPayload | null;
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
  /** Firebase Storage HTTPS download URL. When present the plugin places the
   *  file as a linked graphic instead of converting SVG to native paths. */
  storageUrl?: string;
  /** MIME type hint for the Storage file, e.g. "image/svg+xml", "application/pdf", "image/png" */
  storageFormat?: "svg" | "pdf" | "png";
}
