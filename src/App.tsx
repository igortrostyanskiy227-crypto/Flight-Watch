import { useEffect, useMemo, useState } from "react";
import { AlertsPanel } from "./components/AlertsPanel";
import { DetailPanel } from "./components/DetailPanel";
import { FlightList } from "./components/FlightList";
import { MapView } from "./components/MapView";
import { TopBar } from "./components/TopBar";
import { MOCK_NOW, mockFlights } from "./data/mockFlights";
import { calculateAllEvents, hasActiveAlarm } from "./domain/events";
import { getFlightLabel, minutesBetween } from "./domain/flightUtils";
import type { Flight, FlightEvent, FlightFilters } from "./types";

const initialFilters: FlightFilters = {
  query: "",
  status: "all",
  kind: "all",
  aircraft: "all",
  period: "all",
};

function groupEventsByFlight(events: FlightEvent[]): Map<string, FlightEvent[]> {
  const map = new Map<string, FlightEvent[]>();
  events.forEach((event) => {
    const group = map.get(event.flightId) ?? [];
    group.push(event);
    map.set(event.flightId, group);
  });
  return map;
}

function filterFlights(
  flights: Flight[],
  filters: FlightFilters,
  eventsByFlight: Map<string, FlightEvent[]>,
): Flight[] {
  const normalizedQuery = filters.query.trim().toLowerCase();

  return flights.filter((flight) => {
    const events = eventsByFlight.get(flight.id) ?? [];
    const label = getFlightLabel(flight).toLowerCase();
    const searchable = [
      label,
      flight.callsign,
      flight.flightNumber,
      flight.aircraft.registration,
      flight.aircraft.model,
      flight.aircraft.typeCode,
      flight.operator,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (normalizedQuery && !searchable.includes(normalizedQuery)) {
      return false;
    }

    if (filters.status !== "all") {
      if (filters.status === "alarm") {
        if (!hasActiveAlarm(events)) {
          return false;
        }
      } else if (flight.status !== filters.status) {
        return false;
      }
    }

    if (filters.kind !== "all" && flight.kind !== filters.kind) {
      return false;
    }

    if (filters.aircraft !== "all" && flight.aircraft.registration !== filters.aircraft) {
      return false;
    }

    if (filters.period === "lastHour" && minutesBetween(MOCK_NOW, new Date(flight.lastSignalAt)) > 60) {
      return false;
    }

    if (filters.period === "today" && new Date(flight.lastSignalAt).toDateString() !== MOCK_NOW.toDateString()) {
      return false;
    }

    if (filters.period === "signalOverdue" && minutesBetween(MOCK_NOW, new Date(flight.lastSignalAt)) <= 5) {
      return false;
    }

    return true;
  });
}

export function App() {
  const [filters, setFilters] = useState<FlightFilters>(initialFilters);
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(mockFlights[0]?.id ?? null);
  const [detailTab, setDetailTab] = useState<"summary" | "history">("summary");

  const allEvents = useMemo(() => calculateAllEvents(mockFlights, MOCK_NOW), []);
  const eventsByFlight = useMemo(() => groupEventsByFlight(allEvents), [allEvents]);
  const flightsById = useMemo(() => new Map(mockFlights.map((flight) => [flight.id, flight])), []);
  const filteredFlights = useMemo(
    () => filterFlights(mockFlights, filters, eventsByFlight),
    [eventsByFlight, filters],
  );
  const visibleFlights = filteredFlights;
  const selectedFlight = useMemo(
    () => mockFlights.find((flight) => flight.id === selectedFlightId) ?? null,
    [selectedFlightId],
  );
  const selectedEvents = selectedFlight ? eventsByFlight.get(selectedFlight.id) ?? [] : [];
  const visibleFlightIds = useMemo(() => new Set(visibleFlights.map((flight) => flight.id)), [visibleFlights]);
  const visibleEvents = useMemo(
    () => allEvents.filter((event) => visibleFlightIds.has(event.flightId)),
    [allEvents, visibleFlightIds],
  );
  const aircraftOptions = useMemo(
    () =>
      mockFlights.map((flight) => ({
        value: flight.aircraft.registration,
        label: `${flight.aircraft.registration} · ${flight.aircraft.typeCode}`,
      })),
    [],
  );

  useEffect(() => {
    if (filteredFlights.length === 0) {
      setSelectedFlightId(null);
      return;
    }

    if (!selectedFlightId || !filteredFlights.some((flight) => flight.id === selectedFlightId)) {
      setSelectedFlightId(filteredFlights[0].id);
    }
  }, [filteredFlights, selectedFlightId]);

  return (
    <div className="app-shell">
      <TopBar
        aircraftOptions={aircraftOptions}
        events={allEvents}
        filters={filters}
        onFiltersChange={setFilters}
        totalCount={mockFlights.length}
        visibleCount={visibleFlights.length}
      />

      <main className="monitor-layout">
        <FlightList
          eventsByFlight={eventsByFlight}
          flights={visibleFlights}
          onSelectFlight={setSelectedFlightId}
          selectedFlightId={selectedFlightId}
        />

        <section className="map-stage" aria-label="Карта воздушной обстановки">
          <MapView
            eventsByFlight={eventsByFlight}
            flights={visibleFlights}
            onSelectFlight={setSelectedFlightId}
            selectedFlight={selectedFlight && visibleFlightIds.has(selectedFlight.id) ? selectedFlight : null}
          />
          <AlertsPanel events={visibleEvents} flightsById={flightsById} onSelectFlight={setSelectedFlightId} />
        </section>

        <DetailPanel
          events={selectedEvents}
          flight={selectedFlight}
          onTabChange={setDetailTab}
          tab={detailTab}
        />
      </main>
    </div>
  );
}
