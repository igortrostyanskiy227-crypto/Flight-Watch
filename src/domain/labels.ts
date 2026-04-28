import type { EventSeverity, FlightKind, FlightStatus } from "../types";

export const kindLabels: Record<FlightKind, string> = {
  commercial: "Рейс",
  private: "Полёт",
};

export const statusLabels: Record<FlightStatus, string> = {
  airborne: "В полёте",
  landed: "Завершён",
  scheduled: "Ожидается",
  alert: "Тревога",
};

export const severityLabels: Record<EventSeverity, string> = {
  info: "Info",
  warning: "Warning",
  critical: "Critical",
};
