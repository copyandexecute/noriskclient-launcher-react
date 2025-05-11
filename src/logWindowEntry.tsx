import React from 'react';
import ReactDOM from 'react-dom/client';
import { LogWindow } from './components/log/LogWindow'; // Component to be created
import { GlobalToaster } from './components/ui/GlobalToaster'; // Added import
// Import global styles if necessary
import './styles/globals.css'; 

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LogWindow />
    <GlobalToaster />
  </React.StrictMode>
); 