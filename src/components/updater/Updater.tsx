import React, { useState, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';

// Define the structure of the event payload
interface UpdaterStatusPayload {
  message: string;
  status: 'checking' | 'downloading' | 'installing' | 'uptodate' | 'pending' | 'error' | 'finished' | 'close'; // Add 'close'
  progress?: number; // Optional progress percentage
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
  const appWindow = getCurrentWindow(); // Get the current window instance

  useEffect(() => {
    const unlisten = listen<UpdaterStatusPayload>('updater_status', (event) => {
      console.log('Updater Status Event:', event.payload); // Log payload for debugging
      const { message, status, progress: eventProgress, total, chunk } = event.payload;
      
      setStatusMessage(message);
      
      if (status === 'downloading' && total && chunk) {
          const percentage = Math.round((chunk / total) * 100);
          setProgress(percentage);
          setStatusMessage(`Downloading... ${percentage}%`);
      } else if (status === 'downloading' && chunk) {
          // Handle download without total size known (e.g., show bytes)
           setStatusMessage(`Downloading... ${chunk} bytes`);
           setProgress(null); // No percentage available
      } else {
        setProgress(null); // Reset progress for other statuses
      }

      // Close the window immediately on "close" status
      if (status === 'close') {
        appWindow.close().catch((err: Error) => console.error("Failed to close updater window:", err));
      }
    });

    return () => {
      // Ensure unlisten is handled properly
      unlisten.then(f => f()).catch((err: Error) => console.error("Failed to unlisten updater events:", err)); // Added type for err
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