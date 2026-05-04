import { ListFilter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-[#0a1320] px-3 py-2.5 min-h-[52px]">
      {/* Logo + title */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="grid place-items-center h-[36px] w-[36px] shrink-0 rounded-md border border-[rgba(217,154,0,0.52)] bg-[#151b23] text-fw-accent text-[12px] font-extrabold">
          FW
        </div>
        <div>
          <h1 className="m-0 text-[16px] font-bold text-fw-text leading-tight">Flight Watch</h1>
          <p className="text-[11px] text-fw-muted leading-tight">
            Monitor · {visibleFlightCount} {countLabel}
            {selectedFlight ? ` · ${selectedFlight.flightNumber ?? selectedFlight.callsign}` : ""}
          </p>
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex items-center gap-2 flex-1 min-w-[200px]" aria-label="Фильтры Flight Watch">
        <Input
          aria-label="Поиск по рейсу, позывному или борту"
          onChange={(event) => updateFilters({ query: event.target.value })}
          placeholder="AFL1844, RA-73741..."
          type="search"
          value={filters.query}
          className="border-line bg-panel-strong text-fw-text placeholder:text-fw-muted-2 flex-1 min-w-0 h-8 text-[12px]"
        />
        <Button
          variant="outline"
          size="sm"
          className={`gap-1.5 border-line text-fw-muted hover:text-fw-text shrink-0 h-8 ${activeFilterCount > 0 ? "border-fw-accent/50 text-fw-accent bg-fw-accent-soft" : ""}`}
          onClick={onOpenFilters}
          type="button"
        >
          <ListFilter aria-hidden="true" size={14} strokeWidth={2.2} />
          Фильтры
          {activeFilterCount > 0 && (
            <Badge variant="default" className="ml-0.5 h-4 px-1 text-[10px]">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </div>
    </header>
  );
}
