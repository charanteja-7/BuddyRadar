import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

import { firebaseStore } from "@/lib/firebase/client";

type FriendIdsSubscriber = (friendIds: string[]) => void;
const INVITE_CODE_LENGTH = 8;
const MAX_INVITE_GENERATION_ATTEMPTS = 6;

function createInviteCode(length = INVITE_CODE_LENGTH): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < length; i += 1) {
    const index = Math.floor(Math.random() * alphabet.length);
    code += alphabet[index];
  }
  return code;
}

function friendshipDocId(a: string, b: string): string {
  return [a, b].sort().join("__");
}

export async function createFriendInvite(
  ownerId: string,
  options?: { expiresInMinutes?: number },
): Promise<{ code: string; shareUrl: string }> {
  if (!ownerId.trim()) {
    throw new Error("Missing owner id.");
  }

  let code = "";
  let inviteRef = doc(firebaseStore(), "invites", "placeholder");
  for (let attempt = 0; attempt < MAX_INVITE_GENERATION_ATTEMPTS; attempt += 1) {
    code = createInviteCode();
    inviteRef = doc(firebaseStore(), "invites", code);
    const existing = await getDoc(inviteRef);
    if (!existing.exists()) {
      break;
    }
    if (attempt === MAX_INVITE_GENERATION_ATTEMPTS - 1) {
      throw new Error("Could not allocate unique invite code.");
    }
  }

  const expiresInMinutes = options?.expiresInMinutes ?? 24 * 60;
  if (expiresInMinutes <= 0) {
    throw new Error("Invalid invite expiry.");
  }

  const expiresAtMs = Date.now() + expiresInMinutes * 60 * 1000;

  await setDoc(inviteRef, {
    code,
    ownerId,
    expiresAtMs,
    createdAt: serverTimestamp(),
    status: "active",
  });

  const baseUrl = typeof window === "undefined" ? "" : window.location.origin;
  return {
    code,
    shareUrl: baseUrl ? `${baseUrl}/?invite=${code}` : `/?invite=${code}`,
  };
}

export async function redeemFriendInvite(
  code: string,
  userId: string,
): Promise<{ ownerId: string }> {
  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode || normalizedCode.length !== INVITE_CODE_LENGTH) {
    throw new Error("Invalid invite code format.");
  }
  if (!userId.trim()) {
    throw new Error("Missing user id.");
  }

  const inviteRef = doc(firebaseStore(), "invites", normalizedCode);
  const inviteSnap = await getDoc(inviteRef);

  if (!inviteSnap.exists()) {
    throw new Error("Invite code not found.");
  }

  const invite = inviteSnap.data() as {
    ownerId: string;
    expiresAtMs: number;
    status?: string;
  };

  if (invite.status && invite.status !== "active") {
    throw new Error("Invite is no longer active.");
  }

  if (Date.now() > invite.expiresAtMs) {
    throw new Error("Invite has expired.");
  }

  if (invite.ownerId === userId) {
    throw new Error("You cannot redeem your own invite.");
  }

  const friendshipId = friendshipDocId(invite.ownerId, userId);
  await setDoc(
    doc(firebaseStore(), "friendships", friendshipId),
    {
      users: [invite.ownerId, userId],
      createdAt: serverTimestamp(),
      sourceInviteCode: normalizedCode,
    },
    { merge: true },
  );

  return { ownerId: invite.ownerId };
}

export function subscribeFriendIds(userId: string, subscriber: FriendIdsSubscriber): () => void {
  const friendshipsQuery = query(
    collection(firebaseStore(), "friendships"),
    where("users", "array-contains", userId),
  );

  return onSnapshot(friendshipsQuery, (snapshot) => {
    const ids = snapshot.docs
      .map((docSnap) => {
        const data = docSnap.data() as { users?: string[] };
        const users = data.users ?? [];
        return users.find((id) => id !== userId) ?? null;
      })
      .filter((id): id is string => Boolean(id));

    subscriber(Array.from(new Set(ids)));
  });
}
