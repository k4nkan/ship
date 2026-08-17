import { useEffect, useRef } from "react";
import maplibregl, {
  type GeoJSONSource,
  type Map as MapLibreMap,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getMapStyle } from "./mapStyle";
import {
  ROUTE_COORDINATES,
  ROUTE_MARKERS,
  START_COORDINATE,
  getTraveledRoute,
} from "./route";

const MAP_ANIMATION_FRAME_MS = 1000 / 20;

type AdventureMapProps = {
  progress: number;
  previousProgress: number;
  recenterRequest: number;
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

export function AdventureMap({
  progress,
  previousProgress,
  recenterRequest,
}: AdventureMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      attributionControl: false,
      center: [138, 55],
      zoom: 2.8,
      style: getMapStyle(),
    });
    mapRef.current = map;

    const resizeMap = () => map.resize();
    window.addEventListener("resize", resizeMap);
    window.visualViewport?.addEventListener("resize", resizeMap);

    const handleLoad = () => {
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
          features: ROUTE_MARKERS.map((point) => ({
            type: "Feature" as const,
            properties: { label: point.label },
            geometry: { type: "Point" as const, coordinates: point.coordinate },
          })),
        },
      });
      map.addSource("current-point", {
        type: "geojson",
        data: {
          ...makePoint(START_COORDINATE),
          properties: { label: "現在地" },
        },
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
        id: "current-point-halo",
        type: "circle",
        source: "current-point",
        paint: {
          "circle-radius": 24,
          "circle-color": "#bfdbfe",
          "circle-opacity": 0.72,
        },
      });
      map.addLayer({
        id: "current-point",
        type: "circle",
        source: "current-point",
        paint: {
          "circle-radius": 13,
          "circle-color": "#2563eb",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 3,
        },
      });
      map.addLayer({
        id: "current-point-label",
        type: "symbol",
        source: "current-point",
        layout: {
          "text-field": ["get", "label"],
          "text-size": 13,
          "text-offset": [0, -1.7],
          "text-anchor": "bottom",
        },
        paint: {
          "text-color": "#1d4ed8",
          "text-halo-color": "#ffffff",
          "text-halo-width": 2,
        },
      });
    };
    map.on("load", handleLoad);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      mapRef.current = null;
      map.off("load", handleLoad);
      window.removeEventListener("resize", resizeMap);
      window.visualViewport?.removeEventListener("resize", resizeMap);
      map.remove();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const updateMap = (routeProgress: number) => {
      if (mapRef.current !== map) return;

      const traveledRoute = getTraveledRoute(routeProgress);
      const currentCoordinate = traveledRoute.at(-1) ?? START_COORDINATE;

      setSourceData(map, "route-progress", makeLineString(traveledRoute));
      setSourceData(map, "current-point", {
        ...makePoint(currentCoordinate),
        properties: { label: "現在地" },
      });
    };

    if (!map.isStyleLoaded()) {
      const handleLoad = () => updateMap(progress);
      map.once("load", handleLoad);
      return () => map.off("load", handleLoad);
    }

    const startedAt = performance.now();
    const durationMs = previousProgress === progress ? 0 : 900;
    let lastUpdatedAt = 0;

    const tick = (time: number) => {
      if (mapRef.current !== map) return;

      const animationProgress =
        durationMs === 0 ? 1 : Math.min(1, (time - startedAt) / durationMs);
      if (
        animationProgress === 1 ||
        time - lastUpdatedAt >= MAP_ANIMATION_FRAME_MS
      ) {
        const eased = 1 - (1 - animationProgress) ** 3;
        updateMap(previousProgress + (progress - previousProgress) * eased);
        lastUpdatedAt = time;
      }

      if (animationProgress < 1) {
        animationFrameRef.current = requestAnimationFrame(tick);
      } else {
        animationFrameRef.current = null;
      }
    };

    animationFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [previousProgress, progress]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || recenterRequest === 0) return;

    const currentCoordinate =
      getTraveledRoute(progress).at(-1) ?? START_COORDINATE;

    map.flyTo({
      center: currentCoordinate,
      zoom: map.getZoom(),
      duration: 700,
    });
  }, [progress, recenterRequest]);

  return (
    <div
      id="map"
      ref={containerRef}
      className="map-canvas"
      aria-label="極北から立命館までの地図"
    />
  );
}
