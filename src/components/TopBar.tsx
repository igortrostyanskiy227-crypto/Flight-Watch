import { ListFilter } from "lucide-react";
import type { Flight, FlightFilters, FlightListMode } from "../types";

interface TopBarProps {
  activeFilterCount: number;
  filters: FlightFilters;
  listMode: FlightListMode;
  onFiltersChange: (filters: FlightFilters) => void;
  onOpenFilters: () => void;
  selectedFlight: Flight | null;
  visibleFlightCount: number;
}

export function TopBar({
  activeFilterCount,
  filters,
  listMode,
  onFiltersChange,
  onOpenFilters,
  selectedFlight,
  visibleFlightCount,
}: TopBarProps) {
  const updateFilters = (patch: Partial<FlightFilters>) => onFiltersChange({ ...filters, ...patch });
  const countLabel = listMode === "flights" ? "рейсов" : "бортов";

  return (
    <header className="topbar">
      <div className="brand-block">
        <div className="brand-mark">FW</div>
        <div>
          <h1>Flight Watch</h1>
          <p>
            Monitor · UUEE sector · {visibleFlightCount} {countLabel}
            {selectedFlight ? ` · выбран ${selectedFlight.flightNumber ?? selectedFlight.callsign}` : ""}
          </p>
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

        <button
          className={`topbar-filter-button ${activeFilterCount > 0 ? "is-active" : ""}`}
          onClick={onOpenFilters}
          type="button"
        >
          <ListFilter aria-hidden="true" size={17} strokeWidth={2.2} />
          Фильтры {activeFilterCount > 0 && <b>{activeFilterCount}</b>}
        </button>
      </div>
    </header>
  );
}
