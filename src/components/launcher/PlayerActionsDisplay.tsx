"use client";

import React from 'react';
import { cn } from '../../lib/utils';
import { SkinViewer } from './SkinViewer';
import { LaunchButton } from './LaunchButton';
import { useThemeStore } from '../../store/useThemeStore';

const DEFAULT_SKIN_TEXTURE_URI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAAAdVBMVEUAAAAAaGgAf38ApKQAr68AzMwDenoElZUFiIgKvLwkGAgmGgooKCgrHg0zJBE0JRI3Nzc6MYk/KhU/Pz9BNZtCHQpGOqVJJRBKSkpSPYlVVVVqQDB2SzN3QjWBUzmPXj6QWT+UYD6bY0mqclmzeV66hW3///9cmyCkAAAAAXRSTlMAQObYZgAAAvdJREFUWMPtlu1aozAQhWtBSdmSBYpVV4Vs0vX+L3HPmUmUdqsN/bsOSCc8zst8BGZWqyhNY3HaZoyyWiqN7XES8AK5BgBjHu5FxF3hAQLA3/WARoNwGsJygGUOm74fHVPopuWAXmKw06jHFTmwzGMzTg+QcVoQOyxrXnsICFgwHG4LaE1O9pu6trYmwfKoa91UPe/3WbHLDvKHP4fgf8q6Z0FJtvayB/QYz/ThcAgheLHSMCSQrA3UOF+Ht6fgn95C7Z3csrWAbE79be0hITw/wwNILf4jFUzHRUDd1M5P4283Pby+3kMZJ+9wk4AmBzA62JMw3j/co/4OC++4HX9AMt/KDtK2221a3wYgfLjtoqT7ZVkWCDWcBWy3bfsOgD0IZwFIk7vswWeADQE5HnwSQiEhnHgwDN2w3+87/AxQugqC56CsRal6gStMYVzgZw3h4gPQfQDwu6+MqcqyCoFX0WFZvtuX65ubNdQ5QAyHBDB3d6aACS/USSCrFPOiEgAW5wE47yDJiDrjhl6so9xA+HsEYBgkMGE0wtMJMBFQSfK8dzxEsDj2gCch+KPbBu4SEEMQh/im4kAN+NrMSplif8+BkcwVeKxJOpdiBYQAcM7KeAxg5g3dZvmgC6CIgCAAd+RBJ4ZDSsRQwcZUkrdKNKlfZcR/fd2PAY+Pab89ilRiVkkeKbSGvQkKCPrpmAHaHax+0XRHdafFgD8GZlQQEZS9ArwC/BzQtjsa7lrR2rilURZjNC9g4coCaA6dIFbf8l/KRoX7uiihfGfkW7LmhXmzZU/i52gRYN7uCXD+TFvP92BTnp0LFnhQuNzvoM4LQ+rWg84D2tqP5oKvAGKpc8Ne23kkzOeCrwBd7PcJUEVjQvI9IABamgeSpO9B+j78CziZF3Qe0HbCvnjZA+2xOrJAZy+Ko0HIKuVRCJA4EKTpICxIos4LLo0ksT1nbKK0EzQWl/q5zwSczgvJPiXhIuB0XkjzQErDZcDJvKAVZPp0Pjj9/7/jX3fLYvZOsQAAAABJRU5ErkJggg==";
//const DEFAULT_SKIN_TEXTURE_URI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABABAMAAABYR2ztAAAAD1BMVEUAAAAAAAAqLjXy8vL///8ICVYwAAAAAXRSTlMAQObYZgAAAN1JREFUSMfNlUEOgyAQRd9iLqDxAk28gT3A2Mz9z9QFUlAGTDE2/YtvIi/zRxAAwDaxycAElM8LByDXESj094AdlQ+B+UDyElBA4kPOAK9C7EsBAXUrKIjWKqQlDBD1r9wi4JklZ10k7nbA6iqAYUjuAev4mKK7wGtep+h+hIWhBjDMyT1gHZP7wD6hBF5zcr+Hs4nqjABsWWgqAqIngEovcFFhK4j1A/dEhGm2Cz0cKxS72om4coiCERbL3dk/Atzf/ytAzMz0CnBfhMSTu7sHiQtdOxv2Ea27z5rAG5Qu+sF3GDXQAAAAAElFTkSuQmCC";
//const DEFAULT_SKIN_TEXTURE_URI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABABAMAAABYR2ztAAAAD1BMVEUAAAAAAAANDQ3V0cr///+ru4fOAAAAAXRSTlMAQObYZgAAANJJREFUSMfNldsNgzAMRY838BUsUDZA6gJV2X+mfoQUmqcKour9CBI58nVibADQKlYJZOC8XxQA9kqBTH8PKNV+C1QGtjUHHLD4sB5QihDzcsDAixEczGsRthIGiPopVwu47Zx3WWzc5YDqyoBlaQPj8/5oAsM8tgGpCyxzGxifnVMkDjkwzB2ge1EHLQBNE01FwLwDuB0FTiq0guk4cI1FuGadyCGNkHV1weLMEAURilXs7B8Bxc//K8Akyc8A11lYnNyHc7BY6Nps+LRo/fvUBF7sLkRRqJ23BwAAAABJRU5ErkJggg==";
const DEFAULT_SKIN_RENDER_URL = `https://starlightskins.lunareclipse.studio/render/default/steve/full?skinUrl=${encodeURIComponent(DEFAULT_SKIN_TEXTURE_URI)}&skinType=wide`;

