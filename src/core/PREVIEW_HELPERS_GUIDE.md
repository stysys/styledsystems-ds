# Preview Helpers - Shared Testing Pattern

## Overview

The `preview-helpers.ts` module provides a reusable pattern for handling testing/preview functionality across all Figma plugins. This includes:

- **Toggle buttons in preview.html** - Test different user states (pro, activated, verified)
- **Message handling in ui.ts** - Respond to toggle messages and update UI
- **State persistence** - localStorage-based preview state that persists across reloads
- **Banner/Overlay management** - Show/hide upsell and activation overlays
- **CTA updates** - Update "Pro User" badge or "Go Pro!" button

## Architecture

```
preview.html (browser preview)
    ↓ (sends toggle messages)
    ↓ postPluginMessageToIframe()
    ↓
ui.html iframe (plugin UI)
    ↓
ui.ts (onmessage handler)
    ↓ handlePreviewToggleMessages()
    ↓
Banner/Overlay/CTA updates
```

## Usage in preview.html

### 1. Setup Toggle Buttons

```html
<button id="toggle-pro-view">Toggle Pro View</button>
<button id="toggle-activated-view">Toggle Activated</button>
<button id="toggle-verified-view">Toggle Verified</button>
<button id="toggle-unverified-banner">Toggle Unverified Banner</button>
```

### 2. Import and Setup Helpers

```javascript
import {
  loadPreviewState,
  savePreviewState,
  postPluginMessageToIframe,
} from "../../shared-ui/preview-helpers";

const iframe = document.querySelector("iframe");
const __previewState = loadPreviewState();

// Toggle Pro View
const toggleProViewBtn = document.querySelector("#toggle-pro-view");
let proViewActive = false;

toggleProViewBtn.addEventListener("click", () => {
  proViewActive = !proViewActive;
  toggleProViewBtn.textContent = proViewActive
    ? "Show Non-Pro View"
    : "Toggle Pro View";

  savePreviewState({ pro: proViewActive });
  postPluginMessageToIframe(iframe, {
    type: "toggle-pro-view",
    pro: proViewActive,
  });
});

// Restore state on page load
function restoreStateToIframe() {
  const state = loadPreviewState();
  if (state.pro) {
    proViewActive = true;
    toggleProViewBtn.textContent = "Show Non-Pro View";
    postPluginMessageToIframe(iframe, {
      type: "toggle-pro-view",
      pro: true,
    });
  }
  // ... restore other toggles
}

iframe.addEventListener("load", restoreStateToIframe);
```

## Usage in ui.ts

### 1. Setup Message Handlers

```typescript
import {
  handlePreviewToggleMessages,
  updateBannerDisplay,
  updateUserStatusCTA,
  updateUIFromPreviewState,
} from "../../shared-ui/preview-helpers";

function handlePluginMessage(event: MessageEvent): void {
  const message = event.data?.pluginMessage;
  if (!message) return;

  // Handle preview/testing toggles
  const handled = handlePreviewToggleMessages(message, {
    onTogglePro: (isPro) => {
      uiState.userStatus = uiState.userStatus || {};
      uiState.userStatus.isPro = isPro;
      updateUIFromPreviewState(uiState.userStatus.emailVerified, isPro);
    },
    onToggleActivated: (isActivated) => {
      uiState.userStatus = uiState.userStatus || {};
      uiState.userStatus.emailVerified = isActivated;
      updateUIFromPreviewState(isActivated, uiState.userStatus.isPro);
    },
    onToggleVerified: (isVerified) => {
      uiState.userStatus = uiState.userStatus || {};
      uiState.userStatus.emailVerified = isVerified;
      updateUIFromPreviewState(isVerified, uiState.userStatus.isPro);
    },
  });

  if (handled) return; // Message was handled by preview helpers

  // ... rest of plugin message handling
}
```

### 2. Update UI on Status Change

