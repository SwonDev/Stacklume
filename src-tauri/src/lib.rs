use std::io::Read as _;
use std::sync::Mutex;
use tauri::{Emitter, Manager, State};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

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

/// Estado del servidor LLM local integrado (llama.cpp llama-server)
struct LlamaState {
    /// Puerto asignado al servidor llama-server (0 = no iniciado/disponible)
    port: Mutex<u16>,
    /// Estado actual: "no_binary" | "no_model" | "starting" | "ready" | "error"
    status: Mutex<String>,
    /// Ruta al modelo GGUF actualmente configurado
    model_path: Mutex<Option<String>>,
    /// Ruta al binario llama-server.exe (resuelto en startup)
    binary_path: Mutex<Option<String>>,
    /// Handle del proceso llama-server (solo producción)
    #[cfg(not(dev))]
    llama_child: Mutex<Option<std::process::Child>>,
    /// Windows Job Object: mata llama-server automáticamente al cerrar la app
    #[cfg(windows)]
    llama_job: Mutex<isize>,
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

/// Busca cualquier puerto TCP libre (sin puerto preferido específico)
fn find_any_free_port() -> u16 {
    for _ in 0..50 {
        if let Ok(listener) = TcpListener::bind("127.0.0.1:0") {
            if let Ok(addr) = listener.local_addr() {
                return addr.port();
            }
        }
    }
    7881
}

/// Espera hasta que llama-server responda al health check.
/// Usa TCP raw + HTTP manual en vez de ureq (que tiene problemas en producción).
fn wait_for_llama_server(port: u16) -> bool {
    use std::io::{Read, Write};
    use std::net::TcpStream;

    let addr = format!("127.0.0.1:{}", port);
    // 360 × 500ms = 180 segundos (3 min)
    for _ in 0..360 {
        if let Ok(mut stream) = TcpStream::connect_timeout(
            &addr.parse().unwrap(),
            std::time::Duration::from_secs(2),
        ) {
            let _ = stream.set_read_timeout(Some(std::time::Duration::from_secs(2)));
            let req = format!("GET /health HTTP/1.0\r\nHost: 127.0.0.1:{}\r\n\r\n", port);
            if stream.write_all(req.as_bytes()).is_ok() {
                let mut buf = [0u8; 512];
                if let Ok(n) = stream.read(&mut buf) {
                    let resp = String::from_utf8_lossy(&buf[..n]);
                    if resp.contains("200") || resp.contains("ok") {
                        return true;
                    }
                }
            }
        }
        std::thread::sleep(std::time::Duration::from_millis(500));
    }
    false
}

/// Detecta cuántas GPU layers usar.
/// Solo usa GPU si ggml-cuda.dll existe junto al binario de llama-server.
fn detect_gpu_layers(binary_path: &str, model_path: &str, llm_log: &dyn Fn(&str)) -> String {
    use std::process::Command;

    let clean_path = binary_path.strip_prefix(r"\\?\").unwrap_or(binary_path);
    let llama_dir = std::path::Path::new(clean_path).parent();
    let cuda_path = llama_dir.map(|d| d.join("ggml-cuda.dll"));
    let has_cuda = cuda_path.as_ref().map(|p| p.exists()).unwrap_or(false);
    let has_vulkan = llama_dir.map(|d| d.join("ggml-vulkan.dll").exists()).unwrap_or(false);

    llm_log(&format!("detect_gpu: binary={} dir={:?} cuda={} vulkan={}",
        clean_path, llama_dir.map(|d| d.display().to_string()), has_cuda, has_vulkan));

    if !has_cuda && !has_vulkan {
        llm_log("detect_gpu: no GPU backend found → ngl 0");
        return "0".to_string();
    }

    // Si hay backend CUDA, detectar VRAM y calcular layers
    let mut nv_cmd = Command::new("C:\\Windows\\System32\\nvidia-smi.exe");
    nv_cmd.args(["--query-gpu=memory.free", "--format=csv,noheader,nounits"]);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        nv_cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }
    let vram_free_mb = nv_cmd
        .output()
        .ok()
        .filter(|o| o.status.success())
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .and_then(|s| s.lines().next().and_then(|l| l.trim().parse::<u64>().ok()))
        .unwrap_or(0);

    if vram_free_mb == 0 {
        return "0".to_string();
    }

    let model_size_mb = std::fs::metadata(model_path)
        .map(|m| m.len() / (1024 * 1024))
        .unwrap_or(0);
    let needed_mb = (model_size_mb as f64 * 1.1) as u64 + 200;

    if vram_free_mb >= needed_mb {
        "99".to_string()
    } else if vram_free_mb > 500 {
        let ratio = vram_free_mb as f64 / needed_mb as f64;
        let layers = (ratio * 40.0).max(1.0).min(40.0) as u32;
        layers.to_string()
    } else {
        "0".to_string()
    }
}

/// Arranca llama-server de forma síncrona (llamar desde un hilo background).
fn spawn_llama_server_blocking(app: &tauri::AppHandle) -> Result<(), String> {
    use std::process::{Command, Stdio};

    // Log de LLM para diagnóstico (se limpia al arrancar)
    let llm_log_path = app.path().app_data_dir().unwrap_or_default().join("llm.log");
    let _ = std::fs::write(&llm_log_path, ""); // Limpiar al inicio
    let llm_log = |msg: &str| {
        use std::io::Write;
        if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open(&llm_log_path) {
            let ts = chrono_lite();
            let _ = writeln!(f, "[{}] {}", ts, msg);
        }
    };

    let binary_path;
    let model_path;
    let port;

    {
        let state = app.state::<LlamaState>();
        // Strip \\?\ prefix que Tauri añade en producción — causa problemas con
        // DLL loading de CUDA (ggml-cuda.dll busca cublas64_12.dll en el directorio
        // del exe, pero con \\?\ prefix el directorio no se resuelve correctamente)
        binary_path = state
            .binary_path
            .lock()
            .unwrap()
            .clone()
            .map(|p| p.strip_prefix(r"\\?\").unwrap_or(&p).to_string())
            .ok_or_else(|| "llama-server no disponible".to_string())?;
        model_path = state
            .model_path
            .lock()
            .unwrap()
            .clone()
            .map(|p| p.strip_prefix(r"\\?\").unwrap_or(&p).to_string())
            .ok_or_else(|| "Modelo no configurado".to_string())?;
        port = *state.port.lock().unwrap();
    }

    if port == 0 {
        return Err("Puerto llama-server no asignado".to_string());
    }

    let ngl = detect_gpu_layers(&binary_path, &model_path, &llm_log);


    // Detectar número de CPUs lógicos para --threads (mínimo 2, máximo 8)
    let n_threads = std::thread::available_parallelism()
        .map(|n| n.get().min(8).max(2))
        .unwrap_or(4)
        .to_string();

    // Detectar familia del modelo para auto-configurar parámetros del servidor
    let model_filename = std::path::Path::new(&model_path)
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();
    let family = detect_model_family(&model_filename);

    // Parámetros de llama-server adaptados por familia de modelo.
    // Los parámetros de sampling (temp, top_k, etc.) se envían per-request desde route.ts,
    // pero ctx-size, n-predict, jinja y reasoning son configuraciones del servidor.
    let (ctx_size, n_predict, use_jinja, reasoning_mode, default_temp, default_top_k, default_top_p) = match family {
        "qwen3" => ("16384", "2048", true, "auto", "0.7", "20", "0.8"),
        "qwen2" => ("8192",  "2048", true, "off",  "0.7", "20", "0.8"),
        "llama3" => ("8192",  "2048", true, "off",  "0.6", "40", "0.9"),
        "mistral" => ("8192", "2048", true, "off",  "0.7", "50", "0.9"),
        "phi" =>    ("4096",  "1024", true, "off",  "0.7", "40", "0.9"),
        "gemma" =>  ("8192",  "2048", true, "off",  "0.7", "40", "0.9"),
        "deepseek" => ("16384","4096", true, "auto", "0.6", "20", "0.95"),
        _ =>        ("4096",  "1024", true, "off",  "0.7", "40", "0.9"),
    };

    // Usar ctx-size de la familia directamente (llama.cpp ajusta automáticamente si no cabe)
    let effective_ctx = ctx_size;

    llm_log(&format!("binary: {}", binary_path));
    llm_log(&format!("model: {}", model_path));
    llm_log(&format!("port: {} | ngl: {} ({}) | ctx: {}", port, ngl, if ngl == "0" { "CPU" } else { "GPU" }, effective_ctx));

    // Detectar proyector multimodal (mmproj) para soporte de visión
    let mmproj_path: Option<std::path::PathBuf> = std::path::Path::new(&model_path)
        .parent()
        .map(|d| d.join("mmproj-F16.gguf"))
        .filter(|p| p.exists());

    let mut cmd = Command::new(&binary_path);
    cmd.arg("--model").arg(&model_path)
        .arg("--host").arg("127.0.0.1")
        .arg("--port").arg(port.to_string())
        .arg("--ctx-size").arg(effective_ctx)
        .arg("-ngl").arg(&ngl)
        .arg("--threads").arg(&n_threads)
        .arg("--threads-batch").arg(&n_threads)
        .arg("--n-predict").arg(n_predict)
        .arg("--temp").arg(default_temp)
        .arg("--top-k").arg(default_top_k)
        .arg("--top-p").arg(default_top_p)
        .arg("--min-p").arg("0")
        .arg("--no-context-shift")
        .arg("--log-disable")
        .stdout(Stdio::null())
        .stderr(Stdio::null());

    // CRÍTICO: establecer current_dir al directorio de llama-server para que
    // Windows cargue NUESTRAS DLLs de CUDA bundleadas (no las del CUDA Toolkit del sistema).
    // Windows busca DLLs en: 1) directorio del exe, 2) current directory, 3) System32, 4) PATH.
    // Con current_dir apuntando al directorio del exe, nuestras DLLs tienen máxima prioridad.
    if let Some(llama_dir) = std::path::Path::new(&binary_path).parent() {
        cmd.current_dir(llama_dir);
        llm_log(&format!("current_dir: {}", llama_dir.display()));
    }

    if use_jinja { cmd.arg("--jinja"); }
    cmd.arg("--reasoning").arg(reasoning_mode);
    if let Some(ref mp) = mmproj_path { cmd.arg("--mmproj").arg(mp); }

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        // Tauri es GUI subsystem → procesos hijos no pueden inicializar CUDA sin consola.
        // AllocConsole crea una consola temporal, pero CREATE_NO_WINDOW la bloquea.
        // Solución: solo ABOVE_NORMAL_PRIORITY. La consola se oculta porque
        // stdout/stderr van a Stdio::null(). No aparece ventana visible.
        cmd.creation_flags(0x00008000); // ABOVE_NORMAL_PRIORITY_CLASS
    }

    // Matar CUALQUIER llama-server previo antes de spawnar (evitar duplicados)
    #[cfg(windows)]
    {
        let _ = silent_command("taskkill")
            .args(["/f", "/im", "llama-server.exe"])
            .output();
        std::thread::sleep(std::time::Duration::from_secs(1));
    }

    // Spawnar llama-server via un .bat wrapper que crea su propia consola.
    // Tauri es GUI app sin consola → CUDA falla con Stdio::null/inherit/piped.
    // Un .bat siempre crea su propia consola de forma nativa.
    let wrapper_path = app.path().app_data_dir().unwrap_or_default().join("_llama_run.bat");
    {
        let mut bat_content = format!(
            "@echo off\r\n\"{binary}\" --model \"{model}\" --host 127.0.0.1 --port {port} --ctx-size {ctx} -ngl {ngl} --threads {threads} --threads-batch {threads} --n-predict {predict} --temp {temp} --top-k {topk} --top-p {topp} --min-p 0 --no-context-shift --log-disable",
            binary = binary_path,
            model = model_path,
            port = port,
            ctx = effective_ctx,
            ngl = ngl,
            threads = n_threads,
            predict = n_predict,
            temp = default_temp,
            topk = default_top_k,
            topp = default_top_p,
        );
        if use_jinja { bat_content.push_str(" --jinja"); }
        bat_content.push_str(&format!(" --reasoning {}", reasoning_mode));
        if let Some(ref mp) = mmproj_path { bat_content.push_str(&format!(" --mmproj \"{}\"", mp.display())); }
        bat_content.push_str("\r\n");
        let _ = std::fs::write(&wrapper_path, &bat_content);
        llm_log(&format!("wrapper: {}", wrapper_path.display()));
    }

    let mut cmd = Command::new("cmd.exe");
    cmd.arg("/c").arg(&wrapper_path)
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    if let Some(llama_dir) = std::path::Path::new(&binary_path).parent() {
        cmd.current_dir(llama_dir);
    }

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000 | 0x00008000); // CREATE_NO_WINDOW + ABOVE_NORMAL
    }

    llm_log("Spawning llama-server via wrapper...");
    match cmd.spawn() {
        Ok(mut child) => {
            let pid = child.id();
            llm_log(&format!("wrapper spawned: PID {}", pid));

            #[cfg(windows)]
            {
                let job = create_job_for_child(pid);
                if job != 0 {
                    *app.state::<LlamaState>().llama_job.lock().unwrap() = job;
                }
            }

            #[cfg(not(dev))]
            {
                *app.state::<LlamaState>().llama_child.lock().unwrap() = Some(child);
            }

            // Esperar a que llama-server arranque (el wrapper cmd.exe lo lanza)
            std::thread::sleep(std::time::Duration::from_secs(3));

            // Health check polling
            llm_log("Health check polling...");
            let health_ok = wait_for_llama_server(port);

            if health_ok {
                llm_log("llama-server READY");
                *app.state::<LlamaState>().status.lock().unwrap() = "ready".to_string();
                let _ = app.emit("llm:status-changed", "ready");
            } else {
                llm_log("TIMEOUT: llama-server no respondió en 120s");
                let msg = "error: llama-server no respondió en 120s — prueba un modelo más pequeño".to_string();
                *app.state::<LlamaState>().status.lock().unwrap() = msg.clone();
                let _ = app.emit("llm:status-changed", msg.clone());
                return Err(msg);
            }
        }
        Err(e) => {
            llm_log(&format!("SPAWN ERROR: {}", e));
            *app.state::<LlamaState>().status.lock().unwrap() = "error".to_string();
            let _ = app.emit("llm:status-changed", format!("error: {}", e));
            return Err(e.to_string());
        }
    }

    Ok(())
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

/// Abre una ruta local (archivo o carpeta) con la aplicación por defecto del sistema.
/// Usa ShellExecuteW en Windows para evitar inyección de comandos.
#[tauri::command]
fn open_local_path(path: String) -> Result<(), String> {
    // Seguridad: rechazar bytes nulos y caracteres de escape
    if path.contains('\0') || path.contains('\n') || path.contains('\r') {
        return Err("Ruta inválida: contiene caracteres no permitidos".to_string());
    }

    #[cfg(windows)]
    {
        use std::ffi::OsStr;
        use std::os::windows::ffi::OsStrExt;

        let wide_path: Vec<u16> = OsStr::new(path.as_str())
            .encode_wide()
            .chain(std::iter::once(0))
            .collect();
        let wide_open: Vec<u16> = OsStr::new("open")
            .encode_wide()
            .chain(std::iter::once(0))
            .collect();

        let result = unsafe {
            windows_sys::Win32::UI::Shell::ShellExecuteW(
                std::ptr::null_mut(),
                wide_open.as_ptr(),
                wide_path.as_ptr(),
                std::ptr::null(),
                std::ptr::null(),
                1, // SW_SHOWNORMAL
            )
        };
        if (result as isize) <= 32 {
            return Err("No se pudo abrir la ruta".to_string());
        }
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Abre una ruta en VS Code (si está instalado en el PATH).
#[tauri::command]
fn open_in_vscode(path: String) -> Result<(), String> {
    if path.contains('\0') || path.contains('\n') || path.contains('\r') {
        return Err("Ruta inválida".to_string());
    }
    std::process::Command::new("code")
        .arg(&path)
        .spawn()
        .map_err(|_| "VS Code no encontrado. Asegúrate de que 'code' está en el PATH.".to_string())?;
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

// ─── Comandos LLM local ───────────────────────────────────────────────────────

/// Puerto del servidor llama-server local (0 si no está iniciado/disponible)
#[tauri::command]
fn get_llama_port(state: State<'_, LlamaState>) -> u16 {
    *state.port.lock().unwrap()
}

/// Devuelve la versión del exe tal y como la conoce Tauri (compilada desde tauri.conf.json).
/// Usar SIEMPRE esto en lugar de NEXT_PUBLIC_APP_VERSION, que puede quedar desactualizada
/// cuando se usa SKIP_NEXT_BUILD=1 y se reutiliza un .next/standalone de una build anterior.
#[tauri::command]
fn get_app_version(app: tauri::AppHandle) -> String {
    app.package_info().version.to_string()
}

/// Estado del LLM local: "no_binary" | "no_model" | "starting" | "ready" | "error"
#[tauri::command]
fn get_llm_status(state: State<'_, LlamaState>) -> String {
    state.status.lock().unwrap().clone()
}

/// Arranca llama-server si el modelo ya está descargado.
#[tauri::command]
async fn start_llama_server(app: tauri::AppHandle) -> Result<(), String> {
    // Matar proceso previo si sigue vivo (evita conflicto de puerto en reintentos)
    #[cfg(not(dev))]
    {
        let state = app.state::<LlamaState>();
        let child_opt = state.llama_child.lock().unwrap().take();
        if let Some(mut child) = child_opt {
            let _ = child.kill();
            let _ = child.wait();
        }
    }

    let app_clone = app.clone();
    *app.state::<LlamaState>().status.lock().unwrap() = "starting".to_string();
    let _ = app.emit("llm:status-changed", "starting");
    std::thread::spawn(move || {
        if let Err(e) = spawn_llama_server_blocking(&app_clone) {
            eprintln!("[Stacklume] Error arrancando llama-server: {}", e);
            let msg = format!("error: {}", e);
            *app_clone.state::<LlamaState>().status.lock().unwrap() = msg.clone();
            let _ = app_clone.emit("llm:status-changed", msg);
        }
    });
    Ok(())
}

/// Timestamp simple sin dependencia de chrono
fn chrono_lite() -> String {
    use std::time::SystemTime;
    let d = SystemTime::now().duration_since(SystemTime::UNIX_EPOCH).unwrap_or_default();
    let secs = d.as_secs();
    let h = (secs / 3600) % 24;
    let m = (secs / 60) % 60;
    let s = secs % 60;
    format!("{:02}:{:02}:{:02}", h, m, s)
}

/// Descarga un archivo usando curl.exe (Windows 10+), monitorizando progreso
/// via tamaño del archivo en disco (no parseo de stderr — curl usa \r no \n).
fn download_with_curl(
    app: &tauri::AppHandle,
    url: &str,
    dest: &std::path::Path,
    hf_token: Option<&str>,
    expected_size: u64,
) -> Result<(), String> {
    use std::process::{Command, Stdio};
    use std::sync::atomic::{AtomicBool, Ordering};
    use std::sync::Arc;

    // Usar ruta absoluta de curl.exe — en producción el PATH puede no incluir System32
    let curl_path = if std::path::Path::new("C:\\Windows\\System32\\curl.exe").exists() {
        "C:\\Windows\\System32\\curl.exe".to_string()
    } else {
        // Fallback: buscar en PATH
        "curl".to_string()
    };

    // Log para debug
    let log_dir = app.path().app_data_dir().unwrap_or_default();
    let log_path = log_dir.join("download.log");
    let log = |msg: &str| {
        use std::io::Write;
        if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open(&log_path) {
            let ts = chrono_lite();
            let _ = writeln!(f, "[{}] {}", ts, msg);
        }
    };
    // Limpiar log al inicio de cada descarga
    let _ = std::fs::write(&log_path, "");

    log(&format!("Iniciando descarga: {} → {}", url, dest.display()));
    log(&format!("curl: {}", curl_path));
    log(&format!("expected_size: {}", expected_size));

    let mut cmd = Command::new(&curl_path);
    cmd.arg("-L")              // seguir redirects
       .arg("--fail")          // error en HTTP >= 400
       .arg("--connect-timeout").arg("30")
       .arg("--retry").arg("3")
       .arg("--retry-delay").arg("5")
       .arg("-o").arg(dest.to_string_lossy().as_ref())
       .arg("-s")              // silencioso
       .arg("--user-agent").arg("Stacklume/0.3 (desktop)")
       .stdout(Stdio::null())
       .stderr(Stdio::null());

    if let Some(token) = hf_token {
        if !token.is_empty() {
            cmd.arg("-H").arg(&format!("Authorization: Bearer {}", token));
        }
    }

    cmd.arg(url);

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }

    log("Spawning curl...");
    let mut child = cmd.spawn().map_err(|e| {
        log(&format!("ERROR spawn curl: {}", e));
        format!("Error ejecutando curl: {} (ruta: {})", e, curl_path)
    })?;
    log(&format!("curl spawned: pid={}", child.id()));

    // Hilo que monitoriza el tamaño del archivo cada segundo y emite progreso
    let done = Arc::new(AtomicBool::new(false));
    let done_clone = done.clone();
    let dest_clone = dest.to_path_buf();
    let app_clone = app.clone();

    let monitor_thread = std::thread::spawn(move || {
        let effective_total = if expected_size > 0 { expected_size } else { 1 };
        loop {
            if done_clone.load(Ordering::Relaxed) { break; }
            std::thread::sleep(std::time::Duration::from_secs(1));
            let current_size = std::fs::metadata(&dest_clone).map(|m| m.len()).unwrap_or(0);
            if current_size > 0 {
                let percent = if expected_size > 0 {
                    ((current_size as f64 / effective_total as f64) * 100.0) as u64
                } else {
                    0
                };
                let _ = app_clone.emit(
                    "llm:download-progress",
                    serde_json::json!({
                        "downloaded": current_size,
                        "total": expected_size,
                        "percent": percent.min(99),
                        "phase": "downloading"
                    }),
                );
            }
        }
    });

    log("Esperando a que curl termine...");

    // Esperar a que curl termine
    let status = child.wait().map_err(|e| {
        log(&format!("Error wait: {}", e));
        format!("Error esperando curl: {}", e)
    })?;
    done.store(true, Ordering::Relaxed);
    let _ = monitor_thread.join();

    log(&format!("curl terminó: success={} code={:?}", status.success(), status.code()));

    if !status.success() {
        let _ = std::fs::remove_file(dest);
        let code = status.code().unwrap_or(-1);
        let err = match code {
            6 => "No se pudo resolver el host. Verifica tu conexión a Internet.".to_string(),
            7 => "No se pudo conectar a HuggingFace. Prueba más tarde.".to_string(),
            22 => "Error HTTP (modelo no encontrado o acceso denegado). Configura tu token en API Key.".to_string(),
            28 => "Timeout de conexión. Internet lenta o HuggingFace no responde.".to_string(),
            _ => format!("Error de descarga (curl código {}). Verifica tu conexión.", code),
        };
        log(&format!("ERROR: {}", err));
        return Err(err);
    }

    let file_size = std::fs::metadata(dest).map(|m| m.len()).unwrap_or(0);
    log(&format!("Descarga completada: {} bytes", file_size));

    if file_size < 10 * 1024 * 1024 {
        let _ = std::fs::remove_file(dest);
        let err = format!("Descarga incompleta: {} bytes. Prueba de nuevo.", file_size);
        log(&err);
        return Err(err);
    }

    // Progreso final: 100%
    let _ = app.emit(
        "llm:download-progress",
        serde_json::json!({
            "downloaded": file_size,
            "total": file_size,
            "percent": 100_u64,
            "phase": "done"
        }),
    );

    Ok(())
}

/// Descarga un modelo GGUF desde HuggingFace y arranca llama-server.
/// Emite eventos "llm:download-progress" con el progreso de la descarga.
#[tauri::command]
async fn download_llm_model(
    app: tauri::AppHandle,
    url: String,
    model_name: String,
    #[allow(non_snake_case)]
    expectedSize: Option<u64>,
) -> Result<(), String> {
    download_llm_model_impl(app, url, model_name, expectedSize.unwrap_or(0)).await
}

async fn download_llm_model_impl(
    app: tauri::AppHandle,
    url: String,
    model_name: String,
    expected_size: u64,
) -> Result<(), String> {
    // Validar URL — solo HuggingFace (previene SSRF y descargas arbitrarias)
    let parsed = url::Url::parse(&url).map_err(|e| format!("URL inválida: {}", e))?;
    if parsed.scheme() != "https" {
        return Err("Solo se permiten URLs HTTPS".to_string());
    }
    let host = parsed.host_str().unwrap_or("");
    if host != "huggingface.co" && !host.ends_with(".huggingface.co") {
        return Err("Solo se permiten descargas desde huggingface.co".to_string());
    }

    // Validar nombre del modelo (sin path traversal)
    if model_name.is_empty()
        || model_name.contains('/')
        || model_name.contains('\\')
        || model_name.contains("..")
    {
        return Err("Nombre de modelo inválido".to_string());
    }
    if !model_name.to_lowercase().ends_with(".gguf") {
        return Err("Solo se permiten archivos .gguf".to_string());
    }

    // Verificar que el binario existe
    {
        let state = app.state::<LlamaState>();
        if state.binary_path.lock().unwrap().is_none() {
            return Err("llama-server no disponible en esta instalación".to_string());
        }
    }

    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Error app_data: {}", e))?;
    let models_dir = app_data.join("models");
    let _ = std::fs::create_dir_all(&models_dir);
    let model_path = models_dir.join(&model_name);

    // Si el modelo ya existe, solo arrancar el servidor
    if model_path.exists() {
        {
            let state = app.state::<LlamaState>();
            *state.model_path.lock().unwrap() =
                Some(model_path.to_string_lossy().to_string());
            *state.status.lock().unwrap() = "starting".to_string();
        }
        let app_clone = app.clone();
        std::thread::spawn(move || {
            if let Err(e) = spawn_llama_server_blocking(&app_clone) {
                eprintln!("[Stacklume] Error arrancando llama-server: {}", e);
                let _ = app_clone.emit("llm:status-changed", format!("error: {}", e));
            }
        });
        return Ok(());
    }

    // Actualizar estado a "descargando" (usando "starting" como estado intermedio)
    {
        let state = app.state::<LlamaState>();
        *state.status.lock().unwrap() = "starting".to_string();
    }

    // Leer token de HuggingFace si está configurado
    let hf_token = load_model_prefs(&app).hf_token.clone();

    let url_clone = url.clone();
    let model_path_clone = model_path.clone();
    let app_clone = app.clone();

    // Descarga usando curl.exe del sistema (Windows 10+).
    // curl es mucho más robusto que ureq para HuggingFace CDN:
    // - Sigue redirects correctamente con headers
    // - TLS nativo del sistema (no depende de rustls)
    // - Timeout y reintentos integrados
    // - Nunca cuelga indefinidamente
    tokio::task::spawn_blocking(move || -> Result<(), String> {
        let _ = app_clone.emit(
            "llm:download-progress",
            serde_json::json!({ "downloaded": 0_u64, "total": 0_u64, "percent": 0_u64, "phase": "connecting" }),
        );

        download_with_curl(&app_clone, &url_clone, &model_path_clone, hf_token.as_deref(), expected_size)
    })
    .await
    .map_err(|e| format!("Error interno: {}", e))??;

    // Guardar ruta del modelo, preferencia y arrancar llama-server
    {
        let state = app.state::<LlamaState>();
        *state.model_path.lock().unwrap() =
            Some(model_path.to_string_lossy().to_string());
        *state.status.lock().unwrap() = "starting".to_string();
    }

    // Guardar como modelo activo en models.json
    let mut prefs = load_model_prefs(&app);
    prefs.active_model = Some(model_name);
    save_model_prefs(&app, &prefs);

    let app_clone = app.clone();
    std::thread::spawn(move || {
        if let Err(e) = spawn_llama_server_blocking(&app_clone) {
            eprintln!("[Stacklume] Error arrancando llama-server tras descarga: {}", e);
            let _ = app_clone.emit("llm:status-changed", format!("error: {}", e));
        }
    });

    Ok(())
}

// ─── Visión LLM ───────────────────────────────────────────────────────────────

/// Comprueba si el proyector multimodal mmproj-F16.gguf está descargado.
/// Devuelve true si el soporte de visión está disponible.
#[tauri::command]
fn check_vision_status(app: tauri::AppHandle) -> bool {
    let Ok(app_data) = app.path().app_data_dir() else { return false };
    app_data.join("models").join("mmproj-F16.gguf").exists()
}

/// Para el servidor llama-server actual (si está corriendo).
/// Útil para reiniciarlo con nuevas opciones (p.ej. tras descargar mmproj).
#[tauri::command]
fn stop_llama_server(app: tauri::AppHandle) {
    #[cfg(not(dev))]
    {
        let state = app.state::<LlamaState>();
        // Extraer el child antes de soltar el MutexGuard para evitar borrow prolongado
        let child_opt = state.llama_child.lock().unwrap().take();
        if let Some(mut child) = child_opt {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
    let state = app.state::<LlamaState>();
    *state.status.lock().unwrap() = "no_model".to_string();
    let _ = app.emit("llm:status-changed", "no_model");
}

/// Descarga el proyector multimodal mmproj-F16.gguf desde HuggingFace (~668 MB).
/// URL fija: unsloth/Qwen3.5-2B-GGUF. Emite "llm:download-progress" con el progreso.
#[tauri::command]
async fn download_mmproj(app: tauri::AppHandle) -> Result<(), String> {
    const MMPROJ_URL: &str =
        "https://huggingface.co/unsloth/Qwen3.5-2B-GGUF/resolve/main/mmproj-F16.gguf";

    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Error app_data: {}", e))?;
    let models_dir = app_data.join("models");
    let _ = std::fs::create_dir_all(&models_dir);
    let mmproj_path = models_dir.join("mmproj-F16.gguf");

    if mmproj_path.exists() {
        return Ok(());
    }

    let app_clone = app.clone();
    let path_clone = mmproj_path.clone();

    tokio::task::spawn_blocking(move || -> Result<(), String> {
        download_with_curl(&app_clone, MMPROJ_URL, &path_clone, None, 700_000_000)
    })
    .await
    .map_err(|e| format!("Error interno: {}", e))?
}

// ─── Gestión de modelos múltiples ─────────────────────────────────────────────

/// Preferencias de modelos: qué modelo está activo + metadatos de cada modelo descargado.
/// Se persiste en `%APPDATA%/com.stacklume.app/models.json`.
#[derive(serde::Serialize, serde::Deserialize, Clone, Default)]
struct ModelPreferences {
    /// Nombre del archivo .gguf seleccionado (e.g. "Qwen3.5-2B-Q4_K_M.gguf")
    active_model: Option<String>,
    /// Token de HuggingFace para descargar modelos gated/privados
    #[serde(default)]
    hf_token: Option<String>,
}

fn model_prefs_path(app: &tauri::AppHandle) -> std::path::PathBuf {
    let app_data = app.path().app_data_dir().unwrap_or_default();
    app_data.join("models.json")
}

fn load_model_prefs(app: &tauri::AppHandle) -> ModelPreferences {
    let path = model_prefs_path(app);
    std::fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save_model_prefs(app: &tauri::AppHandle, prefs: &ModelPreferences) {
    let path = model_prefs_path(app);
    if let Ok(json) = serde_json::to_string_pretty(prefs) {
        let _ = std::fs::write(&path, json);
    }
}

/// Detecta la familia del modelo por su nombre de archivo para auto-configurar parámetros.
fn detect_model_family(filename: &str) -> &'static str {
    let lower = filename.to_lowercase();
    if lower.contains("qwen3") { return "qwen3"; }
    if lower.contains("qwen2") { return "qwen2"; }
    if lower.contains("llama-3") || lower.contains("llama3") { return "llama3"; }
    if lower.contains("mistral") || lower.contains("mixtral") { return "mistral"; }
    if lower.contains("phi") { return "phi"; }
    if lower.contains("gemma") { return "gemma"; }
    if lower.contains("deepseek") { return "deepseek"; }
    "default"
}

/// Extrae un nombre legible del nombre de archivo GGUF.
/// "Qwen3.5-2B-Q4_K_M.gguf" → "Qwen 3.5 2B (Q4_K_M)"
fn display_name_from_filename(filename: &str) -> String {
    let name = filename.trim_end_matches(".gguf").trim_end_matches(".GGUF");
    // Intentar extraer cuantización (último segmento con Q o IQ o FP)
    let parts: Vec<&str> = name.rsplitn(2, '-').collect();
    if parts.len() == 2 {
        let quant = parts[0];
        let base = parts[1].replace('_', " ").replace('-', " ");
        if quant.starts_with('Q') || quant.starts_with("IQ") || quant.starts_with("FP") || quant.starts_with("F") {
            return format!("{} ({})", base, quant);
        }
    }
    name.replace('_', " ").replace('-', " ")
}

/// Lista todos los modelos .gguf descargados e indica cuál está activo.
#[tauri::command]
fn list_models(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    let app_data = app.path().app_data_dir().map_err(|e| format!("{}", e))?;
    let models_dir = app_data.join("models");
    let prefs = load_model_prefs(&app);
    let active = prefs.active_model.clone();

    // También leer el modelo actualmente cargado en LlamaState como fallback
    let state_model = app.state::<LlamaState>()
        .model_path.lock().unwrap().clone()
        .and_then(|p| std::path::Path::new(&p).file_name().map(|f| f.to_string_lossy().to_string()));

    let active_filename = active.or(state_model);

    let mut models = Vec::new();
    if let Ok(entries) = std::fs::read_dir(&models_dir) {
        for entry in entries.filter_map(|e| e.ok()) {
            let path = entry.path();
            let filename = path.file_name().unwrap_or_default().to_string_lossy().to_string();
            let stem = path.file_stem().unwrap_or_default().to_string_lossy().to_string();

            // Solo .gguf, excluyendo mmproj (proyector de visión)
            if path.extension().and_then(|s| s.to_str()) != Some("gguf") { continue; }
            if stem.contains("mmproj") { continue; }

            let size = std::fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
            let family = detect_model_family(&filename);
            let is_active = active_filename.as_deref() == Some(&filename);

            models.push(serde_json::json!({
                "filename": filename,
                "displayName": display_name_from_filename(&filename),
                "sizeBytes": size,
                "family": family,
                "isActive": is_active,
                "supportsThinking": family == "qwen3" || family == "deepseek",
                "supportsVision": family == "qwen3" && check_vision_status(app.clone()),
            }));
        }
    }

    // Ordenar: activo primero, luego por nombre
    models.sort_by(|a, b| {
        let a_active = a["isActive"].as_bool().unwrap_or(false);
        let b_active = b["isActive"].as_bool().unwrap_or(false);
        b_active.cmp(&a_active).then_with(||
            a["displayName"].as_str().unwrap_or("").cmp(b["displayName"].as_str().unwrap_or(""))
        )
    });

    Ok(serde_json::json!({
        "models": models,
        "activeModel": active_filename,
    }))
}

/// Devuelve info del modelo activo (o null si no hay modelo cargado).
#[tauri::command]
fn get_active_model(app: tauri::AppHandle) -> serde_json::Value {
    let state = app.state::<LlamaState>();
    let model_path = state.model_path.lock().unwrap().clone();

    match model_path {
        Some(path) => {
            let filename = std::path::Path::new(&path)
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();
            let family = detect_model_family(&filename);
            serde_json::json!({
                "filename": filename,
                "displayName": display_name_from_filename(&filename),
                "family": family,
                "supportsThinking": family == "qwen3" || family == "deepseek",
                "supportsVision": family == "qwen3" && check_vision_status(app.clone()),
            })
        }
        None => serde_json::Value::Null,
    }
}

/// Helper: ejecuta un comando SIN ventana visible (CREATE_NO_WINDOW en Windows)
fn silent_command(program: &str) -> std::process::Command {
    let mut cmd = std::process::Command::new(program);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000);
    }
    cmd
}

/// Detecta las especificaciones de hardware del sistema.
#[tauri::command]
fn get_system_specs() -> serde_json::Value {
    let (total_ram_mb, available_ram_mb) = get_ram_info();

    // CPU
    let cpu_name = silent_command("wmic")
        .args(["cpu", "get", "name", "/value"])
        .output()
        .ok()
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .and_then(|s| s.lines().find(|l| l.starts_with("Name=")).map(|l| l.trim_start_matches("Name=").trim().to_string()))
        .unwrap_or_default();

    let cpu_cores = std::thread::available_parallelism().map(|n| n.get() as u32).unwrap_or(4);

    // GPU: intentar nvidia-smi primero (da VRAM real, no el cap de 4GB de wmic)
    let mut gpu_name = String::new();
    let mut gpu_vram_mb: u64 = 0;
    let mut has_cuda = false;

    if let Ok(output) = silent_command("C:\\Windows\\System32\\nvidia-smi.exe")
        .args(["--query-gpu=name,memory.total", "--format=csv,noheader,nounits"])
        .output()
    {
        if output.status.success() {
            if let Ok(text) = String::from_utf8(output.stdout) {
                // Formato: "NVIDIA GeForce RTX 4070, 12282"
                for line in text.lines() {
                    let parts: Vec<&str> = line.splitn(2, ',').collect();
                    if parts.len() == 2 {
                        let name = parts[0].trim();
                        let vram: u64 = parts[1].trim().parse().unwrap_or(0);
                        if vram > gpu_vram_mb {
                            gpu_name = name.to_string();
                            gpu_vram_mb = vram; // nvidia-smi devuelve MB directamente
                            has_cuda = true;
                        }
                    }
                }
            }
        }
    }

    // Fallback: PowerShell Get-CimInstance (funciona para AMD, Intel, y NVIDIA sin drivers CLI)
    // Devuelve VRAM real via AdapterRAM (qword) — wmic trunca a 4GB (uint32 overflow)
    if gpu_name.is_empty() {
        let ps_output = silent_command("powershell")
            .args(["-NoProfile", "-Command",
                "Get-CimInstance Win32_VideoController | Select-Object Name, AdapterRAM | ForEach-Object { \"$($_.Name)|$($_.AdapterRAM)\" }"])
            .output()
            .ok()
            .and_then(|o| String::from_utf8(o.stdout).ok())
            .unwrap_or_default();

        for line in ps_output.lines() {
            let trimmed = line.trim();
            if trimmed.is_empty() { continue; }
            let parts: Vec<&str> = trimmed.splitn(2, '|').collect();
            if parts.len() == 2 {
                let name = parts[0].trim();
                let vram: u64 = parts[1].trim().parse().unwrap_or(0) / (1024 * 1024);
                // Preferir GPU dedicada (NVIDIA, AMD Radeon, Intel Arc) sobre integrada
                let is_dedicated = name.contains("NVIDIA") || name.contains("Radeon RX") || name.contains("Arc A");
                let current_is_dedicated = gpu_name.contains("NVIDIA") || gpu_name.contains("Radeon RX") || gpu_name.contains("Arc A");
                if gpu_name.is_empty() || (is_dedicated && !current_is_dedicated) || (is_dedicated && vram > gpu_vram_mb) {
                    gpu_name = name.to_string();
                    gpu_vram_mb = vram;
                }
            }
        }
    }

    serde_json::json!({
        "cpu": { "name": cpu_name, "cores": cpu_cores },
        "ram": { "totalMb": total_ram_mb, "availableMb": available_ram_mb },
        "gpu": { "name": gpu_name, "vramMb": gpu_vram_mb, "hasCuda": has_cuda }
    })
}

/// Obtiene RAM total y disponible usando Windows API (GlobalMemoryStatusEx)
#[cfg(windows)]
fn get_ram_info() -> (u64, u64) {
    use windows_sys::Win32::System::SystemInformation::{GlobalMemoryStatusEx, MEMORYSTATUSEX};
    let mut mem = MEMORYSTATUSEX {
        dwLength: std::mem::size_of::<MEMORYSTATUSEX>() as u32,
        dwMemoryLoad: 0,
        ullTotalPhys: 0,
        ullAvailPhys: 0,
        ullTotalPageFile: 0,
        ullAvailPageFile: 0,
        ullTotalVirtual: 0,
        ullAvailVirtual: 0,
        ullAvailExtendedVirtual: 0,
    };
    unsafe { GlobalMemoryStatusEx(&mut mem); }
    (mem.ullTotalPhys / (1024 * 1024), mem.ullAvailPhys / (1024 * 1024))
}

#[cfg(not(windows))]
fn get_ram_info() -> (u64, u64) {
    (0, 0)
}

/// Cambia el modelo activo: para llama-server, actualiza config, reinicia con el nuevo modelo.
#[tauri::command]
async fn switch_model(app: tauri::AppHandle, filename: String) -> Result<(), String> {
    // Validar nombre
    if filename.is_empty() || filename.contains('/') || filename.contains('\\') || filename.contains("..") {
        return Err("Nombre de modelo inválido".to_string());
    }

    let app_data = app.path().app_data_dir().map_err(|e| format!("{}", e))?;
    let model_path = app_data.join("models").join(&filename);
    if !model_path.exists() {
        return Err(format!("Modelo no encontrado: {}", filename));
    }

    // Parar llama-server actual
    #[cfg(not(dev))]
    {
        let state = app.state::<LlamaState>();
        let child_opt = state.llama_child.lock().unwrap().take();
        if let Some(mut child) = child_opt {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
    // En dev mode no tenemos el child handle, así que matamos por nombre
    #[cfg(dev)]
    {
        let _ = silent_command("taskkill").args(["/f", "/im", "llama-server.exe"]).output();
        // También matar el wrapper bat si existe
    }
    // Esperar a que el proceso anterior muera y libere GPU + puerto
    std::thread::sleep(std::time::Duration::from_secs(2));

    // Asignar nuevo puerto para evitar conflictos con el anterior
    {
        let state = app.state::<LlamaState>();
        let new_port = find_any_free_port();
        *state.port.lock().unwrap() = new_port;
        *state.model_path.lock().unwrap() = Some(model_path.to_string_lossy().to_string());
        *state.status.lock().unwrap() = "starting".to_string();
    }
    let _ = app.emit("llm:status-changed", "starting");

    // Guardar preferencia
    let mut prefs = load_model_prefs(&app);
    prefs.active_model = Some(filename);
    save_model_prefs(&app, &prefs);

    // Arrancar con el nuevo modelo
    let app_clone = app.clone();
    std::thread::spawn(move || {
        if let Err(e) = spawn_llama_server_blocking(&app_clone) {
            eprintln!("[Stacklume] Error cambiando modelo: {}", e);
            let msg = format!("error: {}", e);
            *app_clone.state::<LlamaState>().status.lock().unwrap() = msg.clone();
            let _ = app_clone.emit("llm:status-changed", msg);
        }
    });

    Ok(())
}

/// Obtiene el token de HuggingFace configurado (vacío si no hay).
#[tauri::command]
fn get_hf_token(app: tauri::AppHandle) -> String {
    load_model_prefs(&app).hf_token.unwrap_or_default()
}

/// Guarda el token de HuggingFace para descargas de modelos gated/privados.
#[tauri::command]
fn set_hf_token(app: tauri::AppHandle, token: String) -> Result<(), String> {
    let mut prefs = load_model_prefs(&app);
    prefs.hf_token = if token.trim().is_empty() { None } else { Some(token.trim().to_string()) };
    save_model_prefs(&app, &prefs);
    Ok(())
}

/// Elimina un modelo .gguf descargado. Si era el activo, para llama-server.
#[tauri::command]
async fn delete_model(app: tauri::AppHandle, filename: String) -> Result<(), String> {
    // Validar nombre
    if filename.is_empty() || filename.contains('/') || filename.contains('\\') || filename.contains("..") {
        return Err("Nombre de modelo inválido".to_string());
    }
    if !filename.to_lowercase().ends_with(".gguf") {
        return Err("Solo se pueden eliminar archivos .gguf".to_string());
    }
    // No permitir eliminar mmproj
    if filename.to_lowercase().contains("mmproj") {
        return Err("El proyector de visión no se puede eliminar desde aquí".to_string());
    }

    let app_data = app.path().app_data_dir().map_err(|e| format!("{}", e))?;
    let model_path = app_data.join("models").join(&filename);
    if !model_path.exists() {
        return Err("Modelo no encontrado".to_string());
    }

    // Si es el modelo activo, parar llama-server primero
    let is_active = {
        let state = app.state::<LlamaState>();
        let current = state.model_path.lock().unwrap().clone();
        current.as_deref() == Some(model_path.to_string_lossy().as_ref())
    };

    if is_active {
        #[cfg(not(dev))]
        {
            let state = app.state::<LlamaState>();
            let child_opt = state.llama_child.lock().unwrap().take();
            if let Some(mut child) = child_opt {
                let _ = child.kill();
                let _ = child.wait();
            }
        }
        let state = app.state::<LlamaState>();
        *state.model_path.lock().unwrap() = None;
        *state.status.lock().unwrap() = "no_model".to_string();
        let _ = app.emit("llm:status-changed", "no_model");
    }

    // Eliminar archivo
    std::fs::remove_file(&model_path)
        .map_err(|e| format!("Error al eliminar: {}", e))?;

    // Actualizar preferencias
    let mut prefs = load_model_prefs(&app);
    if prefs.active_model.as_deref() == Some(&filename) {
        prefs.active_model = None;
    }
    save_model_prefs(&app, &prefs);

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
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(ServerState {
            port: Mutex::new(7878),
            #[cfg(not(dev))]
            node_child: Mutex::new(None),
            #[cfg(windows)]
            node_job: Mutex::new(0),
        })
        .manage(LlamaState {
            port: Mutex::new(0),
            status: Mutex::new("no_binary".to_string()),
            model_path: Mutex::new(None),
            binary_path: Mutex::new(None),
            #[cfg(not(dev))]
            llama_child: Mutex::new(None),
            #[cfg(windows)]
            llama_job: Mutex::new(0),
        })
        .setup(|app| {
            // CUDA necesita una consola para inicializar. Tauri es GUI subsystem
            // (sin consola). AllocConsole crea una UNA VEZ al inicio — todos los
            // llama-server spawneados después la heredan.
            // AllocConsole removido del setup — se hace en spawn_llama_server_blocking

            // Crear system tray (dev y prod)
            setup_tray(app)?;

            // ── Global Quick Launcher — Ctrl+Shift+Space ─────────────────────
            // Registra un atajo de sistema global para mostrar Stacklume desde
            // cualquier aplicación y abrir el lanzador rápido en el frontend.
            if let Err(e) = app.global_shortcut().on_shortcut(
                "Ctrl+Shift+Space",
                |app_handle, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        if let Some(w) = app_handle.get_webview_window("main") {
                            let is_visible = w.is_visible().unwrap_or(false);
                            if !is_visible {
                                let _ = w.show();
                            }
                            let _ = w.set_focus();
                            // Emitir evento al frontend para abrir el overlay de búsqueda
                            let _ = w.emit("stacklume:show-launcher", ());
                        }
                    }
                },
            ) {
                eprintln!("[Stacklume] No se pudo registrar atajo global Ctrl+Shift+Space: {}", e);
            }

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
                // ── Inicializar llama-server en modo dev ─────────────────────────
                // CARGO_MANIFEST_DIR apunta a src-tauri/ en tiempo de compilación (siempre correcto)
                {
                    let llama_exe = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
                        .join("resources/llama/llama-server.exe");
                    if llama_exe.exists() {
                        let llama_port = find_any_free_port();
                        let llama_state = app.handle().state::<LlamaState>();
                        *llama_state.port.lock().unwrap() = llama_port;
                        *llama_state.binary_path.lock().unwrap() =
                            Some(llama_exe.to_string_lossy().to_string());
                        // Comprobar si ya hay un modelo descargado
                        // Mismo scan que producción: busca cualquier .gguf que NO sea mmproj
                        if let Ok(app_data) = app.path().app_data_dir() {
                            let models_dir = app_data.join("models");
                            let model_opt = std::fs::read_dir(&models_dir)
                                .ok()
                                .and_then(|entries| {
                                    entries.filter_map(|e| e.ok()).find_map(|entry| {
                                        let p = entry.path();
                                        let stem = p
                                            .file_stem()
                                            .and_then(|s| s.to_str())
                                            .unwrap_or("");
                                        if p.extension().and_then(|s| s.to_str()) == Some("gguf")
                                            && !stem.contains("mmproj")
                                        {
                                            Some(p)
                                        } else {
                                            None
                                        }
                                    })
                                });
                            if let Some(model_path) = model_opt {
                                *llama_state.model_path.lock().unwrap() =
                                    Some(model_path.to_string_lossy().to_string());
                                *llama_state.status.lock().unwrap() = "starting".to_string();
                                let app_clone = app.handle().clone();
                                std::thread::spawn(move || {
                                    // Pequeño delay para no competir con el arranque de Next.js
                                    std::thread::sleep(std::time::Duration::from_secs(3));
                                    if let Err(e) = spawn_llama_server_blocking(&app_clone) {
                                        eprintln!("[Stacklume Dev] llama-server error: {}", e);
                                    }
                                });
                            } else {
                                *llama_state.status.lock().unwrap() = "no_model".to_string();
                            }
                        } else {
                            *llama_state.status.lock().unwrap() = "no_model".to_string();
                        }
                        println!(
                            "[Stacklume Dev] llama-server configurado: port={}, binary={}",
                            llama_port,
                            llama_exe.display()
                        );
                    } else {
                        println!(
                            "[Stacklume Dev] llama-server.exe no encontrado en: {}",
                            llama_exe.display()
                        );
                    }
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
                let llama_exe = resolve_resource(&resource_dir, "llama/llama-server.exe");

                let node_ok = node_exe.exists();
                let server_ok = server_js.exists();
                let llama_ok = llama_exe.exists();

                log(&log_path, &format!("resource_dir : {}", resource_dir.display()));
                log(&log_path, &format!("node.exe     : {} [{}]", node_exe.display(), if node_ok { "OK" } else { "FALTA" }));
                log(&log_path, &format!("server.js    : {} [{}]", server_js.display(), if server_ok { "OK" } else { "FALTA" }));
                log(&log_path, &format!("llama-server : {} [{}]", llama_exe.display(), if llama_ok { "OK" } else { "NO" }));
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

                // ── 5. Asignar puerto Next.js ────────────────────────────────────
                let port = find_free_port();
                {
                    let srv = app.state::<ServerState>();
                    *srv.port.lock().unwrap() = port;
                }
                log(&log_path, &format!("Puerto asignado: {}", port));

                // ── 5b. Configurar LLM local (llama-server) ───────────────────────
                // Pre-asignamos el puerto aunque el modelo no esté descargado todavía,
                // para que el env var LLAMA_PORT esté disponible en node.exe desde el inicio.
                let llama_port = if llama_ok { find_any_free_port() } else { 0 };
                {
                    let llama_srv = app.state::<LlamaState>();
                    *llama_srv.port.lock().unwrap() = llama_port;

                    if llama_ok {
                        *llama_srv.binary_path.lock().unwrap() =
                            llama_exe.to_str().map(|s| s.to_string());

                        // Buscar modelo .gguf en app_data/models/
                        // Prioridad: 1) modelo guardado en models.json, 2) primer .gguf encontrado
                        let models_dir = app_data.join("models");
                        let prefs = load_model_prefs(app.handle());
                        let preferred = prefs.active_model.as_ref()
                            .map(|name| models_dir.join(name))
                            .filter(|p| p.exists());
                        let model_opt = preferred.or_else(|| {
                            std::fs::read_dir(&models_dir)
                                .ok()
                                .and_then(|entries| {
                                    entries.filter_map(|e| e.ok()).find_map(|entry| {
                                        let p = entry.path();
                                        let stem = p.file_stem().and_then(|s| s.to_str()).unwrap_or("");
                                        if p.extension().and_then(|s| s.to_str()) == Some("gguf")
                                            && !stem.contains("mmproj")
                                        {
                                            Some(p)
                                        } else {
                                            None
                                        }
                                    })
                                })
                        });

                        if let Some(model) = &model_opt {
                            *llama_srv.model_path.lock().unwrap() =
                                model.to_str().map(|s| s.to_string());
                            *llama_srv.status.lock().unwrap() = "starting".to_string();
                            log(&log_path, &format!("Modelo LLM encontrado: {}", model.display()));
                        } else {
                            *llama_srv.status.lock().unwrap() = "no_model".to_string();
                            log(&log_path, "LLM: modelo no instalado (no_model)");
                        }
                    } else {
                        *llama_srv.status.lock().unwrap() = "no_binary".to_string();
                        log(&log_path, "LLM: llama-server.exe no encontrado (no_binary)");
                    }
                }
                log(&log_path, &format!("llama_port: {}", llama_port));

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
                    .env("windir", std::env::var("windir").unwrap_or_default())
                    // Puerto de llama-server para que la API route /api/llm/* lo use
                    .env("LLAMA_PORT", llama_port.to_string());

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

                        // Arrancar llama-server en background si el modelo está disponible
                        if llama_ok {
                            let has_model = {
                                let s = app.state::<LlamaState>();
                                let result = s.model_path.lock().unwrap().is_some();
                                result
                            };
                            if has_model {
                                let app_llama = app.handle().clone();
                                let log_path_llama = log_path.clone();
                                std::thread::spawn(move || {
                                    // Delay pequeño para no competir con el arranque de node.js
                                    std::thread::sleep(std::time::Duration::from_secs(2));
                                    log(&log_path_llama, "Arrancando llama-server...");
                                    match spawn_llama_server_blocking(&app_llama) {
                                        Ok(()) => log(&log_path_llama, "llama-server listo"),
                                        Err(e) => log(&log_path_llama, &format!("llama-server error: {}", e)),
                                    }
                                });
                            }
                        }
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

            // Cuando la ventana principal se destruye, matar node.exe y llama-server.
            // Esto evita que queden procesos bloqueando archivos durante reinstalaciones.
            if let tauri::WindowEvent::Destroyed = event {
                #[cfg(not(dev))]
                {
                    let app = _window.app_handle();

                    // Matar node.exe
                    {
                        let state = app.state::<ServerState>();
                        let maybe_child = state
                            .node_child
                            .lock()
                            .ok()
                            .and_then(|mut g| g.take());
                        drop(state);
                        if let Some(mut child) = maybe_child {
                            let _ = child.kill();
                            let _ = child.wait();
                        }
                    }

                    // Matar llama-server
                    {
                        let llama = app.state::<LlamaState>();
                        let maybe_llama = llama
                            .llama_child
                            .lock()
                            .ok()
                            .and_then(|mut g| g.take());
                        drop(llama);
                        if let Some(mut child) = maybe_llama {
                            let _ = child.kill();
                            let _ = child.wait();
                        }
                    }
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            download_and_run_update,
            open_url,
            open_local_path,
            open_in_vscode,
            get_server_port,
            get_app_data_dir,
            minimize_window,
            toggle_maximize_window,
            close_window,
            update_tray_icon,
            get_app_version,
            get_llama_port,
            get_llm_status,
            start_llama_server,
            download_llm_model,
            check_vision_status,
            stop_llama_server,
            download_mmproj,
            list_models,
            get_active_model,
            get_system_specs,
            switch_model,
            delete_model,
            get_hf_token,
            set_hf_token,
        ])
        .run(tauri::generate_context!())
        .expect("Error al ejecutar Stacklume");
}
