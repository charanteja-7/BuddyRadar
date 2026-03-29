"use client";

import "leaflet/dist/leaflet.css";

import { useEffect } from "react";
import { Circle, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";

import type { FriendPresence, RoutePoint } from "@/lib/types";

const defaultCenter: [number, number] = [37.7749, -122.4194];

const userMarker = (color: string, avatar: string) =>
  L.divIcon({
    className: "buddy-marker",
    html: `<div class=\"buddy-marker__bubble\" style=\"background:${color}\">${avatar}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });

type LiveMapProps = {
  me?: FriendPresence;
  friends: FriendPresence[];
  selectedFriendId: string | null;
  onSelectFriend: (friendId: string) => void;
  focusTarget?: {
    key: number;
    lat: number;
    lng: number;
    zoom: number;
  };
  routeTrail?: RoutePoint[];
  geofence?: {
    enabled: boolean;
    center: { lat: number; lng: number };
    radiusMeters: number;
  };
};

function MapFocusController({
  focusTarget,
}: {
  focusTarget?: { key: number; lat: number; lng: number; zoom: number };
}) {
  const map = useMap();

  useEffect(() => {
    if (!focusTarget) {
      return;
    }

    map.flyTo([focusTarget.lat, focusTarget.lng], focusTarget.zoom, {
      duration: 1.2,
    });
  }, [focusTarget, map]);

  return null;
}

export function LiveMap({
  me,
  friends,
  selectedFriendId,
  onSelectFriend,
  focusTarget,
  routeTrail,
  geofence,
}: LiveMapProps) {
  const center = me ? ([me.location.lat, me.location.lng] as [number, number]) : defaultCenter;
  const uniqueFriends = Array.from(
    friends.reduce((acc, friend) => {
      acc.set(friend.user.id, friend);
      return acc;
    }, new Map<string, FriendPresence>()),
  ).map((entry) => entry[1]);
  const selectedFriend =
    selectedFriendId && uniqueFriends.length > 0
      ? uniqueFriends.find((friend) => friend.user.id === selectedFriendId)
      : null;

  return (
    <MapContainer center={center} zoom={13} className="live-map" scrollWheelZoom>
      <MapFocusController focusTarget={focusTarget} />
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {me ? (
        <Marker
          key={me.user.id}
          position={[me.location.lat, me.location.lng]}
          icon={userMarker(me.user.color, me.user.avatar)}
        >
          <Popup>You are here</Popup>
        </Marker>
      ) : null}

      {uniqueFriends.map((friend) => (
        <Marker
          key={friend.user.id}
          position={[friend.location.lat, friend.location.lng]}
          icon={userMarker(friend.user.color, friend.user.avatar)}
          eventHandlers={{
            click: () => {
              onSelectFriend(friend.user.id);
            },
          }}
        >
          <Popup>{friend.user.displayName}</Popup>
        </Marker>
      ))}

      {me && selectedFriend ? (
        <Polyline
          positions={[
            [me.location.lat, me.location.lng],
            [selectedFriend.location.lat, selectedFriend.location.lng],
          ]}
          pathOptions={{
            color: "#6c63ff",
            weight: 2.5,
            opacity: 0.9,
            dashArray: "10 14",
          }}
        />
      ) : null}

      {routeTrail && routeTrail.length > 1 ? (
        <Polyline
          positions={routeTrail.map((point) => [point.lat, point.lng])}
          pathOptions={{
            color: "#00d2ff",
            weight: 2,
            opacity: 0.75,
          }}
        />
      ) : null}

      {geofence?.enabled ? (
        <Circle
          center={[geofence.center.lat, geofence.center.lng]}
          radius={geofence.radiusMeters}
          pathOptions={{
            color: "#ff6b6b",
            weight: 2,
            opacity: 0.7,
            fillOpacity: 0.08,
          }}
        />
      ) : null}
    </MapContainer>
  );
}
