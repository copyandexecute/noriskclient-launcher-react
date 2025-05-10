import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { Toaster } from "sonner";
import "./styles/globals.css";
import "./styles/scrollbar.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
    <Toaster position="bottom-right" visibleToasts={7} />
  </React.StrictMode>,
);
