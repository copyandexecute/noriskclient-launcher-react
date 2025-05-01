"use client";

import type { Profile } from "../../../types/profile";
import * as ProfileService from "../../../services/profile-service";
import { ContentPacksTab } from "./ContentPacksTab";

interface ShaderPacksTabProps {
  profile: Profile;
  onRefresh?: () => void;
}

export function ShaderPacksTab({ profile, onRefresh }: ShaderPacksTabProps) {
  return (
    <ContentPacksTab
      profile={profile}
      onRefresh={onRefresh}
      contentType="shaderpack"
      title="shader packs"
      icon="pixel:sun-solid"
      browseUrl="https://modrinth.com/shaders"
      fetchFunction={ProfileService.getLocalShaderpacks}
      toggleFunction={ProfileService.setProfileShaderPackEnabled}
      deleteFunction={ProfileService.deleteShaderPackFromProfile}
    />
  );
}
