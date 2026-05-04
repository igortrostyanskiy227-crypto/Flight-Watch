import { useEffect, useMemo, useState } from "react";
import { AlertsPanel } from "./components/AlertsPanel";
import { DetailPanel } from "./components/DetailPanel";
import { FlightList } from "./components/FlightList";
import { MapView } from "./components/MapView";
import { TopBar } from "./components/TopBar";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./components/ui/dialog";
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
  FlightListMode,
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
    callsign: flight.flightNumber ? flight.callsign : flight.aircraft.registration,
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

function isInListMode(flight: Flight, listMode: FlightListMode): boolean {
  return listMode === "flights" ? Boolean(flight.flightNumber) : !flight.flightNumber;
}

function countActiveFilters(filters: FlightFilters): number {
  return [
    filters.status !== "all",
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
  const [listMode, setListMode] = useState<FlightListMode>("flights");
  const [sort, setSort] = useState<FlightSort>("default");
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(mockFlights[0]?.id ?? null);
  const [selectedFromListAt, setSelectedFromListAt] = useState(0);
  const [detailTab, setDetailTab] = useState<"summary" | "history" | "warnings" | "aerodromes">("summary");
  const [readEventIds, setReadEventIds] = useState<Set<string>>(() => new Set());
  const [dismissedEventIds, setDismissedEventIds] = useState<Set<string>>(() => new Set());
  const [criticalAutoOpenPaused, setCriticalAutoOpenPaused] = useState(false);
  const [mapVisibleFlightIds, setMapVisibleFlightIds] = useState<Set<string>>(() => new Set(mockFlights.map((flight) => flight.id)));
  const [openedEvent, setOpenedEvent] = useState<FlightEvent | null>(null);
  const [leftPanelWidth, setLeftPanelWidth] = useState(344);
  const [rightPanelWidth, setRightPanelWidth] = useState(374);
  const [windowWidth, setWindowWidth] = useState(() => window.innerWidth);
  const [detailOverlayOpen, setDetailOverlayOpen] = useState(false);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);

  useEffect(() => {
    const handler = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const isTablet = windowWidth < 900;
  const isMobile = windowWidth < 600;

  useEffect(() => {
    if (isTablet && selectedFlightId) setDetailOverlayOpen(true);
  }, [selectedFlightId, isTablet]);

  useEffect(() => {
    if (!isTablet) {
      setDetailOverlayOpen(false);
      setLeftPanelCollapsed(false);
    }
  }, [isTablet]);

  const tabletLeftWidth = leftPanelCollapsed ? 48 : Math.min(leftPanelWidth, 280);
  const gridCols = isMobile
    ? "1fr"
    : isTablet
      ? `${tabletLeftWidth}px 1fr`
      : `${leftPanelWidth}px minmax(420px, 1fr) ${rightPanelWidth}px`;

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
  const flightsForMode = useMemo(() => flights.filter((flight) => isInListMode(flight, listMode)), [flights, listMode]);
  const flightsCount = useMemo(() => flights.filter((flight) => isInListMode(flight, "flights")).length, [flights]);
  const aircraftCount = flights.length - flightsCount;
  const filteredFlights = useMemo(
    () => sortFlights(filterFlights(flightsForMode, filters, eventsByFlight), sort),
    [eventsByFlight, filters, flightsForMode, sort],
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
      aircraft: flightsForMode.map((flight) => ({
        value: flight.aircraft.registration,
        label: `${flight.aircraft.registration} · ${flight.aircraft.typeCode}`,
      })),
      aircraftTypes: uniqueOptions(flightsForMode.map((flight) => flight.aircraft.typeCode)),
      dep: uniqueOptions(flightsForMode.map((flight) => flight.plan.origin)),
      dest: uniqueOptions(flightsForMode.map((flight) => flight.plan.destination)),
      altn: uniqueOptions(flightsForMode.map((flight) => flight.plan.alternate)),
      etopsEra: uniqueOptions(flightsForMode.map((flight) => flight.plan.etopsAlternate)),
      tkoffAltn: uniqueOptions(flightsForMode.map((flight) => flight.plan.takeoffAlternate)),
    }),
    [flights, flightsForMode],
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
        listMode={listMode}
        onFiltersChange={setFilters}
        onOpenFilters={() => setFiltersOpen(true)}
        selectedFlight={selectedFlight && visibleFlightIds.has(selectedFlight.id) ? selectedFlight : null}
        visibleFlightCount={visibleFlights.length}
      />

      <main className="monitor-layout" style={{ gridTemplateColumns: gridCols }}>
        <FlightList
          chatMessages={chatMessages}
          eventsByFlight={eventsByFlight}
          filterOptions={filterOptions}
          filters={filters}
          filtersOpen={filtersOpen}
          flights={visibleFlights}
          aircraftCount={aircraftCount}
          flightsCount={flightsCount}
          listMode={listMode}
          mapVisibleFlightIds={mapVisibleFlightIds}
          onApplyTemplate={(template) => setFilters(template.filters)}
          onFiltersOpenChange={setFiltersOpen}
          onFiltersChange={setFilters}
          onHideFilteredFlights={() => setFilteredFlightsMapVisibility(false)}
          onListModeChange={setListMode}
          onSaveTemplate={saveCurrentTemplate}
          onSelectFlight={selectFlightFromList}
          onShowFilteredFlights={() => setFilteredFlightsMapVisibility(true)}
          onSortChange={setSort}
          onToggleMapFlight={toggleMapFlight}
          onWidthChange={setLeftPanelWidth}
          isCollapsed={isTablet ? leftPanelCollapsed : false}
          onToggleCollapse={isTablet ? () => setLeftPanelCollapsed((v) => !v) : undefined}
          selectedFlightId={selectedFlightId}
          sort={sort}
          templates={templates}
          totalCount={flightsForMode.length}
          width={leftPanelWidth}
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
            mockNow={MOCK_NOW}
            onMarkRead={markEventRead}
            onOpenEvent={openEvent}
            onSelectFlight={setSelectedFlightId}
            selectedFlight={selectedFlight}
          />
        </section>

        {!isTablet && (
          <DetailPanel
            chatMessages={chatMessages.filter((message) => message.flightId === selectedFlight?.id)}
            events={selectedEvents}
            flight={selectedFlight}
            onClose={undefined}
            onOpenEvent={openEvent}
            onTabChange={setDetailTab}
            onWidthChange={setRightPanelWidth}
            tab={detailTab}
            width={rightPanelWidth}
          />
        )}
      </main>

      {/* Tablet: DetailPanel as slide-over overlay */}
      {isTablet && detailOverlayOpen && (
        <>
          <div
            className="fixed inset-0 z-[499] bg-black/50"
            onClick={() => setDetailOverlayOpen(false)}
          />
          <div
            className="fixed right-0 top-0 bottom-0 z-[500] flex flex-col"
            style={{ width: Math.min(rightPanelWidth, windowWidth * 0.92) }}
          >
            <DetailPanel
              chatMessages={chatMessages.filter((message) => message.flightId === selectedFlight?.id)}
              events={selectedEvents}
              flight={selectedFlight}
              onClose={() => setDetailOverlayOpen(false)}
              onOpenEvent={openEvent}
              onTabChange={setDetailTab}
              onWidthChange={setRightPanelWidth}
              tab={detailTab}
              width={rightPanelWidth}
            />
          </div>
        </>
      )}

      {/* Mobile: show map-only + open list/detail buttons */}
      {isMobile && (
        <div className="fixed bottom-24 left-3 z-[410] flex gap-2">
          <button
            className="rounded-full bg-panel border border-line px-4 py-2 text-[12px] text-fw-text shadow-lg"
            onClick={() => setDetailOverlayOpen(!detailOverlayOpen)}
            type="button"
          >
            {detailOverlayOpen ? "Карта" : "Детали"}
          </button>
        </div>
      )}

      <Dialog open={openedEvent !== null} onOpenChange={(open) => { if (!open) closeEventModal(); }}>
        {openedEvent && (
          <DialogContent className="max-w-md" hideClose>
            <DialogHeader className={
              openedEvent.severity === "critical"
                ? "bg-[rgba(255,82,100,0.1)] border-b-[rgba(255,82,100,0.3)]"
                : openedEvent.severity === "warning"
                ? "bg-[rgba(221,162,26,0.08)] border-b-[rgba(221,162,26,0.25)]"
                : ""
            }>
              <div className="min-w-0 flex-1">
                <Badge
                  variant={openedEvent.severity === "critical" ? "critical" : openedEvent.severity === "warning" ? "warning" : "info"}
                  className="mb-1"
                >
                  {eventCategory(openedEvent)}
                </Badge>
                <DialogTitle>
                  {openedEventFlight ? getFlightLabel(openedEventFlight) : openedEvent.flightId}
                </DialogTitle>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 text-fw-muted hover:text-fw-text"
                aria-label="Закрыть"
                onClick={closeEventModal}
              >
                ×
              </Button>
            </DialogHeader>

            <div className="px-4 py-3 flex flex-col gap-3">
              <p className="text-[13px] font-medium text-fw-text m-0">{openedEvent.text}</p>
              <p className="text-[12px] text-fw-muted m-0">
                {openedEvent.details ?? "Для события доступна карточка рейса, фактический трек и последние параметры на карте."}
              </p>

              {openedEvent.coordinates && (
                <div className="flex items-center justify-between rounded-md bg-panel-strong border border-line px-3 py-2 text-[12px]">
                  <span className="text-fw-muted">Координаты события</span>
                  <strong className="text-fw-text font-medium">
                    {openedEvent.coordinates.lat.toFixed(4)}, {openedEvent.coordinates.lng.toFixed(4)}
                  </strong>
                </div>
              )}

              {openedEventFlight && (
                <div className="flex items-center justify-between rounded-md bg-panel-strong border border-line px-3 py-2 text-[12px]">
                  <span className="text-fw-muted">Последняя точка рейса</span>
                  <strong className="text-fw-text font-medium">
                    {getCurrentPoint(openedEventFlight).altitudeFt.toLocaleString("ru-RU")} ft ·{" "}
                    {getCurrentPoint(openedEventFlight).speedKt} kt
                  </strong>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="ghost"
                size="sm"
                className="text-fw-muted"
                onClick={() => showEventFlightOnMap(openedEvent)}
                type="button"
              >
                Показать на карте
              </Button>
              <Button
                size="sm"
                onClick={() => { markEventRead(openedEvent.id); setOpenedEvent(null); }}
                type="button"
              >
                Отметить прочитанным
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
