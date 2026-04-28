export type FlightKind = "commercial" | "private";

export type FlightStatus = "airborne" | "landed" | "scheduled" | "alert";

export type EventSeverity = "info" | "warning" | "critical";

export type EventCode =
  | "sos"
  | "signal_delay"
  | "signal_loss"
  | "stationary"
  | "landing_unconfirmed"
  | "weather"
  | "airspace_restriction"
  | "plan_deviation"
  | "info";

export interface Tracker {
  id: string;
  model: string;
  batteryPercent: number;
}

export interface Aircraft {
  registration: string;
  model: string;
  typeCode: string;
}

export interface RoutePoint {
  lat: number;
  lng: number;
  time: string;
  altitudeFt: number;
  speedKt: number;
  headingDeg: number;
}

export interface FlightPlan {
  origin: string;
  destination: string;
  routeName: string;
  scheduledDeparture: string;
  scheduledArrival: string;
  speedKt: number;
  altitudeFt: number;
}

export interface ActualFlightParams {
  speedKt: number;
  altitudeFt: number;
  headingDeg: number;
  deviationNm: number;
  fuelRemainingMin: number;
}

export interface StatusHistoryItem {
  time: string;
  status: FlightStatus;
  text: string;
}

export interface FlightEvent {
  id: string;
  flightId: string;
  type: EventCode;
  severity: EventSeverity;
  time: string;
  text: string;
  source: "manual" | "computed";
}

export interface Flight {
  id: string;
  kind: FlightKind;
  flightNumber?: string;
  callsign?: string;
  operator: string;
  status: FlightStatus;
  aircraft: Aircraft;
  tracker: Tracker;
  plan: FlightPlan;
  actual: ActualFlightParams;
  route: RoutePoint[];
  lastSignalAt: string;
  landingConfirmed: boolean;
  sos: boolean;
  manualEvents: FlightEvent[];
  statusHistory: StatusHistoryItem[];
}

export interface FlightFilters {
  query: string;
  status: "all" | FlightStatus | "alarm";
  kind: "all" | FlightKind;
  aircraft: "all" | string;
  period: "all" | "lastHour" | "today" | "signalOverdue";
}
