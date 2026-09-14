import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ToastProvider } from "@/context/ToastContext";
import './index.css';

// Safeguard against unhandled network dropouts and browser-level fetch interruptions
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    const msg = event?.reason?.message || String(event?.reason || "");
    if (msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("Load failed")) {
      console.warn("[Global Network Handler] Intercepted transient network fetch issue:", msg);
      event.preventDefault();
    }
  });

  window.addEventListener("error", (event) => {
    const msg = event?.message || event?.error?.message || String(event || "");
    if (msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("Load failed")) {
      console.warn("[Global Error Handler] Intercepted network error:", msg);
      event.preventDefault();
      return true;
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
);
