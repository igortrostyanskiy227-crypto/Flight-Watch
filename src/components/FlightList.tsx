import { useState } from "react";
import { Eye, EyeOff, MapPin, X } from "lucide-react";
import { worstSeverity } from "../domain/events";
import { formatClock, getCurrentPoint, getFlightLabel } from "../domain/flightUtils";
import { dataSourceLabels, categoryLabels, statusLabels, trackerStateLabels } from "../domain/labels";
import type { ChatMessage, FilterTemplate, Flight, FlightEvent, FlightFilters, FlightSort } from "../types";

interface FlightListProps {
  chatMessages: ChatMessage[];
  eventsByFlight: Map<string, FlightEvent[]>;
  filterOptions: Record<string, Array<{ value: string; label: string }>>;
  filters: FlightFilters;
  filtersOpen: boolean;
  flights: Flight[];
  mapVisibleFlightIds: Set<string>;
  onApplyTemplate: (template: FilterTemplate) => void;
  onFiltersOpenChange: (open: boolean) => void;
  onFiltersChange: (filters: FlightFilters) => void;
  onHideFilteredFlights: () => void;
  onSaveTemplate: (name: string) => void;
  onSelectFlight: (flightId: string) => void;
  onShowFilteredFlights: () => void;
  onSortChange: (sort: FlightSort) => void;
  onToggleMapFlight: (flightId: string) => void;
  selectedFlightId: string | null;
  sort: FlightSort;
  templates: FilterTemplate[];
  totalCount: number;
}

