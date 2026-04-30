import type { EventSeverity, Flight, FlightEvent } from "../types";
import { getCurrentPoint, haversineNm, minutesBetween } from "./flightUtils";

export const SIGNAL_WARNING_MINUTES = 5;
export const SIGNAL_CRITICAL_MINUTES = 10;
export const STATIONARY_MINUTES = 10;
export const DEVIATION_WARNING_NM = 8;

function eventId(flight: Flight, suffix: string): string {
  return `${flight.id}-${suffix}`;
}

function makeEvent(
  flight: Flight,
  suffix: string,
  severity: EventSeverity,
  time: string,
  text: string,
  type: FlightEvent["type"],
  details?: string,
): FlightEvent {
  const point = getCurrentPoint(flight);
  return {
    id: eventId(flight, suffix),
    flightId: flight.id,
    type,
    severity,
    category: severity === "critical" ? "ALERT" : severity === "warning" ? "WARNING" : "INFO",
    time,
    text,
    details,
    coordinates: { lat: point.lat, lng: point.lng },
    read: severity === "info",
    source: "computed",
  };
}

function isStationary(flight: Flight): boolean {
  const latest = getCurrentPoint(flight);
  const latestTime = new Date(latest.time).getTime();
  const windowStart = latestTime - STATIONARY_MINUTES * 60_000;
  const points = flight.route.filter((point) => new Date(point.time).getTime() >= windowStart);

  if (points.length < 2) {
    return false;
  }

  return points.every((point) => haversineNm(point, latest) < 0.05);
}

export function calculateFlightEvents(flight: Flight, now: Date): FlightEvent[] {
  const computed: FlightEvent[] = [];
  const lastSignalAge = minutesBetween(now, new Date(flight.lastSignalAt));
  const currentPoint = getCurrentPoint(flight);

  // Business alarm rules for the mock prototype. These thresholds model the
  // dispatcher-facing signals that would later come from backend processing.
  if (lastSignalAge > SIGNAL_CRITICAL_MINUTES) {
    computed.push(
      makeEvent(
        flight,
        "signal-loss",
        "critical",
        flight.lastSignalAt,
        `Потеря связи: нет сигнала ${lastSignalAge} мин.`,
        "signal_loss",
        "Борт не передает телеметрию дольше критического порога. Проверьте последний известный трек, связь с экипажем и смежные службы.",
      ),
    );
  } else if (lastSignalAge > SIGNAL_WARNING_MINUTES) {
    computed.push(
      makeEvent(
        flight,
        "signal-delay",
        "warning",
        flight.lastSignalAt,
        `Нет связи с трекером ${lastSignalAge} мин.`,
        "signal_delay",
        "Сигнал от трекера устарел. Нужна проверка качества связи и последней точки маршрута.",
      ),
    );
  }

  if (isStationary(flight) && flight.status === "airborne") {
    computed.push(
      makeEvent(
        flight,
        "stationary",
        "warning",
        currentPoint.time,
        "Борт находится в одной точке более 10 мин.",
        "stationary",
        "Фактические координаты не меняются в течение контрольного интервала. Рекомендуется проверить скорость, высоту и статус посадки.",
      ),
    );
  }

  if (flight.status === "landed" && !flight.landingConfirmed) {
    computed.push(
      makeEvent(
        flight,
        "landing-unconfirmed",
        "warning",
        flight.lastSignalAt,
        "Посадка не подтверждена оператором.",
        "landing_unconfirmed",
        "Трекер передал посадочные параметры, но подтверждение оператора отсутствует.",
      ),
    );
  }

  if (flight.sos) {
    computed.push(
      makeEvent(
        flight,
        "sos",
        "critical",
        flight.lastSignalAt,
        "SOS с бортового трекера.",
        "sos",
        "Получен аварийный сигнал с бортового трекера. Требуется немедленная фиксация прочтения и запуск процедуры реагирования.",
      ),
    );
  }

  if (flight.actual.deviationNm > DEVIATION_WARNING_NM) {
    computed.push(
      makeEvent(
        flight,
        "plan-deviation",
        "warning",
        flight.lastSignalAt,
        `Отклонение от плана ${flight.actual.deviationNm.toFixed(1)} NM.`,
        "plan_deviation",
        "Фактический трек вышел за допустимое отклонение от планового маршрута. Для пространственного анализа откройте событие на карте.",
      ),
    );
  }

  return [...flight.manualEvents, ...computed].sort(
    (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
  );
}

export function calculateAllEvents(flights: Flight[], now: Date): FlightEvent[] {
  return flights
    .flatMap((flight) => calculateFlightEvents(flight, now))
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
}

export function hasActiveAlarm(events: FlightEvent[]): boolean {
  return events.some((event) => event.severity === "critical" || event.severity === "warning");
}

export function worstSeverity(events: FlightEvent[]): EventSeverity | "none" {
  if (events.some((event) => event.severity === "critical")) {
    return "critical";
  }
  if (events.some((event) => event.severity === "warning")) {
    return "warning";
  }
  if (events.some((event) => event.severity === "info")) {
    return "info";
  }
  return "none";
}
