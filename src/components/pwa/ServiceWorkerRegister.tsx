"use client";
import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Installation PWA facultative : un echec (navigateur non
        // compatible, contexte non securise) ne doit jamais bloquer l'app.
      });
    }
  }, []);
  return null;
}
