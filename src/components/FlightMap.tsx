"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import type { Flight } from "@/app/page";

type Props = {
  flights: Flight[];
  selected: Flight | null;
  onSelect: (f: Flight | null) => void;
  center: [number, number];
  zoom: number;
};

export default function FlightMap({ flights, selected, onSelect, center, zoom }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center,
      zoom,
      zoomControl: true,
      attributionControl: true,
    });

    // Free OpenStreetMap tiles (no API key required)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView(center, zoom, { animate: true });
    }
  }, [center, zoom]);

  const createIcon = (heading: number | null, isSelected: boolean, onGround: boolean) => {
    const rot = heading ?? 0;
    const color = isSelected ? "#38bdf8" : onGround ? "#fbbf24" : "#34d399";
    const size = isSelected ? 28 : 20;

    const svg = `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" style="transform:rotate(${rot}deg)">
        <path fill="${color}" stroke="#0f172a" stroke-width="0.8" d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
      </svg>
    `;

    return L.divIcon({
      className: "plane-icon",
      html: svg,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  };

  useEffect(() => {
    if (!layerRef.current || !mapRef.current) return;

    const layer = layerRef.current;
    const currentIds = new Set<string>();

    flights.forEach((f) => {
      const id = f.icao24;
      currentIds.add(id);
      const isSelected = selected?.icao24 === id;
      const icon = createIcon(f.heading, isSelected, f.onGround);
      const latlng: L.LatLngExpression = [f.latitude, f.longitude];

      if (markersRef.current.has(id)) {
        const marker = markersRef.current.get(id)!;
        marker.setLatLng(latlng);
        marker.setIcon(icon);
      } else {
        const marker = L.marker(latlng, { icon })
          .addTo(layer)
          .on("click", () => onSelect(f));
        markersRef.current.set(id, marker);
      }
    });

    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        layer.removeLayer(marker);
        markersRef.current.delete(id);
      }
    });

    if (selected && mapRef.current) {
      mapRef.current.panTo([selected.latitude, selected.longitude], { animate: true });
    }
  }, [flights, selected, onSelect]);

  return <div ref={containerRef} className="w-full h-full" />;
}
