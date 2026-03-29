export function haversineKm(la1: number, lo1: number, la2: number, lo2: number): number {
  const radiusKm = 6371;
  const dLat = ((la2 - la1) * Math.PI) / 180;
  const dLon = ((lo2 - lo1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((la1 * Math.PI) / 180) *
      Math.cos((la2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return radiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(km: number): { main: string; sub: string } {
  if (km < 1) {
    const meters = Math.round(km * 1000);
    const feet = (km * 0.621371 * 1000).toFixed(0);
    return {
      main: `${meters} m`,
      sub: `${feet} ft away`,
    };
  }

  return {
    main: `${km.toFixed(1)} km`,
    sub: `${(km * 0.621371).toFixed(1)} mi away`,
  };
}

export function relativeTime(ts: number): string {
  const seconds = (Date.now() - ts) / 1000;
  if (seconds < 10) {
    return "just now";
  }
  if (seconds < 60) {
    return `${Math.floor(seconds)}s ago`;
  }
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m ago`;
  }
  return `${Math.floor(seconds / 3600)}h ago`;
}
