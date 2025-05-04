"use client";

import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { TabHeader } from "../ui/TabHeader";
import { TabContent } from "../ui/TabContent";
import type { 
    MinecraftProfile, 
    TexturesData, 
} from "../../types/minecraft"; // Use relative path
import type { 
    MinecraftSkin, 
    SkinVariant 
} from "../../types/localSkin"; // Assuming types are here, use relative path
import { useMinecraftAuthStore } from "../../store/minecraft-auth-store"; // Use relative path
import { MinecraftSkinService } from "../../services/minecraft-skin-service"; // Import the new service

export function SkinsTab() {
    // Use the actual store state
    const { 
        activeAccount, 
        isLoading: accountLoading, 
        error: accountError, 
        initializeAccounts // Assuming initializeAccounts might be needed if not called elsewhere
    } = useMinecraftAuthStore();

    const [skinData, setSkinData] = useState<MinecraftProfile | null>(null);
    const [skinUrl, setSkinUrl] = useState<string | null>(null);
    const [skinModel, setSkinModel] = useState<string | null>(null);
    const [skinVariant, setSkinVariant] = useState<SkinVariant>("classic");
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const [localSkins, setLocalSkins] = useState<MinecraftSkin[]>([]);
    const [localSkinsLoading, setLocalSkinsLoading] = useState<boolean>(false);
    const [localSkinsError, setLocalSkinsError] = useState<string | null>(null);
    const [selectedLocalSkin, setSelectedLocalSkin] = useState<MinecraftSkin | null>(null);

    const [editingSkin, setEditingSkin] = useState<MinecraftSkin | null>(null);
    const [editSkinName, setEditSkinName] = useState<string>("");
    const [editSkinVariant, setEditSkinVariant] = useState<SkinVariant>("classic");

    const clearMessages = () => {
        setError(null);
        setSuccessMessage(null);
        setLocalSkinsError(null);
    };

    const loadSkinData = useCallback(async () => {
        if (!activeAccount) return;

        setLoading(true);
        clearMessages();

        try {
            // Use the service method
            const data = await MinecraftSkinService.getUserSkinData(activeAccount.id, activeAccount.access_token);

            setSkinData(data);

            if (data?.properties) {
                const texturesProp = data.properties.find((prop: { name: string; value: string }) => prop.name === "textures");
                if (texturesProp) {
                    try {
                        const decodedValue = atob(texturesProp.value);
                        const texturesJson = JSON.parse(decodedValue) as TexturesData;
                        const skinInfo = texturesJson.textures?.SKIN;
                        
                        setSkinUrl(skinInfo?.url || null);
                        const model = skinInfo?.metadata?.model || null;
                        setSkinModel(model);
                        setSkinVariant(model === "slim" ? "slim" : "classic");

                    } catch (e) {
                        console.error("Error parsing skin textures:", e);
                        setError("Failed to parse skin details.");
                    }
                } else {
                    setSkinUrl(null); // No textures property means default skin
                    setSkinModel(null);
                    setSkinVariant("classic");
                }
            } else {
                 setSkinUrl(null); // No properties means default skin
                 setSkinModel(null);
                 setSkinVariant("classic");
            }
        } catch (err) {
            console.error("Error loading skin data:", err);
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(false);
        }
    }, [activeAccount]);

    const loadLocalSkins = useCallback(async () => {
        setLocalSkinsLoading(true);
        clearMessages();
        try {
            // Use the service method
            const skins = await MinecraftSkinService.getAllSkins();
            setLocalSkins(skins);
            console.log(`Loaded ${skins.length} local skins`);
        } catch (err) {
            console.error("Error loading local skins:", err);
            setLocalSkinsError(err instanceof Error ? err.message : String(err));
        } finally {
            setLocalSkinsLoading(false);
        }
    }, []);

    useEffect(() => {
        // Load skin data when account is available or changes
        if (activeAccount) {
            loadSkinData();
        } else {
            setSkinData(null);
            setSkinUrl(null);
            setSkinModel(null);
        }
        // Load local skins on mount regardless of account status
        loadLocalSkins();
        // Initialize accounts from store if not already done
        // Consider if this initialization should happen globally instead
        if(!activeAccount && !accountLoading) {
             initializeAccounts();
        }
    }, [activeAccount, loadSkinData, loadLocalSkins, initializeAccounts, accountLoading]);

    const handleUploadSkin = async () => {
        if (!activeAccount) return;

        setLoading(true);
        clearMessages();

        try {
            // Use the service method
            await MinecraftSkinService.uploadSkin(activeAccount.id, activeAccount.access_token, skinVariant);

            setSuccessMessage("Skin updated successfully and added to your local library!");
            await loadSkinData(); // Reload current skin
            await loadLocalSkins(); // Reload library
        } catch (err) {
            console.error("Error uploading skin:", err);
            let message = err instanceof Error ? err.message : String(err);
            if (message.includes("No skin file selected")) {
                message = "Please select a valid PNG skin file to upload.";
            } else if (message.includes("access_token")) {
                message = "Authentication error. Please try logging out and back in.";
            }
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const handleResetSkin = async () => {
        if (!activeAccount) return;
        if (!window.confirm("Are you sure you want to reset your skin to the default?")) {
            return;
        }

        setLoading(true);
        clearMessages();

        try {
            // Use the service method
            await MinecraftSkinService.resetSkin(activeAccount.id, activeAccount.access_token);

            setSuccessMessage("Skin reset to default!");
            await loadSkinData(); // Reload to show default skin
        } catch (err) {
            console.error("Error resetting skin:", err);
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(false);
        }
    };

    const applyLocalSkin = async (skin: MinecraftSkin) => {
        if (!activeAccount) {
            setError("You must be logged in to apply a skin");
            return;
        }

        setLoading(true);
        clearMessages();
        setSelectedLocalSkin(skin);

        try {
            // Use the service method
            await MinecraftSkinService.applySkinFromBase64(
                activeAccount.id, 
                activeAccount.access_token, 
                skin.base64_data, 
                skin.variant
            );

            setSuccessMessage(`Successfully applied skin: ${skin.name} (${skin.variant} model)`);
            setSkinVariant(skin.variant); // Update the radio buttons
            await loadSkinData(); // Reload current skin display
        } catch (err) {
            console.error("Error applying local skin:", err);
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(false);
        }
    };
    
    const startEditSkin = (skin: MinecraftSkin, event: React.MouseEvent) => {
        event.stopPropagation(); // Prevent triggering applyLocalSkin
        setEditingSkin(skin);
        setEditSkinName(skin.name);
        setEditSkinVariant(skin.variant);
    };

    const cancelEditSkin = () => {
        setEditingSkin(null);
        clearMessages(); // Clear any errors from potential failed saves
    };

    const saveEditSkin = async () => {
        if (!editingSkin) return;

        setLocalSkinsLoading(true); // Use local skins loading state for this operation
        clearMessages();

        try {
            // Use the service method
            const updatedSkin = await MinecraftSkinService.updateSkinProperties(
                editingSkin.id, 
                editSkinName, 
                editSkinVariant
            );

            if (updatedSkin) {
                setSuccessMessage(`Successfully updated skin: ${updatedSkin.name}`);
                setLocalSkins(prevSkins => 
                    prevSkins.map(s => s.id === updatedSkin.id ? updatedSkin : s)
                );
                if (selectedLocalSkin?.id === updatedSkin.id) {
                    setSelectedLocalSkin(updatedSkin);
                }
                setEditingSkin(null); // Exit edit mode on success
            } else {
                 setLocalSkinsError("Skin not found. It may have been deleted.");
                 setEditingSkin(null); // Also exit edit mode if skin disappeared
            }
        } catch (err) {
            console.error("Error updating skin properties:", err);
             setLocalSkinsError(err instanceof Error ? err.message : String(err));
            // Keep edit mode open on error so user can retry or cancel
        } finally {
            setLocalSkinsLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <TabHeader title="Skins" icon="pixel:user-solid" />
            <TabContent>
                <div className="p-4 space-y-6 overflow-y-auto text-sm">
                    {accountLoading ? (
                        <p className="text-gray-500 italic">Loading account data...</p>
                    ) : accountError ? (
                        <p className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                            Account Error: {accountError}
                        </p>
                    ) : !activeAccount ? (
                        <p className="text-gray-500 italic">
                            Please log in to a Minecraft account to manage skins.
                        </p>
                    ) : (
                        <>
                            {/* Current Skin Section */}
                            <div className="border border-gray-300 rounded p-4 bg-gray-50 space-y-4">
                                <h3 className="text-base font-semibold mb-3">
                                    Current Skin: {activeAccount.minecraft_username || activeAccount.username}
                                </h3>
                                {loading && !skinUrl && <p className="text-gray-500 italic">Loading skin data...</p>}
                                {error && <p className="p-3 mb-4 bg-red-100 border border-red-400 text-red-700 rounded">{error}</p>}
                                
                                <div className="flex gap-4 items-start">
                                    {/* Skin Preview */}
                                    <div className="flex-shrink-0 border border-gray-200 p-2 rounded bg-white w-36 text-center">
                                        {skinUrl ? (
                                            <>
                                                <img 
                                                    src={skinUrl} 
                                                    alt="Minecraft Skin" 
                                                    className="w-32 h-32 mx-auto image-pixelated bg-gray-200"
                                                />
                                                <p className="text-xs text-gray-600 mt-2">
                                                    Model: {skinModel === 'slim' ? 'Slim (Alex)' : 'Classic (Steve)'}
                                                </p>
                                            </>
                                        ) : (
                                            <div className="w-32 h-32 mx-auto flex items-center justify-center text-center bg-gray-200 text-gray-500 text-xs">
                                                Default Steve/Alex skin
                                            </div>
                                        )}
                                    </div>

                                    {/* Skin Controls */}
                                    <div className="flex-grow space-y-4">
                                        <div>
                                            <h4 className="font-medium mb-2">Choose skin model:</h4>
                                            <div className="space-y-1">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input 
                                                        type="radio" 
                                                        name="skinVariant" 
                                                        value="classic" 
                                                        checked={skinVariant === 'classic'}
                                                        onChange={() => setSkinVariant('classic')}
                                                        disabled={loading}
                                                        className="form-radio h-4 w-4 text-blue-600"
                                                    />
                                                    Classic (Steve)
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input 
                                                        type="radio" 
                                                        name="skinVariant" 
                                                        value="slim" 
                                                        checked={skinVariant === 'slim'}
                                                        onChange={() => setSkinVariant('slim')}
                                                        disabled={loading}
                                                         className="form-radio h-4 w-4 text-blue-600"
                                                    />
                                                    Slim (Alex)
                                                </label>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 flex-wrap">
                                            {/* Basic HTML button, replace with Button component if available */}
                                            <button 
                                                onClick={handleUploadSkin} 
                                                disabled={loading} 
                                                className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                            >
                                                Upload New Skin
                                            </button>
                                            <button 
                                                onClick={handleResetSkin} 
                                                disabled={loading} 
                                                className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                            >
                                                Reset to Default
                                            </button>
                                        </div>
                                        {successMessage && <p className="mt-3 p-3 bg-green-100 border border-green-400 text-green-700 rounded">{successMessage}</p>}
                                    </div>
                                </div>
                            </div>

                             {/* Local Skins Section */}
                             <div className="border-t border-gray-300 pt-6 space-y-4">
                                <h3 className="text-base font-semibold">Local Skin Library</h3>

                                {localSkinsLoading && !editingSkin && <p className="text-gray-500 italic">Loading local skins...</p>}
                                {localSkinsError && <p className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">{localSkinsError}</p>}
                                {!localSkinsLoading && localSkins.length === 0 && !localSkinsError && (
                                    <p className="text-gray-500 italic">
                                        No local skins found. Upload skins to add them to your library.
                                    </p>
                                )}

                                {editingSkin ? (
                                    // Edit Form
                                    <div className="p-4 border border-gray-300 rounded bg-gray-100 space-y-4">
                                        <h4 className="font-medium">Edit Skin Properties</h4>
                                         {localSkinsError && <p className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">{localSkinsError}</p>} {/* Show error within form */}
                                        <div className="space-y-1">
                                            <label htmlFor="editSkinName" className="block font-medium">Skin Name:</label>
                                            <input 
                                                type="text" 
                                                id="editSkinName" 
                                                value={editSkinName} 
                                                onChange={(e) => setEditSkinName(e.target.value)}
                                                placeholder="Enter skin name"
                                                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                                                disabled={localSkinsLoading}
                                            />
                                        </div>
                                         <div>
                                            <h4 className="font-medium mb-2">Skin Variant:</h4>
                                            <div className="space-y-1">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input 
                                                        type="radio" 
                                                        name="editSkinVariant" 
                                                        value="classic" 
                                                        checked={editSkinVariant === 'classic'}
                                                        onChange={() => setEditSkinVariant('classic')}
                                                        disabled={localSkinsLoading}
                                                        className="form-radio h-4 w-4 text-blue-600"
                                                    />
                                                    Classic (Steve)
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input 
                                                        type="radio" 
                                                        name="editSkinVariant" 
                                                        value="slim" 
                                                        checked={editSkinVariant === 'slim'}
                                                        onChange={() => setEditSkinVariant('slim')}
                                                        disabled={localSkinsLoading}
                                                         className="form-radio h-4 w-4 text-blue-600"
                                                    />
                                                    Slim (Alex)
                                                </label>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={saveEditSkin} 
                                                disabled={localSkinsLoading}
                                                className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
                                            >
                                                {localSkinsLoading ? 'Saving...' : 'Save Changes'}
                                            </button>
                                             <button 
                                                onClick={cancelEditSkin} 
                                                disabled={localSkinsLoading}
                                                className="px-3 py-1.5 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:bg-gray-400"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    // Skins Grid
                                    localSkins.length > 0 && (
                                        <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-3">
                                            {localSkins.map((skin) => (
                                                <div 
                                                    key={skin.id}
                                                    className={`relative group border-2 rounded p-2 cursor-pointer transition-all bg-white hover:border-blue-500 hover:shadow-md ${selectedLocalSkin?.id === skin.id ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}
                                                    onClick={() => !loading && !localSkinsLoading && applyLocalSkin(skin)} // Prevent click during operations
                                                    title={`Apply ${skin.name}`}
                                                >
                                                     <button 
                                                        className="absolute top-1 right-1 z-10 p-1 bg-gray-600 bg-opacity-70 text-white rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-opacity-90"
                                                        onClick={(e) => startEditSkin(skin, e)}
                                                        title="Edit skin properties"
                                                        disabled={loading || localSkinsLoading}
                                                    >
                                                        Edit {/* Consider using an icon */}
                                                    </button>
                                                    <div className="mb-1.5">
                                                        <img 
                                                            src={`data:image/png;base64,${skin.base64_data}`} 
                                                            alt={skin.name} 
                                                            className="w-16 h-16 mx-auto image-pixelated bg-gray-200" 
                                                        />
                                                    </div>
                                                    <div className="text-center text-xs">
                                                        <p className="font-medium truncate" title={skin.name}>{skin.name}</p>
                                                        <p className="text-gray-500">
                                                            {skin.variant === 'slim' ? 'Slim' : 'Classic'}
                                                        </p>
                                                    </div>
                                                    {(loading || localSkinsLoading) && selectedLocalSkin?.id === skin.id && (
                                                        <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center">
                                                            <span className="text-xs text-gray-600">Applying...</span> {/* Add spinner? */}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )
                                )}
                            </div>
                        </>
                    )}
                </div>
            </TabContent>
        </div>
    );
}