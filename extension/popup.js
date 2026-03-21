/**
 * Stacklume Extension — Popup Script
 */

// ── Seguridad ─────────────────────────────────────────────────────────────────

/**
 * Sanitiza texto para prevenir inyección XSS al construir HTML.
 * Para textContent ya es seguro, pero esta función protege cualquier
 * uso futuro de innerHTML o inserción dinámica.
 */
function sanitizeText(text) {
  if (typeof text !== "string") return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

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

// ── Rate limiting ─────────────────────────────────────────────────────────────

let lastSaveTime = 0;

/**
 * Previene doble-guardado accidental con un cooldown de 2 segundos.
 */
function canSave() {
  const now = Date.now();
  if (now - lastSaveTime < 2000) return false;
  lastSaveTime = now;
  return true;
}

// ── Estado global ─────────────────────────────────────────────────────────────

let currentTab = null;
let pageMetadata = null;
let settings = {};
let isFavorite = false;
let categories = [];
let tags = [];
let selectedTagIds = new Set();
let readingStatus = "inbox";
let detectedPlatform = null;
let detectedCommand = null;

// ── Elementos DOM ─────────────────────────────────────────────────────────────

const $ = (id) => document.getElementById(id);

const els = {
  statusSaved:        $("status-saved"),
  ogImageWrap:        $("og-image-wrap"),
  ogImage:            $("og-image"),
  pageTitle:          $("page-display-title"),
  pageUrl:            $("page-display-url"),
  pageFavicon:        $("page-favicon"),
  faviconFallback:    $("favicon-fallback"),
  inputTitle:         $("input-title"),
  inputDescription:   $("input-description"),
  selectCategory:     $("select-category"),
  categoryGroup:      $("category-group"),
  readingStatusGroup: $("reading-status-group"),
  tagsGroup:          $("tags-group"),
  tagsContainer:      $("tags-container"),
  btnFavorite:        $("btn-favorite"),
  platformBadge:      $("platform-badge"),
  commandDetected:    $("command-detected"),
  commandText:        $("command-text"),
  notesGroup:         $("notes-group"),
  notesToggle:        $("notes-toggle"),
  notesContent:       $("notes-content"),
  notesInput:         $("notes"),
  reminderGroup:      $("reminder-group"),
  reminderInput:      $("reminder"),
  clearReminder:      $("clear-reminder"),
  btnOpen:            $("btn-open"),
  btnSave:            $("btn-save"),
  saveLabel:          $("save-label"),
  overlayLoading:     $("overlay-loading"),
  loadingMessage:     $("loading-message"),
  overlaySuccess:     $("overlay-success"),
  overlayError:       $("overlay-error"),
  errorMessage:       $("error-message"),
  successMessage:     $("success-message"),
  btnRetry:           $("btn-retry"),
  noTokenHint:        $("no-token-hint"),
  hintConfig:         $("hint-config"),
  btnSettings:        $("btn-settings"),
  saveAllSection:     $("save-all-section"),
  btnSaveAll:         $("btn-save-all"),
  saveAllLabel:       $("save-all-label"),
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

  // Detectar plataforma desde la URL
  detectedPlatform = detectPlatform(currentTab.url);
  if (detectedPlatform) {
    showPlatformBadge(detectedPlatform);
  }

  // Extraer metadatos ricos del content script
  pageMetadata = await extractMetadata(currentTab);
  if (pageMetadata) {
    renderPagePreview(pageMetadata.url, pageMetadata.title, pageMetadata.faviconUrl);
    els.inputTitle.value = pageMetadata.title;
    els.inputDescription.value = pageMetadata.description || "";

    // Mostrar imagen OG si existe
    if (pageMetadata.ogImage) {
      showOgImage(pageMetadata.ogImage);
    }
  } else {
    els.inputTitle.value = currentTab.title || "";
  }

  // Token configurado → modo directo disponible
  if (settings.apiToken) {
    els.noTokenHint.classList.add("hidden");
    els.saveLabel.textContent = "Guardar";
    els.readingStatusGroup.classList.remove("hidden");
    els.notesGroup.classList.remove("hidden");
    els.reminderGroup.classList.remove("hidden");
    els.saveAllSection.classList.remove("hidden");

    // Cargar categorías, etiquetas y verificar si ya está guardado en paralelo
    const [cats, loadedTags, alreadySaved] = await Promise.all([
      loadCategories(),
      loadTags(),
      checkAlreadySaved(currentTab.url),
    ]);
    categories = cats;
    tags = loadedTags;
    populateCategorySelect(cats);
    renderTags(loadedTags);

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
  els.btnSaveAll.addEventListener("click", handleSaveAllTabs);
  document.getElementById("form-add-link").addEventListener("submit", handleSave);

  // Reading status buttons
  document.querySelectorAll(".reading-btn").forEach((btn) => {
    btn.addEventListener("click", () => setReadingStatus(btn.dataset.status));
  });

  // Notes collapsible toggle
  els.notesToggle.addEventListener("click", () => {
    const expanded = els.notesToggle.getAttribute("aria-expanded") === "true";
    els.notesToggle.setAttribute("aria-expanded", String(!expanded));
    els.notesContent.style.display = expanded ? "none" : "";
    if (!expanded) els.notesInput.focus();
  });

  // Reminder clear button
  els.reminderInput.addEventListener("input", () => {
    els.clearReminder.classList.toggle("hidden", !els.reminderInput.value);
  });
  els.clearReminder.addEventListener("click", () => {
    els.reminderInput.value = "";
    els.clearReminder.classList.add("hidden");
  });

  // Command detection on title input (in case user pastes a command)
  els.inputTitle.addEventListener("input", () => {
    const val = els.inputTitle.value.trim();
    const cmd = detectCommand(val);
    if (cmd) {
      applyDetectedCommand(cmd, val);
    } else if (detectedCommand) {
      // Clear command state if text no longer matches
      detectedCommand = null;
      els.commandDetected.classList.add("hidden");
    }
  });
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
        const ogImage = getMeta('og:image') || getMeta('twitter:image') || '';
        return {
          url: canonical?.href || window.location.href,
          title: getMeta('og:title') || document.title || '',
          description: getMeta('og:description') || getMeta('description') || '',
          faviconUrl: favicon || `${window.location.origin}/favicon.ico`,
          siteName: getMeta('og:site_name') || '',
          author: getMeta('author') || getMeta('article:author') || '',
          ogImage: ogImage,
        };
      },
    });
    return results[0]?.result || null;
  } catch {
    // scripting no disponible (chrome://, about:, páginas de extensión, etc.)
    return null;
  }
}

