/**
 * Shared Footer Overlays Component
 * Handles Credits and GD Foundry overlay displays and event listeners
 * Centralizes overlay logic to avoid duplication across plugins
 */

export interface FooterOverlayOptions {
  pluginName?: string;
  pluginDescription?: string;
  contactEmail?: string;
  creditsContent?: string; // Plugin-specific HTML content for Credits overlay
}

/**
 * Setup footer link event listeners for both Credits and GD Foundry overlays
 * Call this during UI initialization for your plugin
 */
export function setupFooterOverlays(options: FooterOverlayOptions = {}): void {
  const creditsLink = document.getElementById("show-credits-link");
  if (creditsLink) {
    creditsLink.addEventListener("click", (e) => {
      e.preventDefault();
      showCreditsOverlay(options);
    });
  }

  const creditsLinkFromInfo = document.getElementById("show-credits-from-info");
  if (creditsLinkFromInfo) {
    creditsLinkFromInfo.addEventListener("click", (e) => {
      e.preventDefault();
      showCreditsOverlay(options);
    });
  }

  const gdFoundryLink = document.getElementById("show-gd-foundry");
  if (gdFoundryLink) {
    gdFoundryLink.addEventListener("click", (e) => {
      e.preventDefault();
      showGDFoundryOverlay();
    });
  }
}

/**
 * Show Credits overlay with plugin-specific content
 */
function showCreditsOverlay(options: FooterOverlayOptions = {}): void {
  const old = document.getElementById("credits-overlay");
  if (old) old.remove();

  const overlay = document.createElement("div");
  overlay.id = "credits-overlay";
  overlay.className = "overlay";

  const pluginName = options.pluginName || "Styled Systems";
  const contactEmail = options.contactEmail || "kristoffer@styled.systems";

  // Use custom credits content if provided, otherwise use generic content
  const creditsContent =
    options.creditsContent ||
    `
    <p>
      Heavily thanks to <a href="https://foundry.gardedesign.se/" target="_blank">GD Foundry</a>, <a href="https://utopia.fyi/" target="_blank">utopia.fyi</a> and <a href="https://960.gs" target="_blank">960.gs</a> and others.
    </p>
    <p>
      This plugin is heavily inspired by resources that have been available to the design community for years, sometimes decades. Created by people driven by curiosity and pure passion. It's not here to replace your professionalism, just to maybe speed up your design workflow a bit.
    </p>
    <p>
      If you feel like connecting or sharing thoughts, feel free to write me on <a href="mailto:${contactEmail}" target="_blank">${contactEmail}</a>
    </p>
    <p>Peace and love.</p>
  `;

  overlay.innerHTML = `
    <div class="overlay__card">
      <div class="overlay__content">
        <h2 class="overlay__title">${pluginName}</h2>
        <div class="overlay__desc">
          ${creditsContent}
        </div>
      </div>
      <div class="overlay__actions">
        <a href="#" class="overlay__action overlay__action--skip">Close</a>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay
    .querySelector(".overlay__action--skip")!
    .addEventListener("click", (e) => {
      e.preventDefault();
      overlay.remove();
    });
}

/**
 * Show GD Foundry overlay
 */
export function showGDFoundryOverlay(): void {
  const old = document.getElementById("gd-foundry-overlay");
  if (old) old.remove();

  const overlay = document.createElement("div");
  overlay.id = "gd-foundry-overlay";
  overlay.className = "overlay";

  overlay.innerHTML = `
    <div class="overlay__card">

      <div class="overlay__content">

      <h2 class="overlay__title">GD Foundry!</h2>
        <div class="overlay__desc">
          <p>
            GD Foundry is a type foundry dedicated to creating high-quality, functional typefaces for design and typography. Their work includes typefaces like GD Gaio and GD Octio, which are used throughout Styled Systems plugins.
          </p>
          <p>
            The foundry is known for meticulous attention to detail, comprehensive character sets, and variable font technology that enables flexible, responsive typography across all screen sizes.
          </p>
          <p>
            Discover more at <a href="https://foundry.gardedesign.se" target="_blank">foundry.gardedesign.se</a>
          </p>
        </div>
      </div>
      <div class="overlay__actions">
        <a href="#" class="overlay__action overlay__action--skip">Close</a>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay
    .querySelector(".overlay__action--skip")!
    .addEventListener("click", (e) => {
      e.preventDefault();
      overlay.remove();
    });
}
