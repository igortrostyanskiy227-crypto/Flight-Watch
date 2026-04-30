import { useMemo, useState } from "react";
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
import type { ChatMessage, Flight, FlightEvent } from "../types";

interface DetailPanelProps {
  chatMessages: ChatMessage[];
  events: FlightEvent[];
  flight: Flight | null;
  onOpenEvent: (event: FlightEvent) => void;
  onTabChange: (tab: DetailTab) => void;
  tab: DetailTab;
}

type DetailTab = "summary" | "history" | "warnings" | "charts" | "aerodromes";
type FlightModal = "main" | "aircraft" | "plan" | "ofp" | "times" | "documents" | "chat" | null;

function MiniChart({ flight }: { flight: Flight }) {
  const maxAltitude = Math.max(...flight.route.map((point) => point.altitudeFt), flight.plan.altitudeFt, 1);
  const maxSpeed = Math.max(...flight.route.map((point) => point.speedKt), flight.plan.speedKt, 1);
  const altitudePoints = flight.route
    .map((point, index) => `${(index / Math.max(flight.route.length - 1, 1)) * 100},${100 - (point.altitudeFt / maxAltitude) * 100}`)
    .join(" ");
  const speedPoints = flight.route
    .map((point, index) => `${(index / Math.max(flight.route.length - 1, 1)) * 100},${100 - (point.speedKt / maxSpeed) * 100}`)
    .join(" ");
  const planAltitudeY = 100 - (flight.plan.altitudeFt / maxAltitude) * 100;
  const planSpeedY = 100 - (flight.plan.speedKt / maxSpeed) * 100;

  return (
    <div className="flight-chart">
      <svg aria-label="График высоты и скорости" viewBox="0 0 100 100" preserveAspectRatio="none">
        <line className="chart-plan-altitude" x1="0" x2="100" y1={planAltitudeY} y2={planAltitudeY} />
        <line className="chart-plan-speed" x1="0" x2="100" y1={planSpeedY} y2={planSpeedY} />
        <polyline className="chart-altitude" points={altitudePoints} />
        <polyline className="chart-speed" points={speedPoints} />
      </svg>
      <div className="chart-legend">
        <span>Высота факт</span>
        <span>Скорость факт</span>
        <span>План</span>
      </div>
    </div>
  );
}

