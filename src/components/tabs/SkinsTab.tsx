"use client";

import type React from "react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MinecraftProfile, TexturesData } from "../../types/minecraft";
import type { MinecraftSkin, SkinVariant } from "../../types/localSkin";
import { useMinecraftAuthStore } from "../../store/minecraft-auth-store";
import { MinecraftSkinService } from "../../services/minecraft-skin-service";
import { Button } from "../ui/buttons/Button";
import { IconButton } from "../ui/buttons/IconButton";
import { Icon } from "@iconify/react";
import { StatusMessage } from "../ui/StatusMessage";
import { SkinViewer } from "../launcher/SkinViewer";
import { Modal } from "../ui/Modal";
import { useDebounce } from "../../hooks/useDebounce";
import { useThemeStore } from "../../store/useThemeStore";
import { useSkinStore } from "../../store/useSkinStore";
import { toast } from "react-hot-toast";
import { open } from "@tauri-apps/plugin-dialog";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { RadioButton } from "../ui/RadioButton";
import { Skeleton } from "../ui/Skeleton";
import { SkeletonSkinCard } from "../ui/SkeletonSkinCard";
import { TabLayout } from "../ui/TabLayout";

const keyframes = `
  @keyframes fadeIn {
    from { 
      opacity: 0;
      backdrop-filter: blur(0px);
    }
    to { 
      opacity: 1;
      backdrop-filter: blur(2px);
    }
  }
  
  @keyframes slideUp {
    0% {
      opacity: 0;
      transform: translateY(8px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes glow {
    0%, 100% { 
      opacity: 1;
      text-shadow: 0 0 5px rgba(255,255,255,0.7);
    }
    50% { 
      opacity: 0.95;
      text-shadow: 0 0 20px rgba(255,255,255,0.9);
    }
  }
  
  @keyframes pulseOpacity {
    0% { opacity: 0; }
    10% { opacity: 1; }
    50% { opacity: 0.7; }
    100% { opacity: 1; }
  }
  
  @keyframes reverseSpin {
    0% { 
      opacity: 0;
      transform: rotate(360deg);
    }
    10% { opacity: 1; }
    100% { 
      opacity: 1;
      transform: rotate(0deg);
    }
  }
`;

// Add the keyframes to the document head
useEffect(() => {
  const style = document.createElement("style");
  style.textContent = keyframes;
  document.head.appendChild(style);

  return () => {
    document.head.removeChild(style);
  };
}, []);

