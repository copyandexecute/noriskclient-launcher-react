import { createHashRouter, Navigate } from "react-router-dom";
import { App } from "../App";
import { PlayTab } from "../components/tabs/PlayTab";
import { ProfilesTab } from "../components/tabs/ProfilesTab";
import ModrinthTabV2 from "../components/tabs/ModrinthTabV2";
import { SkinsTab } from "../components/tabs/SkinsTab";
import { StoreTab } from "../components/tabs/StoreTab";
import { NewsTab } from "../components/tabs/NewsTab";
import { SettingsTab } from "../components/tabs/SettingsTab";

export const router = createHashRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true,
        element: <Navigate to="/play" replace />,
      },
      {
        path: "play",
        element: <PlayTab />,
      },
      {
        path: "profiles",
        element: <ProfilesTab />,
      },
      {
        path: "mods",
        element: <ModrinthTabV2 />,
      },
      {
        path: "skins",
        element: <SkinsTab />,
      },
      {
        path: "store",
        element: <StoreTab />,
      },
      {
        path: "news",
        element: <NewsTab />,
      },
      {
        path: "settings",
        element: <SettingsTab />,
      },
    ],
  },
]);
