export interface ModrinthFileHash {
    sha512: string;
    sha1: string;
}

export interface ModrinthFile {
    hashes: ModrinthFileHash;
    url: string;
    filename: string;
    primary: boolean;
    size: number;
    file_type: string | null; // e.g., \"required-resource-pack\"
}

// Keep simple for now, adjust if needed
export enum ModrinthDependencyType {
    Required = 'required',
    Optional = 'optional',
    Incompatible = 'incompatible',
    Embedded = 'embedded',
}

export interface ModrinthDependency {
    version_id: string | null;
    project_id: string | null;
    file_name: string | null;
    dependency_type: ModrinthDependencyType;
}

// Use string literals for enums for simplicity in TS
export type ModrinthVersionType = "release" | "beta" | "alpha";
// Project types enum matching backend
export type ModrinthProjectType = "mod" | "modpack" | "resourcepack" | "shader" | "datapack";
// Sort type enum matching backend
export type ModrinthSortType = "relevance" | "downloads" | "follows" | "newest" | "updated";

export interface ModrinthVersion {
    id: string;
    project_id: string;
    author_id: string | null;
    featured: boolean;
    name: string;
    version_number: string;
    changelog: string | null;
    dependencies: ModrinthDependency[];
    game_versions: string[];
    version_type: ModrinthVersionType;
    loaders: string[];
    files: ModrinthFile[];
    date_published: string;
    downloads: number; // u64 in Rust
    search_hit?: ModrinthSearchHit;
}

export interface ModrinthSearchResponse {
    hits: ModrinthSearchHit[];
    offset: number;
    limit: number;
    total_hits: number;
}

export interface ModrinthSearchHit {
    project_id: string;
    project_type: string;
    slug: string;
    title: string;
    description: string;
    author: string | null;
    icon_url: string | null;
    downloads: number;
    follows: number;
    latest_version: string | null;
    versions?: string[] | null;
    // Add other fields if needed
}

// Add the context type for frontend use
export interface ModrinthProjectContext {
    project_id: string;
    loader: string;
    game_version: string;
}

// Structure for results from get_all_modrinth_versions_for_contexts
export interface ModrinthAllVersionsResult {
    context: ModrinthProjectContext;
    versions: ModrinthVersion[] | null;
    error: string | null;
}

// Data structures matching backend
export interface ResourcePackModrinthInfo {
    project_id: string;
    version_id: string;
    name: string;
    version_number: string;
    download_url: string;
}

export interface ResourcePackInfo {
    filename: string;
    path: string;
    sha1_hash: string | null;
    file_size: number;
    is_disabled: boolean;
    modrinth_info: ResourcePackModrinthInfo | null;
}

export interface ShaderPackModrinthInfo {
    project_id: string;
    version_id: string;
    name: string;
    version_number: string;
    download_url: string;
}

export interface ShaderPackInfo {
    filename: string;
    path: string;
    sha1_hash: string | null;
    file_size: number;
    is_disabled: boolean;
    modrinth_info: ShaderPackModrinthInfo | null;
}