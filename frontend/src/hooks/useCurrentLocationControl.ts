import { useCallback, useEffect, useRef, useState } from "react";

const RECENTER_UNLOCK_TIMEOUT_MS = 1_500;

export function useCurrentLocationControl() {
  const [requestId, setRequestId] = useState(0);
  const [followCurrentLocation, setFollowCurrentLocation] = useState(false);
  const [isRecentering, setIsRecentering] = useState(false);
  const unlockTimeoutRef = useRef<number | null>(null);

  const completeRecenter = useCallback(() => {
    if (unlockTimeoutRef.current !== null) {
      window.clearTimeout(unlockTimeoutRef.current);
      unlockTimeoutRef.current = null;
    }
    setIsRecentering(false);
  }, []);

  const requestRecenter = useCallback(() => {
    if (isRecentering) return;

    setIsRecentering(true);
    setFollowCurrentLocation(true);
    setRequestId((currentRequest) => currentRequest + 1);
    unlockTimeoutRef.current = window.setTimeout(
      completeRecenter,
      RECENTER_UNLOCK_TIMEOUT_MS,
    );
  }, [completeRecenter, isRecentering]);

  useEffect(
    () => () => {
      if (unlockTimeoutRef.current !== null) {
        window.clearTimeout(unlockTimeoutRef.current);
      }
    },
    [],
  );

  return {
    requestId,
    followCurrentLocation,
    isRecentering,
    requestRecenter,
    setFollowCurrentLocation,
    completeRecenter,
  };
}
