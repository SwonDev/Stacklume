/**
 * Stacklume Extension — Service Worker (Background)
 * Gestiona menús contextuales, atajos y comunicación entre componentes.
 */

// ── Instalación ──────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  // Menú contextual: guardar la página actual
  chrome.contextMenus.create({
    id: "stacklume-save-page",
    title: "Guardar esta página en Stacklume",
    contexts: ["page", "frame"],
  });

  // Menú contextual: guardar un enlace concreto
  chrome.contextMenus.create({
    id: "stacklume-save-link",
    title: "Guardar este enlace en Stacklume",
    contexts: ["link"],
  });

  // Menú contextual: guardar imagen
  chrome.contextMenus.create({
    id: "stacklume-save-image",
    title: "Guardar URL de esta imagen en Stacklume",
    contexts: ["image"],
  });
});

// ── Menú contextual ───────────────────────────────────────────────────────────

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const settings = await getSettings();
  const stacklumeUrl = settings.stacklumeUrl || "https://demo.stacklume.app";

  let targetUrl = "";
  let targetTitle = "";

  if (info.menuItemId === "stacklume-save-page") {
    targetUrl = info.pageUrl || tab.url || "";
    targetTitle = tab.title || "";
  } else if (info.menuItemId === "stacklume-save-link") {
    targetUrl = info.linkUrl || "";
    targetTitle = info.linkText || "";
  } else if (info.menuItemId === "stacklume-save-image") {
    targetUrl = info.srcUrl || "";
    targetTitle = info.srcUrl || "";
  }

  if (!targetUrl) return;

  if (settings.apiToken) {
    // Guardar directamente via MCP
    const result = await saveViaApi(settings, { url: targetUrl, title: targetTitle });
    if (result.success) {
      // Notificación visual en la pestaña activa
      chrome.tabs.sendMessage(tab.id, {
        type: "SHOW_TOAST",
        message: "✓ Guardado en Stacklume",
      }).catch(() => {});
    } else {
      // Si falla, abrir en Stacklume
      openInStacklume(stacklumeUrl, { url: targetUrl, title: targetTitle }, settings);
    }
  } else {
    // Abrir en Stacklume con parámetros
    openInStacklume(stacklumeUrl, { url: targetUrl, title: targetTitle }, settings);
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(
      {
        stacklumeUrl: "https://demo.stacklume.app",
        apiToken: "",
        openMode: "new-tab", // "new-tab" | "existing-tab"
        defaultCategory: "",
      },
      resolve
    );
  });
}

async function saveViaApi(settings, data) {
  const stacklumeUrl = settings.stacklumeUrl.replace(/\/$/, "");
  try {
    const response = await fetch(`${stacklumeUrl}/api/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.apiToken}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/call",
        params: {
          name: "add_link",
          arguments: {
            url: data.url,
            title: data.title || data.url,
            description: data.description || undefined,
            categoryId: settings.defaultCategory || undefined,
            isFavorite: false,
          },
        },
      }),
    });
    const json = await response.json();
    if (json.error) return { success: false, error: json.error.message };
    const result = json.result?.content?.[0]?.text || "";
    if (result.includes("Error") || result.includes("error")) {
      return { success: false, error: result };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function openInStacklume(stacklumeUrl, data, settings) {
  const base = stacklumeUrl.replace(/\/$/, "");
  const params = new URLSearchParams({ "action": "add-link" });
  if (data.url) params.set("url", data.url);
  if (data.title) params.set("title", data.title);
  if (data.description) params.set("description", data.description);

  const targetUrl = `${base}/?${params.toString()}`;

  if (settings.openMode === "existing-tab") {
    // Buscar pestaña existente con Stacklume
    chrome.tabs.query({ url: `${base}/*` }, (tabs) => {
      if (tabs && tabs.length > 0) {
        chrome.tabs.update(tabs[0].id, { active: true, url: targetUrl });
        chrome.windows.update(tabs[0].windowId, { focused: true });
      } else {
        chrome.tabs.create({ url: targetUrl });
      }
    });
  } else {
    chrome.tabs.create({ url: targetUrl });
  }
}

// Exponer helpers para uso desde el popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_SETTINGS") {
    getSettings().then(sendResponse);
    return true;
  }
  if (message.type === "SAVE_VIA_API") {
    getSettings().then((settings) =>
      saveViaApi(settings, message.data).then(sendResponse)
    );
    return true;
  }
  if (message.type === "OPEN_IN_STACKLUME") {
    getSettings().then((settings) => {
      openInStacklume(
        settings.stacklumeUrl || "https://demo.stacklume.app",
        message.data,
        settings
      );
      sendResponse({ success: true });
    });
    return true;
  }
});
