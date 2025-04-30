use crate::error::{AppError, Result};
use std::path::{Path, PathBuf};
use tokio::fs::File;
use futures::AsyncReadExt;
use tokio::io::{AsyncWriteExt};
use async_zip::tokio::read::seek::ZipFileReader;
use base64::{engine::general_purpose::STANDARD, Engine as _};


/// Finds the first `.png` file within a zip or jar archive and returns its content as a Base64 encoded string.
///
/// # Arguments
///
/// * `archive_path` - The path to the `.zip` or `.jar` file.
///
/// # Returns
///
/// A `Result` containing the Base64 encoded string of the first PNG found, or an `AppError`.
pub async fn find_first_png_in_archive_as_base64(archive_path: &Path) -> Result<String> {
    if !archive_path.exists() {
        return Err(AppError::FileNotFound(archive_path.to_path_buf()));
    }

    let file = File::open(archive_path).await?;
    let mut reader = tokio::io::BufReader::new(file);

    let mut zip = ZipFileReader::with_tokio(&mut reader)
        .await
        .map_err(|e| AppError::ArchiveReadError(format!("Failed to read archive: {}", e)))?;

    let entries = zip.file().entries().to_vec();

    for index in 0..entries.len() {
        let entry = entries.get(index).ok_or_else(|| AppError::ArchiveReadError(format!("Failed to get entry at index {}", index)))?;
        let filename = entry.filename().as_str().map_err(|e| AppError::ArchiveReadError(format!("Invalid filename in archive: {}", e)))?;

        if filename.to_lowercase().ends_with(".png") {
            let mut entry_reader = zip.reader_with_entry(index)
                .await
                .map_err(|e| AppError::ArchiveReadError(format!("Failed to read entry {}: {}", filename, e)))?;

            let mut buffer = Vec::new();
            entry_reader.read_to_end(&mut buffer)
                .await
                .map_err(|e| AppError::ArchiveReadError(format!("Failed to read content of {}: {}", filename, e)))?;

            // Encode the buffer to Base64
            let base64_string = STANDARD.encode(&buffer);
            return Ok(base64_string);
        }
    }

    Err(AppError::PngNotFoundInArchive(archive_path.to_path_buf()))
}

pub async fn get_jar_icon_test() {
    // Verwende einen Raw-String für den Windows-Pfad
    let path_str = r"C:\Users\sheesh\AppData\Roaming\norisk\NoRiskClientV3\meta\mod_cache\§fAbsolute §7[§f16x§7]§8.zip";
    let archive_path = Path::new(path_str);

    match find_first_png_in_archive_as_base64(archive_path).await {
        Ok(base64_icon) => {
            log::debug!("Erstes PNG als Base64 gefunden (erste 50 Zeichen): {}...", &base64_icon[..50.min(base64_icon.len())]);
            // Hier kannst du den base64_icon String verwenden
        }
        Err(AppError::PngNotFoundInArchive(path)) => {
            log::debug!("Fehler: Kein PNG im Archiv gefunden: {:?}", path);
        }
        Err(AppError::FileNotFound(path)) => {
            log::debug!("Fehler: Archivdatei nicht gefunden: {:?}", path);
        }
        Err(AppError::ArchiveReadError(msg)) => {
            log::debug!("Fehler beim Lesen des Archivs: {}", msg);
        }
        Err(e) => {
            log::debug!("Ein unerwarteter Fehler ist aufgetreten: {}", e);
        }
    }
}
