"use client";
import { Launcher } from "./components/launcher/Launcher";
import { TitleBar } from "./components/ui/TitleBar";

export function App() {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <TitleBar title="NoRiskClient Launcher" />

      <div className="flex-1 overflow-hidden">
        <Launcher useIntegratedTitleBar={false} />
        {/* <div className="h-full w-full"></div> */}
      </div>
    </div>
  );
}
