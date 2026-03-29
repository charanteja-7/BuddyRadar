# BuddyLocation Branching Strategy

## Core Branches

- main: production-ready releases only
- develop: integration branch for weekly work
- release/weekly-YYYY-MM-DD: stabilization branch for weekly release train

## Feature Branch Naming

- feature/setup-repo-standards
- feature/migrate-nextjs-shell
- feature/firebase-auth-and-user-profile
- feature/location-schema-and-security-rules
- feature/realtime-presence-engine
- feature/map-parity-leaflet-port
- feature/pwa-offline-cache
- feature/friend-invite-and-sharing-controls
- feature/geofence-alerts-and-session-mode
- feature/observability-and-analytics
- feature/performance-and-quota-optimization
- feature/release-v1-hardening

## Merge Flow

1. Create feature branch from develop.
2. Open PR into develop with preview deploy checks.
3. Weekly cut: develop -> release/weekly-YYYY-MM-DD.
4. Run smoke checks in release branch.
5. Merge release branch into main.
6. Back-merge main into develop if hotfixes occurred.

## Required Checks Per PR

- lint
- typecheck
- build
- smoke test evidence for relevant user flow

## Current Implementation Status

- Completed slice: feature/setup-repo-standards
- Delivered capabilities:
	- Next.js TypeScript workspace scaffold in web/
	- CI workflow baseline and quality gate scripts
	- Environment template, prettier config, and branch strategy docs
	- Validation passed: lint, typecheck, build
- Completed slice: feature/migrate-nextjs-shell
- Delivered capabilities:
	- App shell migration from static prototype to Next.js app structure
	- Join flow and map screen baseline components
	- Leaflet map integration foundation and responsive UI shell
	- Validation passed: lint, typecheck, build
- Completed slice: feature/firebase-auth-and-user-profile
- Delivered capabilities:
	- Firebase auth gate with Google sign-in and anonymous guest login
	- Protected map access behind authenticated session
	- Firestore user profile bootstrap and upsert flow
	- Session observer and sign-out action in app top bar
	- Validation passed: lint, typecheck, build
- Completed slice: feature/location-schema-and-security-rules
- Delivered capabilities:
	- Realtime Database location and presence data access module
	- Geolocation watch publishing to /locations and lifecycle presence in /presence
	- Friend realtime subscription mapped to Firestore profiles
	- Tightened Firestore and Realtime Database rules with field validation
	- Validation passed: lint, typecheck, build
- Completed slice: feature/realtime-presence-engine
- Delivered capabilities:
	- Connection state subscription and reconnect indicator
	- Heartbeat-based location refresh with throttled write policy
	- Stale friend filtering and deterministic sorting in realtime stream
	- Defensive deduping for friend markers and profile list state
	- Validation passed: lint, typecheck, build
- Completed slice: feature/map-parity-leaflet-port
- Delivered capabilities:
	- Friend selection from sidebar and map markers
	- Fly-to focus controls for selected friend and center-on-me action
	- Distance panel with avatars, formatted distance, and pair label
	- Map polyline rendering between user and selected friend
	- Relative time and distance badges in friend cards
	- Validation passed: lint, typecheck, build
- Completed slice: feature/pwa-offline-cache
- Delivered capabilities:
	- Installable manifest and app icons
	- Service worker registration with runtime/static caching
	- Offline document fallback via cached offline page
	- In-app online/offline status banner and install prompt button
	- Cached snapshot restore flow when launching while offline
	- Validation passed: lint, typecheck, build
- Completed slice: feature/friend-invite-and-sharing-controls
- Delivered capabilities:
	- Invite code creation and shareable invite links
	- Invite redemption flow that creates friendship relationships
	- Friendship subscription to scope visible realtime friends
	- Sharing privacy controls: pause sharing and timed sharing windows
	- Firestore rules updated for invite and friendship collections
	- Validation passed: lint, typecheck, build
- Completed slice: feature/geofence-alerts-and-session-mode
- Delivered capabilities:
	- Session mode with named sessions and live breadcrumb route trail
	- Geofence alerts for selected friends with configurable radius
	- Notification center with unread counter and read-on-open behavior
	- Map overlays for session trail and active geofence radius
	- Session/geofence state resets on auth transitions and sign-out
	- Validation passed: lint, typecheck, build
- Completed slice: feature/observability-and-analytics
- Delivered capabilities:
	- Client telemetry helper for events and error capture
	- Runtime listeners for uncaught errors and lifecycle visibility events
	- Telemetry ingestion endpoint at /api/telemetry
	- Optional GA4 forwarding via NEXT_PUBLIC_GA_MEASUREMENT_ID
	- Global error boundary with telemetry reporting and retry UI
	- Action instrumentation across auth, network, sharing, invite, session, and geofence flows
	- Validation passed: lint, typecheck, build
- Completed slice: feature/performance-and-quota-optimization
- Delivered capabilities:
	- Telemetry event dedupe window to avoid repeated analytics writes
	- In-memory profile cache with TTL to reduce Firestore read amplification
	- Realtime subscriber signature dedupe to avoid redundant friend list updates
	- Throttled offline snapshot persistence to reduce localStorage churn
	- Notification cap and location state update guards to reduce rerender pressure
	- Validation passed: lint, typecheck, build
- Completed slice: feature/release-v1-hardening
- Delivered capabilities:
	- Invite and realtime runtime input validation guards
	- Health endpoint at /api/health for deployment checks
	- Smoke-check automation with required file/env verification
	- CI hardening with format and smoke gates before build
	- Release validation command chain and launch checklist documentation
	- Validation passed: lint, typecheck, format:check, smoke:check, build

## Hotfix Rule

- hotfix/* branches target main directly, then merge back to develop.
