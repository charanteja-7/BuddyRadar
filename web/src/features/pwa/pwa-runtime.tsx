"use client";

import { useEffect } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type PwaRuntimeProps = {
  onInstallPromptReady: (event: BeforeInstallPromptEvent | null) => void;
  onOfflineChange: (isOffline: boolean) => void;
};

export function PwaRuntime({ onInstallPromptReady, onOfflineChange }: PwaRuntimeProps) {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch {
        // SW registration failure should not break app runtime.
      }
    };

    void register();
  }, []);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      onInstallPromptReady(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      onInstallPromptReady(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [onInstallPromptReady]);

  useEffect(() => {
    onOfflineChange(!navigator.onLine);

    const online = () => onOfflineChange(false);
    const offline = () => onOfflineChange(true);

    window.addEventListener("online", online);
    window.addEventListener("offline", offline);

    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, [onOfflineChange]);

  return null;
}
