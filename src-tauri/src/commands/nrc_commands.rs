use crate::error::CommandError;
use crate::minecraft::api::wordpress_api::{BlogPost, WordPressApi};
use log::info;

/// Fetches news and changelog posts from the WordPress API.
///
/// # Returns
///
/// * `Result<Vec<BlogPost>, CommandError>` - A vector of blog posts or an error.
#[tauri::command]
pub async fn get_news_and_changelogs_command() -> Result<Vec<BlogPost>, CommandError> {
    info!("Executing get_news_and_changelogs_command");
    Ok(WordPressApi::get_news_and_changelogs().await?)
}
