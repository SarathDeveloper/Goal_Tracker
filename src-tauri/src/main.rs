#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::io::{Read, Write};
use std::net::TcpStream;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::time::Duration;

use tauri::{AppHandle, Manager, Url, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;

struct SidecarState {
    child: Mutex<Option<CommandChild>>,
    shutting_down: AtomicBool,
}

impl Default for SidecarState {
    fn default() -> Self {
        Self {
            child: Mutex::new(None),
            shutting_down: AtomicBool::new(false),
        }
    }
}

fn stop_sidecar(app: &AppHandle) {
    let state = app.state::<SidecarState>();
    state.shutting_down.store(true, Ordering::SeqCst);
    let child = {
        let mut slot = match state.child.lock() {
            Ok(slot) => slot,
            Err(poisoned) => poisoned.into_inner(),
        };
        slot.take()
    };
    if let Some(child) = child {
        let _ = child.kill();
    }
}

fn report_startup_error(message: &str) {
    eprintln!("{message}");
    if let Some(base) = dirs::data_dir() {
        let dir = base.join("GoalTracker");
        let _ = std::fs::create_dir_all(&dir);
        let _ = std::fs::write(dir.join("startup-error.txt"), message);
    }
}

fn parse_api_port(line: &str) -> Option<u16> {
    let marker = "http://127.0.0.1:";
    let start = line.find(marker)? + marker.len();
    let digits: String = line[start..]
        .chars()
        .take_while(|ch| ch.is_ascii_digit())
        .collect();
    digits.parse().ok()
}

fn poll_api_ready(port: u16) -> bool {
    let request = format!(
        "GET /api/health HTTP/1.1\r\nHost: 127.0.0.1:{port}\r\nConnection: close\r\n\r\n"
    );
    let Ok(mut stream) = TcpStream::connect(("127.0.0.1", port)) else {
        return false;
    };
    let _ = stream.set_read_timeout(Some(Duration::from_millis(800)));
    let _ = stream.set_write_timeout(Some(Duration::from_millis(800)));
    if stream.write_all(request.as_bytes()).is_err() {
        return false;
    }
    let mut buf = [0_u8; 128];
    match stream.read(&mut buf) {
        Ok(n) if n > 0 => String::from_utf8_lossy(&buf[..n]).contains("200"),
        _ => false,
    }
}

fn wait_for_api(port: u16) -> Result<(), String> {
    let deadline = std::time::Instant::now() + Duration::from_secs(20);
    while std::time::Instant::now() < deadline {
        if poll_api_ready(port) {
            return Ok(());
        }
        std::thread::sleep(Duration::from_millis(200));
    }
    Err(format!("The local API on port {port} did not respond"))
}

fn data_dir() -> Result<PathBuf, String> {
    let base = dirs::data_dir().ok_or("Could not find the user data folder")?;
    let dir = base.join("GoalTracker");
    std::fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    Ok(dir)
}

fn sqlite_addon_name() -> &'static str {
    if cfg!(all(windows, target_arch = "x86_64")) {
        "better-sqlite3-win32-x64.node"
    } else if cfg!(all(target_os = "macos", target_arch = "aarch64")) {
        "better-sqlite3-darwin-arm64.node"
    } else if cfg!(all(target_os = "macos", target_arch = "x86_64")) {
        "better-sqlite3-darwin-x64.node"
    } else {
        "better-sqlite3-linux-x64.node"
    }
}

fn first_existing(paths: &[PathBuf]) -> Option<PathBuf> {
    paths.iter().find(|path| path.exists()).cloned()
}

