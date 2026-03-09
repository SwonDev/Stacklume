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
};

let categories = [];

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
});

// ── Cargar / guardar ajustes ───────────────────────────────────────────────

async function loadSettings() {
  const settings = await new Promise((resolve) => {
    chrome.storage.sync.get(
      {
        stacklumeUrl: "https://demo.stacklume.app",
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
        showTestResult("error", "Token de API incorrecto o MCP no activado.");
      } else {
        showTestResult("ok", "✓ Conexión correcta con token de API.");
      }
    } else {
      showTestResult("ok", "✓ Stacklume accesible. Configura un token para guardar directamente.");
    }
  } catch (err) {
    showTestResult("error", `No se pudo conectar: ${err.message}`);
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

// ── Categorías ─────────────────────────────────────────────────────────────

async function maybeLoadCategories() {
  const url = els.inputUrl.value.trim().replace(/\/$/, "");
  const token = els.inputToken.value.trim();

  if (!url || !token) return;

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

    const currentVal = els.selectDefaultCat.value;
    els.selectDefaultCat.innerHTML = '<option value="">Sin categoría</option>';
    for (const cat of categories) {
      const opt = document.createElement("option");
      opt.value = cat.id;
      opt.textContent = cat.name;
      els.selectDefaultCat.appendChild(opt);
    }
    if (currentVal) els.selectDefaultCat.value = currentVal;
  } catch {
    // Sin categorías disponibles
  }
}
