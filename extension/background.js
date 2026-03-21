/**
 * Stacklume Extension — Service Worker (Background)
 * Gestiona menús contextuales, atajos y comunicación entre componentes.
 */

// ── Seguridad: validación de URL ─────────────────────────────────────────────

/**
 * Valida que una URL sea http: o https: y no un esquema peligroso
 * (javascript:, data:, file:, chrome:, about:, etc.).
 */
function isValidHttpUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

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

  // Menú contextual: guardar todas las pestañas abiertas
  chrome.contextMenus.create({
    id: "stacklume-save-all-tabs",
    title: "Guardar todas las pestañas abiertas",
    contexts: ["page", "frame"],
  });
});

// ── Menú contextual ───────────────────────────────────────────────────────────

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const settings = await getSettings();
  const stacklumeUrl = settings.stacklumeUrl || "http://127.0.0.1:7879";

  // ── Guardar todas las pestañas ──
  if (info.menuItemId === "stacklume-save-all-tabs") {
    await handleSaveAllTabs(settings, tab);
    return;
  }

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

  if (!targetUrl || !isValidHttpUrl(targetUrl)) return;

  if (settings.apiToken) {
    // Guardar directamente via MCP
    const result = await saveViaApi(settings, { url: targetUrl, title: targetTitle });
    if (result.success) {
      const msg = result.duplicate
        ? "Este enlace ya existe en tu biblioteca"
        : "\u2713 Guardado en Stacklume";
      injectNotification(tab.id, msg, result.duplicate ? "info" : "success");
    } else {
      injectNotification(tab.id, result.error || "Error al guardar", "error");
    }
  } else {
    // Abrir en Stacklume con parámetros
    openInStacklume(stacklumeUrl, { url: targetUrl, title: targetTitle }, settings);
  }
});

// ── Guardar todas las pestañas ────────────────────────────────────────────────

async function handleSaveAllTabs(settings, sourceTab) {
  if (!settings.apiToken) {
    injectNotification(
      sourceTab.id,
      "Configura un token de API para guardar pestañas directamente",
      "error"
    );
    return;
  }

  const tabs = await chrome.tabs.query({ currentWindow: true });
  // Filtrar pestañas válidas (excluir chrome://, about:, extensiones, etc.)
  const validTabs = tabs.filter((t) =>
    t.url && (t.url.startsWith("http://") || t.url.startsWith("https://"))
  );

  if (validTabs.length === 0) {
    injectNotification(sourceTab.id, "No hay pestañas válidas para guardar", "info");
    return;
  }

  injectNotification(
    sourceTab.id,
    `Guardando ${validTabs.length} pestañas...`,
    "info"
  );

  let saved = 0;
  let duplicates = 0;
  let errors = 0;

  // Guardar en lotes de 3 para no saturar la API
  for (let i = 0; i < validTabs.length; i += 3) {
    const batch = validTabs.slice(i, i + 3);
    const results = await Promise.allSettled(
      batch.map((t) =>
        saveViaApi(settings, { url: t.url, title: t.title || t.url })
      )
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value.success) {
        if (r.value.duplicate) duplicates++;
        else saved++;
      } else {
        errors++;
      }
    }
  }

  // Resumen
  const parts = [];
  if (saved > 0) parts.push(`${saved} guardadas`);
  if (duplicates > 0) parts.push(`${duplicates} ya existían`);
  if (errors > 0) parts.push(`${errors} con error`);
  const summary = parts.join(", ");

  injectNotification(
    sourceTab.id,
    `\u2713 ${validTabs.length} pestañas procesadas: ${summary}`,
    errors > 0 ? "info" : "success"
  );
}

// ── Notificación inyectada segura ─────────────────────────────────────────────

