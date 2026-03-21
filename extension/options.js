/**
 * Stacklume Extension — Options Page
 */

const $ = (id) => document.getElementById(id);

const els = {
  inputUrl:             $("input-url"),
  inputToken:           $("input-token"),
  btnTest:              $("btn-test"),
  testResult:           $("test-result"),
  btnToggleToken:       $("btn-toggle-token"),
  selectOpenMode:       $("select-open-mode"),
  selectDefaultCat:     $("select-default-category"),
  btnSave:              $("btn-save"),
  saveStatus:           $("save-status"),
  linkShortcuts:        $("link-shortcuts"),
  btnExportConfig:      $("btn-export-config"),
  inputImportConfig:    $("input-import-config"),
  backupStatus:         $("backup-status"),
};

let categories = [];

// ── Constantes de caché ──────────────────────────────────────────────────────

const CATEGORIES_CACHE_KEY = "stacklume-ext-categories";
const CATEGORIES_CACHE_TIME_KEY = "stacklume-ext-categories-time";
const CATEGORIES_CACHE_TTL = 300000; // 5 minutos

// ── Inicialización ─────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {
  await loadSettings();

  // Presets
  document.querySelectorAll(".btn-preset").forEach((btn) => {
    btn.addEventListener("click", () => {
      els.inputUrl.value = btn.dataset.url;
    });
  });

  els.btnToggleToken.addEventListener("click", () => {
    const isPassword = els.inputToken.type === "password";
    els.inputToken.type = isPassword ? "text" : "password";
  });

  els.btnTest.addEventListener("click", testConnection);
  els.btnSave.addEventListener("click", saveSettings);

  // Abrir gestión de atajos según navegador
  els.linkShortcuts.addEventListener("click", (e) => {
    e.preventDefault();
    const isFirefox = navigator.userAgent.includes("Firefox");
    if (isFirefox) {
      chrome.tabs.create({ url: "about:addons" });
    } else {
      chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
    }
  });

  // Cargar categorías cuando hay token
  els.inputToken.addEventListener("blur", maybeLoadCategories);
  els.inputUrl.addEventListener("blur", maybeLoadCategories);

  // Exportar / Importar configuración
  els.btnExportConfig.addEventListener("click", exportConfig);
  els.inputImportConfig.addEventListener("change", importConfig);
});

// ── Cargar / guardar ajustes ───────────────────────────────────────────────

