use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{Manager, State};

// ── Models ────────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Record {
    pub id:         Option<i64>,
    pub name:       String,
    pub category:   Option<String>,
    pub value:      Option<f64>,
    pub notes:      Option<String>,
    pub created_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileEntry {
    pub id:            Option<i64>,
    pub original_name: String,
    pub stored_name:   String,
    pub mime_type:     Option<String>,
    pub size:          Option<i64>,
    pub notes:         Option<String>,
    pub created_at:    Option<String>,
}

// ── App State ─────────────────────────────────────────────────────────────────

pub struct AppState {
    pub db:         Mutex<Connection>,
    pub upload_dir: PathBuf,
}

fn init_db(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch("
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS records (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            name       TEXT    NOT NULL,
            category   TEXT,
            value      REAL    DEFAULT 0,
            notes      TEXT,
            created_at TEXT    DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS files (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            original_name TEXT    NOT NULL,
            stored_name   TEXT    NOT NULL UNIQUE,
            mime_type     TEXT,
            size          INTEGER DEFAULT 0,
            notes         TEXT,
            created_at    TEXT    DEFAULT (datetime('now'))
        );
    ")?;

    let n: i64 = conn.query_row("SELECT COUNT(*) FROM records", [], |r| r.get(0))?;
    if n == 0 {
        let seeds = vec![
            ("Project Alpha",  "work",     1500.0, "Q1 deliverable"),
            ("Budget 2025",    "finance",  42000.0,"Annual budget"),
            ("Personal Goals", "personal", 0.0,    "Health and fitness"),
            ("Server Logs",    "general",  0.0,    "PIExpert WS logs"),
            ("Q2 Milestones",  "work",     3200.0, "Sprint planning done"),
            ("Emergency Fund", "finance",  8500.0, "3-month target"),
        ];
        for (name, cat, val, notes) in seeds {
            conn.execute(
                "INSERT INTO records (name,category,value,notes) VALUES (?1,?2,?3,?4)",
                params![name, cat, val, notes],
            )?;
        }
        println!("🌱 Seeded 6 demo records");
    }
    Ok(())
}

// ── Record Commands ───────────────────────────────────────────────────────────

#[tauri::command]
fn get_all_records(state: State<AppState>) -> Result<Vec<Record>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT id,name,category,value,notes,created_at FROM records ORDER BY id DESC"
    ).map_err(|e| e.to_string())?;
    let records = stmt.query_map([], |row| Ok(Record {
        id: row.get(0)?, name: row.get(1)?, category: row.get(2)?,
        value: row.get(3)?, notes: row.get(4)?, created_at: row.get(5)?,
    })).map_err(|e| e.to_string())?
       .filter_map(|r| r.ok()).collect();
    Ok(records)
}

#[tauri::command]
fn get_record_by_id(id: i64, state: State<AppState>) -> Result<Record, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.query_row(
        "SELECT id,name,category,value,notes,created_at FROM records WHERE id=?1",
        params![id],
        |row| Ok(Record {
            id: row.get(0)?, name: row.get(1)?, category: row.get(2)?,
            value: row.get(3)?, notes: row.get(4)?, created_at: row.get(5)?,
        }),
    ).map_err(|e| format!("Record not found: {}", e))
}

#[tauri::command]
fn create_record(record: Record, state: State<AppState>) -> Result<Record, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO records (name,category,value,notes) VALUES (?1,?2,?3,?4)",
        params![record.name, record.category, record.value, record.notes],
    ).map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    conn.query_row(
        "SELECT id,name,category,value,notes,created_at FROM records WHERE id=?1",
        params![id],
        |row| Ok(Record {
            id: row.get(0)?, name: row.get(1)?, category: row.get(2)?,
            value: row.get(3)?, notes: row.get(4)?, created_at: row.get(5)?,
        }),
    ).map_err(|e| e.to_string())
}

#[tauri::command]
fn update_record(id: i64, data: Record, state: State<AppState>) -> Result<Record, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let rows = conn.execute(
        "UPDATE records SET name=?1,category=?2,value=?3,notes=?4 WHERE id=?5",
        params![data.name, data.category, data.value, data.notes, id],
    ).map_err(|e| e.to_string())?;
    if rows == 0 { return Err(format!("No record with id {}", id)); }
    conn.query_row(
        "SELECT id,name,category,value,notes,created_at FROM records WHERE id=?1",
        params![id],
        |row| Ok(Record {
            id: row.get(0)?, name: row.get(1)?, category: row.get(2)?,
            value: row.get(3)?, notes: row.get(4)?, created_at: row.get(5)?,
        }),
    ).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_record(id: i64, state: State<AppState>) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let rows = conn.execute("DELETE FROM records WHERE id=?1", params![id])
        .map_err(|e| e.to_string())?;
    if rows == 0 { return Err(format!("No record with id {}", id)); }
    Ok(())
}