interface PlayerActionsDisplayProps {
  skinUrl: string; // This should be the URL to the *rendered skin image* from Starlight or other source
  playerName: string | null | undefined;
  launchButtonDefaultVersion: string;
  onLaunchVersionChange: (versionId: string) => void;
  launchButtonVersions: Array<{ 
    id: string; 
    label: string; 
    icon?: string; 
    isCustom?: boolean; 
    profileId: string; 
  }>;
  className?: string;
  displayMode?: 'playerName' | 'logo';
}

export function PlayerActionsDisplay({
  skinUrl,
  playerName,
  launchButtonDefaultVersion,
  onLaunchVersionChange,
  launchButtonVersions,
  className,
  displayMode = 'playerName',
}: PlayerActionsDisplayProps) {
  const accentColor = useThemeStore((state) => state.accentColor);

  const dropShadowX = '2px';
  const dropShadowY = '4px';
  const dropShadowBlur = '6px';
  const commonDropShadowStyle = `drop-shadow(${dropShadowX} ${dropShadowY} ${dropShadowBlur} ${accentColor.value})`;
  
  const skinViewerDisplayHeight = 450;
  const skinViewerMaxDisplayWidth = 225; // Adjusted to allow for wider classic skins

  const skinViewerStyles: React.CSSProperties = {
    filter: 'drop-shadow(5px 10px 5px rgba(0,0,0,0.75))',
    WebkitBoxReflect: 'below 0px linear-gradient(to bottom, transparent, rgba(0,0,0,0.05))',
    height: `${skinViewerDisplayHeight}px`,
    width: 'auto', // Allow width to adjust to aspect ratio
    maxWidth: `${skinViewerMaxDisplayWidth}px`, // Cap the maximum width
  };

  // If playerName is available, use the provided skinUrl (assumed to be a Starlight rendered URL for the player).
  // Otherwise, use the Starlight rendered URL for our default base64 skin.
  const displaySkinUrl = playerName ? skinUrl : DEFAULT_SKIN_RENDER_URL;

  return (
    <div className={cn("flex flex-col items-center", className)}>
      {displayMode === 'logo' ? (
        <img
          src="norisk_logo_color.png"
          alt="NoRisk Logo"
          className="h-48 sm:h-56 md:h-64 mb-[-80px] sm:mb-[-100px] md:mb-[-120px] relative z-0"
          style={{
            imageRendering: "pixelated",
            filter: commonDropShadowStyle
          }}
        />
      ) : (
        <h2 className="font-minecraft text-6xl text-center text-white mb-2 lowercase font-normal">
          {playerName || "no account"}
        </h2>
      )}

      <div className={cn(
        "relative w-full max-w-[500px] flex flex-col items-center",
        displayMode === 'logo' && "z-10"
      )}>
        <SkinViewer
          skinUrl={displaySkinUrl} // This will now always be a URL to an image (rendered by Starlight or direct)
          playerName={playerName?.toString()} // Still useful for alt text or other non-visual purposes if SkinViewer uses it
          width={skinViewerMaxDisplayWidth} 
          height={skinViewerDisplayHeight} 
          className="bg-transparent flex-shrink-0"
          style={skinViewerStyles}
        />

        <div className="absolute bottom-8 left-0 right-0 flex justify-center px-4">
          <div className="max-w-xs sm:max-w-sm">
            <LaunchButton
              defaultVersion={launchButtonDefaultVersion}
              onVersionChange={onLaunchVersionChange}
              versions={launchButtonVersions}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 