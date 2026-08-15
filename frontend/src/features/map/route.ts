export const START_COORDINATE: [number, number] = [141.9363, 45.5231];
export const GOAL_COORDINATE: [number, number] = [135.5613416, 34.8096024];
export const GYAN_GOAL = 1000;

export const ROUTE_COORDINATES: [number, number][] = [
  START_COORDINATE,
  [140.9, 43.2],
  [139.4, 40.4],
  [138.1, 38.0],
  [136.9, 35.7],
  GOAL_COORDINATE,
];

type RouteSegment = {
  start: [number, number];
  end: [number, number];
  length: number;
  totalLength: number;
};

function createRouteSegments(): RouteSegment[] {
  const segments: RouteSegment[] = [];
  let totalLength = 0;

  for (let index = 1; index < ROUTE_COORDINATES.length; index += 1) {
    const start = ROUTE_COORDINATES[index - 1];
    const end = ROUTE_COORDINATES[index];
    const length = Math.hypot(end[0] - start[0], end[1] - start[1]);
    totalLength += length;
    segments.push({ start, end, length, totalLength });
  }

  return segments;
}

const routeSegments = createRouteSegments();
const routeLength = routeSegments.at(-1)?.totalLength ?? 0;

export function getRouteProgress(totalGyan: number): number {
  return Math.max(0, Math.min(1, totalGyan / GYAN_GOAL));
}

export function sampleRouteCoordinate(progress: number): [number, number] {
  const target = progress * routeLength;
  const segment =
    routeSegments.find((item) => item.totalLength >= target) ??
    routeSegments[routeSegments.length - 1];
  const previousLength = segment.totalLength - segment.length;
  const segmentProgress =
    segment.length === 0 ? 0 : (target - previousLength) / segment.length;

  return [
    segment.start[0] + (segment.end[0] - segment.start[0]) * segmentProgress,
    segment.start[1] + (segment.end[1] - segment.start[1]) * segmentProgress,
  ];
}

export function getTraveledRoute(progress: number): [number, number][] {
  const currentCoordinate = sampleRouteCoordinate(progress);
  const targetIndex = Math.floor(progress * (ROUTE_COORDINATES.length - 1));
  return ROUTE_COORDINATES.slice(0, targetIndex + 1).concat([
    currentCoordinate,
  ]);
}