function toggleValue(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export function FlightList({
  chatMessages,
  eventsByFlight,
  filterOptions,
  filters,
  filtersOpen,
  flights,
  mapVisibleFlightIds,
  onApplyTemplate,
  onFiltersOpenChange,
  onFiltersChange,
  onHideFilteredFlights,
  onSaveTemplate,
  onSelectFlight,
  onShowFilteredFlights,
  onSortChange,
  onToggleMapFlight,
  selectedFlightId,
  sort,
  templates,
  totalCount,
}: FlightListProps) {
  const [templateName, setTemplateName] = useState("");
  const visibleEvents = flights.flatMap((flight) => eventsByFlight.get(flight.id) ?? []);
  const criticalCount = visibleEvents.filter((event) => event.severity === "critical").length;
  const warningCount = visibleEvents.filter((event) => event.severity === "warning").length;

  const updateFilters = (patch: Partial<FlightFilters>) => onFiltersChange({ ...filters, ...patch });
  const updateMultiFilter = (key: keyof FlightFilters, value: string) => {
    updateFilters({ [key]: toggleValue(filters[key] as string[], value) } as Partial<FlightFilters>);
  };

  return (
    <aside className="left-panel" aria-label="Список рейсов">
      <div className="panel-heading">
        <div>
          <h2>Рейсы и полёты</h2>
          <p>
            {flights.length} из {totalCount} · ALERT {criticalCount} · WARNING {warningCount}
          </p>
        </div>
      </div>

      <div className="flight-toolbar">
        <label className="flight-sort-control">
          <span>Сортировка</span>
          <select aria-label="Сортировка списка рейсов" onChange={(event) => onSortChange(event.target.value as FlightSort)} value={sort}>
            <option value="default">По умолчанию</option>
            <option value="stdAsc">STD ↑</option>
            <option value="stdDesc">STD ↓</option>
          </select>
        </label>
        <span className="map-bulk-label">Рейсы на карте</span>
        <div className="map-bulk-actions">
          <button aria-label="Показать отфильтрованные рейсы на карте" onClick={onShowFilteredFlights} type="button">
            <Eye aria-hidden="true" size={16} />
            Показать
          </button>
          <button aria-label="Скрыть отфильтрованные рейсы с карты" onClick={onHideFilteredFlights} type="button">
            <EyeOff aria-hidden="true" size={16} />
            Скрыть
          </button>
        </div>
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
            const hasAlert = events.some((event) => event.category === "ALERT" || event.severity === "critical");
            const hasWarning = events.some((event) => event.category === "WARNING" || event.severity === "warning");
            const hasUnreadChat = chatMessages.some((message) => message.flightId === flight.id && !message.read && !message.own);
            const mapVisible = mapVisibleFlightIds.has(flight.id);

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
                    <small>
                      STD {formatClock(flight.plan.scheduledDeparture)} · Сигнал {formatClock(flight.lastSignalAt)}
                    </small>
                  </span>
                  <span className={`status-chip status-${flight.operationalStatus ?? flight.status}`}>
                    {statusLabels[flight.operationalStatus ?? flight.status]}
                  </span>
                </span>

                <span className="flight-card__aircraft">
                  {flight.aircraft.registration} · {flight.aircraft.model} · {flight.plan.origin} → {flight.plan.destination}
                </span>

                <span className="flight-card__evidence">
                  <strong>{trackerStateLabels[flight.tracker.state ?? "OK"]}</strong>
                  <span>
                    {dataSourceLabels[flight.tracker.source ?? "Tracker"]} · {flight.statusEvidence}
                  </span>
                </span>

                <span className="flight-card__indicators">
                  <span className={mapVisible ? "is-active" : ""} onClick={(event) => event.stopPropagation()}>
                    <button
                      aria-label={mapVisible ? "Скрыть рейс с карты" : "Показать рейс на карте"}
                      onClick={() => onToggleMapFlight(flight.id)}
                      type="button"
                    >
                      <MapPin aria-hidden="true" size={13} />
                      {mapVisible ? "На карте" : "Скрыт"}
                    </button>
                  </span>
                  {hasAlert && <em className="indicator-alert">{categoryLabels.ALERT}</em>}
                  {hasWarning && <em className="indicator-warning">{categoryLabels.WARNING}</em>}
                  {hasUnreadChat && <em className="indicator-chat">CHAT</em>}
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

      {filtersOpen && (
        <div className="modal-backdrop modal-backdrop--center" role="presentation" onMouseDown={() => onFiltersOpenChange(false)}>
          <section className="filter-modal" aria-label="Фильтры списка рейсов" onMouseDown={(event) => event.stopPropagation()}>
            <header className="share-modal__header">
              <div>
                <strong>Фильтры списка рейсов</strong>
                <span>Период, аэродромы, статусы и шаблоны диспетчера</span>
              </div>
              <button aria-label="Закрыть" className="close-button" onClick={() => onFiltersOpenChange(false)} type="button">
                <X aria-hidden="true" size={18} />
              </button>
            </header>

            <div className="filter-template-row">
              <select aria-label="Шаблоны фильтров" onChange={(event) => {
                const template = templates.find((item) => item.id === event.target.value);
                if (template) onApplyTemplate(template);
              }} defaultValue="">
                <option value="" disabled>
                  Выбрать шаблон
                </option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
              <input
                onChange={(event) => setTemplateName(event.target.value)}
                placeholder="Название нового шаблона"
                value={templateName}
              />
              <button
                onClick={() => {
                  if (templateName.trim()) {
                    onSaveTemplate(templateName.trim());
                    setTemplateName("");
                  }
                }}
                type="button"
              >
                Сохранить
              </button>
            </div>

            <div className="filter-grid">
              <label>
                Период STD
                <select onChange={(event) => updateFilters({ period: event.target.value as FlightFilters["period"] })} value={filters.period}>
                  <option value="all">Любой</option>
                  <option value="lastHour">Последний час</option>
                  <option value="today">Сегодня</option>
                  <option value="signalOverdue">Нет сигнала</option>
                  <option value="custom">Произвольный</option>
                </select>
              </label>
              <label>
                Начало
                <input onChange={(event) => updateFilters({ periodStart: event.target.value })} type="datetime-local" value={filters.periodStart} />
              </label>
              <label>
                Конец
                <input onChange={(event) => updateFilters({ periodEnd: event.target.value })} type="datetime-local" value={filters.periodEnd} />
              </label>
              <label>
                Статус
                <select onChange={(event) => updateFilters({ status: event.target.value as FlightFilters["status"] })} value={filters.status}>
                  <option value="all">Все</option>
                  <option value="PLN">PLN</option>
                  <option value="DLA">DLA</option>
                  <option value="ENR">ENR</option>
                  <option value="ARR">ARR</option>
                  <option value="ALT">ALT</option>
                  <option value="CNL">CNL</option>
                  <option value="alarm">ALERT/WARNING</option>
                </select>
              </label>
              <label>
                Категория
                <select onChange={(event) => updateFilters({ eventCategory: event.target.value as FlightFilters["eventCategory"] })} value={filters.eventCategory}>
                  <option value="all">Все</option>
                  <option value="ALERT">ALERT</option>
                  <option value="WARNING">WARNING</option>
                  <option value="INFO">INFO</option>
                </select>
              </label>
              <label>
                Тип полета
                <select onChange={(event) => updateFilters({ kind: event.target.value as FlightFilters["kind"] })} value={filters.kind}>
                  <option value="all">Все</option>
                  <option value="commercial">Рейс</option>
                  <option value="private">Полёт</option>
                </select>
              </label>
            </div>

            <div className="filter-columns">
              {[
                ["aircraftTypes", "Тип ВС", filterOptions.aircraftTypes],
                ["dep", "DEP", filterOptions.dep],
                ["dest", "DEST", filterOptions.dest],
                ["altn", "ALTN", filterOptions.altn],
                ["etopsEra", "ETOPS/ERA", filterOptions.etopsEra],
                ["tkoffAltn", "TKOFF ALTN", filterOptions.tkoffAltn],
                ["aircraft", "Борт", filterOptions.aircraft],
              ].map(([key, title, options]) => (
                <div className="filter-checks" key={key as string}>
                  <strong>{title as string}</strong>
                  {(options as Array<{ value: string; label: string }>).map((option) => (
                    <label key={option.value}>
                      <input
                        checked={(filters[key as keyof FlightFilters] as string[]).includes(option.value)}
                        onChange={() => updateMultiFilter(key as keyof FlightFilters, option.value)}
                        type="checkbox"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              ))}
            </div>

            <footer className="event-modal__footer">
              <button onClick={() => onFiltersOpenChange(false)} type="button">
                Применить
              </button>
              <button className="secondary-action" onClick={() => onFiltersChange({
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
              })} type="button">
                Сбросить
              </button>
            </footer>
          </section>
        </div>
      )}
    </aside>
  );
}
