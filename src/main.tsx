import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { Toaster } from "sonner";
import "./main.css";

import { useEffect } from "react";
import { useStore } from "./store/useStore";

const AppInitializer = ({ children }: { children: React.ReactNode }) => {
  const initialize = useStore((state) => state.initialize);
  
  useEffect(() => {
    initialize();
  }, [initialize]);

  return <>{children}</>;
};

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AppInitializer>
      <App />
    </AppInitializer>
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
