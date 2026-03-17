/**
 * Shared Tab Management Module
 * Handles tab switching across all plugins with localStorage persistence
 */

const ACTIVE_TAB_STORAGE_KEY = "styled-connect-active-tab";

/**
 * Check if localStorage is available and accessible
 */
function isLocalStorageAvailable(): boolean {
  try {
    const test = "__localStorage_test__";
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Switch to a specific tab
 */
export function switchTab(tabName: string): void {
  // Remove active class from all tabs and contents
  document.querySelectorAll(".tab").forEach((t) => {
    t.classList.remove("tab--active");
  });
  document.querySelectorAll(".tab-content").forEach((tc) => {
    tc.classList.remove("tab-content--active");
  });

  // Add active class to selected tab
  const tab = document.querySelector(`.tab[data-tab="${tabName}"]`);
  const content = document.getElementById(`${tabName}-tab`);

  if (tab) {
    tab.classList.add("tab--active");
  }
  if (content) {
    content.classList.add("tab-content--active");
  }

  // Save to localStorage if available
  if (isLocalStorageAvailable()) {
    try {
      localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, tabName);
      console.log(`[Tabs] Saved active tab: ${tabName}`);
    } catch (e) {
      // Silently fail if localStorage is not available
      console.debug("[Tabs] localStorage not available, tab preference not saved");
    }
  }
}

/**
 * Initialize tab switching event listeners and restore last active tab
 */
export function initializeTabs(): void {
  // Try to restore the last active tab from localStorage if available
  let lastActiveTab: string | null = null;
  const hasLocalStorage = isLocalStorageAvailable();

  console.log(
    `[Tabs] localStorage available: ${hasLocalStorage}, storage key: ${ACTIVE_TAB_STORAGE_KEY}`
  );

  if (hasLocalStorage) {
    try {
      lastActiveTab = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
      console.log(`[Tabs] Retrieved from storage: ${lastActiveTab}`);
    } catch (e) {
      console.debug("[Tabs] Failed to read from localStorage", e);
    }
  }

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", function (this: HTMLElement) {
      const tabName = this.getAttribute("data-tab");
      if (tabName) {
        switchTab(tabName);
      }
    });
  });

  // Switch to last active tab if it exists and is valid
  if (lastActiveTab) {
    const tabElement = document.querySelector(`.tab[data-tab="${lastActiveTab}"]`);
    console.log(
      `[Tabs] Looking for tab element with data-tab="${lastActiveTab}", found: ${!!tabElement}`
    );
    if (tabElement) {
      switchTab(lastActiveTab);
      console.log(`[Tabs] Restored last active tab: ${lastActiveTab}`);
    } else {
      console.warn(`[Tabs] Tab element not found for: ${lastActiveTab}`);
    }
  } else {
    console.log(`[Tabs] No saved tab found, using default`);
  }
}

/**
 * Set a tab as disabled
 */
export function disableTab(tabName: string): void {
  const tab = document.querySelector(`.tab[data-tab="${tabName}"]`) as HTMLElement;
  if (tab) {
    tab.classList.add("tab--disabled");
  }
}

/**
 * Enable a tab
 */
export function enableTab(tabName: string): void {
  const tab = document.querySelector(`.tab[data-tab="${tabName}"]`) as HTMLElement;
  if (tab) {
    tab.classList.remove("tab--disabled");
  }
}

/**
 * Get currently active tab
 */
export function getActiveTab(): string | null {
  const activeTab = document.querySelector(".tab.tab--active");
  return activeTab?.getAttribute("data-tab") || null;
}
