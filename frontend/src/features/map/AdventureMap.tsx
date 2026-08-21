import { useEffect, useRef } from "react";
import maplibregl, {
  type GeoJSONSource,
  type Map as MapLibreMap,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { TeamStats } from "../../types";
import { getMapStyle } from "./mapStyle";
import {
  DEFAULT_CAMERA_BEARING,
  DEFAULT_CAMERA_PITCH,
  DEFAULT_CAMERA_ROLL,
  DEFAULT_LOCATION_CAMERA_PAN_Y,
  INITIAL_LOCATION_ZOOM,
} from "./camera";
import {
  ROUTE_COORDINATES,
  ROUTE_MARKERS,
  START_COORDINATE,
  getTraveledRoute,
} from "./route";
import { useMapCamera } from "./useMapCamera";

const MAP_ANIMATION_FRAME_MS = 1000 / 20;

type AdventureMapProps = {
  teams: TeamStats[];
  previousTeams: TeamStats[];
  progress: number;
  focusProgress: number;
  focusRequest: number;
  overviewRequest: number;
  previousProgress: number;
  recenterRequest: number;
  followCurrentLocation: boolean;
  onFollowCurrentLocationChange: (follow: boolean) => void;
  onRecenterComplete: () => void;
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

function makePoint(coordinate: [number, number], label: string) {
  return {
    type: "Feature" as const,
    properties: { label },
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

function sourceId(kind: string, teamId: string): string {
  return `team-${kind}-${teamId}`;
}

export function AdventureMap({
  teams,
  previousTeams,
  progress,
  focusProgress,
  focusRequest,
  overviewRequest,
  recenterRequest,
  followCurrentLocation,
  onFollowCurrentLocationChange,
  onRecenterComplete,
}: AdventureMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const { handleUserCameraInteraction } = useMapCamera({
    mapRef,
    progress,
    focusProgress,
    focusRequest,
    overviewRequest,
    recenterRequest,
    followCurrentLocation,
    onFollowCurrentLocationChange,
    onRecenterComplete,
  });

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      attributionControl: false,
      center: [0, 85],
      zoom: INITIAL_LOCATION_ZOOM,
      bearing: DEFAULT_CAMERA_BEARING,
      pitch: DEFAULT_CAMERA_PITCH,
      roll: DEFAULT_CAMERA_ROLL,
      style: getMapStyle(),
    });
    mapRef.current = map;

    const setGlobeProjection = () => map.setProjection({ type: "globe" });
    map.on("style.load", setGlobeProjection);
    map.on("dragstart", handleUserCameraInteraction);
    map.on("wheel", handleUserCameraInteraction);
    map.on("touchstart", handleUserCameraInteraction);
    map.on("rotatestart", handleUserCameraInteraction);
    map.on("pitchstart", handleUserCameraInteraction);

    const updateMapPadding = () => {
      if (mapRef.current !== map) return;

      const statusPanel =
        document.querySelector<HTMLElement>(".map-status-panel");
      if (!statusPanel) return;

      const mapRect = map.getContainer().getBoundingClientRect();
      const panelRect = statusPanel.getBoundingClientRect();
      const topPadding = Math.max(0, panelRect.bottom - mapRect.top + 12);
      map.setPadding({ ...map.getPadding(), top: topPadding, bottom: 0 });
    };
    const resizeMap = () => {
      map.resize();
      updateMapPadding();
    };
    window.addEventListener("resize", resizeMap);
    window.visualViewport?.addEventListener("resize", resizeMap);
    window.requestAnimationFrame(updateMapPadding);

    const handleLoad = () => {
      map.addSource("route-full", {
        type: "geojson",
        data: makeLineString(ROUTE_COORDINATES),
      });
      map.addSource("route-points", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: ROUTE_MARKERS.map((point, index) => ({
            type: "Feature" as const,
            properties: {
              label: point.label,
              kind: index === 0 ? "start" : "route",
            },
            geometry: { type: "Point" as const, coordinates: point.coordinate },
          })),
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
        id: "route-points",
        type: "circle",
        source: "route-points",
        paint: {
          "circle-radius": ["match", ["get", "kind"], "start", 11, 7],
          "circle-color": [
            "match",
            ["get", "kind"],
            "start",
            "#f59e0b",
            "#111827",
          ],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 3,
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

      teams.forEach((team) => {
        const point =
          getTraveledRoute(team.progress).at(-1) ?? START_COORDINATE;
        map.addSource(sourceId("route", team.id), {
          type: "geojson",
          data: makeLineString(getTraveledRoute(team.progress)),
        });
        map.addSource(sourceId("point", team.id), {
          type: "geojson",
          data: makePoint(point, `${team.icon} ${team.name}`),
        });
        map.addLayer({
          id: sourceId("route", team.id),
          type: "line",
          source: sourceId("route", team.id),
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": team.color,
            "line-width": 5,
            "line-opacity": 0.85,
          },
        });
        map.addLayer({
          id: sourceId("point", team.id),
          type: "circle",
          source: sourceId("point", team.id),
          paint: {
            "circle-radius": 13,
            "circle-color": team.color,
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 3,
          },
        });
        map.addLayer({
          id: sourceId("label", team.id),
          type: "symbol",
          source: sourceId("point", team.id),
          layout: {
            "text-field": ["get", "label"],
            "text-size": 13,
            "text-offset": [0, -1.7],
            "text-anchor": "bottom",
          },
          paint: {
            "text-color": team.color,
            "text-halo-color": "#ffffff",
            "text-halo-width": 2,
          },
        });
      });

      map.easeTo({
        center: getTraveledRoute(progress).at(-1) ?? START_COORDINATE,
        offset: [0, DEFAULT_LOCATION_CAMERA_PAN_Y],
        bearing: DEFAULT_CAMERA_BEARING,
        pitch: DEFAULT_CAMERA_PITCH,
        roll: DEFAULT_CAMERA_ROLL,
        duration: 0,
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
      map.off("style.load", setGlobeProjection);
      map.off("dragstart", handleUserCameraInteraction);
      map.off("wheel", handleUserCameraInteraction);
      map.off("touchstart", handleUserCameraInteraction);
      map.off("rotatestart", handleUserCameraInteraction);
      map.off("pitchstart", handleUserCameraInteraction);
      window.removeEventListener("resize", resizeMap);
      window.visualViewport?.removeEventListener("resize", resizeMap);
      map.remove();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const updateMap = (nextProgressByTeam: Map<string, number>) => {
      if (mapRef.current !== map) return;

      teams.forEach((team) => {
        const teamProgress = nextProgressByTeam.get(team.id) ?? team.progress;
        const traveledRoute = getTraveledRoute(teamProgress);
        const currentCoordinate = traveledRoute.at(-1) ?? START_COORDINATE;
        setSourceData(
          map,
          sourceId("route", team.id),
          makeLineString(traveledRoute),
        );
        setSourceData(
          map,
          sourceId("point", team.id),
          makePoint(currentCoordinate, `${team.icon} ${team.name}`),
        );
      });
    };

    if (!map.isStyleLoaded()) {
      const handleLoad = () =>
        updateMap(new Map(teams.map((team) => [team.id, team.progress])));
      map.once("load", handleLoad);
      return () => map.off("load", handleLoad);
    }

    const previousProgressByTeam = new Map(
      previousTeams.map((team) => [team.id, team.progress]),
    );
    const durationMs = previousTeams.length === 0 ? 0 : 9000;
    const startedAt = performance.now();
    let lastUpdatedAt = 0;

    const tick = (time: number) => {
      if (mapRef.current !== map) return;

      const animationProgress =
        durationMs === 0 ? 1 : Math.min(1, (time - startedAt) / durationMs);
      if (
        animationProgress === 1 ||
        time - lastUpdatedAt >= MAP_ANIMATION_FRAME_MS
      ) {
        const eased = animationProgress;
        const nextProgressByTeam = new Map(
          teams.map((team) => {
            const previousProgress =
              previousProgressByTeam.get(team.id) ?? team.progress;
            return [
              team.id,
              previousProgress + (team.progress - previousProgress) * eased,
            ];
          }),
        );
        updateMap(nextProgressByTeam);
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
  }, [previousTeams, teams]);

  return (
    <div
      id="map"
      ref={containerRef}
      className="map-canvas"
      aria-label="極北から立命館までのチーム別地図"
    />
  );
}