async function loadSettings() {
  const settings = await new Promise((resolve) => {
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

  els.inputUrl.value = settings.stacklumeUrl;
  els.inputToken.value = settings.apiToken;
  els.selectOpenMode.value = settings.openMode;

  if (settings.apiToken) {
    await maybeLoadCategories();
    if (settings.defaultCategory) {
      els.selectDefaultCat.value = settings.defaultCategory;
    }
  }
}

async function saveSettings() {
  const stacklumeUrl = els.inputUrl.value.trim().replace(/\/$/, "");
  const apiToken = els.inputToken.value.trim();
  const openMode = els.selectOpenMode.value;
  const defaultCategory = els.selectDefaultCat.value;

  await new Promise((resolve) => {
    chrome.storage.sync.set(
      { stacklumeUrl, apiToken, openMode, defaultCategory },
      resolve
    );
  });

  els.saveStatus.classList.remove("hidden");
  setTimeout(() => els.saveStatus.classList.add("hidden"), 2000);
}

// ── Test de conexión ───────────────────────────────────────────────────────

async function testConnection() {
  const url = els.inputUrl.value.trim().replace(/\/$/, "");
  const token = els.inputToken.value.trim();

  if (!url) {
    showTestResult("error", "Introduce una URL de Stacklume.");
    return;
  }

  els.btnTest.disabled = true;
  els.btnTest.textContent = "Probando...";
  els.testResult.classList.add("hidden");

  try {
    // Intentar health check
    const res = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    if (token) {
      // Verificar token con el endpoint MCP
      const mcpRes = await fetch(`${url}/api/mcp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping", params: {} }),
        signal: AbortSignal.timeout(5000),
      });
      const json = await mcpRes.json();
      if (json.error && json.error.code === -32001) {
        showTestResult("error", "Token de API inválido. Verifica en Ajustes \u2192 MCP.");
      } else {
        showTestResult("ok", "\u2713 Conexión correcta con token de API.");
      }
    } else {
      showTestResult("ok", "\u2713 Stacklume accesible. Configura un token para guardar directamente.");
    }
  } catch (err) {
    if (!navigator.onLine) {
      showTestResult("error", "Sin conexión a internet.");
    } else if (err.name === "TypeError" && err.message.includes("Failed to fetch")) {
      showTestResult(
        "error",
        "No se pudo conectar a Stacklume. \u00bfEstá la aplicación abierta?"
      );
    } else {
      showTestResult("error", `No se pudo conectar: ${err.message}`);
    }
  } finally {
    els.btnTest.disabled = false;
    els.btnTest.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
        <path d="M21 3v5h-5"/>
      </svg>
      Probar`;
  }
}

function showTestResult(type, message) {
  els.testResult.textContent = message;
  els.testResult.className = `test-result test-result--${type}`;
  els.testResult.classList.remove("hidden");
}

// ── Categorías con caché ─────────────────────────────────────────────────────

async function maybeLoadCategories() {
  const url = els.inputUrl.value.trim().replace(/\/$/, "");
  const token = els.inputToken.value.trim();

  if (!url || !token) return;

  // Intentar caché primero
  try {
    const cached = localStorage.getItem(CATEGORIES_CACHE_KEY);
    const cacheTime = localStorage.getItem(CATEGORIES_CACHE_TIME_KEY);
    if (
      cached &&
      cacheTime &&
      Date.now() - parseInt(cacheTime, 10) < CATEGORIES_CACHE_TTL
    ) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        categories = parsed;
        renderCategories();
        return;
      }
    }
  } catch {
    // Caché corrupta, continuar con fetch
  }

  // Fetch desde la API
  try {
    const res = await fetch(`${url}/api/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 10,
        method: "tools/call",
        params: { name: "list_categories", arguments: {} },
      }),
      signal: AbortSignal.timeout(5000),
    });
    const json = await res.json();
    const text = json?.result?.content?.[0]?.text || "[]";
    const data = JSON.parse(text);
    categories = Array.isArray(data) ? data : data.categories || [];

    // Guardar en caché
    if (categories.length > 0) {
      try {
        localStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify(categories));
        localStorage.setItem(CATEGORIES_CACHE_TIME_KEY, String(Date.now()));
      } catch {
        // localStorage lleno o no disponible
      }
    }

    renderCategories();
  } catch {
    // Sin categorías disponibles
  }
}

function renderCategories() {
  const currentVal = els.selectDefaultCat.value;
  els.selectDefaultCat.innerHTML = '<option value="">Sin categoría</option>';
  for (const cat of categories) {
    const opt = document.createElement("option");
    opt.value = cat.id;
    opt.textContent = cat.name;
    els.selectDefaultCat.appendChild(opt);
  }
  if (currentVal) els.selectDefaultCat.value = currentVal;
}

// ── Exportar / Importar configuración ─────────────────────────────────────────

function exportConfig() {
  chrome.storage.sync.get(null, (allSettings) => {
    const exportData = {
      _type: "stacklume-extension-config",
      _version: "1.1.0",
      _exportedAt: new Date().toISOString(),
      settings: allSettings,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stacklume-extension-config-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showBackupStatus("ok", "Configuración exportada correctamente.");
  });
}

function importConfig(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);

      if (data._type !== "stacklume-extension-config") {
        showBackupStatus(
          "error",
          "Archivo no válido. Debe ser una exportación de Stacklume."
        );
        return;
      }

      const importedSettings = data.settings || {};

      // Validar que tenga al menos stacklumeUrl
      if (!importedSettings.stacklumeUrl) {
        showBackupStatus("error", "El archivo no contiene una configuración válida.");
        return;
      }

      chrome.storage.sync.set(importedSettings, () => {
        showBackupStatus("ok", "Configuración importada. Recargando...");
        setTimeout(() => location.reload(), 1000);
      });
    } catch {
      showBackupStatus("error", "Error al leer el archivo. Verifica que sea JSON válido.");
    }
  };
  reader.readAsText(file);

  // Limpiar input para permitir reimportar el mismo archivo
  e.target.value = "";
}

function showBackupStatus(type, message) {
  els.backupStatus.textContent = message;
  els.backupStatus.className = `backup-status backup-status--${type}`;
  els.backupStatus.classList.remove("hidden");
  setTimeout(() => els.backupStatus.classList.add("hidden"), 4000);
}
