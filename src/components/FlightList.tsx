import { useState, type PointerEvent as ReactPointerEvent } from "react";
import { ChevronDown, PanelLeft, PanelLeftClose, X } from "lucide-react";
import { worstSeverity } from "../domain/events";
import { formatClock, getCurrentPoint, getFlightLabel } from "../domain/flightUtils";
import { dataSourceLabels, categoryLabels, statusLabels, trackerStateLabels } from "../domain/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { ChatMessage, FilterTemplate, Flight, FlightEvent, FlightFilters, FlightListMode, FlightSort } from "../types";

interface FlightListProps {
  aircraftCount: number;
  chatMessages: ChatMessage[];
  eventsByFlight: Map<string, FlightEvent[]>;
  filterOptions: Record<string, Array<{ value: string; label: string }>>;
  filters: FlightFilters;
  filtersOpen: boolean;
  flights: Flight[];
  flightsCount: number;
  listMode: FlightListMode;
  mapVisibleFlightIds: Set<string>;
  onApplyTemplate: (template: FilterTemplate) => void;
  onFiltersOpenChange: (open: boolean) => void;
  onFiltersChange: (filters: FlightFilters) => void;
  onHideFilteredFlights: () => void;
  onListModeChange: (mode: FlightListMode) => void;
  onSaveTemplate: (name: string) => void;
  onSelectFlight: (flightId: string) => void;
  onShowFilteredFlights: () => void;
  onSortChange: (sort: FlightSort) => void;
  onToggleMapFlight: (flightId: string) => void;
  onWidthChange: (width: number) => void;
  onToggleCollapse?: () => void;
  isCollapsed?: boolean;
  selectedFlightId: string | null;
  sort: FlightSort;
  templates: FilterTemplate[];
  totalCount: number;
  width: number;
}

