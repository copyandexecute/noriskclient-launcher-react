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
import { Button } from "../ui/Button"; // Assuming Button component exists
import { Icon } from "@iconify/react"; // For icons in buttons
import { StatusMessage } from "../ui/StatusMessage"; // Assuming StatusMessage component exists for errors/success

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
                <div className="p-5 space-y-8 overflow-y-auto flex-grow scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                    {accountLoading ? (
                        <p className="text-white/70 italic font-minecraft text-xl text-center py-10">
                            Loading account data...
                        </p>
                    ) : accountError ? (
                         <StatusMessage 
                            type="error" 
                            className="font-minecraft text-lg" 
                            message={`Account Error: ${accountError}`}
                         />
                    ) : !activeAccount ? (
                        <p className="text-white/70 italic font-minecraft text-xl text-center py-10">
                            Please log in to a Minecraft account to manage skins.
                        </p>
                    ) : (
                        <>
                            {/* Current Skin Section - Styled container */} 
                            <div className="bg-black/20 backdrop-blur-md border-2 border-white/10 rounded-lg p-5 space-y-5">
                                <h3 className="font-minecraft text-2xl text-white mb-1 lowercase">
                                    Current Skin: {activeAccount.minecraft_username || activeAccount.username}
                                </h3>
                                {loading && !skinUrl && (
                                    <p className="text-white/70 italic font-minecraft text-lg">Loading skin data...</p>
                                )}
                                {error && (
                                    <StatusMessage 
                                        type="error" 
                                        className="font-minecraft text-lg" 
                                        message={error}
                                    />
                                )}
                                
                                <div className="flex flex-col md:flex-row gap-6 items-start">
                                    {/* Skin Preview - Styled */} 
                                    <div className="flex-shrink-0 border-2 border-white/10 p-2 rounded bg-black/10 w-40 text-center mx-auto md:mx-0">
                                        {skinUrl ? (
                                            <>
                                                <img 
                                                    src={skinUrl} 
                                                    alt="Minecraft Skin" 
                                                    className="w-36 h-36 mx-auto image-pixelated bg-black/20 rounded-sm"
                                                />
                                                <p className="text-sm text-white/60 mt-2 font-minecraft lowercase">
                                                    Model: {skinModel === 'slim' ? 'Slim (Alex)' : 'Classic (Steve)'}
                                                </p>
                                            </>
                                        ) : (
                                            <div className="w-36 h-36 mx-auto flex items-center justify-center text-center bg-black/20 text-white/50 text-sm font-minecraft rounded-sm lowercase">
                                                Default Steve/Alex skin
                                            </div>
                                        )}
                                    </div>

                                    {/* Skin Controls - Styled */} 
                                    <div className="flex-grow space-y-5 w-full">
                                        <div>
                                            <h4 className="font-minecraft text-xl text-white mb-3 lowercase">Choose skin model:</h4>
                                            <div className="space-y-2">
                                                <label className="flex items-center gap-3 cursor-pointer font-minecraft text-lg text-white lowercase">
                                                    <input 
                                                        type="radio" 
                                                        name="skinVariant" 
                                                        value="classic" 
                                                        checked={skinVariant === 'classic'}
                                                        onChange={() => setSkinVariant('classic')}
                                                        disabled={loading}
                                                        className="appearance-none w-5 h-5 rounded-full border-2 border-white/30 bg-black/20 checked:bg-blue-500 checked:border-blue-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black/30 focus:ring-blue-500 transition duration-200 cursor-pointer"
                                                    />
                                                    Classic (Steve)
                                                </label>
                                                <label className="flex items-center gap-3 cursor-pointer font-minecraft text-lg text-white lowercase">
                                                    <input 
                                                        type="radio" 
                                                        name="skinVariant" 
                                                        value="slim" 
                                                        checked={skinVariant === 'slim'}
                                                        onChange={() => setSkinVariant('slim')}
                                                        disabled={loading}
                                                        className="appearance-none w-5 h-5 rounded-full border-2 border-white/30 bg-black/20 checked:bg-blue-500 checked:border-blue-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black/30 focus:ring-blue-500 transition duration-200 cursor-pointer"
                                                    />
                                                    Slim (Alex)
                                                </label>
                                            </div>
                                        </div>

                                        <div className="flex gap-3 flex-wrap">
                                            {/* Use Button component */} 
                                            <Button 
                                                variant="primary"
                                                onClick={handleUploadSkin} 
                                                disabled={loading} 
                                                className="text-lg py-2 px-5 font-minecraft lowercase"
                                                icon={<Icon icon="pixel:upload-solid" className="w-5 h-5" />}
                                            >
                                                Upload New Skin
                                            </Button>
                                            <Button 
                                                variant="danger"
                                                onClick={handleResetSkin} 
                                                disabled={loading} 
                                                className="text-lg py-2 px-5 font-minecraft lowercase"
                                                icon={<Icon icon="pixel:refresh-solid" className="w-5 h-5" />}
                                            >
                                                Reset to Default
                                            </Button>
                                        </div>
                                         {successMessage && (
                                            <StatusMessage 
                                                type="success" 
                                                className="font-minecraft text-lg" 
                                                message={successMessage}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>

                             {/* Local Skins Section - Styled */} 
                             <div className="space-y-5">
                                <h3 className="font-minecraft text-2xl text-white lowercase">Local Skin Library</h3>

                                {localSkinsLoading && !editingSkin && (
                                     <p className="text-white/70 italic font-minecraft text-lg">Loading local skins...</p>
                                )}
                                {localSkinsError && !editingSkin && (
                                     <StatusMessage 
                                        type="error" 
                                        className="font-minecraft text-lg" 
                                        message={localSkinsError}
                                     />
                                )}
                                {!localSkinsLoading && localSkins.length === 0 && !localSkinsError && !editingSkin && (
                                    <p className="text-white/70 italic font-minecraft text-lg">
                                        No local skins found. Upload skins to add them to your library.
                                    </p>
                                )}

                                {editingSkin ? (
                                    // Edit Form - Styled 
                                    <div className="bg-black/20 backdrop-blur-md border-2 border-white/10 rounded-lg p-5 space-y-5">
                                        <h4 className="font-minecraft text-xl text-white lowercase">Edit Skin Properties</h4>
                                         {localSkinsError && (
                                             <StatusMessage 
                                                type="error" 
                                                className="font-minecraft text-lg" 
                                                message={localSkinsError}
                                             />
                                         )} 
                                        <div className="space-y-2">
                                            <label htmlFor="editSkinName" className="block font-minecraft text-lg text-white/80 lowercase mb-1">Skin Name:</label>
                                            <input 
                                                type="text" 
                                                id="editSkinName" 
                                                value={editSkinName} 
                                                onChange={(e) => setEditSkinName(e.target.value)}
                                                placeholder="Enter skin name"
                                                className="w-full bg-black/30 backdrop-blur-md border-2 border-white/20 px-4 py-2 text-white font-minecraft text-lg rounded focus:border-white/50 focus:ring-0 outline-none transition duration-200"
                                                disabled={localSkinsLoading}
                                            />
                                        </div>
                                         <div>
                                            <h4 className="font-minecraft text-lg text-white/80 mb-2 lowercase">Skin Variant:</h4>
                                            <div className="space-y-2">
                                                <label className="flex items-center gap-3 cursor-pointer font-minecraft text-lg text-white lowercase">
                                                     <input 
                                                        type="radio" 
                                                        name="editSkinVariant" 
                                                        value="classic" 
                                                        checked={editSkinVariant === 'classic'}
                                                        onChange={() => setEditSkinVariant('classic')}
                                                        disabled={localSkinsLoading}
                                                        className="appearance-none w-5 h-5 rounded-full border-2 border-white/30 bg-black/20 checked:bg-blue-500 checked:border-blue-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black/30 focus:ring-blue-500 transition duration-200 cursor-pointer"
                                                    />
                                                    Classic (Steve)
                                                </label>
                                                <label className="flex items-center gap-3 cursor-pointer font-minecraft text-lg text-white lowercase">
                                                    <input 
                                                        type="radio" 
                                                        name="editSkinVariant" 
                                                        value="slim" 
                                                        checked={editSkinVariant === 'slim'}
                                                        onChange={() => setEditSkinVariant('slim')}
                                                        disabled={localSkinsLoading}
                                                        className="appearance-none w-5 h-5 rounded-full border-2 border-white/30 bg-black/20 checked:bg-blue-500 checked:border-blue-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black/30 focus:ring-blue-500 transition duration-200 cursor-pointer"
                                                    />
                                                    Slim (Alex)
                                                </label>
                                            </div>
                                        </div>
                                        <div className="flex gap-3 pt-2">
                                            <Button 
                                                variant="primary"
                                                onClick={saveEditSkin} 
                                                disabled={localSkinsLoading}
                                                className="text-lg py-2 px-5 font-minecraft lowercase"
                                            >
                                                {localSkinsLoading ? 'Saving...' : 'Save Changes'}
                                            </Button>
                                             <Button 
                                                variant="secondary" // Use secondary variant for cancel
                                                onClick={cancelEditSkin} 
                                                disabled={localSkinsLoading}
                                                className="text-lg py-2 px-5 font-minecraft lowercase"
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    // Skins Grid - Styled 
                                    localSkins.length > 0 && (
                                        <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-4">
                                            {localSkins.map((skin) => (
                                                <div 
                                                    key={skin.id}
                                                    // Apply card styling, hover effects, and selection indicator
                                                    className={`
                                                        relative group bg-black/20 backdrop-blur-md border-2 
                                                        rounded-lg p-3 transition-all duration-200 cursor-pointer 
                                                        hover:border-white/40 hover:bg-black/30 
                                                        ${selectedLocalSkin?.id === skin.id 
                                                            ? 'border-green-500/60 bg-green-900/20' 
                                                            : 'border-white/10'}
                                                        ${(loading || localSkinsLoading) && selectedLocalSkin?.id === skin.id ? 'opacity-60 pointer-events-none' : ''}
                                                    `}
                                                    onClick={() => !loading && !localSkinsLoading && applyLocalSkin(skin)} 
                                                    title={`Apply ${skin.name}`}
                                                >
                                                     {/* Edit Button - Styled */}
                                                     <button 
                                                        className="absolute top-1.5 right-1.5 z-10 p-1.5 bg-black/40 text-white/70 rounded 
                                                                   opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60 hover:text-white
                                                                   disabled:opacity-50 disabled:pointer-events-none"
                                                        onClick={(e) => startEditSkin(skin, e)}
                                                        title="Edit skin properties"
                                                        disabled={loading || localSkinsLoading}
                                                    >
                                                         <Icon icon="pixel:edit-solid" className="w-4 h-4" />
                                                    </button>
                                                     {/* Image Preview - Styled */} 
                                                    <div className="mb-2">
                                                        <img 
                                                            src={`data:image/png;base64,${skin.base64_data}`} 
                                                            alt={skin.name} 
                                                            className="w-20 h-20 mx-auto image-pixelated bg-black/20 rounded-sm border border-white/10" 
                                                        />
                                                    </div>
                                                     {/* Skin Info - Styled */}
                                                    <div className="text-center text-sm">
                                                        <p className="font-minecraft text-white lowercase truncate" title={skin.name}>{skin.name}</p>
                                                        <p className="text-white/60 font-minecraft text-xs lowercase">
                                                            {skin.variant === 'slim' ? 'Slim' : 'Classic'}
                                                        </p>
                                                    </div>
                                                     {/* Loading/Applying Overlay - Styled */}
                                                    {(loading || localSkinsLoading) && selectedLocalSkin?.id === skin.id && (
                                                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center rounded-lg">
                                                            {/* Consider adding a spinner component here */}
                                                            <span className="font-minecraft text-lg text-white lowercase animate-pulse">Applying...</span> 
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