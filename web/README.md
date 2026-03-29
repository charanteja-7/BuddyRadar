# BuddyLocation Web

Modern migration shell for BuddyLocation using Next.js, TypeScript, Firebase, and Leaflet.

## Run locally

1. Copy .env.example to .env.local and fill Firebase values.
2. Install dependencies: npm install
3. Start dev server: npm run dev

## Quality gates

- npm run lint
- npm run typecheck
- npm run build

## Branch implementation order

1. feature/setup-repo-standards
2. feature/migrate-nextjs-shell
3. feature/firebase-auth-and-user-profile
4. feature/location-schema-and-security-rules
5. feature/realtime-presence-engine
6. feature/map-parity-leaflet-port
7. feature/pwa-offline-cache
8. feature/friend-invite-and-sharing-controls
9. feature/geofence-alerts-and-session-mode
10. feature/observability-and-analytics
11. feature/performance-and-quota-optimization
12. feature/release-v1-hardening

## Free deployment

Use Vercel Hobby for web hosting and Firebase Spark tier for auth and data. Full setup steps are documented in docs/free-deployment-setup.md.
