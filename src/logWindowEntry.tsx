import React from 'react';
import ReactDOM from 'react-dom/client';
import { LogWindow } from './components/log/LogWindow'; // Component to be created
// Import global styles if necessary
import './styles/globals.css'; 

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LogWindow />
  </React.StrictMode>
); 