const SkinPreview = memo(
  ({
    skin,
    skinUrl,
    index,
    loading,
    localSkinsLoading,
    selectedLocalSkin,
    isApplied,
    onClick,
    onEditSkin,
    onDeleteSkin,
  }: {
    skin: MinecraftSkin;
    skinUrl?: string;
    index: number;
    loading: boolean;
    localSkinsLoading: boolean;
    selectedLocalSkin: MinecraftSkin | null;
    isApplied?: boolean;
    onClick: (skin: MinecraftSkin) => void;
    onEditSkin?: (
      skin: MinecraftSkin,
      event: React.MouseEvent<HTMLButtonElement>,
    ) => void;
    onDeleteSkin?: (
      skinId: string,
      skinName: string,
      event: React.MouseEvent<HTMLButtonElement>,
    ) => void;
  }) => {
    const accentColor = useThemeStore((state) => state.accentColor);
    const isSelected = selectedLocalSkin?.id === skin.id;
    const isDisabled = loading && isSelected;

    return (
      <Card
        key={skin.id}
        className={`relative p-4 pt-1 pb-2 h-[380px] flex flex-col text-center group
        ${isDisabled ? "opacity-60 pointer-events-none" : ""}`}
        variant={isSelected ? "default" : "secondary"}
        onClick={() =>
          !isDisabled && !isApplied && !isSelected && onClick(skin)
        }
        withAnimation={true}
        // @ts-ignore
        style={{
          animationDelay: `${index * 0.075}s`,
        }}
      >
        <p
          className="font-minecraft text-white lowercase truncate text-3xl"
          title={skin.name}
        >
          {skin.name}
        </p>

        <div className="h-64 flex relative pt-2 pb-2 flex-grow">
          <SkinViewer
            skinUrl={
              skinUrl ? skinUrl : `data:image/png;base64,${skin.base64_data}`
            }
            width={130}
            height={260}
            className="mx-auto"
            enableZoom={false}
          />
        </div>

        <div className="flex items-center justify-between mt-auto">
          <p className="text-white/60 font-minecraft lowercase text-2xl">
            {skin.variant === "slim" ? "Slim" : "Classic"}
          </p>

          {isApplied && (
            <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm font-minecraft flex items-center">
              <Icon icon="solar:check-circle-bold" className="w-4 h-4 mr-1" />
              Applied
            </span>
          )}
        </div>

        {isDisabled && (
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex flex-col items-center justify-center rounded-lg z-20 opacity-0"
            style={{
              animation: "fadeIn 0.3s ease-out forwards",
            }}
          >
            <div className="relative w-20 h-20 mb-4">
              <div
                className="absolute inset-0 border-4 border-t-transparent border-white rounded-full opacity-0"
                style={{
                  animation:
                    "spin 1.2s linear infinite, pulseOpacity 2s ease-in-out infinite",
                  animationDelay: "0.1s",
                }}
              />
              <div
                className="absolute inset-0 border-4 border-t-transparent border-white/30 rounded-full opacity-0"
                style={{
                  animation: "reverseSpin 3s linear infinite",
                  animationDelay: "0.2s",
                }}
              />
            </div>
            <div className="flex flex-col items-center gap-1">
              <span
                className="font-minecraft text-2xl text-white opacity-0 -translate-y-2"
                style={{
                  animation:
                    "slideUp 0.4s ease-out 0.2s forwards, glow 2s ease-in-out infinite",
                  animationDelay: "0.3s",
                }}
              >
                Applying...
              </span>
              <span
                className="font-minecraft text-white/50 text-lg opacity-0 -translate-y-2"
                style={{
                  animation: "slideUp 0.4s ease-out forwards",
                  animationDelay: "0.4s",
                }}
              >
                Please wait
              </span>
            </div>
          </div>
        )}

        <div className="absolute bottom-1.5 right-1.5 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEditSkin && (
            <IconButton
              onClick={(event) => {
                event.stopPropagation();
                onEditSkin(skin, event);
              }}
              title="Edit skin properties"
              disabled={isDisabled}
              size="xs"
              variant="secondary"
              icon={<Icon icon="solar:pen-bold" className="w-4 h-4" />}
            />
          )}

          {onDeleteSkin && (
            <IconButton
              onClick={(event) => {
                event.stopPropagation();
                onDeleteSkin(skin.id, skin.name, event);
              }}
              title="Delete skin"
              disabled={isDisabled}
              size="xs"
              variant="destructive"
              icon={
                <Icon icon="solar:trash-bin-trash-bold" className="w-4 h-4" />
              }
            />
          )}
        </div>
      </Card>
    );
  },
);

const AddSkinCard = memo(
  ({ index, onClick }: { index: number; onClick: () => void }) => {
    return (
      <Card
        key={`add-skin-${index}`}
        className="relative p-4 pt-1 pb-2 h-[380px] flex flex-col text-center group cursor-pointer border-dashed"
        variant="secondary"
        onClick={onClick}
        withAnimation={true}
        // @ts-ignore
        style={{
          animationDelay: `${index * 0.075}s`,
          borderStyle: "dashed",
        }}
      >
        <p className="font-minecraft text-white lowercase truncate text-3xl">
          Add New Skin
        </p>

        <div className="h-64 flex relative pt-2 pb-2 flex-grow items-center justify-center">
          <SkinViewer
            skinUrl="/skins/add_skin.png"
            width={130}
            height={260}
            className="mx-auto opacity-70 group-hover:opacity-100 transition-opacity"
            enableZoom={false}
          />
        </div>

        <p className="text-white/60 font-minecraft lowercase text-2xl mt-auto">
          Upload or import a skin
        </p>
      </Card>
    );
  },
);

