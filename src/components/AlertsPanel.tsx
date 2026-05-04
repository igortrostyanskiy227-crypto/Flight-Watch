import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Check, Circle, Eye, MapPinned } from "lucide-react";
import { formatClock, getFlightLabel } from "../domain/flightUtils";
import { severityLabels } from "../domain/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Flight, FlightEvent } from "../types";

interface AlertsPanelProps {
  events: FlightEvent[];
  flightsById: Map<string, Flight>;
  mockNow: Date;
  onMarkRead: (eventId: string) => void;
  onOpenEvent: (event: FlightEvent) => void;
  onSelectFlight: (flightId: string) => void;
  selectedFlight: Flight | null;
}

const severityRowClass: Record<string, string> = {
  critical: "border-l-2 border-l-fw-critical bg-[rgba(255,82,100,0.05)]",
  warning: "border-l-2 border-l-fw-warning bg-[rgba(221,162,26,0.05)]",
  info: "border-l-2 border-l-transparent",
};

function FlightChart({ flight, mockNow }: { flight: Flight; mockNow: Date }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const W = 1000;
  const H = 100;
  const points = flight.route;

  if (points.length < 2) {
    return (
      <div className="flex items-center justify-center h-28 text-[11px] text-fw-muted-2">
        Недостаточно точек маршрута для графика
      </div>
    );
  }

  const times = points.map((p) => new Date(p.time).getTime());
  const minT = times[0];
  const maxT = times[times.length - 1];
  const range = maxT - minT || 1;

  const maxAlt = Math.max(...points.map((p) => p.altitudeFt), flight.plan.altitudeFt, 1);
  const maxSpd = Math.max(...points.map((p) => p.speedKt), flight.plan.speedKt, 1);

  const tx = (t: number) => ((t - minT) / range) * W;
  const tyAlt = (v: number) => H - (v / maxAlt) * (H - 6) - 3;
  const tySpd = (v: number) => H - (v / maxSpd) * (H - 6) - 3;

  const altPts = points.map((p, i) => `${tx(times[i])},${tyAlt(p.altitudeFt)}`).join(" ");
  const spdPts = points.map((p, i) => `${tx(times[i])},${tySpd(p.speedKt)}`).join(" ");

  const nowT = mockNow.getTime();
  const nowX = Math.max(0, Math.min(W, tx(nowT)));
  const planAltY = tyAlt(flight.plan.altitudeFt);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const svgX = relX * W;
    const nearestIdx = points.reduce((best, _, i) =>
      Math.abs(tx(times[i]) - svgX) < Math.abs(tx(times[best]) - svgX) ? i : best, 0,
    );
    setHoverIdx(nearestIdx);
  };

  const hP = hoverIdx !== null ? points[hoverIdx] : null;
  const hX = hoverIdx !== null ? tx(times[hoverIdx]) : null;
  const hPct = hX !== null ? hX / W : null;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="w-full h-28 block cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {/* Plan altitude dashed */}
        <line
          x1={0} x2={W} y1={planAltY} y2={planAltY}
          stroke="rgba(76,159,230,0.35)" strokeWidth="0.8" strokeDasharray="4,3"
          vectorEffect="non-scaling-stroke"
        />
        {/* Altitude line */}
        <polyline points={altPts} fill="none" stroke="#4c9fe6" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        {/* Speed line */}
        <polyline points={spdPts} fill="none" stroke="#3cad6e" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        {/* Now (current time) marker */}
        <line
          x1={nowX} x2={nowX} y1={0} y2={H}
          stroke="rgba(217,154,0,0.8)" strokeWidth="1" vectorEffect="non-scaling-stroke"
        />
        {/* Hover crosshair + dots */}
        {hoverIdx !== null && hX !== null && hP && (
          <>
            <line
              x1={hX} x2={hX} y1={0} y2={H}
              stroke="rgba(237,243,251,0.25)" strokeWidth="0.8" vectorEffect="non-scaling-stroke"
            />
            <circle cx={hX} cy={tyAlt(hP.altitudeFt)} r="4" fill="#4c9fe6" vectorEffect="non-scaling-stroke" />
            <circle cx={hX} cy={tySpd(hP.speedKt)} r="4" fill="#3cad6e" vectorEffect="non-scaling-stroke" />
          </>
        )}
      </svg>

      {/* Hover tooltip */}
      {hoverIdx !== null && hP !== null && hPct !== null && (
        <div
          className="absolute top-1 pointer-events-none bg-panel-strong border border-line rounded px-2 py-1.5 text-[10px] text-fw-text whitespace-nowrap z-10 shadow-lg"
          style={{
            left: `${hPct * 100}%`,
            transform: hPct > 0.65 ? "translateX(-100%)" : "translateX(6px)",
          }}
        >
          <div className="text-fw-muted-2 mb-1">{formatClock(new Date(times[hoverIdx]))}</div>
          <div className="text-fw-info">{Math.round(hP.altitudeFt).toLocaleString("ru-RU")} ft</div>
          <div className="text-fw-green">{Math.round(hP.speedKt)} kt · {Math.round(hP.headingDeg)}°</div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-3 px-3 py-1.5 border-t border-line bg-panel-strong text-[10px] text-fw-muted">
        <span className="flex items-center gap-1">
          <span className="h-0.5 w-4 bg-fw-info inline-block" />Высота факт
        </span>
        <span className="flex items-center gap-1">
          <span className="h-0.5 w-4 bg-fw-green inline-block" />Скорость факт
        </span>
        <span className="flex items-center gap-1">
          <span className="h-0.5 w-3 bg-fw-muted-2 inline-block" style={{ borderTop: "1px dashed" }} />План
        </span>
        <span className="flex items-center gap-1 ml-auto">
          <span className="h-3 w-px bg-fw-accent inline-block" />Сейчас
        </span>
      </div>
    </div>
  );
}

