"use client";

import type { Profile } from "../../../types/profile";
import * as ProfileService from "../../../services/profile-service";
import { ContentPacksTab } from "./ContentPacksTab";

interface ResourcePacksTabProps {
  profile: Profile;
  onRefresh?: () => void;
}

export function ResourcePacksTab({
  profile,
  onRefresh,
}: ResourcePacksTabProps) {
  return (
    <ContentPacksTab
      profile={profile}
      onRefresh={onRefresh}
      contentType="resourcepack"
      title="resource packs"
      icon="pixel:image-solid"
      browseUrl="https://modrinth.com/resourcepacks"
      fetchFunction={ProfileService.getLocalResourcepacks}
      toggleFunction={ProfileService.setProfileResourcePackEnabled}
      deleteFunction={ProfileService.deleteResourcePackFromProfile}
    />
  );
}
