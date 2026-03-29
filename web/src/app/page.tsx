"use client";

import dynamic from "next/dynamic";
import { User } from "firebase/auth";
import { useEffect, useMemo, useRef, useState } from "react";

import { AuthCard } from "@/features/auth/auth-card";
import { JoinCard } from "@/features/join/join-card";
import { PwaRuntime } from "@/features/pwa/pwa-runtime";
import { hasFirebaseEnv } from "@/lib/env";
import { formatDistance, haversineKm, relativeTime } from "@/lib/geo";
import {
  loginAsGuest,
  loginWithGoogle,
  logoutCurrentUser,
  subscribeToAuth,
} from "@/lib/firebase/auth";
import {
  createFriendInvite,
  redeemFriendInvite,
  subscribeFriendIds,
} from "@/lib/firebase/friendships";
import { getUserProfile, getUserProfilesByIds, upsertUserProfile } from "@/lib/firebase/profile";
import {
  configurePresenceLifecycle,
  setMyPresence,
  subscribeConnectionState,
  subscribeFriendRealtimeRecords,
  writeMyLocation,
} from "@/lib/firebase/realtime";
import { trackError, trackEvent } from "@/lib/observability/telemetry";
import type {
  FriendPresence,
  GeofenceSettings,
  NotificationItem,
  RoutePoint,
  SessionModeState,
} from "@/lib/types";

const LOCATION_HEARTBEAT_MS = 20_000;
const MIN_LOCATION_WRITE_INTERVAL_MS = 8_000;
const MIN_LOCATION_DELTA_METERS = 12;
const OFFLINE_SNAPSHOT_KEY = "buddy-offline-snapshot-v1";
const SESSION_TRAIL_RETENTION_MS = 2 * 60 * 60 * 1000;
const SESSION_TRAIL_MIN_METERS = 10;
const SNAPSHOT_WRITE_INTERVAL_MS = 30_000;
const MAX_NOTIFICATIONS = 30;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type OfflineSnapshot = {
  me: FriendPresence | null;
  friends: FriendPresence[];
  savedAt: number;
};

