use std::io::Read as _;
use std::sync::Mutex;
use tauri::{Manager, State};

/// Estado global del servidor Next.js
struct ServerState {
    port: Mutex<u16>,
    /// Handle del proceso node.exe (solo en producción). Se usa para matar el proceso al cerrar.
    #[cfg(not(dev))]
    node_child: Mutex<Option<std::process::Child>>,
    /// Windows Job Object handle. Con JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE, cuando
    /// Stacklume.exe muere (por cualquier razón, incluso TerminateProcess de NSIS),
    /// el OS cierra este handle automáticamente y mata node.exe con él.
    #[cfg(windows)]
    node_job: Mutex<isize>,
}

/// Crea un Windows Job Object y asigna el proceso hijo a él.
/// Con JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE: cuando el proceso padre termina
/// por CUALQUIER motivo (kill, crash, NSIS TerminateProcess...), el OS cierra
/// el handle del job y mata automáticamente todos los procesos asignados.
/// Devuelve el HANDLE del job como isize (0 = fallo), mantenerlo vivo mientras viva la app.
#[cfg(windows)]
fn create_job_for_child(child_pid: u32) -> isize {
    use windows_sys::Win32::Foundation::CloseHandle;
    use windows_sys::Win32::System::JobObjects::{
        AssignProcessToJobObject, CreateJobObjectW, SetInformationJobObject,
        JOBOBJECT_EXTENDED_LIMIT_INFORMATION, JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE,
    };
    use windows_sys::Win32::System::Threading::OpenProcess;

    // Permisos mínimos necesarios para AssignProcessToJobObject
    const PROCESS_SET_QUOTA: u32 = 0x0100;
    const PROCESS_TERMINATE: u32 = 0x0001;

    unsafe {
        // Crear job object anónimo
        let job = CreateJobObjectW(std::ptr::null(), std::ptr::null());
        if job.is_null() {
            return 0;
        }

        // std::mem::zeroed() rellena con ceros y luego seteamos solo LimitFlags
        let mut info: JOBOBJECT_EXTENDED_LIMIT_INFORMATION = std::mem::zeroed();
        info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;

        // 9 = JobObjectExtendedLimitInformation
        let result = SetInformationJobObject(
            job,
            9,
            &mut info as *mut _ as *mut core::ffi::c_void,
            std::mem::size_of::<JOBOBJECT_EXTENDED_LIMIT_INFORMATION>() as u32,
        );
        if result == 0 {
            CloseHandle(job);
            return 0;
        }

        // Asignar el proceso hijo al job (privilegios mínimos, no PROCESS_ALL_ACCESS)
        let process = OpenProcess(PROCESS_SET_QUOTA | PROCESS_TERMINATE, 0, child_pid);
        if !process.is_null() {
            AssignProcessToJobObject(job, process);
            CloseHandle(process);
        }

        // Devolver el job handle como isize — NO llamar CloseHandle(job) aquí.
        // El OS lo cierra al morir Stacklume.exe (por cualquier causa) y mata node.exe.
        job as isize
    }
}

// ─── Utilidades de producción ─────────────────────────────────────────────────

#[cfg(not(dev))]
use std::net::TcpListener;

/// Puerto preferido estable para producción.
/// Se usa siempre que esté disponible, garantizando URLs de MCP estables
/// entre reinicios (p. ej. http://127.0.0.1:7879/api/mcp).
/// El puerto de dev es 7878, así que usamos 7879 para producción.
#[cfg(not(dev))]
const PREFERRED_PORT: u16 = 7879;

/// Busca un puerto TCP libre intentando primero PREFERRED_PORT (estable entre
/// reinicios para que las configuraciones MCP en Claude Desktop / Cursor no se
/// rompan) y recurriendo a asignación aleatoria del OS solo si está ocupado.
#[cfg(not(dev))]
fn find_free_port() -> u16 {
    // 1. Intentar el puerto preferido estable.
    if TcpListener::bind(("127.0.0.1", PREFERRED_PORT)).is_ok() {
        return PREFERRED_PORT;
    }
    eprintln!(
        "[Stacklume] INFO: Puerto preferido {} ocupado, buscando puerto libre alternativo...",
        PREFERRED_PORT
    );

    // 2. Si está ocupado, pedir al OS un puerto libre aleatorio (hasta 50 intentos).
    for _ in 0..50 {
        if let Ok(listener) = TcpListener::bind("127.0.0.1:0") {
            if let Ok(addr) = listener.local_addr() {
                return addr.port();
            }
        }
    }

    // 3. Último recurso (extremadamente improbable).
    eprintln!("[Stacklume] WARN: No se pudo obtener puerto libre tras 50 intentos, usando fallback 49152");
    49152
}