// ── Categorías con caché ──────────────────────────────────────────────────────

const CATEGORIES_CACHE_KEY = "stacklume-ext-categories";
const CATEGORIES_CACHE_TIME_KEY = "stacklume-ext-categories-time";
const TAGS_CACHE_KEY = "stacklume-ext-tags";
const TAGS_CACHE_TIME_KEY = "stacklume-ext-tags-time";
const CACHE_TTL = 300000; // 5 minutos

async function loadCategories() {
  if (!settings.apiToken) return [];

  // Intentar caché primero
  try {
    const cached = localStorage.getItem(CATEGORIES_CACHE_KEY);
    const cacheTime = localStorage.getItem(CATEGORIES_CACHE_TIME_KEY);
    if (
      cached &&
      cacheTime &&
      Date.now() - parseInt(cacheTime, 10) < CACHE_TTL
    ) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Caché corrupta, continuar con fetch
  }

  // Fetch desde la API
  const cats = await fetchCategoriesFromApi();
  if (cats.length > 0) {
    try {
      localStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify(cats));
      localStorage.setItem(CATEGORIES_CACHE_TIME_KEY, String(Date.now()));
    } catch {
      // localStorage lleno o no disponible
    }
  }
  return cats;
}

async function fetchCategoriesFromApi() {
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

/**
 * Carga las etiquetas del usuario vía MCP (list_tags) con caché local.
 * Devuelve un array de objetos { id, name, color }.
 */
async function loadTags() {
  if (!settings.apiToken) return [];

  // Intentar caché primero
  try {
    const cached = localStorage.getItem(TAGS_CACHE_KEY);
    const cacheTime = localStorage.getItem(TAGS_CACHE_TIME_KEY);
    if (
      cached &&
      cacheTime &&
      Date.now() - parseInt(cacheTime, 10) < CACHE_TTL
    ) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Caché corrupta, continuar con fetch
  }

  // Fetch desde la API
  const loadedTags = await fetchTagsFromApi();
  if (loadedTags.length > 0) {
    try {
      localStorage.setItem(TAGS_CACHE_KEY, JSON.stringify(loadedTags));
      localStorage.setItem(TAGS_CACHE_TIME_KEY, String(Date.now()));
    } catch {
      // localStorage lleno o no disponible
    }
  }
  return loadedTags;
}

async function fetchTagsFromApi() {
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
        id: 3,
        method: "tools/call",
        params: { name: "list_tags", arguments: {} },
      }),
    });
    const json = await res.json();
    const text = json?.result?.content?.[0]?.text || "[]";
    try {
      const data = JSON.parse(text);
      return Array.isArray(data) ? data : data.tags || [];
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
  // Actualizar solo el nodo de texto, preservando el span del platform badge
  els.pageTitle.childNodes[0].textContent = title || url || "Sin título";
  try {
    const parsed = new URL(url || "");
    els.pageUrl.textContent = parsed.hostname + (parsed.pathname !== "/" ? parsed.pathname : "");
  } catch {
    els.pageUrl.textContent = url || "";
  }

  if (faviconUrl) {
    els.pageFavicon.src = faviconUrl;
    els.pageFavicon.style.display = "";
    els.faviconFallback.classList.add("hidden");
  } else {
    els.pageFavicon.style.display = "none";
    els.faviconFallback.classList.remove("hidden");
  }
}

