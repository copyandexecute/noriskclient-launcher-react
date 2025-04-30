// Minecraft geo.json types

export interface GeoJsonData {
    format_version: string;
    "minecraft:geometry"?: GeometryModel[];
    minecraft_geometry?: GeometryModel[];
}

export interface GeometryModel {
    description: {
        identifier: string;
        texture_width: number;
        texture_height: number;
        visible_bounds_width: number;
        visible_bounds_height: number;
        visible_bounds_offset: number[];
    };
    bones: Bone[];
}

export interface Bone {
    name: string;
    parent?: string;
    pivot: number[];
    rotation?: number[];
    cubes?: Cube[];
}

export interface Cube {
    origin: number[];
    size: number[];
    uv: number[];
    inflate?: number;
    mirror?: boolean;
} 