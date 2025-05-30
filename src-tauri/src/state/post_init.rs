use crate::error::Result;
use std::sync::Arc;
use async_trait::async_trait;

#[async_trait]
pub trait PostInitializationHandler {
    async fn on_state_ready(&self, app_handle: Arc<tauri::AppHandle>) -> Result<()>;
} 