/**
 * Muestra la imagen OG como banner de vista previa.
 */
function showOgImage(imageUrl) {
  if (!imageUrl) return;
  els.ogImage.src = imageUrl;
  els.ogImage.onerror = () => {
    els.ogImageWrap.classList.add("hidden");
  };
  els.ogImage.onload = () => {
    els.ogImageWrap.classList.remove("hidden");
  };
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

/**
 * Renderiza los badges de etiquetas como botones multi-selección.
 */
function renderTags(tagList) {
  if (!tagList || tagList.length === 0) {
    els.tagsContainer.innerHTML = '<span class="tags-empty">Sin etiquetas disponibles</span>';
    els.tagsGroup.classList.remove("hidden");
    return;
  }

  els.tagsContainer.innerHTML = "";
  els.tagsGroup.classList.remove("hidden");

  for (const tag of tagList) {
    const badge = document.createElement("button");
    badge.type = "button";
    badge.className = "tag-badge";
    badge.dataset.tagId = tag.id;
    badge.setAttribute("aria-pressed", "false");
    badge.setAttribute("aria-label", `Etiqueta: ${sanitizeText(tag.name)}`);

    // Color del tag
    const color = tag.color || "#8492a6";
    badge.style.setProperty("--tag-color", color);
    badge.style.setProperty("--tag-bg", hexToRgba(color, 0.15));

    // Punto de color + nombre
    const dot = document.createElement("span");
    dot.className = "tag-dot";
    dot.style.backgroundColor = color;

    const nameSpan = document.createElement("span");
    nameSpan.textContent = tag.name;

    badge.appendChild(dot);
    badge.appendChild(nameSpan);

    badge.addEventListener("click", () => toggleTag(tag.id, badge));

    els.tagsContainer.appendChild(badge);
  }
}

// ── Acciones ──────────────────────────────────────────────────────────────────

function toggleFavorite() {
  isFavorite = !isFavorite;
  els.btnFavorite.classList.toggle("active", isFavorite);
  els.btnFavorite.setAttribute("aria-pressed", String(isFavorite));
}

/**
 * Alterna la selección de un tag.
 */
function toggleTag(tagId, badge) {
  if (selectedTagIds.has(tagId)) {
    selectedTagIds.delete(tagId);
    badge.classList.remove("selected");
    badge.setAttribute("aria-pressed", "false");
  } else {
    selectedTagIds.add(tagId);
    badge.classList.add("selected");
    badge.setAttribute("aria-pressed", "true");
  }
}

/**
 * Establece el estado de lectura activo.
 */
function setReadingStatus(status) {
  readingStatus = status;
  document.querySelectorAll(".reading-btn").forEach((btn) => {
    const isActive = btn.dataset.status === status;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-pressed", String(isActive));
  });
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

  // Validar URL antes de guardar
  if (!isValidHttpUrl(data.url)) {
    showError("URL no válida. Solo se permiten enlaces http:// y https://");
    return;
  }

  // Rate limiting: prevenir doble-clic accidental
  if (!canSave()) return;

  // Sin token: redirigir a Stacklume
  if (!settings.apiToken) {
    handleOpenInStacklume();
    return;
  }

  // Con token: guardar directamente
  showOverlay("loading");
  els.loadingMessage.textContent = "Guardando...";

  const result = await saveViaApi(data);

  if (result.success) {
    els.successMessage.textContent =
      result.duplicate ? "Este enlace ya existe en tu biblioteca" : "\u00a1Enlace guardado!";
    showOverlay("success");
    setTimeout(() => window.close(), 1400);
  } else {
    els.errorMessage.textContent = result.error || "Error al guardar el enlace";
    showOverlay("error");
  }
}

/**
 * Guarda todas las pestañas abiertas de la ventana actual.
 */
async function handleSaveAllTabs() {
  if (!settings.apiToken) return;

  // Rate limiting: prevenir doble-clic accidental
  if (!canSave()) return;

  const allTabs = await new Promise((resolve) => {
    chrome.tabs.query({ currentWindow: true }, (tabs) => resolve(tabs || []));
  });

  // Filtrar pestañas válidas (no chrome://, no about:, no extensiones)
  const validTabs = allTabs.filter((tab) => {
    try {
      const url = new URL(tab.url);
      return ["http:", "https:"].includes(url.protocol);
    } catch {
      return false;
    }
  });

  if (validTabs.length === 0) {
    els.saveAllLabel.textContent = "No hay pestañas válidas";
    setTimeout(() => {
      els.saveAllLabel.textContent = "Guardar todas las pestañas";
    }, 2000);
    return;
  }

  showOverlay("loading");

  let saved = 0;
  let errors = 0;

  for (let i = 0; i < validTabs.length; i++) {
    els.loadingMessage.textContent = `Guardando ${i + 1}/${validTabs.length}...`;

    const tab = validTabs[i];
    const data = {
      url: tab.url,
      title: tab.title || tab.url,
      description: "",
      categoryId: els.selectCategory.value || "",
      isFavorite: false,
      tagIds: [...selectedTagIds],
      readingStatus: "inbox",
    };

    const result = await saveViaApi(data);
    if (result.success) {
      saved++;
    } else {
      errors++;
    }
  }

  if (errors === 0) {
    els.successMessage.textContent = `\u00a1${saved} enlace${saved !== 1 ? "s" : ""} guardado${saved !== 1 ? "s" : ""}!`;
  } else {
    els.successMessage.textContent = `${saved} guardado${saved !== 1 ? "s" : ""}, ${errors} con error`;
  }
  showOverlay("success");
  setTimeout(() => window.close(), errors === 0 ? 1800 : 2500);
}

async function saveViaApi(data) {
  // Validar la URL antes de enviar a la API
  if (!data.url || !isValidHttpUrl(data.url)) {
    return { success: false, error: "URL no válida. Solo se permiten http:// y https://" };
  }
  const base = (settings.stacklumeUrl || "").replace(/\/$/, "");
  try {
    const args = {
      url: data.url,
      title: data.title,
      description: data.description || undefined,
      categoryId: data.categoryId || undefined,
      isFavorite: data.isFavorite,
    };

    // Incluir tagIds si hay etiquetas seleccionadas
    if (data.tagIds && data.tagIds.length > 0) {
      args.tagIds = data.tagIds;
    }

    // Campos adicionales
    if (data.notes) args.notes = data.notes;
    if (data.reminderAt) args.reminderAt = data.reminderAt;
    if (data.platform) args.platform = data.platform;
    if (data.contentType) args.contentType = data.contentType;
    if (data.readingStatus && data.readingStatus !== "inbox") args.readingStatus = data.readingStatus;

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
          arguments: args,
        },
      }),
    });

    // HTTP 409 = duplicado
    if (res.status === 409) {
      return { success: true, duplicate: true };
    }

    // HTTP 401/403 = token inválido
    if (res.status === 401 || res.status === 403) {
      return {
        success: false,
        error: "Token de API inv\u00e1lido. Verifica en Ajustes \u2192 MCP",
      };
    }

    const json = await res.json();
    if (json.error) {
      if (json.error.code === -32001) {
        return {
          success: false,
          error: "Token de API inv\u00e1lido. Verifica en Ajustes \u2192 MCP",
        };
      }
      return { success: false, error: json.error.message };
    }

    const text = json?.result?.content?.[0]?.text || "";
    // Detectar si el MCP devolvió error en el texto
    if (text.toLowerCase().includes('"error"') || text.startsWith("Error")) {
      // Puede ser URL duplicada
      if (
        text.includes("duplicad") ||
        text.includes("409") ||
        text.includes("Ya existe") ||
        text.includes("ya existe")
      ) {
        return { success: true, duplicate: true };
      }
      return { success: false, error: text.slice(0, 120) };
    }

    return { success: true };
  } catch (err) {
    // Errores de red específicos
    if (!navigator.onLine) {
      return { success: false, error: "Sin conexi\u00f3n a internet" };
    }
    if (err.name === "TypeError" && err.message.includes("Failed to fetch")) {
      return {
        success: false,
        error:
          "No se pudo conectar a Stacklume. \u00bfEst\u00e1 la aplicaci\u00f3n abierta?",
      };
    }
    return {
      success: false,
      error:
        "No se pudo conectar a Stacklume. \u00bfEst\u00e1 la aplicaci\u00f3n abierta?",
    };
  }
}

