"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface MapProps {
  initialCenter?: [number, number];
  initialZoom?: number;
  style?: string;
  className?: string;
}

export default function Map({
  initialCenter = [-76.479679, 44.232809], // Queen's University - specific location
  initialZoom = 18.5,
  style = "mapbox://styles/mapbox/standard", // Standard style with enhanced 3D buildings
  className = "w-full h-full",
}: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainer.current) return;
    if (map.current) return; // Initialize map only once

    // Set Mapbox access token
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

    // Starting position - initial animation point
    const startCenter: [number, number] = [-76.479679, 44.232809];
    const startZoom = 13;

    // Initialize map with starting position
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: style,
      center: startCenter,
      zoom: startZoom,
      pitch: 30, // Tilt for 3D effect
      bearing: 180,
      // Configure Standard style for monochrome/gray theme
      config: {
        basemap: {
          lightPreset: "day",
          showPointOfInterestLabels: false,
          showPlaceLabels: false,
          showRoadLabels: true,
        },
      },
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Add geolocate control for user's current location
    const geolocateControl = new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true,
      },
      trackUserLocation: true,
      showUserHeading: true,
      showUserLocation: true,
    });
    map.current.addControl(geolocateControl, "top-right");

    // Set map loaded state and start zoom animation
    map.current.on("load", () => {
      setMapLoaded(true);

      if (!map.current) return;

      // Fly to Queen's University after a short delay
      setTimeout(() => {
        map.current?.flyTo({
          center: initialCenter,
          zoom: initialZoom,
          pitch: 60,
          bearing: 220,
          duration: 3000, // 3 seconds animation
          essential: true,
        });
      }, 500);
    });

    // Cleanup on unmount
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [initialCenter, initialZoom, style]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className={className} />
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
          <p className="text-gray-600 dark:text-gray-400">Loading map...</p>
        </div>
      )}
    </div>
  );
}
