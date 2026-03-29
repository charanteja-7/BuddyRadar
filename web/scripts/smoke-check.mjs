import { access, readFile } from "node:fs/promises";
import process from "node:process";

const requiredFiles = [
  "src/app/page.tsx",
  "src/app/layout.tsx",
  "src/app/manifest.ts",
  "src/app/api/health/route.ts",
  "src/app/api/telemetry/route.ts",
  "public/sw.js",
  "public/offline.html",
  "firebase/firestore.rules",
  "firebase/database.rules.json",
  ".env.example",
];

const requiredEnvKeys = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_DATABASE_URL",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
];

async function main() {
  for (const file of requiredFiles) {
    try {
      await access(file);
    } catch {
      throw new Error(`Missing required file: ${file}`);
    }
  }

  const envContent = await readFile(".env.example", "utf8");
  for (const key of requiredEnvKeys) {
    if (!envContent.includes(`${key}=`)) {
      throw new Error(`Missing required env key in .env.example: ${key}`);
    }
  }

  console.log("Smoke check passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Smoke check failed.");
  process.exit(1);
});
