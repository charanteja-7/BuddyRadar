const requiredClientEnv = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_DATABASE_URL",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
] as const;

export type FirebaseEnvKey = (typeof requiredClientEnv)[number];

// ❌ DO NOT use dynamic access like process.env[name]
// ✅ Use direct access instead

export function hasFirebaseEnv(): boolean {
  if (typeof window === "undefined") {
    return true; // avoid SSR mismatch
  }

  return Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
      process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL &&
      process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  );
}