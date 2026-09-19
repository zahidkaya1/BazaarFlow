use serde::{Deserialize, Serialize};
use std::{
  fs,
  path::{Path, PathBuf},
};
#[cfg(any(target_os = "windows", target_os = "macos", target_os = "linux"))]
use std::process::Command;
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RecoveryPointMeta {
  id: String,
  created_at: String,
  kind: String,
  reason: String,
  checksum: String,
  app_version: String,
  database_version: f64,
  byte_size: u64,
}

#[derive(Debug, Deserialize)]
struct RecoveryPointEnvelope {
  meta: RecoveryPointMeta,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct RecoveryBackendInfo {
  backend: String,
  can_open_folder: bool,
  location_label: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DataBackupMeta {
  id: String,
  created_at: String,
  origin: String,
  byte_size: u64,
}

#[derive(Debug, Deserialize)]
struct DataBackupEnvelope {
  meta: DataBackupMeta,
  backup: serde_json::Value,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct DataBackupBackendInfo {
  backend: String,
  can_open_folder: bool,
}

fn recovery_dir(app: &AppHandle) -> Result<PathBuf, String> {
  let base = app
    .path()
    .app_local_data_dir()
    .map_err(|error| format!("Kurtarma klasörü bulunamadı: {error}"))?;

  let dir = base.join("Recovery");

  fs::create_dir_all(&dir)
    .map_err(|error| format!("Kurtarma klasörü oluşturulamadı: {error}"))?;

  Ok(dir)
}

fn data_backup_dir(app: &AppHandle) -> Result<PathBuf, String> {
  #[cfg(any(target_os = "windows", target_os = "macos", target_os = "linux"))]
  let dir = match app.path().document_dir() {
    Ok(documents) => documents.join("BazaarFlow").join("Yedekler"),
    Err(_) => app
      .path()
      .app_local_data_dir()
      .map_err(|error| format!("Yedek alanı bulunamadı: {error}"))?
      .join("Yedekler"),
  };

  #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
  let dir = app
    .path()
    .app_local_data_dir()
    .map_err(|error| format!("Yedek alanı bulunamadı: {error}"))?
    .join("Yedekler");

  fs::create_dir_all(&dir)
    .map_err(|error| format!("Yedek alanı oluşturulamadı: {error}"))?;

  Ok(dir)
}

fn is_safe_id(id: &str) -> bool {
  !id.is_empty()
    && id.len() <= 180
    && id
      .chars()
      .all(|value| value.is_ascii_alphanumeric() || matches!(value, '-' | '_' | '.'))
}

fn safe_recovery_file(dir: &Path, id: &str) -> Result<PathBuf, String> {
  if !is_safe_id(id) {
    return Err("Geçersiz kurtarma noktası kimliği.".into());
  }

  Ok(dir.join(format!("{id}.bfrec")))
}

fn safe_data_backup_file(dir: &Path, id: &str) -> Result<PathBuf, String> {
  if !is_safe_id(id) {
    return Err("Geçersiz yedek kimliği.".into());
  }

  Ok(dir.join(format!("{id}.bfbackup")))
}

#[tauri::command]
fn save_recovery_point(
  app: AppHandle,
  id: String,
  contents: String,
) -> Result<(), String> {
  const MAX_POINT_BYTES: usize = 50 * 1024 * 1024;

  if contents.len() > MAX_POINT_BYTES {
    return Err("Kurtarma noktası 50 MB sınırını aşıyor.".into());
  }

  let dir = recovery_dir(&app)?;
  let path = safe_recovery_file(&dir, &id)?;
  let temp_path = path.with_extension("bfrec.tmp");

  fs::write(&temp_path, contents.as_bytes())
    .map_err(|error| format!("Kurtarma noktası yazılamadı: {error}"))?;

  if path.exists() {
    fs::remove_file(&path)
      .map_err(|error| format!("Eski kurtarma noktası değiştirilemedi: {error}"))?;
  }

  fs::rename(&temp_path, &path)
    .map_err(|error| format!("Kurtarma noktası tamamlanamadı: {error}"))?;

  Ok(())
}

#[tauri::command]
fn list_recovery_points(app: AppHandle) -> Result<Vec<RecoveryPointMeta>, String> {
  let dir = recovery_dir(&app)?;
  let mut result = Vec::new();

  for entry in fs::read_dir(&dir)
    .map_err(|error| format!("Kurtarma kayıtları okunamadı: {error}"))?
  {
    let entry = match entry {
      Ok(value) => value,
      Err(_) => continue,
    };

    let path = entry.path();

    if path.extension().and_then(|value| value.to_str()) != Some("bfrec") {
      continue;
    }

    let bytes = match fs::read(&path) {
      Ok(value) => value,
      Err(_) => continue,
    };

    let mut envelope: RecoveryPointEnvelope = match serde_json::from_slice(&bytes) {
      Ok(value) => value,
      Err(_) => continue,
    };

    envelope.meta.byte_size = bytes.len() as u64;
    result.push(envelope.meta);
  }

  result.sort_by(|first, second| second.created_at.cmp(&first.created_at));

  Ok(result)
}

#[tauri::command]
fn read_recovery_point(app: AppHandle, id: String) -> Result<String, String> {
  let dir = recovery_dir(&app)?;
  let path = safe_recovery_file(&dir, &id)?;

  fs::read_to_string(&path)
    .map_err(|error| format!("Kurtarma noktası okunamadı: {error}"))
}

#[tauri::command]
fn delete_recovery_point(app: AppHandle, id: String) -> Result<(), String> {
  let dir = recovery_dir(&app)?;
  let path = safe_recovery_file(&dir, &id)?;

  if path.exists() {
    fs::remove_file(path)
      .map_err(|error| format!("Kurtarma noktası silinemedi: {error}"))?;
  }

  Ok(())
}

#[tauri::command]
fn get_recovery_backend_info(app: AppHandle) -> Result<RecoveryBackendInfo, String> {
  recovery_dir(&app)?;

  Ok(RecoveryBackendInfo {
    backend: "native-files".into(),
    can_open_folder: cfg!(any(target_os = "windows", target_os = "macos", target_os = "linux")),
    location_label: if cfg!(any(target_os = "windows", target_os = "macos", target_os = "linux")) {
      "BazaarFlow yerel kurtarma klasörü".into()
    } else {
      "BazaarFlow uygulama içi güvenli alanı".into()
    },
  })
}

#[tauri::command]
fn open_recovery_folder(app: AppHandle) -> Result<(), String> {
  #[cfg(target_os = "windows")]
  {
    let dir = recovery_dir(&app)?;
    Command::new("explorer")
      .arg(&dir)
      .spawn()
      .map_err(|error| format!("Kurtarma klasörü açılamadı: {error}"))?;
    return Ok(());
  }

  #[cfg(target_os = "macos")]
  {
    let dir = recovery_dir(&app)?;
    Command::new("open")
      .arg(&dir)
      .spawn()
      .map_err(|error| format!("Kurtarma klasörü açılamadı: {error}"))?;
    return Ok(());
  }

  #[cfg(target_os = "linux")]
  {
    let dir = recovery_dir(&app)?;
    Command::new("xdg-open")
      .arg(&dir)
      .spawn()
      .map_err(|error| format!("Kurtarma klasörü açılamadı: {error}"))?;
    return Ok(());
  }

  #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
  {
    let _ = app;
    Err("Bu platformda kurtarma klasörü doğrudan açılamıyor.".into())
  }
}

#[tauri::command]
fn save_data_backup(
  app: AppHandle,
  id: String,
  contents: String,
) -> Result<(), String> {
  const MAX_BACKUP_BYTES: usize = 50 * 1024 * 1024;

  if contents.len() > MAX_BACKUP_BYTES {
    return Err("Yedek 50 MB sınırını aşıyor.".into());
  }

  let dir = data_backup_dir(&app)?;
  let path = safe_data_backup_file(&dir, &id)?;
  let temp_path = path.with_extension("bfbackup.tmp");

  fs::write(&temp_path, contents.as_bytes())
    .map_err(|error| format!("Yedek yazılamadı: {error}"))?;

  if path.exists() {
    fs::remove_file(&path)
      .map_err(|error| format!("Eski yedek değiştirilemedi: {error}"))?;
  }

  fs::rename(&temp_path, &path)
    .map_err(|error| format!("Yedek tamamlanamadı: {error}"))?;

  Ok(())
}

#[tauri::command]
fn list_data_backups(app: AppHandle) -> Result<Vec<DataBackupMeta>, String> {
  let dir = data_backup_dir(&app)?;
  let mut result = Vec::new();

  for entry in fs::read_dir(&dir)
    .map_err(|error| format!("Yedekler okunamadı: {error}"))?
  {
    let entry = match entry {
      Ok(value) => value,
      Err(_) => continue,
    };

    let path = entry.path();

    if path.extension().and_then(|value| value.to_str()) != Some("bfbackup") {
      continue;
    }

    let bytes = match fs::read(&path) {
      Ok(value) => value,
      Err(_) => continue,
    };

    let mut envelope: DataBackupEnvelope = match serde_json::from_slice(&bytes) {
      Ok(value) => value,
      Err(_) => continue,
    };

    envelope.meta.byte_size = bytes.len() as u64;
    result.push(envelope.meta);
  }

  result.sort_by(|first, second| second.created_at.cmp(&first.created_at));

  Ok(result)
}

#[tauri::command]
fn read_data_backup(app: AppHandle, id: String) -> Result<String, String> {
  let dir = data_backup_dir(&app)?;
  let path = safe_data_backup_file(&dir, &id)?;

  fs::read_to_string(&path)
    .map_err(|error| format!("Yedek okunamadı: {error}"))
}

#[tauri::command]
fn delete_data_backup(app: AppHandle, id: String) -> Result<(), String> {
  let dir = data_backup_dir(&app)?;
  let path = safe_data_backup_file(&dir, &id)?;

  if path.exists() {
    fs::remove_file(path)
      .map_err(|error| format!("Yedek silinemedi: {error}"))?;
  }

  Ok(())
}

#[tauri::command]
fn export_data_backup(app: AppHandle, id: String) -> Result<(), String> {
  let dir = data_backup_dir(&app)?;
  let path = safe_data_backup_file(&dir, &id)?;
  let bytes = fs::read(&path)
    .map_err(|error| format!("Yedek okunamadı: {error}"))?;
  let envelope: DataBackupEnvelope = serde_json::from_slice(&bytes)
    .map_err(|error| format!("Yedek doğrulanamadı: {error}"))?;

  let safe_date = envelope
    .meta
    .created_at
    .replace(':', "-")
    .replace(".000Z", "Z");
  let export_path = dir.join(format!("bazaarflow-yedek-{safe_date}.json"));
  let pretty = serde_json::to_vec_pretty(&envelope.backup)
    .map_err(|error| format!("Yedek hazırlanamadı: {error}"))?;

  fs::write(export_path, pretty)
    .map_err(|error| format!("Yedek dışa aktarılamadı: {error}"))?;

  Ok(())
}

#[tauri::command]
fn get_data_backup_backend_info(app: AppHandle) -> Result<DataBackupBackendInfo, String> {
  data_backup_dir(&app)?;

  Ok(DataBackupBackendInfo {
    backend: "native-files".into(),
    can_open_folder: cfg!(any(target_os = "windows", target_os = "macos", target_os = "linux")),
  })
}

#[tauri::command]
fn open_data_backup_folder(app: AppHandle) -> Result<(), String> {
  #[cfg(target_os = "windows")]
  {
    let dir = data_backup_dir(&app)?;
    Command::new("explorer")
      .arg(&dir)
      .spawn()
      .map_err(|error| format!("Yedek klasörü açılamadı: {error}"))?;
    return Ok(());
  }

  #[cfg(target_os = "macos")]
  {
    let dir = data_backup_dir(&app)?;
    Command::new("open")
      .arg(&dir)
      .spawn()
      .map_err(|error| format!("Yedek klasörü açılamadı: {error}"))?;
    return Ok(());
  }

  #[cfg(target_os = "linux")]
  {
    let dir = data_backup_dir(&app)?;
    Command::new("xdg-open")
      .arg(&dir)
      .spawn()
      .map_err(|error| format!("Yedek klasörü açılamadı: {error}"))?;
    return Ok(());
  }

  #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
  {
    let _ = app;
    Err("Bu platformda yedek klasörü doğrudan açılamıyor.".into())
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      save_recovery_point,
      list_recovery_points,
      read_recovery_point,
      delete_recovery_point,
      get_recovery_backend_info,
      open_recovery_folder,
      save_data_backup,
      list_data_backups,
      read_data_backup,
      delete_data_backup,
      export_data_backup,
      get_data_backup_backend_info,
      open_data_backup_folder,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
