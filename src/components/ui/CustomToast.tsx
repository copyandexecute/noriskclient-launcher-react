import React from 'react';
import { toast } from 'sonner';

// Typen für die Props definieren
interface CustomToastProps {
  toastId: string | number;
  message: string;
  description?: string;
  type?: 'success' | 'error' | 'info' | 'warning'; // Typ für Styling
}

export const CustomToast: React.FC<CustomToastProps> = ({
  toastId,
  message,
  description,
  type = 'info', // Standardmäßig Info
}) => {
  // Typ-spezifisches Styling für den äußeren Container (Hintergrund + Rand)
  const outerTypeClasses = {
    success: "bg-green-900/50 border-green-700",
    error: "bg-red-900/50 border-red-700",
    warning: "bg-yellow-900/50 border-yellow-700",
    info: "bg-zinc-900/50 border-zinc-700", // Angepasst mit /50 für Transparenz
  };

  // Klassen für den äußeren Container (Layout, Rand, Mindestbreite)
  const outerBaseClasses = "shadow-lg rounded-none border overflow-hidden min-w-[350px]"; // Mindestbreite hinzugefügt

  // Klassen für den inneren Container (Padding, Flex, Textfarbe)
  const innerClasses = "text-white p-4 flex items-start";

  return (
    // Äußerer Container (Hintergrund, Rand, Blur)
    <div className={`${outerBaseClasses} ${outerTypeClasses[type]}`}>
      {/* Innerer Container (Inhalt, Padding, Flex) */}
      <div className={innerClasses}>
        {/* Optional: Icon basierend auf Typ */}
        {/* <div className="mr-3">{getIcon(type)}</div> */}

        <div className="flex-grow">
          <div className="font-semibold">{message}</div>
          {description && <div className="text-sm text-zinc-400 mt-1">{description}</div>}
        </div>

        {/* Schließen-Button */}
        <button
          onClick={() => toast.dismiss(toastId)}
          className="ml-4 p-1 text-zinc-500 hover:text-white focus:outline-none flex-shrink-0" // flex-shrink-0 hinzugefügt
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

// Beispiel für eine Icon-Funktion (könnte erweitert werden)
// const getIcon = (type: CustomToastProps['type']) => {
//   switch (type) {
//     case 'success': return '✅';
//     case 'error': return '❌';
//     case 'warning': return '⚠️';
//     default: return 'ℹ️';
//   }
// }; 