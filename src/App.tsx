import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { AlertsPanel } from "./components/AlertsPanel";
import { DetailPanel } from "./components/DetailPanel";
import { FlightList } from "./components/FlightList";
import { MapView } from "./components/MapView";
import { TopBar } from "./components/TopBar";
import { MOCK_NOW, mockFlights } from "./data/mockFlights";
import { DEVIATION_WARNING_NM, calculateAllEvents, hasActiveAlarm } from "./domain/events";
import { getCurrentPoint, getFlightLabel, minutesBetween } from "./domain/flightUtils";
import type {
  ChatMessage,
  EventCategory,
  FilterTemplate,
  Flight,
  FlightEvent,
  FlightFilters,
  FlightSort,
  FlightStatus,
  OperationalFlightStatus,
  TrackerState,
} from "./types";

const initialFilters: FlightFilters = {
  query: "",
  status: "all",
  kind: "all",
  aircraft: [],
  aircraftTypes: [],
  dep: [],
  dest: [],
  altn: [],
  etopsEra: [],
  tkoffAltn: [],
  eventCategory: "all",
  period: "all",
  periodStart: "",
  periodEnd: "",
};

const statusByFlightId: Record<string, OperationalFlightStatus> = {
  "fw-1844": "ENR",
  "fw-2157": "DLA",
  "fw-412": "ARR",
  "fw-0273": "ENR",
  "fw-ptk91": "PLN",
  "fw-705": "ALT",
  "fw-601": "ARR",
  "fw-vlg302": "ENR",
};

const routeMetaByFlightId: Record<
  string,
  Pick<NonNullable<Flight["plan"]>, "alternate" | "etopsAlternate" | "takeoffAlternate">
> = {
  "fw-1844": { alternate: "URKK", etopsAlternate: "URRP", takeoffAlternate: "UUDD" },
  "fw-2157": { alternate: "ULAA", etopsAlternate: "ULLI", takeoffAlternate: "UUBW" },
  "fw-412": { alternate: "UUDD", etopsAlternate: "UWGG", takeoffAlternate: "USSS" },
  "fw-0273": { alternate: "UUEM", etopsAlternate: "UUBI", takeoffAlternate: "UUEM" },
  "fw-ptk91": { alternate: "UUBI", etopsAlternate: "UWOO", takeoffAlternate: "UUBI" },
  "fw-705": { alternate: "UUBW", etopsAlternate: "ULOO", takeoffAlternate: "ULLI" },
  "fw-601": { alternate: "UUDD", etopsAlternate: "URRP", takeoffAlternate: "URMM" },
  "fw-vlg302": { alternate: "UUWW", etopsAlternate: "UWOO", takeoffAlternate: "UUOB" },
};

const trackerStateByFlightId: Record<string, TrackerState> = {
  "fw-2157": "SIGNAL_LOSS",
  "fw-vlg302": "SOS",
  "fw-0273": "OK",
  "fw-ptk91": "OK",
};

const chatMessages: ChatMessage[] = [
  {
    id: "chat-fw-2157-1",
    flightId: "fw-2157",
    author: "Ирина Ирисова",
    text: "В зоне назначения ожидается ухудшение видимости.",
    time: "2026-04-28T13:23:00+03:00",
    read: false,
  },
  {
    id: "chat-fw-705-1",
    flightId: "fw-705",
    author: "Вы",
    text: "Проверьте обход метеозоны севернее маршрута.",
    time: "2026-04-28T13:24:00+03:00",
    own: true,
    read: true,
  },
  {
    id: "chat-fw-vlg302-1",
    flightId: "fw-vlg302",
    author: "Олег Олегов",
    text: "Сигнал SOS подтвержден, дежурная смена уведомлена.",
    time: "2026-04-28T13:40:00+03:00",
    read: false,
  },
];

function enrichFlights(flights: Flight[]): Flight[] {
  return flights.map((flight) => ({
    ...flight,
    operationalStatus: flight.operationalStatus ?? statusByFlightId[flight.id] ?? deriveOperationalStatus(flight.status),
    statusEvidence: flight.statusEvidence ?? makeStatusEvidence(flight),
    tracker: {
      ...flight.tracker,
      state: flight.tracker.state ?? trackerStateByFlightId[flight.id] ?? deriveTrackerState(flight),
      source: flight.tracker.source ?? (flight.kind === "commercial" ? "ADS-B" : "Tracker"),
      lastMessageAt: flight.tracker.lastMessageAt ?? flight.lastSignalAt,
    },
    plan: {
      ...routeMetaByFlightId[flight.id],
      ...flight.plan,
    },
  }));
}