/// Espera hasta que el servidor Next.js responda en /api/health (máx 40 s).
/// Devuelve true si el servidor respondió, false si hubo timeout.
#[cfg(not(dev))]
fn wait_for_server(port: u16) -> bool {
    let url = format!("http://127.0.0.1:{}/api/health", port);
    for _ in 0..80 {
        match ureq::get(&url).call() {
            Ok(resp) if resp.status() < 500 => return true,
            _ => {}
        }
        std::thread::sleep(std::time::Duration::from_millis(500));
    }
    false
}

/// Resuelve la ruta de un recurso empaquetado.
/// Prueba `resource_dir/subpath` y `resource_dir/resources/subpath`.
#[cfg(not(dev))]
fn resolve_resource(resource_dir: &std::path::Path, subpath: &str) -> std::path::PathBuf {
    let direct = resource_dir.join(subpath);
    if direct.exists() {
        return direct;
    }
    let with_prefix = resource_dir.join("resources").join(subpath);
    if with_prefix.exists() {
        return with_prefix;
    }
    direct // fallback — el error se reportará después
}

/// Escribe una línea al archivo de log de la aplicación.
#[cfg(not(dev))]
fn log(path: &std::path::Path, msg: &str) {
    use std::io::Write;
    if let Ok(mut f) = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)
    {
        let _ = writeln!(f, "{}", msg);
    }
}

// ─── Comandos Tauri ───────────────────────────────────────────────────────────

/// Descarga el instalador de actualización desde GitHub y lo ejecuta.
/// No usa tauri-plugin-updater (evita ACL plugin:updater|check).
/// Funciona desde cualquier versión de la app que tenga este comando.
#[tauri::command]
async fn download_and_run_update(url: String) -> Result<(), String> {
    // Validar URL con parsing estricto — previene path traversal y esquemas maliciosos
    let parsed = url::Url::parse(&url).map_err(|e| format!("URL mal formada: {}", e))?;

    // Solo HTTPS desde nuestro repo exacto
    if parsed.scheme() != "https" {
        return Err("Solo se permiten URLs HTTPS".to_string());
    }
    if parsed.host_str() != Some("github.com") {
        return Err("Solo se permiten descargas desde github.com".to_string());
    }

    // Verificar path exacto: /SwonDev/Stacklume/releases/...
    let path = parsed.path();
    if !path.starts_with("/SwonDev/Stacklume/releases/") {
        return Err("URL de actualización no válida".to_string());
    }
    // Bloquear path traversal (.. en cualquier segmento)
    if path.split('/').any(|seg| seg == "..") {
        return Err("Path traversal detectado".to_string());
    }
    // Debe terminar en .exe
    if !path.to_lowercase().ends_with(".exe") {
        return Err("Solo se permiten archivos .exe".to_string());
    }

    let installer_path = std::env::temp_dir().join("StacklumeUpdate.exe");
    let installer_path_clone = installer_path.clone();

    // Límite de descarga: 500 MB (más que suficiente para el instalador NSIS)
    const MAX_DOWNLOAD_SIZE: u64 = 500 * 1024 * 1024;
    // Tamaño mínimo esperado: un instalador NSIS válido siempre supera 1 MB.
    // Sirve para detectar si se descargó una página HTML de redirect en lugar del .exe.
    const MIN_INSTALLER_SIZE: u64 = 1024 * 1024;

    // ureq es sincrónico — ejecutar en hilo blocking para no bloquear el runtime async
    tokio::task::spawn_blocking(move || {
        // Dejar que ureq siga los redirects automáticamente (GitHub → CDN es estándar).
        // La URL inicial ya fue validada contra nuestro repo; los redirects de GitHub
        // siempre van a objects.githubusercontent.com, que es su CDN oficial.
        let agent = ureq::AgentBuilder::new()
            .redirects(5)
            .build();

        let response = agent.get(&url).call()
            .map_err(|e| format!("Error de descarga: {}", e))?;

        // Verificar que la respuesta final es 200 OK (no 3xx, 4xx, 5xx)
        let status = response.status();
        if status != 200 {
            return Err(format!("Error HTTP {} al descargar el instalador", status));
        }

        // Verificar Content-Length si está disponible
        if let Some(len_str) = response.header("Content-Length") {
            if let Ok(len) = len_str.parse::<u64>() {
                if len > MAX_DOWNLOAD_SIZE {
                    return Err(format!("Archivo demasiado grande: {} bytes (máx {} MB)", len, MAX_DOWNLOAD_SIZE / 1024 / 1024));
                }
                if len < MIN_INSTALLER_SIZE {
                    return Err(format!("Archivo demasiado pequeño: {} bytes — posible error de descarga", len));
                }
            }
        }

        let mut file = std::fs::File::create(&installer_path_clone)
            .map_err(|e| format!("Error creando archivo temporal: {}", e))?;

        // Leer con límite de tamaño para prevenir DoS por archivos enormes
        let mut reader = response.into_reader();
        let mut limited_reader = reader.by_ref().take(MAX_DOWNLOAD_SIZE);
        let bytes_written = std::io::copy(&mut limited_reader, &mut file)
            .map_err(|e| format!("Error guardando instalador: {}", e))?;

        if bytes_written >= MAX_DOWNLOAD_SIZE {
            let _ = std::fs::remove_file(&installer_path_clone);
            return Err("Descarga excede el tamaño máximo permitido".to_string());
        }

        // Verificar tamaño mínimo del archivo descargado
        if bytes_written < MIN_INSTALLER_SIZE {
            let _ = std::fs::remove_file(&installer_path_clone);
            return Err(format!(
                "Instalador inválido: solo {} bytes descargados (mínimo esperado: {} MB). \
                 Puede ser una página de error en lugar del archivo.",
                bytes_written,
                MIN_INSTALLER_SIZE / 1024 / 1024
            ));
        }

        drop(file);

        // Spawn directo del instalador. Los hooks NSIS usan "taskkill /F /IM stacklume.exe"
        // SIN la bandera /T, por lo que no matan al instalador aunque sea hijo de la app.
        std::process::Command::new(&installer_path_clone)
            .spawn()
            .map_err(|e| format!("Error ejecutando instalador: {}", e))?;

        Ok::<(), String>(())
    })
    .await
    .map_err(|e| format!("Error interno: {}", e))?
}