export function DetailPanel({ chatMessages, events, flight, onOpenEvent, onTabChange, tab }: DetailPanelProps) {
  const [modal, setModal] = useState<FlightModal>(null);

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
  const warningEvents = events.filter((event) => event.category === "WARNING" || event.category === "ALERT" || event.severity !== "info");
  const unreadMessages = chatMessages.filter((message) => !message.read && !message.own).length;
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

  const modalTitle = useMemo(() => {
    switch (modal) {
      case "main":
        return "Основная информация";
      case "aircraft":
        return "Информация по ВС";
      case "plan":
        return "План полёта";
      case "ofp":
        return "OFP рейса";
      case "times":
        return "Временные метки";
      case "documents":
        return "ВС и документы";
      case "chat":
        return "Чат рейса";
      default:
        return "";
    }
  }, [modal]);

  const renderModalBody = () => {
    switch (modal) {
      case "main":
        return (
          <div className="kv-grid">
            <span>Рейс</span>
            <strong>{label}</strong>
            <span>Оператор</span>
            <strong>{flight.operator}</strong>
            <span>Статус</span>
            <strong>{statusLabels[flight.operationalStatus ?? flight.status]}</strong>
            <span>Причина статуса</span>
            <strong>{flight.statusEvidence}</strong>
            <span>DEP → DEST</span>
            <strong>
              {flight.plan.origin} → {flight.plan.destination}
            </strong>
            <span>STD / STA</span>
            <strong>
              {formatClock(flight.plan.scheduledDeparture)} / {formatClock(flight.plan.scheduledArrival)}
            </strong>
          </div>
        );
      case "aircraft":
        return (
          <div className="kv-grid">
            <span>Борт</span>
            <strong>{flight.aircraft.registration}</strong>
            <span>Тип ВС</span>
            <strong>
              {flight.aircraft.model} · {flight.aircraft.typeCode}
            </strong>
            <span>Tracker</span>
            <strong>{flight.tracker.id}</strong>
            <span>Состояние трекера</span>
            <strong>{trackerStateLabels[flight.tracker.state ?? "OK"]}</strong>
            <span>Источник</span>
            <strong>{dataSourceLabels[flight.tracker.source ?? "Tracker"]}</strong>
            <span>Последнее сообщение</span>
            <strong>{formatClock(flight.tracker.lastMessageAt ?? flight.lastSignalAt)}</strong>
            <span>Батарея</span>
            <strong>{flight.tracker.batteryPercent}%</strong>
            <span>Координаты</span>
            <strong>
              {formatCoordinate(currentPoint.lat, "lat")} · {formatCoordinate(currentPoint.lng, "lng")}
            </strong>
          </div>
        );
      case "plan":
        return (
          <div className="kv-grid">
            <span>FPL/OFP route</span>
            <strong>{flight.plan.routeName}</strong>
            <span>DEP</span>
            <strong>{flight.plan.origin}</strong>
            <span>DEST</span>
            <strong>{flight.plan.destination}</strong>
            <span>ALTN</span>
            <strong>{flight.plan.alternate ?? "не задан"}</strong>
            <span>ETOPS/ERA</span>
            <strong>{flight.plan.etopsAlternate ?? "не задан"}</strong>
            <span>TKOFF ALTN</span>
            <strong>{flight.plan.takeoffAlternate ?? "не задан"}</strong>
            <span>Плановая высота</span>
            <strong>{flight.plan.altitudeFt.toLocaleString("ru-RU")} ft</strong>
            <span>Плановая скорость</span>
            <strong>{flight.plan.speedKt} kt</strong>
          </div>
        );
      case "ofp":
        return (
          <div className="kv-grid">
            <span>Версия OFP</span>
            <strong>OFP-2026-04-28-A</strong>
            <span>Маршрут</span>
            <strong>{flight.plan.routeName}</strong>
            <span>Fuel remaining</span>
            <strong>{flight.actual.fuelRemainingMin} мин</strong>
            <span>Отклонение маршрута</span>
            <strong>{flight.actual.deviationNm.toFixed(1)} NM</strong>
            <span>План / факт скорость</span>
            <strong>
              {flight.plan.speedKt} / {Math.round(flight.actual.speedKt)} kt
            </strong>
            <span>План / факт высота</span>
            <strong>
              {flight.plan.altitudeFt.toLocaleString("ru-RU")} / {Math.round(flight.actual.altitudeFt).toLocaleString("ru-RU")} ft
            </strong>
          </div>
        );
      case "times":
        return (
          <div className="timeline modal-timeline">
            <div className="timeline-item">
              <time>{formatDateTime(flight.plan.scheduledDeparture)}</time>
              <strong>STD</strong>
              <span>Расчётное время вылета</span>
            </div>
            <div className="timeline-item">
              <time>{formatDateTime(flight.plan.scheduledArrival)}</time>
              <strong>STA</strong>
              <span>Расчётное время прибытия</span>
            </div>
            {flight.statusHistory.map((item) => (
              <div className="timeline-item" key={`${item.time}-${item.text}`}>
                <time>{formatDateTime(item.time)}</time>
                <strong>{statusLabels[item.status]}</strong>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        );
      case "documents":
        return (
          <div className="kv-grid">
            <span>Бортовые документы</span>
            <strong>Актуальны</strong>
            <span>Технический статус</span>
            <strong>{trackerStateLabels[flight.tracker.state ?? "OK"]}</strong>
            <span>Последняя проверка</span>
            <strong>{formatClock(flight.lastSignalAt)}</strong>
            <span>Доступные пакеты</span>
            <strong>FPL, OFP, MEL/CDL, NOTAM bundle</strong>
            <span>Ограничения</span>
            <strong>{warningEvents.length > 0 ? `${warningEvents.length} активных` : "нет активных"}</strong>
          </div>
        );
      case "chat":
        return (
          <div className="chat-thread">
            {chatMessages.length === 0 ? (
              <span className="empty-inline">Сообщений по рейсу пока нет.</span>
            ) : (
              chatMessages.map((message) => (
                <div className={message.own ? "is-own" : ""} key={message.id}>
                  <strong>
                    {message.author} · {formatClock(message.time)}
                  </strong>
                  <p>{message.text}</p>
                </div>
              ))
            )}
            <div className="chat-composer">
              <input placeholder="Введите сообщение..." />
              <button type="button">Отправить</button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <aside className="right-panel" aria-label="Детали выбранного рейса">
      <div className="detail-header">
        <div>
          <span className="eyeline">{kindLabels[flight.kind]}</span>
          <h2>{label}</h2>
          <p>{flight.operator}</p>
        </div>
        <span className={`status-chip status-${flight.operationalStatus ?? flight.status}`}>
          {statusLabels[flight.operationalStatus ?? flight.status]}
        </span>
      </div>

      <div className="flight-info-actions" aria-label="Разделы информации по рейсу">
        {[
          ["main", "Инфо", Info],
          ["aircraft", "ВС", Settings],
          ["plan", "FPL", FileText],
          ["ofp", "OFP", ClipboardList],
          ["times", "Время", Clock3],
          ["documents", "Док.", Plane],
          ["chat", unreadMessages ? `Чат ${unreadMessages}` : "Чат", MessageSquare],
        ].map(([key, title, Icon]) => (
          <button key={key as string} onClick={() => setModal(key as FlightModal)} type="button">
            <Icon aria-hidden="true" size={19} strokeWidth={2.15} />
            <span>{title as string}</span>
          </button>
        ))}
      </div>

      <div className="detail-tabs" role="tablist">
        {[
          ["summary", "Параметры"],
          ["warnings", "Предупреждения"],
          ["charts", "Графики"],
          ["aerodromes", "Аэродромы"],
          ["history", "История"],
        ].map(([key, title]) => (
          <button
            aria-selected={tab === key}
            className={tab === key ? "is-active" : ""}
            key={key}
            onClick={() => onTabChange(key as DetailTab)}
            role="tab"
            type="button"
          >
            {title}
          </button>
        ))}
      </div>

      <div className="detail-scroll">
        {tab === "summary" && (
          <>
            <section className="detail-section">
              <h3>Воздушное судно</h3>
              <div className="kv-grid">
                <span>Борт</span>
                <strong>{flight.aircraft.registration}</strong>
                <span>Тип</span>
                <strong>{flight.aircraft.model}</strong>
                <span>Tracker</span>
                <strong>{flight.tracker.id}</strong>
                <span>Состояние</span>
                <strong>{trackerStateLabels[flight.tracker.state ?? "OK"]}</strong>
                <span>Источник</span>
                <strong>{dataSourceLabels[flight.tracker.source ?? "Tracker"]}</strong>
                <span>Обновлено</span>
                <strong>{formatClock(flight.tracker.lastMessageAt ?? flight.lastSignalAt)}</strong>
                <span>Батарея</span>
                <strong>{flight.tracker.batteryPercent}%</strong>
              </div>
            </section>

            <section className="detail-section">
              <h3>Доказательство статуса</h3>
              <div className="status-evidence">
                <strong>{statusLabels[flight.operationalStatus ?? flight.status]}</strong>
                <p>{flight.statusEvidence}</p>
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
          </>
        )}

        {tab === "warnings" && (
          <section className="detail-section">
            <h3>Список предупреждений</h3>
            <div className="detail-events">
              {warningEvents.length === 0 ? (
                <span className="empty-inline">Нет предупреждений по рейсу.</span>
              ) : (
                warningEvents.map((event) => (
                  <button className={`warning-card severity-${event.severity}`} key={event.id} onClick={() => onOpenEvent(event)} type="button">
                    <span>{event.read ? "✓" : "●"}</span>
                    <strong>{categoryLabels[event.category ?? (event.severity === "critical" ? "ALERT" : "WARNING")]}</strong>
                    <em>{event.scope ? warningScopeLabels[event.scope] : "Рейс"}</em>
                    <p>{event.text}</p>
                  </button>
                ))
              )}
            </div>
          </section>
        )}

        {tab === "charts" && (
          <section className="detail-section">
            <h3>Высота и скорость</h3>
            <MiniChart flight={flight} />
          </section>
        )}

        {tab === "aerodromes" && (
          <section className="detail-section">
            <h3>Аэродромы и ограничения</h3>
            <div className="aerodrome-list">
              {[flight.plan.origin, flight.plan.destination, flight.plan.alternate].filter(Boolean).map((code, index) => (
                <div key={`${code}-${index}`}>
                  <strong>{code}</strong>
                  <span>{index === 1 ? "FZRA warning · NOTAM active" : "METAR актуален · ограничений нет"}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === "history" && (
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
        )}
      </div>

      {modal && (
        <div className="modal-backdrop modal-backdrop--center" role="presentation" onMouseDown={() => setModal(null)}>
          <section className="event-modal" aria-label={modalTitle} onMouseDown={(event) => event.stopPropagation()}>
            <header className="event-modal__header">
              <div>
                <span>{label}</span>
                <strong>{modalTitle}</strong>
              </div>
              <button aria-label="Закрыть" className="close-button" onClick={() => setModal(null)} type="button">
                <X aria-hidden="true" size={18} />
              </button>
            </header>
            <div className="event-modal__body">
              {renderModalBody()}
            </div>
          </section>
        </div>
      )}
    </aside>
  );
}