function deriveTrackerState(flight: Flight): TrackerState {
  if (flight.sos) return "SOS";
  if (minutesBetween(MOCK_NOW, new Date(flight.lastSignalAt)) > 10) return "SIGNAL_LOSS";
  if (flight.tracker.batteryPercent < 15) return "FAILED";
  return "OK";
}

function makeStatusEvidence(flight: Flight): string {
  const etdDelay = minutesBetween(MOCK_NOW, new Date(flight.plan.scheduledDeparture));
  const etaDelay = minutesBetween(MOCK_NOW, new Date(flight.plan.scheduledArrival));
  const lastSignalAge = minutesBetween(MOCK_NOW, new Date(flight.lastSignalAt));

  if (flight.sos) return "SOS received · emergency rule active";
  if (lastSignalAge > 10) return `Нет новых точек ${lastSignalAge} мин · порог потери связи превышен`;
  if (flight.status === "scheduled" && etdDelay > 5) return `ETD +${etdDelay} мин · ATD нет · трекер не переходил в полет`;
  if (flight.status === "landed" && !flight.landingConfirmed) return "Скорость около 0 более 5 мин · посадка не подтверждена";
  if (flight.status === "airborne" && etaDelay > 5) return `ETA +${etaDelay} мин · ATA нет · статус Прибыл не наступил`;
  if (flight.actual.deviationNm > DEVIATION_WARNING_NM) return `Отклонение ${flight.actual.deviationNm.toFixed(1)} NM от FPL/OFP`;
  return "Трекер OK · скорость и вертикальный профиль соответствуют фазе";
}

function deriveOperationalStatus(status: FlightStatus): OperationalFlightStatus {
  if (status === "scheduled") return "PLN";
  if (status === "landed") return "ARR";
  if (status === "alert") return "ALT";
  if (["PLN", "DLA", "ENR", "ARR", "APR", "ALT", "CNL"].includes(status)) return status as OperationalFlightStatus;
  return "ENR";
}

function groupEventsByFlight(events: FlightEvent[]): Map<string, FlightEvent[]> {
  const map = new Map<string, FlightEvent[]>();
  events.forEach((event) => {
    const group = map.get(event.flightId) ?? [];
    group.push(event);
    map.set(event.flightId, group);
  });
  return map;
}

function eventCategory(event: FlightEvent): EventCategory {
  return event.category ?? (event.severity === "critical" ? "ALERT" : event.severity === "warning" ? "WARNING" : "INFO");
}

function uniqueOptions(values: Array<string | undefined>): Array<{ value: string; label: string }> {
  return Array.from(new Set(values.filter(Boolean) as string[]))
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ value, label: value }));
}

function matchesSelected(value: string | undefined, selected: string[]): boolean {
  return selected.length === 0 || (!!value && selected.includes(value));
}

function withinPeriod(flight: Flight, filters: FlightFilters): boolean {
  const std = new Date(flight.plan.scheduledDeparture);

  if (filters.period === "lastHour") {
    return minutesBetween(MOCK_NOW, std) <= 60;
  }

  if (filters.period === "today") {
    return std.toDateString() === MOCK_NOW.toDateString();
  }

  if (filters.period === "signalOverdue") {
    return minutesBetween(MOCK_NOW, new Date(flight.lastSignalAt)) > 5;
  }

  if (filters.period === "custom") {
    const start = filters.periodStart ? new Date(filters.periodStart) : null;
    const end = filters.periodEnd ? new Date(filters.periodEnd) : null;
    if (start && std < start) return false;
    if (end && std > end) return false;
  }

  return true;
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
      flight.plan.origin,
      flight.plan.destination,
      flight.plan.alternate,
      flight.plan.etopsAlternate,
      flight.plan.takeoffAlternate,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (normalizedQuery && !searchable.includes(normalizedQuery)) return false;

    if (filters.status !== "all") {
      if (filters.status === "alarm") {
        if (!hasActiveAlarm(events)) return false;
      } else if (flight.operationalStatus !== filters.status && flight.status !== filters.status) {
        return false;
      }
    }

    if (filters.kind !== "all" && flight.kind !== filters.kind) return false;
    if (!matchesSelected(flight.aircraft.registration, filters.aircraft)) return false;
    if (!matchesSelected(flight.aircraft.typeCode, filters.aircraftTypes)) return false;
    if (!matchesSelected(flight.plan.origin, filters.dep)) return false;
    if (!matchesSelected(flight.plan.destination, filters.dest)) return false;
    if (!matchesSelected(flight.plan.alternate, filters.altn)) return false;
    if (!matchesSelected(flight.plan.etopsAlternate, filters.etopsEra)) return false;
    if (!matchesSelected(flight.plan.takeoffAlternate, filters.tkoffAltn)) return false;

    if (filters.eventCategory !== "all" && !events.some((event) => eventCategory(event) === filters.eventCategory)) {
      return false;
    }

    return withinPeriod(flight, filters);
  });
}

