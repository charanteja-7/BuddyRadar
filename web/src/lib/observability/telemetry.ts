type TelemetryLevel = "info" | "warn" | "error";

export type TelemetryPayload = {
  event: string;
  level?: TelemetryLevel;
  message?: string;
  tags?: Record<string, string>;
  data?: Record<string, unknown>;
  ts?: number;
  path?: string;
};

const SESSION_KEY = "buddy-observability-session-id";
const EVENT_DEDUPE_WINDOW_MS = 12_000;
const recentEventByName = new Map<string, number>();

function getSessionId(): string {
  if (typeof window === "undefined") {
    return "server";
  }

  const existing = sessionStorage.getItem(SESSION_KEY);
  if (existing) {
    return existing;
  }

  const next = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  sessionStorage.setItem(SESSION_KEY, next);
  return next;
}

function normalizePayload(payload: TelemetryPayload): TelemetryPayload {
  return {
    ...payload,
    ts: payload.ts ?? Date.now(),
    path: payload.path ?? (typeof window === "undefined" ? "/" : window.location.pathname),
    data: {
      ...payload.data,
      sessionId: getSessionId(),
    },
  };
}

function postTelemetry(payload: TelemetryPayload): void {
  const serialized = JSON.stringify(payload);

  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    const blob = new Blob([serialized], { type: "application/json" });
    navigator.sendBeacon("/api/telemetry", blob);
    return;
  }

  void fetch("/api/telemetry", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: serialized,
    keepalive: true,
  }).catch(() => {
    // Telemetry should never fail app flows.
  });
}

function maybeSendToGa(payload: TelemetryPayload): void {
  if (typeof window === "undefined") {
    return;
  }

  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const gtag = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
  if (!measurementId || !gtag) {
    return;
  }

  gtag("event", payload.event, {
    event_category: payload.level ?? "info",
    event_label: payload.message,
    ...payload.tags,
  });
}

export function trackEvent(event: string, data?: Record<string, unknown>): void {
  const now = Date.now();
  const lastSeen = recentEventByName.get(event);
  if (lastSeen && now - lastSeen < EVENT_DEDUPE_WINDOW_MS) {
    return;
  }
  recentEventByName.set(event, now);

  const payload = normalizePayload({
    event,
    level: "info",
    data,
  });

  postTelemetry(payload);
  maybeSendToGa(payload);
}

export function trackError(error: unknown, context?: Record<string, unknown>): void {
  const message = error instanceof Error ? error.message : "Unknown error";
  const payload = normalizePayload({
    event: "client_error",
    level: "error",
    message,
    data: {
      ...context,
      stack: error instanceof Error ? error.stack : undefined,
    },
  });

  postTelemetry(payload);
  maybeSendToGa(payload);
}
