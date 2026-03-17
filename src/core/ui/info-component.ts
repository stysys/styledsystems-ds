/**
 * Shared Info Tab Component
 * Handles creating and populating info tab content dynamically
 */

export interface InfoTabOptions {
  containerId?: string;
}

/**
 * Creates the entire info-tab HTML structure dynamically
 * This eliminates the need for hardcoded HTML in each plugin
 */
export function createInfoTab(options: InfoTabOptions = {}): HTMLElement {
  const container = document.createElement("div");
  container.className = "tab-content";
  container.id = "info-tab";

  container.innerHTML = `
    <div class="form">
      <h2 class="form__title">Plugin Information</h2>

      <div class="info-section">
        <h3 class="info-section__title">User Details</h3>
        <div class="info-item">
          <span class="info-item__label">Figma User ID:</span>
          <span class="info-item__value" id="info-figma-user-id">Loading...</span>
        </div>
        <div class="info-item">
          <span class="info-item__label">Email:</span>
          <span class="info-item__value" id="info-email">Loading...</span>
        </div>
        <div class="info-item">
          <span class="info-item__label">Email Status:</span>
          <span class="info-item__value" id="info-email-status">Loading...</span>
        </div>
        <div class="info-item">
          <span class="info-item__label">Subscription:</span>
          <span class="info-item__value" id="info-subscription">Loading...</span>
        </div>
      </div>

      <div class="info-section">
        <h3 class="info-section__title">Plugin Details</h3>
        <div class="info-item">
          <span class="info-item__label">Version:</span>
          <span class="info-item__value" id="plugin-version">Loading...</span>
        </div>
        <div class="info-item">
          <span class="info-item__label">Last Updated:</span>
          <span class="info-item__value" id="plugin-last-updated">Loading...</span>
        </div>
      </div>

      <div class="info-section">
        <h3 class="info-section__title">Resources</h3>
        <div class="info-links">
          <a href="https://styled.systems" target="_blank" class="info-link">Website</a>
          <a href="mailto:support@styled.systems" target="_blank" class="info-link">Support</a>
          <a href="#" id="show-credits-from-info" class="info-link">Credits</a>
        </div>
      </div>
    </div>
  `;

  return container;
}

/**
 * Inserts the info-tab into the DOM by replacing the empty element
 * This is called during UI initialization
 */
export function insertInfoTab(): void {
  console.log("[InfoComponent] insertInfoTab called");
  const placeholder = document.getElementById("info-tab");
  console.log("[InfoComponent] placeholder found:", !!placeholder);
  if (placeholder) {
    console.log(
      "[InfoComponent] placeholder children count:",
      placeholder.children.length
    );
    console.log(
      "[InfoComponent] placeholder innerHTML:",
      placeholder.innerHTML
    );
  }
  if (placeholder && placeholder.children.length === 0) {
    console.log("[InfoComponent] Creating and inserting info tab");
    const infoTab = createInfoTab();
    placeholder.replaceWith(infoTab);
    console.log("[InfoComponent] Info tab inserted");
  } else {
    console.log(
      "[InfoComponent] Placeholder not found or has children, skipping"
    );
  }
}

export function updateUserInfo(status: any): void {
  if (!status) return;

  const figmaUserIdEl = document.getElementById("info-figma-user-id");
  const emailEl = document.getElementById("info-email");
  const emailStatusEl = document.getElementById("info-email-status");

  if (figmaUserIdEl) {
    figmaUserIdEl.textContent =
      status.figmaUserId || status.userId || "Unknown";
  }
  if (emailEl) {
    emailEl.textContent = status.email || "Not provided";
  }
  if (emailStatusEl) {
    emailStatusEl.textContent = status.emailVerified
      ? "Verified"
      : "Not verified";
    emailStatusEl.classList.toggle(
      "info-item__value--verified",
      status.emailVerified
    );
    emailStatusEl.classList.toggle(
      "info-item__value--unverified",
      !status.emailVerified
    );
  }
}