function collectFormData() {
  let url = detectedCommand ? detectedCommand.url : (pageMetadata?.url || currentTab?.url || "");
  const title = els.inputTitle.value.trim();
  const description = els.inputDescription.value.trim();
  const categoryId = els.selectCategory.value || "";
  const tagIds = [...selectedTagIds];
  const notes = els.notesInput ? els.notesInput.value.trim() : "";
  const reminderVal = els.reminderInput ? els.reminderInput.value : "";
  const reminderAt = reminderVal ? new Date(reminderVal).toISOString() : null;
  const platform = detectedPlatform ? detectedPlatform.name.toLowerCase() : null;
  const contentType = detectedPlatform ? (detectedPlatform.contentType || null) : null;
  return { url, title, description, categoryId, isFavorite, tagIds, readingStatus, notes, reminderAt, platform, contentType };
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
    // Eliminar parámetros de tracking conocidos
    const trackingParams = [
      "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
      "ref", "fbclid", "gclid", "mc_cid", "mc_eid", "msclkid", "twclid",
    ];
    trackingParams.forEach((p) => u.searchParams.delete(p));
    // Normalizar path (eliminar trailing slash)
    const path = u.pathname.replace(/\/+$/, "") || "/";
    return `${u.protocol}//${u.hostname}${path}${u.search}${u.hash}`;
  } catch {
    return url;
  }
}