fn configure_env(app: &AppHandle) -> Result<(), String> {
    let resource_dir = app.path().resource_dir().map_err(|error| error.to_string())?;
    let app_root = first_existing(&[resource_dir.join("resources"), resource_dir.clone()])
        .filter(|dir| dir.join("dist").join("index.html").exists())
        .ok_or_else(|| format!("Packaged frontend missing under {}", resource_dir.display()))?;
    let migrations = app_root.join("migrations");
    if !migrations.join("001_goals.sql").exists() {
        return Err(format!("Migrations missing in {}", migrations.display()));
    }
    let addon_name = sqlite_addon_name();
    let addon = first_existing(&[
        app_root.join(addon_name),
        resource_dir.join(addon_name),
        resource_dir.join("binaries").join(addon_name),
    ])
    .ok_or_else(|| format!("SQLite addon {addon_name} was not packaged"))?;

    std::env::set_var("GOALTRACKER_SIDECAR", "1");
    std::env::set_var("GOALTRACKER_DATA_DIR", data_dir()?);
    std::env::set_var("GOALTRACKER_APP_ROOT", &app_root);
    std::env::set_var("GOALTRACKER_MIGRATIONS_DIR", &migrations);
    std::env::set_var("GOALTRACKER_SQLITE_ADDON", addon);
    Ok(())
}

fn sidecar_env() -> Vec<(String, String)> {
    [
        "GOALTRACKER_SIDECAR",
        "GOALTRACKER_DATA_DIR",
        "GOALTRACKER_APP_ROOT",
        "GOALTRACKER_MIGRATIONS_DIR",
        "GOALTRACKER_SQLITE_ADDON",
    ]
    .into_iter()
    .filter_map(|key| std::env::var(key).ok().map(|value| (key.to_string(), value)))
    .collect()
}

async fn start_sidecar(app: &AppHandle) -> Result<u16, String> {
    configure_env(app)?;
    let command = app
        .shell()
        .sidecar("goaltracker-api")
        .map_err(|error| error.to_string())?
        .envs(sidecar_env());
    let (mut rx, child) = command.spawn().map_err(|error| error.to_string())?;
    {
        let state = app.state::<SidecarState>();
        let mut slot = match state.child.lock() {
            Ok(slot) => slot,
            Err(poisoned) => poisoned.into_inner(),
        };
        *slot = Some(child);
    }

    let mut port = None;
    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(line) | CommandEvent::Stderr(line) => {
                let text = String::from_utf8_lossy(&line);
                if port.is_none() {
                    if let Some(found) = parse_api_port(&text) {
                        port = Some(found);
                        break;
                    }
                }
            }
            CommandEvent::Terminated(payload) => {
                return Err(format!(
                    "The local API exited before it was ready (code {:?})",
                    payload.code
                ));
            }
            CommandEvent::Error(error) => return Err(error),
            _ => {}
        }
    }

    let port = port.ok_or_else(|| "The local API did not report a port".to_string())?;
    let handle = app.clone();
    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            if let CommandEvent::Terminated(payload) = event {
                if !handle.state::<SidecarState>().shutting_down.load(Ordering::SeqCst) {
                    report_startup_error(&format!("The local API exited (code {:?})", payload.code));
                    let _ = handle.exit(1);
                }
                break;
            }
        }
    });
    wait_for_api(port)?;
    Ok(port)
}

fn open_main_window(app: &AppHandle, url: &str) -> Result<(), String> {
    let parsed = url.parse::<Url>().map_err(|error| error.to_string())?;
    WebviewWindowBuilder::new(app, "main", WebviewUrl::External(parsed))
        .title("Goal Tracker")
        .inner_size(1180.0, 800.0)
        .min_inner_size(900.0, 640.0)
        .build()
        .map_err(|error| error.to_string())?;
    Ok(())
}

fn focus_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            focus_main_window(app);
        }))
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .manage(SidecarState::default())
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let url = if cfg!(debug_assertions) {
                    "http://127.0.0.1:5173".to_string()
                } else {
                    match start_sidecar(&handle).await {
                        Ok(port) => format!("http://127.0.0.1:{port}"),
                        Err(error) => {
                            report_startup_error(&error);
                            let _ = handle.exit(1);
                            return;
                        }
                    }
                };
                if let Err(error) = open_main_window(&handle, &url) {
                    report_startup_error(&error);
                    let _ = handle.exit(1);
                }
            });
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("failed to start Goal Tracker")
        .run(|app, event| {
            if let tauri::RunEvent::ExitRequested { .. } = event {
                stop_sidecar(app);
            }
        });
}
