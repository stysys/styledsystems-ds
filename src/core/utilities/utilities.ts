/**
 * Shared UI Utilities
 * Used across all Figma plugins
 */

import type { PluginMessage } from "../types";

/**
 * Send message to plugin backend
 */
export function sendToPlugin(message: PluginMessage): void {
  console.log("[UI] Sending to plugin:", message.type);
  parent.postMessage({ pluginMessage: message }, "*");
}

/**
 * Safe event listener attachment
 */
export function safeAddEventListener(
  el: HTMLElement | null,
  event: string,
  handler: EventListener
): void {
  if (el) {
    el.addEventListener(event, handler);
  }
}

/**
 * Escape HTML characters to prevent XSS
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Validate hex color
 */
export function isValidHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * Check if string is valid SVG
 */
export function isValidSVG(content: string): boolean {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, "image/svg+xml");
    return !doc.getElementsByTagName("parsererror").length;
  } catch {
    return false;
  }
}

/**
 * Canonicalize SVG for comparison
 */
export function canonicalizeSVG(svgString: string): string {
  if (!svgString) return "";
  let svg = String(svgString);

  // Remove XML declaration, comments, DOCTYPE, metadata
  svg = svg.replace(/<\?xml[\s\S]*?\?>/gi, "");
  svg = svg.replace(/<!--[\s\S]*?-->/g, "");
  svg = svg.replace(/<!DOCTYPE[\s\S]*?>/gi, "");
  svg = svg.replace(/<metadata[\s\S]*?<\/metadata>/gi, "");
  svg = svg.replace(/\s(id|data-name)="[^"]*"/g, "");
  svg = svg.replace(/\s{2,}/g, " ");
  svg = svg.replace(/>\s+</g, "><");
  svg = svg.replace(/\r?\n|\t/g, "");

  // Sort attributes properly for all tags and ensure correct spacing
  svg = svg.replace(/<([a-zA-Z0-9:-]+)(\s[^>]*)?>/g, (match, tag, attrs = "") => {
    const trimmedAttrs = attrs.trim();
    if (!trimmedAttrs) return `<${tag}>`;
    const attrRegex = /(\w+)=(".*?"|'.*?')/g;
    const attrPairs: [string, string][] = [];
    let m;
    while ((m = attrRegex.exec(trimmedAttrs))) {
      attrPairs.push([m[1], m[2]]);
    }
    attrPairs.sort((a, b) => a[0].localeCompare(b[0]));
    const sortedAttrs = attrPairs.map(([k, v]) => `${k}=${v}`).join(" ");
    return `<${tag} ${sortedAttrs}>`;
  });

  // Ensure all <path ...> elements are self-closing and have correct spacing (never match <pathd ...>)
  svg = svg.replace(/<path(\s[^>]*)?>(?!<\/path>)/gi, (match, attrs = "") => {
    const trimmedAttrs = attrs.trim();
    return trimmedAttrs ? `<path ${trimmedAttrs} />` : `<path />`;
  });
  // Remove any non-self-closing <path> closing tags
  svg = svg.replace(/<\/path>/gi, "");

  // Fix any accidental <pathd ...> tags (e.g., from SVGO or Figma bugs)
  // This will convert <pathd="..." ...> to <path d="..." ...>
  svg = svg.replace(/<pathd(=)/gi, "<path d$1");

  return svg.trim();
}

/**
 * Calculate SVG fingerprint
 */
export async function getSvgFingerprint(canonicalSvg: string): Promise<string> {
  if (window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(canonicalSvg);
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  return "";
}

/**
 * Show temporary notification
 */
export function showNotification(
  message: string,
  type: "success" | "error" | "info" = "info",
  duration: number = 3000
): void {
  const notification = document.createElement("div");
  notification.className = `notification notification--${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    bottom: 16px;
    right: 16px;
    padding: 12px 16px;
    border-radius: 4px;
    color: white;
    z-index: 1000;
    font-size: 14px;
  `;

  if (type === "success") {
    notification.style.backgroundColor = "#22c55e";
  } else if (type === "error") {
    notification.style.backgroundColor = "#ef4444";
  } else {
    notification.style.backgroundColor = "#3b82f6";
  }

  document.body.appendChild(notification);
  setTimeout(() => {
    notification.remove();
  }, duration);
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function debounced(...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Deep clone object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as any;
  if (obj instanceof Array) return obj.map((item) => deepClone(item)) as any;
  if (obj instanceof Object) {
    const clonedObj = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
  return obj;
}

/**
 * Calculate font size based on base size, ratio, and power (for typography)
 */
/**
 * Convert pixels to rem (16px = 1rem)
 */
export function pxToRem(px: number): string {
  return (px / 16).toFixed(4);
}

/**
 * Generate fluid clamp CSS value
 * Responsive font sizing that scales between min and max viewport widths
 */
export function generateFluidClamp(
  minPx: number,
  maxPx: number,
  minVw: number,
  maxVw: number
): string {
  const minRem = pxToRem(minPx);
  const maxRem = pxToRem(maxPx);

  const slopeVw = ((maxPx - minPx) / (maxVw - minVw)) * 100;
  const interceptRem = pxToRem(minPx - (minVw / 100) * slopeVw);

  return `clamp(${minRem}rem, ${interceptRem}rem + ${slopeVw.toFixed(3)}vw, ${maxRem}rem)`;
}

/**
 * Format number for display (limit decimal places)
 */
export function formatNumber(num: number, decimals: number = 2): string {
  return parseFloat(num.toFixed(decimals)).toString();
}

/**
 * Validate positive number
 */
export function isValidPositiveNumber(value: string): boolean {
  const num = parseFloat(value);
  return !isNaN(num) && num > 0;
}

/**
 * Get all checked semantic names from the UI
 */
export function getCheckedSemanticNames(): string[] {
  const checkedBoxes = document.querySelectorAll(
    'input[name="semantic-checkbox"]:checked'
  ) as NodeListOf<HTMLInputElement>;
  return Array.from(checkedBoxes).map((checkbox) => checkbox.value);
}

/**
 * Load font using Figma's loadFontAsync (via parent message)
 */
export async function loadFont(fontFamily: string, fontWeight: string): Promise<void> {
  return new Promise((resolve) => {
    parent.postMessage(
      {
        pluginMessage: {
          type: "load-font",
          fontFamily,
          fontWeight,
        },
      },
      "*"
    );
    // Resolve after a short delay to allow font to load
    setTimeout(resolve, 100);
  });
}
