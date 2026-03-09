/**
 * Stacklume Extension — Popup Script
 */

// ── Estado global ─────────────────────────────────────────────────────────────

let currentTab = null;
let pageMetadata = null;
let settings = {};
let isFavorite = false;
let categories = [];

// ── Elementos DOM ─────────────────────────────────────────────────────────────

const $ = (id) => document.getElementById(id);

const els = {
  statusSaved:      $("status-saved"),
  pageTitle:        $("page-display-title"),
  pageUrl:          $("page-display-url"),
  pageFavicon:      $("page-favicon"),
  faviconFallback:  $("favicon-fallback"),
  inputTitle:       $("input-title"),
  inputDescription: $("input-description"),
  selectCategory:   $("select-category"),
  categoryGroup:    $("category-group"),
  btnFavorite:      $("btn-favorite"),
  btnOpen:          $("btn-open"),
  btnSave:          $("btn-save"),
  saveLabel:        $("save-label"),
  overlayLoading:   $("overlay-loading"),
  overlaySuccess:   $("overlay-success"),
  overlayError:     $("overlay-error"),
  errorMessage:     $("error-message"),
  successMessage:   $("success-message"),
  btnRetry:         $("btn-retry"),
  noTokenHint:      $("no-token-hint"),
  hintConfig:       $("hint-config"),
  btnSettings:      $("btn-settings"),
};

// ── Inicialización ────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {
  // Cargar ajustes y pestaña activa en paralelo
  [settings, currentTab] = await Promise.all([
    loadSettings(),
    getActiveTab(),
  ]);

  if (!currentTab) {
    showError("No se pudo acceder a la pestaña activa.");
    return;
  }

  // Mostrar info básica de la pestaña
  renderPagePreview(currentTab.url, currentTab.title, null);

  // Extraer metadatos ricos del content script
  pageMetadata = await extractMetadata(currentTab);
  if (pageMetadata) {
    renderPagePreview(pageMetadata.url, pageMetadata.title, pageMetadata.faviconUrl);
    els.inputTitle.value = pageMetadata.title;
    els.inputDescription.value = pageMetadata.description || "";
  } else {
    els.inputTitle.value = currentTab.title || "";
  }

  // Token configurado → modo directo disponible
  if (settings.apiToken) {
    els.noTokenHint.classList.add("hidden");
    els.saveLabel.textContent = "Guardar";

    // Cargar categorías y verificar si ya está guardado en paralelo
    const [cats, alreadySaved] = await Promise.all([
      loadCategories(),
      checkAlreadySaved(currentTab.url),
    ]);
    categories = cats;
    populateCategorySelect(cats);

    if (alreadySaved) {
      els.statusSaved.classList.remove("hidden");
      els.saveLabel.textContent = "Guardado";
      els.btnSave.disabled = true;
    }
  } else {
    // Sin token: solo modo "Abrir en Stacklume"
    els.noTokenHint.classList.remove("hidden");
    els.categoryGroup.classList.add("hidden");
    els.saveLabel.textContent = "Abrir";
  }

  // Event listeners
  els.btnFavorite.addEventListener("click", toggleFavorite);
  els.btnOpen.addEventListener("click", handleOpenInStacklume);
  els.btnRetry.addEventListener("click", resetOverlays);
  els.btnSettings.addEventListener("click", () => chrome.runtime.openOptionsPage());
  els.hintConfig.addEventListener("click", () => chrome.runtime.openOptionsPage());
  document.getElementById("form-add-link").addEventListener("submit", handleSave);
});

// ── Carga de datos ────────────────────────────────────────────────────────────

function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(
      {
        stacklumeUrl: "http://127.0.0.1:7879",
        apiToken: "",
        openMode: "new-tab",
        defaultCategory: "",
      },
      resolve
    );
  });
}

function getActiveTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs?.[0] || null);
    });
  });
}

async function extractMetadata(tab) {
  if (!tab?.id) return null;
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const getMeta = (name) =>
          document.querySelector(`meta[property="${name}"]`)?.content ||
          document.querySelector(`meta[name="${name}"]`)?.content || '';
        const canonical = document.querySelector('link[rel="canonical"]');
        const favicon =
          document.querySelector('link[rel="apple-touch-icon"]')?.href ||
          document.querySelector('link[rel="icon"]')?.href ||
          document.querySelector('link[rel="shortcut icon"]')?.href || '';
        return {
          url: canonical?.href || window.location.href,
          title: getMeta('og:title') || document.title || '',
          description: getMeta('og:description') || getMeta('description') || '',
          faviconUrl: favicon || `${window.location.origin}/favicon.ico`,
          siteName: getMeta('og:site_name') || '',
          author: getMeta('author') || getMeta('article:author') || '',
        };
      },
    });
    return results[0]?.result || null;
  } catch {
    // scripting no disponible (chrome://, about:, páginas de extensión, etc.)
    return null;
  }
}

