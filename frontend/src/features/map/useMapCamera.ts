import { useCallback, useEffect, useRef } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import {
  DEFAULT_CAMERA_BEARING,
  DEFAULT_CAMERA_PITCH,
  DEFAULT_CAMERA_ROLL,
  getCurrentCoordinate,
  getNextCurrentLocationZoom,
  LOCATION_CAMERA_PAN_Y,
  runCameraTransition,
  SELECTED_TEAM_FOCUS_ZOOM,
} from "./camera";

type MapRef = { current: MapLibreMap | null };

type UseMapCameraOptions = {
  mapRef: MapRef;
  progress: number;
  focusProgress: number;
  focusRequest: number;
  overviewRequest: number;
  recenterRequest: number;
  followCurrentLocation: boolean;
  onFollowCurrentLocationChange: (follow: boolean) => void;
  onRecenterComplete: () => void;
};

export function useMapCamera({
  mapRef,
  progress,
  focusProgress,
  focusRequest,
  overviewRequest,
  recenterRequest,
  followCurrentLocation,
  onFollowCurrentLocationChange,
  onRecenterComplete,
}: UseMapCameraOptions) {
  const recenterAnimationRef = useRef(false);
  const lastFocusRequestRef = useRef(0);
  const progressRef = useRef(progress);
  progressRef.current = progress;

  const handleUserCameraInteraction = useCallback(() => {
    onFollowCurrentLocationChange(false);
  }, [onFollowCurrentLocationChange]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || recenterRequest === 0) return;

    const currentCoordinate = getCurrentCoordinate(progressRef.current);
    let cancelled = false;
    let cancelCameraTransition: (() => void) | null = null;

    const finishZoom = () => {
      if (cancelled || mapRef.current !== map) return;
      recenterAnimationRef.current = false;
      onRecenterComplete();
    };

    const startZoom = () => {
      if (cancelled || mapRef.current !== map) return;

      const targetZoom = getNextCurrentLocationZoom(map.getZoom());
      if (targetZoom <= map.getZoom() + 0.0001) {
        finishZoom();
        return;
      }

      cancelCameraTransition = runCameraTransition(
        map,
        {
          center: currentCoordinate,
          zoom: targetZoom,
          offset: [0, LOCATION_CAMERA_PAN_Y],
          bearing: DEFAULT_CAMERA_BEARING,
          pitch: DEFAULT_CAMERA_PITCH,
          roll: DEFAULT_CAMERA_ROLL,
          duration: 500,
        },
        finishZoom,
      );
    };

    const startRecenter = () => {
      if (cancelled || mapRef.current !== map) return;

      map.stop();
      recenterAnimationRef.current = true;

      cancelCameraTransition = runCameraTransition(
        map,
        {
          center: currentCoordinate,
          offset: [0, LOCATION_CAMERA_PAN_Y],
          bearing: DEFAULT_CAMERA_BEARING,
          pitch: DEFAULT_CAMERA_PITCH,
          roll: DEFAULT_CAMERA_ROLL,
          duration: 300,
        },
        startZoom,
      );
    };

    if (map.isStyleLoaded()) {
      startRecenter();
    } else {
      map.once("load", startRecenter);
    }

    return () => {
      cancelled = true;
      cancelCameraTransition?.();
      map.off("load", startRecenter);
      recenterAnimationRef.current = false;
    };
  }, [mapRef, onRecenterComplete, recenterRequest]);

  useEffect(() => {
    const map = mapRef.current;
    if (
      !map ||
      !map.isStyleLoaded() ||
      !followCurrentLocation ||
      recenterAnimationRef.current
    ) {
      return;
    }

    const currentCoordinate = getCurrentCoordinate(progress);
    map.easeTo({
      center: currentCoordinate,
      offset: [0, LOCATION_CAMERA_PAN_Y],
      duration: 500,
    });
  }, [followCurrentLocation, mapRef, progress]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || focusRequest === 0) return;

    const focusSelectedTeam = () => {
      if (mapRef.current !== map || !map.isStyleLoaded()) return;

      const isNewSelection = lastFocusRequestRef.current !== focusRequest;
      lastFocusRequestRef.current = focusRequest;
      map.stop();
      map.easeTo({
        center: getCurrentCoordinate(focusProgress),
        ...(isNewSelection
          ? { zoom: Math.max(map.getZoom(), SELECTED_TEAM_FOCUS_ZOOM) }
          : {}),
        duration: isNewSelection ? 700 : 450,
      });
    };

    if (map.isStyleLoaded()) {
      focusSelectedTeam();
      return;
    }

    map.once("load", focusSelectedTeam);
    return () => {
      map.off("load", focusSelectedTeam);
    };
  }, [focusProgress, focusRequest, mapRef]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || overviewRequest === 0) return;

    const showOverview = () => {
      if (mapRef.current !== map || !map.isStyleLoaded()) return;

      const mapRect = map.getContainer().getBoundingClientRect();
      const statusPanel =
        document.querySelector<HTMLElement>(".map-status-panel");
      const panelRect = statusPanel?.getBoundingClientRect();
      const topPadding = panelRect
        ? Math.max(24, panelRect.bottom - mapRect.top + 24)
        : 24;

      map.stop();
      map.fitBounds(
        [
          [-15, 20],
          [150, 90],
        ],
        {
          padding: { top: topPadding, right: 40, bottom: 40, left: 40 },
          duration: 800,
        },
      );
    };

    if (map.isStyleLoaded()) {
      showOverview();
      return;
    }

    map.once("load", showOverview);
    return () => {
      map.off("load", showOverview);
    };
  }, [mapRef, overviewRequest]);

  return { handleUserCameraInteraction };
}