function metersBetweenPoints(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const earthRadiusMeters = 6371e3;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const LiveMap = dynamic(() => import("@/features/map/live-map").then((module) => module.LiveMap), {
  ssr: false,
});

export default function Home() {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authActionLoading, setAuthActionLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [me, setMe] = useState<FriendPresence | null>(null);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number; ts: number } | null>(
    null,
  );
  const [friends, setFriends] = useState<FriendPresence[]>([]);
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [focusTarget, setFocusTarget] = useState<{
    key: number;
    lat: number;
    lng: number;
    zoom: number;
  }>();
  const [profileLoading, setProfileLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [offlineSnapshot, setOfflineSnapshot] = useState<OfflineSnapshot | null>(null);
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);
  const [generatedInvite, setGeneratedInvite] = useState<{ code: string; shareUrl: string } | null>(
    null,
  );
  const [sharingPaused, setSharingPaused] = useState(false);
  const [shareMinutes, setShareMinutes] = useState<number>(0);
  const [shareUntilMs, setShareUntilMs] = useState<number | null>(null);
  const [sessionMode, setSessionMode] = useState<SessionModeState>({
    name: "",
    active: false,
    startedAt: null,
  });
  const [routeTrail, setRouteTrail] = useState<RoutePoint[]>([]);
  const [geofence, setGeofence] = useState<GeofenceSettings>({
    enabled: false,
    radiusMeters: 200,
    targetFriendId: null,
  });
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const profileCacheRef = useRef<Record<string, FriendPresence["user"]>>({});
  const lastPublishedRef = useRef<{ lat: number; lng: number; ts: number } | null>(null);
  const geofenceInsideRef = useRef<Record<string, boolean>>({});
  const lastSnapshotWriteAtRef = useRef<number>(0);
  const friendIdsRef = useRef<string[]>([]);


 const [firebaseReady, setFirebaseReady] = useState(false);
const [envChecked, setEnvChecked] = useState(false);
const [hydrated, setHydrated] = useState(false);

useEffect(() => {
  setHydrated(true);
  setFirebaseReady(hasFirebaseEnv());
  setEnvChecked(true);
}, []);


useEffect(() => {
  if (!firebaseReady) {
    setAuthLoading(false);
    trackEvent("firebase_env_missing");
    return;
  }

  const unsubscribe = subscribeToAuth((user) => {
    setAuthUser(user);
    setAuthLoading(false);
    setAuthError(null);
    trackEvent(user ? "auth_session_restored" : "auth_session_empty");
  });

  return () => {
    unsubscribe();
  };
}, [firebaseReady]);

  useEffect(() => {
    if (!firebaseReady || !authUser) {
      setMe(null);
      return;
    }

    let cancelled = false;
    setProfileLoading(true);

    void getUserProfile(authUser.uid)
      .then((profile) => {
        if (cancelled || !profile) {
          return;
        }

        setMe({
          user: profile,
          location: {
            userId: profile.id,
            lat: 37.7749,
            lng: -122.4194,
            ts: Date.now(),
          },
          online: true,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setAuthError("Could not load profile. Please try again.");
          trackError(new Error("profile_load_failed"), {
            uid: authUser.uid,
          });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setProfileLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authUser, firebaseReady]);

  const meAndFriends = useMemo(() => {
    if (!me) {
      return { me: undefined, friends: [] as FriendPresence[] };
    }

    const meWithLiveLocation = myLocation
      ? {
          ...me,
          location: {
            userId: me.user.id,
            lat: myLocation.lat,
            lng: myLocation.lng,
            ts: myLocation.ts,
          },
        }
      : me;

    return {
      me: meWithLiveLocation,
      friends,
    };
  }, [friends, me, myLocation]);

  const selectedFriend = useMemo(() => {
    if (!selectedFriendId) {
      return null;
    }
    return friends.find((friend) => friend.user.id === selectedFriendId) ?? null;
  }, [friends, selectedFriendId]);

  const selectedDistance = useMemo(() => {
    if (!meAndFriends.me || !selectedFriend) {
      return null;
    }
    const km = haversineKm(
      meAndFriends.me.location.lat,
      meAndFriends.me.location.lng,
      selectedFriend.location.lat,
      selectedFriend.location.lng,
    );
    return formatDistance(km);
  }, [meAndFriends.me, selectedFriend]);

  const installAvailable = Boolean(installPromptEvent);
  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications],
  );
  const sharingEnabled = useMemo(() => {
    if (sharingPaused) {
      return false;
    }
    if (!shareUntilMs) {
      return true;
    }
    return Date.now() < shareUntilMs;
  }, [shareUntilMs, sharingPaused]);

  function pushNotification(title: string, message: string): void {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setNotifications((prev) =>
      [{ id, title, message, ts: Date.now(), read: false }, ...prev].slice(0, MAX_NOTIFICATIONS),
    );
    trackEvent("notification_created", { title });
  }

  useEffect(() => {
    trackEvent(isOffline ? "network_offline" : "network_online");
  }, [isOffline]);

  useEffect(() => {
    if (!notificationPanelOpen) {
      return;
    }

    setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })));
  }, [notificationPanelOpen]);

  useEffect(() => {
    if (!sessionMode.active || !myLocation) {
      return;
    }

    setRouteTrail((prev) => {
      const now = Date.now();
      const recent = prev.filter((point) => now - point.ts <= SESSION_TRAIL_RETENTION_MS);
      const lastPoint = recent[recent.length - 1];
      if (!lastPoint) {
        return [...recent, myLocation];
      }

      const movedMeters = metersBetweenPoints(
        lastPoint.lat,
        lastPoint.lng,
        myLocation.lat,
        myLocation.lng,
      );
      if (movedMeters < SESSION_TRAIL_MIN_METERS) {
        return recent;
      }

      return [...recent, myLocation];
    });
  }, [myLocation, sessionMode.active]);

  useEffect(() => {
    if (!geofence.enabled || !geofence.targetFriendId || !myLocation) {
      return;
    }

    const target = friends.find((friend) => friend.user.id === geofence.targetFriendId);
    if (!target) {
      return;
    }

    const meters =
      haversineKm(myLocation.lat, myLocation.lng, target.location.lat, target.location.lng) * 1000;
    const inside = meters <= geofence.radiusMeters;
    const prevInside = geofenceInsideRef.current[target.user.id];

    if (prevInside === undefined) {
      geofenceInsideRef.current[target.user.id] = inside;
      return;
    }

    if (!prevInside && inside) {
      trackEvent("geofence_enter", {
        targetFriendId: target.user.id,
        radiusMeters: geofence.radiusMeters,
      });
      pushNotification(
        "Geofence Entered",
        `${target.user.displayName} is now within ${geofence.radiusMeters}m of your location.`,
      );
    }

    if (prevInside && !inside) {
      trackEvent("geofence_exit", {
        targetFriendId: target.user.id,
        radiusMeters: geofence.radiusMeters,
      });
      pushNotification(
        "Geofence Exited",
        `${target.user.displayName} moved outside your ${geofence.radiusMeters}m alert zone.`,
      );
    }

    geofenceInsideRef.current[target.user.id] = inside;
  }, [friends, geofence, myLocation]);

  useEffect(() => {
    if (!shareUntilMs) {
      return;
    }

    const timer = setInterval(() => {
      if (Date.now() >= shareUntilMs) {
        setSharingPaused(true);
        setShareUntilMs(null);
      }
    }, 5_000);

    return () => clearInterval(timer);
  }, [shareUntilMs]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(OFFLINE_SNAPSHOT_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as OfflineSnapshot;
      if (!parsed || !parsed.savedAt) {
        return;
      }
      setOfflineSnapshot(parsed);
    } catch {
      // Ignore malformed cache.
    }
  }, []);

  useEffect(() => {
    if (!me) {
      return;
    }

    const now = Date.now();
    if (now - lastSnapshotWriteAtRef.current < SNAPSHOT_WRITE_INTERVAL_MS) {
      return;
    }
    lastSnapshotWriteAtRef.current = now;

    const snapshot: OfflineSnapshot = {
      me,
      friends,
      savedAt: now,
    };

    setOfflineSnapshot((previous) => {
      if (previous && previous.savedAt === snapshot.savedAt) {
        return previous;
      }
      return snapshot;
    });
    try {
      localStorage.setItem(OFFLINE_SNAPSHOT_KEY, JSON.stringify(snapshot));
    } catch {
      // Ignore storage failures.
    }
  }, [friends, me]);

  useEffect(() => {
    if (!firebaseReady) {
      setIsConnected(null);
      return;
    }

    const unsubscribe = subscribeConnectionState((online) => {
      setIsConnected(online);
    });

    return () => {
      unsubscribe();
    };
  }, [firebaseReady]);

  useEffect(() => {
    const authUid = authUser?.uid;
    const meId = me?.user.id;
    const initialLat = me?.location.lat;
    const initialLng = me?.location.lng;

    if (!authUid || !meId || initialLat === undefined || initialLng === undefined) {
      return;
    }

    if (!sharingEnabled) {
      void setMyPresence(authUid, false);
      return;
    }

    let cancelled = false;
    let teardownPresence = () => {
      // no-op until configured
    };
    let watchId: number | null = null;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

    void configurePresenceLifecycle(authUid)
      .then((teardown) => {
        if (cancelled) {
          teardown();
          return;
        }
        teardownPresence = teardown;
      })
      .catch(() => {
        if (!cancelled) {
          setAuthError("Failed to configure presence status.");
          trackError(new Error("presence_lifecycle_failed"), { uid: authUid });
        }
      });

    const publishLocation = (lat: number, lng: number, force = false): void => {
      const ts = Date.now();
      const lastPublished = lastPublishedRef.current;
      const enoughTimeElapsed =
        !lastPublished || ts - lastPublished.ts >= MIN_LOCATION_WRITE_INTERVAL_MS;
      const movedEnough =
        !lastPublished ||
        metersBetweenPoints(lastPublished.lat, lastPublished.lng, lat, lng) >=
          MIN_LOCATION_DELTA_METERS;

      if (!force && !(enoughTimeElapsed && movedEnough)) {
        return;
      }

      lastPublishedRef.current = { lat, lng, ts };
      setMyLocation((previous) => {
        if (previous && previous.lat === lat && previous.lng === lng) {
          return previous;
        }
        return { lat, lng, ts };
      });
      void writeMyLocation(authUid, { lat, lng, ts });
    };

    publishLocation(initialLat, initialLng, true);

    heartbeatTimer = setInterval(() => {
      const latest = lastPublishedRef.current;
      if (!latest) {
        return;
      }
      publishLocation(latest.lat, latest.lng, true);
    }, LOCATION_HEARTBEAT_MS);

    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          publishLocation(position.coords.latitude, position.coords.longitude);
        },
        () => {
          setAuthError("Location permission is required for live sharing.");
          trackEvent("geolocation_watch_error");
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10_000,
          timeout: 20_000,
        },
      );
    }

    return () => {
      cancelled = true;
      teardownPresence();
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
      }
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [authUser?.uid, me?.location.lat, me?.location.lng, me?.user.id, sharingEnabled]);

  useEffect(() => {
    if (!authUser) {
      setFriendIds([]);
      friendIdsRef.current = [];
      setGeofence((prev) => ({ ...prev, enabled: false, targetFriendId: null }));
      return;
    }

    const unsubscribe = subscribeFriendIds(authUser.uid, (ids) => {
      setFriendIds(ids);
      friendIdsRef.current = ids;
    });

    return () => {
      unsubscribe();
    };
  }, [authUser]);

  useEffect(() => {
    if (!authUser) {
      setFriends([]);
      setFriendIds([]);
      friendIdsRef.current = [];
      setSelectedFriendId(null);
      setSessionMode({ name: "", active: false, startedAt: null });
      setRouteTrail([]);
      setNotifications([]);
      setGeofence({ enabled: false, radiusMeters: 200, targetFriendId: null });
      profileCacheRef.current = {};
      return;
    }

    let cancelled = false;
    const unsubscribe = subscribeFriendRealtimeRecords(
      authUser.uid,
      (records) => {
        void (async () => {
          const missingUserIds = records
            .map((record) => record.userId)
            .filter((id) => !profileCacheRef.current[id]);

          if (missingUserIds.length > 0) {
            const fetchedProfiles = await getUserProfilesByIds(missingUserIds);
            profileCacheRef.current = {
              ...profileCacheRef.current,
              ...fetchedProfiles,
            };
          }

          if (cancelled) {
            return;
          }

          const friendIdSet = new Set(friendIdsRef.current);
          const friendList: FriendPresence[] = records
            .filter((record) => friendIdSet.has(record.userId))
            .map((record) => {
              const profile = profileCacheRef.current[record.userId];
              if (!profile) {
                return null;
              }

              return {
                user: profile,
                location: {
                  userId: record.userId,
                  lat: record.lat,
                  lng: record.lng,
                  ts: record.ts,
                },
                online: record.online,
              };
            })
            .filter((friend): friend is FriendPresence => Boolean(friend));

          setFriends(friendList);
          if (
            selectedFriendId &&
            !friendList.some((friend) => friend.user.id === selectedFriendId)
          ) {
            setSelectedFriendId(null);
          }
          if (
            geofence.targetFriendId &&
            !friendList.some((friend) => friend.user.id === geofence.targetFriendId)
          ) {
            setGeofence((prev) => ({ ...prev, enabled: false, targetFriendId: null }));
          }
        })();
      },
      { staleMs: 2 * 60 * 1000 },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [authUser]);

  useEffect(() => {
    if (!selectedFriend) {
      return;
    }

    setFocusTarget({
      key: Date.now(),
      lat: selectedFriend.location.lat,
      lng: selectedFriend.location.lng,
      zoom: 14,
    });
  }, [selectedFriend]);

  async function handleLoginWithGoogle(): Promise<void> {
    setAuthActionLoading(true);
    setAuthError(null);
    trackEvent("auth_login_google_attempt");
    try {
      await loginWithGoogle();
      trackEvent("auth_login_google_success");
    } catch {
      setAuthError("Google sign-in failed. Ensure Firebase auth provider is enabled.");
      trackError(new Error("auth_login_google_failed"));
    } finally {
      setAuthActionLoading(false);
    }
  }

  async function handleGuestLogin(): Promise<void> {
    setAuthActionLoading(true);
    setAuthError(null);
    trackEvent("auth_login_guest_attempt");
    try {
      await loginAsGuest();
      trackEvent("auth_login_guest_success");
    } catch {
      setAuthError("Guest sign-in failed. Check your Firebase configuration.");
      trackError(new Error("auth_login_guest_failed"));
    } finally {
      setAuthActionLoading(false);
    }
  }

  async function handleInstallApp(): Promise<void> {
    if (!installPromptEvent) {
      return;
    }

    await installPromptEvent.prompt();
    await installPromptEvent.userChoice;
    setInstallPromptEvent(null);
    trackEvent("pwa_install_prompt_handled");
  }

  async function handleCreateInvite(): Promise<void> {
    if (!authUser) {
      return;
    }

    setInviteStatus(null);
    try {
      const invite = await createFriendInvite(authUser.uid, { expiresInMinutes: 24 * 60 });
      setGeneratedInvite(invite);
      setInviteStatus(`Invite ${invite.code} created. Share the link with a friend.`);
      trackEvent("invite_created", { code: invite.code });
    } catch {
      setInviteStatus("Failed to generate invite. Please try again.");
      trackError(new Error("invite_create_failed"), { uid: authUser.uid });
    }
  }

  async function handleRedeemInvite(): Promise<void> {
    if (!authUser || !inviteCodeInput.trim()) {
      return;
    }

    setInviteStatus(null);
    try {
      await redeemFriendInvite(inviteCodeInput.trim(), authUser.uid);
      setInviteCodeInput("");
      setInviteStatus("Invite redeemed. New friend connection created.");
      trackEvent("invite_redeemed");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invite redemption failed.";
      setInviteStatus(message);
      trackError(error, { action: "invite_redeem" });
    }
  }

  async function handleCopyInvite(): Promise<void> {
    if (!generatedInvite) {
      return;
    }

    try {
      await navigator.clipboard.writeText(generatedInvite.shareUrl);
      setInviteStatus("Invite link copied to clipboard.");
      trackEvent("invite_link_copied");
    } catch {
      setInviteStatus("Copy failed. Manually copy the invite link from the field.");
      trackError(new Error("invite_copy_failed"));
    }
  }

  function startSessionMode(): void {
    if (!sessionMode.name.trim()) {
      pushNotification("Session Mode", "Give your session a name before starting.");
      trackEvent("session_start_blocked_missing_name");
      return;
    }

    setSessionMode((prev) => ({ ...prev, active: true, startedAt: Date.now() }));
    setRouteTrail((prev) => (prev.length > 0 ? prev : myLocation ? [myLocation] : prev));
    trackEvent("session_started", { name: sessionMode.name });
    pushNotification(
      "Session Started",
      `Session "${sessionMode.name}" is now tracking route breadcrumbs.`,
    );
  }

  function stopSessionMode(): void {
    setSessionMode((prev) => ({ ...prev, active: false }));
    trackEvent("session_stopped");
    pushNotification("Session Stopped", "Session mode paused. Breadcrumb trail is preserved.");
  }

  function clearSessionTrail(): void {
    setRouteTrail([]);
    trackEvent("session_trail_cleared");
    pushNotification("Session Trail Cleared", "Stored breadcrumbs were removed.");
  }

  function applyGeofenceForSelectedFriend(): void {
    if (!selectedFriendId) {
      pushNotification("Geofence", "Select a friend to enable geofence alerts.");
      trackEvent("geofence_apply_blocked_no_selection");
      return;
    }

    setGeofence((prev) => ({
      ...prev,
      enabled: true,
      targetFriendId: selectedFriendId,
    }));
    geofenceInsideRef.current = {};
    const targetName = friends.find((friend) => friend.user.id === selectedFriendId)?.user
      .displayName;
    trackEvent("geofence_enabled", {
      targetFriendId: selectedFriendId,
      radiusMeters: geofence.radiusMeters,
    });
    pushNotification("Geofence Active", `Alerts enabled for ${targetName ?? "selected friend"}.`);
  }

  function disableGeofence(): void {
    setGeofence((prev) => ({ ...prev, enabled: false, targetFriendId: null }));
    geofenceInsideRef.current = {};
    trackEvent("geofence_disabled");
    pushNotification("Geofence Disabled", "Friend proximity alerts are now off.");
  }
if (!hydrated) {
  return (
    <>
      <PwaRuntime onInstallPromptReady={setInstallPromptEvent} onOfflineChange={setIsOffline} />
      <main className="screen screen--centered">
        <section className="auth-card">
          <h1>Loading...</h1>
        </section>
      </main>
    </>
  );
}
  if (!firebaseReady) {
    return (
      <>
        <PwaRuntime onInstallPromptReady={setInstallPromptEvent} onOfflineChange={setIsOffline} />
        <main className="screen screen--centered" >
          <section className="auth-card" aria-label="Firebase setup required">
            <h1>Firebase setup required</h1>
            <p>Add your credentials in .env.local using .env.example, then restart the web app.</p>
          </section>
        </main>
      </>
    );
  }

  if (isOffline && !authUser && offlineSnapshot?.me) {
    return (
      <>
        <PwaRuntime onInstallPromptReady={setInstallPromptEvent} onOfflineChange={setIsOffline} />
        <main className="screen screen--map">
          <section className="top-bar">
            <div>
              <h1>BuddyLocation</h1>
              <p className="top-bar__sub">
                Offline snapshot from {relativeTime(offlineSnapshot.savedAt)}
              </p>
            </div>
            <div className="top-bar__actions">
              {installAvailable ? (
                <button
                  type="button"
                  className="top-bar__install"
                  onClick={() => void handleInstallApp()}
                >
                  Install App
                </button>
              ) : null}
            </div>
          </section>

          <div className="network-banner network-banner--offline">
            You are offline. Showing cached map and friend data.
          </div>

          <section className="content-grid">
            <aside className="friends-panel">
              <h2>Cached Friends</h2>
              {offlineSnapshot.friends.length === 0 ? (
                <p className="friends-panel__empty">No cached friends available.</p>
              ) : (
                <ul>
                  {offlineSnapshot.friends.map((friend) => (
                    <li key={friend.user.id}>
                      <span>{friend.user.avatar}</span>
                      <div>
                        <p>{friend.user.displayName}</p>
                        <small>{relativeTime(friend.location.ts)}</small>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </aside>

            <section className="map-panel">
              <LiveMap
                me={offlineSnapshot.me}
                friends={offlineSnapshot.friends}
                selectedFriendId={selectedFriendId}
                onSelectFriend={setSelectedFriendId}
                focusTarget={focusTarget}
              />
            </section>
          </section>
        </main>
      </>
    );
  }

  if (authLoading) {
    return (
      <>
        <PwaRuntime onInstallPromptReady={setInstallPromptEvent} onOfflineChange={setIsOffline} />
        <main className="screen screen--centered" >
          <section className="auth-card" aria-label="Loading authentication">
            <h1>Checking session</h1>
            <p>We are validating your account session.</p>
          </section>
        </main>
      </>
    );
  }

  if (!authUser) {
    return (
      <>
        <PwaRuntime onInstallPromptReady={setInstallPromptEvent} onOfflineChange={setIsOffline} />
        <main className="screen screen--centered">
          <div className="aurora-bg" aria-hidden="true">
            <div className="aurora-blob a1" />
            <div className="aurora-blob a2" />
            <div className="aurora-blob a3" />
          </div>
          <AuthCard
            onLoginWithGoogle={handleLoginWithGoogle}
            onContinueAsGuest={handleGuestLogin}
            loading={authActionLoading}
            errorMessage={authError}
          />
        </main>
      </>
    );
  }

  if (!me) {
    return (
      <>
        <PwaRuntime onInstallPromptReady={setInstallPromptEvent} onOfflineChange={setIsOffline} />
        <main className="screen screen--centered">
          <div className="aurora-bg" aria-hidden="true">
            <div className="aurora-blob a1" />
            <div className="aurora-blob a2" />
            <div className="aurora-blob a3" />
          </div>
          {profileLoading ? (
            <section className="auth-card" aria-label="Loading profile">
              <h1>Loading profile</h1>
              <p>Getting your BuddyLocation profile from Firebase.</p>
            </section>
          ) : null}
          <JoinCard
            onJoin={({ avatar, color, displayName }) => {
              void upsertUserProfile(authUser, {
                avatar,
                color,
                displayName,
              }).then((profile) => {
                setMe({
                  user: profile,
                  location: {
                    userId: profile.id,
                    lat: 37.7749,
                    lng: -122.4194,
                    ts: Date.now(),
                  },
                  online: true,
                });
                setMyLocation({ lat: 37.7749, lng: -122.4194, ts: Date.now() });
                lastPublishedRef.current = { lat: 37.7749, lng: -122.4194, ts: Date.now() };
              });
            }}
          />
        </main>
      </>
    );
  }

  return (
    <>
      <PwaRuntime onInstallPromptReady={setInstallPromptEvent} onOfflineChange={setIsOffline} />
      <main className="screen screen--map">
        <section className="top-bar">
          <div>
            <h1>BuddyLocation</h1>
            <p className="top-bar__sub">Signed in as {me.user.displayName}</p>
          </div>
          <div className="top-bar__actions">
            {installAvailable ? (
              <button
                type="button"
                className="top-bar__install"
                onClick={() => void handleInstallApp()}
              >
                Install App
              </button>
            ) : null}
            <button
              type="button"
              className="top-bar__notify"
              onClick={() => {
                setNotificationPanelOpen((prev) => !prev);
                trackEvent("notification_panel_toggled");
              }}
              aria-label="Toggle notifications"
              title="Notifications"
            >
              🔔
              {unreadCount > 0 ? (
                <span className="top-bar__notify-badge">{unreadCount}</span>
              ) : null}
            </button>
            <div className="status-chip" data-ready={isConnected === true ? "true" : "false"}>
              {isConnected === true ? "Realtime connected" : "Realtime reconnecting"}
            </div>
            <div className="status-chip" data-ready={firebaseReady}>
              {firebaseReady ? "Firebase configured" : "Firebase env pending"}
            </div>
            <button
              type="button"
              className="top-bar__signout"
              onClick={() => {
                void logoutCurrentUser();
                trackEvent("auth_sign_out");
                setMe(null);
                setMyLocation(null);
                setFriends([]);
                setFriendIds([]);
                setSelectedFriendId(null);
                setSessionMode({ name: "", active: false, startedAt: null });
                setRouteTrail([]);
                setGeofence({ enabled: false, radiusMeters: 200, targetFriendId: null });
                setNotifications([]);
                setNotificationPanelOpen(false);
                lastPublishedRef.current = null;
                geofenceInsideRef.current = {};
                profileCacheRef.current = {};
              }}
            >
              Sign out
            </button>
          </div>
        </section>

        {isOffline ? (
          <div className="network-banner network-banner--offline">
            You are offline. Live updates paused, cached snapshot still available.
          </div>
        ) : (
          <div className="network-banner network-banner--online">
            Online: realtime updates active.
          </div>
        )}

        <section className="content-grid">
          <aside className="friends-panel">
            <section
              className="friends-panel__actions"
              aria-label="Friend invite and sharing controls"
            >
              <h3>Sharing Controls</h3>
              <div className="share-row">
                <button
                  type="button"
                  className="control-btn"
                  onClick={() => {
                    setSharingPaused((prev) => !prev);
                    trackEvent(sharingPaused ? "sharing_resumed" : "sharing_paused");
                    if (!sharingPaused) {
                      setShareUntilMs(null);
                    }
                  }}
                >
                  {sharingPaused ? "Resume Sharing" : "Pause Sharing"}
                </button>
                <select
                  className="control-select"
                  value={shareMinutes}
                  onChange={(event) => setShareMinutes(Number(event.target.value))}
                >
                  <option value={0}>Always</option>
                  <option value={15}>15 min</option>
                  <option value={60}>60 min</option>
                </select>
                <button
                  type="button"
                  className="control-btn control-btn--ghost"
                  onClick={() => {
                    if (shareMinutes === 0) {
                      setShareUntilMs(null);
                      setSharingPaused(false);
                      trackEvent("sharing_window_set_always");
                      return;
                    }
                    setSharingPaused(false);
                    setShareUntilMs(Date.now() + shareMinutes * 60 * 1000);
                    trackEvent("sharing_window_set_timed", { minutes: shareMinutes });
                  }}
                >
                  Apply
                </button>
              </div>
              <p className="friends-panel__status">
                {sharingEnabled ? "Sharing is active" : "Sharing is paused"}
              </p>

              <h3>Session Mode</h3>
              <div className="share-row">
                <input
                  className="control-input"
                  placeholder="Session name (e.g. Weekend Ride)"
                  value={sessionMode.name}
                  onChange={(event) =>
                    setSessionMode((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                />
                {sessionMode.active ? (
                  <button type="button" className="control-btn" onClick={stopSessionMode}>
                    Stop
                  </button>
                ) : (
                  <button type="button" className="control-btn" onClick={startSessionMode}>
                    Start
                  </button>
                )}
              </div>
              <div className="share-row">
                <button
                  type="button"
                  className="control-btn control-btn--ghost"
                  onClick={clearSessionTrail}
                >
                  Clear Trail
                </button>
                <p className="friends-panel__status">
                  {sessionMode.active
                    ? `Session active${sessionMode.startedAt ? ` since ${relativeTime(sessionMode.startedAt)}` : ""}`
                    : "Session inactive"}
                </p>
              </div>

              <h3>Geofence Alerts</h3>
              <div className="share-row">
                <select
                  className="control-select"
                  value={geofence.radiusMeters}
                  onChange={(event) =>
                    setGeofence((prev) => ({
                      ...prev,
                      radiusMeters: Number(event.target.value),
                    }))
                  }
                >
                  <option value={100}>100 m</option>
                  <option value={200}>200 m</option>
                  <option value={500}>500 m</option>
                  <option value={1000}>1000 m</option>
                </select>
                <button
                  type="button"
                  className="control-btn"
                  onClick={applyGeofenceForSelectedFriend}
                >
                  Alert on Selected
                </button>
                {geofence.enabled ? (
                  <button
                    type="button"
                    className="control-btn control-btn--ghost"
                    onClick={disableGeofence}
                  >
                    Disable
                  </button>
                ) : null}
              </div>
              <p className="friends-panel__status">
                {geofence.enabled
                  ? `Geofence active (${geofence.radiusMeters}m) for ${
                      friends.find((friend) => friend.user.id === geofence.targetFriendId)?.user
                        .displayName ?? "selected friend"
                    }`
                  : "Geofence disabled"}
              </p>

              <h3>Invite Friends</h3>
              <div className="share-row">
                <button
                  type="button"
                  className="control-btn"
                  onClick={() => void handleCreateInvite()}
                >
                  Generate Invite
                </button>
                {generatedInvite ? (
                  <button
                    type="button"
                    className="control-btn control-btn--ghost"
                    onClick={() => void handleCopyInvite()}
                  >
                    Copy Link
                  </button>
                ) : null}
              </div>
              {generatedInvite ? (
                <input
                  className="control-input"
                  readOnly
                  value={generatedInvite.shareUrl}
                  onFocus={(event) => event.currentTarget.select()}
                />
              ) : null}

              <div className="share-row">
                <input
                  className="control-input"
                  placeholder="Enter invite code"
                  value={inviteCodeInput}
                  onChange={(event) => setInviteCodeInput(event.target.value.toUpperCase())}
                />
                <button
                  type="button"
                  className="control-btn"
                  onClick={() => void handleRedeemInvite()}
                >
                  Connect
                </button>
              </div>
              {inviteStatus ? <p className="friends-panel__status">{inviteStatus}</p> : null}
            </section>

            <h2>Online Friends</h2>
            {meAndFriends.friends.length === 0 ? (
              <p className="friends-panel__empty">No friends online yet. Invite someone to join.</p>
            ) : (
              <ul>
                {meAndFriends.friends.map((friend) => {
                  const distance = meAndFriends.me
                    ? formatDistance(
                        haversineKm(
                          meAndFriends.me.location.lat,
                          meAndFriends.me.location.lng,
                          friend.location.lat,
                          friend.location.lng,
                        ),
                      )
                    : null;

                  return (
                    <li
                      key={friend.user.id}
                      className={friend.user.id === selectedFriendId ? "is-selected" : ""}
                      onClick={() => {
                        setSelectedFriendId(friend.user.id);
                      }}
                    >
                      <span>{friend.user.avatar}</span>
                      <div>
                        <p>{friend.user.displayName}</p>
                        <small>{friend.online ? "Online" : "Offline"}</small>
                      </div>
                      <div className="friends-panel__meta">
                        {distance ? <span>{distance.main}</span> : null}
                        <small>{relativeTime(friend.location.ts)}</small>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>

          <section className="map-panel">
            <LiveMap
              me={meAndFriends.me}
              friends={meAndFriends.friends}
              selectedFriendId={selectedFriendId}
              onSelectFriend={setSelectedFriendId}
              focusTarget={focusTarget}
              routeTrail={routeTrail}
              geofence={
                geofence.enabled && meAndFriends.me
                  ? {
                      enabled: true,
                      center: {
                        lat: meAndFriends.me.location.lat,
                        lng: meAndFriends.me.location.lng,
                      },
                      radiusMeters: geofence.radiusMeters,
                    }
                  : undefined
              }
            />

            <button
              type="button"
              className="map-fab"
              onClick={() => {
                if (!meAndFriends.me) {
                  return;
                }
                setFocusTarget({
                  key: Date.now(),
                  lat: meAndFriends.me.location.lat,
                  lng: meAndFriends.me.location.lng,
                  zoom: 15,
                });
              }}
              aria-label="Center map on my location"
              title="Center on me"
            >
              ⌖
            </button>

            {notificationPanelOpen ? (
              <section className="notifications-panel" aria-label="Notification center">
                <h3>Notifications</h3>
                {notifications.length === 0 ? (
                  <p className="notifications-panel__empty">No alerts yet.</p>
                ) : (
                  <ul className="notifications-panel__list">
                    {notifications.map((notification) => (
                      <li key={notification.id} className={notification.read ? "is-read" : ""}>
                        <p>{notification.title}</p>
                        <small>{notification.message}</small>
                        <small className="notifications-panel__time">
                          {relativeTime(notification.ts)}
                        </small>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ) : null}

            {selectedFriend && selectedDistance && meAndFriends.me ? (
              <section className="distance-panel" aria-label="Distance information">
                <button
                  type="button"
                  className="distance-panel__close"
                  onClick={() => setSelectedFriendId(null)}
                  aria-label="Close distance panel"
                >
                  ✕
                </button>
                <div className="distance-panel__avatars">
                  <span>{meAndFriends.me.user.avatar}</span>
                  <span className="distance-panel__connector" />
                  <span>{selectedFriend.user.avatar}</span>
                </div>
                <p className="distance-panel__main">{selectedDistance.main}</p>
                <p className="distance-panel__sub">{selectedDistance.sub}</p>
                <p className="distance-panel__names">
                  {meAndFriends.me.user.displayName} to {selectedFriend.user.displayName}
                </p>
              </section>
            ) : null}
          </section>
        </section>
      </main>
    </>
  );
}