function toggleValue(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

const severityBorderMap: Record<string, string> = {
  critical: "border-l-[3px] border-l-fw-critical",
  warning: "border-l-[3px] border-l-fw-warning",
  info: "border-l-[3px] border-l-transparent",
};

const statusChipClass: Record<string, string> = {
  ENR: "bg-[rgba(60,173,110,0.15)] text-fw-green border border-[rgba(60,173,110,0.3)]",
  ARR: "bg-[rgba(76,159,230,0.12)] text-fw-info border border-[rgba(76,159,230,0.25)]",
  PLN: "bg-panel-strong text-fw-muted border border-line",
  DLA: "bg-[rgba(221,162,26,0.12)] text-fw-warning border border-[rgba(221,162,26,0.3)]",
  ALT: "bg-[rgba(255,82,100,0.16)] text-fw-critical border border-[rgba(255,82,100,0.3)]",
  CNL: "bg-panel-strong text-fw-muted-2 border border-line",
};

function StatusChip({ status }: { status: string }) {
  const cls = statusChipClass[status] ?? "bg-panel-strong text-fw-muted border border-line";
  return (
    <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shrink-0", cls)}>
      {(statusLabels as Record<string, string>)[status] ?? status}
    </span>
  );
}

export function FlightList({
  aircraftCount,
  chatMessages,
  eventsByFlight,
  filterOptions,
  filters,
  filtersOpen,
  flights,
  flightsCount,
  listMode,
  mapVisibleFlightIds,
  onApplyTemplate,
  onFiltersOpenChange,
  onFiltersChange,
  onHideFilteredFlights,
  onListModeChange,
  onSaveTemplate,
  onSelectFlight,
  onShowFilteredFlights,
  onSortChange,
  onToggleMapFlight,
  onWidthChange,
  onToggleCollapse,
  isCollapsed,
  selectedFlightId,
  sort,
  templates,
  totalCount,
  width,
}: FlightListProps) {
  const startResize = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = width;
    const onMove = (ev: PointerEvent) => {
      if (ev.buttons !== 1) return;
      onWidthChange(Math.max(240, Math.min(560, startW + ev.clientX - startX)));
    };
    const stop = () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", stop);
    };
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", stop);
  };
  const [templateName, setTemplateName] = useState("");
  const [expandedFlightIds, setExpandedFlightIds] = useState<Set<string>>(() => new Set());
  const toggleExpand = (flightId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFlightIds((prev) => {
      const next = new Set(prev);
      if (next.has(flightId)) next.delete(flightId); else next.add(flightId);
      return next;
    });
  };
  const visibleEvents = flights.flatMap((flight) => eventsByFlight.get(flight.id) ?? []);
  const criticalCount = visibleEvents.filter((event) => event.severity === "critical").length;
  const warningCount = visibleEvents.filter((event) => event.severity === "warning").length;
  const listTitle = listMode === "flights" ? "Список рейсов" : "Список бортов";

  if (isCollapsed) {
    return (
      <aside className="relative flex flex-col items-center border-r border-line bg-panel min-h-0 pt-3 gap-2" aria-label={listTitle}>
        <button
          className="p-1.5 rounded text-fw-muted hover:text-fw-text hover:bg-panel-strong transition-colors"
          onClick={onToggleCollapse}
          title="Развернуть панель"
          type="button"
        >
          <PanelLeft size={18} strokeWidth={1.8} />
        </button>
        {criticalCount > 0 && (
          <span className="w-1.5 h-1.5 rounded-full bg-fw-critical" />
        )}
        {warningCount > 0 && criticalCount === 0 && (
          <span className="w-1.5 h-1.5 rounded-full bg-fw-warning" />
        )}
      </aside>
    );
  }
  const objectLabel = listMode === "flights" ? "рейсы" : "борта";

  const updateFilters = (patch: Partial<FlightFilters>) => onFiltersChange({ ...filters, ...patch });
  const updateMultiFilter = (key: keyof FlightFilters, value: string) => {
    updateFilters({ [key]: toggleValue(filters[key] as string[], value) } as Partial<FlightFilters>);
  };

  const resetFilters = () => onFiltersChange({
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
  });

  return (
    <aside className="relative flex flex-col border-r border-line bg-panel min-h-0" aria-label={listTitle}>
      {/* Resize handle */}
      <div
        className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize z-10 hover:bg-fw-accent/30 transition-colors"
        onPointerDown={startResize}
      />
      {/* Panel heading */}
      <div className="flex flex-col gap-1.5 px-3 pt-3 pb-2">
        <div className="flex items-center justify-between min-w-0">
          <h2 className="m-0 text-sm font-semibold text-fw-text">{listTitle}</h2>
          {onToggleCollapse && (
            <button
              className="p-1 rounded text-fw-muted-2 hover:text-fw-text hover:bg-panel-strong transition-colors shrink-0"
              onClick={onToggleCollapse}
              title="Свернуть панель"
              type="button"
            >
              <PanelLeftClose size={16} strokeWidth={1.8} />
            </button>
          )}
        </div>
        <p className="text-[11px] text-fw-muted">
          {flights.length} из {totalCount}
          {criticalCount > 0 && <> · <span className="text-fw-critical font-medium">ALERT {criticalCount}</span></>}
          {warningCount > 0 && <> · <span className="text-fw-warning font-medium">WARN {warningCount}</span></>}
        </p>
        <Tabs value={listMode} onValueChange={(v) => onListModeChange(v as FlightListMode)} className="w-full">
          <TabsList className="h-auto w-full">
            <TabsTrigger value="flights" className="flex-1 text-[11px] px-2 py-1">
              Рейсы <span className="ml-1 opacity-60">{flightsCount}</span>
            </TabsTrigger>
            <TabsTrigger value="aircraft" className="flex-1 text-[11px] px-2 py-1">
              Борта <span className="ml-1 opacity-60">{aircraftCount}</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 pb-2 border-b border-line">
        <label className="flex items-center gap-1.5 text-[11px] text-fw-muted w-full">
          <span className="shrink-0">Сорт.</span>
          <select
            className="bg-panel-strong border border-line rounded text-fw-text text-[11px] px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-fw-accent flex-1 min-w-0"
            aria-label={`Сортировка списка ${objectLabel}`}
            onChange={(event) => onSortChange(event.target.value as FlightSort)}
            value={sort}
          >
            <option value="default">По умолчанию</option>
            <option value="stdAsc">STD ↑</option>
            <option value="stdDesc">STD ↓</option>
          </select>
        </label>
      </div>

      {/* Flight list */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <div className="flex flex-col gap-px p-1">
          {flights.length === 0 ? (
            <div className="py-8 text-center text-[12px] text-fw-muted-2">
              Нет объектов под выбранные фильтры.
            </div>
          ) : (
            flights.map((flight) => {
              const events = eventsByFlight.get(flight.id) ?? [];
              const severity = worstSeverity(events);
              const point = getCurrentPoint(flight);
              const label = listMode === "aircraft" ? flight.aircraft.registration : getFlightLabel(flight);
              const hasAlert = events.some((event) => event.category === "ALERT" || event.severity === "critical");
              const hasWarning = events.some((event) => event.category === "WARNING" || event.severity === "warning");
              const hasUnreadChat = chatMessages.some((message) => message.flightId === flight.id && !message.read && !message.own);
              const isSelected = selectedFlightId === flight.id;

              const isExpanded = expandedFlightIds.has(flight.id);

              return (
                <div
                  key={flight.id}
                  className={cn(
                    "w-full rounded-md p-2 transition-colors border border-transparent overflow-hidden cursor-pointer",
                    severityBorderMap[severity] ?? severityBorderMap.info,
                    isSelected ? "bg-panel-soft border-line" : "bg-panel-strong hover:bg-panel-soft",
                  )}
                  onClick={() => onSelectFlight(flight.id)}
                >
                  {/* Header row: label + status + chevron */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    <strong className="text-[13px] font-semibold text-fw-text truncate flex-1 min-w-0">{label}</strong>
                    <StatusChip status={flight.operationalStatus ?? flight.status} />
                    <button
                      className="shrink-0 text-fw-muted-2 hover:text-fw-muted transition-transform ml-0.5"
                      style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
                      onClick={(e) => toggleExpand(flight.id, e)}
                      type="button"
                      aria-label={isExpanded ? "Свернуть" : "Развернуть"}
                    >
                      <ChevronDown size={13} />
                    </button>
                  </div>

                  {/* Metrics — always visible */}
                  <div className="flex items-center gap-1 mt-1 min-w-0">
                    {hasAlert && <Badge variant="critical">ALERT</Badge>}
                    {hasWarning && <Badge variant="warning">WARN</Badge>}
                    {hasUnreadChat && <Badge variant="info">CHAT</Badge>}
                    <div className="flex items-center gap-2 ml-auto text-[11px] text-fw-muted shrink-0">
                      <span>
                        <b className="text-fw-text font-semibold">{Math.round(point.altitudeFt).toLocaleString("ru-RU")}</b>
                        <small className="ml-0.5 text-fw-muted-2">ft</small>
                      </span>
                      <span>
                        <b className="text-fw-text font-semibold">{Math.round(point.speedKt)}</b>
                        <small className="ml-0.5 text-fw-muted-2">kt</small>
                      </span>
                      <span>
                        <b className="text-fw-text font-semibold">{Math.round(point.headingDeg)}°</b>
                        <small className="ml-0.5 text-fw-muted-2">hdg</small>
                      </span>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="mt-1.5 flex flex-col gap-0.5 overflow-hidden">
                      <p className="text-[11px] text-fw-muted truncate">
                        {listMode === "aircraft"
                          ? `Позывной ${flight.callsign ?? flight.aircraft.registration}`
                          : `STD ${formatClock(flight.plan.scheduledDeparture)}`}
                        {" · "}Сигнал {formatClock(flight.lastSignalAt)}
                      </p>
                      <p className="text-[11px] text-fw-muted-2 truncate">
                        {listMode === "aircraft" ? flight.aircraft.model : flight.aircraft.registration}
                        {" · "}{flight.aircraft.typeCode}
                        {" · "}{flight.plan.origin} → {flight.plan.destination}
                      </p>
                      <p className="text-[11px] text-fw-muted-2 leading-snug">
                        <span className="text-fw-muted font-medium">{trackerStateLabels[flight.tracker.state ?? "OK"]}</span>
                        {" · "}{dataSourceLabels[flight.tracker.source ?? "Tracker"]}
                        {" · "}{flight.statusEvidence}
                      </p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Filter modal */}
      <Dialog open={filtersOpen} onOpenChange={onFiltersOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" hideClose>
          <DialogHeader>
            <div className="min-w-0">
              <DialogTitle>Фильтры списка {objectLabel}</DialogTitle>
              <DialogDescription>Период, аэродромы, статусы и шаблоны диспетчера</DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-fw-muted hover:text-fw-text"
              aria-label="Закрыть"
              onClick={() => onFiltersOpenChange(false)}
            >
              <X aria-hidden="true" size={18} />
            </Button>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0">
            <div className="px-4 py-3 flex flex-col gap-4">
              {/* Template row */}
              <div className="flex items-center gap-2">
                <select
                  className="bg-panel-strong border border-line rounded text-fw-text text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-fw-accent flex-1"
                  aria-label="Шаблоны фильтров"
                  onChange={(event) => {
                    const template = templates.find((item) => item.id === event.target.value);
                    if (template) onApplyTemplate(template);
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>Выбрать шаблон</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>{template.name}</option>
                  ))}
                </select>
                <Input
                  className="border-line bg-panel-strong text-fw-text placeholder:text-fw-muted-2 flex-1"
                  onChange={(event) => setTemplateName(event.target.value)}
                  placeholder="Название нового шаблона"
                  value={templateName}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    if (templateName.trim()) { onSaveTemplate(templateName.trim()); setTemplateName(""); }
                  }}
                  type="button"
                >
                  Сохранить
                </Button>
              </div>

              {/* Quick filters grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <label className="flex flex-col gap-1 text-[11px] text-fw-muted uppercase tracking-wide">
                  Период STD
                  <select
                    className="bg-panel-strong border border-line rounded text-fw-text text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-fw-accent"
                    onChange={(event) => updateFilters({ period: event.target.value as FlightFilters["period"] })}
                    value={filters.period}
                  >
                    <option value="all">Любой</option>
                    <option value="lastHour">Последний час</option>
                    <option value="today">Сегодня</option>
                    <option value="signalOverdue">Нет сигнала</option>
                    <option value="custom">Произвольный</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-[11px] text-fw-muted uppercase tracking-wide">
                  Начало
                  <input
                    className="bg-panel-strong border border-line rounded text-fw-text text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-fw-accent"
                    onChange={(event) => updateFilters({ periodStart: event.target.value })}
                    type="datetime-local"
                    value={filters.periodStart}
                  />
                </label>
                <label className="flex flex-col gap-1 text-[11px] text-fw-muted uppercase tracking-wide">
                  Конец
                  <input
                    className="bg-panel-strong border border-line rounded text-fw-text text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-fw-accent"
                    onChange={(event) => updateFilters({ periodEnd: event.target.value })}
                    type="datetime-local"
                    value={filters.periodEnd}
                  />
                </label>
                <label className="flex flex-col gap-1 text-[11px] text-fw-muted uppercase tracking-wide">
                  Статус
                  <select
                    className="bg-panel-strong border border-line rounded text-fw-text text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-fw-accent"
                    onChange={(event) => updateFilters({ status: event.target.value as FlightFilters["status"] })}
                    value={filters.status}
                  >
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
                <label className="flex flex-col gap-1 text-[11px] text-fw-muted uppercase tracking-wide">
                  Категория
                  <select
                    className="bg-panel-strong border border-line rounded text-fw-text text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-fw-accent"
                    onChange={(event) => updateFilters({ eventCategory: event.target.value as FlightFilters["eventCategory"] })}
                    value={filters.eventCategory}
                  >
                    <option value="all">Все</option>
                    <option value="ALERT">ALERT</option>
                    <option value="WARNING">WARNING</option>
                    <option value="INFO">INFO</option>
                  </select>
                </label>
              </div>

              {/* Multi-select filter columns */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {([
                  ["aircraftTypes", "Тип ВС", filterOptions.aircraftTypes],
                  ["dep", "DEP", filterOptions.dep],
                  ["dest", "DEST", filterOptions.dest],
                  ["altn", "ALTN", filterOptions.altn],
                  ["etopsEra", "ETOPS/ERA", filterOptions.etopsEra],
                  ["tkoffAltn", "TKOFF ALTN", filterOptions.tkoffAltn],
                  ["aircraft", "Борт", filterOptions.aircraft],
                ] as const).map(([key, title, options]) => (
                  <div key={key} className="flex flex-col gap-1.5">
                    <strong className="text-[11px] text-fw-muted uppercase tracking-wide">{title}</strong>
                    {(options as Array<{ value: string; label: string }>).map((option) => (
                      <label key={option.value} className="flex items-center gap-1.5 text-[12px] text-fw-text cursor-pointer">
                        <input
                          className="accent-fw-accent"
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
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="ghost" size="sm" className="text-fw-muted" onClick={resetFilters} type="button">
              Сбросить
            </Button>
            <Button size="sm" onClick={() => onFiltersOpenChange(false)} type="button">
              Применить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
