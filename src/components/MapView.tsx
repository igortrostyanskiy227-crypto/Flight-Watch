import L from "leaflet";
import { Building2, CloudSun, Layers, Route, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, Tooltip, ZoomControl, useMap } from "react-leaflet";
import { worstSeverity } from "../domain/events";
import { getCurrentPoint, getFlightLabel } from "../domain/flightUtils";
import type { EventSeverity, Flight, FlightEvent } from "../types";

interface MapViewProps {
  eventsByFlight: Map<string, FlightEvent[]>;
  flights: Flight[];
  highlightedPoint: { lat: number; lng: number } | null;
  onSelectFlight: (flightId: string) => void;
  selectedFlight: Flight | null;
  selectedFromListAt: number;
}

interface MapCameraProps {
  flights: Flight[];
  highlightedPoint: { lat: number; lng: number } | null;
  selectedFlight: Flight | null;
  sectorCenter: { lat: number; lng: number; zoom: number } | null;
}

const mapSectors = [
  { id: "overview", label: "Все сектора", center: { lat: 55.7558, lng: 37.6173, zoom: 5 } },
  { id: "uuee", label: "UUEE Москва Север", center: { lat: 55.98, lng: 37.42, zoom: 7 } },
  { id: "uudd", label: "UUDD Москва Юг", center: { lat: 55.41, lng: 37.9, zoom: 7 } },
  { id: "uwww", label: "UWWW Самара", center: { lat: 53.5, lng: 50.15, zoom: 6 } },
] as const;

const mapLayerButtons: Array<{ key: keyof ReturnType<typeof createDefaultLayers>; label: string; Icon: LucideIcon }> = [
  { key: "meteo", label: "Метео", Icon: CloudSun },
  { key: "airspace", label: "Ограничения", Icon: Route },
  { key: "aerodromes", label: "Аэродромы", Icon: Building2 },
];

function createDefaultLayers() {
  return {
    meteo: true,
    airspace: true,
    aerodromes: true,
  };
}

function markerIcon(flight: Flight, severity: EventSeverity | "none", selected: boolean): L.DivIcon {
  const point = getCurrentPoint(flight);
  const size = selected ? 46 : 36;
  const anchor = selected ? 23 : 18;

  return L.divIcon({
    className: "aircraft-marker-host",
    html: `
      <div class="aircraft-marker marker-${severity} ${selected ? "is-selected" : ""}" style="--heading:${point.headingDeg}deg">
        <span class="aircraft-marker__body"></span>
        <span class="aircraft-marker__wing"></span>
        <span class="aircraft-marker__tail"></span>
      </div>
    `,
    iconAnchor: [anchor, anchor],
    iconSize: [size, size],
  });
}

function MapCamera({ flights, highlightedPoint, selectedFlight, sectorCenter }: MapCameraProps) {
  const map = useMap();
  const visibleKey = flights.map((flight) => flight.id).join(":");

  useEffect(() => {
    if (highlightedPoint) {
      map.flyTo([highlightedPoint.lat, highlightedPoint.lng], 8, {
        animate: true,
        duration: 0.6,
      });
      return;
    }

    if (selectedFlight) {
      const point = getCurrentPoint(selectedFlight);
      map.flyTo([point.lat, point.lng], 7, {
        animate: true,
        duration: 0.6,
      });
      return;
    }

    if (sectorCenter) {
      map.flyTo([sectorCenter.lat, sectorCenter.lng], sectorCenter.zoom, {
        animate: true,
        duration: 0.6,
      });
      return;
    }

    if (flights.length > 0) {
      const bounds = L.latLngBounds(flights.map((flight) => {
        const point = getCurrentPoint(flight);
        return [point.lat, point.lng] as [number, number];
      }));
      map.fitBounds(bounds, { maxZoom: 7, padding: [44, 44] });
    }
  }, [flights.length, highlightedPoint, map, sectorCenter, selectedFlight, visibleKey]);

  return null;
}

