import { useMemo, useState } from "react";
import type { FlightFilters } from "../types";

interface TopBarProps {
  aircraftOptions: Array<{ value: string; label: string }>;
  filters: FlightFilters;
  onFiltersChange: (filters: FlightFilters) => void;
}

export function TopBar({
  aircraftOptions,
  filters,
  onFiltersChange,
}: TopBarProps) {
  const [shareOpen, setShareOpen] = useState(false);
  const shareUrl = useMemo(() => window.location.href, []);

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
          <span>Борт</span>
          <select
            aria-label="Фильтр по воздушному судну"
            onChange={(event) => updateFilters({ aircraft: event.target.value })}
            value={filters.aircraft}
          >
            <option value="all">Все ВС</option>
            {aircraftOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
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
              <strong>Share to selection "Flight Watch"</strong>
              <button className="copy-link" onClick={copyShareUrl} type="button">
                Copy link
              </button>
              <button aria-label="Закрыть" className="close-button" onClick={() => setShareOpen(false)} type="button">
                ×
              </button>
            </header>

            <div className="invite-row">
              <input placeholder="Add comma separated emails to invite" type="email" />
              <button type="button">Invite</button>
            </div>

            <div className="access-list">
              <h3>Who has access</h3>
              <div className="access-row">
                <span className="access-icon">◎</span>
                <strong>Anyone</strong>
                <button type="button">can view ›</button>
              </div>
              <div className="access-row">
                <span className="access-icon">□</span>
                <strong>Anyone in Team project</strong>
                <button type="button">1 person ›</button>
              </div>
              <div className="access-row">
                <span className="avatar-dot">I</span>
                <strong>Igor (you)</strong>
                <span>owner</span>
              </div>
            </div>
          </section>
        </div>
      )}
    </header>
  );
}
