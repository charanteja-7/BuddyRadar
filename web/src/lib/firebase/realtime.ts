import {
  DataSnapshot,
  Unsubscribe,
  get,
  onDisconnect,
  onValue,
  ref as dbRef,
  serverTimestamp,
  set,
} from "firebase/database";

import { firebaseDb } from "@/lib/firebase/client";
import type { FriendRealtimeRecord, LocationPing, PresenceRecord } from "@/lib/types";

type FriendRecordSubscriber = (records: FriendRealtimeRecord[]) => void;
type ConnectionStateSubscriber = (online: boolean) => void;

const DEFAULT_STALE_MS = 2 * 60 * 1000;

function parsePresenceSnapshot(snapshot: DataSnapshot): Record<string, PresenceRecord> {
  const value = snapshot.val() as Record<string, PresenceRecord> | null;
  return value ?? {};
}

function parseLocationSnapshot(
  snapshot: DataSnapshot,
): Record<string, Omit<LocationPing, "userId">> {
  const value = snapshot.val() as Record<string, Omit<LocationPing, "userId">> | null;
  return value ?? {};
}

export async function setMyPresence(uid: string, online: boolean): Promise<void> {
  if (!uid.trim()) {
    throw new Error("Missing uid for presence update.");
  }

  await set(dbRef(firebaseDb(), `presence/${uid}`), {
    online,
    ts: serverTimestamp(),
  });
}

export async function configurePresenceLifecycle(uid: string): Promise<Unsubscribe> {
  const userPresenceRef = dbRef(firebaseDb(), `presence/${uid}`);
  const connectedSnap = await get(dbRef(firebaseDb(), ".info/connected"));

  if (!connectedSnap.val()) {
    await setMyPresence(uid, true);
    return () => {
      void setMyPresence(uid, false);
    };
  }

  await onDisconnect(userPresenceRef).set({
    online: false,
    ts: serverTimestamp(),
  });

  await setMyPresence(uid, true);

  return () => {
    void setMyPresence(uid, false);
  };
}

export async function writeMyLocation(
  uid: string,
  ping: Omit<LocationPing, "userId">,
): Promise<void> {
  if (!uid.trim()) {
    throw new Error("Missing uid for location write.");
  }
  if (!Number.isFinite(ping.lat) || ping.lat < -90 || ping.lat > 90) {
    throw new Error("Invalid latitude value.");
  }
  if (!Number.isFinite(ping.lng) || ping.lng < -180 || ping.lng > 180) {
    throw new Error("Invalid longitude value.");
  }
  if (!Number.isFinite(ping.ts) || ping.ts <= 0) {
    throw new Error("Invalid location timestamp.");
  }

  await set(dbRef(firebaseDb(), `locations/${uid}`), {
    lat: ping.lat,
    lng: ping.lng,
    ts: ping.ts,
  });
}

export function subscribeConnectionState(subscriber: ConnectionStateSubscriber): Unsubscribe {
  return onValue(dbRef(firebaseDb(), ".info/connected"), (snapshot) => {
    subscriber(Boolean(snapshot.val()));
  });
}

export function subscribeFriendRealtimeRecords(
  myUid: string,
  subscriber: FriendRecordSubscriber,
  options?: { staleMs?: number },
): Unsubscribe {
  let presenceByUser: Record<string, PresenceRecord> = {};
  let locationByUser: Record<string, Omit<LocationPing, "userId">> = {};
  const staleMs = options?.staleMs ?? DEFAULT_STALE_MS;
  let previousSignature = "";

  const emit = (): void => {
    const now = Date.now();
    const userIds = new Set<string>([
      ...Object.keys(presenceByUser),
      ...Object.keys(locationByUser),
    ]);

    const dedupedByUser: Record<string, FriendRealtimeRecord> = {};

    userIds.forEach((userId) => {
      if (userId === myUid) {
        return;
      }

      const location = locationByUser[userId];
      const presence = presenceByUser[userId];

      if (!location) {
        return;
      }

      const locationIsStale = now - location.ts > staleMs;
      const presenceIsFresh = presence ? now - presence.ts <= staleMs : false;
      dedupedByUser[userId] = {
        userId,
        lat: location.lat,
        lng: location.lng,
        ts: location.ts,
        online: Boolean(presence?.online) && presenceIsFresh && !locationIsStale,
      };
    });

    const records = Object.values(dedupedByUser).sort((a, b) => {
      if (a.online !== b.online) {
        return a.online ? -1 : 1;
      }
      return b.ts - a.ts;
    });

    const signature = records
      .map(
        (record) =>
          `${record.userId}:${record.lat.toFixed(5)}:${record.lng.toFixed(5)}:${record.ts}:${record.online}`,
      )
      .join("|");
    if (signature === previousSignature) {
      return;
    }
    previousSignature = signature;

    subscriber(records);
  };

  const unsubscribePresence = onValue(dbRef(firebaseDb(), "presence"), (snapshot) => {
    presenceByUser = parsePresenceSnapshot(snapshot);
    emit();
  });

  const unsubscribeLocations = onValue(dbRef(firebaseDb(), "locations"), (snapshot) => {
    locationByUser = parseLocationSnapshot(snapshot);
    emit();
  });

  return () => {
    unsubscribePresence();
    unsubscribeLocations();
  };
}
