# Stacklume Extension -- Permissions Justification

This document explains why each permission is required by the Stacklume browser extension.

## `permissions`

### `activeTab`
Read the URL, title, and favicon of the current active tab when the user clicks the extension icon or uses the keyboard shortcut (Alt+S). This is the core functionality: the user explicitly triggers the extension to save the current page.

### `storage`
Persist extension settings (Stacklume instance URL, API token, open mode preference, default category) across browser sessions using `chrome.storage.sync`. Settings sync across the user's Chrome profiles.

### `contextMenus`
Provide right-click context menu entries:
- "Save this page to Stacklume" (on pages)
- "Save this link to Stacklume" (on hyperlinks)
- "Save image URL to Stacklume" (on images)
- "Save all open tabs" (batch save)

### `tabs`
Query all tabs in the current window for the "Save all open tabs" feature. Also used to find an existing Stacklume tab when the user prefers to reuse tabs instead of opening new ones.

### `scripting`
Inject a small script into the active tab to extract page metadata (`<meta>` og:title, og:description, og:image, favicon `<link>` tags). The script only reads DOM metadata elements -- it does NOT access cookies, localStorage, sessionStorage, or any user data on the visited page. Also used to inject a brief notification toast after saving via context menu.

## `host_permissions`

### `http://*/*` and `https://*/*`
Required for two purposes:
1. **Metadata extraction**: The `scripting` permission needs host access to inject the metadata-reading script on any page the user visits.
2. **API communication**: The extension sends saved links to the user's self-hosted Stacklume instance, which can run on any URL (localhost, LAN IP, custom domain). Without broad host permissions, the extension could not connect to arbitrary user-configured servers.

## Data handling

- The extension sends data **only** to the user's configured Stacklume instance (localhost by default).
- No data is sent to third-party servers.
- No telemetry, analytics, or tracking of any kind.
- The API token is stored in `chrome.storage.sync` (encrypted by the browser).
- The injected content script reads only `<meta>` and `<link>` tags -- never cookies, localStorage, or sensitive page data.
