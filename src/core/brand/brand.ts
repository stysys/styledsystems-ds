/**
 * Shared Brand Logos Module
 * Used by styled-connect and other plugins needing logo management
 */

import { sendToPlugin, canonicalizeSVG, getSvgFingerprint } from "../utilities";
import type { DesignSystem, BrandLogoVariant } from "../types";

const logoVariants = [
  { key: "logoSymbol", label: "Symbol Logo" },
  { key: "logoHorizontal", label: "Horizontal Logo" },
  { key: "logoVertical", label: "Vertical Logo" },
];

/**
 * Render brand logos upload interface
 */
export function renderBrandLogos(designSystem: DesignSystem | null): void {
  const logosArea = document.getElementById("brand-logos-area");
  if (!logosArea) return;

  const brand = (designSystem?.tokens?.brand || {}) as any;
  const variantsArr = Array.isArray(brand.variants) ? brand.variants : [];

  let html = "";
  logoVariants.forEach(({ key, label }) => {
    const variant = variantsArr.find((v: BrandLogoVariant) => v.id === key);
    const hasSVG = variant?.canonical?.minifiedSVG || variant?.canonical?.rawSVG;

    html += `
      <div class="item brand-logo-item">
        <div class="item__header brand-logo-item__header">
          <h4 class="item__label">${label}</h4>
          ${hasSVG ? '<span class="item__badge brand-logo-item__badge">✓ Uploaded</span>' : ""}
        </div>
        <div class="item__preview brand-logo-item__preview" id="preview-${key}">
          ${
            hasSVG
              ? renderSVGPreview(variant?.canonical?.minifiedSVG || variant?.canonical?.rawSVG)
              : '<span class="text-gray-400">No SVG uploaded</span>'
          }
        </div>
        <input 
          type="file" 
          accept="image/svg+xml" 
          id="upload-${key}" 
          data-key="${key}" 
          class="item__input brand-logo-file" 
          style="display:block!important;margin-bottom:8px"
        />
        <button class="btn btn--primary btn--sm item__save-btn brand-logo-save-btn" id="save-${key}" data-key="${key}">
          Upload SVG
        </button>
      </div>
    `;
  });

  logosArea.innerHTML = html;
  attachLogoEventHandlers();
}

/**
 * Render SVG preview (small thumbnail)
 */
function renderSVGPreview(svgContent: string | undefined): string {
  if (!svgContent) return "";
  try {
    return svgContent;
  } catch {
    return '<span class="text-gray-400">Invalid SVG</span>';
  }
}

/**
 * Attach event handlers to logo upload buttons
 */
function attachLogoEventHandlers(): void {
  logoVariants.forEach(({ key }) => {
    const fileInput = document.getElementById(`upload-${key}`) as HTMLInputElement;
    const saveBtn = document.getElementById(`save-${key}`);

    if (fileInput && saveBtn) {
      saveBtn.addEventListener("click", () => {
        fileInput.click();
      });

      fileInput.addEventListener("change", async () => {
        const file = fileInput.files?.[0];
        if (!file || file.type !== "image/svg+xml") {
          alert("Please select a valid SVG file");
          return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
          const rawSVG = e.target?.result as string;
          const canonical = canonicalizeSVG(rawSVG);
          const fingerprint = await getSvgFingerprint(canonical);

          const variant: BrandLogoVariant = {
            id: key,
            brandTokenId: "brand-1",
            variantName:
              key === "logoSymbol"
                ? "Logo Symbol"
                : key === "logoHorizontal"
                  ? "Logo Horizontal"
                  : "Logo Vertical",
            variantDefaultName:
              key === "logoSymbol"
                ? "symbol"
                : key === "logoHorizontal"
                  ? "horizontal"
                  : "vertical",
            variantType:
              key === "logoSymbol"
                ? "symbol"
                : key === "logoHorizontal"
                  ? "horizontal"
                  : "vertical",
            canonical: { rawSVG: canonical },
            fingerprintHash: fingerprint,
            version: "1.0.0",
            updatedBy: "figma-plugin",
            updatedAt: new Date().toISOString(),
          };

          sendToPlugin({
            type: "save-data",
            data: {
              tokens: {
                brand: {
                  variants: [variant],
                },
              },
            },
          });

          // Show success and refresh
          alert(`${key} uploaded successfully!`);
          setTimeout(() => {
            sendToPlugin({ type: "get-design-system" });
          }, 500);
        };
        reader.readAsText(file);
      });
    }
  });
}

/**
 * Show sync status message
 */
export function updateSyncStatus(isInSync: boolean, details: string = ""): void {
  const statusEl = document.getElementById("sync-status-warning");
  if (!statusEl) return;

  if (isInSync) {
    statusEl.style.display = "none";
  } else {
    statusEl.style.display = "block";
    if (details) {
      statusEl.textContent = details;
    }
  }
}

/**
 * Initialize brand logos tab
 */
export function initializeBrandLogos(): void {
  const syncComponentsBtn = document.getElementById("sync-components-btn");
  const syncToDatabaseBtn = document.getElementById("sync-to-db-btn");

  syncComponentsBtn?.addEventListener("click", () => {
    sendToPlugin({ type: "sync-components" });
  });

  syncToDatabaseBtn?.addEventListener("click", () => {
    sendToPlugin({ type: "sync-to-database" });
  });
}
