import type { EventSeverity, FlightKind, FlightStatus, ViewMode } from "../types";

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

export const viewModeLabels: Record<ViewMode, string> = {
  all: "Все рейсы",
  selected: "Только выбранный",
  alerts: "Только тревожные",
};
