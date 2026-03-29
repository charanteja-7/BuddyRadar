# Release v1 Hardening

Final hardening checklist and safeguards for production readiness.

## Runtime Safeguards

- Validate invite inputs and retry on code collisions.
- Validate location payload bounds before Realtime DB writes.
- Validate presence writes include a valid uid.
- Add explicit health endpoint at /api/health.

## CI Hardening

Required validation chain:

1. lint
2. typecheck
3. format:check
4. smoke:check
5. build

Use command:

- npm run release:validate

## Smoke Check Coverage

Script: web/scripts/smoke-check.mjs

Validates:

- Critical app files and API routes exist.
- PWA and offline files exist.
- Firebase rules files exist.
- Required public env keys are present in .env.example.

## Launch-Day Checklist

1. Confirm Firebase Auth providers enabled and tested.
2. Confirm Firestore and Realtime DB rules are deployed.
3. Confirm /api/health returns 200 in production.
4. Confirm service worker registration and offline fallback works.
5. Confirm invite create/redeem and friend visibility behavior.
6. Confirm geofence and session notifications function.
7. Confirm telemetry events appear in /api/telemetry logs.
8. Run npm run release:validate on release branch before merge.