```typescript
function updateUserUI(): void {
  if (!uiState.userStatus) return;

  const isPro = uiState.userStatus.isPro === true;
  const isVerified = uiState.userStatus.emailVerified === true;

  // This handles all banner/CTA/tab updates in one call
  updateUIFromPreviewState(isVerified, isPro, {
    cssExportTabId: "css-export-tab-btn",
    ctaId: "user-status-cta",
    unverifiedId: "unverified-banner",
    upsellId: "upsell-banner",
    proId: "pro-banner",
  });
}
```

## Common Patterns

### Pattern 1: Conditional Tab Access

```typescript
// In tab handler
if (targetTab === "css-export") {
  const isPro = uiState.userStatus?.isPro === true;
  if (!isPro) {
    // Show upsell overlay instead of switching tab
    showOverlay("pro-upsell-overlay");
    return;
  }
}
```

### Pattern 2: Banner Display

```typescript
// Automatically shows correct banner:
// - Unverified user → unverified banner
// - Verified, not pro → upsell banner
// - Pro user → pro banner
updateBannerDisplay(isVerified, isPro);
```

### Pattern 3: Call-to-Action Updates

```typescript
// Updates user status CTA in navigation
updateUserStatusCTA(isPro, {
  ctaId: "user-status-cta",
  proUrl: "https://shop.styled.systems/buy/YOUR-ID",
});
```

## Plugin-Specific Configuration

Each plugin can customize the element IDs used by preview helpers:

```typescript
const helperConfig = {
  // Banner IDs
  unverifiedId: "unverified-banner",
  upsellId: "upsell-banner",
  proId: "pro-banner",

  // CTA ID
  ctaId: "user-status-cta",

  // Overlay IDs
  activationId: "activation-overlay",
  upsellId: "pro-upsell-overlay",

  // Tab IDs
  cssExportTabId: "css-export-tab-btn",
};

updateUIFromPreviewState(isVerified, isPro, helperConfig);
```

## Available Functions

### State Management

- `loadPreviewState()` - Load preview toggles from localStorage
- `savePreviewState(partial)` - Save preview toggles to localStorage
- `clearPreviewState()` - Clear all preview state

### Banner Management

- `hideBanners(config)` - Hide all banners
- `showBanner(bannerId)` - Show specific banner
- `updateBannerDisplay(isVerified, isPro, config)` - Show appropriate banner based on status

### Overlay Management

- `hideOverlay(overlayId)` - Hide specific overlay
- `showOverlay(overlayId)` - Show specific overlay
- `setupOverlayHandlers(config)` - Setup ESC key and background click handlers

### CTA Management

- `updateUserStatusCTA(isPro, config)` - Update Pro User badge or Go Pro! button

### Message Handling

- `handlePreviewToggleMessages(message, handlers)` - Central message router for preview toggles
- `postPluginMessageToIframe(iframe, payload)` - Send message to plugin iframe

### Combined Updates

- `updateUIFromPreviewState(isVerified, isPro, config)` - One-call update for banners, CTA, tabs

## Message Types

All plugins support these standard message types:

| Type                       | Payload                  | Purpose                     |
| -------------------------- | ------------------------ | --------------------------- |
| `toggle-pro-view`          | `{ pro: boolean }`       | Toggle pro feature access   |
| `toggle-activated`         | `{ activated: boolean }` | Toggle email verification   |
| `toggle-verified`          | `{ verified: boolean }`  | Toggle verification state   |
| `toggle-unverified-banner` | `{ show: boolean }`      | Show/hide unverified banner |
| `show-activation`          | -                        | Show activation overlay     |
| `hide-activation`          | -                        | Hide activation overlay     |

## Example: Full Implementation in styled-buttons

See `plugins/styled-buttons/preview.html` and `plugins/styled-buttons/ui.ts` for a complete working example using these shared helpers.

## Benefits

✅ **DRY** - No code duplication across plugins
✅ **Consistent** - Same behavior and UI patterns everywhere
✅ **Testable** - Easy to test different user states in preview mode
✅ **Maintainable** - Bug fixes and improvements apply to all plugins
✅ **Extensible** - Custom handlers for plugin-specific logic
✅ **Performance** - Optimized state management and DOM operations
