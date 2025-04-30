<!-- src/lib/components/GeoJsonRenderer.svelte -->
<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import * as THREE from "three";
    import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
    import type { GeoJsonData, Bone, Cube } from "../types/geometry";

    // Props
    const { 
        geoJsonUrl,
        textureUrl, 
        width = 400,
        height = 300,
        autoRotate = false,
        backgroundColor = "#f0f0f0"
    }: { 
        geoJsonUrl: string,
        textureUrl: string,
        width?: number,
        height?: number,
        autoRotate?: boolean,
        backgroundColor?: string
    } = $props();

    // State
    let canvasElement: HTMLCanvasElement | undefined = $state();
    let errorMessage: string | null = $state(null);
    let isLoading: boolean = $state(true);

    // Three.js objects
    let scene: THREE.Scene | null = null;
    let camera: THREE.PerspectiveCamera | null = null;
    let renderer: THREE.WebGLRenderer | null = null;
    let controls: OrbitControls | null = null;
    let modelGroup: THREE.Group | null = null;
    let animationFrameId: number | null = null;

    // Track current URLs to detect changes
    let currentGeoJsonUrl = geoJsonUrl;
    let currentTextureUrl = textureUrl;

    // Setup and cleanup
    onMount(() => {
        if (!canvasElement) {
            errorMessage = "Canvas element not available";
            isLoading = false;
            return;
        }

        if (!geoJsonUrl || !textureUrl) {
            errorMessage = "Missing geometry or texture URL";
            isLoading = false;
            return;
        }

        try {
            initThreeJs();
            loadModelAndTexture();
        } catch (error) {
            console.error("[GeoJsonRenderer] Error initializing:", error);
            errorMessage = "Failed to initialize 3D renderer";
            isLoading = false;
        }
    });

    onDestroy(() => {
        // Clean up Three.js resources
        if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId);
        }

        if (controls) {
            controls.dispose();
        }

        if (renderer) {
            renderer.dispose();
        }

        disposeModel();
        
        scene = null;
        camera = null;
        renderer = null;
        controls = null;
        modelGroup = null;
    });

    function disposeModel() {
        if (!modelGroup) return;
        
        // Recursively dispose of all geometries and materials in the model
        modelGroup.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                object.geometry.dispose();
                if (object.material instanceof THREE.Material) {
                    object.material.dispose();
                } else if (Array.isArray(object.material)) {
                    object.material.forEach((material: THREE.Material) => material.dispose());
                }
            }
        });
        
        if (scene) {
            scene.remove(modelGroup);
        }
    }

    // Initialize Three.js scene, camera, renderer
    function initThreeJs() {
        if (!canvasElement) return;

        // Create scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(backgroundColor);

        // Create camera
        const aspectRatio = width / height;
        camera = new THREE.PerspectiveCamera(45, aspectRatio, 0.1, 1000);
        camera.position.set(0, 32, 50);

        // Create renderer
        renderer = new THREE.WebGLRenderer({
            canvas: canvasElement,
            antialias: true,
            alpha: true
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        
        // Add orbit controls
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.autoRotate = autoRotate;
        controls.autoRotateSpeed = 1.0;
        controls.enableZoom = true;
        controls.minDistance = 10;
        controls.maxDistance = 100;

        // Enhanced lighting setup
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
        directionalLight.position.set(5, 10, 7);
        directionalLight.castShadow = true;
        scene.add(directionalLight);
        
        const frontFill = new THREE.DirectionalLight(0xffffff, 0.7);
        frontFill.position.set(0, 0, 10);
        scene.add(frontFill);
        
        const backLight = new THREE.DirectionalLight(0xffffff, 0.5);
        backLight.position.set(-5, 3, -5);
        scene.add(backLight);

        // Add grid helper for reference
        const gridHelper = new THREE.GridHelper(100, 20);
        scene.add(gridHelper);

        // Start animation loop
        animate();

        // Handle window resize
        const handleResize = () => {
            if (!camera || !renderer) return;
            
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }

    // Load model and texture
    async function loadModelAndTexture() {
        if (!scene) return;

        console.log(`[GeoJsonRenderer] Loading model: ${geoJsonUrl}, Texture: ${textureUrl}`);
        isLoading = true;
        errorMessage = null;
        currentGeoJsonUrl = geoJsonUrl;
        currentTextureUrl = textureUrl;

        try {
            // Load geometry JSON
            const geoJsonResponse = await fetch(geoJsonUrl);
            if (!geoJsonResponse.ok) {
                throw new Error(`Failed to load geometry: ${geoJsonResponse.statusText} (${geoJsonResponse.status})`);
            }
            console.log(`[GeoJsonRenderer] Fetched geometry for ${geoJsonUrl}`);
            const geoJsonData: GeoJsonData = await geoJsonResponse.json();
            console.log(`[GeoJsonRenderer] Parsed geometry JSON for ${geoJsonUrl}`);
            
            // Load texture
            const textureLoader = new THREE.TextureLoader();
            textureLoader.crossOrigin = 'anonymous';
            
            const texture = await new Promise<THREE.Texture>((resolve, reject) => {
                textureLoader.load(
                    textureUrl,
                    (loadedTexture) => {
                        loadedTexture.magFilter = THREE.NearestFilter;
                        loadedTexture.minFilter = THREE.NearestFilter;
                        loadedTexture.colorSpace = THREE.SRGBColorSpace;
                        console.log(`[GeoJsonRenderer] Texture loaded for ${textureUrl}, set colorSpace to SRGB.`);
                        resolve(loadedTexture);
                    },
                    undefined,
                    (error) => reject(error)
                );
            });
            
            // Create 3D model
            createModelFromGeoJson(geoJsonData, texture);
            isLoading = false;
        } catch (error) {
            console.error(`[GeoJsonRenderer] Error loading model (${geoJsonUrl}):`, error);
            errorMessage = error instanceof Error ? error.message : "Failed to load model";
            isLoading = false;
        }
    }

    // Create 3D model from parsed geo.json data
    function createModelFromGeoJson(geoJsonData: GeoJsonData, texture: THREE.Texture) {
        if (!scene) return;
        console.log(`[GeoJsonRenderer] Creating model structure for ${geoJsonUrl}...`);
        
        disposeModel();
        modelGroup = new THREE.Group();
        modelGroup.name = geoJsonUrl; // Add name for debugging
        
        const geometry = geoJsonData.minecraft_geometry?.[0] || geoJsonData["minecraft:geometry"]?.[0];
        
        if (!geometry) {
            errorMessage = "Invalid geometry data structure in JSON";
            console.error("[GeoJsonRenderer] Invalid geometry data structure in JSON", geoJsonData);
            return;
        }
        if (!geometry.bones || geometry.bones.length === 0) {
            errorMessage = "No bones found in geometry data";
             console.error("[GeoJsonRenderer] No bones found in geometry data", geometry);
            return;
        }
        
        const textureWidth = geometry.description.texture_width;
        const textureHeight = geometry.description.texture_height;
        console.log(`[GeoJsonRenderer] Texture dimensions: ${textureWidth}x${textureHeight}`);
        
        const boneGroups: Record<string, THREE.Group> = {};
        
        // --- First pass: Create bone groups --- 
        console.log(`[GeoJsonRenderer] Creating ${geometry.bones.length} bone groups...`);
        for (const bone of geometry.bones) {
            const group = new THREE.Group();
            group.name = bone.name; 
            group.position.set(
                bone.pivot[0],
                bone.pivot[1],
                bone.pivot[2]
            );
            console.log(`  Created bone group: ${bone.name}, Pivot: [${bone.pivot.join(', ')}]`);
            
            // Handle initial rotation if defined (convert degrees to radians)
            if (bone.rotation) {
                group.rotation.set(
                    THREE.MathUtils.degToRad(bone.rotation[0]),
                    THREE.MathUtils.degToRad(bone.rotation[1]),
                    THREE.MathUtils.degToRad(bone.rotation[2])
                );
                 console.log(`    Applied initial rotation: [${bone.rotation.join(', ')}] degrees`);
            }

            boneGroups[bone.name] = group;
        }
        
        // --- Second pass: Establish parent-child relationships --- 
        console.log(`[GeoJsonRenderer] Establishing bone hierarchy...`);
        for (const bone of geometry.bones) {
            const group = boneGroups[bone.name];
            if (!group) {
                console.warn(`  Bone group not found during hierarchy setup: ${bone.name}`);
                continue;
            }
            
            if (bone.parent) {
                const parentGroup = boneGroups[bone.parent];
                if (parentGroup) {
                    const parentBone = geometry.bones.find((b: Bone) => b.name === bone.parent);
                    if (parentBone) {
                        // Adjust position relative to parent pivot
                        group.position.set(
                            bone.pivot[0] - parentBone.pivot[0],
                            bone.pivot[1] - parentBone.pivot[1],
                            bone.pivot[2] - parentBone.pivot[2]
                        );
                        parentGroup.add(group);
                        console.log(`  Parented ${bone.name} to ${bone.parent}. Relative Pivot: [${group.position.x.toFixed(2)}, ${group.position.y.toFixed(2)}, ${group.position.z.toFixed(2)}]`);
                    } else {
                         console.warn(`  Parent bone definition not found: ${bone.parent} for child ${bone.name}`);
                         // Add to root as fallback?
                         // modelGroup.add(group); 
                    }
                } else {
                    console.warn(`  Parent bone group not found: ${bone.parent} for child ${bone.name}. Adding to root.`);
                    modelGroup.add(group);
                }
            } else {
                // Root bone
                modelGroup.add(group);
                 console.log(`  Added root bone: ${bone.name}`);
            }
        }
        
        // --- Third pass: Add cubes to bones --- 
        console.log(`[GeoJsonRenderer] Adding cubes to bones...`);
        let cubeCount = 0;
        for (const bone of geometry.bones) {
            if (!bone.cubes || bone.cubes.length === 0) continue;
            
            const group = boneGroups[bone.name];
             if (!group) {
                console.warn(`  Bone group not found when adding cubes: ${bone.name}`);
                continue;
            }
            
            console.log(`  Adding ${bone.cubes.length} cubes to bone: ${bone.name}`);
            for (const cube of bone.cubes) {
                 cubeCount++;
                 // Add detailed cube logging here if needed later
                 // console.log(`    Cube Origin: [${cube.origin.join(', ')}], Size: [${cube.size.join(', ')}], UV: [${cube.uv.join(', ')}]`);
                addCubeToGroup(group, cube, texture, textureWidth, textureHeight);
            }
        }
        console.log(`[GeoJsonRenderer] Total cubes added: ${cubeCount}`);
        
        // Add the complete model group to the scene
        scene.add(modelGroup);
        console.log(`[GeoJsonRenderer] Added model group to scene.`);
        
        centerModel();
    }
    
    // Add a cube to a bone group
    function addCubeToGroup(
        group: THREE.Group, 
        cube: Cube, 
        texture: THREE.Texture, 
        textureWidth: number, 
        textureHeight: number
    ) {
        try {
            // Handle potential 'inflate' property (simple expansion)
            const inflate = cube.inflate ?? 0;
            const width = cube.size[0] + inflate * 2;
            const height = cube.size[1] + inflate * 2;
            const depth = cube.size[2] + inflate * 2;

            if (width <= 0 || height <= 0 || depth <= 0) {
                 console.warn(`  Skipping cube with zero or negative size on bone ${group.name}: Size [${cube.size.join(', ')}]`, cube);
                 return;
            }

            const geometry = new THREE.BoxGeometry(width, height, depth);
            
            // --- Restore Transparency Settings --- 
            const material = new THREE.MeshStandardMaterial({
                map: texture,
                transparent: true,
                alphaTest: 0.5,
                side: THREE.DoubleSide 
            });
            // --- END Material Update ---
            
            const mesh = new THREE.Mesh(geometry, material);
            mesh.name = `Cube_${group.name}_${cube.origin.join('_')}`; 
            
            // Adjust origin based on inflation
            const originX = cube.origin[0] - inflate;
            const originY = cube.origin[1] - inflate;
            const originZ = cube.origin[2] - inflate;
            mesh.position.set(
                originX + width / 2,
                originY + height / 2,
                -(originZ + depth / 2) // Negate Z
            );
            
            // Apply UV Mapping
            if (cube.uv) {
                applyUVMapping(geometry, cube, textureWidth, textureHeight);
            } else {
                console.warn(`  Cube on bone ${group.name} is missing UV definition`, cube);
            }
            
            group.add(mesh);

        } catch (error) {
            console.error(`  Error adding cube to bone ${group.name}:`, error, cube);
        }
    }
    
    // Apply UV mapping to a cube
    function applyUVMapping(
        geometry: THREE.BoxGeometry, 
        cube: Cube, 
        textureWidth: number, 
        textureHeight: number
    ) {
        const uvAttribute = geometry.attributes.uv;
        if (!uvAttribute) return;

        // Log the input values from the geo.json for this cube
        // Handle both array and object UV formats in logging
        const uvInputLog = Array.isArray(cube.uv) ? `[${cube.uv.join(', ')}]` : JSON.stringify(cube.uv);
        console.log(`    [UV Mapping] Cube Input - Origin: [${cube.origin.join(', ')}], Size: [${cube.size.join(', ')}], UV: ${uvInputLog}`);

        const w = cube.size[0]; // width
        const h = cube.size[1]; // height
        const d = cube.size[2]; // depth

        // Helper to create UV coordinates for a face (bottom-left, bottom-right, top-left, top-right)
        // Flips V coordinate because THREE.js UVs start from bottom-left, Minecraft from top-left
        const createFaceUV = (x: number, y: number, faceW: number, faceH: number) => [
            new THREE.Vector2(x / textureWidth,           1 - (y + faceH) / textureHeight), // bl
            new THREE.Vector2((x + faceW) / textureWidth, 1 - (y + faceH) / textureHeight), // br
            new THREE.Vector2(x / textureWidth,           1 - y / textureHeight),           // tl
            new THREE.Vector2((x + faceW) / textureWidth, 1 - y / textureHeight)            // tr
        ];

        let uvCoords: THREE.Vector2[] = [];
        let uvCalculationMethod = "Unknown";

        // --- Check for per-face UV format --- 
        if (typeof cube.uv === 'object' && !Array.isArray(cube.uv) && cube.uv !== null) {
            uvCalculationMethod = "Per-Face Object";
            console.log(`      [UV Mapping] Using Per-Face UV data.`);
            const uvMap = cube.uv as Record<string, { uv: number[], uv_size: number[] }>;

            // BoxGeometry face order: Right (+X), Left (-X), Top (+Y), Bottom (-Y), Front (+Z), Back (-Z)
            // Map Minecraft face names to BoxGeometry order
            // --- Try swapping East and West --- 
            // Previous attempt: ['east', 'west', 'up', 'down', 'north', 'south']
            // Original/Standard: ['east', 'west', 'up', 'down', 'south', 'north'] 
            // Current attempt: Swap east/west -> Map west data to Right(+X), east data to Left(-X)
            const faceNames = ['west', 'east', 'up', 'down', 'south', 'north']; 
            let missingFaces = 0;

            for (const faceName of faceNames) {
                const faceData = uvMap[faceName];
                if (faceData && faceData.uv && faceData.uv_size) {
                    uvCoords.push(...createFaceUV(
                        faceData.uv[0], 
                        faceData.uv[1], 
                        faceData.uv_size[0], 
                        faceData.uv_size[1]
                    ));
                } else {
                    console.warn(`      [UV Mapping] Missing UV data for face: ${faceName}. Using placeholder.`);
                    uvCoords.push(...createFaceUV(0, 0, 0, 0)); 
                    missingFaces++;
                }
            }
             if (missingFaces > 0) {
                 console.warn(`      [UV Mapping] ${missingFaces} faces had missing UV data.`);
             }

        } 
        // --- Check for simple array format (standard box UV calculation) --- 
        else if (Array.isArray(cube.uv) && cube.uv.length === 2) {
            uvCalculationMethod = "Standard Box Array";
             console.log(`      [UV Mapping] Using Standard Box UV calculation from offset.`);
            const u = cube.uv[0];
            const v = cube.uv[1];
            uvCoords = [
                ...createFaceUV(u + d,     v + d, d, h), // Right (+X)
                ...createFaceUV(u,         v + d, d, h), // Left (-X)
                ...createFaceUV(u + d,     v,     w, d), // Top (+Y)
                ...createFaceUV(u + d + w, v,     w, d), // Bottom (-Y)
                ...createFaceUV(u + d,     v + d, w, h), // Front (+Z) 
                ...createFaceUV(u + d + w, v + d, w, h)  // Back (-Z)  
            ];
        } else {
            // --- Invalid or Missing UV data --- 
            uvCalculationMethod = "Error/Missing";
            console.error(`    [UV Mapping] Invalid or missing UV data format for cube. Applying default (0,0) UVs. UV Data:`, cube.uv);
            for (let i = 0; i < 6; i++) {
                uvCoords.push(...createFaceUV(0, 0, 0, 0));
            }
        }

        // Log the calculated UV coordinates before applying
        console.log(`      [UV Mapping] Calculated Coords (method: ${uvCalculationMethod}, length ${uvCoords.length}):`);
        uvCoords.forEach((vec, index) => {
            if (index % 4 === 0) { 
                console.log(`        Face ${Math.floor(index / 4)} Start (BL): [${vec.x.toFixed(3)}, ${vec.y.toFixed(3)}]`);
            }
        });

        // Assign UVs to geometry attribute
        if (uvCoords.length === uvAttribute.count) {
            for (let i = 0; i < uvCoords.length; i++) {
                uvAttribute.setXY(i, uvCoords[i].x, uvCoords[i].y);
            }
            uvAttribute.needsUpdate = true;
        } else {
            console.error(`    [UV Mapping] Mismatch between calculated UV coords (${uvCoords.length}) and geometry attribute count (${uvAttribute.count}). Skipping UV update.`);
        }
    }
    
    // Center the model in the scene
    function centerModel() {
        if (!modelGroup || modelGroup.children.length === 0) {
            console.warn("[GeoJsonRenderer] Cannot center model: Group is null or empty.");
            return;
        }
        
        try {
            const box = new THREE.Box3().setFromObject(modelGroup, true); // true = precise bounds
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            
            if (!isFinite(center.x) || !isFinite(center.y) || !isFinite(center.z)) {
                console.error("[GeoJsonRenderer] Calculated center is not finite. Skipping centering.", center, modelGroup);
                errorMessage = "Failed to calculate model center.";
                return;
            }
            
            console.log(`[GeoJsonRenderer] Centering model. Original center: [${center.x.toFixed(2)}, ${center.y.toFixed(2)}, ${center.z.toFixed(2)}], Size: [${size.x.toFixed(2)}, ${size.y.toFixed(2)}, ${size.z.toFixed(2)}]`);
            
            // Center the group
            modelGroup.position.x = -center.x;
            modelGroup.position.y = -center.y;
            modelGroup.position.z = -center.z;

            // Optional: Adjust camera distance based on model size 
            // const maxDim = Math.max(size.x, size.y, size.z);
            // if (camera && maxDim > 0 && isFinite(maxDim)) {
            //     const fitOffset = 1.5; // Adjust multiplier as needed
            //     const distance = maxDim * fitOffset / Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5));
            //     camera.position.z = Math.max(distance, controls?.minDistance ?? 10); // Ensure not too close
            //     camera.lookAt(0, 0, 0); // Look at the centered model origin
            //     if (controls) controls.target.set(0, 0, 0);
            // }

        } catch (error) {
            console.error("[GeoJsonRenderer] Error centering model:", error, modelGroup);
            errorMessage = "Error during model centering.";
        }
    }

    // Animation loop
    function animate() {
        animationFrameId = requestAnimationFrame(animate);
        
        if (!scene || !camera || !renderer || !controls) return;
        
        // Update controls
        controls.update();
        
        // Render scene
        renderer.render(scene, camera);
    }

    // Effect to update autoRotate when prop changes
    $effect(() => {
        if (controls) {
            controls.autoRotate = autoRotate;
        }
    });

    // Effect to update when URLs change
    $effect(() => {
        const geoJsonChanged = geoJsonUrl !== currentGeoJsonUrl;
        const textureChanged = textureUrl !== currentTextureUrl;
        
        if (scene && (geoJsonChanged || textureChanged)) {
            console.log(`[GeoJsonRenderer] URLs changed, reloading model`);
            loadModelAndTexture();
        }
    });
</script>

<div class="geo-renderer-container" style="width: {width}px; height: {height}px;">
    {#if errorMessage}
        <div class="error-message">⚠️ {errorMessage}</div>
    {:else}
        <canvas 
            bind:this={canvasElement} 
            width={width} 
            height={height} 
            class="geo-canvas" 
            class:loading={isLoading}
            title="Minecraft Model View"
        ></canvas>
        
        {#if isLoading}
            <div class="loading-indicator">Loading...</div>
        {/if}
    {/if}
</div>

<style>
    .geo-renderer-container {
        position: relative;
        display: inline-block;
        vertical-align: middle;
        background-color: #f0f0f0;
        border-radius: 4px;
        overflow: hidden;
    }

    .geo-canvas {
        display: block;
        width: 100%;
        height: 100%;
    }

    .geo-canvas.loading {
        opacity: 0.5;
    }
    
    .error-message {
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        text-align: center;
        font-size: 0.9em;
        color: #e74c3c;
        background-color: #fbeae8;
        border: 1px solid #e74c3c;
        box-sizing: border-box; 
        padding: 10px;
    }

    .loading-indicator {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 8px 16px;
        border-radius: 4px;
        font-size: 0.9em;
    }
</style> 