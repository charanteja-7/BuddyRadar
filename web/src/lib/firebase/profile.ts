import { User } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { pickDeterministicAvatar, pickDeterministicColor } from "@/lib/constants";
import { firebaseStore } from "@/lib/firebase/client";
import type { UserProfile } from "@/lib/types";

type FirestoreUserProfile = UserProfile & {
  email?: string;
  photoURL?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

const profileCache = new Map<string, { profile: UserProfile; expiresAt: number }>();
const PROFILE_CACHE_TTL_MS = 60_000;

function omitUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const cached = profileCache.get(uid);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.profile;
  }

  const snap = await getDoc(doc(firebaseStore(), "users", uid));
  if (!snap.exists()) {
    return null;
  }

  const data = snap.data() as FirestoreUserProfile;
  const profile = {
    id: uid,
    displayName: data.displayName,
    avatar: data.avatar,
    color: data.color,
    email: data.email,
    photoURL: data.photoURL,
  };

  profileCache.set(uid, { profile, expiresAt: Date.now() + PROFILE_CACHE_TTL_MS });
  return profile;
}

export async function getUserProfilesByIds(ids: string[]): Promise<Record<string, UserProfile>> {
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) {
    return {};
  }

  const docs = await Promise.all(
    uniqueIds.map(async (id) => {
      const profile = await getUserProfile(id);
      return [id, profile] as const;
    }),
  );

  const profiles: Record<string, UserProfile> = {};
  docs.forEach(([id, profile]) => {
    if (profile) {
      profiles[id] = profile;
    }
  });

  return profiles;
}

export async function upsertUserProfile(
  authUser: User,
  profilePatch: Partial<Pick<UserProfile, "displayName" | "avatar" | "color">>,
): Promise<UserProfile> {
  const fallbackName = authUser.displayName ?? authUser.email?.split("@")[0] ?? "Guest";
  const displayName = profilePatch.displayName?.trim() || fallbackName;
  const avatar = profilePatch.avatar ?? pickDeterministicAvatar(authUser.uid);
  const color = profilePatch.color ?? pickDeterministicColor(authUser.uid);

  const userProfile: FirestoreUserProfile = {
    id: authUser.uid,
    displayName,
    avatar,
    color,
    ...(authUser.email ? { email: authUser.email } : {}),
    ...(authUser.photoURL ? { photoURL: authUser.photoURL } : {}),
    updatedAt: serverTimestamp(),
  };

  // ADD this
  const firestoreData = Object.fromEntries(
    Object.entries({
      ...userProfile,
      createdAt: serverTimestamp(),
    }).filter(([, value]) => value !== undefined)
  );

  await setDoc(
    doc(firebaseStore(), "users", authUser.uid),
    firestoreData,
    { merge: true },
  );

  const profile = {
    id: authUser.uid,
    displayName,
    avatar,
    color,
    email: authUser.email ?? undefined,
    photoURL: authUser.photoURL ?? undefined,
  };

  profileCache.set(authUser.uid, { profile, expiresAt: Date.now() + PROFILE_CACHE_TTL_MS });
  return profile;
}
