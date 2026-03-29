# Free Deployment Setup

This repository now includes a new web app at web using Next.js + TypeScript.

## 1) Firebase (Spark Free Tier)

1. Create a Firebase project.
2. Enable Authentication:
- Email link
- Google (optional)
3. Create Firestore and Realtime Database in test mode temporarily.
4. Replace temporary rules using:
- web/firebase/firestore.rules
- web/firebase/database.rules.json
5. Add web app credentials to web/.env.local.

## 2) Vercel (Hobby Free Tier)

1. Import repository into Vercel.
2. Set root directory to web.
3. Add environment variables from web/.env.example.
4. Enable preview deployments for pull requests.
5. Set production branch to main.

## 3) CI Quality Gate

GitHub Actions workflow at .github/workflows/web-ci.yml validates:
- lint
- typecheck
- build

## 4) Cost Guardrails

1. Configure Firebase usage alerts for reads/writes/storage.
2. Add monthly quota dashboard checks.
3. Keep realtime writes throttled client-side.
4. Use release branch smoke tests before main deploys.