// ── File Commands ─────────────────────────────────────────────────────────────

#[tauri::command]
fn get_all_files(state: State<AppState>) -> Result<Vec<FileEntry>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT id,original_name,stored_name,mime_type,size,notes,created_at FROM files ORDER BY id DESC"
    ).map_err(|e| e.to_string())?;
    let files = stmt.query_map([], |row| Ok(FileEntry {
        id: row.get(0)?, original_name: row.get(1)?, stored_name: row.get(2)?,
        mime_type: row.get(3)?, size: row.get(4)?, notes: row.get(5)?, created_at: row.get(6)?,
    })).map_err(|e| e.to_string())?
       .filter_map(|r| r.ok()).collect();
    Ok(files)
}

#[tauri::command]
fn import_file_base64(
    original_name: String,
    base64_data:   String,
    mime_type:     Option<String>,
    state:         State<AppState>,
) -> Result<FileEntry, String> {
    use std::io::Write;

    let ext = std::path::Path::new(&original_name)
        .extension().and_then(|e| e.to_str()).unwrap_or("");
    let unique      = format!("{}-{}", chrono_millis(), rand_suffix());
    let stored_name = if ext.is_empty() { unique } else { format!("{}.{}", unique, ext) };
    let dest        = state.upload_dir.join(&stored_name);

    // Decode base64 and write to disk
    let bytes = base64_decode(&base64_data).map_err(|e| e.to_string())?;
    let mut fh = fs::File::create(&dest).map_err(|e| e.to_string())?;
    fh.write_all(&bytes).map_err(|e| e.to_string())?;

    let size = bytes.len() as i64;
    let mime = mime_type.or_else(|| mime_from_ext(ext));

    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO files (original_name,stored_name,mime_type,size) VALUES (?1,?2,?3,?4)",
        params![original_name, stored_name, mime, size],
    ).map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    conn.query_row(
        "SELECT id,original_name,stored_name,mime_type,size,notes,created_at FROM files WHERE id=?1",
        params![id],
        |row| Ok(FileEntry {
            id: row.get(0)?, original_name: row.get(1)?, stored_name: row.get(2)?,
            mime_type: row.get(3)?, size: row.get(4)?, notes: row.get(5)?, created_at: row.get(6)?,
        }),
    ).map_err(|e| e.to_string())
}

#[tauri::command]
fn copy_file(id: i64, state: State<AppState>) -> Result<FileEntry, String> {
    let original = {
        let conn = state.db.lock().map_err(|e| e.to_string())?;
        conn.query_row(
            "SELECT id,original_name,stored_name,mime_type,size,notes,created_at FROM files WHERE id=?1",
            params![id],
            |row| Ok(FileEntry {
                id: row.get(0)?, original_name: row.get(1)?, stored_name: row.get(2)?,
                mime_type: row.get(3)?, size: row.get(4)?, notes: row.get(5)?, created_at: row.get(6)?,
            }),
        ).map_err(|e| format!("File {} not found: {}", id, e))?
    };

    let src = state.upload_dir.join(&original.stored_name);
    if !src.exists() { return Err("Physical file missing on disk".to_string()); }

    let ext         = std::path::Path::new(&original.stored_name)
        .extension().and_then(|e| e.to_str()).unwrap_or("");
    let new_stored  = if ext.is_empty() {
        format!("{}-{}", chrono_millis(), rand_suffix())
    } else {
        format!("{}-{}.{}", chrono_millis(), rand_suffix(), ext)
    };
    let dest = state.upload_dir.join(&new_stored);
    fs::copy(&src, &dest).map_err(|e| e.to_string())?;

    let base_name = std::path::Path::new(&original.original_name)
        .file_stem().and_then(|s| s.to_str()).unwrap_or("file");
    let copy_ext  = std::path::Path::new(&original.original_name)
        .extension().and_then(|e| e.to_str()).unwrap_or("");
    let copy_display = if copy_ext.is_empty() {
        format!("{} (copy)", base_name)
    } else {
        format!("{} (copy).{}", base_name, copy_ext)
    };
    let new_size = fs::metadata(&dest).map(|m| m.len() as i64).unwrap_or(0);

    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO files (original_name,stored_name,mime_type,size,notes) VALUES (?1,?2,?3,?4,?5)",
        params![copy_display, new_stored, original.mime_type, new_size, original.notes],
    ).map_err(|e| e.to_string())?;
    let new_id = conn.last_insert_rowid();
    conn.query_row(
        "SELECT id,original_name,stored_name,mime_type,size,notes,created_at FROM files WHERE id=?1",
        params![new_id],
        |row| Ok(FileEntry {
            id: row.get(0)?, original_name: row.get(1)?, stored_name: row.get(2)?,
            mime_type: row.get(3)?, size: row.get(4)?, notes: row.get(5)?, created_at: row.get(6)?,
        }),
    ).map_err(|e| e.to_string())
}