async function loadCategories() {
  if (!settings.apiToken) return [];
  const base = (settings.stacklumeUrl || "").replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/api/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.apiToken}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "list_categories", arguments: {} },
      }),
    });
    const json = await res.json();
    const text = json?.result?.content?.[0]?.text || "[]";
    // El MCP devuelve JSON como texto
    try {
      const data = JSON.parse(text);
      return Array.isArray(data) ? data : data.categories || [];
    } catch {
      return [];
    }
  } catch {
    return [];
  }
}

async function checkAlreadySaved(url) {
  if (!settings.apiToken || !url) return false;
  const base = (settings.stacklumeUrl || "").replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/api/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.apiToken}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "list_links", arguments: { limit: 200 } },
      }),
    });
    const json = await res.json();
    const text = json?.result?.content?.[0]?.text || "[]";
    try {
      const data = JSON.parse(text);
      const links = Array.isArray(data) ? data : data.links || [];
      return links.some((l) => normalizeUrl(l.url) === normalizeUrl(url));
    } catch {
      return false;
    }
  } catch {
    return false;
  }
}

// ── Render ────────────────────────────────────────────────────────────────────

function renderPagePreview(url, title, faviconUrl) {
  els.pageTitle.textContent = title || url || "Sin título";
  try {
    const parsed = new URL(url || "");
    els.pageUrl.textContent = parsed.hostname + (parsed.pathname !== "/" ? parsed.pathname : "");
  } catch {
    els.pageUrl.textContent = url || "";
  }

  if (faviconUrl) {
    els.pageFavicon.src = faviconUrl;
    els.pageFavicon.classList.remove("hidden");
    els.faviconFallback.classList.add("hidden");
  } else {
    els.pageFavicon.classList.add("hidden");
    els.faviconFallback.classList.remove("hidden");
  }
}

function populateCategorySelect(cats) {
  els.selectCategory.innerHTML = '<option value="">Sin categoría</option>';
  for (const cat of cats) {
    const opt = document.createElement("option");
    opt.value = cat.id;
    opt.textContent = cat.name;
    if (cat.id === settings.defaultCategory) opt.selected = true;
    els.selectCategory.appendChild(opt);
  }
}

// ── Acciones ──────────────────────────────────────────────────────────────────

function toggleFavorite() {
  isFavorite = !isFavorite;
  els.btnFavorite.classList.toggle("active", isFavorite);
}

function handleOpenInStacklume() {
  const data = collectFormData();
  chrome.runtime.sendMessage({ type: "OPEN_IN_STACKLUME", data });
  window.close();
}

async function handleSave(e) {
  e.preventDefault();

  const data = collectFormData();

  if (!data.title) {
    els.inputTitle.focus();
    return;
  }

  // Sin token: redirigir a Stacklume
  if (!settings.apiToken) {
    handleOpenInStacklume();
    return;
  }

  // Con token: guardar directamente
  showOverlay("loading");

  const result = await saveViaApi(data);

  if (result.success) {
    els.successMessage.textContent =
      result.duplicate ? "Ya estaba guardado en Stacklume" : "¡Enlace guardado!";
    showOverlay("success");
    setTimeout(() => window.close(), 1400);
  } else {
    els.errorMessage.textContent = result.error || "Error al guardar el enlace";
    showOverlay("error");
  }
}

async function saveViaApi(data) {
  const base = (settings.stacklumeUrl || "").replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/api/mcp`, {
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
            title: data.title,
            description: data.description || undefined,
            categoryId: data.categoryId || undefined,
            isFavorite: data.isFavorite,
          },
        },
      }),
    });

    if (res.status === 409) {
      return { success: true, duplicate: true };
    }

    const json = await res.json();
    if (json.error) {
      return { success: false, error: json.error.message };
    }

    const text = json?.result?.content?.[0]?.text || "";
    // Detectar si el MCP devolvió error en el texto
    if (text.toLowerCase().includes('"error"') || text.startsWith("Error")) {
      // Puede ser URL duplicada
      if (text.includes("duplicad") || text.includes("409") || text.includes("Ya existe")) {
        return { success: true, duplicate: true };
      }
      return { success: false, error: text.slice(0, 120) };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function collectFormData() {
  const url = pageMetadata?.url || currentTab?.url || "";
  const title = els.inputTitle.value.trim();
  const description = els.inputDescription.value.trim();
  const categoryId = els.selectCategory.value || "";
  return { url, title, description, categoryId, isFavorite };
}

// ── Overlays ──────────────────────────────────────────────────────────────────

function showOverlay(state) {
  els.overlayLoading.classList.toggle("hidden", state !== "loading");
  els.overlaySuccess.classList.toggle("hidden", state !== "success");
  els.overlayError.classList.toggle("hidden", state !== "error");
}

function resetOverlays() {
  els.overlayLoading.classList.add("hidden");
  els.overlaySuccess.classList.add("hidden");
  els.overlayError.classList.add("hidden");
}

function showError(msg) {
  els.errorMessage.textContent = msg;
  showOverlay("error");
  els.btnRetry.classList.add("hidden");
}

// ── Utilidades ────────────────────────────────────────────────────────────────

function normalizeUrl(url) {
  try {
    const u = new URL(url);
    return u.origin + u.pathname.replace(/\/$/, "");
  } catch {
    return url;
  }
}
