import { formatClock, getFlightLabel } from "../domain/flightUtils";
import { severityLabels } from "../domain/labels";
import type { Flight, FlightEvent } from "../types";

interface AlertsPanelProps {
  events: FlightEvent[];
  flightsById: Map<string, Flight>;
  onSelectFlight: (flightId: string) => void;
}

export function AlertsPanel({ events, flightsById, onSelectFlight }: AlertsPanelProps) {
  const criticalCount = events.filter((event) => event.severity === "critical").length;
  const warningCount = events.filter((event) => event.severity === "warning").length;

  return (
    <section className="alerts-panel" aria-label="Панель событий">
      <div className="alerts-panel__header">
        <div>
          <h2>События и сигнализации</h2>
          <p>
            Critical {criticalCount} · Warning {warningCount} · Всего {events.length}
          </p>
        </div>
      </div>

      <div className="alerts-stream">
        {events.length === 0 ? (
          <div className="empty-inline">Нет событий в текущем отображении.</div>
        ) : (
          events.slice(0, 8).map((event) => {
            const flight = flightsById.get(event.flightId);

            return (
              <button
                className={`alert-row severity-${event.severity}`}
                key={event.id}
                onClick={() => onSelectFlight(event.flightId)}
                type="button"
              >
                <span>{formatClock(event.time)}</span>
                <strong>{flight ? getFlightLabel(flight) : event.flightId}</strong>
                <em>{severityLabels[event.severity]}</em>
                <p>{event.text}</p>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