/// Abre una URL externa en el navegador por defecto del sistema.
/// Valida la URL con el crate `url` y usa ShellExecuteW en Windows
/// para evitar inyección de comandos (no pasa por cmd.exe).
#[tauri::command]
fn open_url(url: String) -> Result<(), String> {
    // Validar la URL con parsing estricto
    let parsed = url::Url::parse(&url).map_err(|e| format!("URL mal formada: {}", e))?;
    if parsed.scheme() != "http" && parsed.scheme() != "https" {
        return Err("Protocolo no permitido: solo http/https".into());
    }

    #[cfg(windows)]
    {
        use std::ffi::OsStr;
        use std::os::windows::ffi::OsStrExt;

        // ShellExecuteW abre la URL directamente sin pasar por cmd.exe,
        // eliminando el vector de inyección de comandos shell.
        let wide_url: Vec<u16> = OsStr::new(url.as_str())
            .encode_wide()
            .chain(std::iter::once(0))
            .collect();
        let wide_open: Vec<u16> = OsStr::new("open")
            .encode_wide()
            .chain(std::iter::once(0))
            .collect();

        let result = unsafe {
            windows_sys::Win32::UI::Shell::ShellExecuteW(
                std::ptr::null_mut(),  // hwnd
                wide_open.as_ptr(),    // lpOperation = "open"
                wide_url.as_ptr(),     // lpFile = URL
                std::ptr::null(),      // lpParameters
                std::ptr::null(),      // lpDirectory
                1,                     // nShowCmd = SW_SHOWNORMAL
            )
        };
        if (result as isize) <= 32 {
            return Err("Error al abrir la URL en el navegador".into());
        }
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&url)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&url)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn get_server_port(state: State<'_, ServerState>) -> u16 {
    *state.port.lock().unwrap()
}

#[tauri::command]
fn get_app_data_dir(app: tauri::AppHandle) -> String {
    app.path()
        .app_data_dir()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string()
}

#[tauri::command]
fn minimize_window(window: tauri::WebviewWindow) {
    let _ = window.minimize();
}

#[tauri::command]
fn toggle_maximize_window(window: tauri::WebviewWindow) {
    if window.is_maximized().unwrap_or(false) {
        let _ = window.unmaximize();
    } else {
        let _ = window.maximize();
    }
}

