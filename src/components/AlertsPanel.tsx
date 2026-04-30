import { useState, type PointerEvent as ReactPointerEvent } from "react";
import { Check, Circle, Eye, MapPinned } from "lucide-react";
import { formatClock, getFlightLabel } from "../domain/flightUtils";
import { severityLabels } from "../domain/labels";
import type { Flight, FlightEvent } from "../types";

interface AlertsPanelProps {
  events: FlightEvent[];
  flightsById: Map<string, Flight>;
  onMarkRead: (eventId: string) => void;
  onOpenEvent: (event: FlightEvent) => void;
  onSelectFlight: (flightId: string) => void;
}

export function AlertsPanel({ events, flightsById, onMarkRead, onOpenEvent, onSelectFlight }: AlertsPanelProps) {
  const [panelHeight, setPanelHeight] = useState(178);
  const criticalCount = events.filter((event) => event.severity === "critical").length;
  const warningCount = events.filter((event) => event.severity === "warning").length;

  const startResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const clamp = (value: number) => Math.min(360, Math.max(104, value));

    const handleMove = (event: PointerEvent) => {
      if (event.buttons !== 1) {
        return;
      }
      const viewportBottom = window.innerHeight - 14;
      setPanelHeight(clamp(viewportBottom - event.clientY));
    };

    const stopDrag = () => {
      document.body.classList.remove("is-resizing-alerts");
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", stopDrag);
      window.removeEventListener("pointercancel", stopDrag);
    };

    document.body.classList.add("is-resizing-alerts");
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", stopDrag);
    window.addEventListener("pointercancel", stopDrag);
  };

  return (
    <section className="alerts-panel" aria-label="Панель событий" style={{ height: panelHeight }}>
      <button
        className="alerts-grabber"
        aria-label="Изменить высоту панели событий"
        onPointerDown={startResize}
        type="button"
      >
        <span />
      </button>

      <div className="alerts-panel__header">
        <div>
          <h2>События и сигнализации</h2>
          <p className="alerts-summary">
            <span className="status-dot critical" />
            Критические {criticalCount}
            <span className="status-dot warning" />
            Предупреждения {warningCount}
            <span>Всего {events.length}</span>
          </p>
        </div>
      </div>

      <div className="alerts-stream">
        {events.length === 0 ? (
          <div className="empty-inline">Нет событий в текущем отображении.</div>
        ) : (
          events.slice(0, 10).map((event) => {
            const flight = flightsById.get(event.flightId);

            return (
              <button
                className={`alert-row severity-${event.severity} ${event.read ? "is-read" : "is-unread"}`}
                key={event.id}
                onClick={() => onOpenEvent(event)}
                type="button"
              >
                <span className="read-state" aria-label={event.read ? "Прочитано" : "Не прочитано"}>
                  {event.read ? <Check aria-hidden="true" size={13} /> : <Circle aria-hidden="true" size={10} fill="currentColor" />}
                </span>
                <span>{formatClock(event.time)}</span>
                <strong>{flight ? getFlightLabel(flight) : event.flightId}</strong>
                <em>{severityLabels[event.severity]}</em>
                <p>{event.text}</p>
                <span className="alert-row__actions" onClick={(click) => click.stopPropagation()}>
                  <button onClick={() => onSelectFlight(event.flightId)} type="button">
                    <MapPinned aria-hidden="true" size={13} />
                    Рейс
                  </button>
                  {!event.read && (
                    <button onClick={() => onMarkRead(event.id)} type="button">
                      <Eye aria-hidden="true" size={13} />
                      Прочитать
                    </button>
                  )}
                </span>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
