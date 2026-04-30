export type FlightKind = "commercial" | "private";

export type OperationalFlightStatus = "PLN" | "DLA" | "ENR" | "ARR" | "APR" | "ALT" | "CNL";

export type FlightStatus = "airborne" | "landed" | "scheduled" | "alert" | OperationalFlightStatus;

export type TrackerState = "OK" | "OFFLINE" | "FAILED" | "SIGNAL_LOSS" | "SOS";

export type DataSource = "Tracker" | "ADS-B" | "ACARS" | "Manual";

export type EventSeverity = "info" | "warning" | "critical";

export type EventCategory = "INFO" | "WARNING" | "ALERT";

export type WarningScope =
  | "route_weather"
  | "route_airspace"
  | "dep_weather"
  | "dest_weather"
  | "altn_weather"
  | "dep_airspace"
  | "dest_airspace"
  | "altn_airspace";

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
  state?: TrackerState;
  source?: DataSource;
  lastMessageAt?: string;
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
  alternate?: string;
  etopsAlternate?: string;
  takeoffAlternate?: string;
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
  category?: EventCategory;
  scope?: WarningScope;
  read?: boolean;
  time: string;
  text: string;
  details?: string;
  coordinates?: { lat: number; lng: number };
  source: "manual" | "computed";
}

export interface Flight {
  id: string;
  kind: FlightKind;
  flightNumber?: string;
  callsign?: string;
  operator: string;
  status: FlightStatus;
  operationalStatus?: OperationalFlightStatus;
  aircraft: Aircraft;
  tracker: Tracker;
  plan: FlightPlan;
  actual: ActualFlightParams;
  route: RoutePoint[];
  lastSignalAt: string;
  landingConfirmed: boolean;
  sos: boolean;
  statusEvidence?: string;
  manualEvents: FlightEvent[];
  statusHistory: StatusHistoryItem[];
}

export interface FlightFilters {
  query: string;
  status: "all" | FlightStatus | OperationalFlightStatus | "alarm";
  kind: "all" | FlightKind;
  aircraft: string[];
  aircraftTypes: string[];
  dep: string[];
  dest: string[];
  altn: string[];
  etopsEra: string[];
  tkoffAltn: string[];
  eventCategory: "all" | EventCategory;
  period: "all" | "lastHour" | "today" | "signalOverdue" | "custom";
  periodStart: string;
  periodEnd: string;
}

export type FlightSort = "default" | "stdAsc" | "stdDesc";

export interface FilterTemplate {
  id: string;
  name: string;
  filters: FlightFilters;
}

export interface ChatMessage {
  id: string;
  flightId: string;
  author: string;
  text: string;
  time: string;
  own?: boolean;
  read?: boolean;
}
