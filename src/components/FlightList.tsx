import { worstSeverity } from "../domain/events";
import { formatClock, getCurrentPoint, getFlightLabel } from "../domain/flightUtils";
import { kindLabels, statusLabels } from "../domain/labels";
import type { Flight, FlightEvent } from "../types";

interface FlightListProps {
  eventsByFlight: Map<string, FlightEvent[]>;
  flights: Flight[];
  onSelectFlight: (flightId: string) => void;
  selectedFlightId: string | null;
  totalCount: number;
}

export function FlightList({ eventsByFlight, flights, onSelectFlight, selectedFlightId, totalCount }: FlightListProps) {
  const visibleEvents = flights.flatMap((flight) => eventsByFlight.get(flight.id) ?? []);
  const criticalCount = visibleEvents.filter((event) => event.severity === "critical").length;
  const warningCount = visibleEvents.filter((event) => event.severity === "warning").length;

  return (
    <aside className="left-panel" aria-label="Список рейсов">
      <div className="panel-heading">
        <div>
          <h2>Рейсы и полёты</h2>
          <p>{flights.length} объектов после фильтрации</p>
        </div>
      </div>

      <div className="fleet-summary" aria-label="Сводка по объектам на карте">
        <span>
          На карте <strong>{flights.length}</strong>/{totalCount}
        </span>
        <span className="status-dot critical" />
        <strong>{criticalCount}</strong>
        <span className="status-dot warning" />
        <strong>{warningCount}</strong>
      </div>

      <div className="flight-list">
        {flights.length === 0 ? (
          <div className="empty-state">Нет объектов под выбранные фильтры.</div>
        ) : (
          flights.map((flight) => {
            const events = eventsByFlight.get(flight.id) ?? [];
            const severity = worstSeverity(events);
            const point = getCurrentPoint(flight);
            const label = getFlightLabel(flight);

            return (
              <button
                className={`flight-card ${selectedFlightId === flight.id ? "is-selected" : ""} severity-${severity}`}
                key={flight.id}
                onClick={() => onSelectFlight(flight.id)}
                type="button"
              >
                <span className="flight-card__topline">
                  <span>
                    <strong>{label}</strong>
                    <small>{kindLabels[flight.kind]}</small>
                  </span>
                  <span className={`status-chip status-${flight.status}`}>{statusLabels[flight.status]}</span>
                </span>

                <span className="flight-card__aircraft">
                  {flight.aircraft.registration} · {flight.aircraft.model}
                </span>

                <span className="flight-card__metrics">
                  <span>
                    <b>{Math.round(point.altitudeFt).toLocaleString("ru-RU")}</b>
                    <small>ft</small>
                  </span>
                  <span>
                    <b>{Math.round(point.speedKt)}</b>
                    <small>kt</small>
                  </span>
                  <span>
                    <b>{Math.round(point.headingDeg)}°</b>
                    <small>hdg</small>
                  </span>
                </span>

                <span className="flight-card__footer">
                  <span>Сигнал {formatClock(flight.lastSignalAt)}</span>
                  <span className={`event-indicator severity-${severity}`}>
                    {events.length > 0 ? `${events.length} events` : "clean"}
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
