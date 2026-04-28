import L from "leaflet";
import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import { worstSeverity } from "../domain/events";
import { getCurrentPoint, getFlightLabel } from "../domain/flightUtils";
import type { EventSeverity, Flight, FlightEvent } from "../types";

interface MapViewProps {
  eventsByFlight: Map<string, FlightEvent[]>;
  flights: Flight[];
  onSelectFlight: (flightId: string) => void;
  selectedFlight: Flight | null;
  selectedFromListAt: number;
}

interface MapCameraProps {
  flights: Flight[];
  selectedFlight: Flight | null;
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

function MapCamera({ flights, selectedFlight }: MapCameraProps) {
  const map = useMap();
  const visibleKey = flights.map((flight) => flight.id).join(":");

  useEffect(() => {
    if (selectedFlight) {
      const point = getCurrentPoint(selectedFlight);
      map.flyTo([point.lat, point.lng], 7, {
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
  }, [flights.length, map, selectedFlight, visibleKey]);

  return null;
}

export function MapView({ eventsByFlight, flights, onSelectFlight, selectedFlight, selectedFromListAt }: MapViewProps) {
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
        zoom={6}
      >
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

        <MapCamera flights={flights} selectedFlight={selectedFlight} />
      </MapContainer>

      <div className="map-readout">
        <span>MAP</span>
        <strong>{flights.length}</strong>
        <span>{selectedFlight ? getFlightLabel(selectedFlight) : "sector overview"}</span>
      </div>
    </div>
  );
}
