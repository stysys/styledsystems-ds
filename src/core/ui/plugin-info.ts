/**
 * Plugin Metadata Configuration
 * Each plugin should define its version and release date
 */

export interface PluginInfo {
  name: string;
  version: string;
  lastUpdated: string;
}

/**
 * Populate plugin details in the info tab
 * Call this after updateUserInfo() to display plugin-specific metadata
 */
export function updatePluginDetails(pluginInfo: PluginInfo): void {
  console.log("[PluginInfo] updatePluginDetails called with:", pluginInfo);

  // Fallback to direct ID search if selector doesn't work
  const versionElDirect = document.getElementById("plugin-version");
  const updatedElDirect = document.getElementById("plugin-last-updated");

  console.log("[PluginInfo] versionElDirect:", versionElDirect);
  console.log("[PluginInfo] updatedElDirect:", updatedElDirect);

  if (versionElDirect) {
    versionElDirect.textContent = pluginInfo.version;
    console.log("[PluginInfo] Set version to:", pluginInfo.version);
  }
  if (updatedElDirect) {
    updatedElDirect.textContent = pluginInfo.lastUpdated;
    console.log("[PluginInfo] Set lastUpdated to:", pluginInfo.lastUpdated);
  }
}
