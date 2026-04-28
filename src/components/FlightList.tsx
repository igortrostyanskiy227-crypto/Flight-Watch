import { worstSeverity } from "../domain/events";
import { formatClock, getCurrentPoint, getFlightLabel } from "../domain/flightUtils";
import { statusLabels } from "../domain/labels";
import type { Flight, FlightEvent, FlightFilters } from "../types";

interface FlightListProps {
  aircraftOptions: Array<{ value: string; label: string }>;
  eventsByFlight: Map<string, FlightEvent[]>;
  filters: FlightFilters;
  flights: Flight[];
  onFiltersChange: (filters: FlightFilters) => void;
  onSelectFlight: (flightId: string) => void;
  selectedFlightId: string | null;
  totalCount: number;
}

export function FlightList({
  aircraftOptions,
  eventsByFlight,
  filters,
  flights,
  onFiltersChange,
  onSelectFlight,
  selectedFlightId,
  totalCount,
}: FlightListProps) {
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
        <div className="fleet-summary__count">
          <span>На карте</span>
          <strong>{flights.length}</strong>
          <span>/</span>
          <strong>{totalCount}</strong>
        </div>
        <div className="fleet-summary__alerts">
          <span className="status-dot critical" />
          <strong>{criticalCount}</strong>
          <span className="status-dot warning" />
          <strong>{warningCount}</strong>
        </div>
      </div>

      <label className="panel-aircraft-filter">
        <span>Борт</span>
        <select
          aria-label="Фильтр по воздушному судну"
          onChange={(event) => onFiltersChange({ ...filters, aircraft: event.target.value })}
          value={filters.aircraft}
        >
          <option value="all">Все ВС</option>
          {aircraftOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

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
                    <small>Сигнал {formatClock(flight.lastSignalAt)}</small>
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
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
