import { viewModeLabels } from "../domain/labels";
import type { FlightEvent, FlightFilters, ViewMode } from "../types";

interface TopBarProps {
  aircraftOptions: Array<{ value: string; label: string }>;
  events: FlightEvent[];
  filters: FlightFilters;
  onFiltersChange: (filters: FlightFilters) => void;
  onViewModeChange: (mode: ViewMode) => void;
  totalCount: number;
  visibleCount: number;
  viewMode: ViewMode;
}

const viewModes: ViewMode[] = ["all", "selected", "alerts"];

export function TopBar({
  aircraftOptions,
  events,
  filters,
  onFiltersChange,
  onViewModeChange,
  totalCount,
  visibleCount,
  viewMode,
}: TopBarProps) {
  const criticalCount = events.filter((event) => event.severity === "critical").length;
  const warningCount = events.filter((event) => event.severity === "warning").length;

  const updateFilters = (patch: Partial<FlightFilters>) => {
    onFiltersChange({ ...filters, ...patch });
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

      <div className="mode-and-status">
        <div className="mode-toggle" aria-label="Режим отображения">
          {viewModes.map((mode) => (
            <button
              className={mode === viewMode ? "is-active" : ""}
              key={mode}
              onClick={() => onViewModeChange(mode)}
              type="button"
            >
              {viewModeLabels[mode]}
            </button>
          ))}
        </div>

        <div className="status-summary" aria-label="Сводка">
          <span>
            На карте <strong>{visibleCount}</strong>/{totalCount}
          </span>
          <span className="status-dot critical" />
          <strong>{criticalCount}</strong>
          <span className="status-dot warning" />
          <strong>{warningCount}</strong>
        </div>
      </div>
    </header>
  );
}
