/**
 * Shared Preview Helpers
 * Common logic for handling preview toggles, overlays, and banners across all plugins
 * Used in preview.html for testing different user states (pro, activated, verified)
 * and in ui.ts for responding to those test messages
 */

/**
 * Preview State Persistence
 * Stores toggle states in localStorage so they persist across page reloads
 */
const PREVIEW_STATE_KEY = "styled-preview-state";

export interface PreviewState {
  pro?: boolean;
  activated?: boolean;
  verified?: boolean;
  unverifiedBanner?: boolean;
  [key: string]: boolean | undefined;
}

export function loadPreviewState(): PreviewState {
  try {
    return JSON.parse(localStorage.getItem(PREVIEW_STATE_KEY) || "{}");
  } catch (e) {
    return {};
  }
}

export function savePreviewState(partial: PreviewState): void {
  try {
    const prev = loadPreviewState();
    const next = Object.assign({}, prev, partial);
    localStorage.setItem(PREVIEW_STATE_KEY, JSON.stringify(next));
  } catch (e) {
    // ignore storage errors
  }
}

export function clearPreviewState(): void {
  try {
    localStorage.removeItem(PREVIEW_STATE_KEY);
  } catch (e) {
    // ignore
  }
}

/**
 * Post message to iframe
 * Used in preview.html to send toggle messages to the plugin UI
 */
export function postPluginMessageToIframe(
  iframe: HTMLIFrameElement,
  payload: any
): void {
  if (!iframe || !iframe.contentWindow) return;
  try {
    iframe.contentWindow.postMessage({ pluginMessage: payload }, "*");
  } catch (e) {
    // ignore cross-origin or other preview errors
  }
}

/**
 * Banner Display Helpers
 * Logic for showing/hiding banners based on user verification state
 */

export interface BannerConfig {
  unverifiedId?: string;
  upsellId?: string;
  proId?: string;
}

export function hideBanners(config: BannerConfig = {}): void {
  const {
    unverifiedId = "unverified-banner",
    upsellId = "upsell-banner",
    proId = "pro-banner",
  } = config;

  const unverified = document.getElementById(unverifiedId);
  const upsell = document.getElementById(upsellId);
  const pro = document.getElementById(proId);

  if (unverified) unverified.classList.add("hidden");
  if (upsell) upsell.classList.add("hidden");
  if (pro) pro.classList.add("hidden");
}

export function showBanner(bannerId: string): void {
  const banner = document.getElementById(bannerId);
  if (banner) {
    banner.classList.remove("hidden");
  }
}

/**
 * Update banner display based on user status
 * Shows appropriate banner: unverified -> upsell -> pro
 */
export function updateBannerDisplay(
  isVerified: boolean,
  isPro: boolean,
  config: BannerConfig = {}
): void {
  const {
    unverifiedId = "unverified-banner",
    upsellId = "upsell-banner",
    proId = "pro-banner",
  } = config;

  hideBanners(config);

  if (isVerified && isPro) {
    showBanner(proId);
  } else if (isVerified && !isPro) {
    showBanner(upsellId);
  } else {
    showBanner(unverifiedId);
  }

  console.log("[Preview] updateBannerDisplay:", {
    isVerified,
    isPro,
    visible: {
      unverified: !isVerified,
      upsell: isVerified && !isPro,
      pro: isPro,
    },
  });
}

/**
 * Overlay Helpers
 */

export interface OverlayConfig {
  activationId?: string;
  upsellId?: string;
}

export function hideOverlay(overlayId: string): void {
  const overlay = document.getElementById(overlayId);
  if (overlay) {
    overlay.classList.add("hidden");
  }
}

export function showOverlay(overlayId: string): void {
  const overlay = document.getElementById(overlayId);
  if (overlay) {
    overlay.classList.remove("hidden");
  }
}

export function setupOverlayHandlers(config: OverlayConfig = {}): void {
  const {
    activationId = "activation-overlay",
    upsellId = "pro-upsell-overlay",
  } = config;

  const overlays = [
    document.getElementById(activationId),
    document.getElementById(upsellId),
  ];

  // Hide overlays on ESC key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      overlays.forEach((overlay) => {
        if (overlay) {
          overlay.classList.add("hidden");
        }
      });
    }
  });

  // Add background click handlers to close
  overlays.forEach((overlay) => {
    if (overlay) {
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
          overlay.classList.add("hidden");
        }
      });
    }
  });
}

