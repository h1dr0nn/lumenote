import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { Toaster } from "sonner";
import "./main.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: 'var(--color-app-surface)',
          border: '1px solid var(--color-border-subtle)',
          color: 'var(--color-text-primary)',
          fontFamily: 'var(--font-ui)',
          fontSize: 'var(--text-sm)',
        },
      }}
    />
  </React.StrictMode>,
);
