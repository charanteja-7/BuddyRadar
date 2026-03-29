export type UserProfile = {
  id: string;
  displayName: string;
  avatar: string;
  color: string;
  email?: string;
  photoURL?: string;
};

export type LocationPing = {
  userId: string;
  lat: number;
  lng: number;
  ts: number;
};

export type PresenceRecord = {
  online: boolean;
  ts: number;
};

export type FriendRealtimeRecord = {
  userId: string;
  lat: number;
  lng: number;
  ts: number;
  online: boolean;
};

export type FriendPresence = {
  user: UserProfile;
  location: LocationPing;
  online: boolean;
};

export type RoutePoint = {
  lat: number;
  lng: number;
  ts: number;
};

export type SessionModeState = {
  name: string;
  active: boolean;
  startedAt: number | null;
};

export type GeofenceSettings = {
  enabled: boolean;
  radiusMeters: number;
  targetFriendId: string | null;
};

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  ts: number;
  read: boolean;
};
