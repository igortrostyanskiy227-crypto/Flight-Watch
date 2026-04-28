import { useMemo, useState } from "react";
import { getFlightLabel } from "../domain/flightUtils";
import type { Flight, FlightFilters } from "../types";

interface TopBarProps {
  filters: FlightFilters;
  onFiltersChange: (filters: FlightFilters) => void;
  selectedFlight: Flight | null;
  visibleFlightCount: number;
}

export function TopBar({
  filters,
  onFiltersChange,
  selectedFlight,
  visibleFlightCount,
}: TopBarProps) {
  const [shareOpen, setShareOpen] = useState(false);
  const [shareScope, setShareScope] = useState<"sector" | "selected">("sector");
  const [accessLevel, setAccessLevel] = useState<"view" | "operate" | "admin">("view");
  const [linkTtl, setLinkTtl] = useState<"1h" | "24h" | "7d" | "never">("24h");
  const selectedFlightLabel = selectedFlight ? getFlightLabel(selectedFlight) : "рейс не выбран";
  const shareUrl = useMemo(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("scope", shareScope);
    url.searchParams.set("access", accessLevel);
    url.searchParams.set("ttl", linkTtl);

    if (shareScope === "selected" && selectedFlight) {
      url.searchParams.set("flight", selectedFlight.id);
    } else {
      url.searchParams.delete("flight");
    }

    return url.toString();
  }, [accessLevel, linkTtl, selectedFlight, shareScope]);

  const updateFilters = (patch: Partial<FlightFilters>) => {
    onFiltersChange({ ...filters, ...patch });
  };

  const copyShareUrl = async () => {
    await navigator.clipboard?.writeText(shareUrl);
  };

  return (
    <header className="topbar">
      <div className="brand-block">
        <div className="brand-mark">FW</div>
        <div>
          <h1>Flight Watch</h1>
          <p>Monitor · UUEE control sector · 28.04 13:40 MSK</p>
        </div>
      </div>

      <div className="filter-strip" aria-label="Фильтры Flight Watch">
        <label className="search-control">
          <span>Поиск</span>
          <input
            aria-label="Поиск по рейсу, позывному или борту"
            onChange={(event) => updateFilters({ query: event.target.value })}
            placeholder="AFL1844, RA-73741..."
            type="search"
            value={filters.query}
          />
        </label>

        <label className="compact-control">
          <span>Статус</span>
          <select
            aria-label="Фильтр по статусу"
            onChange={(event) => updateFilters({ status: event.target.value as FlightFilters["status"] })}
            value={filters.status}
          >
            <option value="all">Все</option>
            <option value="airborne">В полёте</option>
            <option value="landed">Завершён</option>
            <option value="scheduled">Ожидается</option>
            <option value="alarm">Тревога</option>
          </select>
        </label>

        <label className="compact-control">
          <span>Тип</span>
          <select
            aria-label="Фильтр по типу"
            onChange={(event) => updateFilters({ kind: event.target.value as FlightFilters["kind"] })}
            value={filters.kind}
          >
            <option value="all">Все</option>
            <option value="commercial">Рейс</option>
            <option value="private">Частный</option>
          </select>
        </label>

        <label className="compact-control">
          <span>Период</span>
          <select
            aria-label="Фильтр по периоду"
            onChange={(event) => updateFilters({ period: event.target.value as FlightFilters["period"] })}
            value={filters.period}
          >
            <option value="all">Любой</option>
            <option value="lastHour">Последний час</option>
            <option value="today">Сегодня</option>
            <option value="signalOverdue">Нет сигнала</option>
          </select>
        </label>
      </div>

      <button className="share-button" onClick={() => setShareOpen(true)} type="button">
        Поделиться
      </button>

      {shareOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setShareOpen(false)}>
          <section
            aria-label="Настройки доступа"
            className="share-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="share-modal__header">
              <div>
                <strong>Поделиться мониторингом</strong>
                <span>
                  {shareScope === "selected" && selectedFlight
                    ? `Борт ${selectedFlight.aircraft.registration} · ${selectedFlightLabel}`
                    : `Сектор · ${visibleFlightCount} объектов на карте`}
                </span>
              </div>
              <button className="copy-link" onClick={copyShareUrl} type="button">
                Скопировать ссылку
              </button>
              <button aria-label="Закрыть" className="close-button" onClick={() => setShareOpen(false)} type="button">
                ×
              </button>
            </header>

            <div className="share-scope" aria-label="Что открыть по ссылке">
              <button
                className={shareScope === "sector" ? "is-active" : ""}
                onClick={() => setShareScope("sector")}
                type="button"
              >
                Все борта
                <span>{visibleFlightCount} объектов</span>
              </button>
              <button
                className={shareScope === "selected" ? "is-active" : ""}
                disabled={!selectedFlight}
                onClick={() => setShareScope("selected")}
                type="button"
              >
                Текущий борт
                <span>{selectedFlight ? selectedFlightLabel : "не выбран"}</span>
              </button>
            </div>

            <div className="invite-row">
              <input placeholder="Email диспетчера или наблюдателя" type="email" />
              <button type="button">Пригласить</button>
            </div>

            <div className="share-settings">
              <label>
                Уровень доступа
                <select value={accessLevel} onChange={(event) => setAccessLevel(event.target.value as typeof accessLevel)}>
                  <option value="view">Просмотр карты и событий</option>
                  <option value="operate">Просмотр + подтверждение событий</option>
                  <option value="admin">Администрирование доступа</option>
                </select>
              </label>
              <label>
                Срок действия ссылки
                <select value={linkTtl} onChange={(event) => setLinkTtl(event.target.value as typeof linkTtl)}>
                  <option value="1h">1 час</option>
                  <option value="24h">24 часа</option>
                  <option value="7d">7 дней</option>
                  <option value="never">Без срока</option>
                </select>
              </label>
            </div>

            <div className="access-list">
              <h3>Доступ сейчас</h3>
              <div className="access-row">
                <span className="access-icon">◉</span>
                <strong>Любой с ссылкой</strong>
                <span>{accessLevel === "view" ? "только просмотр" : accessLevel === "operate" ? "оператор" : "админ"}</span>
              </div>
              <div className="access-row">
                <span className="access-icon">□</span>
                <strong>Команда Flight Watch</strong>
                <span>3 участника</span>
              </div>
              <div className="access-row">
                <span className="avatar-dot">I</span>
                <strong>Igor</strong>
                <span>владелец</span>
              </div>
            </div>
          </section>
        </div>
      )}
    </header>
  );
}
