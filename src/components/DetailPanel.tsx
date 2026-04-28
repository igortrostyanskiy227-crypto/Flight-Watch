import { DEVIATION_WARNING_NM } from "../domain/events";
import {
  formatClock,
  formatCoordinate,
  formatDateTime,
  getCurrentPoint,
  getFlightLabel,
  signedDifference,
} from "../domain/flightUtils";
import { kindLabels, severityLabels, statusLabels } from "../domain/labels";
import type { Flight, FlightEvent } from "../types";
import { PilotControls } from "./PilotControls";

interface DetailPanelProps {
  events: FlightEvent[];
  flight: Flight | null;
  onTabChange: (tab: "summary" | "history") => void;
  tab: "summary" | "history";
}

export function DetailPanel({ events, flight, onTabChange, tab }: DetailPanelProps) {
  if (!flight) {
    return (
      <aside className="right-panel" aria-label="Детали рейса">
        <div className="empty-state">Выберите рейс для просмотра параметров.</div>
      </aside>
    );
  }

  const currentPoint = getCurrentPoint(flight);
  const label = getFlightLabel(flight);
  const speedDelta = signedDifference(flight.actual.speedKt, flight.plan.speedKt);
  const altitudeDelta = signedDifference(flight.actual.altitudeFt, flight.plan.altitudeFt);
  const deviationWarning = flight.actual.deviationNm > DEVIATION_WARNING_NM;
  const timelineItems = [
    ...events.map((event) => ({
      id: event.id,
      time: event.time,
      title: event.text,
      meta: `${severityLabels[event.severity]} · ${event.type}`,
      severity: event.severity,
    })),
    ...flight.route.map((point) => ({
      id: `${flight.id}-coord-${point.time}`,
      time: point.time,
      title: `${formatCoordinate(point.lat, "lat")} · ${formatCoordinate(point.lng, "lng")}`,
      meta: `${Math.round(point.altitudeFt).toLocaleString("ru-RU")} ft · ${Math.round(point.speedKt)} kt · ${Math.round(point.headingDeg)}°`,
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

  return (
    <aside className="right-panel" aria-label="Детали выбранного рейса">
      <div className="detail-header">
        <div>
          <span className="eyeline">{kindLabels[flight.kind]}</span>
          <h2>{label}</h2>
          <p>{flight.operator}</p>
        </div>
        <span className={`status-chip status-${flight.status}`}>{statusLabels[flight.status]}</span>
      </div>

      <div className="detail-tabs" role="tablist">
        <button
          aria-selected={tab === "summary"}
          className={tab === "summary" ? "is-active" : ""}
          onClick={() => onTabChange("summary")}
          role="tab"
          type="button"
        >
          Параметры
        </button>
        <button
          aria-selected={tab === "history"}
          className={tab === "history" ? "is-active" : ""}
          onClick={() => onTabChange("history")}
          role="tab"
          type="button"
        >
          История
        </button>
      </div>

      {tab === "summary" ? (
        <div className="detail-scroll">
          <section className="detail-section">
            <h3>Воздушное судно</h3>
            <div className="kv-grid">
              <span>Борт</span>
              <strong>{flight.aircraft.registration}</strong>
              <span>Тип</span>
              <strong>{flight.aircraft.model}</strong>
              <span>Tracker</span>
              <strong>{flight.tracker.id}</strong>
              <span>Батарея</span>
              <strong>{flight.tracker.batteryPercent}%</strong>
            </div>
          </section>

          <section className="detail-section">
            <h3>Текущие параметры</h3>
            <div className="metric-grid">
              <div>
                <span>Широта</span>
                <strong>{formatCoordinate(currentPoint.lat, "lat")}</strong>
              </div>
              <div>
                <span>Долгота</span>
                <strong>{formatCoordinate(currentPoint.lng, "lng")}</strong>
              </div>
              <div>
                <span>Высота</span>
                <strong>{Math.round(flight.actual.altitudeFt).toLocaleString("ru-RU")} ft</strong>
              </div>
              <div>
                <span>Скорость</span>
                <strong>{Math.round(flight.actual.speedKt)} kt</strong>
              </div>
              <div>
                <span>Курс</span>
                <strong>{Math.round(flight.actual.headingDeg)}°</strong>
              </div>
              <div>
                <span>Обновление</span>
                <strong>{formatClock(flight.lastSignalAt)}</strong>
              </div>
            </div>
          </section>

          <section className="detail-section planfact">
            <h3>План / факт</h3>
            <div className="planfact-table">
              <div className="planfact-row">
                <span>Скорость</span>
                <strong>{Math.round(flight.actual.speedKt)} kt</strong>
                <span>{flight.plan.speedKt} kt</span>
                <em>{speedDelta} kt</em>
              </div>
              <div className="planfact-row">
                <span>Высота</span>
                <strong>{Math.round(flight.actual.altitudeFt).toLocaleString("ru-RU")} ft</strong>
                <span>{flight.plan.altitudeFt.toLocaleString("ru-RU")} ft</span>
                <em>{altitudeDelta} ft</em>
              </div>
              <div className={`planfact-row ${deviationWarning ? "is-warning" : ""}`}>
                <span>Маршрут</span>
                <strong>{flight.actual.deviationNm.toFixed(1)} NM</strong>
                <span>&lt; {DEVIATION_WARNING_NM} NM</span>
                <em>{deviationWarning ? "warning" : "ok"}</em>
              </div>
            </div>
            <div className="route-plan">
              <span>{flight.plan.origin}</span>
              <strong>{flight.plan.routeName}</strong>
              <span>{flight.plan.destination}</span>
            </div>
          </section>

          <section className="detail-section">
            <h3>События рейса</h3>
            <div className="detail-events">
              {events.length === 0 ? (
                <span className="empty-inline">Нет событий.</span>
              ) : (
                events.map((event) => (
                  <div className={`event-line severity-${event.severity}`} key={event.id}>
                    <span>{formatClock(event.time)}</span>
                    <strong>{severityLabels[event.severity]}</strong>
                    <p>{event.text}</p>
                  </div>
                ))
              )}
            </div>
          </section>

          <PilotControls flightLabel={label} />
        </div>
      ) : (
        <div className="detail-scroll">
          <section className="detail-section">
            <h3>Timeline</h3>
            <div className="timeline">
              {timelineItems.map((item) => (
                <div className={`timeline-item severity-${item.severity}`} key={item.id}>
                  <time>{formatDateTime(item.time)}</time>
                  <strong>{item.title}</strong>
                  <span>{item.meta}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </aside>
  );
}
