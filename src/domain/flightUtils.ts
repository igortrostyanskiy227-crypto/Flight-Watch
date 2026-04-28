import type { Flight, RoutePoint } from "../types";

export function getFlightLabel(flight: Flight): string {
  return flight.flightNumber ?? flight.callsign ?? flight.id;
}

export function getCurrentPoint(flight: Flight): RoutePoint {
  return flight.route[flight.route.length - 1];
}

export function formatClock(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatCoordinate(value: number, axis: "lat" | "lng"): string {
  const suffix = axis === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";
  return `${Math.abs(value).toFixed(4)}° ${suffix}`;
}

export function minutesBetween(left: Date, right: Date): number {
  return Math.max(0, Math.round((left.getTime() - right.getTime()) / 60_000));
}

export function signedDifference(actual: number, planned: number): string {
  const delta = Math.round(actual - planned);
  if (delta > 0) {
    return `+${delta}`;
  }
  return `${delta}`;
}

export function haversineNm(a: Pick<RoutePoint, "lat" | "lng">, b: Pick<RoutePoint, "lat" | "lng">): number {
  const radiusNm = 3440.065;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const deltaLat = toRad(b.lat - a.lat);
  const deltaLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinLat = Math.sin(deltaLat / 2);
  const sinLng = Math.sin(deltaLng / 2);
  const core = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  return 2 * radiusNm * Math.atan2(Math.sqrt(core), Math.sqrt(1 - core));
}
