import {
  GoogleAuthProvider,
  User,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signOut,
} from "firebase/auth";

import { firebaseAuth } from "@/lib/firebase/client";

const googleProvider = new GoogleAuthProvider();

type AuthSubscriber = (user: User | null) => void;

export function subscribeToAuth(subscriber: AuthSubscriber): () => void {
  return onAuthStateChanged(firebaseAuth(), (user) => {
    subscriber(user);
  });
}

export async function loginWithGoogle(): Promise<User> {
  const result = await signInWithPopup(firebaseAuth(), googleProvider);
  return result.user;
}

export async function loginAsGuest(): Promise<User> {
  const result = await signInAnonymously(firebaseAuth());
  return result.user;
}

export async function logoutCurrentUser(): Promise<void> {
  await signOut(firebaseAuth());
}