#[tauri::command]
fn close_window(window: tauri::WebviewWindow) {
    let _ = window.close();
}

/// Actualiza el icono del system tray con un frame RGBA enviado desde el frontend.
/// Se llama ~30 veces por segundo desde TrayIconUpdater.tsx.
#[tauri::command]
fn update_tray_icon(
    app: tauri::AppHandle,
    rgba: Vec<u8>,
    width: u32,
    height: u32,
) -> Result<(), String> {
    // Validar dimensiones: máximo 256x256 (suficiente para cualquier icono de tray)
    if width == 0 || height == 0 || width > 256 || height > 256 {
        return Err(format!("Dimensiones de icono inválidas: {}x{} (máx 256x256)", width, height));
    }
    // Validar que el buffer RGBA tiene exactamente el tamaño esperado
    let expected_len = (width as usize) * (height as usize) * 4;
    if rgba.len() != expected_len {
        return Err(format!(
            "Tamaño de buffer RGBA incorrecto: {} bytes (esperados {} para {}x{})",
            rgba.len(), expected_len, width, height
        ));
    }
    if let Some(tray) = app.tray_by_id("main") {
        let icon = tauri::image::Image::new_owned(rgba, width, height);
        tray.set_icon(Some(icon)).map_err(|e| e.to_string())?;
    }
    Ok(())
}

// ─── System Tray ──────────────────────────────────────────────────────────────

fn setup_tray(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    use tauri::menu::{MenuBuilder, MenuItemBuilder};
    use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};

    let show_item = MenuItemBuilder::with_id("show", "Abrir Stacklume").build(app)?;
    let quit_item = MenuItemBuilder::with_id("quit", "Cerrar").build(app)?;
    let menu = MenuBuilder::new(app)
        .items(&[&show_item, &quit_item])
        .build()?;

    TrayIconBuilder::with_id("main")
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.set_focus();
                }
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}

