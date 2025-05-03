import React, { useState, useEffect, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';

// Define the structure of the event payload
interface UpdaterStatusPayload {
  message: string;
  status: 'checking' | 'downloading' | 'installing' | 'uptodate' | 'pending' | 'error' | 'finished' | 'close';
  progress?: number; // Optional progress percentage (0-100)
  total?: number; // Optional total size for download
  chunk?: number; // Optional chunk size for download
}

// Helper component to inject global styles
const GlobalStyles = () => (
  <style>{`
    html, body {
      margin: 0;
      padding: 0;
      overflow: hidden; /* Remove scrollbars */
      /* Set body background to match container background */
      background-color: rgba(30, 30, 30, 0.9); 
      height: 100%; 
      width: 100%;
    }
    #root {
       height: 100%; 
       width: 100%;
    }
  `}</style>
);

const Updater: React.FC = () => {
  const [statusMessage, setStatusMessage] = useState<string>('Initializing...');
  const [progress, setProgress] = useState<number | null>(null);
  const appWindow = getCurrentWindow();
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null); // Ref to store timer ID

  useEffect(() => {
    // Clear any existing timer when the component mounts or dependencies change
    if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
    }

    const unlistenPromise = listen<UpdaterStatusPayload>('updater_status', (event) => {
      console.log('Updater Status Event:', event.payload);
      const { message, status, progress: eventProgress } = event.payload;

      // Always clear previous close timer when a new event arrives
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }

      setStatusMessage(message); // Use the message from backend by default
      setProgress(null); // Reset progress by default

      switch (status) {
        case 'checking':
          // Message set by default
          break;
        case 'pending':
          // Message set by default
          break;
        case 'downloading':
          if (typeof eventProgress === 'number' && eventProgress >= 0 && eventProgress <= 100) {
             setProgress(eventProgress);
             // Optionally override message if progress is available
             setStatusMessage(`Downloading... ${eventProgress}%`);
          } else {
             // Keep the message from backend if progress is not available/valid
             // setProgress remains null
          }
          break;
        case 'installing':
           // Maybe show indeterminate progress later? For now, just message.
          break;
        case 'uptodate':
        case 'finished':
        case 'error':
          // Set a timer to close the window after a delay
          closeTimerRef.current = setTimeout(() => {
            appWindow.close().catch((err: Error) => console.error("Failed to auto-close updater window:", err));
            closeTimerRef.current = null; // Clear ref after execution
          }, 3000); // 3 seconds delay
          break;
        case 'close':
          // Close immediately, clear timer just in case
           if (closeTimerRef.current) {
               clearTimeout(closeTimerRef.current);
               closeTimerRef.current = null;
           }
          appWindow.close().catch((err: Error) => console.error("Failed to close updater window on 'close' event:", err));
          break;
      }
    });

    return () => {
       // Ensure unlisten is handled properly
       unlistenPromise.then(f => f()).catch((err: Error) => console.error("Failed to unlisten updater events:", err));
       // Clear timer on component unmount
       if (closeTimerRef.current) {
         clearTimeout(closeTimerRef.current);
         closeTimerRef.current = null;
       }
    };
  }, [appWindow]); // Add appWindow to dependency array

  return (
    <>
      <GlobalStyles /> {/* Inject global styles */} 
      <div style={styles.container}>
        <h4 style={styles.title}>NoRiskClient Updater</h4>
        <p style={styles.status}>{statusMessage}</p>
        {progress !== null && (
          <div style={styles.progressBarContainer}>
            <div style={{ ...styles.progressBar, width: `${progress}%` }}></div>
          </div>
        )}
        {/* Optional: Add a manual close button if needed */}
        {/* <button onClick={() => appWindow.close()}>Close</button> */}
      </div>
    </>
  );
};

// Basic inline styles for simplicity
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%', // Changed from 100vh to 100% to respect parent (body)
    width: '100%',  // Ensure container fills the body
    padding: '15px',
    boxSizing: 'border-box',
    fontFamily: 'sans-serif',
    // Background color is now set globally on body, 
    // but keep it here in case GlobalStyles fails or for potential overrides
    backgroundColor: 'rgba(30, 30, 30, 0.9)', 
    borderRadius: '8px', // Rounded corners if decorations are false
    color: '#eee',
    textAlign: 'center'
  },
  title: {
    margin: '0 0 10px 0',
    fontSize: '1.1em',
    fontWeight: 600,
  },
  status: {
    margin: '5px 0',
    fontSize: '0.9em',
    minHeight: '1.2em' // Prevent layout shift
  },
  progressBarContainer: {
    width: '80%',
    height: '8px',
    backgroundColor: '#555',
    borderRadius: '4px',
    overflow: 'hidden',
    marginTop: '10px',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50', // Green progress
    borderRadius: '4px',
    transition: 'width 0.2s ease-in-out',
  },
};

export default Updater; 