/**
 * Global overlay handler - closes overlays when clicking background
 * This is a shared utility for all plugins
 *
 * Usage: Call initializeOverlayHandlers() in your plugin's initialization
 */

export function initializeOverlayHandlers(): void {
  document.addEventListener("click", (e: MouseEvent) => {
    const target = e.target as HTMLElement;

    // Close overlay if clicking on the overlay background (not the card)
    if (
      target.classList.contains("overlay") &&
      !target.classList.contains("hidden")
    ) {
      target.classList.add("hidden");

      // Dispatch custom event for plugins that need to react to overlay close
      target.dispatchEvent(new CustomEvent("overlayClose"));
    }
  });
}
