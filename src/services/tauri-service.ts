import { openUrl } from '@tauri-apps/plugin-opener';

/**
 * Opens a given URL in the default external application (usually the web browser).
 * Requires the `plugin-opener` to be configured and appropriate permissions granted.
 * See: https://v2.tauri.app/plugin/opener/
 *
 * @param url The URL to open (e.g., 'https://example.com').
 * @throws If the opener plugin fails to open the URL (e.g., due to permissions or invalid URL).
 */
export const openExternalUrl = (url: string): Promise<void> => {
  // Directly call the plugin function. Errors propagate to the caller.
  return openUrl(url);
}; 