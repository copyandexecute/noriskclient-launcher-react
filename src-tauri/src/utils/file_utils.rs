use crate::error::{AppError, Result};
use async_zip::tokio::read::seek::ZipFileReader;
use base64::{engine::general_purpose::STANDARD, Engine as _};
use futures::AsyncReadExt;
use std::path::{Path, PathBuf};
use tokio::fs::File;
use tokio::io::AsyncWriteExt;

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
        let entry = entries.get(index).ok_or_else(|| {
            AppError::ArchiveReadError(format!("Failed to get entry at index {}", index))
        })?;
        let filename = entry.filename().as_str().map_err(|e| {
            AppError::ArchiveReadError(format!("Invalid filename in archive: {}", e))
        })?;

        if filename.to_lowercase().ends_with(".png") {
            let mut entry_reader = zip.reader_with_entry(index).await.map_err(|e| {
                AppError::ArchiveReadError(format!("Failed to read entry {}: {}", filename, e))
            })?;

            let mut buffer = Vec::new();
            entry_reader.read_to_end(&mut buffer).await.map_err(|e| {
                AppError::ArchiveReadError(format!("Failed to read content of {}: {}", filename, e))
            })?;

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
            log::debug!(
                "Erstes PNG als Base64 gefunden (erste 50 Zeichen): {}...",
                &base64_icon[..50.min(base64_icon.len())]
            );
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

/// Reads the content of a file into a string, replacing invalid UTF-8 sequences.
///
/// If the file doesn't exist, returns `Ok("".to_string())`.
///
/// # Arguments
///
/// * `file_path` - The path to the file to read.
///
/// # Returns
///
/// A `Result` containing the file content as a `String`, or an `AppError` if reading fails.
pub async fn read_file_content_lossy(file_path: &Path) -> Result<String> {
    // Check if the file exists
    if !file_path.exists() {
        log::warn!(
            "File not found at {}, returning empty content.",
            file_path.display()
        );
        return Ok("".to_string()); // Return empty string if file not found
    }

    // Read file content as bytes first to handle potential invalid UTF-8
    match tokio::fs::read(file_path).await {
        Ok(bytes) => {
            // Convert bytes to string, replacing invalid sequences
            let content = String::from_utf8_lossy(&bytes).to_string();
            log::info!(
                "Successfully read {} bytes (lossy converted) from file {}",
                bytes.len(),
                file_path.display()
            );
            Ok(content)
        }
        Err(e) => {
            log::error!("Failed to read file content {}: {}", file_path.display(), e);
            Err(AppError::Io(e))
        }
    }
}

/// Reads the content of a log file (`.log` or `.log.gz`) into a string.
/// Supports plain text and gzip compressed files.
///
/// If the file doesn't exist, returns `Ok("".to_string())`.
/// Invalid UTF-8 sequences are replaced lossily.
///
/// # Arguments
///
/// * `log_path` - The path to the log file.
///
/// # Returns
///
/// A `Result` containing the log content as a `String`, or an `AppError` if reading or decompression fails.
pub async fn read_log_file_content(log_path: &Path) -> Result<String> {
    // Check if the file exists
    if !log_path.exists() {
        log::warn!(
            "Log file not found at {}, returning empty content.",
            log_path.display()
        );
        return Ok("".to_string()); // Return empty string if file not found
    }

    let filename = log_path.file_name().and_then(|n| n.to_str()).unwrap_or("");

    if filename.ends_with(".log.gz") {
        // Handle gzipped file
        log::debug!("Reading gzipped log file: {}", log_path.display());
        match tokio::fs::File::open(log_path).await {
            Ok(file) => {
                let buf_reader = tokio::io::BufReader::new(file);
                let mut decoder = async_compression::tokio::bufread::GzipDecoder::new(buf_reader);
                let mut decompressed_bytes = Vec::new();
                match tokio::io::copy(&mut decoder, &mut decompressed_bytes).await {
                    Ok(bytes_copied) => {
                        let content = String::from_utf8_lossy(&decompressed_bytes).to_string();
                        log::info!(
                            "Successfully read and decompressed {} bytes from gzipped log file {}",
                            bytes_copied,
                            log_path.display()
                        );
                        Ok(content)
                    }
                    Err(e) => {
                        log::error!(
                            "Failed to decompress gzipped log file {}: {}",
                            log_path.display(),
                            e
                        );
                        Err(AppError::Io(e))
                    }
                }
            }
            Err(e) => {
                log::error!(
                    "Failed to open gzipped log file {}: {}",
                    log_path.display(),
                    e
                );
                Err(AppError::Io(e))
            }
        }
    } else if filename.ends_with(".log") {
        // Handle plain text file using existing function
        log::debug!("Reading plain text log file: {}", log_path.display());
        read_file_content_lossy(log_path).await
    } else {
        // Handle unsupported file type
        log::warn!(
            "Unsupported log file type at {}, returning empty content.",
            log_path.display()
        );
        Ok("".to_string()) // Or return an error if preferred
    }
}
