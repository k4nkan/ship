import { START_COORDINATE, getTraveledRoute } from "./route";
import type { EaseToOptions, Map as MapLibreMap } from "maplibre-gl";

export const CURRENT_LOCATION_ZOOM = 11;
export const INITIAL_LOCATION_ZOOM = CURRENT_LOCATION_ZOOM;
export const MAX_CURRENT_LOCATION_ZOOM = 15;
export const LOCATION_CAMERA_PAN_Y = 110;
export const DEFAULT_LOCATION_CAMERA_PAN_Y = 84;
export const DEFAULT_CAMERA_BEARING = 0;
export const DEFAULT_CAMERA_PITCH = 0;
export const DEFAULT_CAMERA_ROLL = 0;
const CAMERA_TRANSITION_FALLBACK_BUFFER_MS = 250;

export function getCurrentCoordinate(progress: number): [number, number] {
  return getTraveledRoute(progress).at(-1) ?? START_COORDINATE;
}

export function getNextCurrentLocationZoom(currentZoom: number): number {
  return Math.max(currentZoom, MAX_CURRENT_LOCATION_ZOOM);
}

export function runCameraTransition(
  map: MapLibreMap,
  options: EaseToOptions,
  onComplete: () => void,
): () => void {
  let completed = false;
  let timeoutId: number | null = null;

  const complete = () => {
    if (completed) return;
    completed = true;
    map.off("moveend", complete);
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
    onComplete();
  };

  map.once("moveend", complete);
  timeoutId = window.setTimeout(
    complete,
    (options.duration ?? 0) + CAMERA_TRANSITION_FALLBACK_BUFFER_MS,
  );
  map.easeTo(options);

  return () => {
    if (completed) return;
    completed = true;
    map.off("moveend", complete);
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
  };
}