function injectNotification(tabId, message, type) {
  if (!tabId) return;

  chrome.scripting.executeScript({
    target: { tabId },
    func: (msg, notifType) => {
      // Eliminar notificación previa si existe
      const prev = document.getElementById("__stacklume-notif");
      if (prev) prev.remove();

      const div = document.createElement("div");
      div.id = "__stacklume-notif";

      const bgColors = {
        success: "#0a1628",
        error: "#3b1111",
        info: "#0a1628",
      };
      const textColors = {
        success: "#d4a853",
        error: "#f56565",
        info: "#8492a6",
      };

      div.style.cssText = [
        "position:fixed",
        "top:20px",
        "right:20px",
        "z-index:2147483647",
        "background:" + (bgColors[notifType] || bgColors.success),
        "color:" + (textColors[notifType] || textColors.success),
        "padding:12px 20px",
        "border-radius:8px",
        "font-family:system-ui,sans-serif",
        "font-size:14px",
        "font-weight:500",
        "box-shadow:0 4px 16px rgba(0,0,0,.4)",
        "pointer-events:none",
        "opacity:0",
        "transition:opacity .2s ease",
        "max-width:360px",
        "word-break:break-word",
      ].join(";");

      div.textContent = msg;
      document.body.appendChild(div);

      requestAnimationFrame(() => {
        div.style.opacity = "1";
      });
      setTimeout(() => {
        div.style.opacity = "0";
        setTimeout(() => div.remove(), 200);
      }, 3000);
    },
    args: [message, type],
  }).catch(() => {});
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(
      {
        stacklumeUrl: "http://127.0.0.1:7879",
        apiToken: "",
        openMode: "new-tab", // "new-tab" | "existing-tab"
        defaultCategory: "",
      },
      resolve
    );
  });
}

async function saveViaApi(settings, data) {
  // Validar la URL antes de enviar a la API
  if (!data.url || !isValidHttpUrl(data.url)) {
    return { success: false, error: "URL no válida. Solo se permiten http:// y https://" };
  }
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

    // HTTP 409 = duplicado
    if (response.status === 409) {
      return { success: true, duplicate: true };
    }

    // HTTP 401/403 = token inválido
    if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        error: "Token de API inválido. Verifica en Ajustes \u2192 MCP",
      };
    }

    const json = await response.json();
    if (json.error) {
      if (json.error.code === -32001) {
        return {
          success: false,
          error: "Token de API inválido. Verifica en Ajustes \u2192 MCP",
        };
      }
      return { success: false, error: json.error.message };
    }

    const result = json.result?.content?.[0]?.text || "";
    if (result.includes("Error") || result.includes("error")) {
      // Duplicado reportado por el MCP
      if (
        result.includes("duplicad") ||
        result.includes("409") ||
        result.includes("Ya existe") ||
        result.includes("ya existe")
      ) {
        return { success: true, duplicate: true };
      }
      return { success: false, error: result.slice(0, 120) };
    }

    return { success: true };
  } catch (err) {
    // Errores de red específicos
    if (err.name === "TypeError" && err.message.includes("Failed to fetch")) {
      return {
        success: false,
        error:
          "No se pudo conectar a Stacklume. \u00bfEst\u00e1 la aplicaci\u00f3n abierta?",
      };
    }
    if (!navigator.onLine) {
      return { success: false, error: "Sin conexi\u00f3n a internet" };
    }
    return {
      success: false,
      error: "No se pudo conectar a Stacklume. \u00bfEst\u00e1 la aplicaci\u00f3n abierta?",
    };
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
    if (!message.data?.url || !isValidHttpUrl(message.data.url)) {
      sendResponse({ success: false, error: "URL no válida" });
      return true;
    }
    getSettings().then((settings) =>
      saveViaApi(settings, message.data).then(sendResponse)
    );
    return true;
  }
  if (message.type === "OPEN_IN_STACKLUME") {
    getSettings().then((settings) => {
      openInStacklume(
        settings.stacklumeUrl || "http://127.0.0.1:7879",
        message.data,
        settings
      );
      sendResponse({ success: true });
    });
    return true;
  }
});
