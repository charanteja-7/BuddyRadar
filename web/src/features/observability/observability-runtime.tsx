"use client";

import { useEffect } from "react";

import { trackError, trackEvent } from "@/lib/observability/telemetry";

export function ObservabilityRuntime() {
  useEffect(() => {
    trackEvent("app_loaded");

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      trackError(event.reason, { source: "unhandledrejection" });
    };

    const onError = (event: ErrorEvent) => {
      trackError(event.error ?? event.message, {
        source: "window_error",
        filename: event.filename,
        line: event.lineno,
        column: event.colno,
      });
    };

    const onVisibilityChange = () => {
      trackEvent(document.hidden ? "app_hidden" : "app_visible");
    };

    window.addEventListener("unhandledrejection", onUnhandledRejection);
    window.addEventListener("error", onError);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      window.removeEventListener("error", onError);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return null;
}