// ─── Entry point ──────────────────────────────────────────────────────────────

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .manage(ServerState {
            port: Mutex::new(7878),
            #[cfg(not(dev))]
            node_child: Mutex::new(None),
            #[cfg(windows)]
            node_job: Mutex::new(0),
        })
        .setup(|app| {
            // Crear system tray (dev y prod)
            setup_tray(app)?;

            // ── MODO DEV ────────────────────────────────────────────────────────
            #[cfg(dev)]
            {
                println!("[Stacklume] Modo desarrollo — Next.js via beforeDevCommand");
                let app_handle = app.handle().clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_millis(600));
                    if let Some(w) = app_handle.get_webview_window("main") {
                        if let Ok(url) = "http://localhost:7878".parse::<tauri::Url>() {
                            let _ = w.navigate(url);
                        }
                        let _ = w.show();
                        let _ = w.set_focus();
                    }
                });
                return Ok(());
            }

            // ── MODO PRODUCCIÓN ─────────────────────────────────────────────────
            #[cfg(not(dev))]
            {
                use std::process::{Command, Stdio};

                // ── 1. Directorios y archivos de log ────────────────────────────
                let app_data = app
                    .path()
                    .app_data_dir()
                    .unwrap_or_else(|_| std::path::PathBuf::from("."));
                let _ = std::fs::create_dir_all(&app_data);

                let db_path = app_data.join("stacklume.db");
                let log_path = app_data.join("stacklume.log");
                let slog_path = app_data.join("server.log");

                // Iniciar log (truncar el anterior)
                let _ = std::fs::write(
                    &log_path,
                    format!("=== Stacklume Log ===\nVersion: 0.1.0\n"),
                );
                log(&log_path, "Iniciando aplicacion...");
                log(&log_path, &format!("app_data: {}", app_data.display()));

                // ── 2. Resolver rutas de recursos ────────────────────────────────
                let resource_dir = app
                    .path()
                    .resource_dir()
                    .unwrap_or_else(|_| {
                        std::env::current_exe()
                            .unwrap_or_default()
                            .parent()
                            .unwrap_or(std::path::Path::new("."))
                            .to_path_buf()
                    });

                let node_exe = resolve_resource(&resource_dir, "node/node.exe");
                let server_js = resolve_resource(&resource_dir, "server/server.js");

                let node_ok = node_exe.exists();
                let server_ok = server_js.exists();

                log(&log_path, &format!("resource_dir : {}", resource_dir.display()));
                log(&log_path, &format!("node.exe     : {} [{}]", node_exe.display(), if node_ok { "OK" } else { "FALTA" }));
                log(&log_path, &format!("server.js    : {} [{}]", server_js.display(), if server_ok { "OK" } else { "FALTA" }));
                log(&log_path, &format!("db_path      : {}", db_path.display()));

                // ── 3. Mostrar ventana INMEDIATAMENTE con página de carga ────────
                // Replica el LoadingScreen de la app: logo bento + "Stacklume" + tres puntos.
                // La ventana siempre se muestra — el usuario nunca ve una ventana invisible.
                let loading_page = concat!(
                    "data:text/html,<html><head><meta charset='utf-8'><style>",
                    "*{margin:0;padding:0;box-sizing:border-box}",
                    "html,body{height:100%;background:%230d1117;overflow:hidden}",
                    "body{display:flex;align-items:center;justify-content:center;",
                    "font-family:system-ui,-apple-system,sans-serif}",
                    ".wrap{display:flex;flex-direction:column;align-items:center;",
                    "gap:32px;position:relative}",
                    ".brand{display:flex;align-items:center;gap:12px}",
                    ".logo-wrap{position:relative;width:48px;height:48px}",
                    ".glow{position:absolute;inset:-4px;border-radius:14px;",
                    "background:rgba(212,165,32,0.22);filter:blur(16px);",
                    "animation:pulse 2s ease-in-out infinite}",
                    ".logo{position:relative;width:48px;height:48px;border-radius:12px;",
                    "background:linear-gradient(135deg,%23d4a520,%23b8860b);",
                    "display:flex;align-items:center;justify-content:center;",
                    "box-shadow:0 4px 24px rgba(212,165,32,0.40)}",
                    ".name{font-size:24px;font-weight:600;color:%23e2e8f0;letter-spacing:-.3px}",
                    ".dots{display:flex;gap:8px;align-items:center}",
                    ".dot{width:10px;height:10px;border-radius:50%;background:%23d4a520}",
                    ".d1{animation:bounce .8s ease-in-out 0s infinite}",
                    ".d2{animation:bounce .8s ease-in-out .15s infinite}",
                    ".d3{animation:bounce .8s ease-in-out .3s infinite}",
                    ".lbl{font-size:13px;color:%23666}",
                    ".c{position:absolute;width:64px;height:64px;",
                    "border-color:rgba(212,165,32,0.18);border-style:solid}",
                    ".tl{top:-88px;left:-88px;border-width:2px 0 0 2px;border-radius:12px 0 0 0}",
                    ".tr{top:-88px;right:-88px;border-width:2px 2px 0 0;border-radius:0 12px 0 0}",
                    ".bl{bottom:-88px;left:-88px;border-width:0 0 2px 2px;border-radius:0 0 0 12px}",
                    ".br{bottom:-88px;right:-88px;border-width:0 2px 2px 0;border-radius:0 0 12px 0}",
                    "@keyframes bounce{",
                    "0%,100%{transform:translateY(0);opacity:.4;transform:translateY(0) scale(.8)}",
                    "50%{transform:translateY(-8px) scale(1);opacity:1}}",
                    "@keyframes pulse{0%,100%{opacity:.5;transform:scale(1)}",
                    "50%{opacity:.85;transform:scale(1.25)}}",
                    "</style></head><body><div class='wrap'>",
                    "<div class='c tl'></div><div class='c tr'></div>",
                    "<div class='brand'>",
                    "<div class='logo-wrap'>",
                    "<div class='glow'></div>",
                    "<div class='logo'>",
                    "<svg width='28' height='28' viewBox='0 0 24 24' fill='none'",
                    " stroke='white' stroke-width='2'",
                    " stroke-linecap='round' stroke-linejoin='round'>",
                    "<rect x='3' y='3' width='7' height='7' rx='1'/>",
                    "<rect x='14' y='3' width='7' height='7' rx='1'/>",
                    "<rect x='3' y='14' width='7' height='7' rx='1'/>",
                    "<rect x='14' y='14' width='7' height='7' rx='1'/>",
                    "</svg></div></div>",
                    "<span class='name'>Stacklume</span>",
                    "</div>",
                    "<div class='dots'>",
                    "<div class='dot d1'></div>",
                    "<div class='dot d2'></div>",
                    "<div class='dot d3'></div>",
                    "</div>",
                    "<span class='lbl'>Iniciando Stacklume...</span>",
                    "<div class='c bl'></div><div class='c br'></div>",
                    "</div></body></html>"
                );

                if let Some(window) = app.get_webview_window("main") {
                    if let Ok(url) = loading_page.parse::<tauri::Url>() {
                        let r = window.navigate(url);
                        log(&log_path, &format!("navigate(loading): {:?}", r));
                    }
                    let r = window.show();
                    log(&log_path, &format!("window.show(): {:?}", r));
                } else {
                    log(&log_path, "ERROR: No se encontro la ventana 'main'");
                }

                // ── 4. Verificar que los recursos existen ────────────────────────
                if !node_ok || !server_ok {
                    log(&log_path, "FATAL: Recursos no encontrados — abortando");
                    if let Some(window) = app.get_webview_window("main") {
                        let html = format!(
                            concat!(
                                "data:text/html,<html><body style='background:%230d1117;color:%23fff;",
                                "font-family:sans-serif;display:flex;align-items:center;",
                                "justify-content:center;height:100vh;margin:0'>",
                                "<div style='text-align:center;padding:2rem;max-width:600px'>",
                                "<h2 style='color:%23ef4444;margin-bottom:1rem'>",
                                "Recursos no encontrados</h2>",
                                "<p style='color:%23aaa;margin-bottom:1rem'>",
                                "node.exe: {node_ok} | server.js: {server_ok}</p>",
                                "<p style='font-size:12px;color:%23666'>",
                                "Log: {log}</p></div></body></html>"
                            ),
                            node_ok = node_ok,
                            server_ok = server_ok,
                            log = log_path.file_name().unwrap_or_default().to_string_lossy()
                        );
                        if let Ok(url) = html.parse::<tauri::Url>() {
                            let _ = window.navigate(url);
                        }
                    }
                    return Ok(());
                }

                // ── 5. Asignar puerto ────────────────────────────────────────────
                let port = find_free_port();
                {
                    let srv = app.state::<ServerState>();
                    *srv.port.lock().unwrap() = port;
                }
                log(&log_path, &format!("Puerto asignado: {}", port));

                // ── 6. Lanzar servidor Next.js ───────────────────────────────────
                // Redirigimos stdout y stderr al archivo server.log para diagnóstico.
                let slog_out = std::fs::OpenOptions::new()
                    .create(true)
                    .truncate(true)
                    .write(true)
                    .open(&slog_path)
                    .ok();
                let slog_err = slog_out
                    .as_ref()
                    .and_then(|f| f.try_clone().ok());

                // El servidor Next.js standalone debe ejecutarse desde su propio directorio.
                // Pasamos "server.js" como ruta RELATIVA con current_dir apuntando al
                // directorio del servidor — esto evita el error EISDIR al pasar rutas
                // absolutas de Windows (p.ej. "C:\..." → Node.js lee "C:" como directorio).
                let server_dir = server_js
                    .parent()
                    .unwrap_or_else(|| std::path::Path::new("."))
                    .to_path_buf();

                log(&log_path, &format!("server_dir: {}", server_dir.display()));

                let mut cmd = Command::new(&node_exe);
                cmd.env_clear()
                    .current_dir(&server_dir)
                    .arg("server.js")
                    // Variables de la aplicación
                    .env("PORT", port.to_string())
                    .env("HOSTNAME", "127.0.0.1")
                    .env("DESKTOP_MODE", "true")
                    .env("DATABASE_PATH", db_path.to_str().unwrap_or("stacklume.db"))
                    .env("NODE_ENV", "production")
                    // Variables del sistema Windows necesarias para Node.js
                    .env("SystemRoot", std::env::var("SystemRoot").unwrap_or_default())
                    .env("SystemDrive", std::env::var("SystemDrive").unwrap_or_default())
                    .env("APPDATA", std::env::var("APPDATA").unwrap_or_default())
                    .env("LOCALAPPDATA", std::env::var("LOCALAPPDATA").unwrap_or_default())
                    .env("TEMP", std::env::var("TEMP").unwrap_or_default())
                    .env("TMP", std::env::var("TMP").unwrap_or_default())
                    .env("PATH", std::env::var("PATH").unwrap_or_default())
                    .env("USERPROFILE", std::env::var("USERPROFILE").unwrap_or_default())
                    .env("COMPUTERNAME", std::env::var("COMPUTERNAME").unwrap_or_default())
                    .env("USERNAME", std::env::var("USERNAME").unwrap_or_default())
                    .env("ProgramData", std::env::var("ProgramData").unwrap_or_default())
                    .env("windir", std::env::var("windir").unwrap_or_default());

                // Cargar claves privadas desde .env.keys (generado por build-desktop.mjs).
                // Este archivo solo existe en builds privadas del propietario — no en el repo público.
                // Whitelist de variables de entorno permitidas desde .env.keys
                // para evitar que un archivo .env.keys comprometido inyecte
                // variables arbitrarias (PATH, LD_PRELOAD, NODE_OPTIONS, etc.)
                const ALLOWED_ENV_KEYS: &[&str] = &[
                    "AUTH_SECRET",
                    "AUTH_USERNAME",
                    "AUTH_PASSWORD_HASH",
                    "SENTRY_DSN",
                    "NEXT_PUBLIC_SENTRY_DSN",
                    "UPSTASH_REDIS_REST_URL",
                    "UPSTASH_REDIS_REST_TOKEN",
                    "DATABASE_URL",
                ];

                let env_keys_path = server_dir.join(".env.keys");
                if env_keys_path.exists() {
                    if let Ok(contents) = std::fs::read_to_string(&env_keys_path) {
                        let mut loaded = 0u32;
                        let mut skipped = 0u32;
                        for line in contents.lines() {
                            let line = line.trim();
                            if line.starts_with('#') || line.is_empty() { continue; }
                            if let Some((k, v)) = line.split_once('=') {
                                let k = k.trim();
                                let v = v.trim().trim_matches('"').trim_matches('\'');
                                if !k.is_empty() && !v.is_empty() {
                                    if ALLOWED_ENV_KEYS.contains(&k) {
                                        cmd.env(k, v);
                                        loaded += 1;
                                    } else {
                                        skipped += 1;
                                    }
                                }
                            }
                        }
                        log(&log_path, &format!(".env.keys: {} variables cargadas, {} ignoradas (no en whitelist)", loaded, skipped));
                    }
                }

                // Evitar que node.exe abra una ventana de consola en Windows
                #[cfg(windows)]
                {
                    use std::os::windows::process::CommandExt;
                    cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
                }

                match (slog_out, slog_err) {
                    (Some(out), Some(err)) => {
                        cmd.stdout(Stdio::from(out)).stderr(Stdio::from(err));
                    }
                    _ => {
                        cmd.stdout(Stdio::null()).stderr(Stdio::null());
                    }
                }

                log(&log_path, &format!("Spawning: {} {}", node_exe.display(), server_js.display()));

                match cmd.spawn() {
                    Ok(child) => {
                        let pid = child.id();
                        log(&log_path, &format!("Servidor iniciado (PID: {})", pid));

                        // Job Object: node.exe muere automáticamente cuando Stacklume.exe
                        // termina por CUALQUIER razón (incluso TerminateProcess de NSIS).
                        #[cfg(windows)]
                        {
                            let job = create_job_for_child(pid);
                            if job != 0 {
                                log(&log_path, "Job Object creado — node.exe se matará al cerrar la app");
                                *app.state::<ServerState>().node_job.lock().unwrap() = job;
                            } else {
                                log(&log_path, "WARN: No se pudo crear Job Object");
                            }
                        }

                        // Guardamos el handle para poder matar el proceso explícitamente al cerrar
                        *app.state::<ServerState>().node_child.lock().unwrap() = Some(child);
                    }
                    Err(e) => {
                        log(&log_path, &format!("ERROR spawning: {}", e));
                        if let Some(window) = app.get_webview_window("main") {
                            let html = format!(
                                concat!(
                                    "data:text/html,<html><body style='background:%230d1117;color:%23fff;",
                                    "font-family:sans-serif;display:flex;align-items:center;",
                                    "justify-content:center;height:100vh;margin:0'>",
                                    "<div style='text-align:center;padding:2rem;max-width:600px'>",
                                    "<h2 style='color:%23ef4444;margin-bottom:1rem'>",
                                    "Error al iniciar servidor</h2>",
                                    "<p style='color:%23aaa;margin-bottom:1rem'>{e}</p>",
                                    "<p style='font-size:12px;color:%23666'>Log: {log}</p>",
                                    "</div></body></html>"
                                ),
                                e = e,
                                log = log_path.file_name().unwrap_or_default().to_string_lossy()
                            );
                            if let Ok(url) = html.parse::<tauri::Url>() {
                                let _ = window.navigate(url);
                            }
                        }
                        return Ok(());
                    }
                }

                // ── 7. Hilo de espera: navega al servidor cuando esté listo ─────
                let app_handle = app.handle().clone();
                let log_path2 = log_path.clone();
                let slog_path2 = slog_path.clone();

                std::thread::spawn(move || {
                    log(&log_path2, "Esperando que el servidor arranque...");
                    let ready = wait_for_server(port);

                    if ready {
                        log(&log_path2, "Servidor listo — navegando");
                        if let Some(window) = app_handle.get_webview_window("main") {
                            let url_str = format!("http://127.0.0.1:{}", port);
                            if let Ok(url) = url_str.parse::<tauri::Url>() {
                                let rn = window.navigate(url);
                                let rs = window.show();
                                log(&log_path2, &format!("navigate: {:?} | show: {:?}", rn, rs));
                            }
                        }
                    } else {
                        // Timeout: leer el server.log para mostrar el error
                        log(&log_path2, "TIMEOUT: El servidor no respondio en 40s");
                        let tail = std::fs::read_to_string(&slog_path2)
                            .unwrap_or_else(|_| "(servidor sin output)".into());
                        let tail_last: String = tail
                            .lines()
                            .rev()
                            .take(20)
                            .collect::<Vec<_>>()
                            .iter()
                            .rev()
                            .cloned()
                            .collect::<Vec<_>>()
                            .join("\n");
                        log(&log_path2, &format!("Server.log tail:\n{}", tail_last));

                        // Mostrar página de error con los últimos logs del servidor
                        if let Some(window) = app_handle.get_webview_window("main") {
                            // Codificar el tail para data URI (solo los chars peligrosos)
                            let encoded_tail = tail_last
                                .replace('%', "%25")
                                .replace('#', "%23")
                                .replace('<', "&lt;")
                                .replace('>', "&gt;");
                            let html = format!(
                                concat!(
                                    "data:text/html,<html><head><meta charset='utf-8'></head>",
                                    "<body style='background:%230d1117;color:%23fff;",
                                    "font-family:sans-serif;display:flex;align-items:center;",
                                    "justify-content:center;height:100vh;margin:0'>",
                                    "<div style='text-align:center;padding:2rem;max-width:700px;width:100%'>",
                                    "<h2 style='color:%23f97316;margin-bottom:.5rem'>",
                                    "El servidor no arranco</h2>",
                                    "<p style='color:%23aaa;margin-bottom:1rem;font-size:14px'>",
                                    "Puerto {port} - timeout 40s</p>",
                                    "<pre style='background:%23111;border:1px solid %23333;",
                                    "border-radius:8px;padding:1rem;font-size:11px;",
                                    "text-align:left;overflow:auto;max-height:250px;",
                                    "color:%23f87171;white-space:pre-wrap;word-break:break-all'>",
                                    "{tail}</pre>",
                                    "<p style='margin-top:1rem;font-size:11px;color:%23666'>",
                                    "Log completo: {log}</p>",
                                    "</div></body></html>"
                                ),
                                port = port,
                                tail = encoded_tail,
                                log = log_path2.file_name().unwrap_or_default().to_string_lossy()
                            );
                            if let Ok(url) = html.parse::<tauri::Url>() {
                                let rn = window.navigate(url);
                                let rs = window.show();
                                log(&log_path2, &format!("error page nav: {:?} | show: {:?}", rn, rs));
                            }
                        }
                    }
                });

                Ok(())
            }
        })
        .on_window_event(|_window, event| {
            // Botón X → ocultar al tray en lugar de cerrar la aplicación.
            // Para cerrar completamente: menú del tray → "Cerrar" (app.exit(0)).
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = _window.hide();
            }

            // Cuando la ventana principal se destruye, matar el proceso node.exe hijo.
            // Esto evita que node.exe quede bloqueando el archivo durante reinstalaciones.
            if let tauri::WindowEvent::Destroyed = event {
                #[cfg(not(dev))]
                {
                    let app = _window.app_handle();
                    let state = app.state::<ServerState>();
                    // Extraemos el Child en una expresión para que el MutexGuard se suelte
                    // antes de que 'state' salga de scope (evita error E0597 en release)
                    let maybe_child = state.node_child.lock()
                        .ok()
                        .and_then(|mut g| g.take());
                    drop(state);
                    if let Some(mut child) = maybe_child {
                        let _ = child.kill();
                        let _ = child.wait();
                    }
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            download_and_run_update,
            open_url,
            get_server_port,
            get_app_data_dir,
            minimize_window,
            toggle_maximize_window,
            close_window,
            update_tray_icon,
        ])
        .run(tauri::generate_context!())
        .expect("Error al ejecutar Stacklume");
}
