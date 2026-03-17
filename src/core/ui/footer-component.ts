/**
 * Shared Footer Component
 * Handles creating and managing footer content dynamically
 */

export interface FooterOptions {
  brandUrl?: string;
  brandText?: string;
}

/**
 * Creates the footer HTML structure dynamically
 */
export function createFooter(options: FooterOptions = {}): HTMLElement {
  const container = document.createElement("div");
  container.className = "footer__info";

  const brandUrl = options.brandUrl || "https://styled.systems";
  const brandText = options.brandText || "2025 © Styled Systems";

  container.innerHTML = `
    <a href="${brandUrl}" target="_blank" class="footer__brand">
      ${brandText}
    </a>
    <span class="footer__credits">
      <a href="#" id="show-gd-foundry">GD Foundry</a>
      <a href="#" id="show-credits-link">Credits</a>
    </span>
  `;

  return container;
}

/**
 * Inserts the footer into the DOM by replacing the placeholder element
 * This is called during UI initialization
 */
export function insertFooter(options: FooterOptions = {}): void {
  console.log("[FooterComponent] insertFooter called");
  const placeholder = document.getElementById("footer-placeholder");
  console.log("[FooterComponent] placeholder found:", !!placeholder);
  if (placeholder && placeholder.children.length === 0) {
    console.log("[FooterComponent] Creating and inserting footer");
    const footer = createFooter(options);
    placeholder.replaceWith(footer);
    console.log("[FooterComponent] Footer inserted");
  } else {
    console.log(
      "[FooterComponent] Placeholder not found or has children, skipping"
    );
  }
}
