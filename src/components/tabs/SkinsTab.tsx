"use client";

import React, {useState, useEffect, useCallback, useMemo, memo} from "react";
import {TabHeader} from "../ui/TabHeader";
import {TabContent} from "../ui/TabContent";
import type {
	MinecraftProfile,
	TexturesData,
} from "../../types/minecraft";
import type {
	MinecraftSkin,
	SkinVariant,
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
import {toast} from "react-hot-toast";

const SkinPreview = memo(({
														skin,
														skinUrl,
														index,
														loading,
														localSkinsLoading,
														selectedLocalSkin,
														onClick,
														onEditSkin,
														onDeleteSkin
													}: {
	skin: MinecraftSkin,
	skinUrl?: string,
	index: number,
	loading: boolean,
	localSkinsLoading: boolean,
	selectedLocalSkin: MinecraftSkin | null,
	onClick: (skin: MinecraftSkin) => void,
	onEditSkin?: (skin: MinecraftSkin, event: React.MouseEvent<HTMLButtonElement>) => void,
	onDeleteSkin?: (skinId: string, skinName: string, event: React.MouseEvent<HTMLButtonElement>) => void
}) => {
	const accentColor = useThemeStore((state) => state.accentColor);

	return (
		<div
			key={skin.id}
			className={
				`relative group bg-black/20 border-white/20 backdrop-blur-md border-2 rounded-lg p-4 pt-1 pb-2 transition-all 
				duration-200 cursor-pointer hover:border-white/40 hover:bg-black/30 flex-col text-center animate-slide-up-fade-in
				${(loading || localSkinsLoading) && selectedLocalSkin?.id === skin.id ? 'opacity-60 pointer-events-none' : ''}`
			}
			style={{
				animationDelay: `${index * 0.075}s`,
				borderColor: selectedLocalSkin?.id === skin.id ? `${accentColor.value}80` : undefined,
				backgroundColor: selectedLocalSkin?.id === skin.id ? `${accentColor.value}10` : undefined,
			}}
			onClick={() => !loading && !localSkinsLoading && onClick(skin)}
		>
			{
				onEditSkin &&
				<button
					className="absolute bottom-1.5 right-1.5 z-10 p-1.5 text-white/70 rounded
					opacity-0 group-hover:opacity-100 transition-opacity hover:text-white
					disabled:opacity-50 disabled:pointer-events-none"
					onClick={(event) => {
						event.stopPropagation();
						onEditSkin(skin, event);
					}}
					title="Edit skin properties"
					disabled={loading || localSkinsLoading}
				>
					<Icon icon="pixel:edit-solid" className="w-4 h-4"/>
				</button>
			}

			<p className="font-minecraft text-white lowercase truncate text-3xl" title={skin.name}>
				{skin.name}
			</p>

			<div className="h-64 flex relative pt-2 pb-2">
				<SkinViewer
					skinUrl={skinUrl ? skinUrl : `data:image/png;base64,${skin.base64_data}`}
					width={130}
					height={260}
					className="mx-auto"
					enableZoom={false}
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

			{onDeleteSkin && skin.id !== "add-skin" && (
				<button
					className="absolute top-1.5 right-1.5 z-10 p-1.5 text-white/70 rounded
					opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500
					disabled:opacity-50 disabled:pointer-events-none"
					onClick={(event) => {
						event.stopPropagation();
						onDeleteSkin(skin.id, skin.name, event);
					}}
					title="Delete skin"
					disabled={loading || localSkinsLoading}
				>
					<Icon icon="mdi:trash-can-outline" className="w-4 h-4" /> {/* Assuming mdi:trash-can-outline is the chosen icon */}
				</button>
			)}
		</div>
	);
});

const EditSkinModal = memo(({
	skin,
	cancel,
	saveSkin,
	addSkin,
	localSkinsLoading
}: {
	skin?: MinecraftSkin
	cancel: () => void,
	saveSkin: (skin: MinecraftSkin) => Promise<void>,
	addSkin: (skinInput: string, targetName: string, targetVariant: SkinVariant, description?: string | null) => Promise<void>,
	localSkinsLoading: boolean,
}) => {
	const [name, setName] = useState<string>(skin?.name ?? "");
	const [variant, setVariant] = useState<SkinVariant>(skin?.variant ?? "classic");
	const [skinFile, setSkinFile] = useState<File | null>(null);
	const [skinInput, setskinInput] = useState<string>("");

	const finishEditingSkin = async () => {
		if (skin) {
			await saveSkin({
				...skin,
				name,
				variant,
			});
		} else {
			if (!name.trim()) {
				toast.error("Skin Name cannot be empty.");
				return;
			}
			if (!skinInput.trim()) {
				toast.error("Skin source (Username, UUID, or URL) cannot be empty.");
				return;
			}

			await addSkin(skinInput, name, variant, null);
		}
	};

	return (
		<Modal
			title={`${skin ? "Edit Skin Properties" : "Add Skin"}`}
			onClose={cancel}
			footer={
				<div className="flex gap-3 justify-center">
					<Button
						variant="default"
						onClick={finishEditingSkin}
						disabled={localSkinsLoading}
					>
						{localSkinsLoading ? 'Saving...' : 'Save Changes'}
					</Button>
					<Button
						variant="secondary"
						onClick={cancel}
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
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="Enter skin name"
						className="w-full bg-black/30 backdrop-blur-md border-2 border-white/20 px-4 py-2 text-white font-minecraft text-3xl rounded focus:border-white/50 focus:ring-0 outline-none transition duration-200"
						disabled={localSkinsLoading}
					/>
				</label>
				{!skin &&
					<div className={"flex-col w-full pt-2"}>
						<div className={"flex"}>
							<label
								className="block font-minecraft text-3xl -mt-3 text-white/80 lowercase flex-grow"
								htmlFor={"skinInputField"}
							>
								Skin
							</label>
						</div>
						<div className={"flex space-x-4"}>
							<input
								id={"skinInputField"}
								type="text"
								value={skinInput}
								onChange={(e) => setskinInput(e.target.value)}
								placeholder="Copy by username, UUID or download from URL"
								className="w-full bg-black/30 backdrop-blur-md border-2 border-white/20 px-4 py-2 text-white font-minecraft text-3xl rounded focus:border-white/50 focus:ring-0 outline-none transition duration-200"
								disabled={localSkinsLoading}
							/>
							<button
								className="p-4 aspect-square bg-black/30 hover:bg-black/60 backdrop-blur-md border-2 border-white/20 text-white font-minecraft text-3xl rounded focus:border-white/50 focus:ring-0 outline-none transition duration-300"
								title={"Upload Skin from file"}
							>
								<Icon
									icon="solar:folder-bold"
									className="w-4 h-4 text-white"
								/>
							</button>
						</div>
					</div>
				}
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
								checked={variant === 'classic'}
								onChange={() => setVariant('classic')}
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
								checked={variant === 'slim'}
								onChange={() => setVariant('slim')}
								disabled={localSkinsLoading}
								className="appearance-none w-5 h-5 rounded-full border-2 border-white/30 bg-black/20 checked:bg-blue-500 checked:border-blue-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black/30 focus:ring-blue-500 transition duration-200 cursor-pointer"
							/>
							Slim (Alex)
						</label>
					</div>
				</div>
			</div>
		</Modal>
	);
});

export function SkinsTab() {
	const {
		activeAccount,
		isLoading: accountLoading,
		error: accountError,
		initializeAccounts
	} = useMinecraftAuthStore();
	const [_, setSkinData] = useState<MinecraftProfile | null>(null);
	const [loading, setLoading] = useState<boolean>(false);

	const [localSkins, setLocalSkins] = useState<MinecraftSkin[]>([]);
	const [localSkinsLoading, setLocalSkinsLoading] = useState<boolean>(false);
	const [localSkinsError, setLocalSkinsError] = useState<string | null>(null);
	const [selectedLocalSkin, setSelectedLocalSkin] = useState<MinecraftSkin | null>(null);

	// Loading state specifically for the add/save operations in the modal
	const [modalLoading, setModalLoading] = useState<boolean>(false);

	const [isEditingSkin, setIsEditingSkin] = useState<boolean>(false);
	const [editingSkin, setEditingSkin] = useState<MinecraftSkin | null>(null);

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

	const startEditSkin = (skin: MinecraftSkin | null, event?: React.MouseEvent<HTMLButtonElement> | undefined) => {
		event?.stopPropagation();
		setEditingSkin(skin);
		setIsEditingSkin(true);
	};

	const cancelEditSkin = () => {
		setEditingSkin(null);
		setIsEditingSkin(false);
	};

	const saveSkin = async (skin: MinecraftSkin) => {
		if (!skin) return;
		setLocalSkinsLoading(true);

		try {
			const updatedSkin = await MinecraftSkinService.updateSkinProperties(
				skin.id,
				skin.name,
				skin.variant
			);

			if (updatedSkin) {
				toast.success(`Successfully updated skin: ${updatedSkin.name}`);
				setLocalSkins(prevSkins =>
					prevSkins.map(s => s.id === updatedSkin.id ? updatedSkin : s)
				);
				if (selectedLocalSkin?.id === updatedSkin.id) {
					setSelectedLocalSkin(updatedSkin);
				}
				setIsEditingSkin(false);
				setEditingSkin(null);
			} else {
				setLocalSkinsError("Skin not found. It may have been deleted.");
				setEditingSkin(null); // Also exit edit mode if skin disappeared
				setIsEditingSkin(false);
			}
		} catch (err) {
			console.error("Error updating skin properties:", err);
			setLocalSkinsError(err instanceof Error ? err.message : String(err));
			// Keep edit mode open on error so user can retry or cancel
		} finally {
			setLocalSkinsLoading(false);
		}
	};

	const addSkin = async (skinInput: string, targetName: string, targetVariant: SkinVariant, description?: string | null) => {
		setModalLoading(true);
		try {
			const newSkin = await MinecraftSkinService.addSkinLocally(skinInput, targetName, targetVariant, description);
			toast.success(`Successfully added skin: ${newSkin.name}`);
			setLocalSkins(prevSkins => [...prevSkins, newSkin].sort((a, b) => a.name.localeCompare(b.name)));
			setIsEditingSkin(false);
			setEditingSkin(null);
		} catch (err) {
			console.error("Error adding new skin:", err);
			const errorMessage = err instanceof Error ? err.message : String(err);
			toast.error(`Failed to add skin: ${errorMessage}`);
		} finally {
			setModalLoading(false);
		}
	}

	const handleDeleteSkin = async (skinId: string, skinName: string) => {
		const deletePromise = async () => {
			const removed = await MinecraftSkinService.removeSkin(skinId);
			if (!removed) {
				// Throw an error if not removed so toast.promise catches it in the error state
				throw new Error(`Skin "${skinName}" could not be found or was already deleted.`);
			}
			return removed; // Or simply return void/true, the data isn't strictly used by success message here
		};

		toast.promise(
			deletePromise(),
			{
				loading: `Deleting skin "${skinName}"...`,
				success: (data) => { // data here would be the return value of deletePromise if successful
					setLocalSkins(prevSkins => prevSkins.filter(s => s.id !== skinId));
					if (selectedLocalSkin?.id === skinId) {
						setSelectedLocalSkin(null);
					}
					return `Successfully deleted skin: ${skinName}`;
				},
				error: (err) => {
					console.error("Error deleting skin:", err);
					return err instanceof Error ? err.message : String(err.message);
				}
			},
			{
				success: {
					duration: 4000,
				},
				error: {
					duration: 5000,
				}
			}
		);

		// No need to manage modalLoading here as toast.promise handles its own lifecycle.
		// However, if other elements should be disabled, modalLoading might still be useful.
		// For now, let's assume the toast's visual feedback is sufficient.
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

	return (
		<div className="h-full flex flex-col overflow-hidden">
			<TabHeader title="Skins" icon="pixel:user-solid" className={"flex-row"}>
				<SearchInput
					value={search}
					onChange={setSearch}
					className="text-2xl"
				/>
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
										<div className="space-y-5 text-center">
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
													<SkinPreview
														key={skin.id}
														skin={skin}
														index={index}
														loading={loading}
														localSkinsLoading={localSkinsLoading}
														selectedLocalSkin={selectedLocalSkin}
														onClick={applyLocalSkin}
														onEditSkin={startEditSkin}
														onDeleteSkin={handleDeleteSkin}
													/>
												))}
												<SkinPreview
													skin={{
														id: "add-skin",
														name: "Add New Skin",
														base64_data: "",
														variant: "classic",
													} as MinecraftSkin}
													skinUrl={"/skins/add_skin.png"}
													index={filteredSkins.length + 1}
													loading={loading}
													localSkinsLoading={localSkinsLoading}
													selectedLocalSkin={selectedLocalSkin}
													onClick={() => startEditSkin(null, undefined)}
												/>
											</div>
										</div>
									</>
								)}
				</div>
			</TabContent>

			{isEditingSkin && (
				<EditSkinModal
					skin={editingSkin}
					cancel={cancelEditSkin}
					saveSkin={saveSkin}
					addSkin={addSkin}
					localSkinsLoading={modalLoading}
				/>
			)}
		</div>
	);
}
