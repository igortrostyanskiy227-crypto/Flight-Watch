import { useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Clock3, FileText, Info, MessageSquare, Plane, Settings, X, ClipboardList } from "lucide-react";
import { DEVIATION_WARNING_NM } from "../domain/events";
import {
  formatClock,
  formatCoordinate,
  formatDateTime,
  getCurrentPoint,
  getFlightLabel,
  signedDifference,
} from "../domain/flightUtils";
import {
  categoryLabels,
  dataSourceLabels,
  kindLabels,
  severityLabels,
  statusLabels,
  trackerStateLabels,
  warningScopeLabels,
} from "../domain/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { ChatMessage, Flight, FlightEvent } from "../types";

interface DetailPanelProps {
  chatMessages: ChatMessage[];
  events: FlightEvent[];
  flight: Flight | null;
  onClose: (() => void) | undefined;
  onOpenEvent: (event: FlightEvent) => void;
  onTabChange: (tab: DetailTab) => void;
  onWidthChange: (width: number) => void;
  tab: DetailTab;
  width: number;
}

type DetailTab = "summary" | "history" | "warnings" | "aerodromes";
type FlightModal = "main" | "aircraft" | "plan" | "ofp" | "times" | "documents" | "chat" | null;

function KvRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <>
      <span className="text-[11px] text-fw-muted py-1">{label}</span>
      <strong className="text-[12px] text-fw-text py-1 font-medium">{value}</strong>
    </>
  );
}

function KvGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-x-3" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,2fr)" }}>
      {children}
    </div>
  );
}


const statusChipClass: Record<string, string> = {
  ENR: "bg-[rgba(60,173,110,0.15)] text-fw-green border border-[rgba(60,173,110,0.3)]",
  ARR: "bg-[rgba(76,159,230,0.12)] text-fw-info border border-[rgba(76,159,230,0.25)]",
  PLN: "bg-panel-strong text-fw-muted border border-line",
  DLA: "bg-[rgba(221,162,26,0.12)] text-fw-warning border border-[rgba(221,162,26,0.3)]",
  ALT: "bg-[rgba(255,82,100,0.16)] text-fw-critical border border-[rgba(255,82,100,0.3)]",
  CNL: "bg-panel-strong text-fw-muted-2 border border-line",
};

