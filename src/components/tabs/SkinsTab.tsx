"use client";

import React, {useState, useEffect, useCallback, useMemo} from "react";
import {TabHeader} from "../ui/TabHeader";
import {TabContent} from "../ui/TabContent";
import type {
	MinecraftProfile,
	TexturesData,
} from "../../types/minecraft";
import type {
	MinecraftSkin,
	SkinVariant
} from "../../types/localSkin";
import {useMinecraftAuthStore} from "../../store/minecraft-auth-store";
import {MinecraftSkinService} from "../../services/minecraft-skin-service";
import {Button} from "../ui/buttons/Button";
import {Icon} from "@iconify/react";
import {StatusMessage} from "../ui/StatusMessage";
import {SkinViewer} from "../launcher/SkinViewer";
import {Modal} from "../ui/Modal.tsx";
import {SearchInput} from "../ui/SearchInput.tsx";
import {useDebounce} from "../../hooks/useDebounce";
import {useThemeStore} from "../../store/useThemeStore.ts";
import { toast } from "react-hot-toast";

export function SkinsTab() {
	const {
		activeAccount,
		isLoading: accountLoading,
		error: accountError,
		initializeAccounts
	} = useMinecraftAuthStore();
	const accentColor = useThemeStore((state) => state.accentColor);

	const [_, setSkinData] = useState<MinecraftProfile | null>(null);
	const [loading, setLoading] = useState<boolean>(false);

	const [localSkins, setLocalSkins] = useState<MinecraftSkin[]>([]);
	const [localSkinsLoading, setLocalSkinsLoading] = useState<boolean>(false);
	const [localSkinsError, setLocalSkinsError] = useState<string | null>(null);
	const [selectedLocalSkin, setSelectedLocalSkin] = useState<MinecraftSkin | null>(null);

	const [editingSkin, setEditingSkin] = useState<MinecraftSkin | null>(null);
	const [editSkinName, setEditSkinName] = useState<string>("");
	const [editSkinVariant, setEditSkinVariant] = useState<SkinVariant>("classic");

	const [search, setSearch] = useState<string>("");
	const debouncedSearch = useDebounce(search, 250);

	const filteredSkins = useMemo(() => {
		if (!debouncedSearch.trim()) return localSkins;
		return localSkins.filter(skin =>
			skin.name.toLowerCase().includes(debouncedSearch.toLowerCase())
		);
	}, [localSkins, debouncedSearch]);

	const loadSkinData = useCallback(async () => {
		if (!activeAccount) return;

		setLoading(true);

		try {
			const data = await MinecraftSkinService.getUserSkinData(activeAccount.id, activeAccount.access_token);
			setSkinData(data);

			if (data?.properties) {
				const texturesProp = data.properties.find((prop: { name: string; value: string }) => prop.name === "textures");

				if (texturesProp) {
					try {
						const decodedValue = atob(texturesProp.value);
						const texturesJson = JSON.parse(decodedValue) as TexturesData;
						const skinInfo = texturesJson.textures?.SKIN;
						const model = skinInfo?.metadata?.model || null;
					} catch (e) {
						console.error("Error parsing skin textures:", e);
						toast.error("Failed to parse skin details.");
					}
				}
			}
		} catch (err) {
			console.error("Error loading skin data:", err);
			toast.error(err instanceof Error ? err.message : String(err));
		} finally {
			setLoading(false);
		}
	}, [activeAccount]);

	const loadLocalSkins = useCallback(async () => {
		setLocalSkinsLoading(true);
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
		}
		// Load local skins on mount regardless of account status
		loadLocalSkins();
		// Initialize accounts from store if not already done
		// Consider if this initialization should happen globally instead
		if (!activeAccount && !accountLoading) {
			initializeAccounts();
		}
	}, [activeAccount, loadSkinData, loadLocalSkins, initializeAccounts, accountLoading]);

	const handleUploadSkin = async () => {
		if (!activeAccount) return;
		setLoading(true);

		try {
			// Use the service method
			await MinecraftSkinService.uploadSkin(activeAccount.id, activeAccount.access_token, selectedLocalSkin.variant);

			toast.success("Skin updated successfully and added to your local library!");
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
			toast.error(message);
		} finally {
			setLoading(false);
		}
	};

	const applyLocalSkin = async (skin: MinecraftSkin) => {
		if (!activeAccount) {
			toast.error("You must be logged in to apply a skin");
			return;
		}

		setLoading(true);
		setSelectedLocalSkin(skin);

		try {
			await MinecraftSkinService.applySkinFromBase64(
				activeAccount.id,
				activeAccount.access_token,
				skin.base64_data,
				skin.variant
			);

			toast.success(`Successfully applied skin: ${skin.name} (${skin.variant} model)`);
			await loadSkinData(); // Reload current skin display
		} catch (err) {
			console.error("Error applying local skin:", err);
			toast.error(err instanceof Error ? err.message : String(err));
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
	};

	const saveEditSkin = async () => {
		if (!editingSkin) return;
		setLocalSkinsLoading(true); // Use local skins loading state for this operation

		try {
			// Use the service method
			const updatedSkin = await MinecraftSkinService.updateSkinProperties(
				editingSkin.id,
				editSkinName,
				editSkinVariant
			);

			if (updatedSkin) {
				toast.success(`Successfully updated skin: ${updatedSkin.name}`);
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
			<TabHeader title="Skins" icon="pixel:user-solid" className={"flex-row"}>
				<SearchInput
					value={search}
					onChange={setSearch}
					className="w-full md:w-auto flex-grow md:flex-grow-0 text-2xl"
				/>
				<Button
					variant="default"
					onClick={handleUploadSkin}
					disabled={loading}
					className="text-lg py-2 px-5 font-minecraft lowercase justify-self-end"
					icon={<Icon icon="pixel:upload-solid" className="w-5 h-5"/>}
				>
					Upload New Skin
				</Button>
			</TabHeader>
			<TabContent>
				<div
					className="p-5 space-y-8 overflow-y-auto flex-grow scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
					{accountLoading ?
						<p className="text-white/70 italic font-minecraft text-xl text-center py-10">
							Loading account data...
						</p>
						: accountError ?
							<StatusMessage
								type="error"
								className="font-minecraft text-lg"
								message={`Account Error: ${accountError}`}
							/>
							: !activeAccount ?
								<p className="text-white/70 italic font-minecraft text-xl text-center py-10">
									Please log in to a Minecraft account to manage skins.
								</p>
								: (
									<>
										{/* Local Skins Section - Styled */}
										<div className="space-y-5">
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
											{!localSkinsLoading && localSkins.length > 0 && filteredSkins.length === 0 && !localSkinsError && !editingSkin && (
												<p className="text-white/70 italic font-minecraft text-lg">
													No skins match your search. Try a different search term.
												</p>
											)}

											<div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
												{filteredSkins.map((skin, index) => (
													<div
														key={skin.id}
														className={
															`relative group bg-black/20 backdrop-blur-md border-2 rounded-lg p-4 pt-1 pb-2 transition-all 
														duration-200 cursor-pointer border-white/20 hover:border-white/40 hover:bg-black/30 flex-col text-center animate-slide-up-fade-in
                            ${(loading || localSkinsLoading) && selectedLocalSkin?.id === skin.id ? 'opacity-60 pointer-events-none' : ''}`
														}
														style={{
															animationDelay: `${index * 0.075}s`,
															borderColor: selectedLocalSkin?.id === skin.id ? `${accentColor.value}80` : undefined,
															backgroundColor: selectedLocalSkin?.id === skin.id ? `${accentColor.value}10` : undefined,
														}}
														onClick={() => !loading && !localSkinsLoading && applyLocalSkin(skin)}
													>
														<button
															className="absolute bottom-1.5 right-1.5 z-10 p-1.5 text-white/70 rounded
																				 opacity-0 group-hover:opacity-100 transition-opacity hover:text-white
																				 disabled:opacity-50 disabled:pointer-events-none"
															onClick={(e) => startEditSkin(skin, e)}
															title="Edit skin properties"
															disabled={loading || localSkinsLoading}
														>
															<Icon icon="pixel:edit-solid" className="w-4 h-4"/>
														</button>


														<p className="font-minecraft text-white lowercase truncate text-3xl" title={skin.name}>
															{skin.name}
														</p>

														<div className="h-64 flex relative pt-2 pb-2">
															<SkinViewer
																skinUrl={`data:image/png;base64,${skin.base64_data}`}
																width={130}
																height={260}
																className="mx-auto"
															/>
														</div>

														<p className="text-white/60 font-minecraft lowercase text-2xl">
															{skin.variant === 'slim' ? 'Slim' : 'Classic'}
														</p>

														{(loading || localSkinsLoading) && selectedLocalSkin?.id === skin.id && (
															<div
																className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center rounded-lg">
																<span className="font-minecraft text-lg text-white lowercase animate-pulse">
																	Applying...
																</span>
															</div>
														)}
													</div>
												))}
												<div
													className={
														`relative group bg-black/20 backdrop-blur-md border-2 rounded-lg p-4 pt-1 pb-2 transition-all 
														duration-200 cursor-pointer border-white/60 hover:border-white/80 hover:bg-black/30 flex-col text-center animate-slide-up-fade-in
                          `}
													style={{
														animationDelay: `${(localSkins.length + 1) * 0.075}s`,
													}}
												>
												</div>
											</div>
										</div>
									</>
								)}
				</div>
			</TabContent>

			{editingSkin && (
				<Modal
					title={"Edit Skin Properties"}
					onClose={() => setEditingSkin(null)}
					footer={
						<div className="flex gap-3 justify-center">
							<Button
								variant="default"
								onClick={saveEditSkin}
								disabled={localSkinsLoading}
							>
								{localSkinsLoading ? 'Saving...' : 'Save Changes'}
							</Button>
							<Button
								variant="secondary"
								onClick={cancelEditSkin}
								disabled={localSkinsLoading}
							>
								Cancel
							</Button>
						</div>
					}
				>
					<div className="p-4 space-y-2">
						<label
							className="block font-minecraft text-3xl -mt-3 text-white/80 lowercase"
						>
							Skin Name
							<input
								type="text"
								value={editSkinName}
								onChange={(e) => setEditSkinName(e.target.value)}
								placeholder="Enter skin name"
								className="w-full bg-black/30 backdrop-blur-md border-2 border-white/20 px-4 py-2 text-white font-minecraft text-3xl rounded focus:border-white/50 focus:ring-0 outline-none transition duration-200"
								disabled={localSkinsLoading}
							/>
						</label>
						<div className={"flex"}>
							<p className="font-minecraft text-3xl text-white/80 lowercase flex-grow">
								Skin Variant
							</p>
							<div className="flex space-x-8">
								<label className="flex items-center gap-3 cursor-pointer font-minecraft text-2xl text-white lowercase">
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
								<label className="flex items-center gap-3 cursor-pointer font-minecraft text-2xl text-white lowercase">
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

					</div>
				</Modal>
			)}
		</div>
	);
}
