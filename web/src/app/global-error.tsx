"use client";

import { useEffect } from "react";

import { trackError } from "@/lib/observability/telemetry";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    trackError(error, {
      source: "global_error_boundary",
      digest: error.digest,
    });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#05080f",
          color: "#e8eaff",
          fontFamily: "system-ui, sans-serif",
          padding: "16px",
        }}
      >
        <main
          style={{
            border: "1px solid rgba(255,255,255,0.16)",
            borderRadius: "14px",
            padding: "20px",
            maxWidth: "460px",
            width: "100%",
            background: "rgba(8,12,26,0.86)",
          }}
        >
          <h1 style={{ margin: "0 0 8px" }}>Something went wrong</h1>
          <p style={{ margin: "0 0 14px", opacity: 0.78 }}>
            We recorded this failure and you can safely retry.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              minHeight: "36px",
              borderRadius: "9px",
              border: 0,
              background: "linear-gradient(135deg,#6c63ff,#00d2ff)",
              color: "white",
              fontWeight: 700,
              padding: "0 12px",
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </main>
      </body>
    </html>
  );
}
