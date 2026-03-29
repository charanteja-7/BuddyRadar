# BuddyRadar (BuddyLocation v1)

Real-time location sharing web app built with Next.js, TypeScript, Firebase, and Leaflet.

## What is implemented

### Core platform

- Firebase authentication:
	- Google sign-in
	- Anonymous guest login
- Firestore user profile bootstrap and updates
- Realtime Database location + presence publishing
- Friend-scoped realtime location feed

### Live map and buddy UX

- Leaflet live map rendering for current user and friends
- Friend selection from sidebar and map marker interactions
- Distance panel between you and selected friend
- Fly-to focus and center-on-me controls
- Route polyline between current user and selected friend

### Sharing and social features

- Invite code creation and redemption
- Friendship document creation from invite redemption
- Sharing controls:
	- Pause sharing
	- Timed sharing window

### Session and safety features

- Session mode with named session and breadcrumb trail
- Geofence alerts for selected friend within configurable radius
- Notification center with unread tracking and read-on-open behavior

### PWA and offline support

- Web app manifest and install prompt handling
- Service worker for static/runtime caching
- Offline fallback page
- Cached last-known snapshot restore when offline

### Observability and operations

- Client telemetry events and error tracking
- Server telemetry ingestion endpoint: `/api/telemetry`
- Health endpoint for deployment checks: `/api/health`
- Optional GA4 forwarding via `NEXT_PUBLIC_GA_MEASUREMENT_ID`

### Performance and reliability hardening

- Event dedupe window for telemetry spam reduction
- In-memory profile cache with TTL
- Realtime friend record signature dedupe
- Throttled offline snapshot persistence
- Input validation guards for invite/location writes
- CI hardening with lint, typecheck, format, smoke checks, and build

## Tech stack

- Next.js 16.2.1 (App Router)
- React 19
- TypeScript (strict)
- Firebase:
	- Auth
	- Firestore
	- Realtime Database
- Leaflet + React Leaflet
- ESLint + Prettier

## Project structure

```text
web/
	src/
		app/
			api/health/route.ts
			api/telemetry/route.ts
			global-error.tsx
			layout.tsx
			page.tsx
		features/
			auth/
			join/
			map/
			observability/
			pwa/
		lib/
			firebase/
			observability/
			constants.ts
			env.ts
			geo.ts
			types.ts
	firebase/
		firestore.rules
		database.rules.json
	public/
		sw.js
		offline.html
		icons/
```

## Prerequisites

- Node.js 20+
- npm 10+
- Firebase project with:
	- Authentication enabled (Google and/or Anonymous)
	- Firestore Database created
	- Realtime Database created

## Environment variables

Create `.env.local` in `web/` with:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_DATABASE_URL=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_GA_MEASUREMENT_ID=... # optional
```

## Run locally

```bash
cd web
npm install
npm run dev
```

Open `http://localhost:3000`.

## Available scripts

- `npm run dev` - Start development server
- `npm run build` - Production build
- `npm run start` - Start production server
- `npm run lint` - ESLint checks
- `npm run typecheck` - TypeScript checks
- `npm run format:check` - Prettier formatting check
- `npm run smoke:check` - Required-file/env smoke checks
- `npm run release:validate` - Full release gate chain

## Firestore security rules

This app expects collection-level rules for:

- `users`
- `friendships`
- `invites`
- `sessions`

If Firestore rules are set to deny all, realtime listeners will fail with `permission-denied`.

Use the rules from `web/firebase/firestore.rules` and publish them in Firebase Console.

## Common setup issues

### "Database '(default)' not found"

Cause: Firestore DB not created in the selected Firebase project.

Fix: In Firebase Console, create Firestore database (Native mode), then restart the app.

### "Missing or insufficient permissions"

Cause: Firestore rules in console do not match app requirements.

Fix: Publish `web/firebase/firestore.rules` in Firebase Console.

### "Unsupported field value: undefined"

Cause: Firestore writes containing `undefined`.

Fix already implemented in profile upsert path by removing undefined fields before `setDoc`.

## Deployment

Recommended free-tier setup:

- Frontend: Vercel Hobby
- Backend services: Firebase Spark

Related docs are available in `../docs/`:

- `../docs/free-deployment-setup.md`
- `../docs/merge-runbook.md`
- `../docs/release-pr-summary.md`

## Feature delivery history

Implemented through 12 slices:

1. setup-repo-standards
2. migrate-nextjs-shell
3. firebase-auth-and-user-profile
4. location-schema-and-security-rules
5. realtime-presence-engine
6. map-parity-leaflet-port
7. pwa-offline-cache
8. friend-invite-and-sharing-controls
9. geofence-alerts-and-session-mode
10. observability-and-analytics
11. performance-and-quota-optimization
12. release-v1-hardening