/**
 * CTA (Call To Action) Helpers
 * Update "Pro User" badge or "Go Pro!" button
 */

export interface CTAConfig {
  ctaId?: string;
  proUrl?: string;
}

export function updateUserStatusCTA(
  isPro: boolean,
  config: CTAConfig = {}
): void {
  const {
    ctaId = "user-status-cta",
    proUrl = "https://shop.styled.systems/buy/9d7fb914-ccea-4a6b-9b2f-07fcf6cccd42",
  } = config;

  const ctaContainer = document.getElementById(ctaId);
  if (!ctaContainer) return;

  if (isPro) {
    ctaContainer.innerHTML =
      '<span class="user-status-cta user-status-cta--pro">Pro User</span>';
  } else {
    ctaContainer.innerHTML = `<a class="user-status-cta user-status-cta--get-pro" href="${proUrl}" target="_blank">Go Pro!</a>`;
  }
}

/**
 * Toggle Message Handlers
 * Common message type handlers for preview testing
 * Should be called from plugin's handlePluginMessage() switch statement
 */

export interface ToggleMessageHandlers {
  onTogglePro?: (isPro: boolean) => void;
  onToggleActivated?: (isActivated: boolean) => void;
  onToggleVerified?: (isVerified: boolean) => void;
  onToggleActivation?: (show: boolean) => void;
  onToggleUpsell?: (show: boolean) => void;
}

export function handlePreviewToggleMessages(
  message: any,
  handlers: ToggleMessageHandlers = {}
): boolean {
  const {
    onTogglePro,
    onToggleActivated,
    onToggleVerified,
    onToggleActivation,
    onToggleUpsell,
  } = handlers;

  switch (message.type) {
    case "toggle-pro-view":
      if (onTogglePro) {
        onTogglePro(!!message.pro);
      }
      return true;

    case "toggle-activated":
      if (onToggleActivated) {
        onToggleActivated(!!message.activated);
      }
      return true;

    case "toggle-verified":
      if (onToggleVerified) {
        onToggleVerified(!!message.verified);
      }
      return true;

    case "toggle-unverified-banner":
      if (onToggleUpsell) {
        onToggleUpsell(!!message.show);
      }
      return true;

    case "show-activation":
      if (onToggleActivation) {
        onToggleActivation(true);
      }
      return true;

    case "hide-activation":
      if (onToggleActivation) {
        onToggleActivation(false);
      }
      return true;

    default:
      return false;
  }
}

/**
 * Setup UI State from Preview Toggles
 * Combines banner display, CTA updates, and tab access control
 */

export interface UISetupConfig extends BannerConfig, CTAConfig, OverlayConfig {
  cssExportTabId?: string;
}

export function updateUIFromPreviewState(
  isVerified: boolean,
  isPro: boolean,
  config: UISetupConfig = {}
): void {
  const { cssExportTabId = "css-export-tab-btn" } = config;

  // Update banners
  updateBannerDisplay(isVerified, isPro, config);

  // Update CTA
  updateUserStatusCTA(isPro, config);

  // Control CSS Export tab access
  if (cssExportTabId) {
    const tabBtn = document.getElementById(cssExportTabId);
    if (tabBtn) {
      if (isPro) {
        tabBtn.classList.remove("tab--disabled");
      } else {
        tabBtn.classList.add("tab--disabled");
      }
    }
  }
}

/**
 * Update CSS export visibility based on activation status
 * Shows placeholder "Activate to view CSS" when not activated
 * Shows actual CSS code when activated
 */
export function updateCSSExportDisplay(
  isActivated: boolean,
  cssOutputId: string = "css-code-output",
  placeholderText: string = "🔒 Activate to view full CSS code"
): void {
  const cssOutput = document.getElementById(cssOutputId);
  if (!cssOutput) return;

  if (isActivated) {
    // Show actual CSS - remove any placeholder class
    cssOutput.classList.remove("css-locked");
    // Content should be set by the plugin's generateCSS function
  } else {
    // Show placeholder
    cssOutput.classList.add("css-locked");
    cssOutput.textContent = placeholderText;
  }
}