export function MapView({ eventsByFlight, flights, highlightedPoint, onSelectFlight, selectedFlight, selectedFromListAt }: MapViewProps) {
  const [sectorId, setSectorId] = useState<(typeof mapSectors)[number]["id"]>("overview");
  const [layers, setLayers] = useState(createDefaultLayers);
  const [pinnedTooltipFlightId, setPinnedTooltipFlightId] = useState<string | null>(null);
  const selectedRoute = useMemo(
    () => selectedFlight?.route.map((point) => [point.lat, point.lng] as [number, number]) ?? [],
    [selectedFlight],
  );
  const center = selectedFlight
    ? getCurrentPoint(selectedFlight)
    : flights[0]
      ? getCurrentPoint(flights[0])
      : { lat: 55.7558, lng: 37.6173 };
  const activeSector = mapSectors.find((sector) => sector.id === sectorId) ?? mapSectors[0];

  useEffect(() => {
    if (!selectedFlight || selectedFromListAt === 0) {
      return;
    }

    setPinnedTooltipFlightId(selectedFlight.id);
    const timer = window.setTimeout(() => setPinnedTooltipFlightId(null), 4500);
    return () => window.clearTimeout(timer);
  }, [selectedFlight, selectedFromListAt]);

  return (
    <div className="map-wrap">
      <MapContainer
        attributionControl={false}
        center={[center.lat, center.lng]}
        className="flight-map"
        maxZoom={11}
        minZoom={4}
        scrollWheelZoom
        zoomControl={false}
        zoom={6}
      >
        <ZoomControl position="topright" />
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {selectedRoute.length > 1 && (
          <Polyline
            pathOptions={{ className: "selected-route", color: "#e0a000", opacity: 0.92, weight: 4 }}
            positions={selectedRoute}
          />
        )}

        {layers.airspace && (
          <>
            <Polyline
              pathOptions={{ color: "#f04d61", opacity: 0.68, weight: 2, dashArray: "8 8" }}
              positions={[
                [56.2, 36.8],
                [55.6, 38.2],
                [54.9, 38.0],
                [55.2, 36.4],
                [56.2, 36.8],
              ]}
            />
            <Polyline
              pathOptions={{ color: "#e0a000", opacity: 0.58, weight: 2, dashArray: "4 8" }}
              positions={[
                [58.0, 31.6],
                [57.1, 33.4],
                [57.4, 35.3],
              ]}
            />
          </>
        )}

        {layers.meteo && (
          <CircleMarker
            center={[56.8, 35.8]}
            pathOptions={{ color: "#4c9fe6", fillColor: "#4c9fe6", fillOpacity: 0.14, opacity: 0.6 }}
            radius={42}
          />
        )}

        {layers.aerodromes && (
          <>
            {[
              [55.9726, 37.4146, "UUEE"],
              [55.4088, 37.9063, "UUDD"],
              [55.5963, 37.2736, "UUWW"],
            ].map(([lat, lng, code]) => (
              <CircleMarker
                center={[lat as number, lng as number]}
                key={code as string}
                pathOptions={{ color: "#d99a00", fillColor: "#0d1521", fillOpacity: 0.9, opacity: 0.95 }}
                radius={8}
              >
                <Tooltip direction="top">{code}</Tooltip>
              </CircleMarker>
            ))}
          </>
        )}

        {highlightedPoint && (
          <CircleMarker
            center={[highlightedPoint.lat, highlightedPoint.lng]}
            pathOptions={{ color: "#ff5264", fillColor: "#ff5264", fillOpacity: 0.18, opacity: 0.95 }}
            radius={34}
          />
        )}

        {flights.map((flight) => {
          const point = getCurrentPoint(flight);
          const severity = worstSeverity(eventsByFlight.get(flight.id) ?? []);
          const selected = selectedFlight?.id === flight.id;
          const showSelectedTooltip = pinnedTooltipFlightId === flight.id;

          return (
            <Marker
              eventHandlers={{ click: () => onSelectFlight(flight.id) }}
              icon={markerIcon(flight, severity, selected)}
              key={flight.id}
              position={[point.lat, point.lng]}
            >
              <Tooltip
                className={`aircraft-tooltip ${showSelectedTooltip ? "is-selected" : ""}`}
                direction="top"
                offset={[0, showSelectedTooltip ? -18 : -12]}
                opacity={0.96}
                permanent={showSelectedTooltip}
              >
                <span className="map-tooltip">
                  <strong>{getFlightLabel(flight)}</strong>
                  <span>
                    {Math.round(point.altitudeFt).toLocaleString("ru-RU")} ft · {Math.round(point.speedKt)} kt
                  </span>
                </span>
              </Tooltip>
            </Marker>
          );
        })}

        <MapCamera
          flights={flights}
          highlightedPoint={highlightedPoint}
          sectorCenter={selectedFlight || highlightedPoint ? null : activeSector.center}
          selectedFlight={selectedFlight}
        />
      </MapContainer>

      <div className="map-readout">
        <span>Сектор</span>
        <strong>{flights.length}</strong>
        <select aria-label="Сектор карты" value={sectorId} onChange={(event) => setSectorId(event.target.value as typeof sectorId)}>
          {mapSectors.map((sector) => (
            <option key={sector.id} value={sector.id}>
              {sector.label}
            </option>
          ))}
        </select>
        {selectedFlight && <span>{getFlightLabel(selectedFlight)}</span>}
      </div>

      <div className="map-layers" aria-label="Слои карты">
        {mapLayerButtons.map(({ key, label, Icon }) => (
          <button
            className={layers[key] ? "is-active" : ""}
            key={key}
            onClick={() => setLayers((current) => ({ ...current, [key]: !current[key] }))}
            type="button"
          >
            <Icon aria-hidden="true" size={14} />
            {label}
          </button>
        ))}
        <span className="map-layers__label">
          <Layers aria-hidden="true" size={14} />
          Слои
        </span>
      </div>
    </div>
  );
}