export function DetailPanel({
  chatMessages, events, flight, onClose, onOpenEvent, onTabChange, onWidthChange, tab, width,
}: DetailPanelProps) {
  const [modal, setModal] = useState<FlightModal>(null);

  const startResize = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = width;
    const onMove = (ev: PointerEvent) => {
      if (ev.buttons !== 1) return;
      onWidthChange(Math.max(280, Math.min(600, startW - (ev.clientX - startX))));
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

  if (!flight) {
    return (
      <aside className="relative flex flex-col flex-1 items-center justify-center border-l border-line bg-panel" aria-label="Детали рейса">
        <div
          className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-fw-accent/30 transition-colors z-10"
          onPointerDown={startResize}
        />
        <p className="text-[12px] text-fw-muted-2">Выберите рейс для просмотра параметров.</p>
      </aside>
    );
  }

  const currentPoint = getCurrentPoint(flight);
  const label = getFlightLabel(flight);
  const speedDelta = signedDifference(flight.actual.speedKt, flight.plan.speedKt);
  const altitudeDelta = signedDifference(flight.actual.altitudeFt, flight.plan.altitudeFt);
  const deviationWarning = flight.actual.deviationNm > DEVIATION_WARNING_NM;
  const warningEvents = events.filter((e) => e.category === "WARNING" || e.category === "ALERT" || e.severity !== "info");
  const unreadMessages = chatMessages.filter((m) => !m.read && !m.own).length;

  const timelineItems = [
    ...events.map((e) => ({
      id: e.id,
      time: e.time,
      title: e.text,
      meta: `${severityLabels[e.severity]} · ${e.type}`,
      severity: e.severity,
    })),
    ...flight.route.map((p) => ({
      id: `${flight.id}-coord-${p.time}`,
      time: p.time,
      title: `${formatCoordinate(p.lat, "lat")} · ${formatCoordinate(p.lng, "lng")}`,
      meta: `${Math.round(p.altitudeFt).toLocaleString("ru-RU")} ft · ${Math.round(p.speedKt)} kt · ${Math.round(p.headingDeg)}°`,
      severity: "info" as const,
    })),
    ...flight.statusHistory.map((item) => ({
      id: `${flight.id}-status-${item.time}`,
      time: item.time,
      title: item.text,
      meta: statusLabels[item.status],
      severity: item.status === "alert" ? ("warning" as const) : ("info" as const),
    })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  const modalTitle = useMemo(() => {
    const titles: Record<NonNullable<FlightModal>, string> = {
      main: "Основная информация",
      aircraft: "Информация по ВС",
      plan: "План полёта",
      ofp: "OFP рейса",
      times: "Временные метки",
      documents: "ВС и документы",
      chat: "Чат рейса",
    };
    return modal ? titles[modal] : "";
  }, [modal]);

  const renderModalBody = () => {
    switch (modal) {
      case "main":
        return (
          <KvGrid>
            <KvRow label="Рейс" value={label} />
            <KvRow label="Оператор" value={flight.operator} />
            <KvRow label="Статус" value={statusLabels[flight.operationalStatus ?? flight.status]} />
            <KvRow label="Причина статуса" value={flight.statusEvidence} />
            <KvRow label="DEP → DEST" value={`${flight.plan.origin} → ${flight.plan.destination}`} />
            <KvRow label="STD / STA" value={`${formatClock(flight.plan.scheduledDeparture)} / ${formatClock(flight.plan.scheduledArrival)}`} />
          </KvGrid>
        );
      case "aircraft":
        return (
          <KvGrid>
            <KvRow label="Борт" value={flight.aircraft.registration} />
            <KvRow label="Тип ВС" value={`${flight.aircraft.model} · ${flight.aircraft.typeCode}`} />
            <KvRow label="Tracker" value={flight.tracker.id} />
            <KvRow label="Состояние трекера" value={trackerStateLabels[flight.tracker.state ?? "OK"]} />
            <KvRow label="Источник" value={dataSourceLabels[flight.tracker.source ?? "Tracker"]} />
            <KvRow label="Последнее сообщение" value={formatClock(flight.tracker.lastMessageAt ?? flight.lastSignalAt)} />
            <KvRow label="Батарея" value={`${flight.tracker.batteryPercent}%`} />
            <KvRow label="Координаты" value={`${formatCoordinate(currentPoint.lat, "lat")} · ${formatCoordinate(currentPoint.lng, "lng")}`} />
          </KvGrid>
        );
      case "plan":
        return (
          <KvGrid>
            <KvRow label="FPL/OFP route" value={flight.plan.routeName} />
            <KvRow label="DEP" value={flight.plan.origin} />
            <KvRow label="DEST" value={flight.plan.destination} />
            <KvRow label="ALTN" value={flight.plan.alternate ?? "не задан"} />
            <KvRow label="ETOPS/ERA" value={flight.plan.etopsAlternate ?? "не задан"} />
            <KvRow label="TKOFF ALTN" value={flight.plan.takeoffAlternate ?? "не задан"} />
            <KvRow label="Плановая высота" value={`${flight.plan.altitudeFt.toLocaleString("ru-RU")} ft`} />
            <KvRow label="Плановая скорость" value={`${flight.plan.speedKt} kt`} />
          </KvGrid>
        );
      case "ofp":
        return (
          <KvGrid>
            <KvRow label="Версия OFP" value="OFP-2026-04-28-A" />
            <KvRow label="Маршрут" value={flight.plan.routeName} />
            <KvRow label="Fuel remaining" value={`${flight.actual.fuelRemainingMin} мин`} />
            <KvRow label="Отклонение маршрута" value={`${flight.actual.deviationNm.toFixed(1)} NM`} />
            <KvRow label="План / факт скорость" value={`${flight.plan.speedKt} / ${Math.round(flight.actual.speedKt)} kt`} />
            <KvRow label="План / факт высота" value={`${flight.plan.altitudeFt.toLocaleString("ru-RU")} / ${Math.round(flight.actual.altitudeFt).toLocaleString("ru-RU")} ft`} />
          </KvGrid>
        );
      case "times":
        return (
          <div className="flex flex-col gap-2">
            {[
              { time: flight.plan.scheduledDeparture, code: "STD", desc: "Расчётное время вылета" },
              { time: flight.plan.scheduledArrival, code: "STA", desc: "Расчётное время прибытия" },
            ].map((item) => (
              <div key={item.code} className="flex items-start gap-3 py-1.5 border-b border-line last:border-0">
                <time className="text-[11px] text-fw-muted-2 shrink-0 w-32">{formatDateTime(item.time)}</time>
                <strong className="text-[12px] text-fw-text w-12 shrink-0">{item.code}</strong>
                <span className="text-[11px] text-fw-muted">{item.desc}</span>
              </div>
            ))}
            {flight.statusHistory.map((item) => (
              <div key={`${item.time}-${item.text}`} className="flex items-start gap-3 py-1.5 border-b border-line last:border-0">
                <time className="text-[11px] text-fw-muted-2 shrink-0 w-32">{formatDateTime(item.time)}</time>
                <strong className="text-[12px] text-fw-text shrink-0">{statusLabels[item.status]}</strong>
                <span className="text-[11px] text-fw-muted">{item.text}</span>
              </div>
            ))}
          </div>
        );
      case "documents":
        return (
          <KvGrid>
            <KvRow label="Бортовые документы" value="Актуальны" />
            <KvRow label="Технический статус" value={trackerStateLabels[flight.tracker.state ?? "OK"]} />
            <KvRow label="Последняя проверка" value={formatClock(flight.lastSignalAt)} />
            <KvRow label="Доступные пакеты" value="FPL, OFP, MEL/CDL, NOTAM bundle" />
            <KvRow label="Ограничения" value={warningEvents.length > 0 ? `${warningEvents.length} активных` : "нет активных"} />
          </KvGrid>
        );
      case "chat":
        return (
          <div className="flex flex-col gap-2">
            {chatMessages.length === 0 ? (
              <p className="text-[12px] text-fw-muted-2">Сообщений по рейсу пока нет.</p>
            ) : (
              chatMessages.map((msg) => (
                <div key={msg.id} className={cn("flex flex-col gap-0.5", msg.own && "items-end")}>
                  <strong className="text-[10px] text-fw-muted-2">
                    {msg.author} · {formatClock(msg.time)}
                  </strong>
                  <p className={cn(
                    "text-[12px] rounded-lg px-3 py-2 max-w-[80%] m-0",
                    msg.own ? "bg-fw-accent/20 text-fw-text" : "bg-panel-strong text-fw-text",
                  )}>{msg.text}</p>
                </div>
              ))
            )}
            <div className="flex gap-2 mt-2 pt-2 border-t border-line">
              <input
                className="flex-1 bg-panel-strong border border-line rounded-md px-3 py-1.5 text-sm text-fw-text placeholder:text-fw-muted-2 focus:outline-none focus:ring-1 focus:ring-fw-accent"
                placeholder="Введите сообщение..."
              />
              <Button size="sm" type="button">Отправить</Button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const statusKey = flight.operationalStatus ?? flight.status;
  const statusCls = statusChipClass[statusKey] ?? "bg-panel-strong text-fw-muted border border-line";

  const infoButtons = [
    ["main", "Инфо", Info],
    ["aircraft", "ВС", Settings],
    ["plan", "FPL", FileText],
    ["ofp", "OFP", ClipboardList],
    ["times", "Время", Clock3],
    ["documents", "Док.", Plane],
    ["chat", unreadMessages ? `Чат ${unreadMessages}` : "Чат", MessageSquare],
  ] as const;

  return (
    <aside className="relative flex flex-col flex-1 border-l border-line bg-panel min-h-0 overflow-hidden" aria-label="Детали выбранного рейса">
      {/* Left drag handle (desktop) */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-fw-accent/30 transition-colors z-10"
        onPointerDown={startResize}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-3 pt-3 pb-2 border-b border-line shrink-0">
        <div className="min-w-0">
          <span className="text-[10px] uppercase tracking-wider text-fw-muted">{kindLabels[flight.kind]}</span>
          <h2 className="m-0 mt-0.5 text-[15px] font-bold text-fw-text">{label}</h2>
          <p className="mt-0.5 text-[11px] text-fw-muted">{flight.operator}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 mt-1">
          <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider", statusCls)}>
            {statusLabels[statusKey]}
          </span>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-fw-muted hover:text-fw-text"
              aria-label="Закрыть"
              onClick={onClose}
              type="button"
            >
              <X size={16} />
            </Button>
          )}
        </div>
      </div>

      {/* Quick-access action buttons */}
      <div className="flex items-center gap-px px-1 py-1 border-b border-line overflow-x-auto shrink-0" aria-label="Разделы информации по рейсу">
        {infoButtons.map(([key, title, Icon]) => (
          <Button
            key={key}
            variant="ghost"
            size="sm"
            className={cn(
              "flex-col h-auto gap-0.5 px-2 py-1.5 text-[10px] text-fw-muted hover:text-fw-text hover:bg-panel-strong rounded",
              modal === key && "bg-panel-strong text-fw-text",
            )}
            onClick={() => setModal(key as FlightModal)}
            type="button"
          >
            <Icon aria-hidden="true" size={16} strokeWidth={2.15} />
            <span>{title}</span>
          </Button>
        ))}
      </div>

      {/* Detail tabs + content */}
      <Tabs value={tab} onValueChange={(v) => onTabChange(v as DetailTab)} className="flex flex-col flex-1 min-h-0">
        <TabsList className="rounded-none border-b border-line bg-transparent px-2 py-1 gap-0.5 h-auto justify-start">
          {([
            ["summary", "Параметры"],
            ["warnings", "Предупреждения"],
            ["aerodromes", "Аэродромы"],
            ["history", "История"],
          ] as const).map(([key, title]) => (
            <TabsTrigger
              key={key}
              value={key}
              className="text-[11px] px-2.5 py-1.5 rounded-md data-[state=active]:bg-panel-strong"
            >
              {title}
              {key === "warnings" && warningEvents.length > 0 && (
                <Badge variant="critical" className="ml-1 h-3.5 px-1 text-[9px]">{warningEvents.length}</Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-3 py-3 flex flex-col gap-4">
            <TabsContent value="summary">
              <div className="flex flex-col gap-8">
              {/* Aircraft section */}
              <section className="flex flex-col gap-2">
                <h3 className="text-[11px] font-semibold text-fw-muted uppercase tracking-wide m-0">Воздушное судно</h3>
                <KvGrid>
                  <KvRow label="Борт" value={flight.aircraft.registration} />
                  <KvRow label="Тип" value={flight.aircraft.model} />
                  <KvRow label="Tracker" value={flight.tracker.id} />
                  <KvRow label="Состояние" value={trackerStateLabels[flight.tracker.state ?? "OK"]} />
                  <KvRow label="Источник" value={dataSourceLabels[flight.tracker.source ?? "Tracker"]} />
                  <KvRow label="Обновлено" value={formatClock(flight.tracker.lastMessageAt ?? flight.lastSignalAt)} />
                  <KvRow label="Батарея" value={`${flight.tracker.batteryPercent}%`} />
                </KvGrid>
              </section>

              {/* Status evidence */}
              <section className="flex flex-col gap-2">
                <h3 className="text-[11px] font-semibold text-fw-muted uppercase tracking-wide m-0">Доказательство статуса</h3>
                <div className="rounded-md bg-panel-strong border border-line p-2.5">
                  <strong className="text-[12px] text-fw-text block mb-1">
                    {statusLabels[flight.operationalStatus ?? flight.status]}
                  </strong>
                  <p className="text-[11px] text-fw-muted m-0">{flight.statusEvidence}</p>
                </div>
              </section>

              {/* Current params */}
              <section className="flex flex-col gap-2">
                <h3 className="text-[11px] font-semibold text-fw-muted uppercase tracking-wide m-0">Текущие параметры</h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ["Широта", formatCoordinate(currentPoint.lat, "lat")],
                    ["Долгота", formatCoordinate(currentPoint.lng, "lng")],
                    ["Высота", `${Math.round(flight.actual.altitudeFt).toLocaleString("ru-RU")} ft`],
                    ["Скорость", `${Math.round(flight.actual.speedKt)} kt`],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-md bg-panel-strong border border-line p-2">
                      <span className="text-[10px] text-fw-muted block">{label}</span>
                      <strong className="text-[12px] text-fw-text font-medium">{value}</strong>
                    </div>
                  ))}
                </div>
              </section>

              {/* Plan vs actual */}
              <section className="flex flex-col gap-2">
                <h3 className="text-[11px] font-semibold text-fw-muted uppercase tracking-wide m-0">План / факт</h3>
                <div className="rounded-md border border-line overflow-hidden">
                  {[
                    { label: "Скорость", actual: `${Math.round(flight.actual.speedKt)} kt`, plan: `${flight.plan.speedKt} kt`, delta: `${speedDelta} kt`, warn: false },
                    { label: "Высота", actual: `${Math.round(flight.actual.altitudeFt).toLocaleString("ru-RU")} ft`, plan: `${flight.plan.altitudeFt.toLocaleString("ru-RU")} ft`, delta: `${altitudeDelta} ft`, warn: false },
                    { label: "Маршрут", actual: `${flight.actual.deviationNm.toFixed(1)} NM`, plan: `< ${DEVIATION_WARNING_NM} NM`, delta: deviationWarning ? "warning" : "ok", warn: deviationWarning },
                  ].map((row, i) => (
                    <div
                      key={row.label}
                      className={cn(
                        "grid gap-1 px-3 py-2 text-[11px] border-b border-line last:border-0",
                        row.warn ? "bg-[rgba(221,162,26,0.08)]" : i % 2 === 0 ? "bg-panel-strong" : "",
                      )}
                      style={{ gridTemplateColumns: "6rem 1fr 1fr auto" }}
                    >
                      <span className="text-fw-muted">{row.label}</span>
                      <strong className="text-fw-text font-medium">{row.actual}</strong>
                      <span className="text-fw-muted-2">{row.plan}</span>
                      <em className={cn("not-italic font-medium", row.warn ? "text-fw-warning" : "text-fw-muted-2")}>{row.delta}</em>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between text-[11px] text-fw-muted px-1">
                  <span>{flight.plan.origin}</span>
                  <strong className="text-fw-text font-medium truncate mx-2">{flight.plan.routeName}</strong>
                  <span>{flight.plan.destination}</span>
                </div>
              </section>
              </div>
            </TabsContent>

            <TabsContent value="warnings">
              <section className="flex flex-col gap-2">
                <h3 className="text-[11px] font-semibold text-fw-muted uppercase tracking-wide m-0">Список предупреждений</h3>
                {warningEvents.length === 0 ? (
                  <p className="text-[12px] text-fw-muted-2">Нет предупреждений по рейсу.</p>
                ) : (
                  warningEvents.map((event) => (
                    <button
                      key={event.id}
                      className={cn(
                        "w-full text-left rounded-md border p-2.5 transition-colors hover:bg-panel-strong",
                        event.severity === "critical"
                          ? "border-l-2 border-l-fw-critical border-y-line border-r-line"
                          : "border-l-2 border-l-fw-warning border-y-line border-r-line",
                      )}
                      onClick={() => onOpenEvent(event)}
                      type="button"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn("text-[10px]", event.read ? "text-fw-muted-2" : "")}>
                          {event.read ? "✓" : "●"}
                        </span>
                        <Badge variant={event.severity === "critical" ? "critical" : "warning"} className="text-[9px]">
                          {categoryLabels[event.category ?? (event.severity === "critical" ? "ALERT" : "WARNING")]}
                        </Badge>
                        <span className="text-[10px] text-fw-muted ml-auto">
                          {event.scope ? warningScopeLabels[event.scope] : "Рейс"}
                        </span>
                      </div>
                      <p className="text-[12px] text-fw-text m-0">{event.text}</p>
                    </button>
                  ))
                )}
              </section>
            </TabsContent>

            <TabsContent value="aerodromes">
              <section className="flex flex-col gap-2">
                <h3 className="text-[11px] font-semibold text-fw-muted uppercase tracking-wide m-0">Аэродромы и ограничения</h3>
                <div className="flex flex-col gap-1.5">
                  {[flight.plan.origin, flight.plan.destination, flight.plan.alternate]
                    .filter(Boolean)
                    .map((code, i) => (
                      <div key={`${code}-${i}`} className="flex items-center gap-3 rounded-md bg-panel-strong border border-line px-3 py-2">
                        <strong className="text-[13px] text-fw-text font-bold w-12 shrink-0">{code}</strong>
                        <span className="text-[11px] text-fw-muted">
                          {i === 1 ? "FZRA warning · NOTAM active" : "METAR актуален · ограничений нет"}
                        </span>
                      </div>
                    ))}
                </div>
              </section>
            </TabsContent>

            <TabsContent value="history">
              <section className="flex flex-col gap-2">
                <h3 className="text-[11px] font-semibold text-fw-muted uppercase tracking-wide m-0">Timeline</h3>
                <div className="flex flex-col gap-px">
                  {timelineItems.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-start gap-3 py-2 border-b border-line last:border-0 text-[11px]",
                        item.severity === "critical" ? "text-fw-critical" : item.severity === "warning" ? "text-fw-warning" : "",
                      )}
                    >
                      <time className="text-fw-muted-2 shrink-0 w-32">{formatDateTime(item.time)}</time>
                      <strong className="text-fw-text font-medium min-w-0 flex-1">{item.title}</strong>
                      <span className="text-fw-muted-2 text-right shrink-0 max-w-[120px] truncate">{item.meta}</span>
                    </div>
                  ))}
                </div>
              </section>
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>

      {/* Modal for flight info sections */}
      <Dialog open={modal !== null} onOpenChange={(open) => { if (!open) setModal(null); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col" hideClose>
          <DialogHeader>
            <div className="min-w-0">
              <DialogDescription className="text-[10px]">{label}</DialogDescription>
              <DialogTitle>{modalTitle}</DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-fw-muted hover:text-fw-text"
              aria-label="Закрыть"
              onClick={() => setModal(null)}
            >
              <X aria-hidden="true" size={18} />
            </Button>
          </DialogHeader>
          <ScrollArea className="flex-1 min-h-0">
            <div className="px-4 py-3">
              {renderModalBody()}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
