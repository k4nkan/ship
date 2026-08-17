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
  { label: "北海道", coordinate: [141.3545, 43.0618] },
  { label: "東京", coordinate: [139.7671, 35.6812] },
  { label: "富士山", coordinate: [138.7274, 35.3606] },
  { label: "立命館", coordinate: GOAL_COORDINATE },
];

export const ROUTE_MARKERS: RouteSpot[] = [
  ROUTE_SPOTS[0],
  ROUTE_SPOTS[2],
  ROUTE_SPOTS[3],
  ROUTE_SPOTS[4],
  ROUTE_SPOTS[5],
  ROUTE_SPOTS[6],
];

export const ROUTE_COORDINATES: [number, number][] = ROUTE_SPOTS.map(
  (spot) => spot.coordinate,
);

type RouteSegment = {
  start: [number, number];
  end: [number, number];
  startProjected: [number, number];
  endProjected: [number, number];
  length: number;
  totalLength: number;
};

function createRouteSegments(): RouteSegment[] {
  const segments: RouteSegment[] = [];
  let totalLength = 0;

  for (let index = 1; index < ROUTE_COORDINATES.length; index += 1) {
    const start = ROUTE_COORDINATES[index - 1];
    const end = ROUTE_COORDINATES[index];
    const startProjected = projectCoordinate(start);
    const endProjected = projectCoordinate(end);
    const length = Math.hypot(
      endProjected[0] - startProjected[0],
      endProjected[1] - startProjected[1],
    );
    totalLength += length;
    segments.push({
      start,
      end,
      startProjected,
      endProjected,
      length,
      totalLength,
    });
  }

  return segments;
}

const routeSegments = createRouteSegments();
const routeLength = routeSegments.at(-1)?.totalLength ?? 0;

export function sampleRouteCoordinate(progress: number): [number, number] {
  const segment = getRouteSegment(progress);
  const target = clampProgress(progress) * routeLength;
  const previousLength = segment.totalLength - segment.length;
  const segmentProgress =
    segment.length === 0 ? 0 : (target - previousLength) / segment.length;

  const projectedCoordinate: [number, number] = [
    segment.startProjected[0] +
      (segment.endProjected[0] - segment.startProjected[0]) * segmentProgress,
    segment.startProjected[1] +
      (segment.endProjected[1] - segment.startProjected[1]) * segmentProgress,
  ];

  return unprojectCoordinate(projectedCoordinate);
}

export function getTraveledRoute(progress: number): [number, number][] {
  const segmentIndex = routeSegments.indexOf(getRouteSegment(progress));
  const currentCoordinate = sampleRouteCoordinate(progress);
  const coordinates = ROUTE_COORDINATES.slice(0, segmentIndex + 1);
  const lastCoordinate = coordinates.at(-1);

  if (
    lastCoordinate?.[0] === currentCoordinate[0] &&
    lastCoordinate?.[1] === currentCoordinate[1]
  ) {
    return coordinates;
  }

  return coordinates.concat([currentCoordinate]);
}

function getRouteSegment(progress: number): RouteSegment {
  const target = clampProgress(progress) * routeLength;
  return (
    routeSegments.find((item) => item.totalLength >= target) ??
    routeSegments[routeSegments.length - 1]
  );
}

function clampProgress(progress: number): number {
  return Math.min(1, Math.max(0, progress));
}

function projectCoordinate([longitude, latitude]: [number, number]): [
  number,
  number,
] {
  const limitedLatitude = Math.max(
    -85.05112878,
    Math.min(85.05112878, latitude),
  );
  const latitudeRadians = (limitedLatitude * Math.PI) / 180;

  return [longitude, Math.log(Math.tan(Math.PI / 4 + latitudeRadians / 2))];
}

function unprojectCoordinate([longitude, projectedLatitude]: [
  number,
  number,
]): [number, number] {
  return [
    longitude,
    (Math.atan(Math.exp(projectedLatitude)) * 360) / Math.PI - 90,
  ];
}
