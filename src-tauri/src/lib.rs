#[cfg_attr(mobile, tauri::mobile_entry_point)]
mod firewall;
use firewall::IptablesShell;

use once_cell::sync::Lazy;
use std::sync::Mutex;
use tauri::Manager;

static SHELL: Lazy<Mutex<IptablesShell>> = Lazy::new(|| {
    Mutex::new(IptablesShell::new().expect("failed to start pkexec shell"))
});

#[tauri::command]
fn fw_list_rules(table: String, chain: String) -> Result<String, String> {
    let shell = SHELL.lock().unwrap();
    shell
        .list_rules(&table, &chain)
        .map(|r| r.join("\n"))
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn fw_add_rule(table: String, chain: String, rule: String) -> Result<(), String> {
    let shell = SHELL.lock().unwrap();
    shell.add_rule(&table, &chain, &rule).map_err(|e| e.to_string())
}

#[tauri::command]
fn fw_delete_rule(table: String, chain: String, line: String) -> Result<(), String> {
    let shell = SHELL.lock().unwrap();
    shell.delete_rule(&table, &chain, &line).map_err(|e| e.to_string())
}
pub fn run() {
    tauri::Builder
        ::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app
                    .handle()
                    .plugin(
                        tauri_plugin_log::Builder::default().level(log::LevelFilter::Info).build()
                    )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![fw_list_rules, fw_add_rule, fw_delete_rule])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
