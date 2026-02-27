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
    use windows_sys::Win32::System::Threading::{OpenProcess, PROCESS_ALL_ACCESS};

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
        SetInformationJobObject(
            job,
            9,
            &mut info as *mut _ as *mut core::ffi::c_void,
            std::mem::size_of::<JOBOBJECT_EXTENDED_LIMIT_INFORMATION>() as u32,
        );

        // Asignar el proceso hijo al job
        let process = OpenProcess(PROCESS_ALL_ACCESS, 0, child_pid);
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

/// Busca un puerto TCP libre comenzando desde 3001.
#[cfg(not(dev))]
fn find_free_port() -> u16 {
    for port in [3001u16, 3002, 3003, 3004, 3005, 3006, 3007, 3008] {
        if TcpListener::bind(format!("127.0.0.1:{}", port)).is_ok() {
            return port;
        }
    }
    3001
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

// ─── Entry point ──────────────────────────────────────────────────────────────

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(ServerState {
            port: Mutex::new(3000),
            #[cfg(not(dev))]
            node_child: Mutex::new(None),
            #[cfg(windows)]
            node_job: Mutex::new(0),
        })
        .setup(|app| {
            // ── MODO DEV ────────────────────────────────────────────────────────
            #[cfg(dev)]
            {
                println!("[Stacklume] Modo desarrollo — Next.js via beforeDevCommand");
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.show();
                }
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
                            log = log_path.display()
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
                cmd.current_dir(&server_dir)
                    .arg("server.js")
                    .env("PORT", port.to_string())
                    .env("HOSTNAME", "127.0.0.1")
                    .env("DESKTOP_MODE", "true")
                    .env("DATABASE_PATH", db_path.to_str().unwrap_or("stacklume.db"))
                    .env("NODE_ENV", "production");

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
                                log = log_path.display()
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
                                log = log_path2.display()
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
            get_server_port,
            get_app_data_dir,
            minimize_window,
            toggle_maximize_window,
            close_window,
        ])
        .run(tauri::generate_context!())
        .expect("Error al ejecutar Stacklume");
}
