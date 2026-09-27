# FocusGuard — Chrome Extension

This directory contains the Chrome Extension support files for FocusGuard.

## Loading the Extension (Development)

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select this `extension/` folder.
4. The FocusGuard icon will appear in your toolbar.

## What It Does

- **Background service worker** (`background.js`): Tracks time spent on distracting sites using the `chrome.alarms` API (ticks every 5 seconds). When 80% of the daily limit is reached, it fires a warning notification. At 100%, it sends a block message to the active distracting tab.
- **Content script** (`content.js`): Injected into all pages. Listens for `BLOCK` messages from the background and renders a full-screen red block overlay with a motivational quote and two buttons: "5 min more" and "Block for 1 hour".
- **Popup** (`popup.html` + `popup.js`): Shows today's wasted time, daily limit progress bar, Focus Mode toggle, distracting site list, and quick actions.

## Files

```
extension/
├── manifest.json     — MV3 manifest
├── background.js     — Service worker (tracking, limits, blocking)
├── content.js        — Page-level block overlay
├── popup.html        — Toolbar popup UI
├── popup.js          — Popup logic
└── icons/            — Extension icons (place PNGs here)
```

## Icons

Place `icon-16.png`, `icon-48.png`, and `icon-128.png` in the `icons/` subdirectory before loading the extension.
