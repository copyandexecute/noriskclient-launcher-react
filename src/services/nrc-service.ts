import { invoke } from '@tauri-apps/api/core';
import type { BlogPost } from '../types/wordPress';

/**
 * Fetches the latest news and changelog posts from the backend.
 *
 * @returns A promise that resolves to an array of BlogPost objects.
 * @throws If the backend command fails.
 */
export const fetchNewsAndChangelogs = (): Promise<BlogPost[]> => {
  // Directly invoke and return the promise. Errors will propagate to the caller.
  return invoke('get_news_and_changelogs_command');
}; 