#[tauri::command]
fn update_file_notes(id: i64, notes: Option<String>, state: State<AppState>) -> Result<FileEntry, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let rows = conn.execute("UPDATE files SET notes=?1 WHERE id=?2", params![notes, id])
        .map_err(|e| e.to_string())?;
    if rows == 0 { return Err(format!("No file with id {}", id)); }
    conn.query_row(
        "SELECT id,original_name,stored_name,mime_type,size,notes,created_at FROM files WHERE id=?1",
        params![id],
        |row| Ok(FileEntry {
            id: row.get(0)?, original_name: row.get(1)?, stored_name: row.get(2)?,
            mime_type: row.get(3)?, size: row.get(4)?, notes: row.get(5)?, created_at: row.get(6)?,
        }),
    ).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_file(id: i64, state: State<AppState>) -> Result<(), String> {
    let stored_name: String = {
        let conn = state.db.lock().map_err(|e| e.to_string())?;
        conn.query_row("SELECT stored_name FROM files WHERE id=?1", params![id], |r| r.get(0))
            .map_err(|e| format!("File {} not found: {}", id, e))?
    };
    let fp = state.upload_dir.join(&stored_name);
    if fp.exists() { fs::remove_file(&fp).map_err(|e| e.to_string())?; }
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM files WHERE id=?1", params![id]).map_err(|e| e.to_string())?;
    Ok(())
}

// ── Helpers ───────────────────────────────────────────────────────────────────

fn chrono_millis() -> u128 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
}

fn rand_suffix() -> u32 {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    let mut h = DefaultHasher::new();
    chrono_millis().hash(&mut h);
    (h.finish() % 1_000_000) as u32
}

fn base64_decode(s: &str) -> Result<Vec<u8>, String> {
    // Simple base64 decoder — no external crate needed
    const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut table = [0u8; 256];
    for (i, &c) in CHARS.iter().enumerate() { table[c as usize] = i as u8; }
    let s = s.trim_end_matches('=').replace('-', "+").replace('_', "/");
    let bytes = s.as_bytes();
    let mut out = Vec::with_capacity(bytes.len() * 3 / 4);
    let mut i = 0;
    while i + 3 < bytes.len() {
        let b = [table[bytes[i] as usize], table[bytes[i+1] as usize],
                 table[bytes[i+2] as usize], table[bytes[i+3] as usize]];
        out.push((b[0] << 2) | (b[1] >> 4));
        out.push((b[1] << 4) | (b[2] >> 2));
        out.push((b[2] << 6) | b[3]);
        i += 4;
    }
    if i + 2 < bytes.len() {
        let b = [table[bytes[i] as usize], table[bytes[i+1] as usize], table[bytes[i+2] as usize]];
        out.push((b[0] << 2) | (b[1] >> 4));
        out.push((b[1] << 4) | (b[2] >> 2));
    } else if i + 1 < bytes.len() {
        let b = [table[bytes[i] as usize], table[bytes[i+1] as usize]];
        out.push((b[0] << 2) | (b[1] >> 4));
    }
    Ok(out)
}

fn mime_from_ext(ext: &str) -> Option<String> {
    let m = match ext.to_lowercase().as_str() {
        "pdf"  => "application/pdf",
        "png"  => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif"  => "image/gif",
        "webp" => "image/webp",
        "svg"  => "image/svg+xml",
        "txt"  => "text/plain",
        "md"   => "text/markdown",
        "csv"  => "text/csv",
        "json" => "application/json",
        "zip"  => "application/zip",
        "doc"  => "application/msword",
        "docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "xls"  => "application/vnd.ms-excel",
        "xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        _      => return None,
    };
    Some(m.to_string())
}

#[tauri::command]
fn get_upload_dir(state: State<AppState>) -> String {
    state.upload_dir.to_string_lossy().to_string()
}

// ── Entry Point ───────────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let data_dir = app.path().app_data_dir()
                .expect("Failed to resolve app data dir");
            fs::create_dir_all(&data_dir).expect("Failed to create app data dir");

            let upload_dir = data_dir.join("uploads");
            fs::create_dir_all(&upload_dir).expect("Failed to create uploads dir");

            let db_path = data_dir.join("piexpert.db");
            println!("📦 Database:  {}", db_path.display());
            println!("📁 Uploads:   {}", upload_dir.display());

            let conn = Connection::open(&db_path).expect("Failed to open SQLite");
            init_db(&conn).expect("Failed to init schema");

            app.manage(AppState { db: Mutex::new(conn), upload_dir });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_all_records, get_record_by_id, create_record, update_record, delete_record,
            get_all_files, import_file_base64, copy_file, update_file_notes, delete_file, get_upload_dir,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
