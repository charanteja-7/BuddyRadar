# Observability and Analytics

This slice adds zero-cost-friendly telemetry with optional GA4 support.

## Components

- Client event and error tracking helper:
  - web/src/lib/observability/telemetry.ts
- Runtime listeners for app lifecycle and uncaught errors:
  - web/src/features/observability/observability-runtime.tsx
- Server telemetry ingestion endpoint:
  - web/src/app/api/telemetry/route.ts

## What is tracked

- App lifecycle: load, visibility changes
- Network state transitions (online/offline)
- Auth success/failure paths
- Invite/session/geofence user actions
- Client runtime errors and unhandled rejections

## Optional GA4

Set the following variable to emit events through gtag when present:

- NEXT_PUBLIC_GA_MEASUREMENT_ID

Without this variable, telemetry still works via /api/telemetry logging.

## Free-tier deployment behavior

- API logs can be viewed in Vercel function logs.
- No paid observability dependency is required.
- Events are sent with sendBeacon/fetch keepalive to avoid blocking UX.