function sortFlights(flights: Flight[], sort: FlightSort): Flight[] {
  const sorted = [...flights];
  if (sort === "stdAsc") {
    sorted.sort((a, b) => new Date(a.plan.scheduledDeparture).getTime() - new Date(b.plan.scheduledDeparture).getTime());
  }
  if (sort === "stdDesc") {
    sorted.sort((a, b) => new Date(b.plan.scheduledDeparture).getTime() - new Date(a.plan.scheduledDeparture).getTime());
  }
  return sorted;
}

function countActiveFilters(filters: FlightFilters): number {
  return [
    filters.status !== "all",
    filters.kind !== "all",
    filters.aircraft.length > 0,
    filters.aircraftTypes.length > 0,
    filters.dep.length > 0,
    filters.dest.length > 0,
    filters.altn.length > 0,
    filters.etopsEra.length > 0,
    filters.tkoffAltn.length > 0,
    filters.eventCategory !== "all",
    filters.period !== "all",
  ].filter(Boolean).length;
}

export function App() {
  const [filters, setFilters] = useState<FlightFilters>(initialFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = useState<FlightSort>("default");
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(mockFlights[0]?.id ?? null);
  const [selectedFromListAt, setSelectedFromListAt] = useState(0);
  const [detailTab, setDetailTab] = useState<"summary" | "history" | "warnings" | "charts" | "aerodromes">("summary");
  const [readEventIds, setReadEventIds] = useState<Set<string>>(() => new Set());
  const [dismissedEventIds, setDismissedEventIds] = useState<Set<string>>(() => new Set());
  const [criticalAutoOpenPaused, setCriticalAutoOpenPaused] = useState(false);
  const [mapVisibleFlightIds, setMapVisibleFlightIds] = useState<Set<string>>(() => new Set(mockFlights.map((flight) => flight.id)));
  const [openedEvent, setOpenedEvent] = useState<FlightEvent | null>(null);
  const [templates, setTemplates] = useState<FilterTemplate[]>([
    { id: "all-active", name: "Все активные", filters: initialFilters },
    { id: "warnings", name: "WARNING/ALERT", filters: { ...initialFilters, eventCategory: "WARNING" } },
  ]);

  const flights = useMemo(() => enrichFlights(mockFlights), []);
  const rawEvents = useMemo(() => calculateAllEvents(flights, MOCK_NOW), [flights]);
  const allEvents = useMemo(
    () =>
      rawEvents.map((event) => ({
        ...event,
        category: eventCategory(event),
        read: readEventIds.has(event.id) || event.read,
      })),
    [rawEvents, readEventIds],
  );
  const unreadCriticalEvent = useMemo(
    () =>
      allEvents.find(
        (event) => !event.read && !dismissedEventIds.has(event.id) && (event.type === "sos" || event.type === "signal_loss"),
      ),
    [allEvents, dismissedEventIds],
  );
  const eventsByFlight = useMemo(() => groupEventsByFlight(allEvents), [allEvents]);
  const flightsById = useMemo(() => new Map(flights.map((flight) => [flight.id, flight])), [flights]);
  const filteredFlights = useMemo(
    () => sortFlights(filterFlights(flights, filters, eventsByFlight), sort),
    [eventsByFlight, filters, flights, sort],
  );
  const visibleFlights = filteredFlights;
  const mapFlights = useMemo(
    () => visibleFlights.filter((flight) => mapVisibleFlightIds.has(flight.id)),
    [mapVisibleFlightIds, visibleFlights],
  );
  const selectedFlight = useMemo(
    () => flights.find((flight) => flight.id === selectedFlightId) ?? null,
    [flights, selectedFlightId],
  );
  const selectedEvents = selectedFlight ? eventsByFlight.get(selectedFlight.id) ?? [] : [];
  const visibleFlightIds = useMemo(() => new Set(visibleFlights.map((flight) => flight.id)), [visibleFlights]);
  const visibleEvents = useMemo(
    () => allEvents.filter((event) => visibleFlightIds.has(event.flightId)),
    [allEvents, visibleFlightIds],
  );
  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);
  const filterOptions = useMemo(
    () => ({
      aircraft: flights.map((flight) => ({
        value: flight.aircraft.registration,
        label: `${flight.aircraft.registration} · ${flight.aircraft.typeCode}`,
      })),
      aircraftTypes: uniqueOptions(flights.map((flight) => flight.aircraft.typeCode)),
      dep: uniqueOptions(flights.map((flight) => flight.plan.origin)),
      dest: uniqueOptions(flights.map((flight) => flight.plan.destination)),
      altn: uniqueOptions(flights.map((flight) => flight.plan.alternate)),
      etopsEra: uniqueOptions(flights.map((flight) => flight.plan.etopsAlternate)),
      tkoffAltn: uniqueOptions(flights.map((flight) => flight.plan.takeoffAlternate)),
    }),
    [flights],
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

  useEffect(() => {
    if (unreadCriticalEvent && !openedEvent && !criticalAutoOpenPaused) {
      setOpenedEvent(unreadCriticalEvent);
    }
  }, [criticalAutoOpenPaused, openedEvent, unreadCriticalEvent]);

  const selectFlightFromList = (flightId: string) => {
    setSelectedFlightId(flightId);
    setSelectedFromListAt(Date.now());
  };

  const openEvent = (event: FlightEvent) => {
    setDismissedEventIds((current) => {
      const next = new Set(current);
      next.delete(event.id);
      return next;
    });
    setOpenedEvent(event);
    setSelectedFlightId(event.flightId);
    setSelectedFromListAt(Date.now());
  };

  const closeEventModal = () => {
    setCriticalAutoOpenPaused(true);
    if (openedEvent) {
      setDismissedEventIds((current) => new Set(current).add(openedEvent.id));
    }
    setOpenedEvent(null);
  };

  const markEventRead = (eventId: string) => {
    setCriticalAutoOpenPaused(true);
    setReadEventIds((current) => new Set(current).add(eventId));
    setDismissedEventIds((current) => new Set(current).add(eventId));
  };

  const showEventFlightOnMap = (event: FlightEvent) => {
    setCriticalAutoOpenPaused(true);
    setMapVisibleFlightIds((current) => new Set(current).add(event.flightId));
    setSelectedFlightId(event.flightId);
    setSelectedFromListAt(Date.now());
    setDismissedEventIds((current) => new Set(current).add(event.id));
    setOpenedEvent(null);
  };

  const toggleMapFlight = (flightId: string) => {
    setMapVisibleFlightIds((current) => {
      const next = new Set(current);
      if (next.has(flightId)) {
        next.delete(flightId);
      } else {
        next.add(flightId);
      }
      return next;
    });
  };

  const setFilteredFlightsMapVisibility = (visible: boolean) => {
    setMapVisibleFlightIds((current) => {
      const next = new Set(current);
      visibleFlights.forEach((flight) => {
        if (visible) {
          next.add(flight.id);
        } else {
          next.delete(flight.id);
        }
      });
      return next;
    });
  };

  const saveCurrentTemplate = (name: string) => {
    setTemplates((current) => [
      ...current,
      {
        id: `template-${Date.now()}`,
        name,
        filters,
      },
    ]);
  };

  const highlightedEventPoint = openedEvent?.coordinates ?? null;
  const openedEventFlight = openedEvent ? flightsById.get(openedEvent.flightId) : null;

  return (
    <div className="app-shell">
      <TopBar
        activeFilterCount={activeFilterCount}
        filters={filters}
        onFiltersChange={setFilters}
        onOpenFilters={() => setFiltersOpen(true)}
        selectedFlight={selectedFlight && visibleFlightIds.has(selectedFlight.id) ? selectedFlight : null}
        visibleFlightCount={visibleFlights.length}
      />

      <main className="monitor-layout">
        <FlightList
          chatMessages={chatMessages}
          eventsByFlight={eventsByFlight}
          filterOptions={filterOptions}
          filters={filters}
          filtersOpen={filtersOpen}
          flights={visibleFlights}
          mapVisibleFlightIds={mapVisibleFlightIds}
          onApplyTemplate={(template) => setFilters(template.filters)}
          onFiltersOpenChange={setFiltersOpen}
          onFiltersChange={setFilters}
          onHideFilteredFlights={() => setFilteredFlightsMapVisibility(false)}
          onSaveTemplate={saveCurrentTemplate}
          onSelectFlight={selectFlightFromList}
          onShowFilteredFlights={() => setFilteredFlightsMapVisibility(true)}
          onSortChange={setSort}
          onToggleMapFlight={toggleMapFlight}
          selectedFlightId={selectedFlightId}
          sort={sort}
          templates={templates}
          totalCount={flights.length}
        />

        <section className="map-stage" aria-label="Карта воздушной обстановки">
          <MapView
            eventsByFlight={eventsByFlight}
            flights={mapFlights}
            highlightedPoint={highlightedEventPoint}
            onSelectFlight={setSelectedFlightId}
            selectedFlight={selectedFlight && mapVisibleFlightIds.has(selectedFlight.id) ? selectedFlight : null}
            selectedFromListAt={selectedFromListAt}
          />
          <AlertsPanel
            events={visibleEvents}
            flightsById={flightsById}
            onMarkRead={markEventRead}
            onOpenEvent={openEvent}
            onSelectFlight={setSelectedFlightId}
          />
        </section>

        <DetailPanel
          chatMessages={chatMessages.filter((message) => message.flightId === selectedFlight?.id)}
          events={selectedEvents}
          flight={selectedFlight}
          onOpenEvent={openEvent}
          onTabChange={setDetailTab}
          tab={detailTab}
        />
      </main>

      {openedEvent && (
        <div className="modal-backdrop modal-backdrop--center" role="presentation" onMouseDown={closeEventModal}>
          <section className="event-modal" aria-label="Подробности сигнализации" onMouseDown={(event) => event.stopPropagation()}>
            <header className={`event-modal__header severity-${openedEvent.severity}`}>
              <div>
                <span>{eventCategory(openedEvent)}</span>
                <strong>{openedEventFlight ? getFlightLabel(openedEventFlight) : openedEvent.flightId}</strong>
              </div>
              <button aria-label="Закрыть" className="close-button" onClick={closeEventModal} type="button">
                <X aria-hidden="true" size={18} />
              </button>
            </header>
            <div className="event-modal__body">
              <p className="event-modal__lead">{openedEvent.text}</p>
              <p>{openedEvent.details ?? "Для события доступна карточка рейса, фактический трек и последние параметры на карте."}</p>
              {openedEvent.coordinates && (
                <div className="event-modal__coords">
                  <span>Координаты события</span>
                  <strong>
                    {openedEvent.coordinates.lat.toFixed(4)}, {openedEvent.coordinates.lng.toFixed(4)}
                  </strong>
                </div>
              )}
              {openedEventFlight && (
                <div className="event-modal__coords">
                  <span>Последняя точка рейса</span>
                  <strong>
                    {getCurrentPoint(openedEventFlight).altitudeFt.toLocaleString("ru-RU")} ft ·{" "}
                    {getCurrentPoint(openedEventFlight).speedKt} kt
                  </strong>
                </div>
              )}
            </div>
            <footer className="event-modal__footer">
              <button
                onClick={() => {
                  markEventRead(openedEvent.id);
                  setOpenedEvent(null);
                }}
                type="button"
              >
                Отметить прочитанным
              </button>
              <button
                className="secondary-action"
                onClick={() => showEventFlightOnMap(openedEvent)}
                type="button"
              >
                Показать на карте
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
