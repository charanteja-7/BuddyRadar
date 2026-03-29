# Merge Runbook

## Branch Targets

- Working branch: feature/release-v1-hardening
- Integration branch: develop
- Release branch: release/weekly-YYYY-MM-DD
- Production branch: main

## Recommended Merge Sequence

1. Sync branch from latest develop
- git fetch origin
- git checkout feature/release-v1-hardening
- git rebase origin/develop

2. Open PR to develop
- Source: feature/release-v1-hardening
- Target: develop
- Use docs/release-pr-summary.md for PR body

3. After PR merge, cut release branch
- git checkout develop
- git pull
- git checkout -b release/weekly-YYYY-MM-DD

4. Run release validation in release branch
- cd web
- npm ci
- npm run release:validate

5. Open PR release branch to main
- Source: release/weekly-YYYY-MM-DD
- Target: main

6. Post-merge back-sync
- git checkout develop
- git pull
- git merge --no-ff main

## Required Checks Before Main Merge

1. /api/health returns 200
2. /manifest.webmanifest resolves correctly
3. Firebase rules deployed and verified
4. Invite flow works with two accounts
5. Realtime map updates work across two devices
6. Geofence/session notifications confirmed
7. Offline fallback page and service worker behavior confirmed

## Rollback Strategy

1. If release branch fails smoke checks, stop merge and patch in release branch.
2. If main issue appears post-merge, create hotfix/* from main.
3. Merge hotfix back into both main and develop.
