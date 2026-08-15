import { useEffect, useRef } from "react";
import maplibregl, {
  type GeoJSONSource,
  type Map as MapLibreMap,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getMapStyle } from "./mapStyle";
import {
  GOAL_COORDINATE,
  ROUTE_COORDINATES,
  START_COORDINATE,
  getRouteProgress,
  getTraveledRoute,
  sampleRouteCoordinate,
} from "./route";

type AdventureMapProps = {
  totalGyan: number;
  previousGyan: number;
};

function makeLineString(coordinates: [number, number][]) {
  return {
    type: "Feature" as const,
    properties: {},
    geometry: {
      type: "LineString" as const,
      coordinates,
    },
  };
}

function makePoint(coordinate: [number, number]) {
  return {
    type: "Feature" as const,
    properties: {},
    geometry: {
      type: "Point" as const,
      coordinates: coordinate,
    },
  };
}

function setSourceData(
  map: MapLibreMap,
  sourceId: string,
  data: GeoJSON.Feature,
) {
  const source = map.getSource(sourceId) as GeoJSONSource | undefined;
  source?.setData(data);
}

export function AdventureMap({ totalGyan, previousGyan }: AdventureMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      attributionControl: false,
      center: [138.7, 40.1],
      zoom: 4.5,
      style: getMapStyle(),
    });
    mapRef.current = map;

    map.on("load", () => {
      map.addSource("route-full", {
        type: "geojson",
        data: makeLineString(ROUTE_COORDINATES),
      });
      map.addSource("route-progress", {
        type: "geojson",
        data: makeLineString([START_COORDINATE]),
      });
      map.addSource("route-points", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [
            { label: "極北", coordinate: START_COORDINATE },
            { label: "立命館", coordinate: GOAL_COORDINATE },
          ].map((point) => ({
            type: "Feature" as const,
            properties: { label: point.label },
            geometry: { type: "Point" as const, coordinates: point.coordinate },
          })),
        },
      });
      map.addSource("current-point", {
        type: "geojson",
        data: makePoint(START_COORDINATE),
      });

      map.addLayer({
        id: "route-full",
        type: "line",
        source: "route-full",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#64748b",
          "line-width": 4,
          "line-opacity": 0.5,
        },
      });
      map.addLayer({
        id: "route-progress",
        type: "line",
        source: "route-progress",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#dc2626", "line-width": 5 },
      });
      map.addLayer({
        id: "route-points",
        type: "circle",
        source: "route-points",
        paint: {
          "circle-radius": 7,
          "circle-color": "#111827",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
        },
      });
      map.addLayer({
        id: "route-labels",
        type: "symbol",
        source: "route-points",
        layout: {
          "text-field": ["get", "label"],
          "text-size": 13,
          "text-offset": [0, 1.2],
        },
        paint: {
          "text-color": "#111827",
          "text-halo-color": "#ffffff",
          "text-halo-width": 2,
        },
      });
      map.addLayer({
        id: "current-point",
        type: "circle",
        source: "current-point",
        paint: {
          "circle-radius": 11,
          "circle-color": "#dc2626",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 3,
        },
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const updateMap = (gyan: number) => {
      const progress = getRouteProgress(gyan);
      setSourceData(
        map,
        "route-progress",
        makeLineString(getTraveledRoute(progress)),
      );
      setSourceData(
        map,
        "current-point",
        makePoint(sampleRouteCoordinate(progress)),
      );
    };

    if (!map.isStyleLoaded()) {
      map.once("load", () => updateMap(totalGyan));
      return;
    }

    const startedAt = performance.now();
    const durationMs = previousGyan === totalGyan ? 0 : 900;

    const tick = (time: number) => {
      const progress =
        durationMs === 0 ? 1 : Math.min(1, (time - startedAt) / durationMs);
      const eased = 1 - (1 - progress) ** 3;
      updateMap(previousGyan + (totalGyan - previousGyan) * eased);

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);
  }, [previousGyan, totalGyan]);

  return (
    <div
      id="map"
      ref={containerRef}
      className="map-canvas"
      aria-label="極北から立命館までの地図"
    />
  );
}
