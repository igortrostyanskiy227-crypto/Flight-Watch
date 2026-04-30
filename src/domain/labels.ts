import type { DataSource, EventCategory, EventSeverity, FlightKind, FlightStatus, TrackerState, WarningScope } from "../types";

export const kindLabels: Record<FlightKind, string> = {
  commercial: "Рейс",
  private: "Полёт",
};

export const statusLabels: Record<FlightStatus, string> = {
  airborne: "В полёте",
  landed: "Завершён",
  scheduled: "Ожидается",
  alert: "Тревога",
  PLN: "PLN",
  DLA: "DLA",
  ENR: "ENR",
  ARR: "ARR",
  APR: "APR",
  ALT: "ALT",
  CNL: "CNL",
};

export const severityLabels: Record<EventSeverity, string> = {
  info: "Info",
  warning: "Warning",
  critical: "Critical",
};

export const categoryLabels: Record<EventCategory, string> = {
  INFO: "INFO",
  WARNING: "WARNING",
  ALERT: "ALERT",
};

export const warningScopeLabels: Record<WarningScope, string> = {
  route_weather: "Метео по маршруту",
  route_airspace: "Аэронавигация по маршруту",
  dep_weather: "Метео DEP",
  dest_weather: "Метео DEST",
  altn_weather: "Метео ALTN",
  dep_airspace: "Аэронавигация DEP",
  dest_airspace: "Аэронавигация DEST",
  altn_airspace: "Аэронавигация ALTN",
};

export const trackerStateLabels: Record<TrackerState, string> = {
  OK: "Трекер включен",
  OFFLINE: "Трекер выключен",
  FAILED: "Сбой трекера",
  SIGNAL_LOSS: "Потеря связи",
  SOS: "Бедствие",
};

export const dataSourceLabels: Record<DataSource, string> = {
  Tracker: "Tracker",
  "ADS-B": "ADS-B",
  ACARS: "ACARS",
  Manual: "Manual",
};