export function AlertsPanel({
  events,
  flightsById,
  mockNow,
  onMarkRead,
  onOpenEvent,
  onSelectFlight,
  selectedFlight,
}: AlertsPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const criticalCount = events.filter((event) => event.severity === "critical").length;
  const warningCount = events.filter((event) => event.severity === "warning").length;

  const startDragScroll = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;
    const startX = e.clientX;
    const startLeft = el.scrollLeft;
    const onMove = (ev: PointerEvent) => {
      if (ev.buttons !== 1) return;
      el.scrollLeft = startLeft - (ev.clientX - startX);
    };
    const stop = () => {
      el.style.cursor = "";
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", stop);
    };
    el.style.cursor = "grabbing";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", stop);
  };

  return (
    <section
      className="absolute bottom-0 left-0 right-0 flex flex-col border-t border-line bg-panel"
      aria-label="Панель событий"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2 border-b border-line shrink-0">
        <div className="min-w-0">
          <h2 className="m-0 text-[13px] font-semibold text-fw-text">События и сигнализации</h2>
          <div className="flex items-center gap-3 mt-0.5 text-[11px] text-fw-muted">
            {criticalCount > 0 && (
              <span className="flex items-center gap-1 text-fw-critical">
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                Критические {criticalCount}
              </span>
            )}
            {warningCount > 0 && (
              <span className="flex items-center gap-1 text-fw-warning">
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                Предупреждения {warningCount}
              </span>
            )}
            <span className="text-fw-muted-2">Всего {events.length}</span>
          </div>
        </div>
      </div>

      {/* Events stream */}
      <div
        ref={scrollRef}
        className="overflow-x-auto overflow-y-hidden alerts-scroll shrink-0 cursor-grab select-none"
        style={{ height: 130 }}
        onPointerDown={startDragScroll}
      >
        <div className="flex h-full gap-px p-1.5 min-w-max">
          {events.length === 0 ? (
            <div className="flex items-center px-4 text-[12px] text-fw-muted-2">
              Нет событий в текущем отображении.
            </div>
          ) : (
            events.slice(0, 10).map((event) => {
              const flight = flightsById.get(event.flightId);

              return (
                <button
                  key={event.id}
                  className={cn(
                    "flex flex-col gap-1 w-[220px] shrink-0 rounded-md p-2 text-left transition-colors",
                    "border border-transparent hover:border-line",
                    event.read ? "opacity-60" : "",
                    severityRowClass[event.severity] ?? severityRowClass.info,
                  )}
                  onClick={() => onOpenEvent(event)}
                  type="button"
                >
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={cn(
                        "shrink-0",
                        event.read ? "text-fw-muted-2" : event.severity === "critical" ? "text-fw-critical" : "text-fw-warning",
                      )}
                    >
                      {event.read
                        ? <Check aria-hidden="true" size={12} />
                        : <Circle aria-hidden="true" size={9} fill="currentColor" />}
                    </span>
                    <span className="text-[11px] text-fw-muted-2 shrink-0">{formatClock(event.time)}</span>
                    <Badge
                      variant={event.severity === "critical" ? "critical" : event.severity === "warning" ? "warning" : "info"}
                      className="ml-auto text-[9px] px-1 py-0 shrink-0"
                    >
                      {severityLabels[event.severity]}
                    </Badge>
                  </div>

                  <strong className="text-[12px] text-fw-text truncate block w-full">
                    {flight ? getFlightLabel(flight) : event.flightId}
                  </strong>

                  {/* Single-line event text with truncate */}
                  <p className="text-[11px] text-fw-muted truncate m-0 w-full">{event.text}</p>

                  <div
                    className="flex items-center gap-1 mt-auto pt-0.5 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 px-1.5 text-[10px] text-fw-muted hover:text-fw-text gap-1"
                      onClick={() => onSelectFlight(event.flightId)}
                      type="button"
                    >
                      <MapPinned aria-hidden="true" size={10} />
                      Рейс
                    </Button>
                    {!event.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 px-1.5 text-[10px] text-fw-muted hover:text-fw-text gap-1"
                        onClick={() => onMarkRead(event.id)}
                        type="button"
                      >
                        <Eye aria-hidden="true" size={10} />
                        Прочитать
                      </Button>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Interactive chart */}
      <div className="shrink-0 border-t border-line overflow-hidden">
        {selectedFlight ? (
          <FlightChart flight={selectedFlight} mockNow={mockNow} />
        ) : (
          <div className="flex items-center justify-center h-28 text-[11px] text-fw-muted-2">
            Выберите рейс для отображения графика
          </div>
        )}
      </div>
    </section>
  );
}
