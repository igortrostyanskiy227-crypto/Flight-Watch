import { worstSeverity } from "../domain/events";
import { formatClock, getCurrentPoint, getFlightLabel } from "../domain/flightUtils";
import { statusLabels } from "../domain/labels";
import { useState } from "react";
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
  const [aircraftFilterOpen, setAircraftFilterOpen] = useState(false);
  const visibleEvents = flights.flatMap((flight) => eventsByFlight.get(flight.id) ?? []);
  const criticalCount = visibleEvents.filter((event) => event.severity === "critical").length;
  const warningCount = visibleEvents.filter((event) => event.severity === "warning").length;
  const selectedAircraftCount = filters.aircraft.length;
  const aircraftFilterLabel =
    selectedAircraftCount === 0
      ? "Все ВС"
      : selectedAircraftCount === 1
        ? aircraftOptions.find((option) => option.value === filters.aircraft[0])?.label ?? filters.aircraft[0]
        : `Выбрано ${selectedAircraftCount}`;

  const toggleAircraft = (registration: string) => {
    const nextAircraft = filters.aircraft.includes(registration)
      ? filters.aircraft.filter((value) => value !== registration)
      : [...filters.aircraft, registration];

    onFiltersChange({ ...filters, aircraft: nextAircraft });
  };

  return (
    <aside className="left-panel" aria-label="Список рейсов">
      <div className="panel-heading">
        <div>
          <h2>Рейсы и полёты</h2>
          <p>{flights.length} объектов после фильтрации</p>
        </div>
      </div>

      <div className="panel-aircraft-filter">
        <span>Борт</span>
        <button
          aria-expanded={aircraftFilterOpen}
          aria-haspopup="listbox"
          className="aircraft-multiselect"
          onClick={() => setAircraftFilterOpen((isOpen) => !isOpen)}
          type="button"
        >
          <strong>{aircraftFilterLabel}</strong>
          <em>⌄</em>
        </button>

        {aircraftFilterOpen && (
          <div className="aircraft-options" role="listbox" aria-label="Выбор бортов">
            <button className="aircraft-option" onClick={() => onFiltersChange({ ...filters, aircraft: [] })} type="button">
              <span className={selectedAircraftCount === 0 ? "is-checked" : ""} />
              Все ВС
            </button>
            {aircraftOptions.map((option) => (
              <button className="aircraft-option" key={option.value} onClick={() => toggleAircraft(option.value)} type="button">
                <span className={filters.aircraft.includes(option.value) ? "is-checked" : ""} />
                {option.label}
              </button>
            ))}
          </div>
        )}
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