const EditSkinModal = memo(
  ({
    skin,
    cancel,
    saveSkin,
    addSkin,
    localSkinsLoading,
  }: {
    skin?: MinecraftSkin;
    cancel: () => void;
    saveSkin: (skin: MinecraftSkin) => Promise<void>;
    addSkin: (
      skinInput: string,
      targetName: string,
      targetVariant: SkinVariant,
      description?: string | null,
    ) => Promise<void>;
    localSkinsLoading: boolean;
  }) => {
    const [name, setName] = useState<string>(skin?.name ?? "");
    const [variant, setVariant] = useState<SkinVariant>(
      skin?.variant ?? "classic",
    );
    const [skinInput, setSkinInput] = useState<string>("");
    const accentColor = useThemeStore((state) => state.accentColor);

    const handleOpenFileUpload = async () => {
      try {
        const selectedFile = await open({
          multiple: false,
          directory: false,
          filters: [
            {
              name: "Skin Image",
              extensions: ["png"],
            },
          ],
          title: "Select Skin File (.png)",
        });

        if (typeof selectedFile === "string") {
          setSkinInput(selectedFile);
          toast.success("File selected: " + selectedFile.split(/[\\/]/).pop());
        } else if (selectedFile === null) {
          console.log("User cancelled file selection.");
        }
      } catch (error) {
        console.error("Error opening file dialog:", error);
        toast.error(
          "Failed to open file dialog. Ensure Tauri dialog plugin is configured.",
        );
      }
    };

    const finishEditingSkin = async () => {
      if (skin) {
        await saveSkin({
          ...skin,
          name,
          variant,
        });
      } else {
        const trimmedInput = skinInput.trim();
        if (!trimmedInput) {
          toast.error(
            "Skin source (Username, UUID, URL, or File Path) cannot be empty.",
          );
          return;
        }

        let targetName = "";
        const looksLikeHttpUrl = /^(https?):\/\//i.test(trimmedInput);
        const isLikelyFilePath = (input: string): boolean => {
          if (input.startsWith("file://")) return true;
          const hasPathSeparators = /[\\/]/.test(input);
          const isHttp = /^(https?):\/\//i.test(input);
          return hasPathSeparators && !isHttp;
        };

        if (looksLikeHttpUrl) {
          try {
            const url = new URL(trimmedInput);
            const pathnameParts = url.pathname
              .split("/")
              .filter((part) => part.length > 0);
            targetName = pathnameParts.pop() || url.hostname || "Web_Skin";
            if (targetName.match(/\.(png|jpg|jpeg|gif)$/i)) {
              targetName = targetName.substring(0, targetName.lastIndexOf("."));
            }
          } catch (e) {
            targetName = "Invalid_Web_Skin_Url";
            console.error("Error parsing HTTP URL for name:", e);
          }
        } else if (isLikelyFilePath(trimmedInput)) {
          let pathForNameExtraction = trimmedInput;
          if (trimmedInput.startsWith("file://")) {
            try {
              const tempUrl = new URL(trimmedInput);
              pathForNameExtraction = decodeURIComponent(tempUrl.pathname);
            } catch (e) {
              console.error(
                "Error parsing file:// URL for name extraction:",
                e,
              );
            }
          }
          const pathParts = pathForNameExtraction.split(/[\\/]/);
          targetName = pathParts.pop() || "File_Skin";
          if (targetName.match(/\.(png|jpg|jpeg|gif)$/i)) {
            targetName = targetName.substring(0, targetName.lastIndexOf("."));
          }
        } else {
          targetName = trimmedInput;
        }

        if (!targetName.trim()) {
          targetName = "Unnamed_Skin";
          console.warn(
            "Derived target name was empty, falling back to Unnamed_Skin for input:",
            trimmedInput,
          );
        }

        await addSkin(trimmedInput, targetName, variant, null);
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
              size="sm"
            >
              {localSkinsLoading ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              variant="secondary"
              onClick={cancel}
              disabled={localSkinsLoading}
              size="sm"
            >
              Cancel
            </Button>
          </div>
        }
      >
        <div className="p-4 space-y-4">
          {skin && (
            <div>
              <label className="block font-minecraft text-3xl text-white/80 lowercase mb-2">
                Skin Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter skin name"
                disabled={localSkinsLoading}
                size="md"
              />
            </div>
          )}

          {!skin && (
            <div className="space-y-2">
              <label className="block font-minecraft text-3xl text-white/80 lowercase">
                Skin
              </label>
              <div className="flex gap-2">
                <Input
                  id="skinInputField"
                  value={skinInput}
                  onChange={(e) => setSkinInput(e.target.value)}
                  placeholder="Copy by username, UUID or download from URL"
                  disabled={localSkinsLoading}
                  size="md"
                  className="flex-grow"
                />
                <IconButton
                  onClick={handleOpenFileUpload}
                  title="Upload Skin from file"
                  disabled={localSkinsLoading}
                  size="md"
                  variant="secondary"
                  icon={<Icon icon="solar:folder-bold" className="w-5 h-5" />}
                />
              </div>
            </div>
          )}

          <div className="pt-2">
            <p className="font-minecraft text-3xl text-white/80 lowercase mb-4">
              Skin Variant
            </p>
            <div className="flex flex-col space-y-3">
              <RadioButton
                name="editSkinVariant"
                value="classic"
                checked={variant === "classic"}
                onChange={() => setVariant("classic")}
                disabled={localSkinsLoading}
                label="Classic (Steve)"
                variant="default"
                size="md"
                shadowDepth="short"
              />
              <RadioButton
                name="editSkinVariant"
                value="slim"
                checked={variant === "slim"}
                onChange={() => setVariant("slim")}
                disabled={localSkinsLoading}
                label="Slim (Alex)"
                variant="default"
                size="md"
                shadowDepth="short"
              />
            </div>
          </div>
        </div>
      </Modal>
    );
  },
);

export function SkinsTab() {
  const {
    activeAccount,
    isLoading: accountLoading,
    error: accountError,
    initializeAccounts,
  } = useMinecraftAuthStore();
  const { selectedSkinId, setSelectedSkinId } = useSkinStore();
  const [skinData, setSkinData] = useState<MinecraftProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [localSkins, setLocalSkins] = useState<MinecraftSkin[]>([]);
  const [localSkinsLoading, setLocalSkinsLoading] = useState<boolean>(false);
  const [localSkinsError, setLocalSkinsError] = useState<string | null>(null);
  const [selectedLocalSkin, setSelectedLocalSkin] =
    useState<MinecraftSkin | null>(null);
  const [modalLoading, setModalLoading] = useState<boolean>(false);
  const [isEditingSkin, setIsEditingSkin] = useState<boolean>(false);
  const [editingSkin, setEditingSkin] = useState<MinecraftSkin | null>(null);
  const [search, setSearch] = useState<string>("");
  const [currentSkinId, setCurrentSkinId] = useState<string | null>(null);
  const loadingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedSearch = useDebounce(search, 250);
  const accentColor = useThemeStore((state) => state.accentColor);

  const filteredSkins = useMemo(() => {
    if (!debouncedSearch.trim()) return localSkins;
    return localSkins.filter((skin) =>
      skin.name.toLowerCase().includes(debouncedSearch.toLowerCase()),
    );
  }, [localSkins, debouncedSearch]);

  const loadSkinData = useCallback(async () => {
    if (!activeAccount) return;

    setLoading(true);

    try {
      const data = await MinecraftSkinService.getUserSkinData(
        activeAccount.id,
        activeAccount.access_token,
      );
      setSkinData(data);

      if (data?.properties) {
        const texturesProp = data.properties.find(
          (prop: { name: string; value: string }) => prop.name === "textures",
        );

        if (texturesProp) {
          try {
            const decodedValue = atob(texturesProp.value);
            const texturesJson = JSON.parse(decodedValue) as TexturesData;
            const skinInfo = texturesJson.textures?.SKIN;

            if (skinInfo?.url) {
              const urlParts = skinInfo.url.split("/");
              const skinIdFromUrl = urlParts[urlParts.length - 1].split(".")[0];
              setCurrentSkinId(skinIdFromUrl);
            }
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

    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
    }

    const startTime = Date.now();

    try {
      const skins = await MinecraftSkinService.getAllSkins();

      const elapsedTime = Date.now() - startTime;
      const minimumLoadingTime = 1200;

      if (elapsedTime < minimumLoadingTime) {
        loadingTimerRef.current = setTimeout(() => {
          setLocalSkins(skins);
          console.log(`Loaded ${skins.length} local skins`);

          if (selectedSkinId) {
            const selectedSkin = skins.find(
              (skin) => skin.id === selectedSkinId,
            );
            if (selectedSkin) {
              setSelectedLocalSkin(selectedSkin);
            }
          }

          setLocalSkinsLoading(false);
          loadingTimerRef.current = null;
        }, minimumLoadingTime - elapsedTime);
      } else {
        setLocalSkins(skins);
        console.log(`Loaded ${skins.length} local skins`);

        if (selectedSkinId) {
          const selectedSkin = skins.find((skin) => skin.id === selectedSkinId);
          if (selectedSkin) {
            setSelectedLocalSkin(selectedSkin);
          }
        }

        setLocalSkinsLoading(false);
      }
    } catch (err) {
      console.error("Error loading local skins:", err);
      setLocalSkinsError(err instanceof Error ? err.message : String(err));
      setLocalSkinsLoading(false);
    }
  }, [selectedSkinId]);

  useEffect(() => {
    if (activeAccount) {
      loadSkinData();
    }

    loadLocalSkins();

    if (!activeAccount && !accountLoading) {
      initializeAccounts();
    }

    return () => {
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
      }
    };
  }, [
    activeAccount,
    loadSkinData,
    loadLocalSkins,
    initializeAccounts,
    accountLoading,
  ]);

  const startEditSkin = (
    skin: MinecraftSkin | null,
    event?: React.MouseEvent<HTMLButtonElement>,
  ) => {
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
    setModalLoading(true);

    try {
      const updatedSkin = await MinecraftSkinService.updateSkinProperties(
        skin.id,
        skin.name,
        skin.variant,
      );

      if (updatedSkin) {
        toast.success(`Successfully updated skin: ${updatedSkin.name}`);
        setLocalSkins((prevSkins) =>
          prevSkins.map((s) => (s.id === updatedSkin.id ? updatedSkin : s)),
        );
        if (selectedLocalSkin?.id === updatedSkin.id) {
          setSelectedLocalSkin(updatedSkin);
        }
        setIsEditingSkin(false);
        setEditingSkin(null);
      } else {
        setLocalSkinsError("Skin not found. It may have been deleted.");
        setEditingSkin(null);
        setIsEditingSkin(false);
      }
    } catch (err) {
      console.error("Error updating skin properties:", err);
      setLocalSkinsError(err instanceof Error ? err.message : String(err));
    } finally {
      setModalLoading(false);
    }
  };

  const addSkin = async (
    skinInput: string,
    targetName: string,
    targetVariant: SkinVariant,
    description?: string | null,
  ) => {
    setModalLoading(true);
    try {
      const newSkin = await MinecraftSkinService.addSkinLocally(
        skinInput,
        targetName,
        targetVariant,
        description,
      );
      toast.success(`Successfully added skin: ${newSkin.name}`);
      setLocalSkins((prevSkins) =>
        [...prevSkins, newSkin].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setIsEditingSkin(false);
      setEditingSkin(null);
    } catch (err) {
      console.error("Error adding new skin:", err);
      const errorMessage =
        err instanceof Error ? err.message : String(err.message);
      toast.error(`Failed to add skin: ${errorMessage}`);
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteSkin = async (skinId: string, skinName: string) => {
    const deletePromise = async () => {
      const removed = await MinecraftSkinService.removeSkin(skinId);
      if (!removed) {
        throw new Error(
          `Skin "${skinName}" could not be found or was already deleted.`,
        );
      }
      return removed;
    };

    toast.promise(
      deletePromise(),
      {
        loading: `Deleting skin "${skinName}"...`,
        success: () => {
          setLocalSkins((prevSkins) =>
            prevSkins.filter((s) => s.id !== skinId),
          );
          if (selectedLocalSkin?.id === skinId) {
            setSelectedLocalSkin(null);
            setSelectedSkinId(null);
          }
          return `Successfully deleted skin: ${skinName}`;
        },
        error: (err) => {
          console.error("Error deleting skin:", err);
          return err instanceof Error ? err.message : String(err.message);
        },
      },
      {
        success: { duration: 4000 },
        error: { duration: 5000 },
      },
    );
  };

  const applyLocalSkin = async (skin: MinecraftSkin) => {
    if (!activeAccount) {
      toast.error("You must be logged in to apply a skin");
      return;
    }

    if (isSkinApplied(skin)) {
      toast.error(`Skin "${skin.name}" is already applied to your account`);
      return;
    }

    setLoading(true);
    setSelectedLocalSkin(skin);
    setSelectedSkinId(skin.id);

    try {
      await MinecraftSkinService.applySkinFromBase64(
        activeAccount.id,
        activeAccount.access_token,
        skin.base64_data,
        skin.variant,
      );

      toast.success(
        `Successfully applied skin: ${skin.name} (${skin.variant} model)`,
      );
      await loadSkinData();
    } catch (err) {
      console.error("Error applying local skin:", err);
      toast.error(err instanceof Error ? err.message : String(err));
      setSelectedLocalSkin(null);
      setSelectedSkinId(null);
    } finally {
      setLoading(false);
    }
  };

  const isSkinApplied = (skin: MinecraftSkin): boolean => {
    if (!currentSkinId) return false;
    return skin.id === currentSkinId;
  };

  const renderSkeletonGrid = () => {
    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <SkeletonSkinCard
            key={`skeleton-${index}`}
            index={index}
            skinVariant={index % 2 === 0 ? "classic" : "slim"}
          />
        ))}
      </div>
    );
  };

  // Add skin button for the TabLayout
  const addSkinButton = (
    <Button
      onClick={() => startEditSkin(null)}
      variant="default"
      size="md"
      className="h-[42px]"
      icon={<Icon icon="solar:add-circle-bold" className="w-5 h-5" />}
      iconPosition="left"
      disabled={!activeAccount}
    >
      ADD SKIN
    </Button>
  );

  return (
    <TabLayout
      title="Skins"
      icon="solar:user-id-bold"
      search={{
        value: search,
        onChange: setSearch,
        placeholder: "Search skins...",
      }}
      actions={addSkinButton}
    >
      <div className="space-y-8">
        {accountLoading ? (
          <div className="space-y-4">
            <Skeleton
              variant="text"
              height={28}
              width="50%"
              className="mx-auto"
            />
            <Skeleton
              variant="text"
              height={20}
              width="70%"
              className="mx-auto"
            />
          </div>
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
            <div className="space-y-5 text-center">
              {localSkinsLoading && localSkins.length === 0 && !editingSkin ? (
                renderSkeletonGrid()
              ) : localSkinsError && !editingSkin ? (
                <StatusMessage
                  type="error"
                  className="font-minecraft text-lg"
                  message={localSkinsError}
                />
              ) : !localSkinsLoading &&
                localSkins.length === 0 &&
                !localSkinsError &&
                !editingSkin ? (
                <p className="text-white/70 italic font-minecraft text-lg">
                  No local skins found. Upload skins to add them to your
                  library.
                </p>
              ) : !localSkinsLoading &&
                localSkins.length > 0 &&
                filteredSkins.length === 0 &&
                !localSkinsError &&
                !editingSkin ? (
                <p className="text-white/70 italic font-minecraft text-lg">
                  No skins match your search. Try a different search term.
                </p>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
                  {filteredSkins.map((skin, index) => (
                    <SkinPreview
                      key={skin.id}
                      skin={skin}
                      index={index}
                      loading={loading}
                      localSkinsLoading={localSkinsLoading}
                      selectedLocalSkin={selectedLocalSkin}
                      isApplied={isSkinApplied(skin)}
                      onClick={applyLocalSkin}
                      onEditSkin={startEditSkin}
                      onDeleteSkin={handleDeleteSkin}
                    />
                  ))}
                  <AddSkinCard
                    index={filteredSkins.length + 1}
                    onClick={() => startEditSkin(null, undefined)}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {isEditingSkin && (
        <EditSkinModal
          skin={editingSkin}
          cancel={cancelEditSkin}
          saveSkin={saveSkin}
          addSkin={addSkin}
          localSkinsLoading={modalLoading}
        />
      )}
    </TabLayout>
  );
}
