export const START_COORDINATE: [number, number] = [135, 85];
export const GOAL_COORDINATE: [number, number] = [135.5613416, 34.8096024];

export type RouteSpot = {
  label: string;
  coordinate: [number, number];
};

export const ROUTE_SPOTS: RouteSpot[] = [
  { label: "北極点", coordinate: START_COORDINATE },
  { label: "北極海", coordinate: [138, 76] },
  { label: "ロシア", coordinate: [142.7333, 46.9641] },
  { label: "オホーツク海", coordinate: [144.5, 50.5] },
  { label: "北海道", coordinate: [141.3545, 43.0618] },
  { label: "東京", coordinate: [139.7671, 35.6812] },
  { label: "富士山", coordinate: [138.7274, 35.3606] },
  { label: "立命館", coordinate: GOAL_COORDINATE },
];

export const ROUTE_MARKERS: RouteSpot[] = [
  ROUTE_SPOTS[0],
  ROUTE_SPOTS[2],
  ROUTE_SPOTS[4],
  ROUTE_SPOTS[5],
  ROUTE_SPOTS[6],
  ROUTE_SPOTS[7],
];

export const ROUTE_COORDINATES: [number, number][] = ROUTE_SPOTS.map(
  (spot) => spot.coordinate,
);

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