/**
 * Convierte un color hex a rgba con opacidad.
 */
function hexToRgba(hex, alpha) {
  if (!hex || !hex.startsWith("#")) return `rgba(132, 146, 166, ${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return `rgba(132, 146, 166, ${alpha})`;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ── Detección de plataforma ──────────────────────────────────────────────────

function detectPlatform(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    const platforms = {
      "youtube.com":            { name: "YouTube",       color: "#FF0000", icon: "\u25B6",  contentType: "video" },
      "youtu.be":               { name: "YouTube",       color: "#FF0000", icon: "\u25B6",  contentType: "video" },
      "github.com":             { name: "GitHub",        color: "#24292e", icon: "\u2699",  contentType: "code" },
      "store.steampowered.com": { name: "Steam",         color: "#1b2838", icon: "\uD83C\uDFAE", contentType: "game" },
      "twitter.com":            { name: "X/Twitter",     color: "#1DA1F2", icon: "\uD835\uDD4F", contentType: "social" },
      "x.com":                  { name: "X/Twitter",     color: "#1DA1F2", icon: "\uD835\uDD4F", contentType: "social" },
      "reddit.com":             { name: "Reddit",        color: "#FF4500", icon: "\uD83D\uDD34", contentType: "social" },
      "stackoverflow.com":      { name: "StackOverflow", color: "#F48024", icon: "\uD83D\uDCDA", contentType: "code" },
      "medium.com":             { name: "Medium",        color: "#00AB6C", icon: "\uD83D\uDCDD", contentType: "article" },
      "dev.to":                 { name: "DEV",           color: "#0A0A0A", icon: "\uD83D\uDC69\u200D\uD83D\uDCBB", contentType: "article" },
      "figma.com":              { name: "Figma",         color: "#F24E1E", icon: "\uD83C\uDFA8", contentType: "design" },
      "dribbble.com":           { name: "Dribbble",      color: "#EA4C89", icon: "\uD83C\uDFC0", contentType: "design" },
      "npmjs.com":              { name: "npm",           color: "#CB3837", icon: "\uD83D\uDCE6", contentType: "code" },
      "spotify.com":            { name: "Spotify",       color: "#1DB954", icon: "\uD83C\uDFB5", contentType: "music" },
      "linkedin.com":           { name: "LinkedIn",      color: "#0077B5", icon: "\uD83D\uDCBC", contentType: "social" },
    };
    for (const [domain, info] of Object.entries(platforms)) {
      if (hostname === domain || hostname.endsWith("." + domain)) return info;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Muestra el badge de plataforma junto al título de la página.
 */
function showPlatformBadge(platform) {
  if (!platform || !els.platformBadge) return;
  els.platformBadge.textContent = platform.icon + " " + platform.name;
  els.platformBadge.style.backgroundColor = platform.color;
  els.platformBadge.style.display = "inline-flex";
}

// ── Detección de comandos ────────────────────────────────────────────────────

function detectCommand(text) {
  const patterns = [
    { regex: /^(npm|npx)\s+(install|i|add)\s+/i,  registry: "npm",    base: "https://www.npmjs.com/package/" },
    { regex: /^(yarn|pnpm)\s+add\s+/i,            registry: "npm",    base: "https://www.npmjs.com/package/" },
    { regex: /^pip\s+install\s+/i,                 registry: "pypi",   base: "https://pypi.org/project/" },
    { regex: /^cargo\s+(install|add)\s+/i,         registry: "crates", base: "https://crates.io/crates/" },
    { regex: /^brew\s+install\s+/i,                registry: "brew",   base: "https://formulae.brew.sh/formula/" },
    { regex: /^gem\s+install\s+/i,                 registry: "ruby",   base: "https://rubygems.org/gems/" },
    { regex: /^go\s+(install|get)\s+/i,            registry: "go",     base: "https://pkg.go.dev/" },
    { regex: /^bun\s+add\s+/i,                     registry: "npm",    base: "https://www.npmjs.com/package/" },
  ];
  for (const p of patterns) {
    if (p.regex.test(text)) {
      const pkg = text.replace(p.regex, "").split(/\s/)[0].replace(/@[\d.]+$/, "");
      if (!pkg) return null;
      return { registry: p.registry, package: pkg, url: p.base + pkg };
    }
  }
  return null;
}

/**
 * Aplica un comando detectado: actualiza la URL, título y muestra el badge.
 */
function applyDetectedCommand(cmd) {
  detectedCommand = cmd;
  els.commandDetected.classList.remove("hidden");
  els.commandText.textContent = "Comando detectado: " + cmd.registry + " \u2192 " + cmd.package;

  // Actualizar el título con el nombre del paquete
  els.inputTitle.value = cmd.package;

  // Actualizar la preview de la página
  els.pageTitle.childNodes[0].textContent = cmd.package;
  try {
    const parsed = new URL(cmd.url);
    els.pageUrl.textContent = parsed.hostname + parsed.pathname;
  } catch {
    els.pageUrl.textContent = cmd.url;
  }

  // Detectar plataforma del registry
  detectedPlatform = detectPlatform(cmd.url);
  if (detectedPlatform) {
    showPlatformBadge(detectedPlatform);
  }
}
